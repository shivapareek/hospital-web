/* Submissions: appointments, enquiries (messages, reports, packages), subscribers. */
import {
  esc, el, get, post, patch, del, state, toast, toastError, pill, statusLabel, fmtDate, fmtDateTime, fmtRel,
  loadingHTML, emptyHTML, errorHTML, openLayer, confirmIn, confirmModal, busy, debounce, icon, todayISO, uid,
} from './core.js';
import { loadCollection } from './forms.js';

const DEFAULT_STATUSES = {
  appointments: ['new', 'confirmed', 'completed', 'cancelled', 'no-show'],
  other: ['new', 'in-progress', 'done', 'spam'],
};
export function statusesFor(type) {
  const s = state.schema && state.schema.submissions && state.schema.submissions[type];
  if (s && Array.isArray(s.statuses) && s.statuses.length) return s.statuses;
  return type === 'appointments' ? DEFAULT_STATUSES.appointments : DEFAULT_STATUSES.other;
}

const trunc = (s, n = 90) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const cell = (label, inner) => `<td data-label="${esc(label)}"><div class="cell">${inner}</div></td>`;
const patientOf = (a) => a.patient || { name: a.name, phone: a.phone, age: a.age, gender: a.gender };

/* Per-type configuration: table columns and detail rows. Every value is escaped here. */
export const TYPES = {
  appointments: {
    label: 'Appointments', noun: 'appointment',
    title: (a) => `${patientOf(a).name || 'Appointment'}${a.token ? ' · ' + a.token : ''}`,
    columns: [
      ['Token', (a) => `<span class="mono">${esc(a.token || '—')}</span>`],
      ['Patient', (a) => `${esc(patientOf(a).name || '—')}<span class="sub">${esc(patientOf(a).phone || '')}</span>`],
      ['Doctor', (a) => `${esc(a.doctor || '—')}<span class="sub">${esc(a.dept || '')}</span>`],
      ['Date and slot', (a) => `<span class="nowrap">${esc(fmtDate(a.date))}</span><span class="sub">${esc(a.slot || '')}</span>`],
      ['Type', (a) => esc(a.type || '')],
      ['Status', (a) => pill(a.status)],
      ['Received', (a) => `<span class="nowrap" title="${esc(fmtDateTime(a.createdAt))}">${esc(fmtRel(a.createdAt))}</span>`],
    ],
    details: (a) => {
      const p = patientOf(a);
      return [
        ['Token', a.token], ['Patient', p.name], ['Phone', p.phone, 'tel'], ['Age', p.age], ['Gender', p.gender],
        ['Doctor', a.doctor], ['Department', a.dept], ['Date', fmtDate(a.date)], ['Slot', a.slot], ['Type', a.type],
        ['Fee', a.fee !== undefined && a.fee !== null && a.fee !== '' ? `₹${a.fee}` : ''], ['Reason', a.reason],
        ['Source', a.source === 'admin' ? 'Booked in admin' : a.source === 'website' ? 'Website' : a.source],
        ['Received', fmtDateTime(a.createdAt)],
      ];
    },
  },
  messages: {
    label: 'Messages', noun: 'message',
    title: (m) => m.name || 'Message',
    columns: [
      ['From', (m) => `${esc(m.name || '—')}<span class="sub">${esc(m.phone || '')}</span>`],
      ['Email', (m) => esc(m.email || '')],
      ['Message', (m) => esc(trunc(m.message))],
      ['Status', (m) => pill(m.status)],
      ['Received', (m) => `<span class="nowrap" title="${esc(fmtDateTime(m.createdAt))}">${esc(fmtRel(m.createdAt))}</span>`],
    ],
    details: (m) => [['Name', m.name], ['Phone', m.phone, 'tel'], ['Email', m.email, 'mailto'], ['Message', m.message], ['Received', fmtDateTime(m.createdAt)]],
  },
  reports: {
    label: 'Report requests', noun: 'report request',
    title: (r) => `Report request${r.uhid ? ' · ' + r.uhid : ''}`,
    columns: [
      ['UHID', (r) => `<span class="mono">${esc(r.uhid || '—')}</span>`],
      ['Phone', (r) => esc(r.phone || '')],
      ['Status', (r) => pill(r.status)],
      ['Received', (r) => `<span class="nowrap" title="${esc(fmtDateTime(r.createdAt))}">${esc(fmtRel(r.createdAt))}</span>`],
    ],
    details: (r) => [['UHID', r.uhid], ['Phone', r.phone, 'tel'], ['Received', fmtDateTime(r.createdAt)]],
  },
  packages: {
    label: 'Package enquiries', noun: 'package enquiry',
    title: (p) => p.package || 'Package enquiry',
    columns: [
      ['Package', (p) => esc(p.package || '—')],
      ['Contact', (p) => `${esc(p.name || '—')}<span class="sub">${esc(p.phone || '')}</span>`],
      ['Status', (p) => pill(p.status)],
      ['Received', (p) => `<span class="nowrap" title="${esc(fmtDateTime(p.createdAt))}">${esc(fmtRel(p.createdAt))}</span>`],
    ],
    details: (p) => [['Package', p.package], ['Name', p.name], ['Phone', p.phone, 'tel'], ['Received', fmtDateTime(p.createdAt)]],
  },
};

