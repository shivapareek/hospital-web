/* CareNova 3D stage: boot (spec §8.1–8.2, §8.8). Loaded as <script type="module">, always. No three.js here.
   Detects the capability tier, wires posters, buttons and observers, dynamic-imports the scene modules
   and owns the WebGL context budget. If anything here fails, the posters and stills simply stay. */

import { detectTier } from "./caps.js";
/* i18n: window.I18N (set by the server on Hindi pages) maps English text to the page language */
const tr = (s, v) => { const d = window.I18N || {}; let r = Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s; if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); return r; };

const doc = document;
const root = doc.documentElement;
const desktopMQ = matchMedia("(min-width: 1024px)");

/* Stage internals only; zero specificity (:where) so css/style.css can override any of it.
   Leaders and rings carry a 1 px paper halo (light in the light theme, near-black in dark), so they read over
   white porcelain and over the plate alike; chips are slightly translucent so they do not sit on the model
   like stickers. */
const CSS = `
:where(.stage__box){position:relative}
:where(.stage__box)>.stage__canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;
  transition:opacity .4s cubic-bezier(.2,.65,.25,1);touch-action:pan-y;-webkit-user-select:none;user-select:none}
:where(.stage__box)>.stage__canvas.is-on{opacity:1}
:where(.stage__box)>.stage__canvas.is-quick{transition-duration:.14s}
:where(.stage__box.is-live) :where(.stage__poster,.cabinet__still){visibility:hidden}
:where(.stage__box.is-live){touch-action:pan-y;cursor:grab;-webkit-user-select:none;user-select:none}
:where(.stage__box.is-live.is-dragging){cursor:grabbing}
:where(.stage__box.is-live)::after{opacity:0}
:where(.stage__labels){position:absolute;inset:0;pointer-events:none;overflow:hidden}
:where(.stage__label){position:absolute;left:0;top:0;display:flex;align-items:center;white-space:nowrap;
  font:600 calc(14px * var(--fs-scale, 1))/1.25 var(--sans, system-ui, sans-serif);color:var(--ink-2, #3D4843);
  transition:opacity .16s linear}
:where(.stage__label.is-flip){flex-direction:row-reverse}
:where(.stage__label.is-off){opacity:0}
:where(.stage__ring){flex:none;box-sizing:border-box;width:6px;height:6px;border-radius:50%;border:1.5px solid var(--ink-2, #3D4843);
  box-shadow:0 0 0 1px var(--paper, #F4F5F2)}
:where(.stage__leader){flex:none;width:32px;height:1px;background:var(--ink-2, #3D4843);box-shadow:0 0 0 1px var(--paper, #F4F5F2)}
:where(.stage__label-text){padding:1px 6px;background:color-mix(in srgb, var(--paper-2, #E8EBE6) 78%, transparent);border-radius:4px}
@media (prefers-reduced-motion: reduce){
  :where(.stage__box)>.stage__canvas,:where(.stage__label){transition-duration:1ms}
}`;

function injectCSS() {
  if (doc.getElementById("cn-stage-css")) return;
  const s = doc.createElement("style");
  s.id = "cn-stage-css";
  s.textContent = CSS;
  doc.head.appendChild(s);
}

/* Listen on document and window, once per event (plates.js dispatches on document). */
function onEvent(type, fn) {
  const seen = new WeakSet();
  const h = (e) => { if (seen.has(e)) return; seen.add(e); fn(e); };
  doc.addEventListener(type, h);
  window.addEventListener(type, h);
}

function afterLoadIdle(fn) {
  const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
  if (doc.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

/** Calls fn once, when el comes within `margin` of the viewport. */
function whenNear(el, fn, margin = "200px 0px") {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: margin });
  io.observe(el);
}

/* Context budget: at most 2 live WebGL contexts at >= 1024 px, 1 below. The live stage farthest
   from the viewport is suspended (renderer disposed, context released, poster back) and resumes
   the next time it intersects. */
const budget = {
  live: new Set(),
  max() { return desktopMQ.matches ? 2 : 1; },
  acquire(stage) {
    this.live.delete(stage);
    while (this.live.size >= this.max()) {
      let far = null, farD = -1;
      for (const s of this.live) { const d = s.distance(); if (d > farD) { farD = d; far = s; } }
      if (!far) break;
      this.live.delete(far);
      far.suspend();
    }
    this.live.add(stage);
  },
  release(stage) { this.live.delete(stage); },
};

/* ---------------------------------------------------------------- hero */

