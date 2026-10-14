/* CareNova 3D stage: shared core (spec §8.3).
   Loaded dynamically by the scene modules and by the bake page. Imports three.js.
   Renderer factory, GLB loader and cache, porcelain kit, lights, contact shadow, framing,
   DragYaw, Loop with the frame-time guard, context-loss handling and the LiveStage base class. */

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Box3, Vector3, Color, MathUtils,
  SRGBColorSpace, NeutralToneMapping, PMREMGenerator, DirectionalLight, HemisphereLight,
  MeshStandardMaterial, MeshBasicMaterial, CircleGeometry, DoubleSide, DataTexture, RGBAFormat,
  LinearFilter,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { isDark, prefersReduced, onThemeChange, markOff } from "./caps.js";

export const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const FOV = 24;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

/* ---------------------------------------------------------------- tokens */

/* Spec §2 values. Used when the stylesheet does not define a token, and by the bake page (preset "light"). */
export const TOKENS = {
  light: {
    porcelain: "#F1ECE4", bisque: "#E6DED2", cool: "#E2E4DF", accent: "#0F5C4D", glassOpacity: 0.28,
    shadowColor: "#0B1210", shadowAlpha: 0.08, env: 0.7, key: 1.9, rim: 0.8, rimColor: "#FFFFFF",
    hemi: 0.5, hemiGround: "#D9D2C6",
  },
  dark: {
    porcelain: "#E9E4DB", bisque: "#DCD4C8", cool: "#D5D8D2", accent: "#3FAF8C", glassOpacity: 0.28,
    shadowColor: "#000000", shadowAlpha: 0.35, env: 0.45, key: 1.4, rim: 0.9, rimColor: "#BFEFDC",
    hemi: 0.35, hemiGround: "#30302C",
  },
};
const VARS = {
  porcelain: "--p3d-porcelain", bisque: "--p3d-bisque", cool: "--p3d-cool", accent: "--p3d-accent",
  glassOpacity: "--p3d-glass-opacity", shadowColor: "--p3d-shadow-color", shadowAlpha: "--p3d-shadow-alpha",
  env: "--p3d-env", key: "--p3d-key", rim: "--p3d-rim", rimColor: "--p3d-rim-color",
  hemi: "--p3d-hemi", hemiGround: "--p3d-hemi-ground",
};

/** Reads the --p3d-* tokens from <html>. `preset` ("light" | "dark") skips the stylesheet. */
export function readTokens(preset) {
  if (preset) return { ...TOKENS[preset] };
  const base = TOKENS[isDark() ? "dark" : "light"];
  const cs = getComputedStyle(document.documentElement);
  const t = {};
  for (const k in VARS) {
    const raw = cs.getPropertyValue(VARS[k]).trim();
    if (!raw) { t[k] = base[k]; continue; }
    if (typeof base[k] === "number") { const n = parseFloat(raw); t[k] = Number.isFinite(n) ? n : base[k]; }
    else t[k] = raw;
  }
  return t;
}

/* ---------------------------------------------------------------- renderer, environment */

