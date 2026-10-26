const $ = (s, el = document) => el.querySelector(s);

// SVG Icons (FontAwesome / Modern Icons)
const ICONS = {
  analyst: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>`,
  critic: `<svg class="svg-ico" viewBox="0 0 576 512" fill="currentColor"><path d="M312 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32L64 64C28.7 64 0 92.7 0 128l0 16c0 8.8 7.2 16 16 16l80 0 0 96c0 53 43 96 96 96l16 0 0 128-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0 0-128 16 0c53 0 96-43 96-96l0-96 80 0c8.8 0 16-7.2 16-16l0-16c0-35.3-28.7-64-64-64l-184 0 0-32zM96 224l-32 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l32 0 0 32zm384 0l0-32 32 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0z"/></svg>`,
  coder: `<svg class="svg-ico" viewBox="0 0 640 512" fill="currentColor"><path d="M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L514.7 256 428.1 342.6c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l109.3-109.3c12.5-12.5 12.5-32.8 0-45.3L473.4 121.3zm-306.8 0l-109.3 109.3c-12.5 12.5-12.5 32.8 0 45.3l109.3 109.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L125.3 256l86.6-86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0z"/></svg>`,
  check: `<svg class="svg-ico" viewBox="0 0 448 512" fill="currentColor"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>`,
  checkCircle: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>`,
  alert: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480L40 480c-14.3 0-27.4-7.7-34.7-20.1s-7.1-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>`,
  info: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"/></svg>`,
  shield: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0zm0 66.8l0 378.1C369.7 380.6 409.9 239.9 415.8 150.1L256 82.4l0-15.6z"/></svg>`,
  diff: `<svg class="svg-ico" viewBox="0 0 384 512" fill="currentColor"><path d="M0 64C0 28.7 28.7 0 64 0L224 0l160 160 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm216 152l0-160-152 0c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0c8.8 0 16-7.2 16-16l0-240-120 0zm-80 80l-32 32c-6.2 6.2-6.2 16.4 0 22.6l32 32c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L130.6 320l24-24c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0zm112 0c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l24 24-24 24c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0l32-32c6.2-6.2 6.2-16.4 0-22.6l-32-32z"/></svg>`,
  file: `<svg class="svg-ico" viewBox="0 0 384 512" fill="currentColor"><path d="M0 64C0 28.7 28.7 0 64 0L224 0l160 160 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm216 152l0-160-152 0c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0c8.8 0 16-7.2 16-16l0-240-120 0z"/></svg>`,
  folder: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288L224 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"/></svg>`,
  folderOpen: `<svg class="svg-ico" viewBox="0 0 576 512" fill="currentColor"><path d="M88.7 223.8L0 375.8V96C0 60.7 28.7 32 64 32H224l64 64H448c35.3 0 64 28.7 64 64V224H152c-27.1 0-51.5 13.6-63.3-0.2zM570 202c-8.6-11-21.7-18-36-18H152c-14.3 0-27.4 7-36 18s-11.7 25-7.9 39l56 224c5.9 23.6 27.2 40 51.9 40H528c24.7 0 46-16.4 51.9-40l56-224c3.8-14 0.7-28-7.9-39z"/></svg>`,
  branch: `<svg class="svg-ico" viewBox="0 0 448 512" fill="currentColor"><path d="M80 104a24 24 0 1 0 0-48 24 24 0 1 0 0 48zm0 56C35.8 160 0 124.2 0 80S35.8 0 80 0s80 35.8 80 80c0 18-6 34.7-16.1 48.1l23.7 23.7c33.5-17.9 72-27.8 112.4-27.8c61.9 0 120 22.8 164.7 60.5l-21.2 21.2c-38.9-32.7-89.4-52.5-143.5-52.5c-35 0-68.5 8.6-97.7 24.1l29.4 29.4c13.4-10.1 30.1-16.1 48.1-16.1c44.2 0 80 35.8 80 80s-35.8 80-80 80s-80-35.8-80-80c0-18 6-34.7 16.1-48.1l-23.7-23.7C104.9 299.1 80 342.3 80 392l0 16c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-16c0-67.9 34.5-127.8 86.9-163.1l-29.4-29.4C79.4 209.6 72 216 64 216c-35.3 0-64-28.7-64-64s28.7-64 64-64c8 0 15.4 6.4 16 14.1l0 41.9z"/></svg>`,
  chevDown: `<svg class="svg-ico" viewBox="0 0 320 512" fill="currentColor"><path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"/></svg>`,
  chevRight: `<svg class="svg-ico" viewBox="0 0 320 512" fill="currentColor"><path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/></svg>`,
  bolt: `<svg class="svg-ico" viewBox="0 0 384 512" fill="currentColor"><path d="M0 256L224 0l-32 192 192 0L160 512l32-192L0 256z"/></svg>`,
  terminal: `<svg class="svg-ico" viewBox="0 0 640 512" fill="currentColor"><path d="M0 128C0 92.7 28.7 64 64 64l512 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64L0 128zM172.7 236.7c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0L96 268.1l54.1 54.1c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L129.9 279.4l42.7-42.7zm99.3 75.3l96 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-96 0c-8.8 0-16 7.2-16 16s7.2 16 16 16z"/></svg>`,
  timeline: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M64 64c0-17.7-14.3-32-32-32S0 46.3 0 64L0 400c0 44.2 35.8 80 80 80l400 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 416c-8.8 0-16-7.2-16-16L64 64zm406.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L320 210.7l-57.4-57.4c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L240 221.3l57.4 57.4c12.5 12.5 32.8 12.5 45.3 0l128-128z"/></svg>`,
  inbox: `<svg class="svg-ico" viewBox="0 0 576 512" fill="currentColor"><path d="M288 352c-44.2 0-80-35.8-80-80l0-144c0-44.2 35.8-80 80-80s80 35.8 80 80l0 144c0 44.2-35.8 80-80 80zM64 256c0-35.3 28.7-64 64-64l32 0 0 80c0 70.7 57.3 128 128 128s128-57.3 128-128l0-80 32 0c35.3 0 64 28.7 64 64l0 160c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64l0-160z"/></svg>`,
  trash: `<svg class="svg-ico" viewBox="0 0 448 512" fill="currentColor"><path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>`,
  copy: `<svg class="svg-ico" viewBox="0 0 448 512" fill="currentColor"><path d="M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L384 95.9 384 320c0 8.8-7.2 16-16 16zM192 0C165.5 0 144 21.5 144 48l0 272c0 26.5 21.5 48 48 48l192 0c26.5 0 48-21.5 48-48l0-212.1c0-12.7-5.1-24.9-14.1-33.9L393.9 14.1C384.9 5.1 372.7 0 360 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"/></svg>`,
  download: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 242.7-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7 288 32zM64 352c-35.3 0-64 28.7-64 64l0 32c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-32c0-35.3-28.7-64-64-64l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 32-384 0 0-32 64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0z"/></svg>`,
  upload: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M256 0c17.7 0 32 14.3 32 32l0 242.7 73.4-73.4c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3l-128 128c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L224 274.7 224 32c0-17.7 14.3-32 32-32zM64 352c-35.3 0-64 28.7-64 64l0 32c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-32c0-35.3-28.7-64-64-64l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 32-384 0 0-32 64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0z"/></svg>`,
  repeat: `<svg class="svg-ico" viewBox="0 0 512 512" fill="currentColor"><path d="M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160 352 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l112 0c17.7 0 32-14.3 32-32l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 35.2L414.4 70.4c-78.2-78.2-204.8-78.2-282.8 0c-22.7 22.7-38.6 49.3-48.4 77.7c-5.7 16.7 3.2 34.9 19.9 40.6s34.9-3.2 40.6-19.9zM406.9 309.4c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-17.1-17.1L160 352c17.7 0 32-14.3 32-32s-14.3-32-32-32l-112 0c-17.7 0-32 14.3-32 32l0 112c0 17.7 14.3 32 32 32s32-14.3 32-32l0-35.2 17.6 17.6c78.2 78.2 204.8 78.2 282.8 0c22.7-22.7 38.6-49.3 48.4-77.7c5.7-16.7-3.2-34.9-19.9-40.6s-34.9 3.2-40.6 19.9z"/></svg>`,
};

