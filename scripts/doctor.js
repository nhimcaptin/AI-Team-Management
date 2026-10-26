// npm run doctor             check Node, git and the CLI each AI needs
// npm run doctor -- --install  also install the missing CLIs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig } from '../src/config.js';
import { findCommand, execCli, INSTALLERS, installCommandText, runInstaller } from '../src/commands.js';
import { CLI_DATA, dirSize, fmtSize } from './common.js';

const INSTALL_MISSING = process.argv.includes('--install');
const ok = (s) => console.log(`  ${s}`);
const bad = (s) => console.log(`  ❌ ${s}`);
const info = (s) => console.log(`     ${s}`);

async function version(name) {
  if (!findCommand(name)) return null;
  const r = await execCli(name, ['--version']);
  return r.ok ? (r.stdout || r.stderr).trim().split('\n')[0] : null;
}

const config = loadConfig();
let problems = 0;

console.log('\nNode.js');
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok(`Node ${process.versions.node}`);
else {
  bad(`Node ${process.versions.node}, cần >= 20`);
  problems++;
}
const git = await version('git');
git ? ok(git) : (bad('Không tìm thấy git'), problems++);

console.log('\nCLI của các AI');
const used = new Set(Object.values(config.roles));
for (const [key, agent] of Object.entries(config.agents)) {
  const role = Object.entries(config.roles).find(([, k]) => k === key)?.[0];
  const name = `${agent.label}${role ? ` (role: ${role})` : ' (không dùng)'}`;
  let v = await version(agent.command);
  if (!v && used.has(key) && INSTALL_MISSING && INSTALLERS[agent.command]) {
    console.log(`  ⏳ Đang cài ${agent.label}: ${installCommandText(agent.command)}`);
    const r = await runInstaller(agent.command, (line) => info(line));
    if (!r.ok) info(`Cài không thành công: ${r.error}`);
    v = await version(agent.command);
  }
  if (v) {
    ok(`${name}: ${v}  [${findCommand(agent.command).source}]`);
  } else if (used.has(key)) {
    bad(`${name}: ${findCommand(agent.command) ? 'tìm thấy nhưng không chạy được' : 'chưa cài'}`);
    if (INSTALLERS[agent.command]) {
      info(`Cài:       ${installCommandText(agent.command)}   (hoặc: npm run doctor -- --install)`);
      info(`Đăng nhập: ${INSTALLERS[agent.command].login}`);
    }
    problems++;
  } else {
    info(`${name}: chưa cài`);
  }
}

console.log('\nDung lượng');
const where = (p) => path.parse(path.resolve(p)).root;
for (const drive of new Set([where(ROOT), where(CLI_DATA.codex.dir)])) {
  try {
    const st = fs.statfsSync(drive);
    info(`Ổ ${drive} còn trống ${fmtSize(st.bavail * st.bsize)}`);
  } catch {}
}
info(`AI Team (thư mục này): ${fmtSize(dirSize(ROOT))} tại ${ROOT}`);
for (const [key, data] of Object.entries(CLI_DATA)) {
  if (fs.existsSync(data.dir)) info(`Dữ liệu ${key}: ${fmtSize(dirSize(data.dir))} tại ${data.dir}`);
}
info('Dọn session cũ của các CLI: npm run clean-sessions');

console.log(problems ? `\nCòn ${problems} vấn đề cần xử lý. Vẫn có thể thử giao diện bằng: npm run mock\n` : '\nSẵn sàng. Chạy: npm start\n');
process.exitCode = problems ? 1 : 0;