export function createRenderer(canvas, { dprCap = 2, preserveDrawingBuffer = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  return renderer;
}

export function makeEnvironment(renderer) {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const rt = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  return rt;
}

/** compileAsync where KHR_parallel_shader_compile exists (no long task); a plain compile otherwise. */
export async function compileScene(renderer, scene, camera) {
  try {
    if (renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  } catch { /* compiles on the first render instead */ }
}

/* ---------------------------------------------------------------- lights */

const KEY_REST = new Vector3(-2.2, 3, 3.2);
const REST_AZ = Math.atan2(KEY_REST.x, KEY_REST.z);
const REST_EL = Math.asin(KEY_REST.y / KEY_REST.length());
const KEY_R = 4.5;

/** Key, rim and hemisphere fill. `aim(px, py)` moves the key light with the cursor (±17° azimuth, ±9° elevation). */
export function makeLights(t) {
  const key = new DirectionalLight(0xffffff, t.key);
  const rim = new DirectionalLight(new Color(t.rimColor), t.rim);
  rim.position.set(3, 1, -3);
  const hemi = new HemisphereLight(0xffffff, new Color(t.hemiGround), t.hemi);
  const group = new Group();
  group.add(key, rim, hemi);
  const s = { az: 0, el: 0, taz: 0, tel: 0 };
  const place = () => {
    const az = REST_AZ + s.az, el = REST_EL + s.el;
    key.position.set(KEY_R * Math.cos(el) * Math.sin(az), KEY_R * Math.sin(el), KEY_R * Math.cos(el) * Math.cos(az));
  };
  place();
  return {
    group, key, rim, hemi,
    update(t) {
      key.intensity = t.key;
      rim.color.set(t.rimColor); rim.intensity = t.rim;
      hemi.groundColor.set(t.hemiGround); hemi.intensity = t.hemi;
    },
    /** px, py in [-1, 1] across the stage box; py grows downwards. */
    aim(px, py) { s.taz = clamp(px, -1, 1) * 17 * DEG; s.tel = -clamp(py, -1, 1) * 9 * DEG; },
    rest() { s.taz = 0; s.tel = 0; },
    snap() { s.az = s.taz; s.el = s.tel; place(); },
    get easing() { return Math.abs(s.taz - s.az) > 1e-4 || Math.abs(s.tel - s.el) > 1e-4; },
    /** One lerp(0.08) step per rendered frame. Returns true while still easing. */
    step() {
      if (!this.easing) { if (s.az !== s.taz || s.el !== s.tel) { s.az = s.taz; s.el = s.tel; place(); } return false; }
      s.az += (s.taz - s.az) * 0.08;
      s.el += (s.tel - s.el) * 0.08;
      place();
      return true;
    },
  };
}

/* ---------------------------------------------------------------- porcelain kit and parts */

export const ROLES = ["porcelain", "bisque", "cool", "accent", "glass"];

export class Kit {
  constructor(t) {
    const std = (color, roughness, extra = {}) => new MeshStandardMaterial({ color: new Color(color), roughness, metalness: 0, ...extra });
    this.porcelain = std(t.porcelain, 0.52, { side: DoubleSide });
    this.bisque = std(t.bisque, 0.55);
    this.cool = std(t.cool, 0.55);
    this.accent = std(t.accent, 0.42);
    this.glass = std(t.porcelain, 0.4, { transparent: true, opacity: t.glassOpacity, depthWrite: false, side: DoubleSide });
  }
  update(t) {
    this.porcelain.color.set(t.porcelain);
    this.bisque.color.set(t.bisque);
    this.cool.color.set(t.cool);
    this.accent.color.set(t.accent);
    this.glass.color.set(t.porcelain);
    this.glass.opacity = t.glassOpacity;
  }
  dispose() { for (const r of ROLES) this[r].dispose(); }
}

/** Map of node name -> role for a SPECIMENS entry. */
export function partRoles(spec) {
  const m = new Map();
  for (const role of ["accent", "glass", "bisque", "cool"]) for (const n of spec[role] || []) m.set(n, role);
  return m;
}

/** gltfpack -kn keeps names on the parent node of an unnamed mesh, so walk the ancestors. */
export function partName(o, parts) {
  for (let n = o; n; n = n.parent) if (n.name && parts.has(n.name)) return n.name;
  return null;
}

/** Meshes that belong to the named node (the node itself or any ancestor carries the name). */
export function meshesOf(root, name) {
  const out = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (let n = o; n && n !== root.parent; n = n.parent) if (n.name === name) { out.push(o); break; }
  });
  return out;
}

export function applyKit(root, spec, kit) {
  const roles = partRoles(spec);
  const old = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material || [])) old.add(m);
    const p = partName(o, roles);
    const role = p ? roles.get(p) : "porcelain";
    o.material = kit[role];
    o.renderOrder = role === "glass" ? 2 : role === "accent" ? 1 : 0;
    o.userData.role = role;
  });
  for (const m of old) if (!ROLES.some((r) => kit[r] === m)) m.dispose();
}

/* ---------------------------------------------------------------- contact shadow */

