/* Dashboard: stat tiles, appointments chart, recent items, live status editor. */
import {
  esc, get, put, can, toast, toastError, pill, fmtDate, fmtRel, fmtDateTime, loadingHTML, emptyHTML, errorHTML,
  busy, uid, todayISO,
} from './core.js';
import { TYPES, openSubmission } from './submissions.js';

const ENQ_TYPE = { message: 'messages', messages: 'messages', report: 'reports', reports: 'reports', package: 'packages', packages: 'packages' };

export async function renderDashboard(root, ctx) {
  const statsAllowed = can('stats');
  root.innerHTML = `<div class="page-head"><div><h1>Dashboard</h1><p class="sub">${esc(greeting())}, ${esc((ctx.user && ctx.user.name) || '')}.</p></div></div>
    <div data-stats>${statsAllowed ? loadingHTML('Loading dashboard') : ''}</div>`;
  const statsEl = root.querySelector('[data-stats]');

  if (!statsAllowed) {
    // Editors have no access to submissions or stats, only the live panel.
    statsEl.innerHTML = `<div class="dash-grid"><div class="card" data-live></div>
      <div class="card"><h2>Quick links</h2><ul class="list-plain">
        ${can('content') ? '<li><a href="#/content/doctors">Edit doctors</a></li>' : ''}
        ${can('texts') ? '<li><a href="#/texts">Edit page text and images</a></li>' : ''}
        ${can('media') ? '<li><a href="#/media">Upload images</a></li>' : ''}
        ${can('sections') ? '<li><a href="#/sections">Show or hide page sections</a></li>' : ''}
      </ul></div></div>`;
    try { liveEditor(statsEl.querySelector('[data-live]'), await get('/api/admin/live')); }
    catch (e) { statsEl.querySelector('[data-live]').innerHTML = errorHTML(e); }
    return;
  }

  let s;
  try { s = await get('/api/admin/stats'); } catch (e) { statsEl.innerHTML = errorHTML(e); return; }
  const a = s.appointments || {}; const en = s.enquiries || {};
  const n = (v) => esc(Number(v) || 0);
  statsEl.innerHTML = `
    <div class="tiles">
      <a class="tile" href="#/appointments"><div class="k">Appointments today</div><div class="v">${n(a.today)}</div></a>
      <a class="tile" href="#/appointments"><div class="k">Upcoming</div><div class="v">${n(a.upcoming)}</div></a>
      <a class="tile" href="#/appointments"><div class="k">New appointments</div><div class="v">${n(a.new)}</div></a>
      <a class="tile" href="#/enquiries"><div class="k">New enquiries</div><div class="v">${n(en.new)}</div></a>
      <a class="tile" href="#/subscribers"><div class="k">Subscribers</div><div class="v">${n(s.subscribers)}</div></a>
    </div>
    <div class="dash-grid">
      <div class="stack-16">
        <section class="card chart" aria-labelledby="chart-h"><div class="card-head"><h2 id="chart-h">Appointments booked, last 14 days</h2></div><div data-chart></div></section>
        <section class="card" aria-labelledby="ra-h"><div class="card-head"><h2 id="ra-h">Recent appointments</h2><a href="#/appointments" class="small">View all</a></div><div data-ra></div></section>
      </div>
      <div class="stack-16">
        <section class="card" aria-labelledby="live-h" data-live></section>
        <section class="card" aria-labelledby="re-h"><div class="card-head"><h2 id="re-h">Recent enquiries</h2><a href="#/enquiries" class="small">View all</a></div><div data-re></div></section>
      </div>
    </div>`;
  const days = fillDays(s.byDay || [], 14);
  statsEl.querySelector('[data-chart]').innerHTML = barChart(days) + (days.some((d) => d.count) ? '' : '<p class="small muted" style="margin:8px 0 0">No appointments were booked in the last 14 days.</p>');

  const recentA = s.recentAppointments || [];
  const raEl = statsEl.querySelector('[data-ra]');
  const drawRA = () => {
    if (!recentA.length) { raEl.innerHTML = emptyHTML('No appointments yet'); return; }
    raEl.innerHTML = `<div class="table-wrap" style="border:0"><table class="data stack"><caption class="sr-only">Six newest appointments. Select a row to open it.</caption>
      <thead><tr><th scope="col">Token</th><th scope="col">Patient</th><th scope="col">Doctor</th><th scope="col">Date and slot</th><th scope="col">Status</th></tr></thead>
      <tbody>${recentA.map((x, i) => {
        const p = x.patient || {};
        return `<tr class="clickable" tabindex="0" data-i="${i}" aria-label="Open appointment ${esc(x.token || '')}">
        <td data-label="Token"><div class="cell mono">${esc(x.token || '—')}</div></td>
        <td data-label="Patient"><div class="cell">${esc(p.name || x.name || '—')}<span class="sub">${esc(p.phone || x.phone || '')}</span></div></td>
        <td data-label="Doctor"><div class="cell">${esc(x.doctor || '')}</div></td>
        <td data-label="Date and slot"><div class="cell"><span class="nowrap">${esc(fmtDate(x.date))}</span><span class="sub">${esc(x.slot || '')}</span></div></td>
        <td data-label="Status"><div class="cell">${pill(x.status)}</div></td></tr>`;
      }).join('')}</tbody></table></div>`;
  };
  drawRA();
  const openRA = (i) => openSubmission('appointments', recentA[i], { onSaved: drawRA, onDeleted: () => { recentA.splice(i, 1); drawRA(); } });
  raEl.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr) openRA(+tr.dataset.i); });
  raEl.addEventListener('keydown', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openRA(+tr.dataset.i); } });

  const recentE = s.recentEnquiries || [];
  const reEl = statsEl.querySelector('[data-re]');
  const drawRE = () => {
    if (!recentE.length) { reEl.innerHTML = emptyHTML('No enquiries yet'); return; }
    reEl.innerHTML = `<ul class="list-plain">${recentE.map((x, i) => {
      const t = ENQ_TYPE[x.type] || 'messages';
      const kind = { messages: 'Message', reports: 'Report request', packages: 'Package enquiry' }[t];
      const who = x.name || x.uhid || x.email || x.phone || '';
      const what = t === 'messages' ? (x.message || '') : t === 'packages' ? (x.package || '') : (x.phone || '');
      return `<li><button type="button" class="rowlink" data-i="${i}">
        <span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><strong>${esc(kind)}${who ? ' · ' + esc(who) : ''}</strong>${pill(x.status)}</span>
        <span class="meta" style="display:block">${esc(String(what).slice(0, 80))}${String(what).length > 80 ? '…' : ''}</span>
        <span class="meta" style="display:block">${esc(fmtRel(x.createdAt))}</span></button></li>`;
    }).join('')}</ul>`;
  };
  drawRE();
  reEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const i = +b.dataset.i; const x = recentE[i];
    openSubmission(ENQ_TYPE[x.type] || 'messages', x, { onSaved: drawRE, onDeleted: () => { recentE.splice(i, 1); drawRE(); } });
  });

  const liveEl = statsEl.querySelector('[data-live]');
  if (s.live && Object.keys(s.live).length) liveEditor(liveEl, s.live);
  else get('/api/admin/live').then((l) => liveEditor(liveEl, l)).catch((e) => { liveEl.innerHTML = errorHTML(e); });
}

