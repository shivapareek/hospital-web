/* =========================================================
   CareNova Hospitals – image sequences and plates (spec §9)
   ES module, loaded after data.js and main.js. No three.js here.

   - Light box: moves the technology figures into #lightbox at >= 1024 px,
     activates chapters at the viewport's middle line, runs the scan-line sweep.
   - Below 1024 px the chapters become an accordion (ch-imaging open).
   - MRI scrub (sprite first, then 512 px frames when idle) with a localizer line,
     CT rib-cage turntable (drag, range, one autoplay turn), both on 2D canvases.
   - Specimen cabinet stills, AI read lines, doctor count, retina slider, #seeSenior.

   Everything is an enhancement. Without this file the figures stay inline, the MRI
   and CT show their fallback stills, the cabinet keeps Neurology and the retina
   stays red-free.
   ========================================================= */

const doc = document;
const root = doc.documentElement;
const mqDesk = matchMedia("(min-width: 1024px)");
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");

const $ = (sel, el = doc) => el.querySelector(sel);
const $$ = (sel, el = doc) => Array.from(el.querySelectorAll(sel));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mod = (n, m) => ((n % m) + m) % m;
const pad2 = (n) => String(n).padStart(2, "0");
const isDesk = () => mqDesk.matches;
const isReduced = () => mqReduce.matches;
const scrollMode = () => (isReduced() ? "auto" : "smooth");
const onIdle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));
const emit = (type, detail) => doc.dispatchEvent(new CustomEvent(type, { detail }));
const warn = (what, e) => console.warn(`[plates] ${what}:`, e && e.message ? e.message : e);
const cssPx = (name, fallback) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || fallback;
const guard = (name, fn) => { try { return fn(); } catch (e) { warn(name, e); return null; } };
const listen = (mq, fn) => (mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn));

/* data.js globals (top-level const in a classic script: visible here through the global lexical scope) */
const DEPTS = typeof DEPARTMENTS !== "undefined" ? DEPARTMENTS : [];
const DOCS = typeof DOCTORS !== "undefined" ? DOCTORS : [];

const SPRITE = "assets/img/scan-brain-sprite.webp";          // 8 x 5 grid of 256 px tiles
const MRI_FRAME = (i) => `assets/img/scan-brain-frames/${pad2(i)}.webp`;
const CT_FRAME = (i) => `assets/img/ct-ribcage-3d/${pad2(i)}.webp`;
const MRI_COUNT = 40, MRI_REST = 18;
const CT_COUNT = 36, CT_FPS = 8, CT_DRAG_PX = 280;            // 36 frames per 280 px of travel

/* ---------------------------------------------------------------- shared rAF scheduler (§9.1)
   One loop for every viewer. A viewer renders only when its IntersectionObserver reports it
   visible, the document is visible, and it is dirty or animating. Hooks run first each tick. */

const sched = (() => {
  const viewers = new Set();
  const hooks = new Set();
  const byTarget = new Map();
  let raf = 0;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = byTarget.get(e.target);
      if (!v) continue;
      const was = v.visible;
      v.visible = e.isIntersecting;
      if (v.visible && !was) v.dirty = true;
      v.onVisibility?.(v.visible);
    }
    request();
  });

  function request() { if (!raf) raf = requestAnimationFrame(tick); }

  function tick(t) {
    raf = 0;
    if (doc.visibilityState !== "visible") return;
    let again = false;
    for (const h of hooks) if (h(t)) again = true;
    for (const v of viewers) {
      if (!v.visible || !(v.dirty || v.animating)) continue;
      const wasDirty = v.dirty;
      v.dirty = false;
      if (v.render(t, wasDirty)) again = true;
    }
    if (again) request();
  }

  doc.addEventListener("visibilitychange", () => {
    const shown = doc.visibilityState === "visible";
    for (const v of viewers) v.onVisibility?.(shown && v.visible);
    if (shown) request();
  });

  return {
    add(v, target) { viewers.add(v); byTarget.set(target, v); io.observe(target); },
    hook(fn) { hooks.add(fn); },
    request,
  };
})();

