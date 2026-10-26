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
