/* CareNova admin – entry point: login, session, navigation and routing. */
import {
  esc, state, can, get, post, api, toast, toastError, icon, closeAllLayers, setPageGuard, pageDirty, confirmModal, loadingHTML,
} from './js/core.js';
import { renderDashboard } from './js/dashboard.js';
import { renderAppointments, renderEnquiries, renderSubscribers } from './js/submissions.js';
import { renderContent, renderTexts, renderSections, renderSettings, loadSchema } from './js/content.js';
import { renderMedia } from './js/media.js';
import { renderUsers, renderAccount, renderAudit } from './js/people.js';
import { renderDataRequests, renderNotifications } from './js/privacy.js';

const $ = (id) => document.getElementById(id);

/* Navigation: [route, label, icon, area, heading?] */
const NAV = [
  ['dashboard', 'Dashboard', 'dashboard', 'dashboard'],
  ['appointments', 'Appointments', 'calendar', 'submissions', 'Inbox'],
  ['enquiries', 'Enquiries', 'inbox', 'submissions'],
  ['subscribers', 'Subscribers', 'mail', 'submissions'],
  ['data-requests', 'Data requests', 'shield', 'submissions'],
  ['notifications', 'Notifications', 'bell', 'submissions'],
  ['content', 'Content', 'list', 'content', 'Website'],
  ['texts', 'Page text', 'text', 'texts'],
  ['sections', 'Sections', 'layers', 'sections'],
  ['media', 'Media library', 'image', 'media'],
  ['settings', 'Settings', 'settings', 'settings'],
  ['users', 'Users', 'users', 'users', 'Admin'],
  ['audit', 'Activity log', 'doc', 'audit'],
  ['account', 'My account', 'user', 'account', 'You'],
];
const ROUTES = {
  dashboard: renderDashboard, appointments: renderAppointments, enquiries: renderEnquiries, subscribers: renderSubscribers,
  'data-requests': renderDataRequests, notifications: renderNotifications,
  content: renderContent, texts: renderTexts, sections: renderSections, media: renderMedia, settings: renderSettings,
  users: renderUsers, audit: renderAudit, account: renderAccount,
};
const AREA = Object.fromEntries(NAV.map((n) => [n[0], n[3]]));

function show(which) {
  $('boot').hidden = which !== 'boot';
  $('login').hidden = which !== 'login';
  $('app').hidden = which !== 'app';
}

/* ---------- Login ---------- */
function showLogin(message) {
  closeAllLayers();
  setPageGuard(null);
  state.user = null;
  show('login');
  const err = $('login-error');
  if (message) { err.textContent = message; err.hidden = false; err.className = 'alert alert-warn'; } else err.hidden = true;
  setTimeout(() => $('login-email').focus(), 30);
}
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('login-error'); const btn = $('login-submit');
  const email = $('login-email').value.trim(); const password = $('login-password').value;
  err.hidden = true; err.className = 'alert alert-error';
  if (!email || !password) { err.textContent = 'Enter your email and password.'; err.hidden = false; return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    await api('POST', '/api/admin/login', { email, password }, { quiet401: true });
    $('login-password').value = '';
    await start();
  } catch (ex) {
    err.textContent = ex.status === 429
      ? 'Too many sign-in attempts. For your security, please wait 15 minutes and try again.'
      : ex.status === 401 || ex.status === 400 ? (ex.message && !/^Something/.test(ex.message) ? ex.message : 'That email and password do not match.') : ex.message;
    err.hidden = false;
    $('login-password').select();
  } finally { btn.disabled = false; btn.textContent = 'Sign in'; }
});

state.onUnauthorized = () => { if (state.user) showLogin('Your session has ended. Please sign in again.'); };

/* ---------- Session ---------- */
async function start() {
  let me;
  try { me = await get('/api/admin/me', { quiet401: true }); }
  catch (e) { if (e.status === 401) { showLogin(); return; } show('login'); $('login-error').textContent = e.message; $('login-error').hidden = false; return; }
  state.user = me.user; state.mustChangePassword = !!me.mustChangePassword;
  if (can('content')) loadSchema().catch(() => {});
  else get('/api/admin/schema').then((s) => { state.schema = s; }).catch(() => {});
  show('app');
  drawChrome();
  if (!location.hash || location.hash === '#' || location.hash === '#/') location.replace('#/' + (can('dashboard') ? 'dashboard' : 'account'));
  route();
  refreshCounts();
}

