import fs from 'node:fs';
import path from 'node:path';
import { runAgent } from './agents.js';
import { teamOf } from './config.js';
import * as P from './prompts.js';
import * as git from './git.js';
import { takeSnapshot, compareSnapshot, changesStat, changesContent } from './snapshot.js';

class StopError extends Error {}

const MAX_DIFF_EVENT = 200_000;

function countCalls(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.prompt.md')).length;
  } catch {
    return 0;
  }
}

/**
 * Drives one task through: analyze ⇄ critique → gate → code ⇄ review → gate → merge.
 * Every step is emitted as an event; the UI is just a view over that stream.
 */
export class TaskRunner {
  constructor({ task, store, hub, config, mock }) {
    this.task = task;
    this.store = store;
    this.hub = hub;
    this.config = config;
    this.mock = mock;
    this.team = teamOf(config);
    this.seq = store.lastSeq(task);
    this.calls = countCalls(path.join(store.taskDir(task), 'calls'));
    this.userMsgs = [];
    this.handles = new Set();
    this.pendingGate = null;
    this.stopped = false;
  }

  // ---------- events & state ----------

  emit(type, data = {}, { persist = true } = {}) {
    const evt = { taskId: this.task.id, seq: persist ? ++this.seq : null, ts: Date.now(), type, ...data };
    if (persist) this.store.appendEvent(this.task, evt);
    this.hub.broadcast(evt);
    return evt;
  }

  system(text, level = 'info') {
    this.emit('system', { text, level });
  }

  setState(patch) {
    Object.assign(this.task, patch);
    this.store.saveTask(this.task);
    this.hub.broadcast({ type: 'state', taskId: this.task.id, task: this.task });
  }

  stage(stage, round, text) {
    this.setState({ stage, round: round ?? null });
    this.emit('stage', { stage, round, text });
  }

  checkStop() {
    if (this.stopped) throw new StopError();
  }

  // ---------- user controls ----------

  addUserMessage(text) {
    this.userMsgs.push({ text, ts: Date.now(), seen: false });
    this.emit('user_message', { text });
  }

  setAuto(on) {
    this.setState({ autoMode: on });
    this.system(on ? '⚡ Đã bật Auto: AI tự chạy, không chờ duyệt.' : '✋ Đã tắt Auto: sẽ chờ bạn duyệt trước khi code và merge.');
    if (on && this.pendingGate?.autoable) {
      this.resolveGate(this.pendingGate.gateId, this.pendingGate.options[0].id, '', 'auto');
    }
  }

  resolveGate(gateId, option, comment = '', by = 'user') {
    const g = this.pendingGate;
    if (!g || g.gateId !== gateId) throw new Error('Thẻ duyệt này không còn hiệu lực');
    const opt = g.options.find((o) => o.id === option);
    if (!opt) throw new Error('Lựa chọn không hợp lệ');
    this.pendingGate = null;
    this.emit('gate_resolved', { gateId, option, label: opt.label, comment, by });
    if (comment) this.userMsgs.push({ text: comment, ts: Date.now(), seen: true });
    this.setState({ status: 'running' });
    g.resolve({ option, comment });
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    for (const h of this.handles) h.kill();
    if (this.pendingGate) {
      const g = this.pendingGate;
      this.pendingGate = null;
      g.reject(new StopError());
    }
  }

  // ---------- building blocks ----------

  ctx() {
    const userMessages = this.userMsgs.map((m) => ({ text: m.text, ts: m.ts, fresh: !m.seen }));
    for (const m of this.userMsgs) m.seen = true;
    return {
      team: this.team,
      language: this.config.language,
      projectPath: this.task.projectPath,
      request: this.task.request,
      history: this.task.history || [],
      maxDiffChars: this.config.maxDiffChars,
      userMessages,
    };
  }

  async gate(kind, { title, body = '', options, auto = false }) {
    this.checkStop();
    if (auto && this.task.autoMode) {
      this.system(`⚡ Auto: tự chọn "${options[0].label}" (${title})`);
      return { option: options[0].id, comment: '' };
    }
    const gateId = `${this.task.id}-g${this.seq + 1}`;
    this.emit('gate', { gateId, kind, title, body, options, autoable: auto });
    this.setState({ status: 'waiting' });
    return new Promise((resolve, reject) => {
      this.pendingGate = { gateId, options, autoable: auto, resolve, reject };
    });
  }