const ROLE_LABEL = { analyst: 'Phân tích', critic: 'Phản biện', coder: 'Code' };
const STEP_LABEL = { analyze: 'phân tích', critique: 'phản biện', code: 'viết code', review: 'review' };
const STAGES = [
  ['analyze', 'Phân tích'],
  ['critique', 'Phản biện'],
  ['gate_code', 'Duyệt kế hoạch'],
  ['code', 'Viết code'],
  ['review', 'Review'],
  ['gate_merge', 'Duyệt merge'],
  ['done', 'Hoàn tất'],
];
const STATUS_LABEL = {
  queued: 'Đang chờ', running: 'Đang chạy', waiting: 'Chờ duyệt', done: 'Hoàn tất',
  stopped: 'Đã dừng', error: 'Lỗi', interrupted: 'Bị gián đoạn',
};
const GOOD = ['AGREE', 'APPROVE'];

let CONFIG = null;
let tasks = [];
let current = null;   // task object currently shown
let lastSeq = 0;
const bubbles = new Map();  // msgId -> { el, text, timer }
const gates = new Map();    // gateId -> card element

// ---------- helpers ----------

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function md(text) {
  if (window.marked && window.DOMPurify) return DOMPurify.sanitize(marked.parse(String(text ?? ''), { breaks: true }));
  return `<pre class="plain">${esc(text)}</pre>`;
}

