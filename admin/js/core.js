/* CareNova admin – shared helpers: escaping, API client, toasts, drawers, modals, formatting. */

/* ---------- Escaping: every server string that goes into innerHTML passes through esc() ---------- */
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"'`]/g, (c) => ESC_MAP[c]);
}
/* Only allow http(s), relative, and data:image URLs in src/href attributes. */
export function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  if (/^(https?:)?\/\//i.test(s) || /^[\/.]/.test(s) || /^data:image\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return ''; // javascript:, vbscript:, etc.
  return s; // relative path such as assets/img/x.webp
}
/* Relative site paths (assets/...) are relative to the site root, not /admin/. */
export function mediaSrc(u) {
  const s = safeUrl(u);
  if (!s) return '';
  if (/^(https?:)?\/\//i.test(s) || s.startsWith('/') || s.startsWith('data:')) return s;
  return '/' + s.replace(/^\.\//, '');
}

/* ---------- State ---------- */
export const state = {
  user: null,
  mustChangePassword: false,
  schema: null,
  onUnauthorized: () => {},
};

/* Which roles can open which area. Mirrors the server: a route the role cannot use returns 403. */
const ACCESS = {
  dashboard: ['admin', 'editor', 'reception'],
  stats: ['admin', 'reception'],
  live: ['admin', 'editor', 'reception'],
  submissions: ['admin', 'reception'],
  content: ['admin', 'editor'],
  texts: ['admin', 'editor'],
  sections: ['admin', 'editor'],
  settings: ['admin', 'editor'],
  media: ['admin', 'editor'],
  users: ['admin'],
  audit: ['admin'],
  account: ['admin', 'editor', 'reception'],
};
export function can(area) {
  const role = state.user && state.user.role;
  return !!role && (ACCESS[area] || []).includes(role);
}

/* ---------- API client ---------- */
export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

export async function api(method, path, body, { quiet401 = false } = {}) {
  const headers = { Accept: 'application/json' };
  const opts = { method, credentials: 'same-origin', headers };
  if (method !== 'GET' && method !== 'HEAD') {
    headers['X-Requested-With'] = 'cms';
    if (body instanceof FormData) {
      opts.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body === undefined ? {} : body);
    }
  }
  let res;
  try {
    res = await fetch(path, opts);
  } catch (e) {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    try { const t = await res.text(); data = t ? { error: t.slice(0, 300) } : null; } catch { data = null; }
  }
  if (!res.ok) {
    const msg = (data && typeof data.error === 'string' && data.error) || defaultError(res.status);
    if (res.status === 401 && !quiet401) state.onUnauthorized();
    throw new ApiError(msg, res.status, data);
  }
  return data || {};
}
function defaultError(status) {
  if (status === 401) return 'Your session has ended. Please sign in again.';
  if (status === 403) return 'Your account does not have access to this.';
  if (status === 404) return 'Not found.';
  if (status === 413) return 'That file is too large.';
  if (status === 429) return 'Too many requests. Please wait a few minutes and try again.';
  return `Something went wrong (error ${status}).`;
}
export const get = (p, o) => api('GET', p, undefined, o);
export const post = (p, b) => api('POST', p, b);
export const put = (p, b) => api('PUT', p, b);
export const patch = (p, b) => api('PATCH', p, b);
export const del = (p) => api('DELETE', p);

/* Upload with progress (fetch has no upload progress, so XHR). */
export function upload(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/media');
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-Requested-With', 'cms');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new ApiError('Upload failed. Check your connection.', 0));
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data || {});
      if (xhr.status === 401) state.onUnauthorized();
      reject(new ApiError((data && data.error) || defaultError(xhr.status), xhr.status, data));
    };
    xhr.send(fd);
  });
}
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf'];
export const MEDIA_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.avif,.pdf,' + MEDIA_TYPES.join(',');
export const MEDIA_MAX = 8 * 1024 * 1024;
export function checkFile(file) {
  const okType = MEDIA_TYPES.includes(file.type) || /\.(jpe?g|png|webp|gif|avif|pdf)$/i.test(file.name);
  if (!okType) return `${file.name}: only JPG, PNG, WebP, GIF, AVIF and PDF files can be uploaded.`;
  if (file.size > MEDIA_MAX) return `${file.name}: the file is larger than 8 MB.`;
  return '';
}