  async callAgent(role, step, prompt, mode, meta = {}) {
    this.checkStop();
    const agentKey = this.config.roles[role];
    const agentCfg = this.config.agents[agentKey];
    const n = ++this.calls;
    const msgId = `${this.task.id}-m${n}`;
    const base = path.join(this.store.taskDir(this.task), 'calls', `${String(n).padStart(2, '0')}-${role}-${step}`);
    fs.mkdirSync(path.dirname(base), { recursive: true });
    fs.writeFileSync(base + '.prompt.md', prompt);

    this.emit('agent_start', { msgId, agent: agentKey, role, step, round: meta.round ?? null });
    const started = Date.now();
    const minutes = this.config.timeoutMinutes[mode] ?? 20;
    const handle = runAgent({
      agentCfg,
      mode,
      prompt,
      cwd: this.task.projectPath,
      promptFile: base + '.prompt.md',
      outFile: base + '.last.txt',
      timeoutMs: minutes * 60_000,
      mock: this.mock,
      meta: { role, step, round: meta.round ?? 1 },
      onEvent: (e) => {
        if (e.type === 'delta') this.emit('agent_delta', { msgId, text: e.text }, { persist: false });
        else this.emit('agent_activity', { msgId, text: e.text });
      },
    });
    this.handles.add(handle);
    let res;
    try {
      res = await handle.promise;
    } finally {
      this.handles.delete(handle);
    }
    fs.writeFileSync(base + '.out.md', res.text || res.error || '');

    const verdict = meta.verdicts && res.ok ? P.parseVerdict(res.text, meta.verdicts) : null;
    this.emit('agent_end', {
      msgId,
      agent: agentKey,
      role,
      step,
      text: meta.verdicts ? P.stripVerdict(res.text) : res.text,
      ok: res.ok && !this.stopped,
      error: this.stopped ? 'Đã dừng' : res.error,
      verdict: verdict?.verdict ?? null,
      issues: verdict?.issues ?? [],
      durationMs: Date.now() - started,
    });
    this.checkStop();

    if (!res.ok) {
      const g = await this.gate('agent_error', {
        title: `${agentCfg.label} gặp lỗi`,
        body: '```\n' + String(res.error).slice(0, 2000) + '\n```',
        options: [
          { id: 'retry', label: 'Thử lại' },
          { id: 'stop', label: 'Dừng task' },
        ],
      });
      if (g.option === 'retry') return this.callAgent(role, step, prompt, mode, meta);
      throw new StopError();
    }
    if (meta.verdicts && !verdict) {
      this.system(`⚠️ ${agentCfg.label} không trả về verdict hợp lệ, coi như chưa đồng ý.`, 'warn');
    }
    return { text: res.text, verdict };
  }

  // ---------- pipeline ----------

  // A follow-up reruns the whole pipeline on the same task, with the earlier
  // requests and plans as context. A merged branch is not reused.
  async run({ followUp } = {}) {
    const t = this.task;
    if (followUp) {
      const history = [...(t.history || []), { request: t.request, plan: t.lastPlan, branch: t.branch, merged: Boolean(t.merged) }];
      const patch = { history, request: followUp, startedAt: Date.now(), finishedAt: null, error: null, merged: undefined, stage: null, round: null };
      if (t.merged) Object.assign(patch, { branch: null, baseBranch: null });
      this.setState(patch);
      this.emit('followup', { n: history.length + 1, text: followUp });
    } else {
      this.setState({ startedAt: Date.now() });
      this.emit('user_message', { text: t.request });
    }
    this.setState({ status: 'running' });
    this.system(
      `${followUp ? 'Bắt đầu yêu cầu tiếp theo' : 'Bắt đầu task'}. ${this.team.analyst.label} phân tích, ${this.team.critic.label} phản biện, ${this.team.coder.label} viết code.` +
        (this.mock ? ' (chế độ mock)' : ''),
    );
    try {
      const plan = await this.planPhase();
      this.setState({ lastPlan: plan.analysis });
      const useGit = await git.isRepo(t.projectPath);
      this.setState({ useGit });
      if (useGit) {
        await this.codePhase(plan, this.gitTracker());
        await this.mergePhase();
      } else {
        this.system('📁 Project không dùng git: AI sửa thẳng trong thư mục, không tạo branch và không có bước merge.');
        const changes = await this.codePhase(plan, this.snapshotTracker());
        this.reportNoGit(changes);
      }
      this.stage('done', null, '🎉 Hoàn tất');
      this.setState({ status: 'done', finishedAt: Date.now() });
    } catch (e) {
      await this.restoreBase();
      if (e instanceof StopError || this.stopped) {
        this.system('⏹️ Task đã dừng.', 'warn');
        this.setState({ status: 'stopped', finishedAt: Date.now() });
      } else {
        this.system(`❌ Lỗi: ${e.message}`, 'error');
        this.setState({ status: 'error', error: e.message, finishedAt: Date.now() });
      }
    }
    await this.saveHistory();
  }

