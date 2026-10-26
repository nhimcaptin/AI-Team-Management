import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function git(cwd, args, { allowFail = false, timeout = 0 } = {}) {
  // never wait for a username/password prompt in a terminal nobody sees
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, env, timeout, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err && !allowFail) {
        reject(new Error(`git ${args.join(' ')}: ${(stderr || err.message).trim()}`));
      } else {
        resolve({ ok: !err, out: String(stdout).trim(), stderr: String(stderr).trim() });
      }
    });
  });
}

export async function isRepo(cwd) {
  const r = await git(cwd, ['rev-parse', '--is-inside-work-tree'], { allowFail: true });
  return r.ok && r.out === 'true';
}

export async function hasCommits(cwd) {
  return (await git(cwd, ['rev-parse', '--verify', 'HEAD'], { allowFail: true })).ok;
}

// Keep the chat history folder out of `git status` without touching .gitignore.
export async function ensureExclude(cwd) {
  const rel = (await git(cwd, ['rev-parse', '--git-path', 'info/exclude'])).out;
  const file = path.resolve(cwd, rel);
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {}
  if (!content.split(/\r?\n/).includes('.ai-team/')) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, (content && !content.endsWith('\n') ? '\n' : '') + '.ai-team/\n');
  }
}

// The tool writes its chat history into .ai-team/ while it runs. If a user committed
// that folder, the exclude file no longer hides it, so leave it out explicitly.
const SKIP_HISTORY = ['--', '.', ':(exclude).ai-team'];

export async function statusShort(cwd) {
  return (await git(cwd, ['status', '--porcelain', ...SKIP_HISTORY])).out;
}

export async function currentBranch(cwd) {
  return (await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])).out;
}

export async function branchExists(cwd, branch) {
  return (await git(cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], { allowFail: true })).ok;
}

export async function checkout(cwd, branch, { create = false } = {}) {
  await git(cwd, create ? ['checkout', '-b', branch] : ['checkout', branch]);
}

export async function commitAll(cwd, message) {
  // `add` with an exclude pathspec fails when .ai-team/ is ignored, so stage
  // everything and then take the history back out of the index
  await git(cwd, ['add', '-A']);
  await git(cwd, ['reset', '-q', '--', '.ai-team'], { allowFail: true });
  if ((await git(cwd, ['diff', '--cached', '--quiet'], { allowFail: true })).ok) return false; // nothing staged
  const r = await git(cwd, ['commit', '-m', message], { allowFail: true });
  if (!r.ok) {
    // machine without user.name/user.email configured
    await git(cwd, ['-c', 'user.name=AI Team', '-c', 'user.email=ai-team@localhost', 'commit', '-m', message]);
  }
  return true;
}

// Commits only the given task's history folder; anything else the user has
// staged or changed stays as it was. -f because .ai-team/ is in info/exclude.
export async function commitHistory(cwd, dir, message) {
  const only = ['--', dir];
  await git(cwd, ['add', '-f', '-A', ...only]);
  if (!(await git(cwd, ['diff', '--cached', '--quiet', ...only], { allowFail: true })).ok) {
    const r = await git(cwd, ['commit', '-m', message, ...only], { allowFail: true });
    if (!r.ok) await git(cwd, ['-c', 'user.name=AI Team', '-c', 'user.email=ai-team@localhost', 'commit', '-m', message, ...only]);
    return true;
  }
  return false;
}

// A branch that exists only on a remote, e.g. one pushed from another machine.
export async function remoteBranch(cwd, branch) {
  const out = (await git(cwd, ['for-each-ref', '--format=%(refname:short)', `refs/remotes/*/${branch}`])).out;
  return out.split('\n').filter(Boolean)[0] || null;
}

export async function diff(cwd, base, head) {
  return (await git(cwd, ['diff', `${base}...${head}`])).out;
}

export async function diffStat(cwd, base, head) {
  return (await git(cwd, ['diff', '--stat', `${base}...${head}`])).out;
}

