import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

// Where each CLI keeps its login and session history by default.
export const CLI_DATA = {
  claude: { dir: process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude'), sessions: ['projects'] },
  codex: { dir: process.env.CODEX_HOME || path.join(HOME, '.codex'), sessions: ['sessions', 'archived_sessions'] },
  // ~/.gemini also holds the Antigravity app's own conversations, so clean-sessions leaves it alone
  antigravity: { dir: path.join(HOME, '.gemini'), sessions: [] },
};

export function walk(dir, onFile) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, onFile);
    else if (e.isFile()) {
      try {
        onFile(p, fs.statSync(p));
      } catch {}
    }
  }
}

export function dirSize(dir) {
  let total = 0;
  walk(dir, (_, st) => (total += st.size));
  return total;
}

export function fmtSize(bytes) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(0) + ' MB';
  return Math.round(bytes / 1024) + ' KB';
}