  // With historyInGit on, the chat history is committed on the user's branch so a
  // push carries it to another machine, where the task can be continued.
  async saveHistory() {
    const { projectPath: cwd, branch, merged } = this.task;
    if (!this.config.historyInGit) return;
    try {
      if (!(await git.isRepo(cwd)) || !(await git.hasCommits(cwd))) return;
      const current = await git.currentBranch(cwd);
      // never mix it into an AI branch that was not merged
      if (branch && !merged && current === branch) return;
      // written before the commit so the commit holds the whole history
      this.system(`💾 Lưu lịch sử chat vào git (\`${current}\`). Push branch này để làm tiếp task trên máy khác.`);
      const dir = path.relative(cwd, this.store.taskDir(this.task)).replaceAll('\\', '/');
      await git.commitHistory(cwd, dir, `ai-team: lưu lịch sử task "${this.task.title}"`);
    } catch (e) {
      this.system(`⚠️ Không commit được lịch sử chat: ${e.message}`, 'warn');
    }
  }

  async planPhase() {
    const { analyst, critic } = this.team;
    let analysis = '';
    let critique = null;
    let feedback = '';
    for (;;) {
      let maxRounds = this.config.maxDebateRounds;
      for (let round = 1; ; round++) {
        this.stage('analyze', round, round === 1 && !analysis ? `${analyst.label} phân tích yêu cầu` : `${analyst.label} sửa phân tích (vòng ${round})`);
        analysis = (
          await this.callAgent('analyst', 'analyze', P.analyze(this.ctx(), { prevAnalysis: analysis, critique: critique?.text, feedback }), 'read', { round })
        ).text;
        feedback = '';

        this.stage('critique', round, `${critic.label} phản biện, vòng ${round}/${maxRounds}`);
        critique = await this.callAgent('critic', 'critique', P.critique(this.ctx(), { analysis, round, maxRounds }), 'read', {
          round,
          verdicts: ['AGREE', 'OBJECT'],
        });
        if (critique.verdict?.verdict === 'AGREE') {
          this.system(`✅ ${analyst.label} và ${critic.label} đã đồng thuận kế hoạch.`, 'success');
          break;
        }
        if (round >= maxRounds) {
          const g = await this.gate('deadlock', {
            title: `Sau ${round} vòng ${analyst.label} và ${critic.label} vẫn chưa đồng thuận`,
            body: 'Bạn quyết định: cho tranh luận thêm, chấp nhận kế hoạch hiện tại, hoặc dừng. Có thể ghi góp ý để định hướng.',
            options: [
              { id: 'more', label: 'Tranh luận thêm 1 vòng' },
              { id: 'accept', label: 'Chấp nhận kế hoạch hiện tại' },
              { id: 'stop', label: 'Dừng task' },
            ],
          });
          if (g.option === 'stop') throw new StopError();
          if (g.option === 'accept') break;
          maxRounds++;
          feedback = g.comment;
        }
      }

      this.stage('gate_code', null, 'Chờ duyệt kế hoạch trước khi code');
      const g = await this.gate('code', {
        title: 'Duyệt kế hoạch để bắt đầu code?',
        body: `Kế hoạch cuối của ${analyst.label} ở trên. Từ chối kèm góp ý thì ${analyst.label} sẽ phân tích lại.`,
        options: [
          { id: 'approve', label: 'Duyệt, bắt đầu code' },
          { id: 'reject', label: 'Từ chối, phân tích lại' },
        ],
        auto: true,
      });
      if (g.option === 'approve') return { analysis, critique: critique?.text, note: g.comment };
      feedback = g.comment || 'Người dùng từ chối kế hoạch. Hãy xem lại toàn bộ phương án.';
      critique = null;
    }
  }

