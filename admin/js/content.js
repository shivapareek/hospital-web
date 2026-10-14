/* Content collections, page text, sections and settings. */
import {
  esc, el, get, post, put, del, state, toast, toastError, mediaSrc, loadingHTML, emptyHTML, errorHTML,
  openLayer, confirmIn, busy, debounce, icon, uid, setPageGuard,
} from './core.js';
import { buildForm, invalidateOptions, imageControl } from './forms.js';

export async function loadSchema(force) {
  if (state.schema && !force) return state.schema;
  state.schema = await get('/api/admin/schema');
  return state.schema;
}

const singular = (label) => {
  const s = String(label || 'item');
  if (/ies$/i.test(s)) return s.replace(/ies$/i, 'y');
  if (/(ch|sh|x|ss)es$/i.test(s)) return s.replace(/es$/i, '');
  if (/s$/i.test(s) && !/ss$/i.test(s)) return s.slice(0, -1);
  return s;
};
const lower1 = (s) => String(s).charAt(0).toLowerCase() + String(s).slice(1);
const textOf = (v) => (v === null || v === undefined ? '' : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v));

/* ---------- Content collections ---------- */
export async function renderContent(root, params) {
  root.innerHTML = loadingHTML();
  let schema;
  try { schema = await loadSchema(); } catch (e) { root.innerHTML = errorHTML(e); return; }
  const cols = schema.collections || {};
  const names = Object.keys(cols);
  if (!names.length) { root.innerHTML = emptyHTML('No content types are set up'); return; }
  const col = names.includes(params.col) ? params.col : names[0];
  const def = cols[col];
  const fields = (def.fields || []).filter((f) => f.name !== 'id');
  const hasHiddenField = fields.some((f) => f.name === 'hidden');
  const formFields = hasHiddenField ? fields : [...fields, { name: 'hidden', label: 'Hide on the website', type: 'boolean', help: 'Hidden items stay here but do not appear on the site.' }];
  const titleF = def.titleField || (fields[0] && fields[0].name) || 'name';
  const subF = def.subtitleField; const imgF = def.imageField;
  const one = singular(def.label || col);
  const sid = uid('srch');

  root.innerHTML = `
    <div class="page-head"><div><h1>${esc(def.label || col)}</h1><p class="sub">Edit what the website shows. Drag or use the arrows to change the order.</p></div>
      <div class="btn-row"><button type="button" class="btn btn-primary" data-add>${icon('plus')} Add ${esc(lower1(one))}</button></div></div>
    <nav class="tabs" aria-label="Content types">${names.map((n) => `<a href="#/content/${esc(n)}"${n === col ? ' aria-current="page"' : ''}>${esc(cols[n].label || n)}</a>`).join('')}</nav>
    <div class="toolbar"><div class="field grow"><label for="${sid}">Search ${esc(lower1(def.label || col))}</label><input id="${sid}" type="search"></div></div>
    <p class="count-line" aria-live="polite"></p>
    <div data-list>${loadingHTML()}</div>
    <p class="sr-only" aria-live="assertive" data-announce></p>`;

  const listEl = root.querySelector('[data-list]');
  const countEl = root.querySelector('.count-line');
  const announce = root.querySelector('[data-announce]');
  const search = root.querySelector(`#${sid}`);
  let items = [];
  let q = '';

  const thumb = (it) => {
    const u = imgF && it[imgF];
    if (u && typeof u === 'string') return `<span class="thumb"><img src="${esc(mediaSrc(u))}" alt="" loading="lazy" onerror="this.remove()"></span>`;
    const t = textOf(it[titleF]).replace(/^(dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '');
    return `<span class="thumb" aria-hidden="true">${esc(t.split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase() || '?')}</span>`;
  };
  const visible = () => (q ? items.filter((it) => (textOf(it[titleF]) + ' ' + textOf(subF ? it[subF] : '')).toLowerCase().includes(q)) : items);

  const draw = () => {
    const list = visible();
    countEl.textContent = `${items.length} ${items.length === 1 ? lower1(one) : lower1(def.label || col)}${q ? `, ${list.length} shown` : ''}${q ? ' (reordering is off while searching)' : ''}`;
    if (!items.length) { listEl.innerHTML = emptyHTML(`No ${lower1(def.label || col)} yet`, `Use "Add ${lower1(one)}" to create the first one.`); return; }
    if (!list.length) { listEl.innerHTML = emptyHTML('Nothing matches your search'); return; }
    listEl.innerHTML = `<ul class="items">${list.map((it) => {
      const i = items.indexOf(it);
      const title = textOf(it[titleF]) || '(untitled)';
      return `<li data-id="${esc(it.id)}" class="${it.hidden ? 'is-hidden' : ''}">
        ${q ? '' : `<span class="handle" draggable="true" title="Drag to reorder" aria-hidden="true">${icon('grip')}</span>`}
        ${thumb(it)}
        <div class="body"><button type="button" class="title-btn" data-edit><span class="title">${esc(title)}</span></button>
          <span class="subtitle">${it.hidden ? '<span class="pill pill-hidden">Hidden</span> ' : ''}${esc(textOf(subF ? it[subF] : ''))}</span></div>
        <div class="acts">
          <label class="switch"><input type="checkbox" data-vis ${it.hidden ? '' : 'checked'}> Visible<span class="sr-only"> on site: ${esc(title)}</span></label>
          ${q ? '' : `<button type="button" class="btn btn-ghost btn-icon" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(title)} up">${icon('up')}</button>
          <button type="button" class="btn btn-ghost btn-icon" data-move="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(title)} down">${icon('down')}</button>`}
          <button type="button" class="btn btn-sm" data-edit aria-label="Edit ${esc(title)}">Edit</button>
        </div></li>`;
    }).join('')}</ul>`;
  };

  const load = async () => {
    try { items = (await get(`/api/admin/content/${encodeURIComponent(col)}`)).items || []; draw(); }
    catch (e) { listEl.innerHTML = errorHTML(e); }
  };
  const saveOrder = async (focusId, dir) => {
    draw();
    if (focusId) {
      const b = listEl.querySelector(`li[data-id="${CSS.escape(focusId)}"] [data-move="${dir}"]`) || listEl.querySelector(`li[data-id="${CSS.escape(focusId)}"] [data-edit]`);
      if (b && !b.disabled) b.focus(); else { const e = listEl.querySelector(`li[data-id="${CSS.escape(focusId)}"] .title-btn`); if (e) e.focus(); }
    }
    try {
      await post(`/api/admin/content/${encodeURIComponent(col)}/reorder`, { ids: items.map((i) => i.id) });
      invalidateOptions(col);
      toast('Order saved.');
    } catch (e) { toastError(e); load(); }
  };
  const byId = (id) => items.find((x) => String(x.id) === String(id));

  listEl.addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const it = byId(li.dataset.id);
    if (e.target.closest('[data-edit]')) { openEditor(it); return; }
    const mv = e.target.closest('[data-move]');
    if (mv) {
      const i = items.indexOf(it); const j = i + Number(mv.dataset.move);
      if (j < 0 || j >= items.length) return;
      items.splice(i, 1); items.splice(j, 0, it);
      announce.textContent = `${textOf(it[titleF])} moved to position ${j + 1} of ${items.length}.`;
      saveOrder(it.id, mv.dataset.move);
    }
  });
  listEl.addEventListener('change', async (e) => {
    const cb = e.target.closest('[data-vis]'); if (!cb) return;
    const li = cb.closest('li'); const it = byId(li.dataset.id);
    const hidden = !cb.checked;
    cb.disabled = true;
    try {
      const r = await put(`/api/admin/content/${encodeURIComponent(col)}/${encodeURIComponent(it.id)}`, { ...it, hidden });
      Object.assign(it, (r && r.item) || { hidden });
      invalidateOptions(col);
      toast(hidden ? `${textOf(it[titleF])} is now hidden on the website.` : `${textOf(it[titleF])} is now visible on the website.`);
      draw();
      const again = listEl.querySelector(`li[data-id="${CSS.escape(String(it.id))}"] [data-vis]`); if (again) again.focus();
    } catch (err) { cb.checked = !cb.checked; cb.disabled = false; toastError(err); }
  });

  // Drag and drop reorder (mouse). Keyboard users have the arrow buttons.
  let dragId = null;
  listEl.addEventListener('dragstart', (e) => {
    const h = e.target.closest('.handle'); if (!h) return;
    const li = h.closest('li'); dragId = li.dataset.id; li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.setDragImage(li, 20, 20); } catch { /* ignore */ }
  });
  const clearMarks = () => listEl.querySelectorAll('.drop-before, .drop-after, .dragging').forEach((n) => n.classList.remove('drop-before', 'drop-after', 'dragging'));
  listEl.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const li = e.target.closest('li[data-id]'); if (!li) return;
    e.preventDefault();
    const r = li.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2;
    listEl.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
    if (li.dataset.id !== dragId) li.classList.add(after ? 'drop-after' : 'drop-before');
  });
  listEl.addEventListener('drop', (e) => {
    if (!dragId) return;
    e.preventDefault();
    const li = e.target.closest('li[data-id]');
    const id = dragId; dragId = null; clearMarks();
    if (!li || li.dataset.id === id) return;
    const r = li.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2;
    const it = byId(id); items.splice(items.indexOf(it), 1);
    let j = items.indexOf(byId(li.dataset.id)); if (after) j++;
    items.splice(j, 0, it);
    saveOrder();
  });
  listEl.addEventListener('dragend', () => { dragId = null; clearMarks(); });

  search.addEventListener('input', debounce(() => { q = search.value.trim().toLowerCase(); draw(); }, 120));
  root.querySelector('[data-add]').addEventListener('click', () => openEditor(null));

  function openEditor(item) {
    const isNew = !item;
    const L = openLayer({ title: isNew ? `Add ${lower1(one)}` : `Edit ${textOf(item[titleF]) || lower1(one)}`, wide: true, isDirty: () => form.isDirty() });
    const formEl = el('form', { novalidate: true });
    L.body.appendChild(formEl);
    const start = isNew ? { hidden: false } : item;
    const form = buildForm(formEl, formFields, start);
    L.foot.hidden = false;
    L.foot.innerHTML = `<button type="submit" class="btn btn-primary" data-save>${isNew ? 'Add' : 'Save changes'}</button><button type="button" class="btn" data-cancel>Cancel</button><span class="spacer"></span>${isNew ? '' : '<button type="button" class="btn btn-danger" data-del>Delete</button>'}`;
    L.foot.querySelector('[data-cancel]').addEventListener('click', () => L.requestClose());
    const save = () => busy(L.foot.querySelector('[data-save]'), async () => {
      const { values, errors } = form.getValues();
      if (errors.length) { toast(errors[0].message, 'err'); form.focusFirstError(); return; }
      try {
        if (isNew) {
          const r = await post(`/api/admin/content/${encodeURIComponent(col)}`, values);
          if (r && r.item) items.push(r.item); else await load();
          toast(`${one} added.`);
        } else {
          const body = { ...item, ...values, id: item.id };
          const r = await put(`/api/admin/content/${encodeURIComponent(col)}/${encodeURIComponent(item.id)}`, body);
          Object.assign(item, (r && r.item) || body);
          toast('Changes saved.');
        }
        invalidateOptions(col);
        form.markClean();
        L.close();
        draw();
      } catch (e) { toastError(e); }
    });
    L.foot.querySelector('[data-save]').addEventListener('click', save);
    formEl.addEventListener('submit', (e) => { e.preventDefault(); save(); });
    const delBtn = L.foot.querySelector('[data-del]');
    if (delBtn) delBtn.addEventListener('click', async () => {
      if (!(await confirmIn(L.foot, `Delete ${textOf(item[titleF]) || 'this item'}? This cannot be undone. To remove it from the website for now, hide it instead.`))) return;
      try {
        await del(`/api/admin/content/${encodeURIComponent(col)}/${encodeURIComponent(item.id)}`);
        items = items.filter((x) => x !== item);
        invalidateOptions(col);
        toast(`${one} deleted.`);
        L.close(); draw();
      } catch (e) { toastError(e); }
    });
  }

  load();
}

