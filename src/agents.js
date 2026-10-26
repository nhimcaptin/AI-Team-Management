import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { mockRun } from './mock.js';
import { resolveCommand } from './commands.js';

const IS_WIN = process.platform === 'win32';

function short(obj, max = 90) {
  if (obj == null) return '';
  const pick = obj.file_path || obj.path || obj.absolute_path || obj.pattern || obj.command || obj.query;
  const s = typeof pick === 'string' ? pick : typeof obj === 'string' ? obj : JSON.stringify(obj);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// Each parser turns one JSONL line from a CLI into calls on `acc`.
const PARSERS = {
  'claude-stream'(obj, acc) {
    if (obj.type === 'assistant') {
      for (const c of obj.message?.content || []) {
        if (c.type === 'text' && c.text) acc.delta(c.text + '\n\n');
        else if (c.type === 'tool_use') acc.activity(`🔧 ${c.name} ${short(c.input)}`);
      }
    } else if (obj.type === 'result') {
      if (obj.is_error) acc.error(obj.result || obj.subtype || 'Claude báo lỗi');
      else if (typeof obj.result === 'string') acc.final(obj.result);
    }
  },

  'codex-json'(obj, acc) {
    const item = obj.item;
    if (obj.type === 'item.started' && item?.type === 'command_execution') {
      acc.activity(`$ ${short(item.command, 120)}`);
    } else if (obj.type === 'item.completed' && item) {
      if (item.type === 'agent_message' && item.text) acc.delta(item.text + '\n\n');
      else if (item.type === 'file_change') {
        acc.activity(`✏️ ${(item.changes || []).map((c) => `${c.kind || ''} ${c.path}`.trim()).join(', ')}`);
      } else if (item.type === 'mcp_tool_call') acc.activity(`🔧 ${item.server || ''} ${item.tool || ''}`);
      else if (item.type === 'web_search') acc.activity(`🔎 ${short(item.query)}`);
      else if (item.type === 'error') acc.error(item.message);
    } else if (obj.type === 'turn.failed') {
      acc.error(obj.error?.message || 'Codex turn failed');
    } else if (obj.type === 'error') {
      acc.error(obj.message || 'Codex báo lỗi');
    }
  },

  'gemini-stream'(obj, acc) {
    if (obj.type === 'message' && obj.role === 'assistant' && obj.content) acc.delta(obj.content);
    else if (obj.type === 'tool_use') acc.activity(`🔧 ${obj.tool_name} ${short(obj.parameters)}`);
    else if (obj.type === 'error') acc.error(obj.message || 'CLI báo lỗi');
    else if (obj.type === 'result' && obj.status === 'error') acc.error(obj.error?.message || 'CLI báo lỗi');
  },

  // Antigravity CLI. Its stream-json events are not documented yet, so accept
  // both the Claude Code and the Gemini CLI shapes plus plain text deltas.
  'agy-stream'(obj, acc) {
    if (obj.type === 'assistant') return PARSERS['claude-stream'](obj, acc);
    if (obj.type === 'result') {
      if (obj.is_error || obj.status === 'error') acc.error(obj.error?.message || obj.result || 'Antigravity báo lỗi');
      else if (typeof obj.result === 'string') acc.final(obj.result);
      else if (typeof obj.response === 'string') acc.final(obj.response);
      return;
    }
    if (['message', 'tool_use', 'error'].includes(obj.type)) return PARSERS['gemini-stream'](obj, acc);
    const text = obj.delta?.text ?? obj.text ?? obj.content;
    if (typeof text === 'string' && /delta|text|content|chunk/i.test(obj.type || '')) acc.delta(text);
    else if (/tool|command/i.test(obj.type || '')) acc.activity(`🔧 ${obj.name || obj.tool_name || obj.type} ${short(obj.input || obj.parameters || obj.args)}`);
  },

  // plain text output: every line is part of the answer
  text() {},
};

function quoteWin(arg) {
  if (arg === '') return '""';
  if (!/[\s"&|<>^()%!,;=]/.test(arg)) return arg;
  return '"' + arg.replace(/"/g, '\\"') + '"';
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (IS_WIN) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill('SIGTERM');
}

/**
 * Runs one CLI agent with the prompt on stdin and streams its output.
 * Returns { promise, kill } where promise resolves to { ok, text, error }.
 */
export function runAgent({ agentCfg, mode, prompt, promptFile, cwd, outFile, timeoutMs, onEvent, mock, meta }) {
  if (mock) return mockRun({ meta, cwd, onEvent });

  // {promptFile} lets a CLI that takes the prompt as an argument read a long prompt from disk
  const args = (agentCfg.args?.[mode] || []).map((a) =>
    a.replaceAll('{outFile}', outFile).replaceAll('{cwd}', cwd).replaceAll('{promptFile}', promptFile),
  );
  if (agentCfg.model && agentCfg.modelFlag) args.splice(agentCfg.modelInsertAt ?? 0, 0, agentCfg.modelFlag, agentCfg.model);
  const parse = PARSERS[agentCfg.format] || PARSERS.text;
  let text = '';
  let finalText = null;
  let error = null;
  const acc = {
    delta(t) {
      text += t;
      onEvent({ type: 'delta', text: t });
    },
    activity(t) {
      onEvent({ type: 'activity', text: t });
    },
    final(t) {
      finalText = t;
    },
    error(e) {
      error = error ? `${error}\n${e}` : String(e);
    },
  };

  let child;
  let killed = false;
  let timer;
  const promise = new Promise((resolve) => {
    const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', ...(agentCfg.env || {}) };
    const exe = resolveCommand(agentCfg.command);
    const command = IS_WIN ? [exe, ...args].map(quoteWin).join(' ') : exe;
    try {
      child = IS_WIN
        ? spawn(command, { cwd, env, shell: true, windowsHide: true })
        : spawn(command, args, { cwd, env });
    } catch (e) {
      resolve({ ok: false, text: '', error: `Không chạy được ${agentCfg.command}: ${e.message}` });
      return;
    }

    let buf = '';
    let stderr = '';
    const handleLine = (line) => {
      if (!line.trim()) return;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        acc.delta(line + '\n');
        return;
      }
      try {
        parse(obj, acc);
      } catch (e) {
        acc.activity(`⚠️ không đọc được 1 dòng output: ${e.message}`);
      }
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        handleLine(buf.slice(0, i).replace(/\r$/, ''));
        buf = buf.slice(i + 1);
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-4000);
    });
    child.on('error', (e) => acc.error(e.message));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (buf) handleLine(buf);
      let out = finalText ?? text;
      if (outFile && fs.existsSync(outFile)) {
        const fromFile = fs.readFileSync(outFile, 'utf8').trim();
        if (fromFile) out = fromFile;
      }
      if (killed) error = error || 'Đã dừng hoặc quá thời gian';
      else if (code !== 0) error = error || `Thoát với mã ${code}. ${stderr.trim().split('\n').slice(-8).join('\n')}`;
      resolve({ ok: !error, text: out.trim(), error });
    });

    child.stdin.on('error', () => {}); // CLI may exit before reading all of stdin
    child.stdin.end(prompt, 'utf8');
    timer = setTimeout(() => {
      killed = true;
      killTree(child);
    }, timeoutMs);
  });

  return {
    promise,
    kill() {
      killed = true;
      killTree(child);
    },
  };
}