function drawChrome() {
  const u = state.user;
  let html = ''; let heading = '';
  for (const [r, label, ic, area, h] of NAV) {
    if (!can(area)) continue;
    if (h && h !== heading) { heading = h; html += `<div class="nav-heading" aria-hidden="true">${esc(h)}</div>`; }
    html += `<a href="#/${r}" data-r="${r}">${icon(ic)}<span>${esc(label)}</span><span class="count" data-count="${r}" hidden></span></a>`;
  }
  $('nav').innerHTML = html;
  $('whoami').innerHTML = `<strong>${esc(u.name)}</strong>${esc(u.email)} · ${esc(u.role)}`;
  $('pw-banner').hidden = !state.mustChangePassword;
}
document.addEventListener('cms:user', drawChrome);

async function refreshCounts() {
  if (!can('stats')) return;
  try {
    const s = await get('/api/admin/stats');
    const set = (r, n) => { const b = document.querySelector(`[data-count="${r}"]`); if (!b) return; b.hidden = !n; b.textContent = n; b.setAttribute('aria-label', `${n} new`); };
    set('appointments', (s.appointments && s.appointments.new) || 0);
    set('enquiries', (s.enquiries && s.enquiries.new) || 0);
  } catch { /* ignore */ }
}

$('logout-btn').addEventListener('click', async () => {
  if (pageDirty() && !(await confirmModal('You have unsaved changes. Sign out anyway?', 'Sign out'))) return;
  try { await post('/api/admin/logout'); } catch { /* ignore */ }
  setPageGuard(null);
  location.hash = '';
  showLogin('You have signed out.');
});

/* ---------- Mobile menu ---------- */
const sidebar = $('sidebar'); const menuBtn = $('menu-btn'); const navScrim = $('nav-scrim');
function setMenu(open) {
  sidebar.classList.toggle('open', open);
  navScrim.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (open) { const a = sidebar.querySelector('a[aria-current]') || sidebar.querySelector('a'); if (a) a.focus(); }
}
menuBtn.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
navScrim.addEventListener('click', () => { setMenu(false); menuBtn.focus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sidebar.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
sidebar.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) setMenu(false); });

/* ---------- Router ---------- */
let currentHash = '';
let ignoreNext = false;
async function route() {
  if (!state.user) return;
  if (ignoreNext) { ignoreNext = false; return; }
  const h = location.hash.replace(/^#\/?/, '');
  if (currentHash && h !== currentHash && pageDirty()) {
    const target = location.hash;
    ignoreNext = true; history.replaceState(null, '', '#/' + currentHash); ignoreNext = false;
    if (!(await confirmModal('You have unsaved changes on this page. Leave without saving?', 'Leave page'))) return;
    setPageGuard(null);
    history.replaceState(null, '', target);
  }
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  let name = parts[0] || 'dashboard';
  if (!ROUTES[name]) name = 'dashboard';
  if (!can(AREA[name])) name = can('dashboard') ? 'dashboard' : 'account';
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  if (name === 'content') params.col = parts[1];
  if (name === 'enquiries' && parts[1]) params.tab = parts[1];
  currentHash = location.hash.replace(/^#\/?/, '');
  closeAllLayers();
  setPageGuard(null);
  for (const a of document.querySelectorAll('#nav a')) {
    if (a.dataset.r === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  const label = (NAV.find((n) => n[0] === name) || [])[1] || 'Admin';
  document.title = `${label} · CareNova admin`;
  const root = $('content');
  root.innerHTML = loadingHTML();
  try { await ROUTES[name](root, { ...params, user: state.user }); }
  catch (e) { toastError(e); }
  root.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  if (name === 'appointments' || name === 'enquiries' || name === 'dashboard') refreshCounts();
}
window.addEventListener('hashchange', route);

/* Boot */
start().catch((e) => { show('login'); toast(e.message || 'Could not start.', 'err'); });