/* ---------------------------------------------------------------- image sequences (§9.2, §9.3) */

class Seq {
  /** box: the .seq element holding the fallback <img> and the hidden <canvas>. */
  constructor(box, { count, w, h, start = 0, loop = false }) {
    this.box = box;
    this.canvas = $("canvas", box);
    this.fallback = $(".seq__fallback", box);
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) throw new Error("no 2D canvas");
    this.count = count;
    this.loop = loop;            // CT turns round; MRI slices stop at the ends
    this.aw = w;                 // frame aspect (source pixels)
    this.ah = h;
    this.frame = start;
    this.drawn = -1;
    this.shown = false;          // canvas has replaced the fallback
    this.visible = false;
    this.dirty = true;
    this.animating = false;
    this.changed = null;         // set by the controller: mirrors range, readout, localizer
    this.retry = 0;
    new ResizeObserver(() => { this.dirty = true; sched.request(); }).observe(this.canvas);
    sched.add(this, box);
  }

  /** Something drawable for frame i: { img, sx?, sy?, sw?, sh? }, or null. */
  source() { return null; }

  set(i) {
    i = Math.round(i);
    i = this.loop ? mod(i, this.count) : clamp(i, 0, this.count - 1);
    if (i === this.frame) return false;
    this.frame = i;
    this.dirty = true;
    this.changed?.(i);
    sched.request();
    return true;
  }

  /** Backing store = CSS size x min(devicePixelRatio, 2), kept at the frame's aspect (the CSS uses object-fit: contain). */
  fit() {
    const c = this.canvas;
    const cw = c.clientWidth, ch = c.clientHeight;
    if (!cw || !ch) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = Math.min(cw / this.aw, ch / this.ah);
    const w = Math.max(1, Math.round(this.aw * s * dpr));
    const h = Math.max(1, Math.round(this.ah * s * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return true;
  }

  draw() {
    const src = this.source(this.frame);
    if (!src) return false;
    const c = this.canvas;
    if (c.hidden) c.hidden = false;             // must be laid out to measure it
    if (!this.fit()) {
      if (!this.shown) c.hidden = true;
      // visible but not sized yet (layout still settling): try again shortly, not every frame
      clearTimeout(this.retry);
      this.retry = setTimeout(() => { this.dirty = true; sched.request(); }, 300);
      return false;
    }
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, c.width, c.height);
    if (src.sw) ctx.drawImage(src.img, src.sx, src.sy, src.sw, src.sh, 0, 0, c.width, c.height);
    else ctx.drawImage(src.img, 0, 0, c.width, c.height);
    this.drawn = this.frame;
    if (!this.shown) {
      this.shown = true;
      if (this.fallback) this.fallback.hidden = true;
    }
    return true;
  }

  render(t, wasDirty) {
    if (wasDirty || this.drawn !== this.frame) this.draw();
    return false;
  }
}

/** MRI: 40 axial slices. The sprite (one request) draws first; full 512 px frames replace it as each decodes. */
class MriSeq extends Seq {
  constructor(box) {
    super(box, { count: MRI_COUNT, w: 512, h: 512, start: MRI_REST });
    this.sprite = null;
    this.frames = new Array(MRI_COUNT).fill(null);
    this.loading = false;
  }

  source(i) {
    if (this.frames[i]) return { img: this.frames[i] };
    if (this.sprite) return { img: this.sprite, sx: (i % 8) * 256, sy: Math.floor(i / 8) * 256, sw: 256, sh: 256 };
    // the no-JS fallback is frame 18 at full size: use it until the sprite arrives
    const fb = this.fallback;
    if (i === MRI_REST && fb && fb.complete && fb.naturalWidth >= 512) return { img: fb };
    return null;
  }

