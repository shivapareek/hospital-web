/* Privacy screens: data requests (with "find and delete this person's data"), notification outbox, retention. */
import {
  esc, get, post, can, toast, toastError, pill, fmtDate, fmtDateTime, fmtRel, loadingHTML, emptyHTML, errorHTML,
  openLayer, confirmIn, busy, debounce, icon, uid,
} from './core.js';
import { TYPES, submissionList } from './submissions.js';

const trunc = (s, n = 90) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const cell = (label, inner) => `<td data-label="${esc(label)}"><div class="cell">${inner}</div></td>`;
const REQUEST_LABEL = { access: 'Access my data', correction: 'Correct my data', deletion: 'Delete my data', 'withdraw-consent': 'Withdraw consent' };
const TYPE_LABEL = { appointments: 'Appointment', messages: 'Message', reports: 'Report request', packages: 'Check-up request', subscribers: 'Subscriber', dataRequests: 'Data request', notifications: 'Outbox message' };

/* Data requests use the generic submissions list and drawer. */
TYPES.dataRequests = {
  label: 'Data requests', noun: 'data request',
  title: (r) => `${REQUEST_LABEL[r.requestType] || 'Data request'} · ${r.name || ''}`,
  columns: [
    ['Name', (r) => `${esc(r.name || '—')}<span class="sub">${esc(r.phone || '')}</span>`],
    ['Email', (r) => esc(r.email || '')],
    ['Request', (r) => esc(REQUEST_LABEL[r.requestType] || r.requestType || '')],
    ['Reply by', (r) => `<span class="nowrap">${esc(fmtDate(r.dueBy))}</span>`],
    ['Status', (r) => pill(r.status)],
    ['Received', (r) => `<span class="nowrap" title="${esc(fmtDateTime(r.createdAt))}">${esc(fmtRel(r.createdAt))}</span>`],
  ],
  details: (r) => [['Name', r.name], ['Phone', r.phone, 'tel'], ['Email', r.email, 'mailto'], ['Request', REQUEST_LABEL[r.requestType] || r.requestType],
    ['Details', r.details], ['Reply by', fmtDate(r.dueBy)], ['Received', fmtDateTime(r.createdAt)]],
  extra: (r, box, layer) => {
    if (!can('users') || r.anonymisedAt) return;
    box.innerHTML = `<div class="callout"><p>Verify the person first (call the mobile number). Then find every record that holds their mobile number or email.</p>
      <button type="button" class="btn btn-danger" data-find>${icon('shield')} Find and delete this person's data</button></div>`;
    box.querySelector('[data-find]').addEventListener('click', () => openFindAndDelete({ phone: r.phone, email: r.email, requestId: r.id, onDone: () => layer.close() }));
  },
};

/**
 * Drawer: search all submissions and the outbox by mobile/email, choose records, anonymise or delete them.
 * Confirmation is in the page (never window.confirm). The server writes the activity log entry.
 */
