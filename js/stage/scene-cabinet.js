/* CareNova 3D stage: specimen cabinet live view (spec §8.6, P1, live tier only).
   Loaded dynamically by boot.js on intent (pointer rests 250 ms on #cabinet, or a key press inside it).
   DOM: #cabinet .cabinet__stage.stage__box[data-stage="cabinet"] with two img.cabinet__still layers (plates.js),
   .cabinet__hint. Listens to cn:spec through boot.js, which calls swap({ name, alt }). */

import {
  ModelStage, DragYaw, Loop, LiveStage, readTokens, revealCanvas, hideCanvas, watchContextLoss, disposeTree, DEG,
} from "./core.js";
import { SPECIMENS, modelPath, specimenForDept } from "./specimens.js";
import { prefersReduced } from "./caps.js";

const finePointer = matchMedia("(pointer: fine)");
const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4;
const SWAP_MS = 140;
const LRU = 4;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mountCabinet(box, opts = {}) {
  const cab = new CabinetStage(box, opts);
  await cab.start();
  return cab;
}

export class CabinetStage extends LiveStage {
  constructor(box, { cabinet = box.closest("#cabinet"), budget = null, current = () => ({ name: "Neurology", alt: 0 }) } = {}) {
    super(box, { budget, controls: [] });
    this.cabinet = cabinet;
    this.current = current;
    this.hint = cabinet?.querySelector(".cabinet__hint") || null;
    this.hintText = this.hint?.textContent || "";
    this.cache = new Map();      // key -> prepared model, least recently used first
    this.pending = new Map();    // key -> Promise of a prepared model
    this.token = 0;
    this.key = null;
  }

  async build() {
    const st = (this.stage = new ModelStage(this.box, { dprCap: 1.75 }));
    st.init();
    this.unwatch = watchContextLoss(st.canvas, () => this.lost(), () => st.disposed);
    this.drag = new DragYaw(this.box, {
      reduced: () => prefersReduced.matches,
      onInput: () => this.loop?.invalidate(),
    });
    this.drag.enabled = false;
    this.loop = new Loop(this, { onGuard: (level) => this.guard(level) });
    this.loop.visible = this.visible;
    this.ro = new ResizeObserver(() => { if (this.stage?.size()) this.loop?.invalidate(); });
    this.ro.observe(this.box);
    this._pm = (e) => {
      if (e.pointerType === "touch" || !this.lightOn()) return;
      const r = this.box.getBoundingClientRect();
      this.stage.lights.aim(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
      this.loop.kick();
    };
    this._pl = () => { this.stage?.lights.rest(); this.loop?.kick(); };
    this.box.addEventListener("pointermove", this._pm);
    this.box.addEventListener("pointerleave", this._pl);
    await this.show(this.current(), true);
  }

  /** cn:spec from plates.js (via boot.js). */
  swap(detail) {
    if (!detail || !this.stage || (this.state !== "live" && this.state !== "loading")) return;
    this.show(detail, false).catch((e) => console.warn("[stage] cabinet swap", e && e.message ? e.message : e));
  }

  async show(detail, first) {
    const my = ++this.token;
    const st = this.stage, canvas = st.canvas;
    const key = specimenForDept(detail.name, detail.alt);
    const reduced = prefersReduced.matches;

    if (!key) {                    // image or type department: canvas off, the still layer shows
      this.key = null;
      this.drag.enabled = false;
      hideCanvas(canvas, this.box);
      this.setHint(false);
      return;
    }
    if (key === this.key && canvas.classList.contains("is-on")) return;

    if (canvas.classList.contains("is-on")) {
      // canvas out (140 ms) while the new still shows underneath
      this.box.classList.remove("is-live");
      canvas.classList.add("is-quick");
      canvas.classList.remove("is-on");
      await wait(reduced ? 0 : SWAP_MS);
      if (my !== this.token) return;
    }

    let entry;
    try { entry = await this.entry(key); }
    catch (e) { if (first) throw e; console.warn("[stage] cabinet model", e && e.message ? e.message : e); return; }
    if (my !== this.token || this.stage !== st) return;

    const spec = SPECIMENS[key];
    st.setModel(entry, { yawDeg: spec.yaw, startYawDeg: reduced ? spec.yaw : spec.yaw - 6 });
    const d = this.drag;
    d.home = spec.yaw * DEG;
    d.yaw = st.yaw;
    d.v = 0;
    d.ease = null;
    d.enabled = true;
    if (!reduced) d.easeTo(spec.yaw * DEG, 420, null);    // +6° settle
    this.key = key;
    await st.compile();
    if (my !== this.token || this.stage !== st) return;
    st.render();
    if (first) canvas.classList.remove("is-quick");
    else canvas.classList.add("is-quick");
    await revealCanvas(canvas, this.box, first ? 400 : SWAP_MS);
    if (my !== this.token) return;
    this.setHint(true);
    this.loop?.invalidate();
  }

  /** Prepared model for a key; LRU of 4 parsed models, evicted ones are disposed. */
  async entry(key) {
    if (this.cache.has(key)) {
      const e = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, e);
      return e;
    }
    if (!this.pending.has(key)) {
      const st = this.stage;
      const p = st.load(SPECIMENS[key], modelPath(key, { lite: lowMemory })).then((e) => {
        this.pending.delete(key);
        if (this.stage !== st) { disposeTree(e.obj); throw new Error("stage closed"); }
        this.cache.set(key, e);
        this.evict();
        return e;
      }, (err) => { this.pending.delete(key); throw err; });
      this.pending.set(key, p);
    }
    return this.pending.get(key);
  }

  evict() {
    const current = this.stage?.model;
    for (const [k, e] of this.cache) {
      if (this.cache.size <= LRU) break;
      if (e === current) continue;
      this.cache.delete(k);
      disposeTree(e.obj, this.stage?.kit);
    }
  }

  setHint(live) {
    if (this.hint) this.hint.textContent = live ? "Drag to turn" : this.hintText;
  }

  lightOn() { return finePointer.matches && !prefersReduced.matches && !this.interactionOnly; }

  needs() {
    if (!this.stage || !this.key) return 0;
    if (this.drag.moving) return 2;
    return this.lightOn() && this.stage.lights.easing ? 2 : 0;
  }

  update(dt, now) {
    this.drag.step(now);
    if (this.lightOn()) this.stage.lights.step();
    this.stage.yaw = this.drag.yaw;
  }

  draw() { if (this.key) this.stage.render(); }

  guard(level) {
    if (!this.stage) return;
    if (level === "dpr") this.stage.setPixelRatio(1);
    else if (level === "interaction-only") { this.interactionOnly = true; this.stage.lights.rest(); this.stage.lights.snap(); }
    this.loop?.invalidate();
  }

  onVisible(v) { this.loop?.setVisible(v); }

  onTheme() {
    if (!this.stage) return;
    this.stage.setTokens(readTokens());
    this.loop?.invalidate();
  }

  teardown() {
    this.token++;
    this.unwatch?.();
    this.unwatch = null;
    this.drag?.dispose();
    this.drag = null;
    this.loop?.dispose();
    this.loop = null;
    this.ro?.disconnect();
    this.ro = null;
    if (this._pm) {
      this.box.removeEventListener("pointermove", this._pm);
      this.box.removeEventListener("pointerleave", this._pl);
      this._pm = this._pl = null;
    }
    const kit = this.stage?.kit;
    for (const e of this.cache.values()) disposeTree(e.obj, kit);
    this.cache.clear();
    this.stage?.dispose();
    this.stage = null;
    this.key = null;
    this.setHint(false);
  }
}