function radialTexture() {
  const n = 64, d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5) / n * 2 - 1, dy = (y + 0.5) / n * 2 - 1;
    const a = clamp(1 - Math.hypot(dx, dy), 0, 1);
    const v = Math.round(255 * a * a * (3 - 2 * a));
    const i = (y * n + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  const tex = new DataTexture(d, n, n, RGBAFormat);
  tex.minFilter = tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** CircleGeometry(0.9) ellipse under the model. A radial alpha map keeps its edge soft. */
export function makeContactShadow(t) {
  const mat = new MeshBasicMaterial({
    color: new Color(t.shadowColor), transparent: true, opacity: t.shadowAlpha, depthWrite: false, alphaMap: radialTexture(),
  });
  const mesh = new Mesh(new CircleGeometry(0.9, 48), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(1, 0.34, 1);
  mesh.renderOrder = -1;
  return mesh;
}

/* ---------------------------------------------------------------- framing */

/** World bbox of `object` as it stands (precise: uses vertices, so a turned model gets a tight box). */
export function worldBox(object) {
  object.updateWorldMatrix(true, true);
  return new Box3().setFromObject(object, true);
}

/** §8.3 framing for a bbox { center, size }. Camera at distance d from the centre, at the given elevation. */
export function frameBox(camera, { center, size }, { fill, aspect, elevationDeg }) {
  const t = Math.tan((camera.fov * DEG) / 2);
  const d = Math.max(size.y / (2 * t * fill), size.x / (2 * t * fill * aspect)) + size.z / 2;
  const e = elevationDeg * DEG;
  camera.aspect = aspect;
  camera.position.set(center.x, center.y + d * Math.sin(e), center.z + d * Math.cos(e));
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return d;
}

export function frameModel(camera, object, opts) {
  const b = worldBox(object);
  return frameBox(camera, { center: b.getCenter(new Vector3()), size: b.getSize(new Vector3()) }, opts);
}

/* ---------------------------------------------------------------- loading */

const buffers = new Map();
let gltfLoader = null;

/** Site-root-relative path ("assets/models/heart.mo.glb") -> absolute URL, independent of the page's location. */
export function assetUrl(path) {
  return new URL("../../" + path, import.meta.url).href;
}

/** Fetches once and keeps the ArrayBuffer, so re-creating a scene after disposal costs no network. */
export function fetchBuffer(path) {
  const url = assetUrl(path);
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
      return r.arrayBuffer();
    });
    p.catch(() => buffers.delete(url));
    buffers.set(url, p);
  }
  return p;
}

export async function loadModel(path) {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  const buf = await fetchBuffer(path);
  const gltf = await gltfLoader.parseAsync(buf, assetUrl(path).replace(/[^/]*$/, ""));
  return gltf.scene;
}

/** Disposes geometries (and non-kit materials) under `root`. */
export function disposeTree(root, kit) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    for (const m of [].concat(o.material || [])) {
      if (kit && ROLES.some((r) => kit[r] === m)) continue;
      if (m.alphaMap) m.alphaMap.dispose();
      m.dispose();
    }
  });
}

/* ---------------------------------------------------------------- ModelStage: one renderer, one porcelain specimen */

export class ModelStage {
  /**
   * box: element the canvas fills (absolute, inset 0). Options:
   *   dprCap, preset ("light" for the bake), shadow (contact shadow mesh), preserveDrawingBuffer,
   *   width/height (fixed size instead of the box's client size, for the bake)
   */
  constructor(box, opts = {}) {
    this.box = box;
    this.o = { dprCap: 2, preset: null, shadow: true, preserveDrawingBuffer: false, width: 0, height: 0, ...opts };
    this.yaw = 0;
    this.frameYaw = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.model = null;
    this.w = 0; this.h = 0;
  }

  init() {
    const c = document.createElement("canvas");
    c.className = "stage__canvas";
    c.setAttribute("aria-hidden", "true");
    this.box.appendChild(c);
    this.canvas = c;
    try {
      this.renderer = createRenderer(c, { dprCap: this.o.dprCap, preserveDrawingBuffer: this.o.preserveDrawingBuffer });
    } catch (e) {
      c.remove();
      throw e;
    }
    this.scene = new Scene();
    this.envRT = makeEnvironment(this.renderer);
    this.scene.environment = this.envRT.texture;
    this.tokens = readTokens(this.o.preset);
    this.scene.environmentIntensity = this.tokens.env;
    this.lights = makeLights(this.tokens);
    this.scene.add(this.lights.group);
    this.kit = new Kit(this.tokens);
    this.root = new Group();   // carries the x offset and the contact shadow
    this.turn = new Group();   // carries the yaw
    this.root.add(this.turn);
    this.scene.add(this.root);
    if (this.o.shadow) {
      this.shadow = makeContactShadow(this.tokens);
      this.root.add(this.shadow);
    }
    this.camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
    this.size();
    return this;
  }

