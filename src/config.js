import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { commandExists, execCli } from './commands.js';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

// Arrays are replaced, objects are merged key by key.
function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = isObject(v) && isObject(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw new Error(`Không đọc được ${path.basename(file)}: ${e.message}`);
  }
}

export function loadConfig() {
  const base = readJson(path.join(ROOT, 'ai-team.config.json'));
  if (!base) throw new Error('Thiếu ai-team.config.json');
  const local = migrateLocal(readJson(path.join(ROOT, 'ai-team.config.local.json')));
  const config = merge(base, local);
  for (const role of ['analyst', 'critic', 'coder']) {
    const key = config.roles[role];
    if (!config.agents[key]) throw new Error(`Role "${role}" trỏ tới agent "${key}" không có trong "agents"`);
  }
  return config;
}

// Agent keys that were renamed; old chat history and settings still use them.
export const AGENT_ALIASES = { gemini: 'antigravity' };

// The third AI used to be configured as "gemini" (Gemini CLI); it is Antigravity
// now. Move saved choices over once and rewrite the local file.
function migrateLocal(local) {
  if (!local?.agents?.gemini && !Object.values(local?.roles || {}).includes('gemini')) return local;
  for (const [role, key] of Object.entries(local.roles || {})) {
    if (AGENT_ALIASES[key]) local.roles[role] = AGENT_ALIASES[key];
  }
  const old = local.agents?.gemini;
  if (old) {
    delete local.agents.gemini;
    // keep a custom avatar; the old label and Gemini CLI model do not apply to Antigravity
    if (old.avatar) local.agents.antigravity = { ...(local.agents.antigravity || {}), avatar: old.avatar };
  }
  writeLocalConfig(local);
  return local;
}

export function teamOf(config) {
  const team = {};
  for (const [role, key] of Object.entries(config.roles)) {
    const a = config.agents[key];
    team[role] = { key, label: a.label, color: a.color, avatar: a.avatar || '' };
  }
  return team;
}

const LOCAL_FILE = path.join(ROOT, 'ai-team.config.local.json');

export function readLocalConfig() {
  return readJson(LOCAL_FILE) || {};
}

export function writeLocalConfig(local) {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(local, null, 2) + '\n');
}

const fmtDate = (ms) => new Date(ms).toLocaleString('vi-VN');

// Models the signed-in account can use. Each CLI downloads this list from its
// server for the current account and caches it; we only read that cache.
const ACCOUNT_MODELS = {
  claude() {
    const home = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const dir = path.join(home, 'cache', 'model-catalog');
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    } catch {}
    const catalogs = files
      .map((f) => readJsonSafe(path.join(dir, f)))
      .filter((c) => Array.isArray(c?.catalog?.config?.models))
      // prefer the Claude Code CLI catalog, then the newest
      .sort((a, b) => (b.catalog.surface === 'cc') - (a.catalog.surface === 'cc') || b.fetchedAt - a.fetchedAt);
    const c = catalogs[0];
    if (!c) return { models: [], note: 'Chưa thấy danh sách model. Hãy đăng nhập Claude Code và chạy nó một lần.' };
    return {
      models: c.catalog.config.models.map((m) => ({ id: m.id, name: m.name || m.id, group: m.section === 'main' ? 'Chính' : 'Khác' })),
      note: `Theo tài khoản Claude, cập nhật ${fmtDate(c.fetchedAt)}`,
    };
  },

  codex() {
    const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
    const cache = readJsonSafe(path.join(home, 'models_cache.json'));
    const models = (cache?.models || []).filter((m) => m.visibility === 'list');
    if (!models.length) return { models: [], note: 'Chưa thấy danh sách model. Hãy đăng nhập Codex (codex login) và chạy nó một lần.' };
    return {
      models: models.map((m) => ({ id: m.slug, name: m.display_name || m.slug, group: 'Chính' })),
      note: `Theo tài khoản Codex, cập nhật ${fmtDate(Date.parse(cache.fetched_at))}`,
    };
  },
};

// Antigravity keeps no model cache on disk; its CLI lists them with `agy models`.
// The output format is not documented, so accept JSON or one model per line.
function parseAgyModels(out) {
  try {
    const data = JSON.parse(out);
    const list = Array.isArray(data) ? data : data.models || [];
    return list
      .map((m) => (typeof m === 'string' ? { id: m, name: m } : { id: m.id || m.name || m.model, name: m.displayName || m.display_name || m.name || m.id }))
      .filter((m) => m.id);
  } catch {}
  const models = [];
  for (const raw of out.split(/\r?\n/)) {
    const line = raw.replace(/^[\s*•\-–>✓✔]+/, '').trim();
    const m = line.match(/^([A-Za-z0-9][\w.\-/:@]*)(?:\s+[-–:|]?\s*(.*))?$/);
    // skip headings like "Available models:" (a lone word ending in ':')
    if (!m || /:$/.test(line) || !/[\d-]/.test(m[1])) continue;
    models.push({ id: m[1], name: m[2]?.trim() || m[1] });
  }
  return models;
}

let agyCache = null;

function agyModels() {
  if (agyCache && Date.now() - agyCache.at < 5 * 60_000) return Promise.resolve(agyCache.value);
  if (!commandExists('agy')) {
    return Promise.resolve({ models: [], note: 'Chưa cài Antigravity CLI (agy), nên chưa lấy được model. Chạy npm run doctor để xem cách cài.' });
  }
  return execCli('agy', ['models']).then(({ ok, stdout, stderr, error }) => {
    if (!ok) return { models: [], note: `agy models lỗi: ${(stderr || error.message).trim().split('\n')[0]}` };
    const models = parseAgyModels(stdout).map((m) => ({ ...m, group: 'Chính' }));
    const value = models.length
      ? { models, note: `Theo tài khoản Antigravity (agy models), lúc ${fmtDate(Date.now())}` }
      : { models: [], note: 'agy models không trả về model nào, hãy gõ tên model.' };
    agyCache = { at: Date.now(), value };
    return value;
  });
}

ACCOUNT_MODELS.antigravity = agyModels;

export async function accountModels(agentKey) {
  const read = ACCOUNT_MODELS[agentKey];
  if (!read) return { models: [], note: 'CLI này không cung cấp danh sách model theo tài khoản, hãy gõ tên model.' };
  try {
    return await read();
  } catch (e) {
    return { models: [], note: `Không đọc được danh sách model: ${e.message}` };
  }
}

function readJsonSafe(file) {
  try {
    return readJson(file);
  } catch {
    return null;
  }
}