function inlineMd(text) {
  return esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function time(ts) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function duration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}g ${m}p` : m ? `${m}p ${s % 60}s` : `${s}s`;
}

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  // the router's generic 404: this page knows an API the running server does not
  if (res.status === 404 && data.error === 'not found') {
    showRestartBanner();
    throw new Error('Server đang chạy bản cũ nên chưa có chức năng này. Hãy khởi động lại server (tắt start.cmd rồi mở lại).');
  }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function showRestartBanner() {
  if (document.getElementById('restartBanner')) return;
  const el = document.createElement('div');
  el.id = 'restartBanner';
  el.className = 'restart-banner';
  el.innerHTML = '⚠️ Code đã được cập nhật nhưng server vẫn chạy bản cũ. Hãy tắt <code>start.cmd</code> rồi mở lại, sau đó tải lại trang.';
  document.body.prepend(el);
}

async function checkServerVersion() {
  try {
    const c = await fetch('/api/config').then((r) => r.json());
    if (c.needsRestart) showRestartBanner();
  } catch {}
}
setInterval(checkServerVersion, 60_000);

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {}
}

const isLive = () => current && ['queued', 'running', 'waiting'].includes(current.status);

// ---------- chat rendering ----------

const box = $('#messages');
const EMPTY_HTML = $('#emptyState')?.outerHTML || '';

function nearBottom() {
  return box.scrollHeight - box.scrollTop - box.clientHeight < 120;
}

function append(el, { force = false } = {}) {
  const stick = force || nearBottom();
  $('#emptyState')?.remove();
  box.appendChild(el);
  if (stick) box.scrollTop = box.scrollHeight;
  return el;
}

function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function agentInfo(key) {
  return CONFIG?.agents?.[key] || { label: key, color: '#5B5FC7', avatar: '' };
}

function avatarHtml(a, style = '') {
  const inner = a.avatar ? `<img src="${esc(a.avatar)}" alt="">` : esc((a.label || '?')[0]);
  return `<div class="avatar" style="background:${esc(a.color)};${style}">${inner}</div>`;
}

function addSystem(text, level = 'info') {
  const ico = level === 'success' ? ICONS.checkCircle : level === 'warn' ? ICONS.alert : level === 'error' ? ICONS.alert : ICONS.info;
  append(h(`<div class="sys ${level}"><span class="sys-ico">${ico}</span><span class="sys-txt">${inlineMd(text)}</span></div>`));
}

function addStage(evt) {
  append(h(`<div class="stage-div"><span class="stage-pill">${ICONS.timeline} <span>${esc(evt.text)}</span></span></div>`));
}

function addUser(evt) {
  append(
    h(`<div class="msg user">
      <div class="avatar user-avatar" style="background:var(--user)">
        <span>B</span>
      </div>
      <div class="bubble">
        <div class="msg-head">
          <span class="name">Bạn</span>
          <span class="time">${time(evt.ts)}</span>
        </div>
        <div class="content">${md(evt.text)}</div>
      </div>
    </div>`),
    { force: true },
  );
}

function agentStart(evt) {
  const a = agentInfo(evt.agent);
  const round = evt.round ? ` · vòng ${evt.round}` : '';
  const roleIco = ICONS[evt.role] || '';
  const el = append(
    h(`<div class="msg">
      ${avatarHtml(a)}
      <div class="bubble">
        <div class="msg-head">
          <span class="name">${esc(a.label)}</span>
          <span class="role"><span class="role-chip">${roleIco} <span>${ROLE_LABEL[evt.role] || evt.role}</span></span> · ${STEP_LABEL[evt.step] || evt.step}${round}</span>
          <span class="verdict"></span>
          <span class="time">${time(evt.ts)}</span>
        </div>
        <details class="activity" hidden><summary>${ICONS.terminal} Hoạt động (0)</summary></details>
        <div class="content"><span class="typing"><i></i><i></i><i></i></span></div>
      </div></div>`),
  );
  bubbles.set(evt.msgId, { el, text: '', timer: null });
}

function agentActivity(evt) {
  const b = bubbles.get(evt.msgId);
  if (!b) return;
  const act = $('.activity', b.el);
  act.hidden = false;
  act.appendChild(h(`<div title="${esc(evt.text)}">${esc(evt.text)}</div>`));
  $('summary', act).innerHTML = `${ICONS.terminal} Hoạt động (${act.children.length - 1})`;
}

function agentDelta(evt) {
  const b = bubbles.get(evt.msgId);
  if (!b || b.done) return;
  b.text += evt.text;
  if (b.timer) return;
  b.timer = setTimeout(() => {
    b.timer = null;
    if (b.done) return;
    const stick = nearBottom();
    $('.content', b.el).innerHTML = md(b.text) + '<span class="typing"><i></i><i></i><i></i></span>';
    if (stick) box.scrollTop = box.scrollHeight;
  }, 150);
}

function agentEnd(evt) {
  let b = bubbles.get(evt.msgId);
  if (!b) {
    agentStart(evt);
    b = bubbles.get(evt.msgId);
  }
  b.done = true;
  const stick = nearBottom();
  let html = evt.text ? md(evt.text) : '';
  if (!evt.ok) html += `<div class="err-text"><span class="err-ico">${ICONS.alert}</span> <span>${esc(evt.error || 'Lỗi')}</span></div>`;
  if (evt.issues?.length) {
    html += '<ul class="issues">' + evt.issues
      .map((i) => `<li><span class="sev">${esc(i.severity || '')}</span> ${esc(i.text || JSON.stringify(i))}</li>`)
      .join('') + '</ul>';
  }
  $('.content', b.el).innerHTML = html || '<span class="muted">(không có nội dung)</span>';
  if (evt.verdict) {
    const isGood = GOOD.includes(evt.verdict);
    const ico = isGood ? ICONS.checkCircle : ICONS.alert;
    $('.verdict', b.el).innerHTML = `<span class="badge ${isGood ? 'good' : 'bad'}">${ico} <span>${esc(evt.verdict)}</span></span>`;
  }
  if (evt.durationMs) $('.time', b.el).textContent += ` · ${duration(evt.durationMs)}`;
  if (stick) box.scrollTop = box.scrollHeight;
}

function renderDiff(diff) {
  return diff.split('\n').map((l) => {
    const cls = l.startsWith('diff --git') ? 'f'
      : l.startsWith('@@') ? 'h'
      : l.startsWith('+') && !l.startsWith('+++') ? 'a'
      : l.startsWith('-') && !l.startsWith('---') ? 'd' : '';
    return `<div class="${cls}">${esc(l) || ' '}</div>`;
  }).join('');
}

function addDiff(evt) {
  const el = h(`<div class="card card-diff">
    <div class="card-head">
      <span class="card-ico">${ICONS.diff}</span>
      <h4>Thay đổi so với branch gốc</h4>
    </div>
    <pre class="plain small stat-box">${esc(evt.stat || '(không có thay đổi)')}</pre>
    ${evt.diff ? `<details class="diff-details"><summary>${ICONS.terminal} Xem chi tiết diff${evt.truncated ? ' (đã cắt bớt)' : ''}</summary><div class="diff">${renderDiff(evt.diff)}</div></details>` : ''}
  </div>`);
  append(el);
}

const KIND_LABEL = { added: ['thêm', 'a'], modified: ['sửa', 'h'], deleted: ['xoá', 'd'] };

function addChanges(evt) {
  const rows = evt.files.map((f) => {
    const [label, cls] = KIND_LABEL[f.kind] || [f.kind, ''];
    return `<div class="${cls}"><span class="kind-tag ${cls}">${label}</span> <span class="file-path">${esc(f.path)}</span></div>`;
  }).join('');
  append(h(`<div class="card card-diff">
    <div class="card-head">
      <span class="card-ico">${ICONS.file}</span>
      <h4>File đã thay đổi (${evt.files.length})</h4>
    </div>
    ${evt.files.length ? `<div class="diff file-list">${rows}</div>` : '<span class="muted small">Không có file nào thay đổi</span>'}
  </div>`));
}

function addGate(evt) {
  const el = h(`<div class="card gate">
    <div class="gate-head">
      <span class="gate-ico">${ICONS.shield}</span>
      <h4>${inlineMd(evt.title)}</h4>
    </div>
    <div class="content">${md(evt.body || '')}</div>
    <textarea rows="2" placeholder="Góp ý phản hồi (không bắt buộc), AI sẽ tiếp thu và điều chỉnh..."></textarea>
    <div class="actions">${evt.options.map((o, i) =>
      `<button class="btn ${i === 0 ? 'primary' : o.id === 'stop' ? 'danger' : ''}" data-opt="${esc(o.id)}">${esc(o.label)}</button>`).join('')}
    </div></div>`);
  el.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', async () => {
    el.querySelectorAll('button').forEach((x) => (x.disabled = true));
    try {
      await api(`/api/tasks/${current.id}/gate`, { gateId: evt.gateId, option: btn.dataset.opt, comment: $('textarea', el).value });
    } catch (e) {
      alert(e.message);
      el.querySelectorAll('button').forEach((x) => (x.disabled = false));
    }
  }));
  gates.set(evt.gateId, el);
  append(el, { force: true });
}

function resolveGate(evt) {
  const el = gates.get(evt.gateId);
  if (el) {
    el.classList.add('resolved');
    $('textarea', el)?.remove();
    const ico = evt.by === 'auto' ? ICONS.bolt : ICONS.checkCircle;
    $('.actions', el).innerHTML = `<span class="gate-resolved-msg">${ico} <span>${evt.by === 'auto' ? 'Auto đã tự chọn' : 'Bạn đã chọn'}: <strong>${esc(evt.label)}</strong></span></span>`;
  }
  if (evt.comment) addUser({ text: evt.comment, ts: evt.ts });
}

function addReport(evt) {
  append(h(`<div class="card report">
    <div class="card-head">
      <span class="card-ico report-ico">${ICONS.checkCircle}</span>
      <h4>Báo cáo hoàn tất task</h4>
    </div>
    <div class="content">${md(evt.text)}</div>
  </div>`), { force: true });
}

function applyEvent(evt) {
  if (evt.seq) {
    if (evt.seq <= lastSeq) return;
    lastSeq = evt.seq;
  }
  switch (evt.type) {
    case 'state': current = evt.task; renderProgress(); scheduleBranchRefresh(); break;
    case 'stage': addStage(evt); break;
    case 'system': addSystem(evt.text, evt.level); break;
    case 'user_message': addUser(evt); break;
    case 'agent_start': agentStart(evt); break;
    case 'agent_activity': agentActivity(evt); break;
    case 'agent_delta': agentDelta(evt); break;
    case 'agent_end': agentEnd(evt); break;
    case 'diff': addDiff(evt); break;
    case 'changes': addChanges(evt); break;
    case 'gate': addGate(evt); break;
    case 'gate_resolved': resolveGate(evt); break;
    case 'report': addReport(evt); break;
    case 'followup':
      append(h(`<div class="stage-div"><span class="stage-pill">${ICONS.repeat} <span>Yêu cầu tiếp theo #${evt.n}</span></span></div>`));
      addUser(evt);
      break;
  }
}

// ---------- task list & progress ----------

// ---------- CLI status ----------

let cliRows = null; // null until the first check finishes
const cliLogs = {};
const cliJustInstalled = new Set();

// Green when the AI's CLI was found and runs, red when it is missing.
function cliDot(key) {
  const r = cliRows?.find((x) => x.key === key);
  if (!r) return '<span class="team-online-dot" title="Đang kiểm tra CLI..."></span>';
  if (r.found?.works) return `<span class="team-online-dot" title="Sẵn sàng: ${esc(r.found.version)}"></span>`;
  return `<span class="team-online-dot cli-missing" data-open-settings title="${r.found ? 'CLI không chạy được' : 'Chưa có CLI'}, bấm để cài"></span>`;
}

async function loadCli() {
  try {
    cliRows = await api('/api/cli');
  } catch {
    cliRows = [];
  }
  renderCli();
  renderTeam();
}

