/* Generic form builder driven by the field schema from /api/admin/schema and /api/admin/settings. */
import { esc, el, uid, get, mediaSrc, toastError, upload, checkFile, toast, MEDIA_ACCEPT } from './core.js';
import { openMediaPicker } from './media.js';

/* Cache of content lists used by select fields with optionsFrom. */
const optCache = new Map();
export function invalidateOptions(col) { if (col) optCache.delete(col); else optCache.clear(); }
export async function loadCollection(col) {
  if (!optCache.has(col)) {
    optCache.set(col, get(`/api/admin/content/${encodeURIComponent(col)}`).then((d) => d.items || []).catch((e) => { optCache.delete(col); throw e; }));
  }
  return optCache.get(col);
}

const isImageUrl = (u) => /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(String(u || '')) || /^data:image\//.test(String(u || ''));

/**
 * Build a form inside `root`.
 * fields: [{name,label,type,required,help,options,optionsFrom,group,advanced,placeholder}]
 * values: object
 * Returns { getValues():{values, errors:[{name,message}]}, isDirty(), markClean(), focusFirstError() }
 */
export function buildForm(root, fields, values = {}, { onChange } = {}) {
  root.innerHTML = '';
  const controls = [];
  const changed = () => { if (onChange) onChange(); };

  const main = fields.filter((f) => !f.advanced);
  const adv = fields.filter((f) => f.advanced);

  const renderGroupList = (list, container) => {
    let currentGroup = null;
    let groupBox = container;
    let first = true;
    for (const f of list) {
      const g = f.group || '';
      if (g !== currentGroup || first) {
        currentGroup = g; first = false;
        if (g) {
          groupBox = el('div', { class: 'form-group' });
          groupBox.innerHTML = `<h3>${esc(g)}</h3>`;
          container.appendChild(groupBox);
        } else {
          groupBox = el('div', { class: 'form-group' });
          container.appendChild(groupBox);
        }
      }
      const c = renderField(f, values[f.name], changed);
      controls.push(c);
      groupBox.appendChild(c.wrap);
    }
  };
  renderGroupList(main, root);
  if (adv.length) {
    const d = el('details', { class: 'adv' });
    d.innerHTML = '<summary>Advanced</summary><div class="inner"></div>';
    root.appendChild(d);
    renderGroupList(adv, d.querySelector('.inner'));
  }

  const collect = () => {
    const out = {}; const errors = [];
    for (const c of controls) {
      c.wrap.classList.remove('invalid');
      const errEl = c.wrap.querySelector(':scope > .error-text'); if (errEl) errEl.remove();
      let v; let err = '';
      try { v = c.get(); } catch (e) { err = e.message; }
      if (!err && c.field.required) {
        const empty = v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length);
        if (empty) err = `${c.field.label || c.field.name} is required.`;
      }
      if (err) errors.push({ name: c.field.name, message: err, c });
      else out[c.field.name] = v;
    }
    return { values: out, errors };
  };
  const snapshot = () => { const r = []; for (const c of controls) { try { r.push(c.get()); } catch { r.push('\u0000invalid' + Math.random()); } } return JSON.stringify(r); };
  let initial = snapshot();

  return {
    getValues() {
      const r = collect();
      for (const e of r.errors) {
        e.c.wrap.classList.add('invalid');
        const m = el('div', { class: 'error-text', role: 'alert' }); m.textContent = e.message;
        e.c.wrap.appendChild(m);
      }
      return { values: r.values, errors: r.errors.map(({ name, message }) => ({ name, message })) };
    },
    isDirty() { return snapshot() !== initial; },
    markClean() { initial = snapshot(); },
    focusFirstError() {
      const w = root.querySelector('.field.invalid');
      if (!w) return;
      const det = w.closest('details'); if (det) det.open = true;
      const f = w.querySelector('input, textarea, select'); if (f) f.focus();
    },
  };
}