function setupHero(tier) {
  const fig = doc.querySelector('[data-stage="hero"]');
  const box = fig?.querySelector(".stage__box");
  if (!fig || !box) return;
  const load = fig.querySelector(".stage__load");
  if (tier === "poster") { if (load) load.hidden = true; return; }

  /** The 3D view could not start: the still stays. If the load button had focus, say so and keep focus nearby. */
  const failed = () => {
    if (!load || load.dataset.failed) return;
    load.dataset.failed = "1";
    const lost = doc.activeElement === load || doc.activeElement === doc.body;
    load.hidden = true;
    if (load.dataset.label === undefined) return;          // never pressed (live tier): nothing to announce
    const msg = doc.createElement("p");
    msg.className = "stage__status";
    msg.setAttribute("role", "status");
    load.after(msg);
    setTimeout(() => { msg.textContent = tr("3D view unavailable. The still image stays."); }, 50);
    if (lost) { box.setAttribute("tabindex", "-1"); box.focus({ preventScroll: true }); }
  };

  let started = false;
  const go = async () => {
    if (started) return;
    started = true;
    try {
      const mod = await import("./scene-hero.js");
      const hero = await mod.mountHero(fig, { tier, budget });
      if (hero.state === "failed") failed();
    } catch (e) {
      console.warn("[stage] cover heart unavailable, keeping the poster.", e && e.message ? e.message : e);
      failed();
    }
  };

  if (tier === "tap") {
    if (!load) return;
    load.hidden = false;
    load.addEventListener("click", () => {
      // aria-disabled rather than disabled: a disabled button drops keyboard focus to <body>
      load.setAttribute("aria-disabled", "true");
      load.setAttribute("aria-busy", "true");
      load.dataset.label = load.textContent;
      load.textContent = tr("Loading the 3D model");
      go();
    }, { once: true });
    return;
  }
  // live: after load and an idle moment, once the cover is near the viewport
  if (load) load.hidden = true;
  afterLoadIdle(() => whenNear(box, go));
}

/* ---------------------------------------------------------------- cabinet (P1, live tier only) */

let lastSpec = null;
let cabinet = null;

function currentSpec() {
  if (lastSpec) return lastSpec;
  const t = doc.getElementById("cabTitle");
  const name = (t && (t.dataset.dept || t.textContent.trim())) || "Neurology";   // data-dept: English name, also on Hindi pages
  const alt = doc.querySelector('#cabSwitch [aria-pressed="true"]')?.dataset.alt || 0;
  return { name, alt: +alt };
}

function setupCabinet(tier) {
  onEvent("cn:spec", (e) => {
    lastSpec = { name: e.detail?.name, alt: +(e.detail?.alt || 0) };
    cabinet?.swap(lastSpec);
  });
  const cab = doc.getElementById("cabinet");
  const box = cab?.querySelector('[data-stage="cabinet"]');
  if (!cab || !box || tier !== "live") return;

  let timer = 0, started = false;
  const go = async () => {
    clearTimeout(timer);
    if (started || !desktopMQ.matches || getComputedStyle(cab).display === "none") return;
    started = true;
    try {
      const mod = await import("./scene-cabinet.js");
      cabinet = await mod.mountCabinet(box, { cabinet: cab, budget, current: currentSpec });
    } catch (e) {
      console.warn("[stage] cabinet 3D unavailable, keeping the stills.", e && e.message ? e.message : e);
    }
  };
  cab.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "touch") return;
    clearTimeout(timer);
    timer = setTimeout(go, 250);
  });
  cab.addEventListener("pointerleave", () => clearTimeout(timer));
  cab.addEventListener("keydown", go);
}

/* ---------------------------------------------------------------- stent volume (P1, live tier only) */

function setupVolume(tier) {
  const box = doc.querySelector('[data-stage="volume"]');
  if (!box || tier !== "live") return;
  let vol = null, loading = false, idle = 0;

  const activate = async () => {
    clearTimeout(idle);
    if (!desktopMQ.matches) return;
    if (vol) { vol.wake(); return; }
    if (loading) return;
    loading = true;
    try {
      const mod = await import("./scene-volume.js");
      vol = await mod.mountVolume(box, { budget });
    } catch (e) {
      console.warn("[stage] stent volume unavailable, keeping the poster.", e && e.message ? e.message : e);
    }
    loading = false;
  };
  // pause and dispose when the chapter has been inactive for 10 s
  const deactivate = () => {
    clearTimeout(idle);
    idle = setTimeout(() => vol?.sleep(), 10000);
  };
  // Load once cath has stayed active for a moment (a reader stopping there, or a click), not while the page is
  // merely scrolled past it: the volume (about 0.7 MB) belongs to the "everything opened" budget (§12), and the
  // baked poster is already on screen. Once loaded, it wakes at once.
  let dwell = 0;
  onEvent("cn:plate", (e) => {
    clearTimeout(dwell);
    if (e.detail?.id !== "cath") { deactivate(); return; }
    if (vol) activate();
    else dwell = setTimeout(activate, 1200);
  });
  if (doc.querySelector('#ch-cath.is-active, .chapter.is-active[data-plate="cath"]')) whenNear(box, activate, "0px");
}

/* ---------------------------------------------------------------- go */

function boot() {
  injectCSS();
  let tier = "poster";
  try { tier = detectTier(); } catch {}
  root.dataset.stageTier = tier;
  setupHero(tier);
  setupCabinet(tier);
  setupVolume(tier);
}

try { boot(); } catch (e) { console.warn("[stage] boot failed; posters stay.", e); }