  /** Loads a model, applies the porcelain kit and centres it on the turning axis. */
  async load(spec, path) {
    const src = await loadModel(path);
    return this.prepare(src, spec);
  }

  prepare(src, spec) {
    applyKit(src, spec, this.kit);
    const b = worldBox(src);
    src.position.sub(b.getCenter(new Vector3()));
    const holder = new Group();
    holder.add(src);
    holder.updateMatrixWorld(true);
    return { obj: holder, spec, src };
  }

  /** Puts a prepared model on the stage, framed at yawDeg (§8.3). */
  setModel(entry, { yawDeg = entry.spec.yaw, offsetX = 0, offsetY = 0, startYawDeg = yawDeg } = {}) {
    if (this.model && this.model !== entry) this.turn.remove(this.model.obj);
    this.model = entry;
    this.turn.add(entry.obj);
    this.frameYaw = yawDeg * DEG;
    this.yaw = startYawDeg * DEG;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.measure();
    this.frame();
  }

  /** Framing box at the framing yaw, with the model at the origin (offset is applied after framing). */
  measure() {
    const keepYaw = this.turn.rotation.y, keepX = this.root.position.x, keepY = this.root.position.y;
    this.turn.rotation.y = this.frameYaw;
    this.root.position.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
    const b = worldBox(this.model.obj);
    this.fb = { center: b.getCenter(new Vector3()), size: b.getSize(new Vector3()), minY: b.min.y };
    this.turn.rotation.y = keepYaw;
    this.root.position.x = keepX;
    this.root.position.y = keepY;
    this.root.updateMatrixWorld(true);
  }

  frame() {
    if (!this.model || !this.w || !this.h) return;
    const s = this.model.spec;
    frameBox(this.camera, this.fb, { fill: s.fill, aspect: this.w / this.h, elevationDeg: s.elev });
    this.root.position.x = this.offsetX;
    this.root.position.y = this.offsetY;   // after framing: moves the model and its shadow up in the frame
    if (this.shadow) this.shadow.position.set(0, this.fb.minY - 0.06, 0);
    this.root.updateMatrixWorld(true);
  }

  setOffset(x, y = this.offsetY) { this.offsetX = x; this.offsetY = y; this.frame(); }

  /** Reads the box size (or the fixed size). Returns true when the size changed. */
  size() {
    const w = this.o.width || this.box.clientWidth, h = this.o.height || this.box.clientHeight;
    if (w === this.w && h === this.h) return false;
    this.w = w; this.h = h;
    if (w && h) this.renderer.setSize(w, h, false);
    this.frame();
    return true;
  }

  setPixelRatio(r) {
    this.renderer.setPixelRatio(r);
    if (this.w && this.h) this.renderer.setSize(this.w, this.h, false);
  }

  setTokens(t) {
    this.tokens = t;
    this.kit.update(t);
    this.lights.update(t);
    this.scene.environmentIntensity = t.env;
    if (this.shadow) { this.shadow.material.color.set(t.shadowColor); this.shadow.material.opacity = t.shadowAlpha; }
  }

  async compile() { await compileScene(this.renderer, this.scene, this.camera); }

  get ready() { return !!(this.model && this.w && this.h); }

  render() {
    if (!this.ready) return false;
    this.turn.rotation.y = this.yaw;
    this.renderer.render(this.scene, this.camera);
    return true;
  }

  /** World-space centre of the turning axis at model height (for facing tests). */
  centre(out = new Vector3()) {
    return out.set(this.offsetX, (this.fb ? this.fb.center.y : 0) + this.offsetY, 0);
  }

  dispose() {
    this.disposed = true;
    if (this.model) disposeTree(this.model.obj, this.kit);
    if (this.shadow) { this.shadow.geometry.dispose(); this.shadow.material.alphaMap?.dispose(); this.shadow.material.dispose(); }
    this.kit?.dispose();
    this.envRT?.dispose();
    if (this.renderer) {
      let gl = null;
      try { gl = this.renderer.getContext(); } catch {}
      this.renderer.dispose();
      if (gl && !gl.isContextLost()) this.renderer.forceContextLoss();
    }
    this.canvas?.remove();
    this.model = null;
  }
}

/* ---------------------------------------------------------------- DragYaw */