  load() {
    if (this.loading) return;
    this.loading = true;
    const img = new Image();
    img.decoding = "async";
    img.src = SPRITE;
    img.decode()
      .then(() => { this.sprite = img; this.dirty = true; sched.request(); })
      .catch((e) => warn("MRI sprite", e))
      .finally(() => onIdle(() => this.loadFrames()));
  }

  loadFrames() {
    // nearest slices to the one on screen first
    const order = [...Array(MRI_COUNT).keys()].sort((a, b) => Math.abs(a - this.frame) - Math.abs(b - this.frame));
    for (const i of order) {
      const img = new Image();
      img.decoding = "async";
      img.src = MRI_FRAME(i);
      img.decode().then(() => {
        this.frames[i] = img;
        if (i === this.frame) { this.dirty = true; sched.request(); }
      }, () => {});
    }
  }

  onVisibility(vis) { if (vis) this.load(); }
}

/** CT: 36 views of a rib cage, 10 degrees apart. Loaded the first time CT mode is shown. */
class CtSeq extends Seq {
  constructor(box) {
    super(box, { count: CT_COUNT, w: 400, h: 371, start: 0, loop: true });
    this.frames = new Array(CT_COUNT).fill(null);
    this.settled = 0;
    this.loading = false;
    this.auto = "idle";          // idle -> pending (waiting for frames) -> { t0, f0 } (turning) -> done
  }

  source(i) {
    if (this.frames[i]) return { img: this.frames[i] };
    for (let k = 1; k <= CT_COUNT / 2; k++) {                // nearest loaded view while the rest arrive
      const a = this.frames[mod(i + k, CT_COUNT)] || this.frames[mod(i - k, CT_COUNT)];
      if (a) return { img: a };
    }
    return null;
  }

  get ready() { return this.settled === CT_COUNT && this.frames.some(Boolean); }

  load() {
    if (this.loading) return;
    this.loading = true;
    const order = [...Array(CT_COUNT).keys()].sort((a, b) => {
      const da = Math.min(mod(a - this.frame, CT_COUNT), mod(this.frame - a, CT_COUNT));
      const db = Math.min(mod(b - this.frame, CT_COUNT), mod(this.frame - b, CT_COUNT));
      return da - db;
    });
    for (const i of order) {
      const img = new Image();
      img.decoding = "async";
      img.src = CT_FRAME(i);
      img.decode()
        .then(() => { this.frames[i] = img; }, () => {})
        .finally(() => {
          this.settled++;
          if (i === this.frame || !this.shown || this.settled === CT_COUNT) { this.dirty = true; sched.request(); }
        });
    }
  }

  /** The first time CT mode is shown: load, and queue one autoplay turn if motion is allowed. */
  firstShow() {
    this.load();
    if (this.auto === "idle") this.auto = isReduced() ? "done" : "pending";
    this.dirty = true;
    sched.request();
  }

  /** Any user input stops the autoplay for good. */
  stopAuto() {
    if (this.auto === "done") return;
    this.auto = "done";
    this.animating = false;
  }

  onVisibility(vis) { if (!vis && typeof this.auto === "object") this.stopAuto(); }

  render(t, wasDirty) {
    if (this.auto === "pending" && this.ready && !isReduced()) {
      this.auto = { t0: t, f0: this.frame };
      this.animating = true;
    }
    if (typeof this.auto === "object") {
      if (isReduced()) this.stopAuto();
      else {
        const step = Math.floor(((t - this.auto.t0) * CT_FPS) / 1000);
        const f0 = this.auto.f0;
        if (step >= CT_COUNT) { this.auto = "done"; this.animating = false; }
        this.set(f0 + Math.min(step, CT_COUNT));            // one full turn, ending where it started
      }
    }
    if (wasDirty || this.drawn !== this.frame) this.draw();
    return this.animating;
  }
}

/* ---------------------------------------------------------------- imaging figure controller */

