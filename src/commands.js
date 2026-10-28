import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const IS_WIN = process.platform === 'win32';
const HOME = os.homedir();
const APPDATA = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local');

function subdirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

const versionKey = (p) => path.basename(p).replace(/^v/, '').split(/[.-]/).map((n) => Number(n) || 0);
function byVersionDesc(a, b) {
  const x = versionKey(a);
  const y = versionKey(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((y[i] || 0) !== (x[i] || 0)) return (y[i] || 0) - (x[i] || 0);
  return 0;
}

// Global npm installs under every Node version managed by nvm, so a CLI installed
// while another Node version was active is still found.
function nvmShims(cmd) {
  const root = process.env.NVM_HOME || path.join(APPDATA, 'nvm');
  return subdirs(root)
    .sort(byVersionDesc)
    .map((dir) => ({ path: path.join(dir, IS_WIN ? `${cmd}.cmd` : cmd), source: `npm, Node ${path.basename(dir)}` }));
}

// Claude Desktop from the Microsoft Store is an MSIX package: Windows redirects its
// AppData\Roaming\Claude into Packages\Claude_<id>\LocalCache, and only processes
// inside the package see the redirected path. Newer versions moved their data to
// %LOCALAPPDATA%\Claude-Data\<package>\. Look in all of these.
function claudeDesktopDirs() {
  const dirs = [path.join(APPDATA, 'Claude', 'claude-code')];
  if (IS_WIN) {
    for (const d of subdirs(path.join(LOCALAPPDATA, 'Claude-Data'))) dirs.push(path.join(d, 'claude-code'));
    for (const pkg of subdirs(path.join(LOCALAPPDATA, 'Packages')).filter((d) => /^Claude_/i.test(path.basename(d)))) {
      dirs.push(path.join(pkg, 'LocalCache', 'Roaming', 'Claude', 'claude-code'));
    }
  }
  return dirs;
}

// Copies of the CLIs that the desktop apps keep up to date by themselves.
const BUNDLED = {
  claude: () =>
    claudeDesktopDirs()
      .flatMap(subdirs)
      .sort(byVersionDesc)
      .flatMap((v) => subdirs(v).map((h) => ({ path: path.join(h, IS_WIN ? 'claude.exe' : 'claude'), source: `Claude Desktop (${path.basename(v)})` }))),
  codex: () => [
    // newer desktop app (also the Microsoft Store one): %LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\.
    // The folder names are hashes, so the newest copy is picked by file time.
    ...(IS_WIN ? subdirs(path.join(LOCALAPPDATA, 'OpenAI', 'Codex', 'bin')) : [])
      .map((d) => path.join(d, 'codex.exe'))
      .map((p) => ({ p, t: fs.statSync(p, { throwIfNoEntry: false })?.mtimeMs ?? -1 }))
      .filter((x) => x.t >= 0)
      .sort((a, b) => b.t - a.t)
      .map((x) => ({ path: x.p, source: 'app Codex' })),
    ...subdirs(path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'packages', 'app-server-daemon', 'releases'))
      .sort(byVersionDesc)
      .map((r) => ({ path: path.join(r, 'bin', IS_WIN ? 'codex.exe' : 'codex'), source: `app Codex (${path.basename(r).split('-')[0]})` })),
  ],
  agy: () =>
    IS_WIN
      ? ['agy.exe', 'agy.cmd'].map((f) => ({ path: path.join(LOCALAPPDATA, 'agy', 'bin', f), source: 'Antigravity CLI' }))
      : [{ path: path.join(HOME, '.local', 'bin', 'agy'), source: 'Antigravity CLI' }],
};

function onPath(cmd) {
  const exts = IS_WIN ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      if (fs.existsSync(path.join(dir, cmd + ext))) return true;
    }
  }
  return false;
}

// Where a CLI can be run from: PATH first, then npm installs under other Node
// versions, then the copy bundled with its desktop app. null when not found.
export function findCommand(cmd) {
  if (cmd.includes('/') || cmd.includes('\\')) return fs.existsSync(cmd) ? { path: cmd, source: 'đường dẫn trong cấu hình' } : null;
  if (onPath(cmd)) return { path: cmd, source: 'PATH' };
  const candidates = [...nvmShims(cmd), ...(BUNDLED[cmd]?.() || [])];
  return candidates.find((c) => fs.existsSync(c.path)) || null;
}

export function resolveCommand(cmd) {
  return findCommand(cmd)?.path || cmd;
}

export function commandExists(cmd) {
  return Boolean(findCommand(cmd));
}

function quoteWin(arg) {
  if (arg === '') return '""';
  if (!/[\s"&|<>^()%!,;=]/.test(arg)) return arg;
  return '"' + arg.replace(/"/g, '\\"') + '"';
}

// Runs a CLI and collects its output. On Windows .cmd shims need the shell, and
// paths with spaces must be quoted for it.
export function execCli(cmd, args, { timeout = 20_000, cwd } = {}) {
  const exe = resolveCommand(cmd);
  const useShell = IS_WIN && !/\.exe$/i.test(exe);
  return new Promise((resolve) => {
    const done = (err, stdout, stderr) => resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || ''), error: err });
    if (useShell) execFile([exe, ...args].map(quoteWin).join(' '), { shell: true, timeout, cwd, windowsHide: true }, done);
    else execFile(exe, args, { timeout, cwd, windowsHide: true }, done);
  });
}

// Official install commands. npm ones need Node, which this tool already needs.
export const INSTALLERS = {
  claude: { npm: '@anthropic-ai/claude-code', login: 'Mở terminal, chạy `claude` rồi gõ /login.' },
  codex: { npm: '@openai/codex', login: 'Mở terminal và chạy `codex login`.' },
  agy: {
    win: 'irm https://antigravity.google/cli/install.ps1 | iex',
    unix: 'curl -fsSL https://antigravity.google/cli/install.sh | bash',
    login: 'Chạy `agy` một lần (dùng chung đăng nhập với app Antigravity).',
  },
};

export function installCommandText(cmd) {
  const i = INSTALLERS[cmd];
  if (!i) return null;
  return i.npm ? `npm install -g ${i.npm}` : IS_WIN ? i.win : i.unix;
}

// Starts the installer and reports each output line; resolves when it ends.
export function runInstaller(cmd, onLine) {
  const i = INSTALLERS[cmd];
  if (!i) return Promise.resolve({ ok: false, error: `Không có lệnh cài tự động cho ${cmd}` });
  let child;
  if (i.npm) child = spawn(IS_WIN ? 'npm.cmd' : 'npm', ['install', '-g', i.npm], { shell: IS_WIN, windowsHide: true });
  else if (IS_WIN) child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', i.win], { windowsHide: true });
  else child = spawn('bash', ['-c', i.unix]);
  return new Promise((resolve) => {
    let buf = '';
    const feed = (chunk) => {
      buf += chunk;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) if (l.trim()) onLine(l);
    };
    child.stdout.setEncoding('utf8').on('data', feed);
    child.stderr.setEncoding('utf8').on('data', feed);
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
    child.on('close', (code) => {
      if (buf.trim()) onLine(buf);
      resolve(code === 0 ? { ok: true } : { ok: false, error: `Trình cài thoát với mã ${code}` });
    });
  });
}