  async prepareGit() {
    const cwd = this.task.projectPath;
    const retry = async (kind, title, body) => {
      const g = await this.gate(kind, {
        title,
        body,
        options: [
          { id: 'retry', label: 'Tôi đã xử lý, kiểm tra lại' },
          { id: 'stop', label: 'Dừng task' },
        ],
      });
      if (g.option === 'stop') throw new StopError();
    };
    while (!(await git.hasCommits(cwd))) {
      await retry('nogit', 'Repo chưa có commit nào', 'Tạo commit đầu tiên (ví dụ `git add -A && git commit -m init`), rồi bấm kiểm tra lại.');
    }
    await git.ensureExclude(cwd);

    if (this.task.branch && (await git.branchExists(cwd, this.task.branch))) {
      await git.checkout(cwd, this.task.branch);
      return;
    }
    // task continued on another machine: its branch was pushed but never checked out here
    const remote = this.task.branch && !this.task.merged && (await git.remoteBranch(cwd, this.task.branch));
    if (remote) {
      await git.switchTo(cwd, remote, { remote: true });
      this.system(`🌿 Lấy branch \`${this.task.branch}\` từ \`${remote}\``);
      return;
    }
    for (;;) {
      const dirty = await git.statusShort(cwd);
      if (!dirty) break;
      await retry(
        'dirty',
        'Project đang có thay đổi chưa commit',
        `Hãy commit hoặc stash trước để code của AI không trộn với code của bạn:\n\`\`\`\n${dirty.slice(0, 1500)}\n\`\`\``,
      );
    }
    const base = await git.currentBranch(cwd);
    let branch = `ai-team/${this.task.id}`;
    for (let n = 2; await git.branchExists(cwd, branch); n++) branch = `ai-team/${this.task.id}-${n}`;
    await git.checkout(cwd, branch, { create: true });
    this.setState({ baseBranch: base, branch });
    this.system(`🌿 Tạo branch \`${branch}\` từ \`${base}\``);
  }

  // A tracker hides how changes are recorded: git branch + commits, or a
  // before/after file snapshot when the project has no git.
  gitTracker() {
    const cwd = this.task.projectPath;
    return {
      prepare: () => this.prepareGit(),
      collect: async (round) => {
        const now = await git.currentBranch(cwd);
        if (now !== this.task.branch) {
          this.system(`⚠️ ${this.team.coder.label} đã chuyển sang branch \`${now}\`, quay lại \`${this.task.branch}\`.`, 'warn');
          await git.checkout(cwd, this.task.branch);
        }
        await git.commitAll(cwd, `ai-team: ${this.task.title} (round ${round})`);
        const diff = await git.diff(cwd, this.task.baseBranch, this.task.branch);
        const diffStat = await git.diffStat(cwd, this.task.baseBranch, this.task.branch);
        this.emit('diff', { stat: diffStat, diff: diff.slice(0, MAX_DIFF_EVENT), truncated: diff.length > MAX_DIFF_EVENT });
        if (!diff.trim()) this.system(`⚠️ Chưa có thay đổi nào so với \`${this.task.baseBranch}\`.`, 'warn');
        return { diff, diffStat, diffTitle: 'Diff (base...branch)', diffLang: 'diff' };
      },
    };
  }

  snapshotTracker() {
    const cwd = this.task.projectPath;
    let before;
    return {
      prepare: async () => {
        before = takeSnapshot(cwd);
      },
      collect: async () => {
        const changes = compareSnapshot(cwd, before);
        this.emit('changes', { files: changes });
        if (!changes.length) this.system('⚠️ Chưa có file nào thay đổi.', 'warn');
        return {
          changes,
          diff: changesContent(cwd, changes, this.config.maxDiffChars),
          diffStat: changesStat(changes),
          diffTitle: 'Changed files with their current content (project has no git, so no old version is available)',
          diffLang: 'text',
        };
      },
    };
  }

