/* CareNova 3D stage: the cover heart (spec §8.4). Loaded dynamically by boot.js. Imports three via core.js.
   DOM: figure[data-stage="hero"] > .stage__box (poster inside), .stage__ctrl ([data-turn], .stage__pause), .stage__load, figcaption. */

import { WebGLRenderTarget, MeshBasicMaterial, Raycaster, LinearSRGBColorSpace } from "three";
import {
  ModelStage, DragYaw, Loop, LiveStage, readTokens, revealCanvas, watchContextLoss, meshesOf, worldBox, DEG, Vector3,
  setTurnable,
} from "./core.js";
import { HERO, modelPath } from "./specimens.js";
import { prefersReduced } from "./caps.js";
/* i18n: window.I18N (set by the server on Hindi pages) maps English text to the page language */
const tr = (s, v) => { const d = window.I18N || {}; let r = Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s; if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); return r; };

const desktopMQ = matchMedia("(min-width: 1024px)");
// the caption sits inside the plate from 1280 px (css/style.css); only then is the heart moved off centre
const insideMQ = matchMedia("(min-width: 1280px)");
const finePointer = matchMedia("(pointer: fine)");
const TAU = Math.PI * 2;
// the box is a tab stop with turning instructions only while the 3D view is live (§15)
const LIVE_LABEL = tr("3D model of the human heart. Use the left and right arrow keys, or drag, to turn it.");
export const STILL_LABEL = tr("Model of the human heart. The coronary arteries on its surface are green.");

/** Pose shared with the bake page, so the poster and the first live frame match.
    `inside`: the caption is inside the plate (>= 1280 px), so the heart moves right and up to clear it. */
export function heroPose(inside) {
  return { yawDeg: HERO.yaw, offsetX: inside ? HERO.offsetX : 0, offsetY: inside ? HERO.offsetY : 0 };
}

export async function mountHero(figure, opts = {}) {
  const hero = new HeroStage(figure, opts);
  await hero.start();
  return hero;
}

export class HeroStage extends LiveStage {
  constructor(figure, { tier = "live", budget = null } = {}) {
    const box = figure.querySelector(".stage__box");
    const ctrl = figure.querySelector(".stage__ctrl");
    const load = figure.querySelector(".stage__load");
    super(box, { budget, controls: [ctrl, load] });
    this.figure = figure;
    this.tier = tier;
    this.ctrlEl = ctrl;
    this.loadEl = load;
    this.pauseBtn = figure.querySelector(".stage__pause");
    this.paused = false;
    this.interactionOnly = false;
    this.savedYaw = null;
    this.autoAt = Infinity;

    figure.addEventListener("click", (e) => {
      const b = e.target.closest("[data-turn]");
      if (b && this.drag) this.drag.turnBy(Math.sign(+b.dataset.turn) || 1);
    });
    this.pauseBtn?.addEventListener("click", () => this.togglePause());
    desktopMQ.addEventListener("change", () => this.onLayout());
    insideMQ.addEventListener("change", () => this.onLayout());
    prefersReduced.addEventListener("change", () => { this.syncPause(); this.loop?.kick(); });
  }

  /* ------------------------------------------------ lifecycle */