export function openFindAndDelete({ phone = '', email = '', requestId = '', onDone } = {}) {
  const L = openLayer({ title: "Find and delete a person's data", wide: true });
  const ids = { p: uid('p'), e: uid('e') };
  L.body.innerHTML = `<form class="toolbar" data-s novalidate>
      <div class="field"><label for="${ids.p}">Mobile number</label><input id="${ids.p}" name="phone" type="tel" inputmode="numeric" maxlength="14" autocomplete="off"></div>
      <div class="field grow"><label for="${ids.e}">Email</label><input id="${ids.e}" name="email" type="email" autocomplete="off"></div>
      <div class="btn-row"><button type="submit" class="btn btn-primary">Search</button></div>
    </form>
    <div data-res aria-live="polite"><p class="help">Searches appointments, messages, report and check-up requests, subscribers, data requests and the message outbox.</p></div>`;
  const form = L.body.querySelector('[data-s]');
  const res = L.body.querySelector('[data-res]');
  form.elements.phone.value = phone || ''; form.elements.email.value = email || '';
  let items = [];
  let q = {};
  const search = async () => {
    q = { phone: form.elements.phone.value.trim(), email: form.elements.email.value.trim() };
    res.innerHTML = loadingHTML('Searching');
    try {
      const p = new URLSearchParams(); if (q.phone) p.set('phone', q.phone); if (q.email) p.set('email', q.email);
      items = (await get(`/api/admin/privacy/search?${p}`)).items || [];
      draw();
    } catch (e) { res.innerHTML = errorHTML(e); }
  };
  const draw = () => {
    if (!items.length) { res.innerHTML = emptyHTML('No records found', 'Nothing on the website holds this mobile number or email.'); L.foot.hidden = true; return; }
    res.innerHTML = `<p class="count-line">${items.length} record${items.length === 1 ? '' : 's'} found. Data requests are left unticked so you keep a record of the request.</p>
      <div class="table-wrap"><table class="data stack"><caption class="sr-only">Records that hold this person's data</caption>
      <thead><tr><th scope="col"><span class="sr-only">Select</span></th><th scope="col">Type</th><th scope="col">Record</th><th scope="col">Date</th></tr></thead>
      <tbody>${items.map((m, i) => `<tr>
        <td data-label="Select"><div class="cell"><input type="checkbox" data-i="${i}" aria-label="Select ${esc(m.label)}" ${m.type === 'dataRequests' || m.anonymised ? '' : 'checked'}></div></td>
        ${cell('Type', `${esc(TYPE_LABEL[m.type] || m.type)}${m.anonymised ? ' <span class="pill pill-plain pill-cancelled">Already anonymised</span>' : ''}`)}
        ${cell('Record', `${esc(m.label)}<span class="sub">${esc(trunc(m.summary, 120))}</span>`)}
        ${cell('Date', `<span class="nowrap">${esc(fmtDateTime(m.createdAt))}</span>`)}</tr>`).join('')}</tbody></table></div>
      <fieldset class="field radios"><legend>What to do</legend>
        <label><input type="radio" name="mode" value="anonymise" checked> Anonymise: replace the name with "Removed", clear phone, email, messages and notes. Dates and doctors stay for statistics.</label>
        <label><input type="radio" name="mode" value="delete"> Delete the records completely</label>
      </fieldset>`;
    L.foot.hidden = false;
    L.foot.innerHTML = `<button type="button" class="btn btn-danger-solid" data-go>Remove selected data</button><button type="button" class="btn" data-cancel>Close</button>`;
    L.foot.querySelector('[data-cancel]').addEventListener('click', () => L.close());
    L.foot.querySelector('[data-go]').addEventListener('click', async (e) => {
      const chosen = [...res.querySelectorAll('input[data-i]:checked')].map((c) => items[+c.dataset.i]);
      if (!chosen.length) { toast('Select at least one record.', 'err'); return; }
      const mode = res.querySelector('input[name=mode]:checked').value;
      const ok = await confirmIn(L.foot, `${mode === 'delete' ? 'Delete' : 'Anonymise'} ${chosen.length} record${chosen.length === 1 ? '' : 's'}? This cannot be undone.`, mode === 'delete' ? 'Delete data' : 'Anonymise data', { prepend: true });
      if (!ok) return;
      const btn = L.foot.querySelector('[data-go]');
      await busy(btn, async () => {
        try {
          const r = await post('/api/admin/privacy/erase', { ...q, mode, requestId, items: chosen.map((m) => ({ type: m.type, id: m.id })) });
          toast(`${r.mode === 'delete' ? 'Deleted' : 'Anonymised'} ${r.count} record${r.count === 1 ? '' : 's'}.${requestId ? ' The request is marked completed.' : ''} Logged in the activity log.`);
          L.close();
          if (onDone) onDone(r);
        } catch (err) { toastError(err); }
      }, 'Removing…');
    });
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); search(); });
  if (phone || email) search();
  return L;
}

