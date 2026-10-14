/* Renders index.html (and the JS/HTML it depends on) from the template plus CMS data.
   - Page text/images: every visible text block and content image is discovered automatically and
     gets a stable key; overrides from the admin replace it server-side (good for SEO, no flash).
   - Sections can be hidden; settings (name, phones, email, colour, SEO, announcement) are applied.
   - js/data.js is generated from the content collections. */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { COLLECTIONS, DEFAULT_SETTINGS } = require("./schema");
const i18n = require("./i18n");

const ROOT = path.join(__dirname, "..");
const TEMPLATE = path.join(ROOT, "index.html");

const SKIP_TAGS = new Set(["script", "style", "svg", "template", "noscript", "select", "option", "textarea", "input", "iframe", "picture", "source", "use"]);
const INLINE = new Set(["a", "em", "strong", "b", "i", "span", "br", "small", "abbr", "sup", "sub", "time", "mark", "u", "s", "kbd"]);
const TEXT_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "dt", "dd", "figcaption", "button", "a", "label", "span", "small", "strong", "em", "blockquote", "th", "td", "legend", "summary", "b", "div", "cite", "q"]);
// containers that main.js / plates.js fill at runtime, plus the CMS-managed article list
const DYNAMIC = ["#specList", "#docTabs", "#docGrid", "#symptomChips", "#symptomResult", "#pkgGrid", "#storyList", "#quote", "#faqList", "#faqAnswer",
  "#chatBody", "#chatQuick", "#slots", "#dateStrip", "#searchDrop", "#ticket .ticket__rows", ".articles", "#liveEr", "#liveBeds", "#liveIcu", "#liveToken", "#liveUpdated", "#docTodayCount"];

const GROUP_LABELS = {
  header: "Header and menu", top: "Hero (top of page)", specialities: "Specialities", symptom: "Symptom finder", doctors: "Doctors",
  book: "Booking", technology: "Imaging and technology", closer: "Look closer (retina)", packages: "Health check-ups", care: "Patient care",
  tools: "Health tools", stories: "Patient stories", faq: "FAQ", library: "Health library", contact: "Contact", footer: "Footer",
  sosModal: "Emergency pop-up", reportsModal: "Reports pop-up", chat: "Chat assistant", other: "Other"
};

let templateCache = { mtime: 0, html: "", fields: [], groups: [] };

function groupOf($, el) {
  const anc = $(el).closest("section[id], header#header, footer, .modal[id], #chat, #mobileMenu");
  if (!anc.length) return "other";
  if (anc.is("footer")) return "footer";
  if (anc.is("#mobileMenu")) return "header";
  return anc.attr("id");
}

function onlyInlineDescendants($, el) {
  let ok = true;
  $(el).find("*").each((_, d) => { if (!INLINE.has(d.tagName)) { ok = false; return false; } });
  return ok;
}

function directText(el) {
  return (el.children || []).filter((c) => c.type === "text").map((c) => c.data).join("").replace(/\s+/g, " ").trim();
}

/** Walks the template and returns field descriptors (in document order) with a stable key per group. */
function discover($) {
  const fields = [];
  const counters = {};
  const dynamic = $(DYNAMIC.join(","));
  const isDynamic = (el) => dynamic.filter((_, d) => d === el || $(d).find(el).length > 0).length > 0;

  function walk(el) {
    if (el.type !== "tag") return;
    const tag = el.tagName;
    if (SKIP_TAGS.has(tag) && tag !== "picture") return;
    if (dynamic.is(el)) return;
    if (tag === "img") {
      const src = $(el).attr("src") || "";
      if (src.startsWith("assets/") && !$(el).closest(".stage__box, .seq, .cabinet__stage, .lb-plate__screen").length) {
        const g = groupOf($, el);
        counters["i" + g] = (counters["i" + g] || 0) + 1;
        fields.push({ key: `i:${g}:${counters["i" + g] - 1}`, kind: "image", group: g, el, default: { src, alt: $(el).attr("alt") || "" } });
      }
      return;
    }
    if (tag === "picture") return;
    if (TEXT_TAGS.has(tag) && $(el).attr("aria-hidden") !== "true") {
      const txt = directText(el);
      if (txt && /[A-Za-z0-9₹]/.test(txt)) {
        const g = groupOf($, el);
        counters["t" + g] = (counters["t" + g] || 0) + 1;
        const key = `t:${g}:${counters["t" + g] - 1}`;
        const hasChildren = $(el).children().length > 0;
        if (!hasChildren) { fields.push({ key, kind: "text", group: g, el, default: $(el).text().trim() }); return; }
        if (onlyInlineDescendants($, el)) { fields.push({ key, kind: "html", group: g, el, default: $(el).html().trim() }); return; }
        // mixed content (e.g. a button with an icon): edit the first text run only, keep descending
        fields.push({ key, kind: "textnode", group: g, el, default: txt });
      }
    }
    (el.children || []).forEach(walk);
  }
  walk($("body")[0]);
  return fields;
}