function cliRowHtml(r) {
  const status = r.installing
    ? '⏳ Đang cài...'
    : r.found
      ? r.found.works ? `✅ ${esc(r.found.version)}` : '⚠️ Tìm thấy nhưng không chạy được'
      : '❌ Chưa có';
  const where = r.found
    ? `<div class="muted small">${esc(r.found.source)} · <code>${esc(r.found.path)}</code></div>`
    : r.install ? `<div class="muted small">Lệnh cài: <code>${esc(r.install)}</code></div>` : '';
  const roles = r.roles.length ? ` · ${r.roles.map((x) => ROLE_LABEL[x] || x).join(', ')}` : ' · không giữ role nào';
  const btn = !r.found?.works && r.install ? `<button type="button" class="btn primary" data-install="${esc(r.key)}" ${r.installing ? 'disabled' : ''}>Cài đặt</button>` : '';
  const login = cliJustInstalled.has(r.key) && r.found && r.login ? `<div class="small cli-next">👉 Bước tiếp theo: ${inlineMd(r.login)}</div>` : '';
  const log = cliLogs[r.key]?.length ? `<pre class="cli-log">${esc(cliLogs[r.key].slice(-60).join('\n'))}</pre>` : '';
  return `<div class="cli-row">
    <div class="cli-main">
      <div><strong>${esc(r.label)}</strong> <span class="muted small">(${esc(r.command)}${roles})</span></div>
      ${where}
    </div>
    <div class="cli-status">${status}</div>
    ${btn}
    ${login}${log}
  </div>`;
}

function renderCli() {
  const el = $('#cliList');
  if (!el) return;
  el.innerHTML = cliRows ? cliRows.map(cliRowHtml).join('') : '<span class="muted small">Đang kiểm tra các CLI...</span>';
  el.querySelectorAll('.cli-log').forEach((p) => (p.scrollTop = p.scrollHeight));
}

function onCliEvent(evt) {
  const r = cliRows?.find((x) => x.key === evt.key);
  if (evt.type === 'cli_install') {
    (cliLogs[evt.key] ||= []).push(evt.line);
    if (r) r.installing = true;
    renderCli();
  } else {
    if (!evt.ok) cliLogs[evt.key]?.push(`❌ ${evt.error || 'Cài không thành công'}`);
    else cliJustInstalled.add(evt.key);
    loadCli();
  }
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-open-settings]')) return $('#settingsBtn').click();
  const btn = e.target.closest('[data-install]');
  if (!btn) return;
  const r = cliRows.find((x) => x.key === btn.dataset.install);
  if (!confirm(`Cài ${r.label} CLI bằng lệnh chính thức:\n\n${r.install}\n\nTiếp tục?`)) return;
  cliLogs[r.key] = [];
  r.installing = true;
  renderCli();
  try {
    await api('/api/cli/install', { key: r.key });
  } catch (err) {
    r.installing = false;
    cliLogs[r.key].push(`❌ ${err.message}`);
    renderCli();
  }
});

function renderTeam() {
  const teamEl = $('#team');
  if (!CONFIG?.team) return;
  teamEl.innerHTML = Object.entries(CONFIG.team).map(([role, a]) => {
    const roleIco = ICONS[role] || '';
    return `<div class="team-row">
      <div class="team-av-wrap">
        ${avatarHtml(a, 'width:28px;height:28px;font-size:12px')}
        ${cliDot(a.key)}
      </div>
      <div class="team-meta">
        <span class="team-name">${esc(a.label)}</span>
        <span class="team-role-tag">${roleIco} <span>${ROLE_LABEL[role] || role}</span></span>
      </div>
    </div>`;
  }).join('') +
  (CONFIG.mock ? `<div class="mock-banner"><span class="mock-dot"></span><span>Chế độ MOCK: không gọi CLI thật</span></div>` : '');
}

function renderTasks() {
  const list = $('#taskList');
  if (!tasks.length) {
    list.innerHTML = `<div class="empty-tasks">${ICONS.inbox}<p class="muted small">Chưa có task nào.</p></div>`;
    return;
  }
  list.innerHTML = tasks.map((t) => {
    const isActive = current?.id === t.id;
    const folderName = esc(t.projectPath.split(/[\\/]/).pop());
    return `
    <button class="task-item ${isActive ? 'active' : ''}" data-id="${esc(t.id)}">
      <div class="task-item-head">
        <span class="dot ${esc(t.status)}"></span>
        <span class="t" title="${esc(t.title)}">${esc(t.title)}</span>
        <span class="task-del" role="button" title="Xoá task" data-del="${esc(t.id)}">${ICONS.trash}</span>
      </div>
      <div class="s">
        <span class="status-text">${STATUS_LABEL[t.status] || t.status}</span>
        <span class="s-sep">·</span>
        <span class="repo-text" title="${esc(t.projectPath)}">${ICONS.folder} ${folderName}</span>
      </div>
    </button>`;
  }).join('');
  list.querySelectorAll('.task-item').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('[data-del]')) return deleteTask(el.dataset.id);
    openTask(el.dataset.id);
    $('#sidebar').classList.remove('open');
  }));
}

async function deleteTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  const live = ['queued', 'running', 'waiting'].includes(t.status);
  const msg =
    `Xoá task "${t.title}"?\n\n` +
    (live ? 'Task đang chạy sẽ bị dừng.\n' : '') +
    'Lịch sử chat của task sẽ bị xoá vĩnh viễn. Branch git và code AI đã viết vẫn giữ nguyên.';
  if (!confirm(msg)) return;
  try {
    await api(`/api/tasks/${encodeURIComponent(id)}/delete`, {});
  } catch (err) {
    alert(err.message);
  }
}

// Also runs for deletes made in another browser tab.
function onTaskDeleted(id) {
  tasks = tasks.filter((t) => t.id !== id);
  if (current?.id === id) {
    current = null;
    lastSeq = 0;
    bubbles.clear();
    gates.clear();
    box.innerHTML = EMPTY_HTML;
    $('#taskTitle').textContent = 'Chưa chọn task';
    $('#taskPath').textContent = '';
    history.replaceState(null, '', location.pathname);
    renderProgress();
    if (branchTabOpen()) loadBranches();
  }
  renderTasks();
}

function upsertTask(task) {
  const i = tasks.findIndex((t) => t.id === task.id);
  if (i >= 0) tasks[i] = task;
  else tasks.unshift(task);
  renderTasks();
}