  async codePhase(plan, tracker) {
    const { analyst, critic, coder } = this.team;
    await tracker.prepare();
    let reviewFeedback = '';
    let maxFix = this.config.maxFixRounds;
    let collected;
    for (let round = 1; ; round++) {
      this.stage('code', round, round === 1 ? `${coder.label} bắt đầu viết code` : `${coder.label} sửa theo review (lần ${round - 1})`);
      const coded = await this.callAgent('coder', 'code', P.code(this.ctx(), { plan, reviewFeedback, round }), 'write', { round });
      collected = await tracker.collect(round);

      this.stage('review', round, `Review lần ${round}: ${analyst.label} (đúng yêu cầu) và ${critic.label} (rủi ro)`);
      const reviewArgs = { plan, ...collected, coderSummary: coded.text, round };
      const verdicts = ['APPROVE', 'CHANGES'];
      const ctx = this.ctx();
      const ra = await this.callAgent('analyst', 'review', P.review(ctx, 'analyst', reviewArgs), 'read', { round, verdicts });
      const rc = await this.callAgent('critic', 'review', P.review(ctx, 'critic', reviewArgs), 'read', { round, verdicts });
      if (ra.verdict?.verdict === 'APPROVE' && rc.verdict?.verdict === 'APPROVE') {
        this.system('✅ Cả hai reviewer đã APPROVE.', 'success');
        return collected;
      }
      reviewFeedback = [ra, rc]
        .map((r, i) => (r.verdict?.verdict === 'APPROVE' ? '' : `### ${[analyst, critic][i].label}\n${r.text}`))
        .filter(Boolean)
        .join('\n\n');

      if (round > maxFix) {
        const g = await this.gate('review_deadlock', {
          title: `Đã sửa ${round - 1} lần mà review vẫn chưa đạt`,
          body: 'Bạn quyết định tiếp theo. Góp ý (nếu có) sẽ được chuyển cho coder.',
          options: [
            { id: 'more', label: 'Cho sửa thêm 1 lần' },
            { id: 'accept', label: this.task.useGit ? 'Bỏ qua review, sang bước merge' : 'Bỏ qua review, kết thúc' },
            { id: 'stop', label: 'Dừng task' },
          ],
        });
        if (g.option === 'stop') throw new StopError();
        if (g.option === 'accept') return collected;
        maxFix++;
      }
    }
  }

  reportNoGit({ diffStat }) {
    this.emit('report', {
      text:
        `## Báo cáo task\n\n**Yêu cầu:** ${this.task.request}\n\n` +
        `Thay đổi đã được ghi thẳng vào thư mục project (không dùng git).\n\n` +
        (diffStat ? '**File thay đổi:**\n```\n' + diffStat + '\n```\n' : '**Không có file nào thay đổi.**\n') +
        `\nLịch sử đầy đủ và prompt của từng lượt nằm trong \`.ai-team/${this.task.id}/\`.`,
    });
  }

  // Leave the user's checkout on the branch they started from. Uncommitted
  // work (a coder stopped mid-edit) is committed to the AI branch first.
  async restoreBase() {
    const { projectPath: cwd, branch, baseBranch, useGit } = this.task;
    if (!useGit || !branch || !baseBranch) return;
    try {
      if ((await git.currentBranch(cwd)) !== branch) return;
      await git.commitAll(cwd, `ai-team: ${this.task.title} (dở dang)`);
      await git.checkout(cwd, baseBranch);
    } catch (e) {
      this.system(`⚠️ Không quay về được \`${baseBranch}\`: ${e.message}`, 'warn');
    }
  }

  async mergePhase() {
    const cwd = this.task.projectPath;
    const { branch, baseBranch } = this.task;
    const stat = await git.diffStat(cwd, baseBranch, branch);
    this.stage('gate_merge', null, 'Chờ duyệt merge');
    const g = await this.gate('merge', {
      title: `Merge \`${branch}\` vào \`${baseBranch}\`?`,
      body: 'Merge chỉ diễn ra trên máy bạn, không push lên remote.',
      options: [
        { id: 'approve', label: 'Duyệt, merge' },
        { id: 'reject', label: 'Không merge, giữ branch' },
      ],
      auto: true,
    });
    let merged = false;
    if (g.option === 'approve') {
      try {
        await git.merge(cwd, baseBranch, branch, `Merge ${branch}: ${this.task.title}`);
        merged = true;
        this.system(`🔀 Đã merge \`${branch}\` vào \`${baseBranch}\` (chưa push).`, 'success');
      } catch (e) {
        this.system(`❌ Merge thất bại, branch vẫn giữ nguyên: ${e.message}`, 'error');
      }
    } else {
      await this.restoreBase();
      this.system(`Giữ branch \`${branch}\`, không merge. Repo đã quay về \`${baseBranch}\`.`);
    }
    this.emit('report', {
      text:
        `## Báo cáo task\n\n**Yêu cầu:** ${this.task.request}\n\n` +
        `**Branch:** \`${branch}\` → ${merged ? `đã merge vào \`${baseBranch}\`` : 'chưa merge'}\n\n` +
        (stat ? '**Thay đổi:**\n```\n' + stat + '\n```\n' : '') +
        `\nLịch sử đầy đủ và prompt của từng lượt nằm trong \`.ai-team/${this.task.id}/\`.`,
    });
    this.setState({ merged });
  }
}
