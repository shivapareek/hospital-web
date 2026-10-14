/* Migration "i18n-hi-v1": runs once per database (fresh and existing alike), after "pages-v1".
   - adds db.textsHi (Hindi page-text overrides)
   - fills empty "<field>_hi" content fields with the Hindi demo translations (server/i18n/hi-content.js),
     but only while the English field still matches the English demo text the translation was made from.
     A field an admin already filled is never touched; an English field an admin changed keeps an empty
     Hindi field (the Hindi page then shows the English until someone translates it).
   Legal pages and the consent text need no migration: their Hindi defaults come from server/schema.js
   (DEFAULT_SETTINGS), like every other setting. */
const HI = require("./hi-content");
const DEMO = require("../pages-content");
const { readStaticData, readArticles } = require("../seed");

const KEY = "i18n-hi-v1";
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
function norm(v) {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v).sort()) o[k] = norm(v[k]); return o; }
  return v;
}
const empty = (v) => v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);

/** For each collection: how to find the item's demo entry and, per Hindi field, [Hindi value, English now, English it was translated from]. */
function plans() {
  const S = readStaticData();
  const byName = (list, key = "name") => Object.fromEntries((list || []).map((x) => [x[key], x]));
  const sDoc = byName(S.DOCTORS), sDept = byName(S.DEPARTMENTS), sPkg = byName(S.PACKAGES), sTes = byName(S.TESTIMONIALS);
  const sFaq = byName(S.FAQS, "q"), sSym = byName(S.SYMPTOMS, "label");
  const sChat = Object.fromEntries((S.CHAT_RULES || []).map((r) => [r.k[0], r]));
  const sArt = byName(readArticles(), "title");
  const sPage = Object.fromEntries(DEMO.PAGES.map((p) => [p.slug, p]));
  return {
    doctors: { key: (it) => it.name, fields: (it, k) => {
      const h = HI.DOCTORS[k]; const s = sDoc[k] || {}; const d = DEMO.DOCTORS[k] || {};
      if (!h) return [];
      return [
        ["role_hi", h.role_hi, it.role, s.role],
        ["lang_hi", s.lang ? HI.langHi(s.lang) : undefined, it.lang, s.lang],
        ["opd_hi", s.opd ? HI.opdHi(s.opd) : undefined, it.opd, s.opd],
        ["bio_hi", h.bio_hi, it.bio, d.bio],
        ["awards_hi", h.awards_hi, it.awards, d.awards],
        ["conditions_hi", h.conditions_hi, it.conditions, d.conditions],
        ["patientReviews_hi", h.patientReviews_hi, it.patientReviews, d.patientReviews]
      ];
    } },
    departments: { key: (it) => it.name, fields: (it, k) => {
      const h = HI.DEPARTMENTS[k]; const s = sDept[k] || {}; const d = DEMO.DEPARTMENTS[k] || {};
      if (!h) return [];
      const costNames = (c) => (Array.isArray(c) ? c.map((x) => x && x.item) : c);
      return [
        ["name_hi", h.name_hi, it.name, k],
        ["desc_hi", h.desc_hi, it.desc, s.desc],
        ["caption_hi", h.caption_hi, it.caption, s.caption],
        ["captionAlt_hi", h.captionAlt_hi, it.captionAlt, s.captionAlt],
        ["insetLabel_hi", h.insetLabel_hi, it.inset && it.inset.label, s.inset && s.inset.label],
        ["overview_hi", h.overview_hi, it.overview, d.overview],
        ["conditions_hi", h.conditions_hi, it.conditions, d.conditions],
        ["treatments_hi", h.treatments_hi, it.treatments, d.treatments],
        ["costs_hi", h.costs_hi, costNames(it.costs), costNames(d.costs)],
        ["faqs_hi", h.faqs_hi, it.faqs, d.faqs]
      ];
    } },
    packages: { key: (it) => it.name, fields: (it, k) => {
      const h = HI.PACKAGES[k]; const s = sPkg[k] || {};
      return h ? [["name_hi", h.name_hi, it.name, k], ["items_hi", h.items_hi, it.items, s.items]] : [];
    } },
    testimonials: { key: (it) => it.name, fields: (it, k) => {
      const h = HI.TESTIMONIALS[k]; const s = sTes[k] || {};
      return h ? [["meta_hi", h.meta_hi, it.meta, s.meta], ["text_hi", h.text_hi, it.text, s.text]] : [];
    } },
    faqs: { key: (it) => it.q, fields: (it, k) => {
      const h = HI.FAQS[k]; const s = sFaq[k] || {};
      return h ? [["q_hi", h.q_hi, it.q, k], ["a_hi", h.a_hi, it.a, s.a]] : [];
    } },
    symptoms: { key: (it) => it.label, fields: (it, k) => (HI.SYMPTOMS[k] ? [["label_hi", HI.SYMPTOMS[k], it.label, k]] : []) },
    chatRules: { key: (it) => (Array.isArray(it.k) ? it.k[0] : ""), fields: (it, k) => {
      const h = HI.CHAT_RULES[k]; const s = sChat[k] || {};
      return h ? [["k_hi", h.k_hi, it.k, s.k], ["a_hi", h.a_hi, it.a, s.a]] : [];
    } },
    articles: { key: (it) => it.title, fields: (it, k) => {
      const h = HI.ARTICLES[k]; const s = sArt[k] || {}; const d = DEMO.ARTICLES[k] || {};
      if (!h) return [];
      return [
        ["title_hi", h.title_hi, it.title, k],
        ["category_hi", h.category_hi, it.category, s.category],
        ["readTime_hi", h.readTime_hi, it.readTime, s.readTime],
        ["summary_hi", h.summary_hi, it.summary, d.summary],
        ["body_hi", h.body_hi, it.body, d.body]
      ];
    } },
    pages: { key: (it) => it.slug, fields: (it, k) => {
      const h = HI.PAGES[k]; const s = sPage[k] || {};
      if (!h) return [];
      return [
        ["title_hi", h.title_hi, it.title, s.title],
        ["summary_hi", h.summary_hi, it.summary, s.summary],
        ["imageAlt_hi", h.imageAlt_hi, it.imageAlt, s.imageAlt],
        ["body_hi", h.body_hi, it.body, s.body]
      ];
    } }
  };
}