function labelHTML(f, id) {
  return `<label for="${id}">${esc(f.label || f.name)}${f.required ? '<span class="req" aria-hidden="true">*</span><span class="sr-only"> (required)</span>' : ''}</label>`;
}
function helpHTML(f, id) { return f.help ? `<div class="help" id="${id}-help">${esc(f.help)}</div>` : ''; }
const describedBy = (f, id) => (f.help ? ` aria-describedby="${id}-help"` : '');

export function renderField(f, value, onChange = () => {}) {
  const id = uid('fld');
  const wrap = el('div', { class: 'field', 'data-name': f.name });
  const type = f.type || 'text';
  const req = f.required ? ' required aria-required="true"' : '';
  const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
  let get;

  switch (type) {
    case 'textarea': {
      wrap.innerHTML = `${labelHTML(f, id)}<textarea id="${id}" rows="${f.rows || 4}"${req}${ph}${describedBy(f, id)}></textarea>${helpHTML(f, id)}`;
      const t = wrap.querySelector('textarea'); t.value = value ?? '';
      t.addEventListener('input', onChange);
      get = () => t.value;
      break;
    }
    case 'number': {
      wrap.innerHTML = `${labelHTML(f, id)}<input id="${id}" type="number" step="${esc(f.step ?? 'any')}"${f.min !== undefined ? ` min="${esc(f.min)}"` : ''}${f.max !== undefined ? ` max="${esc(f.max)}"` : ''} inputmode="decimal"${req}${ph}${describedBy(f, id)}>${helpHTML(f, id)}`;
      const i = wrap.querySelector('input'); i.value = value ?? '';
      i.addEventListener('input', onChange);
      get = () => {
        if (i.value.trim() === '') { if (i.validity.badInput) throw new Error(`${f.label || f.name} must be a number.`); return null; }
        const n = Number(i.value); if (!Number.isFinite(n)) throw new Error(`${f.label || f.name} must be a number.`);
        return n;
      };
      break;
    }
    case 'boolean': {
      wrap.innerHTML = `<label class="check" for="${id}"><input id="${id}" type="checkbox"${describedBy(f, id)}> ${esc(f.label || f.name)}</label>${helpHTML(f, id)}`;
      const i = wrap.querySelector('input'); i.checked = !!value;
      i.addEventListener('change', onChange);
      get = () => i.checked;
      break;
    }
    case 'select': {
      wrap.innerHTML = `${labelHTML(f, id)}<select id="${id}"${req}${describedBy(f, id)}><option value="">${f.optionsFrom ? 'Loading…' : '(none)'}</option></select>${helpHTML(f, id)}`;
      const s = wrap.querySelector('select');
      const fill = (opts) => {
        const cur = value ?? '';
        const has = opts.some((o) => String(o.value) === String(cur));
        s.innerHTML = `<option value="">${f.required ? 'Choose…' : '(none)'}</option>` +
          opts.map((o) => `<option value="${esc(o.value)}">${esc(o.label ?? o.value)}</option>`).join('') +
          (!has && cur !== '' ? `<option value="${esc(cur)}">${esc(cur)} (not in list)</option>` : '');
        s.value = String(cur);
      };
      if (f.optionsFrom) {
        s.disabled = true;
        loadCollection(f.optionsFrom).then((items) => {
          fill(items.map((it) => ({ value: it.name, label: it.name + (it.hidden ? ' (hidden)' : '') })).filter((o) => o.value));
        }).catch((e) => { fill([]); toastError(e); }).finally(() => { s.disabled = false; });
      } else {
        fill((f.options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o })));
      }
      s.addEventListener('change', onChange);
      const numeric = (f.options || []).length && (f.options || []).every((o) => typeof (o && typeof o === 'object' ? o.value : o) === 'number');
      get = () => (s.value === '' ? (f.required ? '' : null) : numeric ? Number(s.value) : s.value);
      break;
    }
    case 'tags': {
      wrap.innerHTML = `${labelHTML(f, id)}<div class="chips"><input id="${id}" type="text" autocomplete="off" aria-describedby="${id}-tip${f.help ? ` ${id}-help` : ''}"></div><div class="help" id="${id}-tip">Press Enter or comma to add. Backspace removes the last one.</div>${helpHTML(f, id)}`;
      const box = wrap.querySelector('.chips');
      const input = wrap.querySelector('input');
      let tags = Array.isArray(value) ? value.map(String) : (typeof value === 'string' && value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []);
      const draw = () => {
        box.querySelectorAll('.chip').forEach((c) => c.remove());
        tags.forEach((t, i) => {
          const c = el('span', { class: 'chip' });
          c.innerHTML = `<span>${esc(t)}</span><button type="button" aria-label="Remove ${esc(t)}">&times;</button>`;
          c.querySelector('button').addEventListener('click', () => { tags.splice(i, 1); draw(); onChange(); input.focus(); });
          box.insertBefore(c, input);
        });
      };
      const add = (txt) => {
        const parts = String(txt).split(',').map((s) => s.trim()).filter(Boolean);
        let added = false;
        for (const p of parts) if (!tags.includes(p)) { tags.push(p); added = true; }
        if (added) { draw(); onChange(); }
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input.value); input.value = ''; }
        else if (e.key === 'Backspace' && !input.value && tags.length) { tags.pop(); draw(); onChange(); }
      });
      input.addEventListener('blur', () => { if (input.value.trim()) { add(input.value); input.value = ''; } });
      input.addEventListener('paste', (e) => {
        const t = (e.clipboardData || window.clipboardData).getData('text');
        if (t && t.includes(',')) { e.preventDefault(); add(t); }
      });
      box.addEventListener('click', (e) => { if (e.target === box) input.focus(); });
      draw();
      get = () => { const pending = input.value.trim(); return pending ? [...tags, ...pending.split(',').map((s) => s.trim()).filter((s) => s && !tags.includes(s))] : [...tags]; };
      break;
    }
    case 'list': {
      wrap.innerHTML = `${labelHTML(f, id)}<textarea id="${id}" rows="${f.rows || 5}" aria-describedby="${id}-tip${f.help ? ` ${id}-help` : ''}"${req}></textarea><div class="help" id="${id}-tip">One item per line.</div>${helpHTML(f, id)}`;
      const t = wrap.querySelector('textarea');
      t.value = Array.isArray(value) ? value.join('\n') : (value ?? '');
      t.addEventListener('input', onChange);
      get = () => t.value.split('\n').map((s) => s.trim()).filter(Boolean);
      break;
    }
    case 'image': {
      const c = imageControl(f, id, value, onChange);
      wrap.appendChild(c.node);
      get = c.get;
      break;
    }
    case 'json': {
      wrap.innerHTML = `${labelHTML(f, id)}<textarea id="${id}" class="mono" rows="${f.rows || 8}" spellcheck="false" aria-describedby="${id}-status${f.help ? ` ${id}-help` : ''}"></textarea><div class="help" id="${id}-status" aria-live="polite"></div>${helpHTML(f, id)}`;
      const t = wrap.querySelector('textarea'); const st = wrap.querySelector(`#${id}-status`);
      t.value = value === undefined || value === null ? '' : JSON.stringify(value, null, 2);
      const check = () => {
        if (!t.value.trim()) { st.textContent = 'Empty (saved as nothing).'; st.className = 'help'; return; }
        try { JSON.parse(t.value); st.textContent = 'Valid JSON.'; st.className = 'help'; }
        catch (e) { st.textContent = 'Not valid JSON yet: ' + e.message; st.className = 'error-text'; }
      };
      t.addEventListener('input', () => { check(); onChange(); });
      check();
      get = () => {
        if (!t.value.trim()) return null;
        try { return JSON.parse(t.value); } catch (e) { throw new Error(`${f.label || f.name}: this is not valid JSON (${e.message}).`); }
      };
      break;
    }
    case 'color': {
      wrap.innerHTML = `${labelHTML(f, id)}<div class="color-row"><input type="color" aria-label="${esc(f.label || f.name)} picker"><input id="${id}" type="text" maxlength="9" placeholder="#0F5C4D"${describedBy(f, id)}></div>${helpHTML(f, id)}`;
      const [pick, txt] = wrap.querySelectorAll('input');
      txt.value = value ?? '';
      const sync = () => { if (/^#[0-9a-f]{6}$/i.test(txt.value)) pick.value = txt.value; };
      sync();
      pick.addEventListener('input', () => { txt.value = pick.value.toUpperCase(); onChange(); });
      txt.addEventListener('input', () => { sync(); onChange(); });
      get = () => {
        const v = txt.value.trim();
        if (v && !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) throw new Error(`${f.label || f.name} must be a colour like #0F5C4D.`);
        return v;
      };
      break;
    }
    default: {
      const itype = f.inputType || (type === 'email' ? 'email' : type === 'url' ? 'url' : 'text');
      wrap.innerHTML = `${labelHTML(f, id)}<input id="${id}" type="${esc(itype)}"${req}${ph}${describedBy(f, id)}>${helpHTML(f, id)}`;
      const i = wrap.querySelector('input'); i.value = value ?? '';
      i.addEventListener('input', onChange);
      get = () => i.value;
    }
  }
  return { field: f, wrap, get };
}

