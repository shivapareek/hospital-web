/* CareNova 3D stage: specimen framing and part table (spec §8.5, §8.4).
   No three.js here. Shared by the live scenes and the bake page, so posters match the live view.
   Paths are relative to the site root ("assets/models/<file>"); core.js resolves them against its own URL. */

export const MODEL_DIR = "assets/models/";

/*
  yaw, elev  degrees
  fill       fraction of the stage that the model's limiting dimension fills (§8.3 frameModel)
  accent     node names drawn in the accent glaze
  glass      node names drawn as see-through glass (renderOrder 2)
  name       what the cabinet's live 3D box is called for screen readers ("3D model of <name>")
  bisque     node names drawn in bisque
  cool       node names drawn in the cool porcelain
  Anything not listed is plain porcelain.
*/
export const SPECIMENS = {
  heart: {
    name: "the heart", file: "heart.mo.glb", yaw: 24, elev: 4, fill: 0.80,
    accent: ["Coronary_arteries"], glass: [],
    bisque: ["Aorta_and_arch_branches", "Pulmonary_arteries", "Cardiac_veins"],
    cool: ["Venae_cavae", "Pulmonary_veins"],
  },
  brain: {
    name: "the brain", file: "brain.mo.glb", lite: "brain-lite.mo.glb", yaw: 60, elev: 8, fill: 0.84,
    accent: ["Frontal_lobe"], glass: [],
  },
  knee: { name: "the knee joint", file: "knee.mo.glb", yaw: 25, elev: 6, fill: 0.86, accent: ["Menisci", "Articular_cartilage"], glass: [] },
  spine: { name: "the spine", file: "spine.mo.glb", yaw: 20, elev: 10, fill: 0.92, accent: ["Intervertebral_discs"], glass: [] },
  uterus: { name: "the uterus and fallopian tubes", file: "uterus.mo.glb", yaw: 10, elev: 8, fill: 0.82, accent: ["Ovaries"], glass: [] },
  liver: { name: "the liver", file: "liver.mo.glb", yaw: 15, elev: 8, fill: 0.80, accent: [], glass: [] },
  kidney: {
    name: "a kidney", file: "kidney.mo.glb", yaw: 30, elev: 6, fill: 0.80,
    accent: ["Renal_pyramids"], glass: ["Kidney_capsule"], bisque: ["Renal_hilum"],
  },
  lungs: { name: "the lungs", file: "lungs.mo.glb", yaw: 15, elev: 6, fill: 0.84, accent: ["Bronchial_tree"], glass: ["Lung_right", "Lung_left"] },
  eye: { name: "the eye", file: "eye.mo.glb", yaw: 35, elev: 4, fill: 0.70, accent: ["Iris"], glass: ["Cornea", "Lens"] },
  tooth: { name: "a lower molar", file: "tooth.mo.glb", yaw: 20, elev: 8, fill: 0.72, accent: [], glass: [] },
  // Bake only: MRI localizer, frontal lobe to the viewer's left.
  brainLateral: { file: "brain.mo.glb", yaw: -90, elev: 0, fill: 0.90, accent: [], glass: [] },
};

/* Cover heart (§8.4): the lite model on every device, same parts as the cabinet heart. */
export const HERO = {
  ...SPECIMENS.heart,
  file: "heart-lite.mo.glb",
  // Only where the caption sits inside the plate (>= 1280 px); centred below that. Measured over a full turn:
  // x 0.65 keeps every yaw clear of the caption (min(300px, 32%) wide), and y 0.12 (about 20 px up)
  // keeps the base of the heart clear of the controls row at the bottom right. Bake with the same pose.
  offsetX: 0.65,
  offsetY: 0.12,
  turnSpeed: 0.12,       // rad/s: peak speed of the sway
  swayDeg: 38,           // the heart sways ±38° round the poster pose (about 35 s there and back), so the front stays in view
  /* Leader labels (P1). `at` is the anchor in model space (the turning group's local space), precomputed
     with computeAnchors() in js/stage/scene-hero.js (bbox rule, then snapped to a point well inside the
     part's visible area in the poster pose), so the page never reads pixels back from the GPU. Without
     `at`, scene-hero.js computes the anchor at run time from `rule`. Recompute if the model, yaw or
     offsets change. The Aorta and SVC anchors sit below the joins between the separate vessel pieces of
     the model (f 0.50 and 0.74), so the rings never land on a seam. */
  labels: [
    { text: "Aorta", part: "Aorta_and_arch_branches", rule: "bboxTop", f: 0.50, at: [-0.2748, 0.2343, 0.2122] },
    { text: "Superior vena cava", part: "Venae_cavae", rule: "bboxTop", f: 0.74, at: [-0.3652, 0.2985, 0.153] },
    { text: "Coronary arteries", part: "Coronary_arteries", rule: "frontVertex", yMin: -0.4, yMax: 0.2, at: [-0.0376, -0.3724, 0.6689] },
  ],
};

/* Fallback when DEPARTMENTS (data.js) carries no `specimen` / `alt` / `view` fields yet. */
export const DEPT_SPECIMEN = {
  Cardiology: { specimen: "heart" },
  Neurology: { specimen: "brain" },
  Orthopedics: { specimen: "knee", alt: "spine" },
  Oncology: { view: "image" },
  Gynecology: { specimen: "uterus" },
  Pediatrics: { view: "type" },
  Gastroenterology: { specimen: "liver" },
  Nephrology: { specimen: "kidney" },
  Pulmonology: { specimen: "lungs" },
  Ophthalmology: { specimen: "eye" },
  Dental: { specimen: "tooth" },
  "General Medicine": { view: "type" },
};

/** Site-root-relative model path for a specimen key. `lite` picks the low-memory brain. */
export function modelPath(key, { lite = false } = {}) {
  const s = key === "hero" ? HERO : SPECIMENS[key];
  if (!s) return null;
  return MODEL_DIR + (lite && s.lite ? s.lite : s.file);
}

/** Resolves a cabinet department (as dispatched in `cn:spec`) to a specimen key, or null for image/type views. */
export function specimenForDept(name, alt = 0) {
  let d = null;
  try { if (typeof DEPARTMENTS !== "undefined") d = DEPARTMENTS.find((x) => x.name === name) || null; } catch {}
  const fb = DEPT_SPECIMEN[name] || {};
  const view = (d && d.view) || fb.view || null;
  if (view === "image" || view === "type") return null;
  const main = (d && d.specimen) || fb.specimen || null;
  const second = (d && d.alt) || fb.alt || null;
  const key = +alt && second ? second : main;
  return key && SPECIMENS[key] ? key : null;
}