/* Consent record and change history (privacy features) shown under the details. */
function consentHTML(item) {
  const c = item.consent;
  if (item.anonymisedAt) return `<p class="help">Personal details were removed on ${esc(fmtDateTime(item.anonymisedAt))}.</p>`;
  if (!c) return item.source === 'admin' ? '' : '<p class="help">No consent record (received before consent was required).</p>';
  return `<dl class="details"><dt>Consent</dt><dd>Given ${esc(fmtDateTime(c.at))} <span class="mono sub">${esc(c.textVersion || '')}</span></dd></dl>`;
}
const HISTORY_LABEL = { rescheduled: 'Rescheduled', cancelled: 'Cancelled', status: 'Status changed' };
export function historyHTML(item) {
  const h = Array.isArray(item.history) ? item.history : [];
  if (!h.length) return '';
  return `<div class="history"><h3>History</h3><ol class="history-list">${h.slice().reverse().map((x) => `<li>
      <span class="history-when">${esc(fmtDateTime(x.at))}</span>
      <span><strong>${esc(HISTORY_LABEL[x.action] || x.action)}</strong>${x.from || x.to ? ` · ${esc(x.from || '')} → ${esc(x.to || '')}` : ''}${x.tokenTo ? ` · new token ${esc(x.tokenTo)}` : ''}${x.reason ? ` · “${esc(x.reason)}”` : ''}</span>
      <span class="sub">by ${esc(x.by === 'patient' ? 'the patient (website)' : x.by || 'staff')}</span></li>`).join('')}</ol></div>`;
}

function detailsHTML(rows) {
  return `<dl class="details">${rows.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v, kind]) => {
    let val = esc(v);
    if (kind === 'tel') val = `<a href="tel:${esc(String(v).replace(/[^\d+]/g, ''))}">${esc(v)}</a>`;
    if (kind === 'mailto' && /^[^@\s<>"]+@[^@\s<>"]+$/.test(String(v))) val = `<a href="mailto:${esc(v)}">${esc(v)}</a>`;
    return `<dt>${esc(k)}</dt><dd>${val}</dd>`;
  }).join('')}</dl>`;
}

/* Filters are remembered per type while the admin stays open. */
const filters = {};
const qs = (f) => {
  const p = new URLSearchParams();
  for (const k of ['status', 'q', 'from', 'to']) if (f[k]) p.set(k, f[k]);
  const s = p.toString(); return s ? '?' + s : '';
};

/**
 * Render a submissions list for `type` into `root`. `opts.head` adds a page heading.
 */