/* Image field: preview, URL input, choose from library, upload. */
export function imageControl(f, id, value, onChange = () => {}, { showLabel = true } = {}) {
  const node = el('div');
  node.innerHTML = `${showLabel ? labelHTML(f, id) : ''}
    <div class="image-field">
      <div class="thumb-lg" aria-hidden="true"></div>
      <div class="stack">
        <input id="${id}" type="text" placeholder="/uploads/photo.webp" aria-label="${esc((f.label || f.name) + ' URL')}"${describedBy(f, id)}>
        <div class="btn-row">
          <button type="button" class="btn btn-sm" data-pick>Choose from media</button>
          <label class="btn btn-sm" style="margin:0">Upload<input type="file" accept="${esc(MEDIA_ACCEPT)}" class="sr-only" data-file></label>
          <button type="button" class="link-btn small" data-clear>Remove</button>
        </div>
        <div class="help" data-status aria-live="polite"></div>
      </div>
    </div>${helpHTML(f, id)}`;
  const input = node.querySelector(`#${id}`);
  const thumb = node.querySelector('.thumb-lg');
  const status = node.querySelector('[data-status]');
  input.value = value ?? '';
  const preview = () => {
    const u = input.value.trim();
    if (!u) { thumb.innerHTML = 'No image'; return; }
    if (isImageUrl(u) || !/\.[a-z0-9]{2,5}$/i.test(u)) {
      thumb.innerHTML = '';
      const img = el('img', { alt: '' });
      img.src = mediaSrc(u);
      img.onerror = () => { thumb.textContent = 'No preview'; };
      thumb.appendChild(img);
    } else thumb.textContent = (u.split('.').pop() || 'File').toUpperCase();
  };
  preview();
  const set = (u) => { input.value = u; preview(); onChange(); };
  input.addEventListener('input', () => { preview(); onChange(); });
  node.querySelector('[data-clear]').addEventListener('click', () => set(''));
  node.querySelector('[data-pick]').addEventListener('click', async () => {
    const u = await openMediaPicker();
    if (u) set(u);
  });
  node.querySelector('[data-file]').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const bad = checkFile(file); if (bad) { toast(bad, 'err'); return; }
    status.textContent = 'Uploading… 0%';
    try {
      const r = await upload(file, (p) => { status.textContent = `Uploading… ${Math.round(p * 100)}%`; });
      status.textContent = 'Uploaded.';
      if (r.item && r.item.url) set(r.item.url);
    } catch (err) { status.textContent = ''; toastError(err); }
  });
  return { node, get: () => input.value.trim(), set };
}
