/* CareNova 3D stage: stent CT volume with a Contrast slider (spec §8.7, P1, live tier only).
   Loaded dynamically by boot.js when the "cath" chapter first activates, and by the bake page (stent-mip-1040.webp).
   DOM: .stage__box[data-stage="volume"] with img.stage__poster; #stentContrast (inside a <label>, hidden until rendered);
   the TR readout (.lb-read--tr) of the enclosing .lb-plate shows "Rotation N°". */

import {
  WebGLRenderer, Scene, OrthographicCamera, Group, Mesh, BoxGeometry, ShaderMaterial, UniformsUtils,
  Data3DTexture, DataTexture, RedFormat, RGBAFormat, UnsignedByteType, LinearFilter, BackSide,
  NoColorSpace, NoToneMapping, SRGBColorSpace,
} from "three";
import { NRRDLoader } from "three/addons/loaders/NRRDLoader.js";
import { VolumeRenderShader1 } from "three/addons/shaders/VolumeShader.js";
import { fetchBuffer, compileScene, DragYaw, Loop, LiveStage, revealCanvas, watchContextLoss, DEG } from "./core.js";
import { prefersReduced } from "./caps.js";

export const STENT = {
  path: "assets/models/ct-stent.nrrd",
  yaw: 30,          // degrees
  contrast: 25,     // slider default; gives u_clim (0.1, 0.9)
  tilt: -Math.PI / 2, // stands the long axis upright with the bifurcation at the bottom (checked in the bake)
  clear: "#0D2621",
};

/* Brand ramp: #0D2621 (0) -> #0F5C4D (0.33) -> #7FE0BE (0.66) -> #F3FBF7 (1), sRGB bytes, no colour management. */
const RAMP = [[0, 0x0d2621], [0.33, 0x0f5c4d], [0.66, 0x7fe0be], [1, 0xf3fbf7]];

function rampTexture() {
  const d = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < RAMP.length - 2 && t > RAMP[k + 1][0]) k++;
    const [t0, c0] = RAMP[k], [t1, c1] = RAMP[k + 1];
    const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    for (let ch = 0; ch < 3; ch++) {
      const sh = 16 - ch * 8;
      const a = (c0 >> sh) & 255, b = (c1 >> sh) & 255;
      d[i * 4 + ch] = Math.round(a + (b - a) * f);
    }
    d[i * 4 + 3] = 255;
  }
  const tex = new DataTexture(d, 256, 1, RGBAFormat);
  tex.colorSpace = NoColorSpace;
  tex.minFilter = tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

let volumePromise = null;
/** Parsed once per page; the ArrayBuffer is cached by core.fetchBuffer as well. */
export function loadStentVolume() {
  if (!volumePromise) {
    volumePromise = fetchBuffer(STENT.path).then((buf) => new NRRDLoader().parse(buf));
    volumePromise.catch(() => { volumePromise = null; });
  }
  return volumePromise;
}

export function contrastToClim(v) {
  const c = Math.min(100, Math.max(0, +v)) / 100;
  return [0.4 * c, 1 - 0.4 * c];
}

/** One renderer drawing the volume as a maximum-intensity projection. */
export class VolumeView {
  constructor(box, { dprCap = 1.5, preserveDrawingBuffer = false, width = 0, height = 0 } = {}) {
    this.box = box;
    this.o = { dprCap, preserveDrawingBuffer, width, height };
    this.yaw = STENT.yaw * DEG;
    this.w = 0; this.h = 0;
  }