  async build() {
    const st = (this.stage = new ModelStage(this.box, { dprCap: this.tier === "live" ? 2 : 1.5 }));
    st.init();
    this.unwatch = watchContextLoss(st.canvas, () => this.lost(), () => st.disposed);
    const entry = await st.load(HERO, modelPath("hero"));
    if (this.state !== "loading") return;
    const pose = heroPose(insideMQ.matches);
    st.setModel(entry, { yawDeg: pose.yawDeg, offsetX: pose.offsetX, offsetY: pose.offsetY });
    if (this.savedYaw != null) st.yaw = this.savedYaw;
    await st.compile();
    if (this.state !== "loading") return;

    this.phase = null;
    this.drag = new DragYaw(this.box, {
      yaw: st.yaw,
      home: HERO.yaw * DEG,
      reduced: () => prefersReduced.matches,
      onStart: () => this.hold(),
      onEnd: () => this.hold(),
      onInput: () => this.loop?.invalidate(),
    });
    this.loop = new Loop(this, { onGuard: (level) => this.guard(level) });
    this.loop.visible = this.visible;
    // the box, and the caption and controls the labels keep clear of: a text-size change resizes the caption
    // without resizing the box, so it has to be watched too
    this.ro = new ResizeObserver(() => {
      if (!this.stage) return;
      this.stage.size();
      this.labels?.measure();
      this.loop?.invalidate();
    });
    this.ro.observe(this.box);
    for (const sel of ["figcaption", ".stage__ctrl"]) { const n = this.figure.querySelector(sel); if (n) this.ro.observe(n); }
    // the labels' own font follows --fs-scale (set on <html> by the text-size toggle)
    this.mo = new MutationObserver(() => { this.labels?.measure(); this.loop?.invalidate(); });
    this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });

    this._pm = (e) => {
      if (e.pointerType === "touch" || !this.lightOn()) return;
      const r = this.box.getBoundingClientRect();
      this.stage.lights.aim(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
      this.loop.kick();
    };
    this._pl = () => { this.stage?.lights.rest(); this.loop?.kick(); };
    this.box.addEventListener("pointermove", this._pm);
    this.box.addEventListener("pointerleave", this._pl);

    this.syncLabels();
    st.render();                    // first frame, in the poster's pose
    this.labels?.update();
    await revealCanvas(st.canvas, this.box);
    if (this.state !== "loading") return;

    setTurnable(this.box, LIVE_LABEL);
    if (this.loadEl && !this.loadEl.hidden) {
      // the tap-tier button stays focusable while loading (aria-disabled), so focus can move on to the stage
      const hadFocus = document.activeElement === this.loadEl || document.activeElement === document.body;
      this.loadEl.hidden = true;
      if (hadFocus) this.box.focus({ preventScroll: true });
    }
    if (this.ctrlEl) this.ctrlEl.hidden = false;
    this.syncPause();
    this.labels?.measure();
    this.labels?.update();
    this.hold(1000);                // auto-turn starts 1 s after the first frame
  }

  teardown() {
    this.unwatch?.();
    this.unwatch = null;
    clearTimeout(this.autoTimer);
    if (this.drag) { this.savedYaw = this.drag.yaw; this.drag.dispose(); this.drag = null; }
    this.loop?.dispose();
    this.loop = null;
    this.ro?.disconnect();
    this.ro = null;
    this.mo?.disconnect();
    this.mo = null;
    setTurnable(this.box, null, STILL_LABEL);
    if (this._pm) {
      this.box.removeEventListener("pointermove", this._pm);
      this.box.removeEventListener("pointerleave", this._pl);
      this._pm = this._pl = null;
    }
    this.labels?.destroy();
    this.labels = null;
    this.stage?.dispose();
    this.stage = null;
    if (this.state === "suspended" && this.ctrlEl) this.ctrlEl.hidden = true;
  }

  onVisible(v) { this.loop?.setVisible(v); }

  onTheme() {
    if (!this.stage) return;
    this.stage.setTokens(readTokens());
    this.loop?.invalidate();
  }

  onLayout() {
    if (this.state !== "live" || !this.stage) return;
    const pose = heroPose(insideMQ.matches);
    this.stage.setOffset(pose.offsetX, pose.offsetY);
    this.syncLabels();
    this.labels?.measure();
    this.loop?.invalidate();
  }

  /* ------------------------------------------------ Loop controller */

  lightOn() { return finePointer.matches && !prefersReduced.matches && !this.interactionOnly; }

  autoOn(now) {
    return !prefersReduced.matches && !this.paused && !this.interactionOnly && this.visible && now >= this.autoAt;
  }

  needs(now) {
    if (!this.stage) return 0;
    if (this.drag.moving) return 2;
    if (this.lightOn() && this.stage.lights.easing) return 2;
    return this.autoOn(now) ? 1 : 0;
  }

  update(dt, now) {
    const d = this.drag;
    d.step(now);
    if (!d.moving && this.autoOn(now)) this.sway(dt);
    if (this.lightOn()) this.stage.lights.step();
    this.stage.yaw = d.yaw;
  }

  /**
   * The motion on its own is a slow sway of ±HERO.swayDeg round the poster pose (peak speed HERO.turnSpeed),
   * not a full turn: the front, where the coronary arteries named in the caption are, always stays in view.
   * After a drag it carries on from where the user left the heart; from far round, it first eases back to
   * the edge of the sway.
   */
  sway(dt) {
    const d = this.drag, A = HERO.swayDeg * DEG;
    if (this.phase == null) {
      const c = d.home + Math.round((d.yaw - d.home) / TAU) * TAU;
      const o = d.yaw - c;
      this.swayC = c;
      if (Math.abs(o) > A) {
        this.phase = Math.sign(o) * Math.PI / 2;
        d.easeTo(c + Math.sign(o) * A, Math.min(4000, Math.max(600, ((Math.abs(o) - A) / 0.5) * 1000)), null);
      } else this.phase = Math.asin(o / A);
      return;
    }
    this.phase += (HERO.turnSpeed / A) * dt;
    d.yaw = this.swayC + A * Math.sin(this.phase);
  }

  draw() {
    this.stage.render();
    this.labels?.update();
  }

  /** No auto-turn until `ms` from now (4 s after the last drag or key turn). */
  hold(ms = 4000) {
    this.autoAt = performance.now() + ms;
    this.phase = null;          // the sway restarts from wherever the heart is left
    clearTimeout(this.autoTimer);
    this.autoTimer = setTimeout(() => this.loop?.kick(), ms + 20);
  }

  guard(level) {
    if (!this.stage) return;
    if (level === "dpr") this.stage.setPixelRatio(1);
    else if (level === "interaction-only") {
      this.interactionOnly = true;
      this.stage.lights.rest();
      this.stage.lights.snap();
      this.syncPause();
      // a slow device stops the sway: rest on the poster pose (300 ms, like Home), never wherever it happened to be
      const d = this.drag;
      if (d && !d.drag) d.easeTo(d.home + Math.round((d.yaw - d.home) / TAU) * TAU, 300, null);
    }
    this.loop?.invalidate();
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.autoAt = Math.min(this.autoAt, performance.now());
    this.syncPause();
    this.loop?.kick();
  }

  /** The pause button only makes sense while the heart can turn on its own. */
  syncPause() {
    const b = this.pauseBtn;
    if (!b) return;
    b.hidden = prefersReduced.matches || this.interactionOnly;
    b.textContent = this.paused ? tr("Resume turning") : tr("Pause turning");
  }

  /* ------------------------------------------------ leader labels (P1: desktop, live tier) */

  syncLabels() {
    const want = this.tier === "live" && desktopMQ.matches && !!this.stage;
    if (want && !this.labels) {
      const st = this.stage;
      // anchors live in model space, so one computation serves every later rebuild of the stage
      if (!this.anchors && HERO.labels.every((d) => d.at)) {
        this.anchors = new Map(HERO.labels.map((d) => [d.text, new Vector3(...d.at)]));
      }
      if (!this.anchors) {
        if (this.anchorsBusy) return;
        this.anchorsBusy = true;
        computeAnchors(st).then((a) => { this.anchors = a; }, (e) => { console.warn("[stage] labels", e); })
          .finally(() => {
            this.anchorsBusy = false;
            if (this.anchors && this.stage && (this.state === "live" || this.state === "loading")) { this.syncLabels(); this.labels?.measure(); this.loop?.invalidate(); }
          });
        return;
      }
      try { this.labels = new HeroLabels(this, this.anchors); } catch (e) { console.warn("[stage] labels", e); this.labels = null; }
    } else if (!want && this.labels) {
      this.labels.destroy();
      this.labels = null;
    }
  }
}