/** Runs the migration once. ctx: { db, store, nowIso }. Returns {filled, kept, changed} (also when it already ran). */
function run(ctx) {
  const data = ctx.db();
  data.migrations = data.migrations || {};
  let changed = false;
  if (!data.textsHi || typeof data.textsHi !== "object") { data.textsHi = {}; changed = true; }
  const report = { filled: 0, kept: 0, changed: 0 };
  if (!data.migrations[KEY]) {
    const P = plans();
    for (const [col, plan] of Object.entries(P)) {
      for (const it of (data.content && data.content[col]) || []) {
        const k = plan.key(it);
        if (!k) continue;
        for (const [field, hiValue, englishNow, englishSource] of plan.fields(it, k)) {
          if (hiValue === undefined || englishSource === undefined) continue;
          if (!empty(it[field])) { report.kept++; continue; }                  // an admin's Hindi stays
          if (!same(englishNow, englishSource)) { report.changed++; continue; } // English was edited: no stale translation
          it[field] = JSON.parse(JSON.stringify(hiValue));
          report.filled++;
        }
      }
    }
    data.migrations[KEY] = ctx.nowIso();
    changed = true;
    console.log(`i18n: Hindi content migrated (${KEY}): ${report.filled} field(s) filled, ${report.kept} already translated, ${report.changed} skipped because the English was edited`);
  }
  if (changed) ctx.store.save();
  return report;
}

module.exports = { run, KEY };