  init(volume) {
    const c = document.createElement("canvas");
    c.className = "stage__canvas";
    c.setAttribute("aria-hidden", "true");
    this.box.appendChild(c);
    this.canvas = c;
    try {
      this.renderer = new WebGLRenderer({
        canvas: c, antialias: false, alpha: false, powerPreference: "low-power",
        preserveDrawingBuffer: this.o.preserveDrawingBuffer,
      });
    } catch (e) { c.remove(); throw e; }
    const r = this.renderer;
    r.setClearColor(STENT.clear, 1);
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = NoToneMapping;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.o.dprCap));

    const nx = volume.xLength, ny = volume.yLength, nz = volume.zLength;
    const tex = new Data3DTexture(volume.data, nx, ny, nz);
    tex.format = RedFormat;
    tex.type = UnsignedByteType;
    tex.minFilter = tex.magFilter = LinearFilter;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    this.tex = tex;
    this.ramp = rampTexture();

    const uniforms = UniformsUtils.clone(VolumeRenderShader1.uniforms);
    uniforms.u_data.value = tex;
    uniforms.u_size.value.set(nx, ny, nz);
    uniforms.u_renderstyle.value = 0;          // maximum-intensity projection
    uniforms.u_renderthreshold.value = 0.15;
    uniforms.u_clim.value.set(...contrastToClim(STENT.contrast));
    uniforms.u_cmdata.value = this.ramp;
    this.material = new ShaderMaterial({
      uniforms,
      vertexShader: VolumeRenderShader1.vertexShader,
      fragmentShader: VolumeRenderShader1.fragmentShader,
      side: BackSide,
    });
    this.geometry = new BoxGeometry(nx, ny, nz).translate(nx / 2 - 0.5, ny / 2 - 0.5, nz / 2 - 0.5);
    const mesh = new Mesh(this.geometry, this.material);
    mesh.position.set(-(nx / 2 - 0.5), -(ny / 2 - 0.5), -(nz / 2 - 0.5));
    const pivot = new Group();
    pivot.add(mesh);
    pivot.rotation.x = STENT.tilt;
    this.turn = new Group();
    this.turn.add(pivot);
    this.scene = new Scene();
    this.scene.add(this.turn);
    this.extent = nz * 1.1;                     // framed to 256 x 1.1 units tall
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, 4000);
    this.camera.position.set(0, 0, 2000);
    this.camera.lookAt(0, 0, 0);
    this.size();
    return this;
  }

  size() {
    const w = this.o.width || this.box.clientWidth, h = this.o.height || this.box.clientHeight;
    if (w === this.w && h === this.h) return false;
    this.w = w; this.h = h;
    if (!w || !h) return true;
    this.renderer.setSize(w, h, false);
    const H = this.extent, W = H * (w / h);
    Object.assign(this.camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 });
    this.camera.updateProjectionMatrix();
    return true;
  }

  setPixelRatio(r) {
    this.renderer.setPixelRatio(r);
    if (this.w && this.h) this.renderer.setSize(this.w, this.h, false);
  }

  setContrast(v) { this.material.uniforms.u_clim.value.set(...contrastToClim(v)); }

  async compile() { await compileScene(this.renderer, this.scene, this.camera); }

  render() {
    if (!this.w || !this.h) return false;
    this.turn.rotation.y = this.yaw;
    this.renderer.render(this.scene, this.camera);
    return true;
  }

  dispose() {
    this.disposed = true;
    this.geometry?.dispose();
    this.material?.dispose();
    this.tex?.dispose();
    this.ramp?.dispose();
    if (this.renderer) {
      let gl = null;
      try { gl = this.renderer.getContext(); } catch {}
      this.renderer.dispose();
      if (gl && !gl.isContextLost()) this.renderer.forceContextLoss();
    }
    this.canvas?.remove();
  }
}

/** Bake helper: one opaque frame at a fixed size. */
export async function bakeVolume(box, { w, h, yawDeg = STENT.yaw, contrast = STENT.contrast } = {}) {
  const vol = await loadStentVolume();
  const view = new VolumeView(box, { dprCap: 1, preserveDrawingBuffer: true, width: w, height: h }).init(vol);
  view.yaw = yawDeg * DEG;
  view.setContrast(contrast);
  await view.compile();
  view.render();
  return view;
}

