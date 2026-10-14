/* CareNova 3D stage: capability tiers, motion and theme helpers (spec §8.2).
   No three.js here; boot.js imports this statically. */

/** "live" (desktop, autoload), "tap" (load on request) or "poster" (no 3D). */
export function detectTier() {
  const mm = (q) => matchMedia(q).matches;
  const conn = navigator.connection || {};
  let gl2 = false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    gl2 = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { gl2 = false; }
  let off = false;
  try { off = sessionStorage.getItem("cn-3d-off") === "1"; } catch {}
  const lowData = !!conn.saveData || mm("(prefers-reduced-data: reduce)") || /(^|-)2g$/.test(conn.effectiveType || "");
  if (!gl2 || lowData || off) return "poster";
  const mem = navigator.deviceMemory;            // undefined in Safari and Firefox: treat as unknown
  const cores = navigator.hardwareConcurrency || 4;
  if (mem !== undefined && mem < 2) return "poster";
  const desktop = mm("(min-width: 1024px)") && mm("(pointer: fine)");
  if (desktop && cores >= 4 && (mem === undefined || mem >= 4)) return "live";
  return "tap";
}

/** MediaQueryList; read `.matches` at the moment you need it. */
export const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)");

const darkMQ = matchMedia("(prefers-color-scheme: dark)");

/** Same rule as main.js: an explicit data-theme wins, otherwise the system preference. */
export function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t === "dark") return true;
  if (t === "light") return false;
  return darkMQ.matches;
}

/** Calls cb(isDark()) whenever the effective theme may have changed. Returns an unsubscribe function. */
export function onThemeChange(cb) {
  let last = isDark();
  const fire = () => {
    const now = isDark();
    if (now === last) return;
    last = now;
    cb(now);
  };
  const mo = new MutationObserver(fire);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  darkMQ.addEventListener("change", fire);
  return () => { mo.disconnect(); darkMQ.removeEventListener("change", fire); };
}

/** Switches the 3D layer off for the rest of this browser session (after a context loss). */
export function markOff() {
  try { sessionStorage.setItem("cn-3d-off", "1"); } catch {}
}