/* ---------- Page text and images ---------- */
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const normImg = (v) => ({ src: (v && v.src) || '', alt: (v && v.alt) || '' });

export async function renderTexts(root, params) {
  // language of the text being edited: English (the home page at /) or Hindi (the home page at /hi/)
  const lang = state.textsLang === 'hi' ? 'hi' : 'en';
  const hi = lang === 'hi';
  root.innerHTML = loadingHTML();
  let data;
  try { data = await get(`/api/admin/texts${hi ? '?lang=hi' : ''}`); } catch (e) { root.innerHTML = errorHTML(e); return; }
  const groups = data.groups || [];
  const sid = uid('ts');
  const langSwitch = `<div class="seg" role="group" aria-label="Language of the page text">
      <button type="button" class="seg__btn" data-lang="en" aria-pressed="${!hi}">English</button>
      <button type="button" class="seg__btn" data-lang="hi" aria-pressed="${hi}"><span lang="hi">हिन्दी</span></button></div>`;
  root.innerHTML = `<div class="page-head"><div><h1>Page text</h1><p class="sub">${hi
    ? 'Hindi text for the home page at <a href="/hi/" target="_blank" rel="noopener">/hi/</a>. The default is the built-in Hindi translation; a field without one shows the English. Changes go live when you save.'
    : 'Every heading, paragraph and image on the home page. Changes go live when you save.'}</p></div>${langSwitch}</div>
    <div class="toolbar"><div class="field grow"><label for="${sid}">Find a field</label><input id="${sid}" type="search" placeholder="Search by words on the page"></div>
      <div class="btn-row"><button type="button" class="btn btn-sm" data-expand>Open all</button><button type="button" class="btn btn-sm" data-collapse>Close all</button></div></div>
    <p class="count-line" aria-live="polite" data-found></p>
    <div data-groups></div>
    <div class="sticky-save"><span class="msg" aria-live="polite" data-msg>No changes.</span><button type="button" class="btn" data-undo disabled>Undo all</button><button type="button" class="btn btn-primary" data-save disabled>Save changes</button></div>`;
  if (!groups.length) { root.querySelector('[data-groups]').innerHTML = emptyHTML('No editable text found'); return; }
  const gEl = root.querySelector('[data-groups]');
  const fieldsState = []; // {f, wrap, get(), set(v), original, groupEl}
  const msg = root.querySelector('[data-msg]');
  const saveBtn = root.querySelector('[data-save]');
  const undoBtn = root.querySelector('[data-undo]');

  const desired = (s) => { const cur = s.get(); return same(cur, s.def) ? null : cur; };
  const isChanged = (s) => !same(desired(s), s.original);
  const refresh = () => {
    let n = 0;
    for (const s of fieldsState) { const c = isChanged(s); s.wrap.classList.toggle('changed', c); if (c) n++; s.resetBtn.hidden = same(s.get(), s.def); }
    msg.textContent = n ? `${n} unsaved ${n === 1 ? 'change' : 'changes'}.` : 'No changes.';
    saveBtn.disabled = !n; undoBtn.disabled = !n;
  };

  groups.forEach((g, gi) => {
    const d = el('details', { class: 'acc' });
    if (gi === 0) d.open = true;
    d.innerHTML = `<summary>${esc(g.label || g.id)}<span class="n">${(g.fields || []).length} ${(g.fields || []).length === 1 ? 'field' : 'fields'}</span></summary><div class="inner"></div>`;
    const inner = d.querySelector('.inner');
    for (const f of g.fields || []) {
      const s = textField(f, refresh, { lang });
      s.groupEl = d;
      fieldsState.push(s);
      inner.appendChild(s.wrap);
    }
    gEl.appendChild(d);
  });
  refresh();

  const found = root.querySelector('[data-found]');
  root.querySelector(`#${sid}`).addEventListener('input', debounce((e) => {
    const q = e.target.value.trim().toLowerCase();
    let hits = 0;
    for (const s of fieldsState) {
      const hay = [s.f.label, s.f.key, textOf(s.def), textOf(s.get()), textOf(s.f.english)].join(' ').toLowerCase();
      const m = !q || hay.includes(q);
      s.wrap.hidden = !m; if (m) hits++;
    }
    for (const d of gEl.querySelectorAll('details')) {
      const any = Array.from(d.querySelectorAll('.tfield')).some((w) => !w.hidden);
      d.hidden = !any;
      if (q && any) d.open = true;
    }
    found.textContent = q ? `${hits} ${hits === 1 ? 'field matches' : 'fields match'}.` : '';
  }, 150));
  root.querySelector('[data-expand]').addEventListener('click', () => gEl.querySelectorAll('details').forEach((d) => { d.open = true; }));
  root.querySelector('[data-collapse]').addEventListener('click', () => gEl.querySelectorAll('details').forEach((d) => { d.open = false; }));
  undoBtn.addEventListener('click', () => { for (const s of fieldsState) s.set(s.original === null ? s.def : s.original); refresh(); });
  root.querySelectorAll('.seg__btn').forEach((b) => b.addEventListener('click', async () => {
    const to = b.dataset.lang;
    if (to === lang) return;
    if (fieldsState.some(isChanged) && !(await confirmIn(root.querySelector('.page-head'), 'Switch language and discard the unsaved changes?'))) return;
    state.textsLang = to;
    setPageGuard(null);
    renderTexts(root, params);
  }));
  saveBtn.addEventListener('click', () => busy(saveBtn, async () => {
    const values = {};
    for (const s of fieldsState) if (isChanged(s)) values[s.f.key] = desired(s);
    if (!Object.keys(values).length) return;
    // Hindi images: keep following the English image unless a different one was chosen
    if (hi) for (const s of fieldsState) if (s.f.type === 'image' && values[s.f.key] && values[s.f.key].src === s.def.src) values[s.f.key] = { ...values[s.f.key], src: '' };
    try {
      await put(`/api/admin/texts${hi ? '?lang=hi' : ''}`, { values });
      for (const s of fieldsState) if (Object.prototype.hasOwnProperty.call(values, s.f.key)) s.original = values[s.f.key];
      toast(`Saved ${Object.keys(values).length} ${Object.keys(values).length === 1 ? 'change' : 'changes'}.`);
    } catch (e) { toastError(e); }
  }).then(refresh));
  setPageGuard(() => fieldsState.some(isChanged));
}

