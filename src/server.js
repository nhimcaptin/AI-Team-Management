import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT, loadConfig, teamOf, readLocalConfig, writeLocalConfig, accountModels, AGENT_ALIASES } from './config.js';
import { Store } from './store.js';
import { TaskRunner } from './orchestrator.js';
import * as git from './git.js';
import { findCommand, execCli, INSTALLERS, installCommandText, runInstaller } from './commands.js';

const argv = process.argv.slice(2);
const MOCK = argv.includes('--mock');
const OPEN = argv.includes('--open');
const portArg = argv.indexOf('--port');
let config = loadConfig();
const store = new Store(path.join(ROOT, 'data'));
const runners = new Map();
const installing = new Set();

// Tasks that were running when the server stopped cannot be resumed.
for (const t of store.list()) {
  if (t.status === 'running' || t.status === 'waiting') {
    t.status = 'interrupted';
    try {
      store.saveTask(t);
    } catch {}
  }
}

// Pick up tasks another machine committed into these projects' .ai-team/.
for (const p of new Set(store.list().map((t) => t.projectPath))) store.importFrom(p);

class Hub {
  clients = new Set();
  add(res) {
    this.clients.add(res);
    res.on('close', () => this.clients.delete(res));
  }
  broadcast(evt) {
    const data = `data: ${JSON.stringify(evt)}\n\n`;
    for (const res of this.clients) res.write(data);
  }
}
const hub = new Hub();

function importTasks(projectPath) {
  const added = store.importFrom(projectPath);
  for (const task of added) hub.broadcast({ type: 'state', taskId: task.id, task });
  return added;
}
setInterval(() => {
  for (const res of hub.clients) res.write(': ping\n\n');
}, 20_000).unref();

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '');
}

function newId(title) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  return `${stamp}-${slugify(title) || 'task'}-${Math.random().toString(36).slice(2, 6)}`;
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (c) => {
      raw += c;
      if (raw.length > limit) {
        reject(fail(413, 'Dữ liệu gửi lên quá lớn'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON không hợp lệ'));
      }
    });
  });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const PUBLIC = path.join(ROOT, 'public');