/**
 * Pointer drag (with capture) turns the model: yaw += dx * 0.008 rad, inertia v *= 0.92 per frame.
 * Keyboard on the focused box: ←/→ turn 15° eased over 300 ms, Home resets. turnBy() serves [data-turn] buttons.
 */
export class DragYaw {
  constructor(el, { yaw = 0, home = yaw, reduced = () => false, onStart, onEnd, onInput } = {}) {
    Object.assign(this, { el, yaw, home, reduced, onStart, onEnd, onInput });
    this.v = 0;
    this.drag = null;
    this.ease = null;
    this.enabled = true;
    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);
    this._key = this._key.bind(this);
    el.addEventListener("pointerdown", this._down);
    el.addEventListener("pointermove", this._move);
    el.addEventListener("pointerup", this._up);
    el.addEventListener("pointercancel", this._up);
    el.addEventListener("lostpointercapture", this._up);
    el.addEventListener("keydown", this._key);
  }

  _down(e) {
    if (!this.enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    this.drag = { id: e.pointerId, x: e.clientX, t: e.timeStamp, vx: 0 };
    try { this.el.setPointerCapture(e.pointerId); } catch {}
    this.v = 0;
    this.ease = null;
    this.el.classList.add("is-dragging");
    this.onStart?.("drag");
  }

  _move(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    const dt = Math.max(1, e.timeStamp - d.t);
    d.vx = 0.6 * d.vx + 0.4 * (dx / dt);
    d.x = e.clientX;
    d.t = e.timeStamp;
    if (dx) { this.yaw += dx * 0.008; this.onInput?.(); }
  }

  _up(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    this.el.classList.remove("is-dragging");
    try { this.el.releasePointerCapture(e.pointerId); } catch {}
    const idle = e.timeStamp - d.t;
    this.v = idle > 80 || this.reduced() || e.type === "pointercancel" ? 0 : clamp(d.vx * 0.008 * 16.67, -0.2, 0.2);
    this.onEnd?.("drag");
    this.onInput?.();
  }

  _key(e) {
    if (!this.enabled || e.target !== this.el || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") this.turnBy(-1);
    else if (e.key === "ArrowRight") this.turnBy(1);
    else if (e.key === "Home") this.reset();
    else return;
    e.preventDefault();
  }

  /** dir -1 turns the front to the viewer's left, +1 to the right, 15° per step. */
  turnBy(dir) {
    const base = this.ease ? this.ease.to : this.yaw;
    this.easeTo(base + dir * 15 * DEG, 300, "key");
  }

  /** Back to the starting pose, the short way round. */
  reset() {
    const k = Math.round((this.yaw - this.home) / TAU);
    this.easeTo(this.home + k * TAU, 300, "key");
  }

  easeTo(to, dur = 300, why = "key") {
    this.v = 0;
    if (this.reduced() || dur <= 0) { this.yaw = to; this.ease = null; }
    else this.ease = { from: this.yaw, to, t0: performance.now(), dur };
    if (why) { this.onStart?.(why); this.onEnd?.(why); }
    this.onInput?.();
  }

  get moving() { return !!this.drag || !!this.ease || Math.abs(this.v) >= 0.0005; }

  /** Advances easing and inertia. Returns true while something is still moving. */
  step(now = performance.now()) {
    if (this.ease) {
      const { from, to, t0, dur } = this.ease;
      const k = clamp((now - t0) / dur, 0, 1);
      this.yaw = from + (to - from) * easeOut(k);
      if (k >= 1) this.ease = null;
      return true;
    }
    if (!this.drag && this.v) {
      this.yaw += this.v;
      this.v *= 0.92;
      if (Math.abs(this.v) < 0.0005) this.v = 0;
      return true;
    }
    return !!this.drag;
  }

  dispose() {
    const el = this.el;
    el.removeEventListener("pointerdown", this._down);
    el.removeEventListener("pointermove", this._move);
    el.removeEventListener("pointerup", this._up);
    el.removeEventListener("pointercancel", this._up);
    el.removeEventListener("lostpointercapture", this._up);
    el.removeEventListener("keydown", this._key);
    el.classList.remove("is-dragging");
  }
}

/* ---------------------------------------------------------------- Loop */

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

/**
 * Render on demand. `ctrl` provides:
 *   needs(now) -> 0 (idle), 1 (auto-turn only: throttled to 30 fps), 2 (full rate)
 *   update(dt, now), draw()
 * Frame-time guard: while frames run back to back, each rendered frame records the time since the previous
 * rendered frame divided by the animation frames in between. That is the real frame time, CPU plus GPU
 * back-pressure, independent of the 30 fps throttle. 60 samples with a median over 34 ms -> onGuard("dpr");
 * 60 more with a median over 50 ms -> onGuard("interaction-only").
 */
export class Loop {
  constructor(ctrl, { onGuard } = {}) {
    this.ctrl = ctrl;
    this.onGuard = onGuard;
    this.raf = 0;
    this.dirty = false;
    this.visible = true;
    this.alive = true;
    this.lastTick = 0;
    this.lastRender = 0;
    this.prevRender = 0;   // start of the previous rendered frame in an unbroken chain (0 = no chain)
    this.frames = 0;       // animation frames since prevRender
    this.samples = [];
    this.phase = 0;
    this._frame = this._frame.bind(this);
    this._vis = () => (document.hidden ? this._cancel() : this.invalidate());
    document.addEventListener("visibilitychange", this._vis);
  }

  get running() { return this.alive && this.visible && !document.hidden; }

  /** Request one frame (resize, theme change, model swap, input). */
  invalidate() { this.dirty = true; this._schedule(); }

  /** Re-check ctrl.needs() without forcing a frame (auto-turn resume, light easing). */
  kick() { this._schedule(); }

  setVisible(v) {
    this.visible = v;
    if (v) this.invalidate(); else this._cancel();
  }

  _schedule() {
    if (!this.raf && this.running) this.raf = requestAnimationFrame(this._frame);
  }

  _idle() {
    this.lastTick = 0;
    this.prevRender = 0;
    this.frames = 0;
  }

  _cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this._idle();
  }

  _frame() {
    this.raf = 0;
    if (!this.running) return;
    const now = performance.now();
    if (this.prevRender) this.frames++;
    const need = Math.max(this.dirty ? 2 : 0, this.ctrl.needs(now));
    if (!need) { this._idle(); return; }
    if (need === 1 && now - this.lastRender < 33) { this._schedule(); return; }
    const dt = this.lastTick ? Math.min(0.1, (now - this.lastTick) / 1000) : 1 / 60;
    this.lastTick = now;
    this.dirty = false;
    this.ctrl.update(dt, now);
    this.ctrl.draw();
    if (this.prevRender && this.frames) this._sample((now - this.prevRender) / this.frames);
    this.lastRender = now;
    if (this.dirty || this.ctrl.needs(now)) {
      this.prevRender = now;
      this.frames = 0;
      this._schedule();
    } else this._idle();
  }

  _sample(ms) {
    if (this.phase > 1) return;
    this.samples.push(ms);
    if (this.samples.length < 60) return;
    const med = median(this.samples);
    this.samples = [];
    if (this.phase === 0) {
      if (med > 34) { this.phase = 1; this.onGuard?.("dpr", med); }
      else this.phase = 2;
    } else {
      this.phase = 2;
      if (med > 50) this.onGuard?.("interaction-only", med);
    }
  }

  dispose() {
    this.alive = false;
    this._cancel();
    this.gl = null;
    document.removeEventListener("visibilitychange", this._vis);
  }
}