function renderProgress() {
  const t = current;
  const chip = $('#statusChip');
  chip.className = 'chip ' + (t?.status || '');
  chip.innerHTML = t ? `<span class="chip-dot"></span><span>${STATUS_LABEL[t.status] || t.status}</span>` : '—';
  const stages = t?.useGit === false ? STAGES.filter(([k]) => k !== 'gate_merge') : STAGES;
  const idx = t ? stages.findIndex(([k]) => k === t.stage) : -1;
  $('#stages').innerHTML = stages.map(([k, label], i) => {
    const done = t && (t.status === 'done' || i < idx);
    const cur = t && i === idx && t.status !== 'done';
    const round = cur && t.round ? `<span class="r">vòng ${t.round}</span>` : '';
    const nodeInner = done ? ICONS.check : `${i + 1}`;
    return `<li class="${done ? 'done' : cur ? 'current' : ''}">
      <span class="n">${nodeInner}</span>
      <span class="stage-lbl">${label}</span>
      ${round}
    </li>`;
  }).join('');

  const auto = $('#autoToggle');
  auto.checked = Boolean(t?.autoMode);
  auto.disabled = !t;
  $('#autoHint').textContent = auto.checked ? 'Đang bật: AI tự động chạy đến hết' : 'Đang tắt: chờ bạn duyệt trước khi code và merge';
  $('#stopBtn').disabled = !isLive();
  $('#msgInput').disabled = $('#sendBtn').disabled = !t;

  $('#info').innerHTML = t ? [
    ['Project', `<span class="info-val" title="${esc(t.projectPath)}">${esc(t.projectPath)}</span>`],
    t.useGit === false && ['Git', 'Không dùng (sửa trực tiếp trong thư mục)'],
    t.useGit !== false && t.branch && ['Branch', `<span class="branch-pill">${ICONS.branch} ${esc(t.branch)}</span> <span class="muted small">← ${esc(t.baseBranch)}</span>`],
    t.merged !== undefined && ['Merge', t.merged ? '<span class="text-ok">Đã merge (chưa push)</span>' : '<span class="muted">Chưa merge</span>'],
    t.error && ['Lỗi', `<span class="text-err">${esc(t.error)}</span>`],
  ].filter(Boolean).map(([k, v]) => `<div class="info-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('') : '<div class="muted small" style="padding:4px 0">Chưa có thông tin task.</div>';

  if (t) {
    $('#taskTitle').textContent = t.title;
    $('#taskPath').innerHTML = `${ICONS.folder} <span>${esc(t.projectPath)}</span>`;
    upsertTask(t);
  }
  tickElapsed();
}

function tickElapsed() {
  const t = current;
  if (!t?.startedAt) return ($('#elapsed').textContent = '');
  $('#elapsed').textContent = duration((t.finishedAt || Date.now()) - t.startedAt);
}
setInterval(tickElapsed, 1000);

async function openTask(id) {
  const { task, events } = await api(`/api/tasks/${encodeURIComponent(id)}/events`);
  current = task;
  lastSeq = 0;
  bubbles.clear();
  gates.clear();
  box.innerHTML = '';
  history.replaceState(null, '', `#${id}`);
  for (const evt of events) applyEvent(evt);
  // Interrupted calls: show them as such instead of typing forever.
  for (const b of bubbles.values()) {
    if (!b.done && !isLive()) $('.content', b.el).innerHTML = '<span class="muted">(bị gián đoạn)</span>';
  }
  for (const [gid, el] of gates) {
    if (!el.classList.contains('resolved') && !(isLive() && current.status === 'waiting')) {
      el.classList.add('resolved');
      $('.actions', el).innerHTML = '<span class="muted small">Không còn hiệu lực</span>';
      $('textarea', el)?.remove();
    }
  }
  renderProgress();
  renderTasks();
  box.scrollTop = box.scrollHeight;
  branchSel = null;
  if (branchTabOpen()) loadBranches();
}

// ---------- live stream ----------

function connect() {
  const es = new EventSource('/api/stream');
  let hadError = false;
  es.onopen = async () => {
    if (!hadError) return;
    // reconnected: fetch anything missed while offline
    tasks = await api('/api/tasks');
    renderTasks();
    if (current) {
      const { task, events } = await api(`/api/tasks/${encodeURIComponent(current.id)}/events?after=${lastSeq}`);
      current = task;
      events.forEach(applyEvent);
      renderProgress();
    }
  };
  es.onerror = () => { hadError = true; };
  es.onmessage = async (e) => {
    const evt = JSON.parse(e.data);
    if (evt.type === 'config') {
      CONFIG = await api('/api/config');
      renderTeam();
      if (current) openTask(current.id);
      return;
    }
    if (evt.type === 'cli_install' || evt.type === 'cli_install_done') return onCliEvent(evt);
    if (evt.type === 'task_deleted') return onTaskDeleted(evt.taskId);
    if (evt.type === 'state') upsertTask(evt.task);
    if (current && evt.taskId === current.id) applyEvent(evt);
  };
}

// ---------- controls ----------

$('#composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#msgInput');
  const text = input.value.trim();
  if (!text || !current) return;
  input.value = '';
  input.style.height = '';
  try {
    await api(`/api/tasks/${current.id}/message`, { text });
  } catch (err) {
    alert(err.message);
    input.value = text;
  }
});
$('#msgInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $('#composer').requestSubmit();
  }
});
$('#msgInput').addEventListener('input', (e) => {
  e.target.style.height = '';
  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
});

$('#autoToggle').addEventListener('change', async (e) => {
  try {
    await api(`/api/tasks/${current.id}/auto`, { autoMode: e.target.checked });
    if (!isLive()) { current.autoMode = e.target.checked; renderProgress(); }
  } catch (err) {
    alert(err.message);
    e.target.checked = !e.target.checked;
  }
});

$('#stopBtn').addEventListener('click', async () => {
  if (!confirm('Dừng task này? AI đang chạy sẽ bị ngắt.')) return;
  try {
    await api(`/api/tasks/${current.id}/stop`, {});
  } catch (err) {
    alert(err.message);
  }
});

const dialog = $('#newTaskDialog');
$('#newTaskBtn').addEventListener('click', () => {
  const f = $('#newTaskForm');
  f.reset();
  f.projectPath.value = store('ai-team.lastProject') || '';
  f.autoMode.checked = Boolean(CONFIG?.autoModeDefault);
  $('#newTaskError').textContent = '';
  dialog.showModal();
});
$('#cancelNew').addEventListener('click', () => dialog.close());
$('#importTasks').addEventListener('click', async () => {
  const f = $('#newTaskForm');
  const err = $('#newTaskError');
  err.textContent = '';
  if (!f.projectPath.value.trim()) return (err.textContent = 'Nhập thư mục project trước.');
  try {
    const { added } = await api('/api/tasks/import', { projectPath: f.projectPath.value });
    if (!added) return (err.textContent = 'Không có task mới nào trong .ai-team của project này (hãy pull code về trước).');
    store('ai-team.lastProject', f.projectPath.value);
    dialog.close();
  } catch (e) {
    err.textContent = e.message;
  }
});
$('#newTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    const task = await api('/api/tasks', {
      request: f.request.value, projectPath: f.projectPath.value, title: f.title.value, autoMode: f.autoMode.checked,
    });
    store('ai-team.lastProject', f.projectPath.value);
    dialog.close();
    upsertTask(task);
    openTask(task.id);
  } catch (err) {
    $('#newTaskError').textContent = err.message;
  }
});

$('#toggleSide').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#toggleProgress').addEventListener('click', () => $('#progress').classList.toggle('open'));

document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

// ---------- branch tab ----------

let branchData = null;
let branchSel = null; // name of the selected branch row
const collapsed = new Set(['remotes']);
let branchTimer = null;

function relTime(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

const branchTabOpen = () => !$('#branchTab').hidden;

function showTab(id) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === id));
  document.querySelectorAll('.tab-body').forEach((b) => (b.hidden = b.id !== id));
  store('ai-team.tab', id);
  if (id === 'branchTab') loadBranches();
}
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => showTab(tab.dataset.tab)));

function scheduleBranchRefresh() {
  if (!branchTabOpen()) return;
  clearTimeout(branchTimer);
  branchTimer = setTimeout(loadBranches, 600);
}

function setBranchMsg(text, cls = '') {
  const el = $('#branchMsg');
  el.className = 'bt-msg ' + cls;
  el.textContent = text;
}

