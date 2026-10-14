/* Users (admin only), My account, Activity log. */
import {
  esc, get, post, put, del, state, toast, toastError, fmtDateTime, fmtRel, loadingHTML, emptyHTML, errorHTML,
  openLayer, confirmIn, busy, uid, icon, debounce, cap,
} from './core.js';

const ROLES = [
  ['admin', 'Admin', 'Everything, including users.'],
  ['editor', 'Editor', 'Content, page text, sections, media, settings and live status.'],
  ['reception', 'Reception', 'Dashboard, appointments, enquiries and live status.'],
];
const roleLabel = (r) => (ROLES.find((x) => x[0] === r) || [r, cap(r)])[1];
const rolePill = (r) => `<span class="pill role-pill">${esc(roleLabel(r))}</span>`;

export async function renderUsers(root) {
  root.innerHTML = `<div class="page-head"><div><h1>Users</h1><p class="sub">People who can sign in to this admin.</p></div>
    <div class="btn-row"><button type="button" class="btn btn-primary" data-add>${icon('plus')} Add user</button></div></div><div data-l>${loadingHTML()}</div>`;
  const listEl = root.querySelector('[data-l]');
  let items = [];
  const draw = () => {
    if (!items.length) { listEl.innerHTML = emptyHTML('No users'); return; }
    listEl.innerHTML = `<div class="table-wrap"><table class="data stack"><caption class="sr-only">Users</caption>
      <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Last sign-in</th><th scope="col">Added</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${items.map((u, i) => `<tr>
        <td data-label="Name"><div class="cell">${esc(u.name)}${state.user && u.id === state.user.id ? ' <span class="muted small">(you)</span>' : ''}<span class="sub">${esc(u.email)}</span></div></td>
        <td data-label="Role"><div class="cell">${rolePill(u.role)}</div></td>
        <td data-label="Last sign-in"><div class="cell" title="${esc(fmtDateTime(u.lastLogin))}">${u.lastLogin ? esc(fmtRel(u.lastLogin)) : '<span class="muted">Never</span>'}</div></td>
        <td data-label="Added"><div class="cell">${esc(fmtDateTime(u.createdAt))}</div></td>
        <td data-label=""><div class="cell" style="text-align:right"><button type="button" class="btn btn-sm" data-i="${i}" aria-label="Edit ${esc(u.name)}">Edit</button></div></td></tr>`).join('')}</tbody></table></div>`;
  };
  const load = async () => { try { items = (await get('/api/admin/users')).items || []; draw(); } catch (e) { listEl.innerHTML = errorHTML(e); } };
  listEl.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) openUser(items[+b.dataset.i], load); });
  root.querySelector('[data-add]').addEventListener('click', () => openUser(null, load));
  load();
}