function loadTemplate() {
  const st = fs.statSync(TEMPLATE);
  if (st.mtimeMs !== templateCache.mtime) {
    const html = fs.readFileSync(TEMPLATE, "utf8");
    const $ = cheerio.load(html);
    const fields = discover($).map(({ el, ...f }) => f);
    templateCache = { mtime: st.mtimeMs, html, fields };
  }
  return templateCache;
}

function labelFor(f) {
  const short = (s) => { s = String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); return s.length > 60 ? s.slice(0, 57) + "…" : s; };
  if (f.kind === "image") return "Image · " + (f.default.alt ? short(f.default.alt) : f.default.src.split("/").pop());
  return short(f.default);
}

/** Admin view: groups of fields with current values. With lang "hi": the Hindi overrides (db.textsHi), with the shipped
    Hindi translation as the default and the English text the page would otherwise show alongside. */
function textGroups(db, { lang = "en" } = {}) {
  const { fields } = loadTemplate();
  const hi = i18n.norm(lang) === "hi";
  const values = (hi ? db.textsHi : db.texts) || {};
  const en = db.texts || {};
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k) && o[k] && o[k].value != null;
  const groups = [];
  const byId = {};
  for (const f of fields) {
    if (!byId[f.group]) { byId[f.group] = { id: f.group, label: GROUP_LABELS[f.group] || f.group, fields: [] }; groups.push(byId[f.group]); }
    const item = {
      key: f.key,
      type: f.kind === "image" ? "image" : f.kind === "html" ? "html" : "text",
      label: labelFor(f),
      default: f.default,
      value: has(values, f.key) ? values[f.key].value : null
    };
    if (hi) {
      const english = has(en, f.key) ? en[f.key].value : f.default;
      const shipped = i18n.homeText(f.key, f.default);
      const entry = i18n.homeEntry(f.key);
      item.english = english;                                     // what the English page shows now
      item.englishEdited = has(en, f.key);                        // the English was changed in the admin after the translation was made
      item.default = f.kind === "image" ? { src: (english && english.src) || f.default.src, alt: shipped ? shipped.alt : (english && english.alt) || "" } : (shipped != null ? shipped : english);
      item.shipped = shipped != null;                             // false: no Hindi shipped (or stale), the default is the English text
      item.stale = !!entry && shipped == null;
    }
    byId[f.group].fields.push(item);
  }
  return groups;
}

function sectionList(db) {
  const { html } = loadTemplate();
  const $ = cheerio.load(html);
  const hidden = new Set(db.hiddenSections || []);
  return $("main > section[id]").map((_, s) => {
    const id = $(s).attr("id");
    const h = $(s).find("h2").first().text().trim() || $(s).find("h1").first().text().trim();
    return { id, label: GROUP_LABELS[id] || h || id, visible: !hidden.has(id) };
  }).get();
}