// Local and remote branches. Local ones carry ahead/behind against their upstream,
// like the ↑↓ counts in VS Code.
export async function listBranches(cwd) {
  const fmt = ['%(refname)', '%(refname:short)', '%(objectname:short)', '%(committerdate:unix)', '%(authorname)', '%(subject)', '%(upstream:short)', '%(upstream:track,nobracket)'].join('%00');
  const out = (await git(cwd, ['for-each-ref', `--format=${fmt}`, 'refs/heads', 'refs/remotes'])).out;
  const current = (await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'], { allowFail: true })).out;
  const branches = [];
  for (const line of out.split('\n')) {
    if (!line) continue;
    const [ref, name, hash, date, author, subject, upstream, track] = line.split('\0');
    if (ref.endsWith('/HEAD')) continue;
    branches.push({
      name,
      remote: ref.startsWith('refs/remotes/'),
      current: name === current,
      hash,
      date: Number(date) * 1000,
      author,
      subject,
      upstream: upstream || null,
      ahead: Number(track.match(/ahead (\d+)/)?.[1] || 0),
      behind: Number(track.match(/behind (\d+)/)?.[1] || 0),
      gone: track === 'gone',
    });
  }
  return { current, branches };
}

// Checks out a local branch, or creates a tracking branch for a remote one.
export async function switchTo(cwd, name, { remote = false } = {}) {
  if (!remote) return checkout(cwd, name);
  const local = name.replace(/^[^/]+\//, '');
  if (await branchExists(cwd, local)) return checkout(cwd, local);
  await git(cwd, ['checkout', '--track', name]);
}

export async function mergeIntoCurrent(cwd, branch) {
  const r = await git(cwd, ['merge', '--no-ff', '--no-edit', branch], { allowFail: true });
  if (!r.ok) {
    await git(cwd, ['merge', '--abort'], { allowFail: true });
    throw new Error(r.stderr || r.out || 'merge thất bại');
  }
  return r.out;
}

export async function listRemotes(cwd) {
  const out = (await git(cwd, ['remote', '-v'])).out;
  const remotes = new Map();
  for (const line of out.split('\n')) {
    const m = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (m && m[3] === 'fetch') remotes.set(m[1], { name: m[1], url: m[2] });
  }
  return [...remotes.values()];
}

// Adds the remote, or changes its URL when the name already exists.
export async function setRemote(cwd, name, url) {
  const exists = (await listRemotes(cwd)).some((r) => r.name === name);
  await git(cwd, exists ? ['remote', 'set-url', name, url] : ['remote', 'add', name, url]);
}

export async function fetchRemote(cwd, name) {
  return runOrThrow(cwd, ['fetch', '--prune', name], 'fetch thất bại (quá thời gian hoặc chưa đăng nhập git)');
}

async function config(cwd, key) {
  return (await git(cwd, ['config', '--get', key], { allowFail: true })).out || null;
}

async function runOrThrow(cwd, args, fallback) {
  const r = await git(cwd, args, { allowFail: true, timeout: 120_000 });
  if (!r.ok) throw new Error(r.stderr || r.out || fallback);
  return r.stderr || r.out;
}

// Fast-forward only: never creates a merge commit or touches a diverged branch.
// A branch that is not checked out is updated without switching to it.
export async function pull(cwd, branch) {
  const remote = await config(cwd, `branch.${branch}.remote`);
  const ref = await config(cwd, `branch.${branch}.merge`);
  if (!remote || !ref) throw new Error(`Branch ${branch} chưa có upstream (chưa push lên remote lần nào).`);
  const isCurrent = (await currentBranch(cwd)) === branch;
  const args = isCurrent ? ['pull', '--ff-only'] : ['fetch', remote, `${ref}:refs/heads/${branch}`];
  return runOrThrow(cwd, args, 'pull thất bại');
}

// Pushes to the branch's upstream; the first push sets origin (or the only remote) as upstream.
export async function push(cwd, branch) {
  let remote = await config(cwd, `branch.${branch}.remote`);
  const hasUpstream = Boolean(remote);
  if (!remote) {
    const remotes = await listRemotes(cwd);
    remote = remotes.find((r) => r.name === 'origin')?.name || remotes[0]?.name;
  }
  if (!remote) throw new Error('Repo chưa liên kết remote.');
  return runOrThrow(cwd, ['push', ...(hasUpstream ? [] : ['-u']), remote, branch], 'push thất bại');
}

export async function merge(cwd, base, branch, message) {
  await checkout(cwd, base);
  const r = await git(cwd, ['merge', '--no-ff', '-m', message, branch], { allowFail: true });
  if (!r.ok) {
    await git(cwd, ['merge', '--abort'], { allowFail: true });
    throw new Error(r.stderr || 'merge thất bại');
  }
}