/* ---------------------------------------------------------------- poster <-> canvas */

const REVEAL_MS = 400;

/** Canvas opacity 0 -> 1 over 400 ms (CSS), then the box gets .is-live, which hides the poster. */
export function revealCanvas(canvas, box, ms = REVEAL_MS) {
  return new Promise((resolve) => {
    if (!canvas.isConnected) return resolve(false);
    void canvas.offsetWidth;   // commit opacity 0 so the transition runs
    canvas.classList.add("is-on");
    const t = prefersReduced.matches ? 0 : ms;
    setTimeout(() => { if (canvas.isConnected) box.classList.add("is-live"); resolve(true); }, t);
  });
}

/** Poster back on immediately; the canvas fades out. */
export function hideCanvas(canvas, box) {
  box.classList.remove("is-live");
  canvas?.classList.remove("is-on");
}

/** Calls onLost for a real context loss. `isOurs()` returns true while we are disposing on purpose. */
export function watchContextLoss(canvas, onLost, isOurs = () => false) {
  const h = (e) => { e.preventDefault(); if (!isOurs()) onLost(e); };
  canvas.addEventListener("webglcontextlost", h, false);
  return () => canvas.removeEventListener("webglcontextlost", h, false);
}

/* ---------------------------------------------------------------- turnable box (§15) */