function textField(f, onChange, { lang = 'en' } = {}) {
  const id = uid('tx');
  const hi = lang === 'hi';
  const wrap = el('div', { class: 'tfield' });
  const isImg = f.type === 'image';
  const def = isImg ? normImg(f.default) : (f.default ?? '');
  // a Hindi image override with an empty src follows the English image
  const original = f.value === null || f.value === undefined ? null : (isImg ? normImg(hi && !f.value.src ? { ...f.value, src: def.src } : f.value) : f.value);
  const start = original === null ? def : original;
  let get, set;
  const labelTxt = `<label for="${id}">${esc(f.label || f.key)}<span class="key">${esc(f.key)}</span></label>`;
  if (isImg) {
    wrap.innerHTML = labelTxt;
    const ic = imageControl({ name: f.key, label: f.label }, id, start.src, onChange, { showLabel: false });
    wrap.appendChild(ic.node);
    const altId = uid('alt');
    const altW = el('div', { class: 'field', style: 'margin:10px 0 0' });
    altW.innerHTML = `<label for="${altId}">Alt text (describes the image for screen readers)</label><input id="${altId}" type="text">`;
    const alt = altW.querySelector('input'); alt.value = start.alt; alt.addEventListener('input', onChange);
    wrap.appendChild(altW);
    get = () => ({ src: ic.get(), alt: alt.value });
    set = (v) => { const n = normImg(v); ic.set(n.src); alt.value = n.alt; };
  } else {
    const long = f.type === 'html' || String(def).length > 80 || /\n/.test(String(def));
    wrap.innerHTML = `${labelTxt}${long ? `<textarea id="${id}" rows="${Math.min(8, Math.max(3, Math.ceil(String(def).length / 70)))}"${f.type === 'html' ? ` class="mono" aria-describedby="${id}-h"` : ''}></textarea>` : `<input id="${id}" type="text">`}
      ${f.type === 'html' ? `<div class="help" id="${id}-h">Formatting allowed: links (&lt;a href&gt;), &lt;em&gt;, &lt;strong&gt;, &lt;b&gt;, &lt;i&gt;, &lt;span&gt;, &lt;br&gt;, &lt;small&gt;, &lt;abbr&gt;, &lt;sup&gt;. Other tags are removed.</div>` : ''}`;
    const c = wrap.querySelector('input, textarea'); c.value = start;
    if (hi) c.setAttribute('lang', 'hi');
    c.addEventListener('input', onChange);
    get = () => c.value;
    set = (v) => { c.value = v ?? ''; };
  }
  const defBox = el('div', { class: 'def' });
  const defLabel = hi ? (f.shipped ? 'Built-in Hindi' : 'No built-in Hindi, so the English is shown') : 'Default';
  defBox.innerHTML = isImg
    ? `${defLabel}: <code>${esc(def.src)}</code>${def.alt ? `, alt “<span${hi ? ' lang="hi"' : ''}>${esc(def.alt)}</span>”` : ''} <button type="button" class="link-btn" data-reset>Reset to default</button>`
    : `${defLabel}: <code${hi ? ' lang="hi"' : ''}>${esc(def)}</code> <button type="button" class="link-btn" data-reset>Reset to default</button>`;
  wrap.appendChild(defBox);
  if (hi) {
    // the English the Hindi page would otherwise show, and a hint when it was edited after the translation was made
    const en = el('div', { class: 'def def--en' });
    const english = isImg ? normImg(f.english) : f.english;
    en.innerHTML = `English now: <code>${esc(isImg ? (english.alt || english.src) : english)}</code>${f.englishEdited ? ' <span class="pill pill-confirmed">English edited: check the Hindi</span>' : ''}${f.stale ? ' <span class="pill pill-confirmed">Built-in Hindi is out of date</span>' : ''}`;
    wrap.appendChild(en);
  }
  const resetBtn = defBox.querySelector('[data-reset]');
  resetBtn.setAttribute('aria-label', `Reset ${f.label || f.key} to default`);
  resetBtn.addEventListener('click', () => { set(def); onChange(); });
  return { f, wrap, get, set, def, original, resetBtn };
}

