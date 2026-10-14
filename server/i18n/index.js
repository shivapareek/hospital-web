/* Languages: English (default, at the existing URLs) and Hindi (हिन्दी, under /hi/…).
   - tr(lang, english, vars): server-rendered UI text and API messages (hi-strings.json, keyed by the English text)
   - HOME: shipped Hindi for the home page text fields (hi-home.json, keyed by field key, English kept alongside)
   - ATTRS: Hindi for attributes, <option>s and a few static text nodes on the home page and shared chrome
   - UI: the dictionary the browser scripts get as window.I18N (hi-ui.json, keyed by the English text)
   - localizeHref / localized(): links that stay inside /hi/, and _hi content fields with English fallback
   The admin panel stays in English. */
const STRINGS = { hi: require("./hi-strings.json").strings };
const HOME = { hi: require("./hi-home.json").fields };
const ATTRS = { hi: require("./hi-attrs.json") };
const UI = { hi: require("./hi-ui.json").strings };

const LANGS = ["en", "hi"];
const LANG_NAMES = { en: "English", hi: "हिन्दी" };
const HTML_LANG = { en: "en", hi: "hi" };
const DEFAULT = "en";

const norm = (l) => (l === "hi" ? "hi" : "en");
const fill = (s, vars) => (vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m)) : String(s));

/** Translates an English UI string (exact key) for `lang`, then fills {placeholders}. Unknown strings stay English. */
function tr(lang, s, vars) {
  const d = STRINGS[norm(lang)];
  return fill(d && Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s, vars);
}

/** Language of an API request: body.lang, the X-Lang header, or a /hi/ page as referrer. */
function reqLang(req) {
  const b = (req && req.body) || {};
  if (b.lang === "hi" || req.get("X-Lang") === "hi") return "hi";
  if (b.lang === "en" || req.get("X-Lang") === "en") return "en";
  try { const r = new URL(req.get("Referer") || "", "http://x"); if (/^\/hi(\/|$)/.test(r.pathname)) return "hi"; } catch { /* ignore */ }
  return "en";
}

/* ---------- links ---------- */
// paths that are the same in every language (files, APIs, the admin, credits)
const SHARED = /^\/(assets|css|js|uploads|api|admin|credits\.html|sitemap\.xml|robots\.txt|favicon)(\/|$|\?|#|\.)/;
/** "/doctors" → "/hi/doctors" on Hindi pages; files, APIs and links already in /hi stay as they are. */
function localizeHref(href, lang) {
  if (norm(lang) !== "hi" || typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/hi" || href.startsWith("/hi/") || href.startsWith("/hi?") || href.startsWith("/hi#") || SHARED.test(href)) return href;
  if (href === "/" ) return "/hi/";
  if (/^\/[?#]/.test(href)) return "/hi/" + href.slice(1);
  return "/hi" + href;
}
/** The English path of a page path (strips /hi). */
function basePath(p) {
  const s = String(p || "/");
  if (s === "/hi" || s === "/hi/") return "/";
  return s.startsWith("/hi/") ? s.slice(3) : s;
}
const pathFor = (p, lang) => localizeHref(basePath(p), lang);

/* ---------- content fields ---------- */
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && (typeof v !== "string" || v.trim() !== ""));
/** item[field + "_hi"] when the language is Hindi and it is filled, otherwise item[field]. */
function pick(item, field, lang) {
  if (!item) return undefined;
  if (norm(lang) === "hi" && filled(item[field + "_hi"])) return item[field + "_hi"];
  return item[field];
}

/**
 * A copy of a content item with the Hindi fields swapped in (English fallback), for pages and js/data.js.
 * Identity fields stay English (department and package `name`, doctor `dept`, symptom `dept`):
 * forms, bookings and links keep working in both languages. Display names go in `label`.
 */
function localized(col, item, lang) {
  if (!item) return item;
  const out = { ...item };
  const hi = norm(lang) === "hi";
  const swap = (f) => { if (hi && filled(item[f + "_hi"])) out[f] = item[f + "_hi"]; };
  switch (col) {
    case "departments":
      out.label = hi && filled(item.name_hi) ? item.name_hi : item.name;
      ["desc", "caption", "captionAlt", "overview", "conditions", "treatments", "faqs"].forEach(swap);
      if (hi && item.inset && filled(item.insetLabel_hi)) out.inset = { ...item.inset, label: item.insetLabel_hi };
      // credit lines stay in English (source and licence names); only the leading word is Hindi
      if (hi) for (const f of ["credit", "creditAlt"]) if (typeof item[f] === "string") out[f] = item[f].replace(/^Model:/, "मॉडल:").replace(/^Image:/, "तस्वीर:");
      if (hi && Array.isArray(item.costs) && Array.isArray(item.costs_hi)) out.costs = item.costs.map((c, i) => (c && filled(item.costs_hi[i]) ? { ...c, item: item.costs_hi[i] } : c));
      break;
    case "packages":
      out.label = hi && filled(item.name_hi) ? item.name_hi : item.name;
      swap("items");
      break;
    case "chatRules":
      if (hi) {
        out.k = [...new Set([...(Array.isArray(item.k_hi) ? item.k_hi : []), ...(Array.isArray(item.k) ? item.k : [])].map((k) => String(k).toLowerCase()))];
        swap("a");
      }
      break;
    default: {
      for (const k of Object.keys(item)) if (k.endsWith("_hi")) swap(k.slice(0, -3));
    }
  }
  for (const k of Object.keys(out)) if (k.endsWith("_hi")) delete out[k];
  return out;
}

/** Absolute site address: SITE_URL, or the address the request came in on. */
function baseUrl(req) {
  const env = String(process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  if (/^https?:\/\/[^\s/]+/i.test(env)) return env;
  return req ? `${req.protocol}://${req.get("host")}` : "";
}

/* ---------- dates (hospital time) ---------- */
const LOCALE = { en: "en-IN", hi: "hi-IN" };
function fmtDay(isoDate, lang, opts = { weekday: "short", day: "numeric", month: "short" }) {
  const d = new Date(`${isoDate}T12:00:00+05:30`);
  if (isNaN(d)) return isoDate;
  return d.toLocaleDateString(LOCALE[norm(lang)], { ...opts, timeZone: "Asia/Kolkata" });
}

/* ---------- browser dictionary ---------- */
function clientDict(lang) {
  if (norm(lang) !== "hi") return null;
  return UI.hi;
}

/** Shipped Hindi for a home page field, or null when there is none or it was made from different English. */
function homeText(key, englishDefault) {
  const e = HOME.hi[key];
  if (!e) return null;
  if (JSON.stringify(e.en) !== JSON.stringify(englishDefault)) return null;   // stale: index.html changed since
  return e.hi;
}
const homeEntry = (key) => HOME.hi[key] || null;

module.exports = {
  LANGS, LANG_NAMES, HTML_LANG, DEFAULT, LOCALE, norm, tr, fill, reqLang, localizeHref, basePath, pathFor,
  pick, filled, localized, baseUrl, fmtDay, clientDict, homeText, homeEntry, ATTRS
};