export function submissionList(root, type, { allowNew = false, onChanged } = {}) {
  const cfg = TYPES[type];
  const f = filters[type] || (filters[type] = { status: '', q: '', from: '', to: '' });
  const ids = { st: uid('st'), q: uid('q'), fr: uid('fr'), to: uid('to') };
  root.innerHTML = `
    <form class="toolbar" role="search" aria-label="Filter ${esc(cfg.label.toLowerCase())}">
      <div class="field"><label for="${ids.st}">Status</label><select id="${ids.st}" name="status"><option value="">All statuses</option>
        ${statusesFor(type).map((s) => `<option value="${esc(s)}">${esc(statusLabel(s))}</option>`).join('')}</select></div>
      <div class="field"><label for="${ids.fr}">From</label><input id="${ids.fr}" name="from" type="date"></div>
      <div class="field"><label for="${ids.to}">To</label><input id="${ids.to}" name="to" type="date"></div>
      <div class="field grow"><label for="${ids.q}">Search</label><input id="${ids.q}" name="q" type="search" placeholder="${type === 'appointments' ? 'Name, phone, token…' : 'Name, phone, email…'}"></div>
      <div class="btn-row">
        <button type="button" class="btn" data-clear>Clear</button>
        <a class="btn" data-export href="#">${icon('download')} Export CSV</a>
      </div>
    </form>
    <p class="count-line" aria-live="polite"></p>
    <div data-list>${loadingHTML()}</div>`;
  const form = root.querySelector('form');
  const listEl = root.querySelector('[data-list]');
  const countEl = root.querySelector('.count-line');
  const exportA = root.querySelector('[data-export]');
  for (const k of ['status', 'q', 'from', 'to']) form.elements[k].value = f[k] || '';
  let items = [];
  let seq = 0;

  const setExport = () => { exportA.href = `/api/admin/export/${type}.csv${qs(f)}`; exportA.setAttribute('download', ''); };
  const load = async () => {
    const my = ++seq;
    setExport();
    listEl.setAttribute('aria-busy', 'true');
    if (!items.length) listEl.innerHTML = loadingHTML();
    try {
      const d = await get(`/api/admin/submissions/${type}${qs(f)}`);
      if (my !== seq) return;
      items = d.items || [];
      draw();
    } catch (e) { if (my === seq) listEl.innerHTML = errorHTML(e); }
    finally { listEl.removeAttribute('aria-busy'); }
  };
  const draw = () => {
    const filtered = !!(f.status || f.q || f.from || f.to);
    countEl.textContent = `${items.length} ${items.length === 1 ? cfg.noun : cfg.noun.replace(/y$/, 'ie') + 's'}${filtered ? ' match your filters' : ''}`;
    if (!items.length) {
      listEl.innerHTML = emptyHTML(filtered ? 'Nothing matches these filters' : `No ${cfg.label.toLowerCase()} yet`, filtered ? 'Try clearing the filters.' : 'New ones from the website will appear here.');
      return;
    }
    listEl.innerHTML = `<div class="table-wrap"><table class="data stack"><caption class="sr-only">${esc(cfg.label)}. Select a row to open it.</caption>
      <thead><tr>${cfg.columns.map(([h]) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${items.map((it, i) => `<tr class="clickable" tabindex="0" data-i="${i}" aria-label="Open ${esc(cfg.title(it))}">${cfg.columns.map(([h, r]) => cell(h, r(it))).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  const open = (i) => {
    const it = items[i]; if (!it) return;
    openSubmission(type, it, {
      onSaved: (u) => { Object.assign(it, u); draw(); if (onChanged) onChanged(); },
      onDeleted: () => { items = items.filter((x) => x !== it); draw(); if (onChanged) onChanged(); },
    });
  };
  listEl.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr && !e.target.closest('a')) open(+tr.dataset.i); });
  listEl.addEventListener('keydown', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(+tr.dataset.i); } });
  const onFilter = () => { for (const k of ['status', 'from', 'to']) f[k] = form.elements[k].value; f.q = form.elements.q.value.trim(); load(); };
  form.addEventListener('submit', (e) => { e.preventDefault(); onFilter(); });
  form.elements.status.addEventListener('change', onFilter);
  form.elements.from.addEventListener('change', onFilter);
  form.elements.to.addEventListener('change', onFilter);
  form.elements.q.addEventListener('input', debounce(onFilter, 300));
  root.querySelector('[data-clear]').addEventListener('click', () => { for (const k of ['status', 'q', 'from', 'to']) form.elements[k].value = ''; onFilter(); });
  load();
  return { reload: load };
}