/* ---------- sanitising admin-provided inline HTML ---------- */
/** keepIds: ids the page scripts rely on (taken from the field's default HTML, e.g. <span id="liveUpdated">) may stay. */
function sanitizeInline(html, keepIds) {
  const $ = cheerio.load(`<div id="x">${html}</div>`, null, false);
  $("#x *").each((_, el) => {
    if (!INLINE.has(el.tagName)) { $(el).replaceWith($(el).text()); return; }
    for (const name of Object.keys(el.attribs || {})) {
      const v = el.attribs[name];
      const okAttr = (el.tagName === "a" && (name === "href" || name === "target" || name === "rel")) || name === "class" || name === "lang" || name === "title" || (name === "id" && keepIds && keepIds.has(v));
      if (!okAttr || (name === "href" && /^\s*(javascript|data|vbscript):/i.test(v))) $(el).removeAttr(name);
    }
  });
  return $("#x").html();
}

/* ---------- global replacements from settings ---------- */
const digits = (s) => String(s || "").replace(/[^\d+]/g, "");
function replacements(settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const d = DEFAULT_SETTINGS;
  const pairs = [];
  const add = (from, to) => { if (to && from !== to) pairs.push([from, to]); };
  add(d.name, s.name);
  add(d.helpdesk, s.helpdesk);
  add("+919876543210", digits(s.helpdesk).startsWith("+") ? digits(s.helpdesk) : "+" + digits(s.helpdesk).replace(/^\+/, ""));
  add("wa.me/919876543210", "wa.me/" + digits(s.whatsapp).replace(/^\+/, ""));
  add(d.emergency, s.emergency);
  add("18001234567", digits(s.emergency).replace(/^\+/, ""));
  add(d.email, s.email);
  add(d.shortName, s.shortName);
  // whatsapp shown as text when it equals the default helpdesk text is already covered above
  return pairs;
}
function applyReplacements(text, settings) {
  for (const [from, to] of replacements(settings)) text = text.split(from).join(to);
  return text;
}

/* ---------- page render ---------- */
function escAttr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/**
 * The home page HTML (also the shell every inner page starts from).
 * opts: { lang: "en"|"hi", path: English path of the page ("/" for home; used for the language switcher and
 *         hreflang links), base: absolute site address for hreflang links }
 * Hindi text resolution, per field: admin Hindi override (db.textsHi) → shipped translation (server/i18n/hi-home.json,
 * only while its English source still matches index.html) → English (admin override or default).
 */