function openUser(user, onDone) {
  const isNew = !user;
  const me = state.user && user && user.id === state.user.id;
  const ids = { n: uid('n'), e: uid('e'), p: uid('p'), r: uid('r') };
  let initial = '';
  const L = openLayer({ title: isNew ? 'Add user' : `Edit ${user.name}`, isDirty: () => snap() !== initial });
  L.body.innerHTML = `<form novalidate>
    <div class="field"><label for="${ids.n}">Name<span class="req" aria-hidden="true">*</span></label><input id="${ids.n}" name="name" type="text" required autocomplete="off"></div>
    <div class="field"><label for="${ids.e}">Email${isNew ? '<span class="req" aria-hidden="true">*</span>' : ''}</label><input id="${ids.e}" name="email" type="email" ${isNew ? 'required' : 'readonly aria-describedby="' + ids.e + '-h"'} autocomplete="off">${isNew ? '' : `<div class="help" id="${ids.e}-h">The email address cannot be changed.</div>`}</div>
    <fieldset><legend>Role</legend>${ROLES.map(([v, l, d]) => `<label class="check" style="align-items:flex-start;margin-bottom:8px;font-weight:400"><input type="radio" name="role" value="${v}" ${me ? 'disabled' : ''} style="margin-top:3px"><span><strong>${esc(l)}</strong><br><span class="small muted">${esc(d)}</span></span></label>`).join('')}
      ${me ? '<div class="help">You cannot change your own role.</div>' : ''}</fieldset>
    <div class="field"><label for="${ids.p}">${isNew ? 'Password<span class="req" aria-hidden="true">*</span>' : 'Reset password'}</label>
      <input id="${ids.p}" name="password" type="password" autocomplete="new-password" minlength="8" aria-describedby="${ids.p}-h">
      <div class="help" id="${ids.p}-h">${isNew ? 'At least 8 characters. Share it with the person securely; they should change it after signing in.' : 'Leave empty to keep the current password. At least 8 characters.'}</div></div>
    <div data-err></div></form>`;
  const form = L.body.querySelector('form'); const E = form.elements;
  E.name.value = user ? user.name || '' : ''; E.email.value = user ? user.email || '' : '';
  const role = user ? user.role : 'editor';
  form.querySelectorAll('input[name="role"]').forEach((r) => { r.checked = r.value === role; });
  const snap = () => JSON.stringify([E.name.value, E.email.value, form.querySelector('input[name="role"]:checked')?.value, E.password.value]);
  initial = snap();
  L.foot.hidden = false;
  L.foot.innerHTML = `<button type="button" class="btn btn-primary" data-save>${isNew ? 'Add user' : 'Save changes'}</button><button type="button" class="btn" data-cancel>Cancel</button><span class="spacer"></span>${!isNew && !me ? '<button type="button" class="btn btn-danger" data-del>Delete user</button>' : ''}`;
  L.foot.querySelector('[data-cancel]').addEventListener('click', () => L.requestClose());
  const err = L.body.querySelector('[data-err]');
  const save = () => busy(L.foot.querySelector('[data-save]'), async () => {
    err.innerHTML = '';
    const name = E.name.value.trim(); const email = E.email.value.trim(); const pw = E.password.value;
    const r = form.querySelector('input[name="role"]:checked')?.value;
    const problems = [];
    if (!name) problems.push('Enter a name.');
    if (isNew && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problems.push('Enter a valid email address.');
    if ((isNew || pw) && pw.length < 8) problems.push('The password must be at least 8 characters.');
    if (!r) problems.push('Choose a role.');
    if (problems.length) { err.innerHTML = `<div class="alert alert-error" role="alert">${problems.map(esc).join('<br>')}</div>`; return; }
    try {
      if (isNew) await post('/api/admin/users', { name, email, password: pw, role: r });
      else {
        const body = { name };
        if (!me) body.role = r;
        if (pw) body.password = pw;
        await put(`/api/admin/users/${encodeURIComponent(user.id)}`, body);
        if (me) { state.user.name = name; document.dispatchEvent(new CustomEvent('cms:user')); }
      }
      toast(isNew ? 'User added.' : pw ? 'Changes saved. The new password works now.' : 'Changes saved.');
      initial = snap(); L.close(); onDone();
    } catch (e) { err.innerHTML = `<div class="alert alert-error" role="alert">${esc(e.message)}</div>`; }
  });
  L.foot.querySelector('[data-save]').addEventListener('click', save);
  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  const d = L.foot.querySelector('[data-del]');
  if (d) d.addEventListener('click', async () => {
    if (!(await confirmIn(L.foot, `Delete ${user.name}? They will no longer be able to sign in.`))) return;
    try { await del(`/api/admin/users/${encodeURIComponent(user.id)}`); toast('User deleted.'); initial = snap(); L.close(); onDone(); }
    catch (e) { toastError(e); }
  });
}

export function renderAccount(root) {
  const u = state.user || {};
  const ids = { c: uid('c'), n: uid('n'), r: uid('r') };
  root.innerHTML = `<div class="page-head"><div><h1>My account</h1><p class="sub">Signed in as ${esc(u.email)} (${esc(roleLabel(u.role))}).</p></div></div>
    ${state.mustChangePassword ? '<div class="alert alert-warn" role="status">You are using a temporary password. Please choose a new one now.</div>' : ''}
    <form class="card" style="max-width:520px" novalidate>
      <h2>Change password</h2>
      <div data-err></div>
      <div class="field"><label for="${ids.c}">Current password</label><input id="${ids.c}" name="current" type="password" autocomplete="current-password" required></div>
      <div class="field"><label for="${ids.n}">New password</label><input id="${ids.n}" name="next" type="password" autocomplete="new-password" minlength="8" required aria-describedby="${ids.n}-h"><div class="help" id="${ids.n}-h">At least 8 characters. A short phrase is easier to remember.</div></div>
      <div class="field"><label for="${ids.r}">Repeat new password</label><input id="${ids.r}" name="repeat" type="password" autocomplete="new-password" required></div>
      <button type="submit" class="btn btn-primary">Change password</button>
    </form>`;
  const form = root.querySelector('form'); const E = form.elements; const err = root.querySelector('[data-err]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.innerHTML = '';
    const problems = [];
    if (!E.current.value) problems.push('Enter your current password.');
    if (E.next.value.length < 8) problems.push('The new password must be at least 8 characters.');
    else if (E.next.value !== E.repeat.value) problems.push('The two new passwords do not match.');
    else if (E.next.value === E.current.value) problems.push('The new password must be different from the current one.');
    if (problems.length) { err.innerHTML = `<div class="alert alert-error" role="alert">${problems.map(esc).join('<br>')}</div>`; return; }
    busy(form.querySelector('button[type="submit"]'), async () => {
      try {
        await post('/api/admin/password', { current: E.current.value, next: E.next.value });
        form.reset();
        state.mustChangePassword = false;
        document.dispatchEvent(new CustomEvent('cms:user'));
        const w = root.querySelector('.alert-warn'); if (w) w.remove();
        err.innerHTML = '<div class="alert alert-info" role="status">Your password has been changed.</div>';
        toast('Password changed.');
      } catch (ex) { err.innerHTML = `<div class="alert alert-error" role="alert">${esc(ex.status === 401 || ex.status === 403 || ex.status === 400 ? ex.message : ex.message)}</div>`; }
    });
  });
}