/* ---------- Sections ---------- */
export async function renderSections(root) {
  root.innerHTML = loadingHTML();
  let items;
  try { items = (await get('/api/admin/sections')).items || []; } catch (e) { root.innerHTML = errorHTML(e); return; }
  const orig = items.map((s) => ({ id: s.id, visible: s.visible !== false }));
  root.innerHTML = `<div class="page-head"><div><h1>Sections</h1><p class="sub">Choose which sections appear on the home page. They are listed in page order.</p></div></div>
    ${items.length ? `<ul class="items">${items.map((s, i) => `<li><div class="body"><span class="title" id="sec-${i}">${esc(s.label || s.id)}</span><span class="subtitle mono">#${esc(s.id)}</span></div>
      <div class="acts"><label class="switch"><input type="checkbox" data-i="${i}" ${s.visible !== false ? 'checked' : ''} aria-describedby="sec-${i}"> Visible</label></div></li>`).join('')}</ul>` : emptyHTML('No sections found')}
    <div class="sticky-save"><span class="msg" data-msg aria-live="polite">No changes.</span><button type="button" class="btn btn-primary" data-save disabled>Save</button></div>`;
  const boxes = Array.from(root.querySelectorAll('input[data-i]'));
  const cur = () => items.map((s, i) => ({ id: s.id, visible: boxes[i] ? boxes[i].checked : s.visible !== false }));
  const dirty = () => !same(cur(), orig);
  const msg = root.querySelector('[data-msg]'); const save = root.querySelector('[data-save]');
  const refresh = () => {
    const n = cur().filter((c, i) => c.visible !== orig[i].visible).length;
    const hiddenN = cur().filter((c) => !c.visible).length;
    msg.textContent = (n ? `${n} unsaved ${n === 1 ? 'change' : 'changes'}. ` : 'No changes. ') + `${hiddenN} hidden.`;
    save.disabled = !n;
    boxes.forEach((b) => b.closest('li').classList.toggle('is-hidden', !b.checked));
  };
  root.addEventListener('change', refresh);
  refresh();
  save.addEventListener('click', () => busy(save, async () => {
    try {
      const body = cur();
      await put('/api/admin/sections', { items: body });
      body.forEach((b, i) => { orig[i].visible = b.visible; });
      toast('Sections saved.');
    } catch (e) { toastError(e); }
  }).then(refresh));
  setPageGuard(dirty);
}