function renderPage(db, opts = {}) {
  const lang = i18n.norm(opts.lang);
  const hi = lang === "hi";
  const { html } = loadTemplate();
  const $ = cheerio.load(html);
  const settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  const texts = db.texts || {};
  const textsHi = db.textsHi || {};
  const val = (o) => (o && o.value != null ? o.value : null);

  // 1. page text and images (re-discover on this DOM so element refs line up with keys)
  for (const f of discover($)) {
    let v = val(texts[f.key]);
    if (hi) {
      const own = val(textsHi[f.key]);
      const shipped = i18n.homeText(f.key, f.default);
      if (f.kind === "image") {
        const alt = own && typeof own.alt === "string" && own.alt.trim() ? own.alt : shipped ? shipped.alt : null;
        const src = (own && own.src) || (v && v.src) || null;
        v = src || alt != null ? { src, alt: alt != null ? alt : v && v.alt } : v;
      } else v = own != null ? own : shipped != null ? shipped : v;
    }
    if (v == null) continue;
    const $el = $(f.el);
    if (f.kind === "image") {
      if (v.src) {
        $el.attr("src", v.src).removeAttr("srcset").removeAttr("sizes");
        $el.closest("picture").find("source").remove();
      }
      if (typeof v.alt === "string") $el.attr("alt", v.alt);
    } else if (f.kind === "text") {
      $el.text(String(v));
    } else if (f.kind === "html") {
      $el.html(sanitizeInline(String(v), new Set([...String(f.default).matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))));
    } else if (f.kind === "textnode") {
      const node = (f.el.children || []).find((c) => c.type === "text" && c.data.trim());
      if (node) node.data = node.data.replace(node.data.trim(), escHtml(String(v)));
    }
  }

  // 2. hidden sections (and their nav links)
  for (const id of db.hiddenSections || []) {
    $(`main > section#${id}`).remove();
    $(`a[href="#${id}"]`).each((_, a) => { if ($(a).closest("nav, #mobileMenu, .footer__cols, .hero__links").length) $(a).remove(); });
  }

  // 3. health library from the articles collection
  const articles = (db.content.articles || []).filter((a) => !a.hidden).map((a) => i18n.localized("articles", a, lang));
  $(".articles").html(articles.map((a) => `<li><a href="${escAttr(a.url || (a.slug ? i18n.localizeHref("/library/" + a.slug, lang) : "#library"))}"${a.url && /^https?:/.test(a.url) ? ' target="_blank" rel="noopener"' : ""}>` +
    (a.image ? `<img class="articles__thumb${a.round ? " articles__thumb--round" : ""}" src="${escAttr(a.image)}" width="320" height="320" alt="" loading="lazy" decoding="async">` : "") +
    `<span class="articles__cat">${escHtml(a.category || "")}</span><span class="articles__title">${escHtml(a.title || "")}</span>` +
    `<span class="articles__meta mono">${escHtml(a.author || "")}${a.readTime ? ` · <span class="nowrap">${escHtml(a.readTime)}</span>` : ""}</span>` +
    `<svg class="ic" aria-hidden="true"><use href="#i-arrow-ur"/></svg></a></li>`).join(""));
  if (!articles.length) $("#library").remove();

  // 4. SEO, brand colour, logo, announcement, map, social links
  const seoTitle = hi ? settings.seoTitleHi : settings.seoTitle;
  const seoDescription = hi ? settings.seoDescriptionHi : settings.seoDescription;
  if (hi) {
    const A = i18n.ATTRS.hi.attrs;
    $("title").text(A["CareNova Hospitals – Specialist care, without the wait"]);
    for (const sel of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]']) {
      const c = $(sel).attr("content");
      if (c && A[c]) $(sel).attr("content", A[c]);
    }
  }
  if (seoTitle) $("title").text(seoTitle);
  if (seoDescription) $('meta[name="description"]').attr("content", seoDescription);
  if (seoTitle) $('meta[property="og:title"]').attr("content", seoTitle);
  if (seoDescription) $('meta[property="og:description"]').attr("content", seoDescription);
  if (settings.ogImage) $("head").append(`<meta property="og:image" content="${escAttr(settings.ogImage)}">`);
  if (settings.accent && /^#[0-9a-f]{6}$/i.test(settings.accent) && settings.accent.toLowerCase() !== DEFAULT_SETTINGS.accent.toLowerCase()) {
    $("head").append(`<style id="cms-brand">:root{--accent:${settings.accent};--accent-hover:color-mix(in srgb,${settings.accent} 82%,#000)}</style>`);
    $('meta[name="theme-color"]').attr("content", settings.accent);
  }
  if (settings.logo) {
    $(".logo svg, .logo__mark").first().replaceWith(`<img class="logo__img" src="${escAttr(settings.logo)}" alt="" style="height:32px;width:auto">`);
  }
  const announcement = (hi && settings.announcementTextHi) || settings.announcementText;
  if (settings.announcementOn && announcement) {
    const inner = settings.announcementLink
      ? `<a href="${escAttr(i18n.localizeHref(settings.announcementLink, lang))}" style="color:inherit">${escHtml(announcement)}</a>`
      : escHtml(announcement);
    $(".skip-link").after(`<div class="cms-announce" role="note" style="background:var(--accent);color:var(--accent-ink);text-align:center;padding:10px max(16px,env(safe-area-inset-left,0px));font-size:15px;line-height:1.4">${inner}</div>`);
  }
  if (settings.mapQuery) {
    const q = encodeURIComponent(settings.mapQuery);
    $("iframe").filter((_, f) => /maps\.google/.test($(f).attr("src") || "")).attr("src", `https://maps.google.com/maps?q=${q}&z=14&output=embed`);
  }

  // 5. runtime config for the browser
  const live = db.live || {};
  const cfg = {
    api: "/api", lang, home: hi ? "/hi/" : "/",
    live: { mode: live.mode || "demo", erWait: live.erWait, beds: live.beds, icu: live.icu, token: live.token, updatedAt: live.updatedAt },
    booking: {
      on: settings.bookingOn !== false, closedDays: settings.closedDays || [], slotStart: settings.slotStart, slotEnd: settings.slotEnd,
      slotMinutes: Number(settings.slotMinutes) || 30, breakStart: settings.breakStart, breakEnd: settings.breakEnd
    }
  };
  $('script[src="js/data.js"]').before(`<script>window.CMS=${JSON.stringify(cfg).replace(/</g, "\\u003c")};</script>`);
  const dict = i18n.clientDict(lang);
  if (dict) $('script[src="js/data.js"]').before(`<script>window.I18N=${JSON.stringify(dict).replace(/</g, "\\u003c")};</script>`);

  // 6. feature modules (e.g. server/pages.js adds menu and footer links)
  for (const hook of renderHooks) hook($, db, settings, { lang, path: opts.path || "/" });

  // 7. language: switcher, hreflang links, and on Hindi pages the attributes, fonts and links
  languageChrome($, { lang, path: opts.path || "/", base: opts.base || "" });
  if (hi && !$('link[rel="canonical"]').length) $("head").append(`<link rel="canonical" href="${escAttr((opts.base || "") + i18n.pathFor(opts.path || "/", "hi"))}">`);
  if (hi) hindiPass($, db);

  return applyReplacements($.html(), settings);
}