/* -------------------------------------------------------------------------------------------- */

const _p = new Vector3(), _c = new Vector3(), _toCam = new Vector3();

/**
 * The bbox rules of §8.4 give a point that can sit in empty space, behind another vessel, or on the
 * thin edge where two vessels meet (at the 24° pose the aorta is half hidden behind the superior vena
 * cava). So each such anchor is snapped to the nearest pixel that lies well inside the visible area of
 * that part in the poster pose (a small part-ID render, read back asynchronously so the GPU never
 * stalls), and then onto the vessel surface under that pixel (one raycast against that part only).
 */
async function snapToVisible(st, parts, posePose) {
  const W = Math.max(1, Math.round(st.w / 4)), H = Math.max(1, Math.round(st.h / 4));
  const rt = new WebGLRenderTarget(W, H);
  const swapped = [];
  const ids = new Map();
  parts.forEach((p, i) => p.meshes.forEach((m) => ids.set(m, i + 1)));
  const basic = [];
  st.model.src.traverse((o) => {
    if (!o.isMesh) return;
    const id = ids.get(o) || 0;
    const mat = new MeshBasicMaterial({ toneMapped: false });
    mat.color.setRGB(id * 20 / 255, 0, 0, LinearSRGBColorSpace);
    basic.push(mat);
    swapped.push([o, o.material]);
    o.material = mat;
  });
  const shadowVisible = st.shadow ? st.shadow.visible : false;
  if (st.shadow) st.shadow.visible = false;
  const r = st.renderer;
  const prevTarget = r.getRenderTarget();
  const px = new Uint8Array(W * H * 4);
  const targets = parts.map((p) => p.world.clone().project(st.camera));
  let read;
  const restore = posePose();
  try {
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(st.scene, st.camera);
    // PBO + fence: no synchronous readPixels, so no "GPU stall due to ReadPixels" warning
    read = r.readRenderTargetPixelsAsync ? r.readRenderTargetPixelsAsync(rt, 0, 0, W, H, px) : null;
    if (!read) r.readRenderTargetPixels(rt, 0, 0, W, H, px);
  } finally {
    r.setRenderTarget(prevTarget);
    for (const [o, m] of swapped) o.material = m;
    basic.forEach((m) => m.dispose());
    if (st.shadow) st.shadow.visible = shadowVisible;
    restore();
  }
  try { if (read) await read; } finally { rt.dispose(); }

  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : (px[(y * W + x) * 4 + 3] < 200 ? 0 : px[(y * W + x) * 4]);
  const inside = (x, y, id, rad) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.abs(at(x + dx, y + dy) - id) > 6) return false;
    }
    return true;
  };
  const picks = parts.map((p, i) => {
    const id = (i + 1) * 20;
    const t = targets[i];
    const tx = ((t.x + 1) / 2) * W, ty = ((t.y + 1) / 2) * H;    // render-target rows run bottom-up, like NDC
    // prefer a pixel 2 cells (about 8 CSS px) inside the part, so the ring never sits on a seam
    for (const rad of [2, 1, 0]) {
      let best = -1, bestD = Infinity;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!inside(x, y, id, rad)) continue;
        const d = (x + 0.5 - tx) ** 2 + (y + 0.5 - ty) ** 2;
        if (d < bestD) { bestD = d; best = y * W + x; }
      }
      if (best >= 0) return best;
    }
    return -1;
  });
  const ray = new Raycaster();
  const restore2 = posePose();
  try {
    return parts.map((p, i) => {
      const best = picks[i];
      if (best < 0) return null;
      const ndcX = (((best % W) + 0.5) / W) * 2 - 1, ndcY = ((Math.floor(best / W) + 0.5) / H) * 2 - 1;
      ray.setFromCamera({ x: ndcX, y: ndcY }, st.camera);
      const hit = ray.intersectObjects(p.meshes, false)[0];
      return hit ? st.turn.worldToLocal(hit.point.clone()) : null;
    });
  } finally { restore2(); }
}