function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

/* Ensure exactly `n` days ending today, filling gaps with 0. */
function fillDays(byDay, n) {
  const map = new Map(byDay.map((d) => [d.date, Number(d.count) || 0]));
  const out = [];
  const lastISO = byDay.length ? byDay.map((d) => d.date).sort().pop() : null;
  const end = new Date();
  if (lastISO && lastISO > todayISO(end)) { const [y, m, d] = lastISO.split('-').map(Number); end.setFullYear(y, m - 1, d); }
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const iso = todayISO(d);
    out.push({ date: iso, count: map.get(iso) || 0, d });
  }
  return out;
}

/* Bar chart to scale, with labelled y axis (counts) and x axis (dates). */
function barChart(days) {
  const W = 640, H = 230, L = 36, R = 8, T = 18, B = 44;
  const max = Math.max(0, ...days.map((d) => d.count));
  // nice integer ticks
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.ceil(max / 5 / 10) * 10;
  const top = Math.max(step * Math.ceil(max / step), step);
  const iw = W - L - R, ih = H - T - B;
  const bw = iw / days.length;
  const y = (v) => T + ih - (v / top) * ih;
  const ticks = []; for (let v = 0; v <= top; v += step) ticks.push(v);
  const total = days.reduce((s, d) => s + d.count, 0);
  const fmtShort = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const label = `Bar chart. ${total} appointments booked between ${fmtShort(days[0].d)} and ${fmtShort(days[days.length - 1].d)}. Highest in one day: ${max}.`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    ${ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
    <text x="0" y="${T - 6}" style="font-weight:700">Count</text>
    ${days.map((d, i) => {
      const x = L + i * bw + bw * 0.18; const w = bw * 0.64; const h = (d.count / top) * ih;
      const lbl = `${fmtShort(d.d)}: ${d.count} ${d.count === 1 ? 'appointment' : 'appointments'}`;
      return `<g><rect class="bar" x="${x.toFixed(1)}" y="${(T + ih - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${esc(lbl)}</title></rect>
        ${d.count ? `<text class="val" x="${(x + w / 2).toFixed(1)}" y="${(T + ih - h - 4).toFixed(1)}" text-anchor="middle">${d.count}</text>` : ''}
        ${i % 2 === (days.length - 1) % 2 ? `<text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - B + 16}" text-anchor="middle">${esc(d.d.getDate())}</text><text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - B + 29}" text-anchor="middle">${esc(d.d.toLocaleDateString('en-GB', { month: 'short' }))}</text>` : ''}</g>`;
    }).join('')}
    <line class="axis" x1="${L}" x2="${W - R}" y1="${T + ih}" y2="${T + ih}"/>
    <line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${T + ih}"/>
  </svg>`;
}

/* Live status editor (also used standalone). */
export function liveEditor(box, live) {
  const ids = { m: uid('mode'), er: uid('er'), beds: uid('beds'), icu: uid('icu'), tok: uid('tok') };
  box.innerHTML = `<div class="card-head"><h2 id="live-h">Live status</h2><span class="small muted" data-upd></span></div>
    <form novalidate>
      <fieldset><legend>Mode</legend><div class="radio-row">
        <label class="check"><input type="radio" name="mode" value="manual"> Manual</label>
        <label class="check"><input type="radio" name="mode" value="demo"> Demo</label></div>
        <div class="help" data-modehelp></div></fieldset>
      <div class="live-grid">
        <div class="field"><label for="${ids.er}">ER wait (min)</label><input id="${ids.er}" name="erWait" type="number" min="0" inputmode="numeric"></div>
        <div class="field"><label for="${ids.beds}">Beds free</label><input id="${ids.beds}" name="beds" type="number" min="0" inputmode="numeric"></div>
        <div class="field"><label for="${ids.icu}">ICU beds free</label><input id="${ids.icu}" name="icu" type="number" min="0" inputmode="numeric"></div>
        <div class="field"><label for="${ids.tok}">OPD token now serving</label><input id="${ids.tok}" name="token" type="text" maxlength="16"></div>
      </div>
      <button type="submit" class="btn btn-primary">Save live status</button>
    </form>`;
  const form = box.querySelector('form'); const E = form.elements;
  const fill = (l) => {
    for (const r of form.querySelectorAll('input[name="mode"]')) r.checked = r.value === (l.mode || 'manual');
    E.erWait.value = l.erWait ?? ''; E.beds.value = l.beds ?? ''; E.icu.value = l.icu ?? ''; E.token.value = l.token ?? '';
    box.querySelector('[data-upd]').textContent = l.updatedAt ? `Updated ${fmtRel(l.updatedAt)}` : '';
    box.querySelector('[data-upd]').title = l.updatedAt ? fmtDateTime(l.updatedAt) : '';
    modeHelp();
  };
  const modeHelp = () => {
    const demo = form.querySelector('input[name="mode"]:checked')?.value === 'demo';
    box.querySelector('[data-modehelp]').textContent = demo
      ? 'Demo: the website shows sample numbers that change by themselves. Use Manual for real figures.'
      : 'Manual: the website shows exactly the numbers below.';
  };
  form.addEventListener('change', (e) => { if (e.target.name === 'mode') modeHelp(); });
  fill(live || {});
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const num = (v) => (v === '' ? null : Math.max(0, Math.round(Number(v))));
    const body = {
      mode: form.querySelector('input[name="mode"]:checked')?.value || 'manual',
      erWait: num(E.erWait.value), beds: num(E.beds.value), icu: num(E.icu.value), token: E.token.value.trim(),
    };
    for (const k of ['erWait', 'beds', 'icu']) if (body[k] === null) delete body[k];
    busy(form.querySelector('button[type="submit"]'), async () => {
      try { const r = await put("/api/admin/live", body); const saved = r && (r.live || (r.mode ? r : null)); fill(saved || { ...body, updatedAt: new Date().toISOString() }); toast('Live status saved.'); }
      catch (err) { toastError(err); }
    });
  });
}
