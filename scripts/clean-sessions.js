// Lists CLI session files older than N days and deletes them after confirmation.
// Usage: npm run clean-sessions -- --days 14
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { CLI_DATA, walk, fmtSize } from './common.js';

const i = process.argv.indexOf('--days');
const days = i >= 0 ? Number(process.argv[i + 1]) : 14;
if (!(days > 0)) {
  console.error('--days phải là số dương');
  process.exit(1);
}
const cutoff = Date.now() - days * 86_400_000;

const found = [];
for (const [key, data] of Object.entries(CLI_DATA)) {
  let size = 0;
  const files = [];
  for (const sub of data.sessions) {
    walk(path.join(data.dir, sub), (p, st) => {
      if (st.mtimeMs < cutoff) {
        files.push(p);
        size += st.size;
      }
    });
  }
  if (files.length) found.push({ key, files, size, dir: data.dir });
}

if (!found.length) {
  console.log(`Không có session nào cũ hơn ${days} ngày.`);
  process.exit(0);
}

console.log(`Session cũ hơn ${days} ngày:`);
for (const f of found) console.log(`  ${f.key.padEnd(7)} ${String(f.files.length).padStart(5)} file  ${fmtSize(f.size).padStart(8)}  (${f.dir})`);
const total = found.reduce((s, f) => s + f.size, 0);
console.log(`Tổng: ${fmtSize(total)}. Lịch sử hội thoại cũ của các CLI sẽ mất; đăng nhập và cấu hình không bị ảnh hưởng.`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = (await rl.question('Xoá các file này? (gõ "yes" để xoá): ')).trim().toLowerCase();
rl.close();
if (answer !== 'yes') {
  console.log('Không xoá gì.');
  process.exit(0);
}
let removed = 0;
for (const f of found) {
  for (const p of f.files) {
    try {
      fs.rmSync(p);
      removed++;
    } catch {}
  }
}
console.log(`Đã xoá ${removed} file, giải phóng khoảng ${fmtSize(total)}.`);