/** Anchors in model space (the turning group's local space), computed once after load (§8.4). */
export async function computeAnchors(st) {
  const turn = st.turn, root = st.root;
  const out = new Map();
  const model = st.model.src;
  /** Puts the model in the poster pose for a moment; returns a function that puts it back. */
  const posterPose = () => {
    const keepYaw = turn.rotation.y;
    turn.rotation.y = st.frameYaw;
    root.updateMatrixWorld(true);
    return () => { turn.rotation.y = keepYaw; root.updateMatrixWorld(true); };
  };

  // bbox rules, measured with the model unturned, so world space equals model space
  const keepYaw = turn.rotation.y, keepX = root.position.x, keepY = root.position.y;
  turn.rotation.y = 0;
  root.position.x = 0;
  root.position.y = 0;
  root.updateMatrixWorld(true);
  const boxParts = [];
  for (const def of HERO.labels) {
    if (def.rule !== "bboxTop") continue;
    const meshes = meshesOf(model, def.part);
    if (!meshes.length) continue;
    const b = worldBox(meshes[0]);
    for (const m of meshes.slice(1)) b.union(worldBox(m));
    const c = b.getCenter(new Vector3()), s = b.getSize(new Vector3());
    boxParts.push({ def, meshes, local: new Vector3(c.x, b.max.y - def.f * s.y, c.z) });
  }

  // front-most coronary vertex at the initial pose, among vertices with world y in [yMin, yMax]
  for (const def of HERO.labels) {
    if (def.rule !== "frontVertex") continue;
    turn.rotation.y = st.frameYaw;
    root.updateMatrixWorld(true);
    let best = null, bestZ = -Infinity;
    for (const mesh of meshesOf(model, def.part)) {
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        _p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        if (_p.y < def.yMin || _p.y > def.yMax) continue;
        if (_p.z > bestZ) { bestZ = _p.z; best = _p.clone(); }
      }
    }
    if (best) out.set(def.text, turn.worldToLocal(best));
  }

  // the poster pose, for the projection of the bbox points
  turn.rotation.y = st.frameYaw;
  root.position.x = keepX;
  root.position.y = keepY;
  root.updateMatrixWorld(true);
  for (const p of boxParts) p.world = p.local.clone().applyMatrix4(turn.matrixWorld);
  turn.rotation.y = keepYaw;
  root.updateMatrixWorld(true);

  let snapped = [];
  try { snapped = await snapToVisible(st, boxParts, posterPose); } catch (e) { console.warn("[stage] label snap", e); }
  boxParts.forEach((p, i) => out.set(p.def.text, snapped[i] || p.local));
  return out;
}