function initImaging() {
  const plate = $('.lb-plate[data-plate="imaging"]');
  const boxMri = plate && $(".seq--mri", plate);
  const boxCt = plate && $(".seq--ct", plate);
  if (!boxMri || !boxCt || !$("#mriCanvas", boxMri) || !$("#ctCanvas", boxCt)) return null;

  // initial mode first, so a failure below still leaves one clean fallback on screen
  boxCt.hidden = true;
  boxMri.hidden = false;

  const chap = $("#ch-imaging");
  const sw = $(".seq__switch", plate);
  const mriRange = $("#mriRange");
  const ctRange = $("#ctRange");
  const readTR = $(".lb-read--tr", plate);
  const loc = $(".loc", plate);

  const mri = new MriSeq(boxMri);
  const ct = new CtSeq(boxCt);
  let mode = "mri";
  let userMode = null;           // set by the switch; cleared when the chapter is re-entered
  let last = { m: -1, c: -1 };   // last scroll-derived frames

  function readout() {
    if (readTR) readTR.textContent = mode === "ct" ? `Rotation ${ct.frame * 10}°` : `Slice ${mri.frame + 1} of ${MRI_COUNT}`;
  }
  mri.changed = (f) => {
    if (mriRange) { mriRange.value = String(f); mriRange.setAttribute("aria-valuetext", `Slice ${f + 1} of ${MRI_COUNT}`); }
    loc?.style.setProperty("--f", (f / (MRI_COUNT - 1)).toFixed(4));
    if (mode === "mri") readout();
  };
  ct.changed = (f) => {
    if (ctRange) { ctRange.value = String(f); ctRange.setAttribute("aria-valuetext", `Rotation ${f * 10} degrees`); }
    if (mode === "ct") readout();
  };

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    boxMri.hidden = m !== "mri";
    boxCt.hidden = m !== "ct";
    if (sw) for (const b of $$("button[data-mode]", sw)) b.setAttribute("aria-pressed", String(b.dataset.mode === m));
    readout();
    if (m === "ct") ct.firstShow();
    else ct.stopAuto();
    (m === "ct" ? ct : mri).dirty = true;
    sched.request();
  }

  // the switch and both ranges ship hidden; they only make sense with this script
  if (sw) sw.hidden = false;
  if (mriRange) mriRange.hidden = false;
  if (ctRange) ctRange.hidden = false;
  mri.changed(mri.frame);
  ct.changed(ct.frame);
  readout();

  sw?.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-mode]");
    if (!b) return;
    userMode = b.dataset.mode;
    setMode(userMode);
  });

  mriRange?.addEventListener("input", () => mri.set(+mriRange.value));
  if (ctRange) {
    ctRange.addEventListener("input", () => { ct.stopAuto(); ct.set(+ctRange.value); });
    ctRange.addEventListener("pointerdown", () => ct.stopAuto());
    ctRange.addEventListener("keydown", () => ct.stopAuto());
  }

  // CT drag: pointer capture, 36 frames per 280 px, looping. touch-action: pan-y (CSS) keeps vertical scrolling.
  const cv = ct.canvas;
  let drag = null;
  cv.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.pointerType === "mouse") e.preventDefault();      // no text selection; never on touch
    ct.stopAuto();
    drag = { id: e.pointerId, x: e.clientX, f: ct.frame };
    try { cv.setPointerCapture(e.pointerId); } catch {}
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    ct.set(drag.f + Math.round(((e.clientX - drag.x) * CT_COUNT) / CT_DRAG_PX));
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    try { cv.releasePointerCapture(e.pointerId); } catch {}
  };
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);
  cv.addEventListener("lostpointercapture", endDrag);

  /** Desktop scroll-scrub, from the chapter's own rect (§7.7). */
  function scrub() {
    if (!chap) return;
    const r = chap.getBoundingClientRect();
    if (!r.height) return;
    const p = clamp((innerHeight * 0.5 - r.top) / r.height, 0, 1);
    if (p >= 0.5) ct.load();
    const was = mode;
    setMode(userMode ?? (p < 0.6 ? "mri" : "ct"));
    const mf = Math.round(clamp(p / 0.6, 0, 1) * (MRI_COUNT - 1));
    const cf = Math.round(clamp((p - 0.6) / 0.4, 0, 1) * (CT_COUNT - 1));
    if (mf !== last.m) { last.m = mf; mri.set(mf); }
    if (cf !== last.c) {
      const fresh = last.c < 0;
      last.c = cf;
      // scrolling the CT while it is already on screen is input to it (not the step that first shows it)
      if (!fresh && was === "ct" && mode === "ct") ct.stopAuto();
      ct.set(cf);
    }
  }

  return {
    mri, ct, scrub,
    get mode() { return mode; },
    /** Chapter (re-)entered: the switch override ends and the scrub takes over again. */
    enter() { userMode = null; last = { m: -1, c: -1 }; },
    preload() { mri.load(); },
  };
}