export async function renderAudit(root) {
  const sid = uid('as');
  root.innerHTML = `<div class="page-head"><div><h1>Activity log</h1><p class="sub">The latest 200 changes made in the admin.</p></div></div>
    <div class="toolbar"><div class="field grow"><label for="${sid}">Filter</label><input id="${sid}" type="search" placeholder="User, action or item"></div></div>
    <p class="count-line" aria-live="polite"></p><div data-l>${loadingHTML()}</div>`;
  const listEl = root.querySelector('[data-l]'); const count = root.querySelector('.count-line'); const q = root.querySelector('input');
  let items = [];
  const str = (v) => (v && typeof v === 'object' ? (v.name || v.email || JSON.stringify(v)) : v ?? '');
  const draw = () => {
    const t = q.value.trim().toLowerCase();
    const list = t ? items.filter((x) => [str(x.user), x.action, str(x.target)].join(' ').toLowerCase().includes(t)) : items;
    count.textContent = `${list.length} ${list.length === 1 ? 'entry' : 'entries'}`;
    if (!list.length) { listEl.innerHTML = emptyHTML(items.length ? 'Nothing matches' : 'No activity yet'); return; }
    listEl.innerHTML = `<div class="table-wrap"><table class="data stack"><caption class="sr-only">Activity log</caption>
      <thead><tr><th scope="col">When</th><th scope="col">User</th><th scope="col">Action</th><th scope="col">Item</th></tr></thead>
      <tbody>${list.map((x) => `<tr><td data-label="When"><div class="cell nowrap" title="${esc(fmtDateTime(x.at))}">${esc(fmtDateTime(x.at))}</div></td>
        <td data-label="User"><div class="cell">${esc(str(x.user))}</div></td><td data-label="Action"><div class="cell">${esc(x.action)}</div></td>
        <td data-label="Item"><div class="cell" style="overflow-wrap:anywhere">${esc(str(x.target))}</div></td></tr>`).join('')}</tbody></table></div>`;
  };
  q.addEventListener('input', debounce(draw, 120));
  try { items = (await get('/api/admin/audit?limit=200')).items || []; draw(); } catch (e) { listEl.innerHTML = errorHTML(e); }
}