/* Drawer with details, status, internal note, save and delete. */
export function openSubmission(type, item, { onSaved, onDeleted } = {}) {
  const cfg = TYPES[type];
  const sid = uid('s'); const nid = uid('n');
  const L = openLayer({ title: cfg.title(item), isDirty: () => dirty() });
  L.body.innerHTML = `${detailsHTML(cfg.details(item))}${consentHTML(item)}${historyHTML(item)}<div data-extra></div>
    <div class="field"><label for="${sid}">Status</label><select id="${sid}">
      ${statusesFor(type).map((s) => `<option value="${esc(s)}">${esc(statusLabel(s))}</option>`).join('')}</select></div>
    <div class="field"><label for="${nid}">Internal note</label><textarea id="${nid}" rows="4" aria-describedby="${nid}-h"></textarea>
      <div class="help" id="${nid}-h">Only staff can see this note.</div></div>`;
  if (cfg.extra) cfg.extra(item, L.body.querySelector('[data-extra]'), L);
  const sel = L.body.querySelector(`#${sid}`); const note = L.body.querySelector(`#${nid}`);
  if (!statusesFor(type).includes(item.status) && item.status) sel.insertAdjacentHTML('beforeend', `<option value="${esc(item.status)}">${esc(statusLabel(item.status))}</option>`);
  sel.value = item.status || 'new'; note.value = item.note || '';
  const dirty = () => sel.value !== (item.status || 'new') || note.value !== (item.note || '');
  L.foot.hidden = false;
  L.foot.innerHTML = `<button type="button" class="btn btn-primary" data-save>Save</button><button type="button" class="btn" data-cancel>Close</button><span class="spacer"></span><button type="button" class="btn btn-danger" data-del>Delete</button>`;
  L.foot.querySelector('[data-cancel]').addEventListener('click', () => L.requestClose());
  L.foot.querySelector('[data-save]').addEventListener('click', (e) => busy(e.currentTarget, async () => {
    try {
      const body = { status: sel.value, note: note.value };
      const r = await patch(`/api/admin/submissions/${type}/${encodeURIComponent(item.id)}`, body);
      const upd = (r && (r.item || r[type.replace(/s$/, '')])) || body;
      Object.assign(item, body, upd);
      toast('Saved.');
      if (onSaved) onSaved(item);
      L.close();
    } catch (err) { toastError(err); }
  }));
  L.foot.querySelector('[data-del]').addEventListener('click', async () => {
    if (!(await confirmIn(L.foot, `Delete this ${cfg.noun}? This cannot be undone.`))) return;
    try {
      await del(`/api/admin/submissions/${type}/${encodeURIComponent(item.id)}`);
      toast(`${cfg.noun.charAt(0).toUpperCase() + cfg.noun.slice(1)} deleted.`);
      L.close();
      if (onDeleted) onDeleted();
    } catch (err) { toastError(err); }
  });
  return L;
}

/* ---------- Pages ---------- */
export function renderAppointments(root) {
  root.innerHTML = `<div class="page-head"><div><h1>Appointments</h1><p class="sub">Bookings from the website and the front desk.</p></div>
    <div class="btn-row"><button type="button" class="btn btn-primary" data-new>${icon('plus')} New appointment</button></div></div><div data-l></div>`;
  const list = submissionList(root.querySelector('[data-l]'), 'appointments');
  root.querySelector('[data-new]').addEventListener('click', () => openBooking(() => list.reload()));
}