/* ---------------------------------------------------------------- light box and accordion (§7.7, §9.1) */

function initLightbox(imaging) {
  const lightbox = $("#lightbox");
  const list = $("#techChapters");
  if (!lightbox || !list) return null;

  const items = $$(".chapter", list).map((li) => {
    const plate = $(".lb-plate", li);
    return {
      li,
      id: li.dataset.plate,
      btn: $(".chapter__btn", li),
      body: $(".chapter__body", li),
      plate,
      home: plate ? { parent: plate.parentNode, next: plate.nextSibling } : null,
    };
  }).filter((it) => it.id && it.btn);
  if (!items.length) return null;

  let desk = null;
  let activeId = (items.find((it) => it.li.classList.contains("is-active")) || items[0]).id;
  let firstLayout = true;
  let sweepTimer = 0;
  let reading = false;

  /* -- shared activation side effects -- */
  function startReading() {
    if (reading) return;
    const f = $('.lb-plate[data-plate="ai"]');
    if (!f) return;
    reading = true;
    f.classList.add("is-reading");
    // once: after the second line settles, drop the trigger so re-showing the plate does not replay it
    const done = (e) => {
      if (!e.target.classList || !e.target.classList.contains("read-line--2")) return;
      f.removeEventListener("animationend", done);
      f.classList.remove("is-reading");
      f.classList.add("is-read");
    };
    f.addEventListener("animationend", done);
  }

  function activated(id) {
    if (id === "ai") startReading();
    if (id === "imaging" && imaging) { imaging.enter(); scrubSoon(); }
    emit("cn:plate", { id });
  }

  /* -- desktop: light box -- */
  function runSweep() {
    if (isReduced() || !desk) return;
    const screen = $(".lb-plate.is-active .lb-plate__screen", lightbox);
    lightbox.style.setProperty("--sweep-h", `${screen ? screen.offsetHeight : lightbox.offsetHeight}px`);
    lightbox.classList.remove("is-sweeping");
    void lightbox.offsetWidth;                              // restart the animation
    lightbox.classList.add("is-sweeping");
    clearTimeout(sweepTimer);
    sweepTimer = setTimeout(() => lightbox.classList.remove("is-sweeping"), cssPx("--t-sweep", 700) + 80);
  }

  function setActive(id, { sweep = true } = {}) {
    if (!id || id === activeId) return;
    activeId = id;
    for (const it of items) {
      const on = it.id === id;
      it.li.classList.toggle("is-active", on);
      it.btn.setAttribute("aria-pressed", String(on));
      it.plate?.classList.toggle("is-active", on);
    }
    if (sweep) runSweep();
    activated(id);
  }

  /** The chapter crossing the viewport's middle line, if any. */
  function crossing() {
    const mid = innerHeight * 0.5;
    for (const it of items) {
      const r = it.li.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) return it.id;
    }
    return null;
  }

  // a click scrolls its chapter to the middle line; hold the observer until that scroll settles
  let locked = false, idleT = 0, capT = 0;
  function unlock() {
    locked = false;
    clearTimeout(idleT); clearTimeout(capT);
    removeEventListener("scroll", onLockedScroll);
    if (desk) setActive(crossing());
  }
  function onLockedScroll() { clearTimeout(idleT); idleT = setTimeout(unlock, 160); }
  function lockUntilSettled() {
    clearTimeout(idleT); clearTimeout(capT);
    locked = true;
    addEventListener("scroll", onLockedScroll, { passive: true });
    idleT = setTimeout(unlock, 240);                        // no scroll at all (already in place)
    capT = setTimeout(unlock, 3000);
  }

  function toMiddle(it) {
    const dy = it.li.getBoundingClientRect().top - (innerHeight * 0.5 - 8);
    lockUntilSettled();
    if (Math.abs(dy) > 1) scrollBy({ top: dy, behavior: scrollMode() });
  }

  const chapterIO = new IntersectionObserver(() => {
    if (desk && !locked) setActive(crossing());
  }, { rootMargin: "-50% 0px -50% 0px" });
  for (const it of items) chapterIO.observe(it.li);

  /* -- mobile and tablet: accordion -- */
  function setOpen(id, { reveal = false } = {}) {
    for (const it of items) {
      const on = it.id === id;
      it.btn.setAttribute("aria-expanded", String(on));
      it.li.classList.toggle("is-active", on);
    }
    if (!id) return;
    activeId = id;
    activated(id);
    if (reveal) {
      const it = items.find((x) => x.id === id);
      const top = cssPx("--header-h", 72) + 8;
      const r = it.btn.getBoundingClientRect();
      if (r.top < top) scrollBy({ top: r.top - top, behavior: scrollMode() });
    }
  }

  /* -- layout switch at 1024 px; nodes are moved, never re-created -- */
  function layout() {
    const d = isDesk();
    if (d === desk) return;
    desk = d;
    if (d) {
      for (const it of items) if (it.plate) lightbox.append(it.plate);
      for (const it of items) {
        it.btn.removeAttribute("aria-expanded");
        it.btn.setAttribute("aria-controls", lightbox.id);
      }
      const keep = crossing() || activeId;
      activeId = null;
      setActive(keep, { sweep: false });
    } else {
      lightbox.classList.remove("is-sweeping");
      for (const it of items) {
        if (it.plate && it.home) {
          const next = it.home.next && it.home.next.parentNode === it.home.parent ? it.home.next : null;
          it.home.parent.insertBefore(it.plate, next);
        }
        it.btn.removeAttribute("aria-pressed");
        if (it.body?.id) it.btn.setAttribute("aria-controls", it.body.id);
      }
      setOpen(firstLayout ? (items.some((x) => x.id === "imaging") ? "imaging" : items[0].id) : activeId);
    }
    firstLayout = false;
  }

  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".chapter__btn");
    const it = btn && items.find((x) => x.btn === btn);
    if (!it) return;
    if (desk) {
      setActive(it.id);
      toMiddle(it);
    } else {
      setOpen(btn.getAttribute("aria-expanded") === "true" ? null : it.id, { reveal: true });
    }
  });

  /* -- desktop scroll-scrub for ch-imaging (passive listener, throttled to the shared rAF) -- */
  let scrollDirty = false;
  const scrubOn = () => desk && imaging && !isReduced() && activeId === "imaging";
  function scrubSoon() { if (scrubOn()) { scrollDirty = true; sched.request(); } }
  addEventListener("scroll", scrubSoon, { passive: true });
  addEventListener("resize", scrubSoon, { passive: true });
  sched.hook(() => {
    if (!scrollDirty) return false;
    scrollDirty = false;
    if (scrubOn()) imaging.scrub();
    return false;
  });

  layout();
  listen(mqDesk, layout);
  return { get activeId() { return activeId; } };
}