/** Header switcher (English | हिन्दी) to the same page in the other language, and rel=alternate hreflang links. */
function languageChrome($, { lang, path, base }) {
  const other = lang === "hi" ? "en" : "hi";
  const href = i18n.pathFor(path, other);
  const label = i18n.LANG_NAMES[other];
  const title = other === "hi" ? "यह पेज हिन्दी में पढ़ें" : "Read this page in English";
  const short = other === "hi" ? "हि" : "EN";
  const link = `<a class="lang-switch" href="${escAttr(href)}" hreflang="${other}" lang="${other}" title="${escAttr(title)}" aria-label="${escAttr(label)}" data-lang-switch><span class="lang-switch__long" aria-hidden="true">${label}</span><span class="lang-switch__short" aria-hidden="true">${short}</span></a>`;
  const actions = $(".header__actions");
  if (actions.length) { const ft = actions.find("#fontToggle"); if (ft.length) ft.before(link); else actions.prepend(link); }
  const er = $("#mobileMenu .mobile-menu__er");
  const mm = `<a class="mobile-menu__lang" href="${escAttr(href)}" hreflang="${other}" lang="${other}" data-lang-switch>${other === "hi" ? "हिन्दी में पढ़ें" : "Read in English"}</a>`;
  if (er.length) er.after(mm); else $("#mobileMenu .mobile-menu__in").append(mm);
  if (!$('link[href$="css/i18n.css"]').length) $("head").append('<link rel="stylesheet" href="/css/i18n.css">');
  // keep the section the reader is on (#doctors…) when switching language
  $("body").append('<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("[data-lang-switch]");if(a&&location.hash&&location.hash.indexOf("?")<0)a.href=a.href.split("#")[0]+location.hash},true);</script>');
  $('link[rel="alternate"][hreflang]').remove();
  const abs = (l) => base + i18n.pathFor(path, l);
  $("head").append([
    `<link rel="alternate" hreflang="en" href="${escAttr(abs("en"))}">`,
    `<link rel="alternate" hreflang="hi" href="${escAttr(abs("hi"))}">`,
    `<link rel="alternate" hreflang="x-default" href="${escAttr(abs("en"))}">`
  ].join("\n"));
}

const ASSET = /^(assets|css|js)\//;
const absAsset = (v) => (v && ASSET.test(v) ? "/" + v : v);
/** Hindi page: <html lang="hi">, Devanagari fonts, translated attributes and leftovers, links kept inside /hi/,
    asset paths made absolute (the page lives at /hi/), and the Hindi js/data.js. */
