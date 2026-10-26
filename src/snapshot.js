import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// For projects without git: fingerprint the files before coding, then compare
// afterwards to know what the coder added, changed or deleted.

const SKIP_DIRS = new Set([
  '.git', '.ai-team', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', 'out',
  '.next', '.nuxt', 'target', 'bin', 'obj', '.idea', '.vs', '.gradle', 'coverage',
]);
const MAX_FILES = 20_000;
const HASH_LIMIT = 5 * 1024 * 1024;

function fingerprint(file, st) {
  if (st.size > HASH_LIMIT) return `${st.size}:${st.mtimeMs}`;
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
}

export function takeSnapshot(root) {
  const files = new Map();
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (files.size >= MAX_FILES) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(full);
      } else if (e.isFile()) {
        try {
          files.set(path.relative(root, full).replaceAll('\\', '/'), fingerprint(full, fs.statSync(full)));
        } catch {}
      }
    }
  };
  walk(root);
  return files;
}

export function compareSnapshot(root, before) {
  const after = takeSnapshot(root);
  const changes = [];
  for (const [file, fp] of after) {
    if (!before.has(file)) changes.push({ path: file, kind: 'added' });
    else if (before.get(file) !== fp) changes.push({ path: file, kind: 'modified' });
  }
  for (const file of before.keys()) if (!after.has(file)) changes.push({ path: file, kind: 'deleted' });
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

const KIND_VI = { added: 'thêm', modified: 'sửa', deleted: 'xoá' };

export function changesStat(changes) {
  return changes.map((c) => `${KIND_VI[c.kind].padEnd(4)} ${c.path}`).join('\n');
}

// Current content of added/modified text files, for reviewers (no old version is kept).
export function changesContent(root, changes, maxChars) {
  let out = '';
  for (const c of changes) {
    if (out.length >= maxChars) break;
    out += `\n=== ${c.path} (${c.kind}) ===\n`;
    if (c.kind === 'deleted') continue;
    try {
      const buf = fs.readFileSync(path.join(root, c.path));
      out += buf.includes(0) ? '(binary file)\n' : buf.toString('utf8').slice(0, maxChars - out.length) + '\n';
    } catch {
      out += '(cannot read)\n';
    }
  }
  return out.trim();
}