/* ---------------------------------------------------------------- preload when #technology is near (§9.1) */

function initPreload(imaging) {
  const tech = $("#technology");
  if (!tech) return;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    imaging?.preload();
    // inactive light-box plates are display: none, so their lazy images would only start loading
    // when the sweep reveals them. Fetch them now (not the CT poster: CT frames load on demand).
    if (isDesk()) {
      for (const img of $$("#lightbox .lb-plate img[loading='lazy']")) if (!img.closest(".seq--ct")) img.loading = "eager";
    }
  }, { rootMargin: "100% 0px" });
  io.observe(tech);
}

/* ---------------------------------------------------------------- specimen cabinet stills (§7.3) */

function initCabinet() {
  const cab = $("#cabinet");
  const list = $("#specList");
  const stage = cab && $(".cabinet__stage", cab);
  if (!stage || !list || !DEPTS.length) return;

  const layers = $$(".cabinet__still", stage);
  const title = $("#cabTitle"), text = $("#cabText"), credit = $("#cabCredit");
  const inset = $("#cabInset"), insetImg = inset && $("img", inset), insetLabel = $("#cabInsetLabel");
  const sw = $("#cabSwitch");
  let typeEl = $(".cabinet__type", stage);       // the "0–18" tile, made the first time it is needed
  const typeTile = () => {
    if (!typeEl) {
      typeEl = doc.createElement("span");
      typeEl.className = "cabinet__type";
      typeEl.setAttribute("aria-hidden", "true");
      stage.append(typeEl);
    }
    return typeEl;
  };

  const SHAPE = { Oncology: "is-circle" };                 // other image views are photos
  let cur = { name: (title && title.textContent.trim()) || "Neurology", alt: 0 };
  let token = 0;

  const shown = () => cab.getClientRects().length > 0;       // the cabinet is display: none below 1024 px

  function setCredit(line, id) {
    if (!credit) return;
    if (!line) { credit.hidden = true; credit.replaceChildren(); return; }
    const a = doc.createElement("a");
    a.href = `credits.html${id ? "#" + id : ""}`;
    a.textContent = "Credits";
    credit.replaceChildren(doc.createTextNode(`${line}. `), a);
    credit.hidden = false;
  }

  function show(name, alt) {
    const d = DEPTS.find((x) => x.name === name);
    if (!d) return;
    if (alt === undefined) alt = name === cur.name ? cur.alt : 0;  // hover keeps the Knee/Spine choice
    alt = d.alt || d.stillAlt ? +alt || 0 : 0;
    if (name === cur.name && alt === cur.alt) return;
    cur = { name, alt };
    const my = ++token;
    const view = d.view === "image" ? "image" : d.view === "type" ? "type" : "still";

    if (title) title.textContent = d.name;
    if (text) text.textContent = (alt && d.captionAlt) || d.caption || "";
    setCredit(alt ? d.creditAlt || d.credit : d.credit, alt ? d.creditIdAlt || d.creditId : d.creditId);
    if (inset) {
      inset.hidden = !d.inset;
      if (d.inset) {
        if (insetImg) insetImg.src = d.inset.src;
        if (insetLabel) insetLabel.textContent = d.inset.label;
      }
    }
    if (sw) {
      sw.hidden = !(d.alt || d.stillAlt);
      for (const b of $$("button[data-alt]", sw)) b.setAttribute("aria-pressed", String(+b.dataset.alt === alt));
    }

    if (view === "type") {
      typeTile().textContent = d.stillText || "";
      stage.dataset.view = "type";
      for (const l of layers) l.classList.remove("is-on");
    } else {
      const still = (alt && d.stillAlt) || d.still;
      const src = view === "image" ? d.image : still ? `${still}-1072.webp` : null;
      const shape = view === "image" ? SHAPE[d.name] || "is-photo" : "";
      const on = layers.find((l) => l.classList.contains("is-on"));
      const next = layers.find((l) => l !== on) || layers[0];
      if (src && next) {
        next.classList.remove("is-circle", "is-photo");
        if (shape) next.classList.add(shape);
        next.src = src;
        const swap = () => {
          if (my !== token) return;
          stage.dataset.view = view;
          next.classList.add("is-on");
          if (on && on !== next) on.classList.remove("is-on");
        };
        (next.decode ? next.decode() : Promise.resolve()).then(swap, swap);
      }
    }
    emit("cn:spec", { name: d.name, alt });
  }

  let hoverRow = null, hoverT = 0;
  list.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const row = e.target.closest(".spec[data-find-dept]");
    if (row === hoverRow) return;
    hoverRow = row;
    clearTimeout(hoverT);
    if (row) hoverT = setTimeout(() => { if (shown()) show(row.dataset.findDept); }, 150);
  });
  list.addEventListener("pointerleave", () => { hoverRow = null; clearTimeout(hoverT); });
  list.addEventListener("focusin", (e) => {
    const row = e.target.closest(".spec[data-find-dept]");
    if (!row || !shown()) return;
    clearTimeout(hoverT);
    show(row.dataset.findDept);
  });

  sw?.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-alt]");
    if (b) show(cur.name, +b.dataset.alt);
  });
}