export async function renderDataRequests(root) {
  root.innerHTML = `<div class="page-head"><div><h1>Data requests</h1><p class="sub">Requests to see, correct or delete personal data, or to withdraw consent (DPDP Act). Reply within 30 days.</p></div>
    <div class="btn-row">${can('users') ? `<button type="button" class="btn" data-find>${icon('shield')} Find a person's data</button><button type="button" class="btn" data-ret>Run retention now</button>` : ''}</div></div>
    <div class="callout" data-status>${loadingHTML()}</div><div data-l></div>`;
  const statusEl = root.querySelector('[data-status]');
  const loadStatus = async () => {
    try {
      const s = await get('/api/admin/privacy/status');
      const days = (n, none) => (Number(n) > 0 ? `${n} days` : none);
      statusEl.innerHTML = `<p><strong>Retention:</strong> appointments ${esc(days(s.retention.appointments, 'kept'))}, enquiries ${esc(days(s.retention.enquiries, 'kept'))}, subscribers ${esc(days(s.retention.subscribers, 'until they unsubscribe'))}. Older records are anonymised automatically every day.
        Last run: ${esc(s.retentionLastRun ? fmtDateTime(s.retentionLastRun) : 'not yet')}. Change these in Settings → Privacy and legal.</p>`;
    } catch (e) { statusEl.innerHTML = errorHTML(e); }
  };
  loadStatus();
  const list = submissionList(root.querySelector('[data-l]'), 'dataRequests');
  root.querySelector('[data-find]')?.addEventListener('click', () => openFindAndDelete({ onDone: () => list.reload() }));
  root.querySelector('[data-ret]')?.addEventListener('click', (e) => busy(e.currentTarget, async () => {
    try {
      const r = await post('/api/admin/privacy/retention/run', {});
      toast(r.total ? `Anonymised ${r.total} old record${r.total === 1 ? '' : 's'}.` : 'Nothing is older than the retention periods.');
      loadStatus();
    } catch (err) { toastError(err); }
  }, 'Running…'));
}

/* ---------- Notifications outbox ---------- */
const TEMPLATE_LABEL = { confirm: 'Booking confirmed', reminder: 'Reminder', cancel: 'Cancelled', reschedule: 'Rescheduled' };
const nf = { status: '', channel: '', template: '', q: '' };
export async function renderNotifications(root) {
  const ids = { st: uid('st'), ch: uid('ch'), tp: uid('tp'), q: uid('q') };
  root.innerHTML = `<div class="page-head"><div><h1>Notifications</h1><p class="sub">Text messages to patients: booking confirmations, changes and reminders.</p></div>
      <div class="btn-row"><button type="button" class="btn" data-run>Send due reminders now</button></div></div>
    <div class="callout" data-mode></div>
    <form class="toolbar" role="search" aria-label="Filter messages">
      <div class="field"><label for="${ids.st}">Status</label><select id="${ids.st}" name="status"><option value="">All</option>${['queued', 'sent', 'logged', 'failed'].map((s) => `<option value="${s}">${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
      <div class="field"><label for="${ids.ch}">Channel</label><select id="${ids.ch}" name="channel"><option value="">All</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></div>
      <div class="field"><label for="${ids.tp}">Message</label><select id="${ids.tp}" name="template"><option value="">All</option>${Object.entries(TEMPLATE_LABEL).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></div>
      <div class="field grow"><label for="${ids.q}">Search</label><input id="${ids.q}" name="q" type="search" placeholder="Number, token, text…"></div>
    </form>
    <p class="count-line" aria-live="polite"></p><div data-list>${loadingHTML()}</div>`;
  const form = root.querySelector('form'); const listEl = root.querySelector('[data-list]'); const countEl = root.querySelector('.count-line'); const modeEl = root.querySelector('[data-mode]');
  for (const k of Object.keys(nf)) form.elements[k].value = nf[k];
  let items = [];
  const load = async () => {
    const p = new URLSearchParams(); for (const k of Object.keys(nf)) if (nf[k]) p.set(k, nf[k]);
    try {
      const d = await get(`/api/admin/notifications?${p}`);
      items = d.items || [];
      modeEl.innerHTML = !d.notifyOn
        ? '<p><strong>Messages are switched off.</strong> Nothing new is queued. Turn them on in Settings → Patient messages.</p>'
        : d.webhook ? '<p><strong>Live:</strong> messages are sent to the SMS gateway set on the server (SMS_WEBHOOK_URL).</p>'
          : '<p><strong>Demo mode:</strong> no SMS is sent. Messages are written here with the status “Logged”. Set SMS_WEBHOOK_URL on the server to deliver them.</p>';
      countEl.textContent = `${d.total ?? items.length} message${(d.total ?? items.length) === 1 ? '' : 's'}${items.length < (d.total || 0) ? ` (showing the newest ${items.length})` : ''}`;
      if (!items.length) { listEl.innerHTML = emptyHTML('No messages', 'Confirmations, changes and reminders will appear here.'); return; }
      listEl.innerHTML = `<div class="table-wrap"><table class="data stack"><caption class="sr-only">Message outbox</caption>
        <thead><tr><th scope="col">Time</th><th scope="col">To</th><th scope="col">Message</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${items.map((n, i) => `<tr>
          ${cell('Time', `<span class="nowrap" title="${esc(fmtDateTime(n.at))}">${esc(fmtRel(n.at))}</span><span class="sub">${esc((n.channel || '').toUpperCase())}</span>`)}
          ${cell('To', `<span class="mono">${esc(n.to || '—')}</span>${n.related && n.related.token ? `<span class="sub">Token ${esc(n.related.token)}</span>` : ''}`)}
          ${cell('Message', `<strong>${esc(TEMPLATE_LABEL[n.template] || n.template)}</strong><span class="sub msg-text">${esc(n.text)}</span>`)}
          ${cell('Status', `${pill(n.status)}${n.error ? `<span class="sub">${esc(n.error)}</span>` : ''}`)}
          <td data-label=""><div class="cell" style="text-align:right">${n.to ? `<button type="button" class="btn btn-sm" data-resend="${i}" aria-label="Send again to ${esc(n.to)}">Resend</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>`;
    } catch (e) { listEl.innerHTML = errorHTML(e); }
  };
  const onFilter = () => { for (const k of ['status', 'channel', 'template']) nf[k] = form.elements[k].value; nf.q = form.elements.q.value.trim(); load(); };
  form.addEventListener('submit', (e) => { e.preventDefault(); onFilter(); });
  for (const k of ['status', 'channel', 'template']) form.elements[k].addEventListener('change', onFilter);
  form.elements.q.addEventListener('input', debounce(onFilter, 300));
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-resend]'); if (!b) return;
    const n = items[+b.dataset.resend];
    busy(b, async () => {
      try { const r = await post(`/api/admin/notifications/${encodeURIComponent(n.id)}/resend`, {}); toast(`Message ${r.item.status === 'failed' ? 'failed again' : r.item.status}.`, r.item.status === 'failed' ? 'err' : 'ok'); load(); }
      catch (err) { toastError(err); }
    }, 'Sending…');
  });
  root.querySelector('[data-run]').addEventListener('click', (e) => busy(e.currentTarget, async () => {
    try { const r = await post('/api/admin/notifications/run-reminders', {}); toast(r.count ? `Queued ${r.count} reminder${r.count === 1 ? '' : 's'}.` : 'No reminders are due right now.'); load(); }
    catch (err) { toastError(err); }
  }, 'Checking…'));
  load();
}