/* ---------- DOM helpers ---------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export function html(strings, ...vals) {
  // Tagged template: interpolated values are escaped unless wrapped with raw().
  let out = strings[0];
  vals.forEach((v, i) => { out += (v && v.__raw !== undefined ? v.__raw : Array.isArray(v) ? v.map((x) => (x && x.__raw !== undefined ? x.__raw : esc(x))).join('') : esc(v)) + strings[i + 1]; });
  return { __raw: out };
}
export const raw = (s) => ({ __raw: String(s) });
export function setHTML(el, h) { el.innerHTML = h && h.__raw !== undefined ? h.__raw : h; return el; }
export function el(tag, attrs = {}, h) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : v);
  }
  if (h !== undefined) setHTML(n, h);
  return n;
}
let uidN = 0;
export const uid = (p = 'f') => `${p}-${++uidN}`;
export function debounce(fn, ms = 250) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ---------- Formatting ---------- */
const pad = (n) => String(n).padStart(2, '0');
export function todayISO(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function fmtDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
export function fmtRel(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return String(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(iso);
}
export function fmtSize(b) {
  const n = Number(b) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
export function cap(s) { s = String(s ?? ''); return s.charAt(0).toUpperCase() + s.slice(1); }
export function statusLabel(s) { return cap(String(s || 'new').replace(/-/g, ' ')); }
export function pill(status) {
  const s = String(status || 'new').toLowerCase().replace(/[^a-z-]/g, '');
  return `<span class="pill pill-${esc(s)}">${esc(statusLabel(status))}</span>`;
}

/* ---------- Icons (inline SVG, decorative) ---------- */
const P = {
  dashboard: '<path d="M4 13h7V4H4zM13 20h7v-9h-7zM4 20h7v-5H4zM13 9h7V4h-7z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  inbox: '<path d="M4 13l2.5-7.5h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  doc: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 16h6"/>',
  text: '<path d="M5 6h14M5 11h14M5 16h9"/>',
  layers: '<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><path d="M15.5 5.6a3 3 0 010 5.8M17.5 14.6c1.6.6 2.7 2.1 3 4.4"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.7-3.4 3.4-5.4 7-5.4s6.3 2 7 5.4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  down: '<path d="M6 10l6 6 6-6"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  stethoscope: '<path d="M6 3v6a4 4 0 008 0V3"/><path d="M10 13v2a5 5 0 0010 0v-2"/><circle cx="20" cy="11" r="2"/>',
};
export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
}

/* ---------- Toasts ---------- */
export function toast(message, kind = 'ok', ms) {
  const box = document.getElementById('toasts');
  const t = el('div', { class: 'toast' + (kind === 'err' ? ' err' : ''), role: kind === 'err' ? 'alert' : 'status' });
  t.innerHTML = `<span class="t">${esc(message)}</span><button type="button" aria-label="Dismiss">&times;</button>`;
  const close = () => t.remove();
  t.querySelector('button').addEventListener('click', close);
  box.appendChild(t);
  setTimeout(close, ms || (kind === 'err' ? 7000 : 3500));
}
export function toastError(e) { if (e && e.status === 401) return; toast((e && e.message) || 'Something went wrong.', 'err'); }

/* ---------- Layers: drawers and modals, with focus trap and Esc ---------- */
const stack = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), summary';

document.addEventListener('keydown', (e) => {
  const top = stack[stack.length - 1];
  if (!top) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    top.requestClose();
  } else if (e.key === 'Tab') {
    const f = $$(FOCUSABLE, top.el).filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!top.el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }
});

/**
 * Open a drawer (side panel) or modal.
 * opts: { title, kind:'drawer'|'modal', wide, small, isDirty():bool, onClose() }
 * Returns { el, body, foot, close(force), setTitle, requestClose }.
 */