function serveStatic(req, res, pathname) {
  const file = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    // no-cache: after a `git pull` the browser must pick up the new UI files
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const fail = (status, message) => Object.assign(new Error(message), { status });

// Pasted images arrive as data URLs and are saved next to the task's chat
// history, so the AIs can open them and they travel with it to another machine.
const IMAGE_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const WITH_IMAGES_LIMIT = (MAX_IMAGES * MAX_IMAGE_BYTES * 4) / 3 + 1_000_000;

function saveImages(task, images) {
  if (!Array.isArray(images) || !images.length) return [];
  if (images.length > MAX_IMAGES) throw fail(400, `Tối đa ${MAX_IMAGES} ảnh mỗi tin nhắn`);
  const decoded = images.map((src) => {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/s.exec(String(src));
    if (!m || !IMAGE_TYPES[m[1]]) throw fail(400, 'Chỉ nhận ảnh PNG, JPEG, GIF hoặc WebP');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_IMAGE_BYTES) throw fail(400, `Mỗi ảnh tối đa ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
    return { buf, ext: IMAGE_TYPES[m[1]] };
  });
  const dir = path.join(store.taskDir(task), 'images');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = Date.now();
  return decoded.map(({ buf, ext }, i) => {
    const name = `${stamp}-${i + 1}${ext}`;
    fs.writeFileSync(path.join(dir, name), buf);
    return name;
  });
}

function serveImage(res, id, name) {
  const task = store.get(id);
  const type = Object.keys(IMAGE_TYPES).find((t) => IMAGE_TYPES[t] === path.extname(name));
  if (!task || !type || !/^[\w.-]+$/.test(name)) return send(res, 404, { error: 'not found' });
  fs.readFile(path.join(store.taskDir(task), 'images', name), (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'private, max-age=86400' });
    res.end(data);
  });
}

// The UI files are re-read on every request but server code is not, so after a
// `git pull` the page can be newer than the server. Detect that and tell the user.
function serverCodeTime() {
  let latest = 0;
  for (const dir of ['src', 'ai-team.config.json']) {
    const p = path.join(ROOT, dir);
    try {
      const files = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((f) => path.join(p, f)) : [p];
      for (const f of files) latest = Math.max(latest, fs.statSync(f).mtimeMs);
    } catch {}
  }
  return latest;
}
const STARTED_CODE_TIME = serverCodeTime();

function runnerFor(id) {
  const r = runners.get(id);
  if (!r) throw fail(409, 'Task không còn chạy (đã xong, đã dừng hoặc server đã khởi động lại)');
  return r;
}

function startRunner(task, opts) {
  const runner = new TaskRunner({ task, store, hub, config, mock: MOCK });
  runners.set(task.id, runner);
  runner.done = runner.run(opts).finally(() => runners.delete(task.id));
  return runner;
}

function samePath(a, b) {
  const norm = (p) => path.resolve(p).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b);
}

async function repoPath(raw) {
  const p = path.resolve(String(raw || '').trim());
  if (!raw || !fs.existsSync(p)) throw fail(400, `Không tìm thấy thư mục: ${p}`);
  if (!(await git.isRepo(p))) throw fail(400, 'Thư mục này không phải git repo');
  return fs.realpathSync.native(p);
}

async function assertIdle(p, { requireClean = true } = {}) {
  for (const r of runners.values()) {
    if (samePath(r.task.projectPath, p)) throw fail(409, `Task "${r.task.title}" đang chạy trên project này, hãy đợi xong hoặc dừng task trước.`);
  }
  if (!requireClean) return;
  const dirty = await git.statusShort(p);
  if (dirty) throw fail(409, `Project đang có thay đổi chưa commit, hãy commit hoặc stash trước:\n${dirty.slice(0, 800)}`);
}

function publicAgents() {
  const out = {};
  for (const [key, a] of Object.entries(config.agents)) out[key] = { key, label: a.label, color: a.color, avatar: a.avatar || '' };
  // old chat history refers to agents by their former key
  for (const [oldKey, newKey] of Object.entries(AGENT_ALIASES)) if (out[newKey] && !out[oldKey]) out[oldKey] = out[newKey];
  return out;
}

function clampInt(v, min, max, fallback) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

const routes = {
  'GET /api/config': () => ({
    team: teamOf(config),
    agents: publicAgents(),
    mock: MOCK,
    autoModeDefault: config.autoModeDefault,
    maxDebateRounds: config.maxDebateRounds,
    needsRestart: serverCodeTime() > STARTED_CODE_TIME,
  }),

  'GET /api/settings': async () => ({
    roles: config.roles,
    maxDebateRounds: config.maxDebateRounds,
    maxFixRounds: config.maxFixRounds,
    autoModeDefault: config.autoModeDefault,
    historyInGit: Boolean(config.historyInGit),
    agents: Object.fromEntries(
      await Promise.all(
        Object.entries(config.agents).map(async ([key, a]) => {
          const { models, note } = await accountModels(key);
          return [key, { label: a.label, color: a.color, avatar: a.avatar || '', model: a.model || '', models, modelsNote: note }];
        }),
      ),
    ),
  }),

  // Saved to ai-team.config.local.json so each machine keeps its own choices.
  'POST /api/settings': async (req) => {
    const body = await readBody(req);
    const local = readLocalConfig();
    if (body.roles) {
      for (const role of ['analyst', 'critic', 'coder']) {
        if (!config.agents[body.roles[role]]) throw fail(400, `AI không hợp lệ cho role ${role}`);
      }
      local.roles = { analyst: body.roles.analyst, critic: body.roles.critic, coder: body.roles.coder };
    }
    local.maxDebateRounds = clampInt(body.maxDebateRounds, 1, 10, config.maxDebateRounds);
    local.maxFixRounds = clampInt(body.maxFixRounds, 0, 10, config.maxFixRounds);
    local.autoModeDefault = Boolean(body.autoModeDefault);
    local.historyInGit = Boolean(body.historyInGit);
    local.agents ||= {};
    for (const [key, a] of Object.entries(body.agents || {})) {
      if (!config.agents[key]) continue;
      const avatar = String(a.avatar || '');
      if (avatar && !/^data:image\/(png|jpeg|webp|gif);base64,/.test(avatar)) throw fail(400, 'Avatar phải là ảnh');
      if (avatar.length > 300_000) throw fail(400, 'Ảnh avatar quá lớn');
      local.agents[key] = {
        ...(local.agents[key] || {}),
        label: String(a.label || '').trim().slice(0, 30) || config.agents[key].label,
        color: /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : config.agents[key].color,
        avatar,
        model: String(a.model || '').trim().slice(0, 100),
      };
    }
    writeLocalConfig(local);
    config = loadConfig();
    hub.broadcast({ type: 'config' });
    return { ok: true };
  },

  // Which CLI each AI needs, where it was found and its version.
  'GET /api/cli': async () => {
    const rows = await Promise.all(
      Object.entries(config.agents).map(async ([key, a]) => {
        const found = findCommand(a.command);
        let version = null;
        if (found) {
          const r = await execCli(a.command, ['--version'], { timeout: 15_000 });
          version = r.ok ? (r.stdout || r.stderr).trim().split('\n')[0] : null;
        }
        return {
          key,
          label: a.label,
          command: a.command,
          roles: Object.entries(config.roles).filter(([, k]) => k === key).map(([r]) => r),
          found: found && { ...found, version, works: Boolean(version) },
          install: installCommandText(a.command),
          login: INSTALLERS[a.command]?.login || null,
          installing: installing.has(key),
        };
      }),
    );
    return rows;
  },

  // Runs the official installer; progress goes to every open page over SSE.
  'POST /api/cli/install': async (req) => {
    const { key } = await readBody(req);
    const a = config.agents[key];
    if (!a || !INSTALLERS[a.command]) throw fail(400, 'Không có lệnh cài tự động cho AI này');
    if (installing.has(key)) throw fail(409, 'Đang cài rồi');
    installing.add(key);
    hub.broadcast({ type: 'cli_install', key, line: `$ ${installCommandText(a.command)}` });
    runInstaller(a.command, (line) => hub.broadcast({ type: 'cli_install', key, line })).then((r) => {
      installing.delete(key);
      const found = findCommand(a.command);
      hub.broadcast({ type: 'cli_install_done', key, ok: r.ok && Boolean(found), error: r.ok && !found ? 'Đã chạy trình cài nhưng chưa tìm thấy CLI' : r.error });
    });
    return { ok: true };
  },

  'GET /api/git/branches': async (req, id, url) => {
    const raw = url.searchParams.get('path');
    const dir = path.resolve(String(raw || '').trim());
    if (!raw || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw fail(400, `Không tìm thấy thư mục: ${dir}`);
    if (!(await git.isRepo(dir))) return { path: fs.realpathSync.native(dir), notRepo: true };
    const p = fs.realpathSync.native(dir);
    const data = await git.listBranches(p);
    return {
      path: p,
      dirty: Boolean(await git.statusShort(p)),
      busy: [...runners.values()].some((r) => samePath(r.task.projectPath, p)),
      remotes: await git.listRemotes(p),
      ...data,
    };
  },

  'POST /api/git/remote': async (req) => {
    const { path: raw, name, url } = await readBody(req);
    const p = await repoPath(raw);
    const n = String(name || 'origin').trim();
    const u = String(url || '').trim();
    if (!/^[\w.-]+$/.test(n)) throw fail(400, 'Tên remote chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới');
    if (!u || /\s/.test(u)) throw fail(400, 'Link remote không hợp lệ');
    await git.setRemote(p, n, u);
    return { ok: true };
  },

  'POST /api/git/fetch': async (req) => {
    const { path: raw, name } = await readBody(req);
    const p = await repoPath(raw);
    try {
      return { ok: true, output: await git.fetchRemote(p, String(name)) };
    } catch (e) {
      throw fail(409, `Fetch thất bại:\n${e.message}`);
    }
  },

  'POST /api/git/pull': async (req) => {
    const { path: raw, branch } = await readBody(req);
    const p = await repoPath(raw);
    // pulling the checked-out branch touches the working tree; other branches do not
    await assertIdle(p, { requireClean: (await git.currentBranch(p)) === branch });
    let output;
    try {
      output = await git.pull(p, String(branch));
    } catch (e) {
      throw fail(409, `Pull thất bại:\n${e.message}`);
    }
    importTasks(p);
    return { ok: true, output };
  },

  'POST /api/git/push': async (req) => {
    const { path: raw, branch } = await readBody(req);
    const p = await repoPath(raw);
    await assertIdle(p, { requireClean: false });
    try {
      return { ok: true, output: await git.push(p, String(branch)) };
    } catch (e) {
      throw fail(409, `Push thất bại:\n${e.message}`);
    }
  },

  'POST /api/git/checkout': async (req) => {
    const { path: raw, branch, remote } = await readBody(req);
    const p = await repoPath(raw);
    await assertIdle(p);
    await git.switchTo(p, String(branch), { remote: Boolean(remote) });
    return { ok: true, current: await git.currentBranch(p) };
  },

  'POST /api/git/merge': async (req) => {
    const { path: raw, branch } = await readBody(req);
    const p = await repoPath(raw);
    await assertIdle(p);
    try {
      return { ok: true, output: await git.mergeIntoCurrent(p, String(branch)) };
    } catch (e) {
      throw fail(409, `Merge thất bại, đã huỷ merge để repo trở lại như cũ.\n${e.message}`);
    }
  },

  'GET /api/tasks': () => store.list(),

  'POST /api/tasks': async (req) => {
    const body = await readBody(req, WITH_IMAGES_LIMIT);
    const request = String(body.request || '').trim();
    let projectPath = path.resolve(String(body.projectPath || '').trim());
    if (!request) throw Object.assign(new Error('Hãy nhập yêu cầu'), { status: 400 });
    if (!body.projectPath || !fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
      throw Object.assign(new Error(`Không tìm thấy thư mục project: ${projectPath}`), { status: 400 });
    }
    // Expand 8.3 short names (C:\Users\ABC~1\...): Codex's sandbox only allows writes under the long path.
    projectPath = fs.realpathSync.native(projectPath);
    const title = String(body.title || '').trim() || request.split('\n')[0].slice(0, 60);
    const task = {
      id: newId(title),
      title,
      request,
      projectPath,
      createdAt: Date.now(),
      status: 'queued',
      stage: null,
      round: null,
      autoMode: body.autoMode ?? config.autoModeDefault,
    };
    task.requestImages = saveImages(task, body.images);
    store.add(task);
    startRunner(task);
    return task;
  },

  'POST /api/tasks/import': async (req) => {
    const { projectPath: raw } = await readBody(req);
    const dir = path.resolve(String(raw || '').trim());
    if (!raw || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw fail(400, `Không tìm thấy thư mục project: ${dir}`);
    const added = importTasks(fs.realpathSync.native(dir));
    return { added: added.length };
  },

  'GET /api/tasks/:id/events': (req, id, url) => {
    const task = store.get(id);
    if (!task) throw Object.assign(new Error('Không có task này'), { status: 404 });
    return { task, events: store.readEvents(task, Number(url.searchParams.get('after') || 0)) };
  },

  'POST /api/tasks/:id/message': async (req, id) => {
    const { text, images: pasted } = await readBody(req, WITH_IMAGES_LIMIT);
    const msg = String(text || '').trim();
    if (!msg && !pasted?.length) throw fail(400, 'Tin nhắn trống');
    const task = store.get(id);
    if (!task) throw fail(404, 'Không có task này');
    if (!fs.existsSync(task.projectPath)) throw fail(409, `Không còn thấy thư mục project: ${task.projectPath}`);
    const images = saveImages(task, pasted);
    const running = runners.get(id);
    if (running) {
      running.addUserMessage(msg, images);
      return { ok: true };
    }
    // Task already finished: the message becomes a follow-up request.
    startRunner(task, { followUp: msg, images });
    return { ok: true, followUp: true };
  },

  'POST /api/tasks/:id/gate': async (req, id) => {
    const { gateId, option, comment } = await readBody(req);
    runnerFor(id).resolveGate(gateId, option, String(comment || '').trim());
    return { ok: true };
  },

  'POST /api/tasks/:id/auto': async (req, id) => {
    const { autoMode } = await readBody(req);
    const r = runners.get(id);
    if (r) r.setAuto(Boolean(autoMode));
    else {
      const task = store.get(id);
      if (!task) throw Object.assign(new Error('Không có task này'), { status: 404 });
      task.autoMode = Boolean(autoMode);
      store.saveTask(task);
    }
    return { ok: true };
  },

  // Removes the task from the list and deletes its chat history folder. Git
  // branches and code the AIs wrote are left alone.
  'POST /api/tasks/:id/delete': async (req, id) => {
    const task = store.get(id);
    if (!task) throw fail(404, 'Không có task này');
    const running = runners.get(id);
    if (running) {
      running.stop();
      await running.done;
    }
    store.remove(task);
    hub.broadcast({ type: 'task_deleted', taskId: id });
    return { ok: true };
  },

  'POST /api/tasks/:id/stop': (req, id) => {
    runnerFor(id).stop();
    return { ok: true };
  },
};

function match(method, pathname) {
  for (const [key, handler] of Object.entries(routes)) {
    const [m, pattern] = key.split(' ');
    if (m !== method) continue;
    const re = new RegExp('^' + pattern.replace(':id', '([^/]+)') + '$');
    const hit = pathname.match(re);
    if (hit) return { handler, id: hit[1] && decodeURIComponent(hit[1]) };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 2000\n\n');
    hub.add(res);
    return;
  }
  const img = req.method === 'GET' && url.pathname.match(/^\/api\/tasks\/([^/]+)\/images\/([^/]+)$/);
  if (img) return serveImage(res, decodeURIComponent(img[1]), decodeURIComponent(img[2]));
  const route = match(req.method, url.pathname);
  if (!route) {
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);
    return send(res, 404, { error: 'not found' });
  }
  try {
    send(res, 200, await route.handler(req, route.id, url));
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
});

// --port overrides the config, e.g. to run a second copy next to the usual one
const PORT = portArg >= 0 ? Number(argv[portArg + 1]) : config.port;

server.listen(PORT, config.host, () => {
  const url = `http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${PORT}`;
  console.log(`AI Team đang chạy tại ${url}${MOCK ? '  (chế độ MOCK, không gọi AI thật)' : ''}`);
  console.log(`Role: ${Object.entries(teamOf(config)).map(([r, a]) => `${r}=${a.label}`).join(', ')}`);
  if (OPEN) {
    const [cmd, args] =
      process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  }
});
server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} đang bị dùng. Chạy với --port <số khác> hoặc đổi "port" trong ai-team.config.local.json.` : e.message);
  process.exit(1);
});