const enqTab = { current: 'messages' };
export function renderEnquiries(root, params) {
  const tabs = ['messages', 'reports', 'packages'];
  if (params && tabs.includes(params.tab)) enqTab.current = params.tab;
  root.innerHTML = `<div class="page-head"><div><h1>Enquiries</h1><p class="sub">Messages, report requests and health check-up enquiries from the website.</p></div></div>
    <div class="tabs" role="tablist" aria-label="Enquiry type">${tabs.map((t) => `<button type="button" role="tab" id="tab-${t}" aria-controls="panel-enq" data-t="${t}">${esc(TYPES[t].label)}</button>`).join('')}</div>
    <div id="panel-enq" role="tabpanel"></div>`;
  const panel = root.querySelector('#panel-enq');
  const btns = Array.from(root.querySelectorAll('[role="tab"]'));
  const show = (t) => {
    enqTab.current = t;
    btns.forEach((b) => { const on = b.dataset.t === t; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'tab-' + t);
    submissionList(panel, t);
  };
  btns.forEach((b, i) => {
    b.addEventListener('click', () => show(b.dataset.t));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      n.focus(); show(n.dataset.t);
    });
  });
  show(enqTab.current);
}

export function renderSubscribers(root) {
  const qid = uid('q');
  root.innerHTML = `<div class="page-head"><div><h1>Subscribers</h1><p class="sub">People who signed up for the newsletter.</p></div>
    <div class="btn-row"><a class="btn" href="/api/admin/export/subscribers.csv" download data-export>${icon('download')} Export CSV</a></div></div>
    <div class="toolbar"><div class="field grow"><label for="${qid}">Search</label><input id="${qid}" type="search" placeholder="Email"></div></div>
    <p class="count-line" aria-live="polite"></p><div data-l>${loadingHTML()}</div>`;
  const listEl = root.querySelector('[data-l]'); const countEl = root.querySelector('.count-line');
  const q = root.querySelector('input'); const exp = root.querySelector('[data-export]');
  let items = [];
  const draw = () => {
    countEl.textContent = `${items.length} ${items.length === 1 ? 'subscriber' : 'subscribers'}`;
    if (!items.length) { listEl.innerHTML = emptyHTML(q.value ? 'No subscribers match' : 'No subscribers yet'); return; }
    listEl.innerHTML = `<div class="table-wrap"><table class="data stack"><caption class="sr-only">Subscribers</caption><thead><tr><th scope="col">Email</th><th scope="col">Subscribed</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${items.map((s, i) => `<tr>${cell('Email', esc(s.email))}${cell('Subscribed', esc(fmtDateTime(s.createdAt)))}
        <td data-label=""><div class="cell" style="text-align:right"><button type="button" class="btn btn-sm btn-danger" data-del="${i}" aria-label="Delete ${esc(s.email)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  };
  const load = async () => {
    const p = q.value.trim() ? `?q=${encodeURIComponent(q.value.trim())}` : '';
    exp.href = `/api/admin/export/subscribers.csv${p}`;
    try { items = (await get(`/api/admin/submissions/subscribers${p}`)).items || []; draw(); }
    catch (e) { listEl.innerHTML = errorHTML(e); }
  };
  q.addEventListener('input', debounce(load, 300));
  listEl.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const s = items[+b.dataset.del];
    if (!(await confirmModal(`Remove ${s.email} from the subscriber list?`, 'Delete subscriber'))) return;
    try { await del(`/api/admin/submissions/subscribers/${encodeURIComponent(s.id)}`); items = items.filter((x) => x !== s); draw(); toast('Subscriber deleted.'); }
    catch (err) { toastError(err); }
  });
  load();
}

/* ---------- Manual booking ---------- */
function slotList() {
  const out = [];
  for (let m = 9 * 60; m <= 19 * 60 + 30; m += 30) {
    const h = Math.floor(m / 60), mm = m % 60;
    const h12 = ((h + 11) % 12) + 1;
    out.push(`${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`);
  }
  return out;
}