export function openLayer(opts) {
  const kind = opts.kind || 'drawer';
  const opener = document.activeElement;
  const layers = document.getElementById('layers');
  const scrim = el('div', { class: 'scrim' + (stack.length ? ' top' : '') });
  const titleId = uid('dlg');
  const cls = kind === 'modal' ? 'modal' + (opts.small ? ' small' : '') : 'drawer' + (opts.wide ? ' wide' : '');
  const box = el('div', { class: cls, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId });
  if (stack.length) { box.style.zIndex = String(70 + stack.length * 2); scrim.style.zIndex = String(69 + stack.length * 2); }
  box.innerHTML = `<div class="drawer-head"><h2 id="${titleId}"></h2><button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="drawer-body"></div><div class="drawer-foot" hidden></div>`;
  box.querySelector('h2').textContent = opts.title || '';
  layers.appendChild(scrim);
  layers.appendChild(box);
  const body = box.querySelector('.drawer-body');
  const foot = box.querySelector('.drawer-foot');
  let closed = false;
  const layer = {
    el: box, body, foot,
    setTitle(t) { box.querySelector('h2').textContent = t; },
    close() {
      if (closed) return; closed = true;
      const i = stack.indexOf(layer); if (i >= 0) stack.splice(i, 1);
      box.remove(); scrim.remove();
      if (opts.onClose) opts.onClose();
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    },
    async requestClose() {
      if (opts.isDirty && opts.isDirty()) {
        const ok = await confirmIn(foot.hidden ? body : foot, 'You have unsaved changes. Close without saving?', 'Discard changes', { prepend: !foot.hidden ? false : true });
        if (!ok) return;
      }
      layer.close();
    },
  };
  stack.push(layer);
  box.querySelector('[data-close]').addEventListener('click', () => layer.requestClose());
  scrim.addEventListener('click', () => layer.requestClose());
  setTimeout(() => {
    const first = $$(FOCUSABLE, body)[0];
    (first || box.querySelector('[data-close]')).focus();
  }, 30);
  return layer;
}
export function closeAllLayers() { while (stack.length) stack[stack.length - 1].close(); }

/**
 * In-page confirmation (never window.confirm). Renders a red box inside `container`,
 * resolves true/false. Focus goes to the cancel button.
 */
export function confirmIn(container, message, okLabel = 'Delete', { prepend = false } = {}) {
  return new Promise((resolve) => {
    const old = container.querySelector(':scope > .confirm-box'); if (old) old.remove();
    const box = el('div', { class: 'confirm-box', role: 'alertdialog', 'aria-label': 'Confirm' });
    box.innerHTML = `<p>${esc(message)}</p><div class="btn-row"><button type="button" class="btn btn-sm" data-no>Cancel</button><button type="button" class="btn btn-sm btn-danger-solid" data-yes>${esc(okLabel)}</button></div>`;
    if (prepend) container.prepend(box); else container.appendChild(box);
    const done = (v) => { box.remove(); resolve(v); };
    box.querySelector('[data-no]').addEventListener('click', () => done(false));
    box.querySelector('[data-yes]').addEventListener('click', () => done(true));
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } });
    box.querySelector('[data-no]').focus();
    box.scrollIntoView({ block: 'nearest' });
  });
}
/* Small modal confirm, for list rows that have no drawer. */
export function confirmModal(message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    let answered = false;
    const L = openLayer({ title: 'Please confirm', kind: 'modal', small: true, onClose: () => { if (!answered) resolve(false); } });
    L.body.innerHTML = `<p>${esc(message)}</p>`;
    L.foot.hidden = false;
    L.foot.innerHTML = `<span class="spacer"></span><button type="button" class="btn" data-no>Cancel</button><button type="button" class="btn btn-danger-solid" data-yes>${esc(okLabel)}</button>`;
    L.foot.querySelector('[data-no]').addEventListener('click', () => L.close());
    L.foot.querySelector('[data-yes]').addEventListener('click', () => { answered = true; resolve(true); L.close(); });
    setTimeout(() => L.foot.querySelector('[data-no]').focus(), 40);
  });
}

/* ---------- Page states ---------- */
export const loadingHTML = (label = 'Loading') => `<div class="state" role="status"><span class="spinner" aria-hidden="true"></span> <span>${esc(label)}…</span></div>`;
export const emptyHTML = (title, text = '') => `<div class="state"><strong>${esc(title)}</strong>${text ? esc(text) : ''}</div>`;
export const errorHTML = (e) => `<div class="alert alert-error" role="alert">${esc((e && e.message) || 'Could not load this page.')}</div>`;

/* ---------- Busy buttons ---------- */
export async function busy(btn, fn, label = 'Saving…') {
  if (!btn) return fn();
  const old = btn.innerHTML;
  btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = label;
  try { return await fn(); } finally { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = old; }
}

/* ---------- Page-level unsaved-changes guard ---------- */
let pageGuard = null;
export function setPageGuard(fn) { pageGuard = fn; }
export function pageDirty() { try { return !!(pageGuard && pageGuard()); } catch { return false; } }
window.addEventListener('beforeunload', (e) => { if (pageDirty()) { e.preventDefault(); e.returnValue = ''; } });