function hindiPass($, db) {
  const A = i18n.ATTRS.hi;
  $("html").attr("lang", "hi");
  const fonts = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400..700&family=Noto+Serif+Devanagari:wght@400..600&display=swap";
  if (!$(`link[href="${fonts}"]`).length) {
    const g = $('link[href^="https://fonts.googleapis.com/css2"]').last();
    if (g.length) g.after(`<link href="${fonts}" rel="stylesheet" />`); else $("head").append(`<link href="${fonts}" rel="stylesheet" />`);
  }
  for (const attr of ["aria-label", "placeholder", "title", "alt", "aria-valuetext"]) {
    $(`[${attr}]`).each((_, el) => { const v = $(el).attr(attr); if (v && Object.prototype.hasOwnProperty.call(A.attrs, v)) $(el).attr(attr, A.attrs[v]); });
  }
  // the value stays English (what the form sends); only the label changes
  $("option").each((_, o) => { const t = $(o).text().trim(); if (A.options[t]) { if (!o.attribs || !Object.prototype.hasOwnProperty.call(o.attribs, "value")) $(o).attr("value", t); $(o).text(A.options[t]); } });
  // static text inside areas the page script fills (the booking slip) and aria-hidden labels
  $("body *").contents().each((_, n) => {
    if (n.type !== "text" || !n.data.trim()) return;
    const p = n.parent && n.parent.tagName;
    if (p === "script" || p === "style") return;
    const t = n.data.trim();
    if (Object.prototype.hasOwnProperty.call(A.text, t)) n.data = n.data.replace(t, A.text[t]);
  });
  const today = (db.content.doctors || []).filter((d) => !d.hidden && d.today).length;
  $("#docTodayCount").text(i18n.tr("hi", today === 1 ? "{n} consultant in today" : "{n} consultants in today", { n: today }));
  const neuro = (db.content.departments || []).find((d) => d.name === $("#cabTitle").attr("data-dept"));
  if (neuro && neuro.name_hi) $("#cabTitle").text(neuro.name_hi);
  // links: inside /hi/; files at their absolute address
  $("a[href]").each((_, a) => {
    if ($(a).is("[data-lang-switch]")) return;
    const h = $(a).attr("href");
    if (/^credits\.html/.test(h)) $(a).attr("href", "/" + h);
    else $(a).attr("href", i18n.localizeHref(h, "hi"));
  });
  $("[src]").each((_, el) => { $(el).attr("src", absAsset($(el).attr("src"))); });
  $("link[href]").each((_, el) => { $(el).attr("href", absAsset($(el).attr("href"))); });
  for (const attr of ["srcset", "data-srcset"]) {
    $(`[${attr}]`).each((_, el) => {
      $(el).attr(attr, $(el).attr(attr).split(",").map((part) => { const [u, ...rest] = part.trim().split(/\s+/); return [absAsset(u), ...rest].join(" "); }).join(", "));
    });
  }
  $("[data-src]").each((_, el) => { $(el).attr("data-src", absAsset($(el).attr("data-src"))); });
  $('script[type="importmap"]').each((_, s) => { $(s).text($(s).text().replace(/"\.\/assets\//g, '"/assets/')); });
  $('script[src="/js/data.js"]').attr("src", "/js/data.js?lang=hi");
}
const renderHooks = [];
/** Register fn($, db, settings, {lang, path}), called on every rendered page before the settings replacements. */
function addRenderHook(fn) { renderHooks.push(fn); }

/** js/data.js generated from the database. With lang "hi" the Hindi fields replace the English ones (English when empty);
    department and package names stay English (they identify the item) and their Hindi names go in `label`. */
function renderDataJs(db, { lang = "en" } = {}) {
  const out = [`/* Generated by the CareNova CMS from the database${i18n.norm(lang) === "hi" ? " (Hindi)" : ""}. Edit content in /admin. */`];
  for (const [col, def] of Object.entries(COLLECTIONS)) {
    if (!def.constName) continue;
    const serverOnly = def.fields.filter((f) => f.serverOnly).map((f) => f.name);   // long page-only fields stay out of the browser bundle
    const items = (db.content[col] || []).filter((x) => !x.hidden).map((x) => i18n.localized(col, x, lang)).map(({ id, hidden, ...rest }) => { for (const k of serverOnly) delete rest[k]; return rest; });
    out.push(`const ${def.constName} = ${JSON.stringify(items, null, 1)};`);
  }
  return applyReplacements(out.join("\n\n"), db.settings);
}

module.exports = { renderPage, renderDataJs, textGroups, sectionList, applyReplacements, loadTemplate, sanitizeInline, addRenderHook };