/* ---------- Settings ---------- */
export async function renderSettings(root) {
  root.innerHTML = loadingHTML();
  let data;
  try { data = await get('/api/admin/settings'); } catch (e) { root.innerHTML = errorHTML(e); return; }
  const fields = [];
  for (const g of data.schema || []) for (const f of g.fields || []) fields.push({ ...f, group: f.group || g.group });
  root.innerHTML = `<div class="page-head"><div><h1>Settings</h1><p class="sub">Hospital details and site-wide options.</p></div></div>
    <form class="card" novalidate data-f></form>
    <div class="sticky-save"><span class="msg" data-msg aria-live="polite">No changes.</span><button type="button" class="btn btn-primary" data-save>Save settings</button></div>`;
  const formEl = root.querySelector('[data-f]');
  if (!fields.length) { formEl.innerHTML = emptyHTML('No settings available'); return; }
  const msg = root.querySelector('[data-msg]');
  const values = data.values || {};
  const form = buildForm(formEl, fields, values, { onChange: () => { msg.textContent = form.isDirty() ? 'Unsaved changes.' : 'No changes.'; } });
  const save = root.querySelector('[data-save]');
  const doSave = () => busy(save, async () => {
    const { values: v, errors } = form.getValues();
    if (errors.length) { toast(errors[0].message, 'err'); form.focusFirstError(); return; }
    try {
      await put('/api/admin/settings', { values: { ...values, ...v } });
      Object.assign(values, v);
      form.markClean(); msg.textContent = 'Saved.';
      toast('Settings saved.');
    } catch (e) { toastError(e); }
  });
  save.addEventListener('click', doSave);
  formEl.addEventListener('submit', (e) => { e.preventDefault(); doSave(); });
  setPageGuard(() => form.isDirty());
}