async function loadBranches() {
  $('#remoteForm').hidden = true;
  $('#branchFetch').hidden = true;
  if (!current) {
    branchData = null;
    setBranchMsg('');
    $('.bt-tools').hidden = true;
    $('#branchTree').innerHTML = '<div class="bt-empty">Chọn một task để xem branch.</div>';
    return;
  }
  try {
    branchData = await api(`/api/git/branches?path=${encodeURIComponent(current.projectPath)}`);
  } catch (e) {
    branchData = null;
    setBranchMsg(e.message, 'err');
    $('#branchTree').innerHTML = '';
    return;
  }
  renderBranchTab();
}

function buildTree(list) {
  const root = { dirs: new Map(), leaves: [] };
  for (const b of list) {
    const parts = b.name.split('/');
    let node = root;
    for (const p of parts.slice(0, -1)) {
      if (!node.dirs.has(p)) node.dirs.set(p, { dirs: new Map(), leaves: [] });
      node = node.dirs.get(p);
    }
    node.leaves.push({ ...b, short: parts[parts.length - 1] });
  }
  return root;
}

const pad = (depth) => `style="padding-left:${8 + depth * 16}px"`;

function folderRow(key, name, depth, filtering, root = false) {
  const open = filtering || !collapsed.has(key);
  const chev = `<span class="chev">${open ? ICONS.chevDown : ICONS.chevRight}</span>`;
  const ico = root ? '' : `<span class="ico">${open ? ICONS.folderOpen : ICONS.folder}</span>`;
  return `<div class="tr ${root ? 'root' : ''}" data-folder="${esc(key)}" ${pad(depth)}>
    ${chev}${ico}<span class="nm">${esc(name)}</span></div>`;
}

function leafRow(b, depth) {
  const sync = !b.remote && b.upstream ? [b.behind && `${b.behind}↓`, b.ahead && `${b.ahead}↑`].filter(Boolean).join(' ') : '';
  const title =
    `${b.name}\n${b.hash} · ${b.subject}\n${b.author}, ${relTime(b.date)}` +
    (b.upstream ? `\nUpstream: ${b.upstream}${b.gone ? ' (đã bị xoá trên remote)' : ''}` : '');
  const ico = b.current ? `<span class="ico cur-ico">${ICONS.check}</span>` : `<span class="ico branch-ico">${ICONS.branch}</span>`;
  return `<div class="tr ${b.current ? 'cur' : ''} ${branchSel === b.name ? 'sel' : ''}" data-branch="${esc(b.name)}" title="${esc(title)}" ${pad(depth)}>
    <span class="chev"></span>${ico}<span class="nm">${esc(b.short)}</span>${sync ? `<span class="sync">${esc(sync)}</span>` : ''}</div>`;
}

function renderTree(node, depth, key, filtering) {
  let html = '';
  for (const [name, child] of [...node.dirs].sort(([a], [b]) => a.localeCompare(b))) {
    const k = `${key}/${name}`;
    html += folderRow(k, name, depth, filtering);
    if (filtering || !collapsed.has(k)) html += renderTree(child, depth + 1, k, filtering);
  }
  for (const b of node.leaves.sort((x, y) => x.short.localeCompare(y.short))) html += leafRow(b, depth);
  return html;
}

function renderBranchTab() {
  const d = branchData;
  if (!d) return;
  const tree = $('#branchTree');
  $('.bt-tools').hidden = Boolean(d.notRepo);
  if (d.notRepo) {
    setBranchMsg('');
    tree.innerHTML = '<div class="bt-empty">Vui lòng liên kết git repository.</div>';
    return;
  }
  setBranchMsg(
    d.busy ? 'Có task đang chạy trên project này.' : d.dirty ? 'Có thay đổi chưa commit, chưa checkout/merge được.' : '',
    'warn',
  );
  $('#branchFetch').hidden = !d.remotes.length;
  $('#remoteForm').hidden = d.remotes.length > 0;
  const q = $('#branchFilter').value.trim().toLowerCase();
  const pick = (remote) => d.branches.filter((b) => b.remote === remote && (!q || b.name.toLowerCase().includes(q)));
  let html = folderRow('local', 'Branches', 0, Boolean(q), true);
  if (q || !collapsed.has('local')) html += renderTree(buildTree(pick(false)), 1, 'local', Boolean(q));
  if (d.remotes.length) {
    html += folderRow('remotes', 'Remotes', 0, Boolean(q), true);
    if (q || !collapsed.has('remotes')) html += renderTree(buildTree(pick(true)), 1, 'remotes', Boolean(q));
  }
  tree.innerHTML = html;
}

// Success needs no message: the tree itself shows the result.
async function runBranchOp(url, body) {
  setBranchMsg('Đang xử lý...');
  try {
    await api(url, body);
    branchSel = null;
    await loadBranches();
  } catch (e) {
    await loadBranches();
    setBranchMsg(e.message, 'err');
  }
}

async function fetchAll() {
  for (const r of branchData.remotes) await runBranchOp('/api/git/fetch', { path: branchData.path, name: r.name });
}

function branchAct(act, b) {
  const { path, current: cur } = branchData;
  const remoteName = b.upstream?.split('/')[0] || branchData.remotes[0]?.name || 'origin';
  switch (act) {
    case 'checkout':
      return runBranchOp('/api/git/checkout', { path, branch: b.name, remote: b.remote });
    case 'fetch':
      return fetchAll();
    case 'pull':
      return runBranchOp('/api/git/pull', { path, branch: b.name });
    case 'merge':
      if (confirm(`Merge ${b.name} vào ${cur}?\nChỉ merge trên máy bạn.`)) runBranchOp('/api/git/merge', { path, branch: b.name });
      return;
    case 'push':
      if (confirm(`Push ${b.name} lên '${remoteName}'?`)) runBranchOp('/api/git/push', { path, branch: b.name });
      return;
    case 'copy':
      navigator.clipboard?.writeText(b.name);
      return;
  }
}

// ----- right-click menu, like the VS Code source control view -----

const ctxMenu = document.createElement('div');
ctxMenu.className = 'ctx-menu';
ctxMenu.hidden = true;
document.body.appendChild(ctxMenu);
let ctxBranch = null;

function openBranchMenu(b, x, y) {
  ctxBranch = b;
  const d = branchData;
  const remoteName = b.upstream?.split('/')[0] || d.remotes[0]?.name || 'origin';
  const locked = d.busy || d.dirty;
  const items = [
    ['checkout', 'Checkout', b.current || locked, ICONS.check],
    '-',
    ['fetch', 'Fetch', !d.remotes.length, ICONS.download],
    ['pull', b.upstream ? `Pull từ '${b.upstream}'` : 'Pull', b.remote || !b.upstream || d.busy || (b.current && d.dirty), ICONS.download],
    ['push', `Push lên '${remoteName}'`, b.remote || !d.remotes.length || d.busy, ICONS.upload],
    '-',
    ['merge', `Merge vào '${d.current}'`, b.current || locked, ICONS.branch],
    '-',
    ['copy', 'Copy tên branch', false, ICONS.copy],
  ];
  ctxMenu.innerHTML = items
    .map((it) => (it === '-' ? '<div class="sep"></div>' : `<button data-act="${it[0]}" ${it[2] ? 'disabled' : ''}>${it[3] || ''}<span>${esc(it[1])}</span></button>`))
    .join('');
  ctxMenu.hidden = false;
  const { innerWidth: w, innerHeight: h } = window;
  const r = ctxMenu.getBoundingClientRect();
  ctxMenu.style.left = Math.max(4, Math.min(x, w - r.width - 4)) + 'px';
  ctxMenu.style.top = Math.max(4, Math.min(y, h - r.height - 4)) + 'px';
}