export async function mountVolume(box, opts = {}) {
  const v = new VolumeStage(box, opts);
  await v.start();
  return v;
}

export class VolumeStage extends LiveStage {
  constructor(box, { budget = null } = {}) {
    super(box, { budget, controls: [] });
    this.slider = document.getElementById("stentContrast");
    this.sliderWrap = this.slider?.closest("label") || null;
    const plate = box.closest(".lb-plate") || box.closest("figure");
    this.readout = plate?.querySelector(".lb-read--tr") || null;
    this.yaw = STENT.yaw * DEG;
    this.contrast = this.slider ? +this.slider.value || STENT.contrast : STENT.contrast;
    this.slider?.addEventListener("input", () => {
      this.contrast = +this.slider.value;
      this.slider.setAttribute("aria-valuetext", `Contrast ${Math.round(this.contrast)}%`);
      if (this.view) { this.view.setContrast(this.contrast); this.loop?.invalidate(); }
    });
  }

  /** The cath chapter is active again. */
  wake() {
    this.autoResume = true;
    if (this.state === "suspended" || this.state === "idle") this.start();
    else this.loop?.invalidate();
  }

  /** The chapter has been inactive for 10 s: free the context and stay asleep until wake(). */
  sleep() {
    this.autoResume = false;
    this.suspend();
  }

  async build() {
    const vol = await loadStentVolume();
    if (this.state !== "loading") return;
    const view = (this.view = new VolumeView(this.box, { dprCap: 1.5 }).init(vol));
    this.unwatch = watchContextLoss(view.canvas, () => this.lost(), () => view.disposed);
    view.yaw = this.yaw;
    view.setContrast(this.contrast);
    await view.compile();
    if (this.state !== "loading") return;

    this.drag = new DragYaw(this.box, {
      yaw: this.yaw,
      home: STENT.yaw * DEG,
      reduced: () => prefersReduced.matches,
      onInput: () => this.loop?.invalidate(),
    });
    this.loop = new Loop(this, { onGuard: (level) => { if (level === "dpr") { this.view?.setPixelRatio(1); this.loop?.invalidate(); } } });
    this.loop.visible = this.visible;
    this.ro = new ResizeObserver(() => { if (this.view?.size()) this.loop?.invalidate(); });
    this.ro.observe(this.box);

    view.render();
    this.updateReadout();
    await revealCanvas(view.canvas, this.box);
    if (this.state !== "loading") return;
    this.showSlider(true);
  }

  showSlider(on) {
    if (!this.slider) return;
    this.slider.hidden = !on;
    if (this.sliderWrap) this.sliderWrap.hidden = !on;
    if (on) this.slider.setAttribute("aria-valuetext", `Contrast ${Math.round(this.contrast)}%`);
  }

  needs() { return this.drag?.moving ? 2 : 0; }

  update(dt, now) {
    this.drag.step(now);
    this.yaw = this.view.yaw = this.drag.yaw;
  }

  draw() {
    if (this.view.render()) this.updateReadout();
  }

  /** "Rotation N°" in the light-box readout (state only). */
  updateReadout() {
    const el = this.readout;
    if (!el) return;
    const n = ((Math.round(this.yaw / DEG) % 360) + 360) % 360;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (/-?\d+\s*°/.test(t.nodeValue)) { t.nodeValue = t.nodeValue.replace(/-?\d+(\s*)°/, `${n}$1°`); return; }
    }
  }

  onVisible(v) { this.loop?.setVisible(v); }

  teardown() {
    this.unwatch?.();
    this.unwatch = null;
    if (this.drag) { this.yaw = this.drag.yaw; this.drag.dispose(); this.drag = null; }
    this.loop?.dispose();
    this.loop = null;
    this.ro?.disconnect();
    this.ro = null;
    this.view?.dispose();
    this.view = null;
    this.showSlider(false);
  }
}