/**
 * A stage box is a tab stop with turning instructions only while it can really be turned (live 3D):
 * role="img", tabindex="0", aria-label. With `label` null it stops being a tab stop; it keeps a
 * programmatic tabindex of -1 only if it holds focus right now, so focus never drops to <body>.
 * `still` is the label (or null to remove role and label) for the box when it is not live.
 */
export function setTurnable(box, label, still = null) {
  if (!box) return;
  if (label) {
    box.setAttribute("role", "img");
    box.setAttribute("tabindex", "0");
    box.setAttribute("aria-label", label);
    return;
  }
  if (document.activeElement === box) box.setAttribute("tabindex", "-1");
  else box.removeAttribute("tabindex");
  if (still) { box.setAttribute("role", "img"); box.setAttribute("aria-label", still); }
  else { box.removeAttribute("role"); box.removeAttribute("aria-label"); }
}

/* ---------------------------------------------------------------- LiveStage base */

/**
 * Lifecycle shared by the hero, cabinet and volume controllers:
 *   start() -> build()   (subclass; throws on failure -> the poster stays)
 *   suspend()            (context budget or inactivity: dispose, poster back, resume on next intersection)
 *   lost()               (real context loss: poster back for the session, sessionStorage cn-3d-off = 1)
 * Subclasses implement build(), teardown(), and optionally onTheme(), onVisible(v).
 */
export class LiveStage {
  constructor(box, { budget = null, controls = [] } = {}) {
    this.box = box;
    this.budget = budget;
    this.controls = controls;     // elements hidden on loss/failure (.stage__ctrl, .stage__load, ...)
    this.state = "idle";          // idle | loading | live | suspended | failed | dead
    this.visible = false;
    this.io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      this.visible = e.isIntersecting;
      this._onVisibility();
    }, { threshold: 0 });
    this.io.observe(box);
    this.unTheme = onThemeChange(() => { if (this.state === "live") this.onTheme?.(); });
  }

  _onVisibility() {
    if (this.state === "live") this.onVisible?.(this.visible);
    else if (this.visible && this.state === "suspended" && this.autoResume !== false) this.start();
  }

  async start() {
    if (this.state === "loading" || this.state === "live" || this.state === "dead" || this.state === "failed") return this;
    this.budget?.acquire(this);
    this.state = "loading";
    try {
      await this.build();
      if (this.state !== "loading") return this;   // suspended or lost while loading
      this.state = "live";
      this.onVisible?.(this.visible);
    } catch (err) {
      if (this.state === "loading") this.fail(err);
    }
    return this;
  }

  fail(err) {
    console.warn("[stage] 3D view unavailable, keeping the still image.", err && err.message ? err.message : err);
    this.state = "failed";
    this._down();
    for (const el of this.controls) if (el) el.hidden = true;
  }

  /** Context budget or inactivity: free the WebGL context; the poster returns until the box intersects again. */
  suspend() {
    if (this.state !== "live" && this.state !== "loading") return;
    this.state = "suspended";
    this._down();
  }

  /** Real context loss (not one we forced): poster for the rest of the session. */
  lost() {
    if (this.state === "dead") return;
    markOff();
    this.state = "dead";
    const canvas = this.canvas;
    hideCanvas(canvas, this.box);
    for (const el of this.controls) if (el) el.hidden = true;
    setTimeout(() => this._down(), prefersReduced.matches ? 0 : REVEAL_MS);
  }

  _down() {
    this.budget?.release(this);
    hideCanvas(this.canvas, this.box);
    try { this.teardown(); } catch (e) { console.warn("[stage] teardown", e); }
  }

  get canvas() { return this.box.querySelector(":scope > .stage__canvas"); }

  /** Distance of the box from the viewport in px (0 when on screen, Infinity when not displayed). */
  distance() {
    const r = this.box.getBoundingClientRect();
    if (!r.width && !r.height) return Infinity;
    if (r.bottom < 0) return -r.bottom;
    if (r.top > innerHeight) return r.top - innerHeight;
    return 0;
  }

  destroy() {
    this.suspend();
    this.state = "dead";
    this.io.disconnect();
    this.unTheme();
  }
}

export { MathUtils, Vector3 };