function closeBranchMenu() {
  ctxMenu.hidden = true;
  ctxBranch = null;
}

ctxMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn || btn.disabled) return;
  const b = ctxBranch;
  closeBranchMenu();
  branchAct(btn.dataset.act, b);
});
document.addEventListener('mousedown', (e) => !ctxMenu.contains(e.target) && closeBranchMenu());
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeBranchMenu());
window.addEventListener('blur', closeBranchMenu);
$('#branchTree').addEventListener('scroll', closeBranchMenu);

$('#branchTree').addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.tr[data-branch]');
  if (!row) return;
  e.preventDefault();
  branchSel = row.dataset.branch;
  renderBranchTab();
  openBranchMenu(branchData.branches.find((x) => x.name === branchSel), e.clientX, e.clientY);
});

$('#branchTree').addEventListener('click', (e) => {
  const row = e.target.closest('.tr');
  if (!row) return;
  if (row.dataset.folder) {
    const k = row.dataset.folder;
    collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k);
  } else if (row.dataset.branch) {
    // only move the highlight: re-rendering here would swallow the double-click
    branchSel = row.dataset.branch;
    $('#branchTree').querySelectorAll('.tr.sel').forEach((r) => r.classList.remove('sel'));
    row.classList.add('sel');
    return;
  }
  renderBranchTab();
});
$('#branchTree').addEventListener('dblclick', (e) => {
  const row = e.target.closest('.tr[data-branch]');
  if (!row || row.classList.contains('cur')) return;
  const b = branchData.branches.find((x) => x.name === row.dataset.branch);
  if (branchData.busy || branchData.dirty) return setBranchMsg($('#branchMsg').textContent || 'Chưa checkout được lúc này.', 'warn');
  branchAct('checkout', b);
});
$('#branchFilter').addEventListener('input', renderBranchTab);
$('#branchRefresh').addEventListener('click', loadBranches);
$('#branchFetch').addEventListener('click', fetchAll);
$('#remoteForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const url = e.target.elements.url.value.trim();
  if (url) runBranchOp('/api/git/remote', { path: branchData.path, name: 'origin', url });
});

// ---------- settings ----------

const settingsDlg = $('#settingsDialog');
let settings = null;

$('#cliRecheck').addEventListener('click', () => {
  cliRows = null;
  renderCli();
  loadCli();
});