class HeroLabels {
  constructor(hero, anchors) {
    this.hero = hero;
    this.el = document.createElement("div");
    this.el.className = "stage__labels";
    this.el.setAttribute("aria-hidden", "true");
    hero.box.appendChild(this.el);
    this.items = [];
    for (const def of HERO.labels) {
      const local = anchors.get(def.text);
      if (!local) continue;
      const el = document.createElement("span");
      el.className = "stage__label is-off";
      el.innerHTML = '<i class="stage__ring"></i><i class="stage__leader"></i><span class="stage__label-text"></span>';
      el.lastChild.textContent = tr(def.text);
      this.el.appendChild(el);
      this.items.push({ def, local, el, w: 0, h: 0 });
    }
    this.measure();
    // label widths change when the web fonts arrive
    document.fonts?.ready.then(() => {
      if (!this.el.isConnected) return;
      this.measure();
      this.hero.loop?.invalidate();
    });
  }

  /** Label sizes and the rects to stay clear of (caption and controls), relative to the box. */
  measure() {
    const box = this.hero.box.getBoundingClientRect();
    this.avoid = [];
    for (const sel of ["figcaption", ".stage__ctrl"]) {
      const n = this.hero.figure.querySelector(sel);
      if (!n || n.hidden) continue;
      const r = n.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      this.avoid.push({ l: r.left - box.left - 8, t: r.top - box.top - 8, r: r.right - box.left + 8, b: r.bottom - box.top + 8 });
    }
    for (const it of this.items) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
  }

  update() {
    const st = this.hero.stage;
    if (!st || !st.ready) return;
    const W = st.w, H = st.h, cam = st.camera;
    st.centre(_c);
    _toCam.copy(cam.position).sub(_c);
    const hits = (r, a) => r.l < a.r && r.r > a.l && r.t < a.b && r.b > a.t;
    const place = (it) => {
      let left = it.flip ? it.x - it.w + 3 : it.x - 3;
      let top = it.y - it.h / 2;
      left = Math.min(Math.max(left, 24), W - 24 - it.w);
      top = Math.min(Math.max(top, 24), H - 24 - it.h);
      it.rect = { l: left, t: top, r: left + it.w, b: top + it.h };
    };
    for (const it of this.items) {
      _p.copy(it.local).applyMatrix4(st.turn.matrixWorld);
      it.facing = _p.clone().sub(_c).dot(_toCam) >= 0;
      _p.project(cam);
      it.x = ((_p.x + 1) / 2) * W;
      it.y = ((1 - _p.y) / 2) * H;
      // flips to the left of its anchor near the right edge (78%), or when it would not fit on the right
      it.flip = it.x > 0.78 * W || it.x - 3 + it.w > W - 24;
      place(it);
    }
    // two labels on the same side that collide: the one anchored further out swaps sides
    const shown = [];
    for (const it of [...this.items].sort((a, b) => a.y - b.y)) {
      it.off = !it.facing || this.avoid.some((a) => hits(it.rect, a));
      if (!it.off) {
        const other = shown.find((o) => hits(it.rect, o.rect));
        if (other) {
          const mover = it.flip === other.flip ? (it.flip ? (it.x > other.x ? it : other) : (it.x < other.x ? it : other)) : it;
          mover.flip = !mover.flip;
          place(mover);
          const clash = (x) => this.avoid.some((a) => hits(x.rect, a)) || shown.some((o) => o !== x && hits(x.rect, o.rect)) || (x !== it && hits(x.rect, it.rect));
          if (clash(mover)) { mover.flip = !mover.flip; place(mover); it.off = true; }
        }
        if (!it.off && shown.some((o) => hits(it.rect, o.rect))) it.off = true;
      }
      if (!it.off) shown.push(it);
    }
    for (const it of this.items) {
      it.el.style.transform = `translate(${it.rect.l.toFixed(1)}px, ${it.rect.t.toFixed(1)}px)`;
      it.el.classList.toggle("is-flip", it.flip);
      it.el.classList.toggle("is-off", it.off);
    }
  }

  destroy() { this.el.remove(); }
}
