const LANGUAGES = { vi: 'Vietnamese (Tiếng Việt)', en: 'English' };

const ROLE_DESC = {
  analyst:
    'ANALYST. You study the problem as a whole: understand the request, explore the codebase, and propose the approach and a concrete implementation plan.',
  critic:
    'CRITIC / RISK REVIEWER. You challenge the plan and the code: find wrong assumptions, risks and missing cases, and push back when something is not right.',
  coder: 'CODER. You implement the plan the Analyst and Critic agreed on, and fix what reviewers ask for.',
};

function header(ctx, role) {
  const t = ctx.team;
  return `You are ${t[role].label}, a member of a 3-AI software team working in a group chat supervised by a human lead.
Team: ${t.analyst.label} = Analyst, ${t.critic.label} = Critic (risk reviewer), ${t.coder.label} = Coder.
Your role: ${ROLE_DESC[role]}
Project root (your working directory): ${ctx.projectPath}
Write your reply as a chat message to the team, in ${LANGUAGES[ctx.language] || ctx.language}, using Markdown. Be concrete and concise, no filler.`;
}

function section(title, body) {
  return body && String(body).trim() ? `\n\n## ${title}\n\n${String(body).trim()}` : '';
}

function userMessages(ctx) {
  if (!ctx.userMessages.length) return '';
  const lines = ctx.userMessages.map(
    (m) => `- ${m.fresh ? '**[NEW]** ' : ''}(${new Date(m.ts).toLocaleString('vi-VN')}) ${m.text}`,
  );
  return section(
    'Messages from the human lead (highest priority; address every [NEW] message explicitly)',
    lines.join('\n'),
  );
}

function previousWork(ctx) {
  if (!ctx.history.length) return '';
  const parts = ctx.history.map(
    (h, i) =>
      `### Request #${i + 1}: ${h.request}\n` +
      `Branch: ${h.branch || '(none)'}, ${h.merged ? 'merged' : 'not merged'}.\n` +
      (h.plan ? `Agreed plan:\n${clip(h.plan, 6000)}` : 'No plan was agreed.'),
  );
  return section(
    'Earlier work on this task (the current request is a follow-up; build on it, do not redo it)',
    parts.join('\n\n'),
  );
}

function verdictBlock(allowed, meaning) {
  return `\n\nEnd your reply with exactly one fenced JSON block (a program parses it):
\`\`\`json
{"verdict": "${allowed[0]}", "issues": [{"severity": "blocker|major|minor", "text": "..."}]}
\`\`\`
"verdict" must be one of: ${allowed.join(', ')}. ${meaning}`;
}

function clip(text, max) {
  if (!text || text.length <= max) return text;
  return text.slice(0, max) + `\n\n[... cắt bớt ${text.length - max} ký tự, hãy tự đọc file trong repo nếu cần ...]`;
}

export function analyze(ctx, { prevAnalysis, critique, feedback }) {
  const revising = Boolean(prevAnalysis);
  return (
    header(ctx, 'analyst') +
    `\n\nTask: ${revising ? 'REVISE your analysis and plan based on the critique and/or the lead\'s feedback below.' : 'Analyse the request below.'}
Read the relevant code (read only, do NOT modify any file). Your reply must contain:
1. **Hiểu vấn đề**: what is really being asked, scope, assumptions.
2. **Hiện trạng**: relevant files/modules and how they work today.
3. **Phương án**: chosen approach, and why it beats the obvious alternatives.
4. **Kế hoạch triển khai**: numbered steps, naming the files to create/change.
5. **Tiêu chí hoàn thành**: how we will know it works (tests, commands, behaviour).
${revising ? 'Answer every critique point explicitly: accepted (and how the plan changed) or rejected (with a reason).' : ''}` +
    section('Current request', ctx.request) +
    previousWork(ctx) +
    userMessages(ctx) +
    section('Your previous analysis', prevAnalysis) +
    section('Critique from ' + ctx.team.critic.label, critique) +
    section('Feedback from the human lead on the plan', feedback)
  );
}

// A message on a task that is no longer running: answer it, or hand it to the
// full pipeline when it asks for new work.
export function reply(ctx, { message, lastPlan, status, branch, merged, qa }) {
  const recent = (qa || []).slice(-5).map((x) => `**Lead:** ${x.q}\n**You:** ${clip(x.a, 1500)}`);
  return (
    header(ctx, 'analyst') +
    `\n\nTask: the human lead sent the message below on a task the team already worked on. Read the code if needed (read only, do NOT modify any file), then decide:
- ANSWER: a question, confirmation, status check or discussion (e.g. "is this part done?", "why did you do X?", "where is Y?"). Answer it directly and concretely, checking the actual code rather than guessing.
- TASK: the lead asks for code to be written, changed, fixed or removed. Do not do the work and do not plan it in detail; reply with one or two sentences restating what will be done. The team then runs the full analyse, critique, code and review pipeline on it.
When unsure, prefer ANSWER and ask the lead whether they want the change made.` +
    section('Task state', `Status: ${status}. Branch: ${branch || '(none)'}, ${merged ? 'merged' : 'not merged'}.`) +
    section('Latest request', ctx.request) +
    section('Latest agreed plan', clip(lastPlan, 6000)) +
    previousWork(ctx) +
    section('Earlier questions and answers', recent.join('\n\n')) +
    section('Message from the human lead', message) +
    verdictBlock(['ANSWER', 'TASK'], 'ANSWER = your reply is the whole answer; TASK = the message needs code changes. Leave "issues" empty.')
  );
}