$('#settingsBtn').addEventListener('click', async () => {
  renderCli();
  settings = await api('/api/settings');
  const f = $('#settingsForm');
  const agents = Object.entries(settings.agents);
  $('#roleGrid').innerHTML = Object.entries(ROLE_LABEL).map(([role, label]) => {
    const roleIco = ICONS[role] || '';
    const curVal = settings.roles[role];
    const curAgent = settings.agents[curVal] || { label: curVal, color: '#5B5FC7' };
    return `
    <div class="role-grid-item">
      <span class="role-grid-head">${roleIco} <span>${label}</span></span>
      <div class="custom-select-wrap" data-role="${role}">
        <select name="role_${role}" class="hidden-select" tabindex="-1" aria-hidden="true">
          ${agents.map(([k, a]) => `<option value="${k}" ${curVal === k ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}
        </select>
        <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false">
          <span class="custom-select-val">
            <span class="agent-dot" style="background:${esc(curAgent.color)}"></span>
            <span class="agent-label">${esc(curAgent.label)}</span>
          </span>
          <span class="custom-select-arrow">${ICONS.chevDown}</span>
        </button>
        <div class="custom-select-dropdown" role="listbox" hidden>
          ${agents.map(([k, a]) => {
            const isSel = curVal === k;
            return `
            <div class="custom-select-opt ${isSel ? 'selected' : ''}" data-val="${k}" role="option" aria-selected="${isSel}">
              <span class="agent-dot" style="background:${esc(a.color)}"></span>
              <span class="agent-opt-label">${esc(a.label)}</span>
              <span class="agent-opt-check">${ICONS.check}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  $('#agentGrid').innerHTML = agents.map(([k, a]) => `
    <div class="agent-card" data-key="${k}">
      <div class="av-row">${avatarHtml(a)}
        <div class="av-btns">
          <button type="button" class="btn" data-av="pick">Đổi ảnh</button>
          <button type="button" class="btn" data-av="clear">Bỏ ảnh</button>
        </div>
        <input type="file" accept="image/*" hidden>
      </div>
      <label>Tên hiển thị <input name="label" value="${esc(a.label)}" maxlength="30"></label>
      <label>Màu đại diện <input type="color" name="color" value="${esc(a.color)}"></label>
      <label>Model ${modelField(a)}<span class="muted small">${esc(a.modelsNote)}</span></label>
    </div>`).join('');
  f.maxDebateRounds.value = settings.maxDebateRounds;
  f.maxFixRounds.value = settings.maxFixRounds;
  f.autoModeDefault.checked = settings.autoModeDefault;
  f.historyInGit.checked = settings.historyInGit;
  $('#settingsError').textContent = '';
  $('#sidebar').classList.remove('open');
  settingsDlg.showModal();
});

// Custom select dropdown interactions (Roles & Models)
function closeAllSelects() {
  document.querySelectorAll('.custom-select-wrap').forEach((w) => {
    w.classList.remove('open', 'drop-up');
    w.closest('.agent-card')?.classList.remove('has-open-select');
    const dd = $('.custom-select-dropdown', w);
    if (dd) dd.hidden = true;
    const tr = $('.custom-select-trigger', w);
    if (tr) tr.setAttribute('aria-expanded', 'false');
  });
}

$('#settingsDialog').addEventListener('click', (e) => {
  const trigger = e.target.closest('.custom-select-trigger');
  if (trigger) {
    const wrap = trigger.closest('.custom-select-wrap');
    const dropdown = $('.custom-select-dropdown', wrap);
    const wasOpen = !dropdown.hidden;

    // Close all other dropdowns
    closeAllSelects();

    if (!wasOpen) {
      // Check if near bottom of modal body to drop upwards
      const dlgBody = $('#settingsDialog .dlg-body');
      if (dlgBody) {
        const bodyRect = dlgBody.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const spaceBelow = bodyRect.bottom - wrapRect.bottom;
        if (spaceBelow < 240 && wrapRect.top - bodyRect.top > 200) {
          wrap.classList.add('drop-up');
        } else {
          wrap.classList.remove('drop-up');
        }
      }

      wrap.classList.add('open');
      wrap.closest('.agent-card')?.classList.add('has-open-select');
      dropdown.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');

      // Scroll into view if needed
      dropdown.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    return;
  }

  const opt = e.target.closest('.custom-select-opt');
  if (opt) {
    const wrap = opt.closest('.custom-select-wrap');
    const val = opt.dataset.val;
    const select = $('select', wrap);
    if (select) {
      select.value = val;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Role select update
    if (wrap.dataset.role) {
      const a = settings?.agents?.[val] || { label: val, color: '#5B5FC7' };
      const dot = $('.custom-select-val .agent-dot', wrap);
      const lbl = $('.custom-select-val .agent-label', wrap);
      if (dot) dot.style.background = a.color;
      if (lbl) lbl.textContent = a.label;
    }

    // Model select update
    const modelLbl = $('.model-label-text', wrap);
    if (modelLbl) {
      const optName = $('.model-opt-name', opt)?.textContent || opt.textContent.trim();
      const optId = $('.model-opt-id', opt)?.textContent;
      const fullText = optName + (optId ? ` (${optId})` : '');
      modelLbl.textContent = fullText;
      wrap.querySelector('.custom-select-trigger')?.setAttribute('title', fullText);
    }

    wrap.querySelectorAll('.custom-select-opt').forEach((o) => {
      const isSel = o.dataset.val === val;
      o.classList.toggle('selected', isSel);
      o.setAttribute('aria-selected', isSel);
    });

    closeAllSelects();
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-select-wrap')) {
    closeAllSelects();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllSelects();
  }
});

// A dropdown of the models the account can use; a text box when the CLI gives no list.
function modelField(a) {
  if (!a.models || !a.models.length) {
    return `<input name="model" value="${esc(a.model)}" placeholder="Mặc định của CLI">`;
  }
  const curModel = a.model || '';
  const selectedObj = a.models.find((m) => m.id === curModel);
  const unknown = curModel && !selectedObj;

  let curLabel = 'Mặc định của CLI';
  if (selectedObj) {
    curLabel = selectedObj.name + (selectedObj.name !== selectedObj.id ? ` (${selectedObj.id})` : '');
  } else if (unknown) {
    curLabel = `${curModel} (không có trong tài khoản)`;
  }

  const groups = [...new Set(a.models.map((m) => m.group))];
  const optHtml = (m) =>
    `<option value="${esc(m.id)}" ${m.id === curModel ? 'selected' : ''}>${esc(m.name)}${m.name !== m.id ? ` (${esc(m.id)})` : ''}</option>`;

  return `
  <div class="custom-select-wrap model-select-wrap">
    <select name="model" class="hidden-select" tabindex="-1" aria-hidden="true">
      <option value="">Mặc định của CLI</option>
      ${unknown ? `<option value="${esc(curModel)}" selected>${esc(curModel)} (không có trong tài khoản)</option>` : ''}
      ${groups.map((g) => `<optgroup label="${esc(g)}">${a.models.filter((m) => m.group === g).map(optHtml).join('')}</optgroup>`).join('')}
    </select>
    <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false" title="${esc(curLabel)}">
      <span class="custom-select-val">
        <span class="model-label-text">${esc(curLabel)}</span>
      </span>
      <span class="custom-select-arrow">${ICONS.chevDown}</span>
    </button>
    <div class="custom-select-dropdown model-dropdown" role="listbox" hidden>
      <div class="custom-select-opt ${!curModel ? 'selected' : ''}" data-val="" role="option" aria-selected="${!curModel}">
        <span class="model-opt-name">Mặc định của CLI</span>
        <span class="agent-opt-check">${ICONS.check}</span>
      </div>
      ${unknown ? `
      <div class="custom-select-opt selected" data-val="${esc(curModel)}" role="option" aria-selected="true">
        <div class="model-opt-info">
          <span class="model-opt-name">${esc(curModel)}</span>
          <span class="model-opt-id muted small">không có trong tài khoản</span>
        </div>
        <span class="agent-opt-check">${ICONS.check}</span>
      </div>` : ''}
      ${groups.map((g) => `
        <div class="custom-select-group-title">${esc(g)}</div>
        ${a.models.filter((m) => m.group === g).map((m) => {
          const isSel = m.id === curModel;
          return `
          <div class="custom-select-opt ${isSel ? 'selected' : ''}" data-val="${esc(m.id)}" role="option" aria-selected="${isSel}">
            <div class="model-opt-info">
              <span class="model-opt-name">${esc(m.name)}</span>
              ${m.name !== m.id ? `<span class="model-opt-id">${esc(m.id)}</span>` : ''}
            </div>
            <span class="agent-opt-check">${ICONS.check}</span>
          </div>`;
        }).join('')}
      `).join('')}
    </div>
  </div>`;
}

function refreshAvatar(card) {
  const k = card.dataset.key;
  const a = settings.agents[k];
  a.color = $('[name=color]', card).value;
  a.label = $('[name=label]', card).value || a.label;
  $('.avatar', card).outerHTML = avatarHtml(a);

  // Sync custom select options & triggers
  document.querySelectorAll(`.custom-select-opt[data-val="${k}"]`).forEach((opt) => {
    const dot = $('.agent-dot', opt);
    const lbl = $('.agent-opt-label', opt);
    if (dot) dot.style.background = a.color;
    if (lbl) lbl.textContent = a.label;
  });
  document.querySelectorAll('.custom-select-wrap').forEach((wrap) => {
    const sel = $('select', wrap);
    if (sel && sel.value === k) {
      const dot = $('.custom-select-val .agent-dot', wrap);
      const lbl = $('.custom-select-val .agent-label', wrap);
      if (dot) dot.style.background = a.color;
      if (lbl) lbl.textContent = a.label;
    }
  });
}

// Center-crop to a square and shrink, so the avatar stays a few KB in the config.
async function resizeImage(file, size) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const s = Math.min(img.width, img.height);
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

$('#agentGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.agent-card');
  if (!card) return;
  const action = e.target.closest('[data-av]')?.dataset.av || (e.target.closest('.avatar') ? 'pick' : null);
  if (action === 'pick') $('input[type=file]', card).click();
  if (action === 'clear') {
    settings.agents[card.dataset.key].avatar = '';
    refreshAvatar(card);
  }
});
$('#agentGrid').addEventListener('input', (e) => {
  if (e.target.name === 'color' || e.target.name === 'label') refreshAvatar(e.target.closest('.agent-card'));
});
$('#agentGrid').addEventListener('change', async (e) => {
  if (e.target.type !== 'file' || !e.target.files[0]) return;
  const card = e.target.closest('.agent-card');
  try {
    settings.agents[card.dataset.key].avatar = await resizeImage(e.target.files[0], 128);
    refreshAvatar(card);
  } catch {
    alert('Không đọc được ảnh này');
  }
  e.target.value = '';
});

$('#settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const roles = Object.fromEntries(Object.keys(ROLE_LABEL).map((r) => [r, f[`role_${r}`].value]));
  if (new Set(Object.values(roles)).size < 3 && !confirm('Có AI đang giữ nhiều hơn 1 role. Vẫn lưu?')) return;
  const agents = {};
  for (const card of $('#agentGrid').children) {
    const k = card.dataset.key;
    agents[k] = {
      label: $('[name=label]', card).value,
      color: $('[name=color]', card).value,
      model: $('[name=model]', card).value,
      avatar: settings.agents[k].avatar,
    };
  }
  try {
    await api('/api/settings', {
      roles,
      agents,
      maxDebateRounds: f.maxDebateRounds.value,
      maxFixRounds: f.maxFixRounds.value,
      autoModeDefault: f.autoModeDefault.checked,
      historyInGit: f.historyInGit.checked,
    });
    settingsDlg.close();
  } catch (err) {
    $('#settingsError').textContent = err.message;
  }
});

// ---------- boot ----------

(async () => {
  CONFIG = await api('/api/config');
  renderTeam();
  showTab(store('ai-team.tab') || 'progressTab');
  connect();
  loadCli();
  if (CONFIG.needsRestart) showRestartBanner();
  tasks = await api('/api/tasks');
  renderTasks();
  renderProgress();
  const id = decodeURIComponent(location.hash.slice(1));
  const first = tasks.find((t) => t.id === id) || tasks[0];
  if (first) openTask(first.id);
})();