/* ---------------------------------------------------------------- "Look closer" retina (§7.8) */

function initRetina() {
  const range = $("#retinaRange");
  const eye = $(".closer__eye");
  const natural = eye && $(".closer__natural", eye);
  if (!range || !eye) return;

  let loaded = false;
  function loadNatural() {
    if (loaded || !natural) return;
    loaded = true;
    if (natural.dataset.srcset) natural.srcset = natural.dataset.srcset;
    if (natural.dataset.src) natural.src = natural.dataset.src;
  }

  function set(v, fromPointer) {
    v = clamp(Math.round(v), 0, 100);
    loadNatural();
    if (fromPointer) range.value = String(v);
    eye.style.setProperty("--reveal", `${v}%`);
    range.setAttribute("aria-valuetext", v === 0 ? "Red-free" : v === 100 ? "Natural colour" : `${v}% natural colour`);
  }

  range.addEventListener("input", () => set(+range.value, false));

  // drag across the circle; touch only takes over once the gesture is clearly horizontal
  let drag = null;
  const fromX = (x) => {
    const r = eye.getBoundingClientRect();
    if (r.width) set(((x - r.left) / r.width) * 100, true);
  };
  eye.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, live: e.pointerType !== "touch" };
    try { eye.setPointerCapture(e.pointerId); } catch {}
    if (drag.live) { e.preventDefault(); fromX(e.clientX); }
  });
  eye.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.live) {
      const dx = Math.abs(e.clientX - drag.x), dy = Math.abs(e.clientY - drag.y);
      if (dx > 6 && dx > dy) drag.live = true;
      else return;
    }
    fromX(e.clientX);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    try { eye.releasePointerCapture(e.pointerId); } catch {}
  };
  eye.addEventListener("pointerup", end);
  eye.addEventListener("pointercancel", end);
  eye.addEventListener("lostpointercapture", end);
}

function initSeeSenior() {
  const link = $("#seeSenior");
  if (!link) return;
  link.addEventListener("click", (e) => {
    const pk = $("#packages");
    if (!pk) return;
    e.preventDefault();
    const tab = $('#pkgTabs [data-filter="senior"]');
    tab?.click();
    pk.scrollIntoView({ behavior: scrollMode(), block: "start" });
    tab?.focus({ preventScroll: true });
  });
}

/* ---------------------------------------------------------------- doctor count (§7.5) */

function initDocCount() {
  const el = $("#docTodayCount");
  if (!el || !DOCS.length) return;
  const n = DOCS.filter((d) => d.today).length;
  el.textContent = `${n} ${n === 1 ? "consultant" : "consultants"} in today`;
}

/* ---------------------------------------------------------------- go */

root.classList.add("has-plates");
guard("doctor count", initDocCount);
const imaging = guard("imaging", initImaging);
guard("light box", () => initLightbox(imaging));
guard("preload", () => initPreload(imaging));
guard("cabinet", initCabinet);
guard("retina", initRetina);
guard("see senior", initSeeSenior);
listen(mqReduce, () => { if (isReduced()) imaging?.ct.stopAuto(); });