export function critique(ctx, { analysis, round, maxRounds }) {
  return (
    header(ctx, 'critic') +
    `\n\nTask: critically review ${ctx.team.analyst.label}'s analysis and plan (debate round ${round}/${maxRounds}).
Verify its claims against the actual code (read only, do NOT modify any file). Look for:
- wrong assumptions or misread requirements
- risks: security, data loss, breaking changes, migrations, performance, concurrency
- missing edge cases and error handling
- scope creep or over-engineering, and simpler alternatives
- gaps in how completion will be verified
Use OBJECT only for blocking issues that must be fixed before coding starts. If the plan is good enough, AGREE and list minor notes as issues.` +
    section('Current request', ctx.request) +
    previousWork(ctx) +
    userMessages(ctx) +
    section(`Analysis and plan from ${ctx.team.analyst.label}`, analysis) +
    verdictBlock(['AGREE', 'OBJECT'], 'AGREE = the plan can go to coding; OBJECT = it must be revised first.')
  );
}

export function code(ctx, { plan, reviewFeedback, round }) {
  return (
    header(ctx, 'coder') +
    `\n\nTask: ${round > 1 ? 'FIX the code according to the review feedback below.' : 'implement the agreed plan below.'}
Rules:
- Work only inside the project root. Keep the change focused on the plan; no unrelated refactors.
- Follow the existing code style. Run the project's existing tests/build/lint if there are any, and fix failures you caused.
- Do NOT run git commit, checkout, switch, branch, merge, reset or push. The orchestrator manages git.
- Finish with a short summary: files changed, what was done, how you verified it, anything left open.` +
    section('Current request', ctx.request) +
    previousWork(ctx) +
    userMessages(ctx) +
    section(`Agreed plan (by ${ctx.team.analyst.label})`, plan.analysis) +
    section(`Critic notes (by ${ctx.team.critic.label})`, plan.critique) +
    section('Note from the human lead when approving the plan', plan.note) +
    section('Review feedback to address', reviewFeedback)
  );
}

export function review(ctx, role, { plan, diff, diffStat, diffTitle = 'Diff (base...branch)', diffLang = 'diff', coderSummary, round }) {
  const focus =
    role === 'analyst'
      ? `Check that the change fully and correctly implements the request and the agreed plan: every step done, completion criteria met, nothing missing, no unrelated changes.`
      : `Review the change for bugs, security problems, risky edge cases, missing error handling, performance traps and maintainability. Read surrounding code where needed.`;
  return (
    header(ctx, role) +
    `\n\nTask: code review #${round} of ${ctx.team.coder.label}'s change (read only, do NOT modify any file).
${focus}
Use CHANGES only for issues that should block merging; put nice-to-haves as minor issues with APPROVE.` +
    section('Current request', ctx.request) +
    previousWork(ctx) +
    userMessages(ctx) +
    section('Agreed plan', plan.analysis) +
    section(`Summary from ${ctx.team.coder.label}`, coderSummary) +
    section('Changed files', diffStat) +
    section(diffTitle, '```' + diffLang + '\n' + clip(diff || '(empty)', ctx.maxDiffChars) + '\n```') +
    verdictBlock(['APPROVE', 'CHANGES'], 'APPROVE = ready to merge from your side; CHANGES = must be fixed first.')
  );
}

// ---------- discussion mode: the three AIs only debate and reach a decision ----------

const PANEL_DESC = {
  analyst: 'ANALYST. You look at the big picture: gather the facts, lay out the options and compare them.',
  critic: "DEVIL'S ADVOCATE / RISK. You challenge assumptions, find what could go wrong, and refuse a weak consensus.",
  coder: 'PRAGMATIST. You judge feasibility: effort, cost, technical complexity, and what it takes to actually do it.',
};

function panelHeader(ctx, role) {
  const t = ctx.team;
  return `You are ${t[role].label}, one of 3 AI advisors discussing a question in a group chat supervised by a human lead. The goal is a well-argued decision, not code.
Panel: ${t.analyst.label} = Analyst, ${t.critic.label} = Devil's advocate / risk, ${t.coder.label} = Pragmatist / feasibility.
Your perspective: ${PANEL_DESC[role]}
${ctx.projectPath ? `A project is attached for reference: ${ctx.projectPath}. Read its files when they help (read only, do NOT modify, create or delete any file).` : 'No project is attached; reason from your own knowledge. Do NOT create or modify any file.'}
Write your reply as a chat message, in ${LANGUAGES[ctx.language] || ctx.language}, using Markdown. Be concrete, give reasons and numbers where you can, no filler.`;
}

