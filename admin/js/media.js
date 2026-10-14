/* Media library: page view and reusable picker modal. */
import {
  esc, el, get, del, upload, checkFile, toast, toastError, fmtSize, fmtDateTime, mediaSrc,
  loadingHTML, emptyHTML, errorHTML, openLayer, confirmModal, MEDIA_ACCEPT, debounce,
} from './core.js';

const isImg = (it) => /^image\//.test(it.type || '') || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(it.name || it.url || '');

/* Upload area: drag-and-drop plus file input, with per-file progress. Calls onUploaded(item). */
function dropzone(onUploaded) {
  const z = el('div', { class: 'dropzone' });
  const inputId = 'up-' + Math.random().toString(36).slice(2, 8);
  z.innerHTML = `<p style="margin:0"><strong>Drag files here</strong> or
    <label for="${inputId}" class="link-btn" style="display:inline;font-weight:600;margin:0">choose files</label></p>
    <p class="help" style="margin:4px 0 0">JPG, PNG, WebP, GIF, AVIF or PDF, up to 8 MB each.</p>
    <input id="${inputId}" type="file" multiple accept="${esc(MEDIA_ACCEPT)}" class="sr-only">
    <div class="uploads" aria-live="polite"></div>`;
  const input = z.querySelector('input');
  const list = z.querySelector('.uploads');
  const label = z.querySelector('label');
  label.tabIndex = 0;
  label.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  const handle = async (files) => {
    for (const file of files) {
      const bad = checkFile(file);
      if (bad) { toast(bad, 'err'); continue; }
      const row = el('div');
      row.innerHTML = `<div>${esc(file.name)} <span class="muted" data-pct>0%</span></div><div class="progress" role="progressbar" aria-label="Uploading ${esc(file.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>`;
      list.appendChild(row);
      const bar = row.querySelector('.progress'); const pct = row.querySelector('[data-pct]');
      try {
        const r = await upload(file, (p) => {
          const n = Math.round(p * 100);
          bar.firstElementChild.style.width = n + '%'; bar.setAttribute('aria-valuenow', n); pct.textContent = n + '%';
        });
        pct.textContent = 'Uploaded';
        setTimeout(() => row.remove(), 1500);
        if (onUploaded) onUploaded(r.item);
      } catch (e) {
        pct.textContent = 'Failed: ' + e.message;
        toastError(e);
        setTimeout(() => row.remove(), 6000);
      }
    }
  };
  input.addEventListener('change', () => { handle(Array.from(input.files)); input.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => z.addEventListener(t, (e) => { e.preventDefault(); z.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => z.addEventListener(t, (e) => { e.preventDefault(); if (t === 'dragleave' && z.contains(e.relatedTarget)) return; z.classList.remove('over'); }));
  z.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) handle(Array.from(e.dataTransfer.files)); });
  return z;
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const t = el('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } finally { t.remove(); }
  }
  toast('Link copied.');
}

function cardHTML(it, pick) {
  const dims = it.width && it.height ? ` · ${esc(it.width)}×${esc(it.height)}` : '';
  const pv = isImg(it)
    ? `<img src="${esc(mediaSrc(it.url))}" alt="" loading="lazy">`
    : `<span>${esc((String(it.name).split('.').pop() || 'file').toUpperCase())}</span>`;
  if (pick) {
    return `<button type="button" class="media-card pick" data-url="${esc(it.url)}" aria-label="Use ${esc(it.name)}">
      <span class="pv">${pv}</span><span class="info"><span class="nm">${esc(it.name)}</span>${esc(fmtSize(it.size))}${dims}</span></button>`;
  }
  return `<div class="media-card">
    <a class="pv" href="${esc(mediaSrc(it.url))}" target="_blank" rel="noopener" aria-label="Open ${esc(it.name)} in a new tab">${pv}</a>
    <div class="info"><span class="nm">${esc(it.name)}</span>${esc(fmtSize(it.size))}${dims}<br>${esc(fmtDateTime(it.uploadedAt))}</div>
    <div class="acts">
      <button type="button" class="btn btn-sm" data-copy="${esc(it.url)}">Copy link</button>
      <button type="button" class="btn btn-sm btn-danger" data-del="${esc(it.name)}">Delete</button>
    </div></div>`;
}

/* Shared browser used by page and picker. */
function browser(container, { pick = false, onPick, imagesOnly = false } = {}) {
  let items = [];
  let query = '';
  container.innerHTML = '';
  const zone = dropzone((item) => {
    if (item) { items = [item, ...items.filter((i) => i.name !== item.name)]; draw(); toast(`${item.name} uploaded.`); if (pick && onPick && isImg(item)) { /* keep picker open; user picks explicitly */ } }
  });
  const searchId = 'ms-' + Math.random().toString(36).slice(2, 8);
  const bar = el('div', { class: 'toolbar' });
  bar.innerHTML = `<div class="field grow"><label for="${searchId}">Search files</label><input id="${searchId}" type="search" placeholder="File name"></div>`;
  const count = el('p', { class: 'count-line', 'aria-live': 'polite' });
  const grid = el('div');
  container.append(zone, bar, count, grid);
  bar.querySelector('input').addEventListener('input', debounce((e) => { query = e.target.value.trim().toLowerCase(); draw(); }, 150));

  const draw = () => {
    let list = imagesOnly ? items.filter(isImg) : items;
    if (query) list = list.filter((i) => String(i.name).toLowerCase().includes(query));
    count.textContent = `${list.length} ${list.length === 1 ? 'file' : 'files'}`;
    if (!list.length) { grid.innerHTML = emptyHTML(items.length ? 'No files match your search' : 'No files yet', items.length ? '' : 'Upload a file to get started.'); return; }
    grid.innerHTML = `<div class="media-grid">${list.map((it) => cardHTML(it, pick)).join('')}</div>`;
  };
  grid.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-url]');
    if (pick && p) { onPick(p.getAttribute('data-url')); return; }
    const c = e.target.closest('[data-copy]');
    if (c) { copy(c.getAttribute('data-copy')); return; }
    const d = e.target.closest('[data-del]');
    if (d) {
      const name = d.getAttribute('data-del');
      if (!(await confirmModal(`Delete ${name}? Pages that use this file will show a broken image.`, 'Delete file'))) return;
      try {
        await del(`/api/admin/media/${encodeURIComponent(name)}`);
        items = items.filter((i) => i.name !== name); draw(); toast('File deleted.');
      } catch (err) { toastError(err); }
    }
  });
  grid.innerHTML = loadingHTML('Loading files');
  get('/api/admin/media').then((d) => { items = d.items || []; draw(); }).catch((e) => { grid.innerHTML = errorHTML(e); });
}

export function renderMedia(root) {
  root.innerHTML = `<div class="page-head"><div><h1>Media library</h1><p class="sub">Images and PDFs uploaded for the website.</p></div></div><div data-b></div>`;
  browser(root.querySelector('[data-b]'));
}

/* Picker modal: resolves the chosen URL, or null. */
export function openMediaPicker({ imagesOnly = true } = {}) {
  return new Promise((resolve) => {
    let picked = null;
    const L = openLayer({ title: 'Choose an image', kind: 'modal', onClose: () => resolve(picked) });
    browser(L.body, { pick: true, imagesOnly, onPick: (url) => { picked = url; L.close(); } });
  });
}