export function openBooking(onDone) {
  const L = openLayer({ title: 'New appointment', isDirty: () => dirty() });
  const ids = { doc: uid('d'), date: uid('dt'), slot: uid('sl'), type: uid('ty'), name: uid('nm'), phone: uid('ph'), age: uid('ag'), gender: uid('gn'), reason: uid('rs'), fee: uid('fe'), dept: uid('dp') };
  L.body.innerHTML = `<form novalidate data-f>
    <div class="form-group"><h3>Patient</h3>
      <div class="field"><label for="${ids.name}">Full name<span class="req" aria-hidden="true">*</span></label><input id="${ids.name}" name="name" type="text" required autocomplete="off"></div>
      <div class="field"><label for="${ids.phone}">Mobile number<span class="req" aria-hidden="true">*</span></label><input id="${ids.phone}" name="phone" type="tel" inputmode="tel" required autocomplete="off"></div>
      <div class="grid-2">
        <div class="field"><label for="${ids.age}">Age</label><input id="${ids.age}" name="age" type="number" min="0" max="120" inputmode="numeric"></div>
        <div class="field"><label for="${ids.gender}">Gender</label><select id="${ids.gender}" name="gender"><option value="">Not given</option><option>Female</option><option>Male</option><option>Other</option></select></div>
      </div>
      <div class="field"><label for="${ids.reason}">Reason for visit</label><textarea id="${ids.reason}" name="reason" rows="3"></textarea></div>
    </div>
    <div class="form-group"><h3>Appointment</h3>
      <div class="field"><label for="${ids.doc}">Doctor<span class="req" aria-hidden="true">*</span></label><select id="${ids.doc}" name="doctor" required disabled><option value="">Loading doctors…</option></select></div>
      <div class="field"><label for="${ids.dept}">Department</label><input id="${ids.dept}" name="dept" type="text" readonly aria-describedby="${ids.dept}-h"><div class="help" id="${ids.dept}-h">Filled in from the doctor.</div></div>
      <div class="grid-2">
        <div class="field"><label for="${ids.date}">Date<span class="req" aria-hidden="true">*</span></label><input id="${ids.date}" name="date" type="date" required min="${todayISO()}" value="${todayISO()}"></div>
        <div class="field"><label for="${ids.slot}">Time slot<span class="req" aria-hidden="true">*</span></label><select id="${ids.slot}" name="slot" required aria-describedby="${ids.slot}-h"></select><div class="help" id="${ids.slot}-h" aria-live="polite"></div></div>
      </div>
      <div class="grid-2">
        <div class="field"><label for="${ids.type}">Visit type</label><select id="${ids.type}" name="type"><option>In-clinic</option><option>Video</option></select></div>
        <div class="field"><label for="${ids.fee}">Fee (₹)</label><input id="${ids.fee}" name="fee" type="number" min="0" inputmode="numeric"></div>
      </div>
    </div>
    <div data-err></div>
  </form>`;
  const form = L.body.querySelector('form');
  const E = form.elements;
  let doctors = [];
  const initial = () => JSON.stringify([E.name.value, E.phone.value, E.age.value, E.gender.value, E.reason.value, E.doctor.value]);
  const blank = initial();
  const dirty = () => initial() !== blank;

  const slotHelp = L.body.querySelector(`#${ids.slot}-h`);
  const refreshSlots = async () => {
    const keep = E.slot.value;
    const slots = slotList();
    let taken = [];
    if (E.doctor.value && E.date.value) {
      slotHelp.textContent = 'Checking free slots…';
      try { taken = (await get(`/api/slots?doctor=${encodeURIComponent(E.doctor.value)}&date=${encodeURIComponent(E.date.value)}`)).taken || []; slotHelp.textContent = taken.length ? `${taken.length} slot${taken.length === 1 ? ' is' : 's are'} already booked.` : 'All slots are free.'; }
      catch { slotHelp.textContent = 'Could not check booked slots.'; }
    } else slotHelp.textContent = 'Choose a doctor to see booked slots.';
    E.slot.innerHTML = '<option value="">Choose…</option>' + slots.map((s) => `<option value="${esc(s)}"${taken.includes(s) ? ' disabled' : ''}>${esc(s)}${taken.includes(s) ? ' (booked)' : ''}</option>`).join('');
    if (keep && !taken.includes(keep)) E.slot.value = keep;
  };
  loadCollection('doctors').then((list) => {
    doctors = list.filter((d) => d && d.name);
    E.doctor.innerHTML = '<option value="">Choose a doctor…</option>' + doctors.map((d) => `<option value="${esc(d.name)}">${esc(d.name)}${d.dept ? ' · ' + esc(d.dept) : ''}${d.hidden ? ' (hidden on site)' : ''}</option>`).join('');
    E.doctor.disabled = false;
  }).catch((e) => { E.doctor.innerHTML = '<option value="">Could not load doctors</option>'; toastError(e); });
  E.doctor.addEventListener('change', () => {
    const d = doctors.find((x) => x.name === E.doctor.value);
    E.dept.value = (d && d.dept) || '';
    if (d && d.fee !== undefined && d.fee !== null) E.fee.value = d.fee;
    if (d && d.video === false) E.type.value = 'In-clinic';
    refreshSlots();
  });
  E.date.addEventListener('change', refreshSlots);
  refreshSlots();

  L.foot.hidden = false;
  L.foot.innerHTML = `<button type="button" class="btn btn-primary" data-save>Book appointment</button><button type="button" class="btn" data-cancel>Cancel</button>`;
  L.foot.querySelector('[data-cancel]').addEventListener('click', () => L.requestClose());
  const errBox = L.body.querySelector('[data-err]');
  const submit = (btn) => busy(btn, async () => {
    errBox.innerHTML = '';
    form.querySelectorAll('.field.invalid').forEach((x) => x.classList.remove('invalid'));
    const missing = [];
    for (const [n, lbl] of [['name', 'Full name'], ['phone', 'Mobile number'], ['doctor', 'Doctor'], ['date', 'Date'], ['slot', 'Time slot']]) {
      if (!String(E[n].value).trim()) { missing.push(lbl); E[n].closest('.field').classList.add('invalid'); }
    }
    if (E.phone.value.trim() && E.phone.value.replace(/\D/g, '').length < 10) { missing.push('a valid mobile number (10 digits)'); E.phone.closest('.field').classList.add('invalid'); }
    if (missing.length) {
      errBox.innerHTML = `<div class="alert alert-error" role="alert">Please fill in: ${esc(missing.join(', '))}.</div>`;
      const first = form.querySelector('.field.invalid input, .field.invalid select'); if (first) first.focus();
      return;
    }
    const patient = { name: E.name.value.trim(), phone: E.phone.value.trim(), age: E.age.value ? Number(E.age.value) : null, gender: E.gender.value };
    const body = {
      patient, ...patient, reason: E.reason.value.trim(), doctor: E.doctor.value, dept: E.dept.value,
      date: E.date.value, slot: E.slot.value, type: E.type.value, fee: E.fee.value === '' ? null : Number(E.fee.value),
    };
    try {
      const r = await post('/api/admin/submissions/appointments', body);
      const tok = (r && (r.token || (r.item && r.item.token))) || '';
      toast(tok ? `Appointment booked. Token ${tok}.` : 'Appointment booked.');
      L.close();
      if (onDone) onDone(r);
    } catch (err) {
      errBox.innerHTML = `<div class="alert alert-error" role="alert">${esc(err.message)}</div>`;
      errBox.scrollIntoView({ block: 'nearest' });
    }
  }, 'Booking…');
  L.foot.querySelector('[data-save]').addEventListener('click', (e) => submit(e.currentTarget));
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(L.foot.querySelector('[data-save]')); });
}