function earlierDecisions(ctx) {
  if (!ctx.history.length) return '';
  const parts = ctx.history.map((h, i) => `### Question #${i + 1}: ${h.request}\n` + (h.plan ? `Decision:\n${clip(h.plan, 6000)}` : 'No decision was recorded.'));
  return section('Earlier discussion on this topic (the current question is a follow-up; build on it)', parts.join('\n\n'));
}

function transcript(ctx, turns) {
  const lines = turns.map((x) => `### ${ctx.team[x.role].label} (${x.round === 1 ? 'opening opinion' : `exchange round ${x.round - 1}`})\n${clip(x.text, 5000)}`);
  return section('Discussion so far', lines.join('\n\n'));
}

export function opinion(ctx, role) {
  return (
    panelHeader(ctx, role) +
    `\n\nTask: round 1. Give your independent opinion on the question below, from your perspective. You have not seen the other advisors' answers yet.
Your reply must contain:
1. **Quan điểm**: your recommended answer, stated up front.
2. **Lập luận**: the key reasons and evidence.
3. **Phương án khác**: the alternatives you considered and why you rank them lower.
4. **Rủi ro / điều chưa chắc**: what could make you wrong.` +
    section('Question', ctx.request) +
    earlierDecisions(ctx) +
    userMessages(ctx)
  );
}

export function discuss(ctx, role, { turns, round, maxRounds }) {
  return (
    panelHeader(ctx, role) +
    `\n\nTask: discussion round ${round}/${maxRounds}. Read what the other advisors said and respond to them by name:
- where you agree, and where you disagree and why
- whether their arguments change your view (changing your mind on good evidence is a strength)
- your current position, stated clearly
Aim for a decision the panel can stand behind, but do not agree just to finish: AGREE only if you would sign the emerging decision.` +
    section('Question', ctx.request) +
    earlierDecisions(ctx) +
    userMessages(ctx) +
    transcript(ctx, turns) +
    `\n\nEnd your reply with exactly one fenced JSON block (a program parses it):
\`\`\`json
{"verdict": "AGREE", "position": "one sentence: the decision you support", "issues": [{"severity": "major|minor", "text": "remaining concern"}]}
\`\`\`
"verdict" must be AGREE (you support the decision most of the panel is converging on) or DISAGREE (you do not, yet).`
  );
}

export function minutes(ctx, { turns, consensus }) {
  return (
    panelHeader(ctx, 'analyst') +
    `\n\nTask: the discussion is over${consensus ? ' and the panel reached consensus' : ' WITHOUT full consensus'}. Write the final decision record for the human lead, faithful to what was actually said (do not invent new arguments). Use exactly these sections:
## Quyết định
The decision in 1-3 sentences.${consensus ? '' : ' If there is no consensus, give the majority view and say clearly that it is not unanimous.'}
## Lý do chính
## Các phương án đã cân nhắc
For each: short description, pros, cons, why it was or was not chosen.
## Lập trường từng thành viên
One line per advisor: agrees / has reservations, and why.
## Rủi ro và câu hỏi còn mở
## Bước tiếp theo đề xuất
Concrete next actions. If the decision implies building something, describe it so it can be handed to a coding team as-is.` +
    section('Question', ctx.request) +
    earlierDecisions(ctx) +
    userMessages(ctx) +
    transcript(ctx, turns)
  );
}

// Takes the last fenced json block (or bare object) that carries a "verdict".
export function parseVerdict(text, allowed) {
  const candidates = [];
  for (const m of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) candidates.push(m[1]);
  for (const m of text.matchAll(/\{[^{}]*"verdict"[^{}]*(?:\[[\s\S]*?\])?[^{}]*\}/g)) candidates.push(m[0]);
  for (const raw of candidates.reverse()) {
    try {
      const obj = JSON.parse(raw.trim());
      const v = String(obj.verdict || '').toUpperCase();
      if (allowed.includes(v)) return { verdict: v, issues: Array.isArray(obj.issues) ? obj.issues : [] };
    } catch {}
  }
  const loose = [...text.matchAll(/"verdict"\s*:\s*"(\w+)"/gi)].pop();
  if (loose && allowed.includes(loose[1].toUpperCase())) return { verdict: loose[1].toUpperCase(), issues: [] };
  return null;
}

// Removes the machine-readable verdict block so the chat bubble reads naturally.
export function stripVerdict(text) {
  return text.replace(/```(?:json)?\s*\{[\s\S]*?"verdict"[\s\S]*?\}\s*```\s*$/i, '').trim();
}
