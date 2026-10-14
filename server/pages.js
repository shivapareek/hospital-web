/* Doctor, speciality, health library and custom CMS pages, plus sitemap.xml, robots.txt and a friendly 404.
   Every page reuses the home page's head, header, footer, floating buttons and modals (renderInner) and
   replaces <main>. Inner pages load js/pages.js instead of js/main.js (main.js expects the home page).

   Routes (each also under /hi/… in Hindi: same handlers, the language comes from the URL)
     /doctors, /doctors/:slug            directory (?speciality=<slug>) and profiles
     /specialities, /specialities/:slug  index and speciality pages (/specialties… redirects here)
     /library, /library/:slug            health library and articles
     /<slug>                             custom pages from the `pages` collection
     /sitemap.xml, /robots.txt           absolute URLs from SITE_URL, or the request host

   Data: slugs are made from the name/title when empty and kept unique (on start-up and on every save).
   Migration "pages-v1" runs once per database: it adds the `pages` collection and fills empty profile,
   speciality and article fields with demo content (server/pages-content.js). It never overwrites. */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { Marked } = require("marked");
const { addRenderHook } = require("./render");
const { DEFAULT_SETTINGS } = require("./schema");
const DEMO = require("./pages-content");
const i18n = require("./i18n");
const { tr } = i18n;

let C = null;   // ctx from server/index.js
const db = () => C.db();
const settings = () => ({ ...DEFAULT_SETTINGS, ...(db().settings || {}) });

/* ---------- small helpers ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const visible = (col) => (db().content[col] || []).filter((x) => !x.hidden);
const icon = (id, cls = "ic") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const initials = (name) => String(name || "").replace(/^Dr\.?\s*/i, "").split(/\s+/).map((w) => w[0] || "").slice(0, 2).join("").toUpperCase();
const bookHref = (q) => "/#book?" + Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
const telHref = (s) => "tel:" + String(s || "").replace(/[^\d+]/g, "");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function fmtDate(iso, lang = "en") {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(iso || ""));
  if (!m) return String(iso || "");
  if (lang === "hi") {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1));
    return d.toLocaleDateString("hi-IN", { ...(m[3] ? { day: "numeric" } : {}), month: "long", year: "numeric", timeZone: "UTC" });
  }
  return (m[3] ? Number(m[3]) + " " : "") + MONTHS[Number(m[2]) - 1] + " " + m[1];
}
const words = (s) => String(s || "").split(/\s+/).filter(Boolean).length;
const plain = (md) => String(md || "").replace(/[#>*_`|[\]()-]+/g, " ").replace(/\s+/g, " ").trim();
const firstPara = (md) => plain(String(md || "").split(/\n\s*\n/)[0]).slice(0, 300);
const asArray = (v) => (Array.isArray(v) ? v : []);
const fileExists = (rel) => { try { return fs.existsSync(path.join(C.ROOT, rel)); } catch { return false; } };

/* ---------- slugs ---------- */
function slugify(s, { dropTitle = false } = {}) {
  let t = String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ");
  if (dropTitle) t = t.replace(/^dr\.?\s+/, "");
  return t.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}
const SLUG_SOURCES = { doctors: "name", departments: "name", articles: "title", pages: "title" };
// single-segment paths that a custom page must never take
const FIXED = ["admin", "api", "assets", "css", "js", "uploads", "hi", "doctors", "specialities", "specialties", "library", "index", "index-html", "credits", "credits-html", "sitemap-xml", "robots-txt", "favicon-ico", "404"];
function takenTopPaths() {
  const set = new Set(FIXED);
  for (const l of (C.app._router && C.app._router.stack) || []) {
    const paths = l.route ? [].concat(l.route.path) : [];
    for (const p of paths) if (typeof p === "string" && /^\/[^/:]+$/.test(p)) set.add(slugify(p.slice(1)));
  }
  return set;
}
const hasRoute = (p) => ((C.app._router && C.app._router.stack) || []).some((l) => l.route && [].concat(l.route.path).includes(p) && l.route.methods.get);
/** Fills empty slugs and keeps them unique per collection. Returns true when anything changed. */
function ensureSlugs() {
  let changed = false;
  let reserved = null;
  for (const [col, src] of Object.entries(SLUG_SOURCES)) {
    const list = db().content[col];
    if (!Array.isArray(list)) continue;
    const seen = new Set();
    for (const it of list) {
      let s = slugify(it.slug || it[src], { dropTitle: col === "doctors" && !it.slug }) || col.replace(/s$/, "");
      if (col === "pages") { reserved = reserved || takenTopPaths(); if (reserved.has(s)) s += "-page"; }
      let k = s, n = 2;
      while (seen.has(k)) k = `${s}-${n++}`;
      seen.add(k);
      if (it.slug !== k) { it.slug = k; changed = true; }
    }
  }
  return changed;
}

/* ---------- Markdown → safe HTML ---------- */
const md = new Marked({ gfm: true, breaks: false });
md.use({ renderer: { html(token) { return esc(token.text != null ? token.text : token.raw); } } });   // raw HTML is shown as text
const ALLOWED = {
  p: [], h2: [], h3: [], h4: [], h5: [], h6: [], ul: [], ol: ["start"], li: [], a: ["href", "title"], strong: [], em: [], b: [], i: [], del: [], s: [],
  blockquote: [], code: [], pre: [], hr: [], br: [], table: [], thead: [], tbody: [], tr: [], th: ["align"], td: ["align"], img: ["src", "alt", "title", "width", "height"]
};
const DROP = new Set(["script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "input", "textarea", "select", "button", "link", "meta", "base", "svg", "math", "template", "noscript", "video", "audio", "source"]);
function safeUrl(v, { image = false } = {}) {
  const u = String(v || "").replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (!u) return null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(u);
  if (!scheme) return u.startsWith("//") ? null : u;           // relative URL, path or #anchor
  const s = scheme[1].toLowerCase();
  return (image ? ["http", "https"] : ["http", "https", "mailto", "tel"]).includes(s) ? u : null;
}
function sanitizeHtml(html) {
  const $ = cheerio.load(`<div id="md-root">${html}</div>`, null, false);
  const els = $("#md-root *").get().reverse();   // children first, so unwrapping keeps cleaned descendants
  for (const el of els) {
    let tag = el.tagName;
    if (DROP.has(tag)) { $(el).remove(); continue; }
    if (tag === "h1") { el.tagName = tag = "h2"; }
    if (!ALLOWED[tag]) { $(el).replaceWith($(el).contents()); continue; }
    for (const name of Object.keys(el.attribs || {})) {
      if (!ALLOWED[tag].includes(name)) { $(el).removeAttr(name); continue; }
      if (name === "href" || name === "src") {
        const ok = safeUrl(el.attribs[name], { image: name === "src" });
        if (ok == null) $(el).removeAttr(name); else $(el).attr(name, ok);
      }
    }
    if (tag === "a" && /^https?:/i.test($(el).attr("href") || "")) $(el).attr("rel", "noopener noreferrer");
    if (tag === "img") { if (!$(el).attr("src")) { $(el).remove(); continue; } $(el).attr("loading", "lazy").attr("decoding", "async"); }
  }
  $("#md-root table").each((_, t) => { $(t).wrap('<div class="prose__table" role="region" aria-label="Table" tabindex="0"></div>'); });
  return $("#md-root").html();
}
function renderMarkdown(src) { return sanitizeHtml(md.parse(String(src || ""))); }

/* ---------- site URL ---------- */
function baseUrl(req) {
  const env = String(process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  if (/^https?:\/\/[^\s/]+/i.test(env)) return env;
  return req ? `${req.protocol}://${req.get("host")}` : "";
}

/* =========================================================
   Page shell
   ========================================================= */
const HOSPITAL_ADDRESS = { "@type": "PostalAddress", streetAddress: "Plot 21, Health City, NH-48, Sector 44", addressLocality: "Gurugram", addressRegion: "Haryana", postalCode: "122003", addressCountry: "IN" };
const NAV_MAP = { "#specialities": "/specialities", "#doctors": "/doctors", "#top": "/" };

function rewriteUrl(v) {
  if (!v || /^([a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(v)) return v;
  return "/" + v.replace(/^\.\//, "");
}
/** Language of a page request: /hi/… is Hindi. */
const langOf = (req) => (req && /^\/hi(\/|$)/.test(req.path) ? "hi" : "en");

/**
 * Renders a page in the site chrome.
 * opts: { title, description, path, image, type ("website"|"article"), jsonLd (object or array), body (HTML for <main>),
 *         active ("/doctors"…: highlights the menu link), status, noindex, styles [], scripts [], bodyClass, mainClass,
 *         lang ("en"|"hi"; default from the URL) }
 * `path` and `active` are the English paths; on Hindi pages every internal link is moved under /hi/.
 * Also used by server/privacy.js (renderShell) for the legal and manage-booking pages, via ctx.renderInner.
 */
function renderInner(req, opts) {
  const lang = i18n.norm(opts.lang || langOf(req));
  const hi = lang === "hi";
  const T = (s, v) => tr(lang, s, v);
  const s = settings();
  const data = db();
  const base = baseUrl(req);
  const enPath = opts.path || i18n.basePath(req ? req.path : "/");
  const $ = cheerio.load(C.renderPage(data, { lang, path: enPath, base }));
  const url = base + i18n.localizeHref(enPath, lang);
  const fullTitle = opts.title ? `${opts.title} · ${s.name}` : s.name;

  // head: title, description, canonical, share tags, structured data
  $("title").text(fullTitle);
  const desc = String(opts.description || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if ($('meta[name="description"]').length) $('meta[name="description"]').attr("content", desc);
  else $("head").append(`<meta name="description" content="${esc(desc)}">`);
  $('meta[property^="og:"], link[rel="canonical"], meta[name="robots"], meta[name^="twitter:"]').remove();
  $('script[type="application/ld+json"], script[type="importmap"], link[rel="modulepreload"], link[rel="preload"]').remove();
  const img = opts.image ? (/^https?:/.test(opts.image) ? opts.image : base + "/" + String(opts.image).replace(/^\//, "")) : (s.ogImage ? (/^https?:/.test(s.ogImage) ? s.ogImage : base + "/" + s.ogImage.replace(/^\//, "")) : "");
  const head = [
    opts.status === 404 ? "" : `<link rel="canonical" href="${esc(url)}">`,
    opts.noindex || opts.status === 404 ? '<meta name="robots" content="noindex">' : "",
    `<meta property="og:type" content="${opts.type === "article" ? "article" : opts.type === "profile" ? "profile" : "website"}">`,
    `<meta property="og:site_name" content="${esc(s.name)}">`,
    `<meta property="og:title" content="${esc(opts.title || s.name)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    hi ? '<meta property="og:locale" content="hi_IN">' : "",
    img ? `<meta property="og:image" content="${esc(img)}">` : "",
    `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">`
  ];
  if (opts.status === 404) $('link[rel="alternate"][hreflang]').remove();
  for (const ld of [].concat(opts.jsonLd || [])) head.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`);
  $("head").append(head.filter(Boolean).join("\n"));

  // the new main content (settings replacements were applied to the rest of the page already)
  $("main").first().attr("id", "main").attr("class", ["pg", opts.mainClass].filter(Boolean).join(" ")).html(C.applyReplacements(opts.body || "", data.settings));
  if (opts.bodyClass) $("body").addClass(opts.bodyClass);
  for (const href of opts.styles || []) if (!$(`link[href="${href}"], link[href="/${href}"]`).length) $("head").append(`<link rel="stylesheet" href="${esc(href)}">`);

  // scripts: keep data.js (chat replies) and anything else global; swap the home-page-only ones for js/pages.js
  $('script[src$="js/main.js"], script[src$="js/plates.js"], script[src*="js/stage/"]').remove();
  $("#pkgModal").remove();   // the check-up request needs the home page's package list
  const dataJs = $('script[src*="js/data.js"]');
  if (dataJs.length) dataJs.after('<script src="js/pages.js"></script>'); else $("body").append('<script src="js/pages.js"></script>');
  for (const src of opts.scripts || []) $("body").append(`<script src="${esc(src)}" defer></script>`);

  // links: header, menu and footer anchors point to the home page sections (or the new directory pages);
  // relative asset paths become absolute so they work from /doctors/<slug>
  $("a[href^='#']").each((_, a) => {
    const h = $(a).attr("href");
    if (h === "#" || h === "#main" || $(a).closest("main").length) return;
    $(a).attr("href", NAV_MAP[h] || "/" + h);
  });
  $("[src], [href], [poster]").each((_, el) => {
    for (const attr of ["src", "href", "poster"]) { const v = $(el).attr(attr); if (v != null) $(el).attr(attr, rewriteUrl(v)); }
  });
  $("[srcset]").each((_, el) => {
    $(el).attr("srcset", $(el).attr("srcset").split(",").map((part) => { const [u, ...rest] = part.trim().split(/\s+/); return [rewriteUrl(u), ...rest].join(" "); }).join(", "));
  });
  $(".nav__link, #mobileMenu a").removeClass("is-active").removeAttr("aria-current");
  if (opts.active) $(`.nav__link[href="${opts.active}"], #mobileMenu a[href="${opts.active}"]`).addClass("is-active").attr("aria-current", "page");
  // Hindi: every internal page link stays in /hi/ (files, APIs and the language switcher keep their address)
  if (hi) $("a[href^='/']").each((_, a) => { if (!$(a).is("[data-lang-switch]")) $(a).attr("href", i18n.localizeHref($(a).attr("href"), "hi")); });
  return $.html();
}

function send(res, req, opts) {
  res.status(opts.status || 200).type("html").setHeader("Cache-Control", "no-cache");
  res.send(renderInner(req, opts));
}

/* ---------- shared fragments ---------- */
function crumbs(items, lang = "en") {
  return `<nav class="crumbs" aria-label="${esc(tr(lang, "Breadcrumb"))}"><ol>${items.map((it, i) => (i === items.length - 1
    ? `<li><span aria-current="page">${esc(it.name)}</span></li>`
    : `<li><a href="${esc(it.path)}">${esc(it.name)}</a></li>`)).join("")}</ol></nav>`;
}
function crumbsLd(base, items, lang = "en") {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: base + i18n.localizeHref(it.path, lang) })) };
}
function pageHead({ trail, kicker, fact, title, lead, side, lang = "en" }) {
  return `<section class="pg-head"><div class="wrap">
    ${crumbs(trail, lang)}
    <header class="sec-head${side ? " sec-head--row" : ""} pg-head__h">
      <div class="sec-head__bar"><p class="kicker">${esc(kicker)}</p>${fact ? `<p class="sec-fact">${fact}</p>` : ""}</div>
      <h1 class="pg-title">${esc(title)}</h1>
      ${lead ? `<p class="sec-head__sub${side ? " sec-head__side" : ""}">${esc(lead)}</p>` : ""}
    </header>
  </div></section>`;
}
function opdHtml(opd) {
  const [days, hours] = String(opd || "").split(" · ");
  if (!hours) return esc(opd);
  return `${esc(days)} · ${hours.split(", ").map((r) => `<span class="nowrap">${esc(r)}</span>`).join(", ")}`;
}
/** Visible items of a collection in a language (Hindi fields swapped in; English fallback). */
const vis = (col, lang = "en") => visible(col).map((x) => i18n.localized(col, x, lang));
const deptBySlug = (slug, lang) => vis("departments", lang).find((d) => d.slug === slug);
const deptByName = (name, lang) => vis("departments", lang).find((d) => d.name === name);
const doctorByName = (name, lang) => vis("doctors", lang).find((d) => d.name === name);
const docsIn = (dept, lang) => vis("doctors", lang).filter((d) => d.dept === dept);
/** A speciality's display name (Hindi on Hindi pages); doctors and symptoms store the English name. */
const deptLabel = (name, lang) => { const d = deptByName(name, lang); return (d && d.label) || name; };
const lower = (s, lang) => (lang === "hi" ? s : String(s).toLowerCase());
const nf = (n) => Number(n).toLocaleString("en-IN");

function doctorCard(d, { headingTag = "h3", lang = "en" } = {}) {
  const T = (s, v) => tr(lang, s, v);
  const dep = deptByName(d.dept, lang);
  const dl = deptLabel(d.dept, lang);
  const H = headingTag;
  return `<article class="doc pg-doc" data-doc="${esc((d.name + " " + d.dept + (dl !== d.dept ? " " + dl : "") + " " + (d.role || "")).toLowerCase())}">
    <p class="doc__status${d.today ? " is-today" : ""}"><span class="doc__bar" aria-hidden="true"></span>${d.today ? T("In today") : T("Next: tomorrow")}${d.room ? `<span class="doc__room">${T("Room {room}", { room: esc(d.room) })}</span>` : ""}</p>
    ${d.photo ? `<img class="doc__photo" src="${esc(d.photo)}" alt="${esc(d.photoAlt || d.name)}" width="800" height="1000" loading="lazy" decoding="async">` : ""}
    <div class="doc__id">
      ${d.photo ? "" : `<span class="avatar avatar--lg" aria-hidden="true">${esc(initials(d.name))}</span>`}
      <div><${H}><a class="pg-doc__link" href="/doctors/${esc(d.slug)}">${esc(d.name)}</a></${H}><p class="doc__role">${esc(d.role)}</p>${String(d.role || "").toLowerCase().includes(String(dl).toLowerCase()) ? "" : `<p class="doc__dept">${dep ? `<a href="/specialities/${esc(dep.slug)}">${esc(dl)}</a>` : esc(dl)}</p>`}</div>
    </div>
    ${d.deg ? `<p class="doc__deg">${esc(d.deg)}</p>` : ""}
    <dl class="doc__facts">
      ${d.lang ? `<div><dt>${T("Speaks")}</dt><dd>${esc(d.lang)}</dd></div>` : ""}
      ${d.opd ? `<div><dt>OPD</dt><dd class="num">${opdHtml(d.opd)}</dd></div>` : ""}
    </dl>
    <p class="doc__meta num">${d.exp ? `<span>${T("<b>{n}</b> yrs", { n: esc(d.exp) })}</span>` : ""}${d.exp && d.rating ? " · " : ""}${d.rating ? `<span>★ <b>${esc(d.rating)}</b>${d.reviews ? ` (${nf(d.reviews)})` : ""}</span>` : ""}</p>
    <div class="doc__foot">
      <span>${d.fee ? `<span class="doc__fee num">${inr(d.fee)}</span>` : ""}${d.video ? ` <span class="doc__video">${icon("i-video")} ${T("Video")}</span>` : ""}</span>
      <a class="link-btn" href="${esc(bookHref({ doctor: d.name }))}">${T("Book")} ${icon("i-arrow")}<span class="sr-only"> ${esc(d.name)}</span></a>
    </div>
  </article>`;
}

function specimenFigure(d, { size = "lg", lang = "en" } = {}) {
  const T = (s, v) => tr(lang, s, v);
  const name = d.label || d.name;
  const still = d.specimen && fileExists(`assets/img/specimens/${d.specimen}-1072.webp`) ? `assets/img/specimens/${d.specimen}-1072.webp` : null;
  const credit = d.credit ? `<small class="credit">${esc(d.credit)}.${d.creditId ? ` <a href="/credits.html#${esc(d.creditId)}">${T("Credits")}</a>` : ""}</small>` : "";
  if (still) {
    return `<figure class="pg-specimen pg-specimen--${size}"><div class="pg-specimen__stage"><img src="/${still}" width="1072" height="1072" alt="${esc(T("Porcelain model: {what}", { what: d.caption ? d.caption.split(lang === "hi" ? "।" : ".")[0] : name }))}" decoding="async"${size === "sm" ? ' loading="lazy"' : ""}></div>
      ${d.caption ? `<figcaption class="cap"><b class="cap__title">${esc(name)}</b><span class="cap__text">${esc(d.caption)}</span>${credit}</figcaption>` : ""}</figure>`;
  }
  if (d.image) {
    return `<figure class="pg-specimen pg-specimen--photo"><div class="pg-specimen__stage pg-specimen__stage--deep"><img src="${esc(rewriteUrl(d.image))}" alt="" decoding="async"></div>
      ${d.caption ? `<figcaption class="cap"><b class="cap__title">${esc(name)}</b><span class="cap__text">${esc(d.caption)}</span>${credit}</figcaption>` : ""}</figure>`;
  }
  return `<figure class="pg-specimen pg-specimen--type"><div class="pg-specimen__stage pg-specimen__stage--type"><span class="pg-specimen__type${String(d.stillText || "").length > 4 ? " is-long" : ""}" aria-hidden="true">${esc(d.stillText || initials(d.name))}</span></div>
    ${d.caption ? `<figcaption class="cap"><b class="cap__title">${esc(name)}</b><span class="cap__text">${esc(d.caption)}</span></figcaption>` : ""}</figure>`;
}
function deptThumb(d) {
  if (d.still && fileExists(`${d.still}-320.webp`)) return `<img class="pg-spec__img" src="/${esc(d.still)}-320.webp" width="160" height="160" alt="" loading="lazy" decoding="async">`;
  return `<span class="pg-spec__img pg-spec__img--type${String(d.stillText || "").length > 4 ? " is-long" : ""}" aria-hidden="true">${esc(d.stillText || initials(d.name))}</span>`;
}

const hospitalLd = (base) => ({ "@type": "Hospital", name: settings().name, url: base + "/", telephone: settings().helpdesk, address: HOSPITAL_ADDRESS });

/* =========================================================
   Doctors
   ========================================================= */
function doctorsIndex(req, res) {
  const lang = langOf(req);
  const hi = lang === "hi";
  const T = (s, v) => tr(lang, s, v);
  const L = (p) => i18n.localizeHref(p, lang);
  const base = baseUrl(req);
  const all = vis("doctors", lang);
  const depts = vis("departments", lang);
  const current = req.query.speciality ? deptBySlug(String(req.query.speciality), lang) : null;
  if (req.query.speciality && !current) return notFound(req, res);
  const list = current ? all.filter((d) => d.dept === current.name) : all;
  const today = list.filter((d) => d.today).length;
  const trail = [{ name: T("Home"), path: "/" }, { name: T("Doctors"), path: "/doctors" }];
  if (current) trail.push({ name: current.label, path: `/doctors?speciality=${current.slug}` });
  const tabs = [{ label: T("All"), href: "/doctors", on: !current, n: all.length }, ...depts.map((d) => ({ label: d.label, href: `/doctors?speciality=${d.slug}`, on: current && current.slug === d.slug, n: all.filter((x) => x.dept === d.name).length }))].filter((t) => t.n > 0);
  const body = `
  ${pageHead({ lang, trail, kicker: T("Our doctors"), fact: T(list.length === 1 ? "{n} consultant · {m} in today" : "{n} consultants · {m} in today", { n: list.length, m: today }), title: current ? T("{dept} doctors", { dept: current.label }) : T("Find a doctor"),
    lead: current ? T("Consultants in {dept} at CareNova, with their OPD days, languages and fees. Book online in under a minute.", { dept: lower(current.label, lang) }) : T("Every consultant, with their OPD days, languages and consultation fees. Open a profile to read about their training and the conditions they treat."), side: true })}
  <section class="section pg-section pg-section--tight"><div class="wrap">
    <div class="pg-filters">
      <nav class="tabs pg-tabs" aria-label="${esc(T("Filter by speciality"))}">${tabs.map((t) => `<a href="${esc(t.href)}"${t.on ? ' aria-current="page"' : ""}>${esc(t.label)} <span class="pg-tabs__n">${t.n}</span></a>`).join("")}</nav>
      <div class="pg-filters__row">
        <div class="field-inline pg-search">${icon("i-search")}<label for="dirSearch" class="sr-only">${T("Search doctors by name or condition")}</label><input type="search" id="dirSearch" placeholder="${esc(T("Search by name or role"))}" data-filter=".pg-doc"></div>
        <label class="check"><input type="checkbox" id="dirToday" data-filter-flag="today"><span>${T("Available today")}</span></label>
        <label class="check"><input type="checkbox" id="dirVideo" data-filter-flag="video"><span>${T("Video consult")}</span></label>
      </div>
    </div>
    <div class="doc-grid pg-doc-grid">${list.map((d) => doctorCard(d, { lang }).replace('class="doc pg-doc"', `class="doc pg-doc" data-today="${d.today ? 1 : 0}" data-video="${d.video ? 1 : 0}"`)).join("")}</div>
    <p class="empty" id="dirEmpty" hidden>${T("No doctors match.")} <a class="link-btn" href="${current ? `/doctors?speciality=${esc(current.slug)}` : "/doctors"}">${T("Clear the search")}</a></p>
    ${current ? `<p class="pg-more"><a class="link-btn" href="/specialities/${esc(current.slug)}">${T("About {dept} at CareNova", { dept: esc(lower(current.label, lang)) })} ${icon("i-arrow")}</a></p>` : ""}
  </div></section>`;
  send(res, req, {
    lang, title: current ? T("{dept} doctors in Gurugram", { dept: current.label }) : T("Find a doctor"), path: current ? `/doctors?speciality=${current.slug}` : "/doctors", active: "/doctors",
    description: current ? T("Book a {dept} consultant at {hospital}, Gurugram. OPD days, fees, languages and video consultations.", { dept: lower(current.label, lang), hospital: settings().name }) : T("{n} consultants across {m} specialities at {hospital}, Gurugram. See OPD days, fees and languages, and book online.", { n: all.length, m: depts.length, hospital: settings().name }),
    jsonLd: [crumbsLd(base, trail, lang), { "@context": "https://schema.org", "@type": "ItemList", itemListElement: list.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}${L(`/doctors/${d.slug}`)}`, name: d.name })) }],
    body
  });
  void hi;
}

function doctorPage(req, res) {
  const lang = langOf(req);
  const T = (s, v) => tr(lang, s, v);
  const L = (p) => i18n.localizeHref(p, lang);
  const d = vis("doctors", lang).find((x) => x.slug === req.params.slug);
  if (!d) return notFound(req, res);
  const s = settings();
  const base = baseUrl(req);
  const dep = deptByName(d.dept, lang);
  const dl = deptLabel(d.dept, lang);
  const trail = [{ name: T("Home"), path: "/" }, { name: T("Doctors"), path: "/doctors" }, ...(dep ? [{ name: dep.label, path: `/doctors?speciality=${dep.slug}` }] : []), { name: d.name, path: `/doctors/${d.slug}` }];
  const reviews = asArray(d.patientReviews).filter((r) => r && r.text);
  const others = docsIn(d.dept, lang).filter((x) => x.name !== d.name);
  const articles = vis("articles", lang).filter((a) => !a.url && (a.authorDoctor || a.author) === d.name);
  const stars = (n) => { const k = Math.max(0, Math.min(5, Math.round(Number(n) || 0))); return `<span class="pg-stars" aria-label="${esc(T("{k} out of 5", { k }))}">${"★".repeat(k)}<span aria-hidden="true">${"★".repeat(5 - k)}</span></span>`; };
  const facts = [
    [T("Speciality"), dep ? `<a href="/specialities/${esc(dep.slug)}">${esc(dl)}</a>` : esc(dl)],
    d.exp ? [T("Experience"), T("{n} years", { n: esc(d.exp) })] : null,
    d.lang ? [T("Languages"), esc(d.lang)] : null,
    d.opd ? ["OPD", `<span class="num">${opdHtml(d.opd)}</span>`] : null,
    d.room ? [T("Room"), esc(d.room)] : null,
    d.fee ? [T("Consultation"), `<span class="num">${inr(d.fee)}</span>`] : null,
    [T("Video consult"), d.video ? T("Available") : T("At the hospital only")]
  ].filter(Boolean);
  const body = `
  <section class="pg-head pg-head--flush"><div class="wrap">${crumbs(trail, lang)}</div></section>
  <section class="section pg-section pg-section--top"><div class="wrap prof">
    <header class="prof__head">
      <p class="prof__status${d.today ? " is-today" : ""}"><span class="doc__bar" aria-hidden="true"></span>${d.today ? T("In today") : T("Next available: tomorrow")}${dep ? ` · <a href="/specialities/${esc(dep.slug)}">${esc(dl)}</a>` : ` · ${esc(dl)}`}</p>
      <h1 class="pg-title">${esc(d.name)}</h1>
      <p class="prof__role">${esc(d.role)}</p>
      ${d.deg ? `<p class="prof__deg">${esc(d.deg)}</p>` : ""}
      ${d.rating ? `<p class="prof__rating num">★ <b>${esc(d.rating)}</b> ${T("out of 5")}${d.reviews ? ` · ${T("{n} patient ratings", { n: nf(d.reviews) })}` : ""}</p>` : ""}
    </header>
    <aside class="prof__card" aria-label="${esc(T("Appointment details"))}">
      ${d.photo ? `<img class="prof__photo" src="${esc(rewriteUrl(d.photo))}" alt="${esc(d.photoAlt || d.name)}" width="800" height="1000" decoding="async">` : `<div class="prof__mono" aria-hidden="true"><span>${esc(initials(d.name))}</span></div>`}
      <dl class="prof__facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <div class="prof__actions">
        <a class="btn btn--accent btn--block" href="${esc(bookHref({ doctor: d.name }))}">${T("Book appointment")}</a>
        <a class="btn btn--line btn--block" href="${esc(telHref(s.helpdesk))}">${icon("i-phone")} ${T("Call the helpdesk")}</a>
      </div>
    </aside>
    <div class="prof__body">
      ${d.bio ? `<section class="prof__sec" aria-labelledby="about"><h2 id="about" class="pg-h2">${T("About")}</h2><div class="prose">${renderMarkdown(d.bio)}</div></section>` : ""}
      ${asArray(d.conditions).length ? `<section class="prof__sec" aria-labelledby="conds"><h2 id="conds" class="pg-h2">${T("Conditions treated")}</h2><ul class="pg-tags">${d.conditions.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}
      ${asArray(d.education).length ? `<section class="prof__sec" aria-labelledby="edu"><h2 id="edu" class="pg-h2">${T("Education and training")}</h2><ul class="pg-ticks">${d.education.map((c) => `<li>${icon("i-check")}<span>${esc(c)}</span></li>`).join("")}</ul></section>` : ""}
      ${asArray(d.awards).length ? `<section class="prof__sec" aria-labelledby="awards"><h2 id="awards" class="pg-h2">${T("Awards and memberships")}</h2><ul class="pg-ticks">${d.awards.map((c) => `<li>${icon("i-star")}<span>${esc(c)}</span></li>`).join("")}</ul></section>` : ""}
      ${reviews.length ? `<section class="prof__sec" aria-labelledby="revs"><h2 id="revs" class="pg-h2">${T("What patients say")}</h2>
        <div class="pg-reviews">${reviews.map((r) => `<figure class="pg-review">${stars(r.rating)}<blockquote><p>${esc(r.text)}</p></blockquote><figcaption><b>${esc(r.name || T("Patient"))}</b>${r.date ? ` · <span>${esc(fmtDate(r.date, lang))}</span>` : ""}</figcaption></figure>`).join("")}</div>
        <p class="pg-note">${T("Reviews are shared by patients after their visit. Names are shortened for privacy.")}</p></section>` : ""}
      ${articles.length ? `<section class="prof__sec" aria-labelledby="writes"><h2 id="writes" class="pg-h2">${T("Writes about")}</h2><ul class="pg-links">${articles.map((a) => `<li><a href="/library/${esc(a.slug)}">${esc(a.title)} ${icon("i-arrow")}</a></li>`).join("")}</ul></section>` : ""}
    </div>
  </div></section>
  ${others.length ? `<section class="section section--sunk pg-section"><div class="wrap">
    <header class="sec-head"><div class="sec-head__bar"><p class="kicker">${T("Also in {dept}", { dept: esc(dl) })}</p>${dep ? `<p class="sec-fact"><a href="/specialities/${esc(dep.slug)}">${T("About the department")}</a></p>` : ""}</div><h2 class="pg-h2 pg-h2--lg">${T("Other {dept} consultants", { dept: esc(lower(dl, lang)) })}</h2></header>
    <div class="doc-grid pg-doc-grid">${others.slice(0, 4).map((x) => doctorCard(x, { lang })).join("")}</div>
  </div></section>` : ""}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Physician", "@id": `${base}/doctors/${d.slug}#physician`, name: d.name, url: `${base}${L(`/doctors/${d.slug}`)}`,
    description: firstPara(d.bio) || `${d.role}, ${dl}, ${s.name}.`, medicalSpecialty: d.dept, jobTitle: d.role,
    knowsLanguage: String(visible("doctors").find((x) => x.slug === d.slug).lang || "").split(",").map((x) => x.trim()).filter(Boolean),
    hospitalAffiliation: hospitalLd(base), address: HOSPITAL_ADDRESS, telephone: s.helpdesk, isAcceptingNewPatients: true
  };
  if (lang === "hi") ld.inLanguage = "hi-IN";
  if (d.photo) ld.image = /^https?:/.test(d.photo) ? d.photo : base + rewriteUrl(d.photo);
  if (d.rating && d.reviews) ld.aggregateRating = { "@type": "AggregateRating", ratingValue: d.rating, reviewCount: d.reviews, bestRating: 5 };
  if (d.fee) ld.priceRange = T("{fee} consultation", { fee: inr(d.fee) });
  if (d.opd) ld.availableService = { "@type": "MedicalProcedure", name: T("OPD consultation ({opd})", { opd: d.opd }) };
  send(res, req, {
    lang, title: `${d.name}, ${d.role}`, path: `/doctors/${d.slug}`, active: "/doctors", type: "profile", image: d.photo || (dep && dep.specimen ? `assets/img/specimens/${dep.specimen}-1072.webp` : ""),
    description: lang === "hi"
      ? `${d.name}${d.deg ? `, ${d.deg}` : ""}। ${s.name}, गुरुग्राम में ${dl} विभाग में ${d.role}। ${d.exp ? `${d.exp} वर्ष का अनुभव। ` : ""}${d.opd ? `OPD ${d.opd}। ` : ""}ऑनलाइन अपॉइंटमेंट बुक करें।`
      : `${d.name}${d.deg ? `, ${d.deg}` : ""}. ${d.role} in ${d.dept} at ${s.name}, Gurugram. ${d.exp ? `${d.exp} years of experience. ` : ""}${d.opd ? `OPD ${d.opd}. ` : ""}Book online.`,
    jsonLd: [ld, crumbsLd(base, trail, lang)], body
  });
}

/* =========================================================
   Specialities
   ========================================================= */
function specialitiesIndex(req, res) {
  const lang = langOf(req);
  const T = (s, v) => tr(lang, s, v);
  const L = (p) => i18n.localizeHref(p, lang);
  const base = baseUrl(req);
  const depts = vis("departments", lang);
  const trail = [{ name: T("Home"), path: "/" }, { name: T("Specialities"), path: "/specialities" }];
  const body = `
  ${pageHead({ lang, trail, kicker: T("Specialities"), fact: T("{n} centres · {m} consultants", { n: depts.length, m: visible("doctors").length }), title: T("Specialities and centres"), lead: T("Each centre has its own consultants, operating theatres and ICU. Open one to see the conditions it treats, indicative costs and its doctors."), side: true })}
  <section class="section pg-section pg-section--tight"><div class="wrap">
    <ul class="pg-specs">${depts.map((d) => {
      const n = docsIn(d.name, lang).length;
      return `<li><a class="pg-spec" href="/specialities/${esc(d.slug)}">
        ${deptThumb(d)}
        <span class="pg-spec__text"><span class="pg-spec__name">${esc(d.label)}</span><span class="pg-spec__desc">${esc(d.desc)}</span></span>
        <span class="pg-spec__foot"><span class="pg-spec__count">${T(n === 1 ? "{n} doctor" : "{n} doctors", { n })}</span><span class="spec__go" aria-hidden="true">${icon("i-arrow")}</span></span>
      </a></li>`;
    }).join("")}</ul>
  </div></section>`;
  send(res, req, {
    lang, title: T("Specialities"), path: "/specialities", active: "/specialities",
    description: T("{n} specialities at {hospital}, Gurugram: {list}. Conditions treated, procedures, indicative costs and doctors.", { n: depts.length, hospital: settings().name, list: depts.map((d) => d.label).join(", ") }),
    jsonLd: [crumbsLd(base, trail, lang), { "@context": "https://schema.org", "@type": "ItemList", itemListElement: depts.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}${L(`/specialities/${d.slug}`)}`, name: d.label })) }],
    body
  });
}

function specialityPage(req, res) {
  const lang = langOf(req);
  const T = (s, v) => tr(lang, s, v);
  const L = (p) => i18n.localizeHref(p, lang);
  const d = deptBySlug(req.params.slug, lang);
  if (!d) return notFound(req, res);
  const s = settings();
  const base = baseUrl(req);
  const docs = docsIn(d.name, lang);
  const inToday = docs.filter((x) => x.today).length;
  const costs = asArray(d.costs).filter((c) => c && c.item);
  const faqs = asArray(d.faqs).filter((f) => f && f.q && f.a);
  const trail = [{ name: T("Home"), path: "/" }, { name: T("Specialities"), path: "/specialities" }, { name: d.label, path: `/specialities/${d.slug}` }];
  const range = (c) => (c.from && c.to && Number(c.to) !== Number(c.from) ? `${inr(c.from)} – ${inr(c.to)}` : inr(c.from || c.to));
  const body = `
  <section class="pg-head pg-head--flush"><div class="wrap">${crumbs(trail, lang)}</div></section>
  <section class="section pg-section pg-section--top"><div class="wrap pg-spechero">
    <div class="pg-spechero__copy">
      <div class="sec-head__bar"><p class="kicker">${T("Speciality")}</p><p class="sec-fact">${T(docs.length === 1 ? "{n} consultant" : "{n} consultants", { n: docs.length })}${docs.length ? ` · ${T("{n} in today", { n: inToday })}` : ""}</p></div>
      <h1 class="pg-title pg-title--xl">${esc(d.label)}</h1>
      <p class="pg-lead">${esc(d.desc)}</p>
      <div class="pg-actions">
        <a class="btn btn--accent" href="${esc(bookHref({ dept: d.name }))}">${T("Book in {dept}", { dept: esc(d.label) })}</a>
        ${docs.length ? `<a class="btn btn--line" href="/specialities/${esc(d.slug)}#doctors-list">${T("See the doctors")}</a>` : ""}
      </div>
      ${d.overview ? `<div class="prose pg-overview">${renderMarkdown(d.overview)}</div>` : ""}
    </div>
    <div class="pg-spechero__fig">${specimenFigure(d, { lang })}</div>
  </div></section>
  ${asArray(d.conditions).length || asArray(d.treatments).length ? `<section class="section section--sunk pg-section"><div class="wrap">
    <div class="pg-two">
      ${asArray(d.conditions).length ? `<div><header class="sec-head pg-sub"><div class="sec-head__bar"><p class="kicker">${T("Conditions")}</p></div><h2 class="pg-h2 pg-h2--lg">${T("What we treat")}</h2></header><ul class="pg-ticks pg-ticks--lg">${d.conditions.map((c) => `<li>${icon("i-check")}<span>${esc(c)}</span></li>`).join("")}</ul></div>` : ""}
      ${asArray(d.treatments).length ? `<div><header class="sec-head pg-sub"><div class="sec-head__bar"><p class="kicker">${T("Treatments and procedures")}</p></div><h2 class="pg-h2 pg-h2--lg">${T("How we treat it")}</h2></header><ul class="pg-ticks pg-ticks--lg">${d.treatments.map((c) => `<li>${icon("i-arrow")}<span>${esc(c)}</span></li>`).join("")}</ul></div>` : ""}
    </div>
  </div></section>` : ""}
  ${costs.length ? `<section class="section pg-section"><div class="wrap pg-costs">
    <header class="sec-head pg-sub"><div class="sec-head__bar"><p class="kicker">${T("Indicative costs")}</p><p class="sec-fact">${T("In Indian rupees")}</p></div><h2 class="pg-h2 pg-h2--lg">${T("What it usually costs")}</h2>
      <p class="sec-head__sub">${T("These ranges are indicative, for planning only. Your estimate depends on your condition, room type, implants and length of stay. Ask the billing desk for a written estimate before admission.")}</p></header>
    <div class="prose__table pg-costs__table" role="region" aria-label="${esc(T("Indicative costs"))}" tabindex="0"><table>
      <thead><tr><th scope="col">${T("Procedure or service")}</th><th scope="col" class="num-col">${T("Indicative range")}</th></tr></thead>
      <tbody>${costs.map((c) => `<tr><th scope="row">${esc(c.item)}</th><td class="num num-col">${range(c)}</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="pg-note">${T("Indicative only, not a quote. Insurance and TPA cover depends on your policy.")} <a href="/insurance-and-tpa">${T("Insurance and TPA")}</a></p>
  </div></section>` : ""}
  ${docs.length ? `<section class="section section--sunk pg-section" id="doctors-list"><div class="wrap">
    <header class="sec-head"><div class="sec-head__bar"><p class="kicker">${T("Doctors")}</p><p class="sec-fact"><a href="/doctors?speciality=${esc(d.slug)}">${T("All {dept} doctors", { dept: esc(lower(d.label, lang)) })}</a></p></div><h2 class="pg-h2 pg-h2--lg">${T("Consultants in {dept}", { dept: esc(d.label) })}</h2></header>
    <div class="doc-grid pg-doc-grid">${docs.map((x) => doctorCard(x, { lang })).join("")}</div>
  </div></section>` : ""}
  ${faqs.length ? `<section class="section pg-section"><div class="wrap pg-faq-wrap">
    <header class="sec-head pg-sub"><div class="sec-head__bar"><p class="kicker">${T("Questions")}</p></div><h2 class="pg-h2 pg-h2--lg">${T("Questions patients ask")}</h2></header>
    <div class="pg-faq">${faqs.map((f, i) => `<details class="pg-faq__item"${i === 0 ? " open" : ""}><summary>${esc(f.q)}${icon("i-arrow")}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>
  </div></section>` : ""}`;
  const ld = [{
    "@context": "https://schema.org", "@type": "MedicalClinic", "@id": `${base}/specialities/${d.slug}#clinic`, name: `${d.label} · ${s.name}`, url: `${base}${L(`/specialities/${d.slug}`)}`,
    description: firstPara(d.overview) || d.desc, medicalSpecialty: d.name, telephone: s.helpdesk, address: HOSPITAL_ADDRESS, parentOrganization: hospitalLd(base),
    availableService: asArray(d.treatments).map((t) => ({ "@type": "MedicalProcedure", name: t })),
    employee: docs.map((x) => ({ "@type": "Physician", name: x.name, url: `${base}${L(`/doctors/${x.slug}`)}` }))
  }, crumbsLd(base, trail, lang)];
  if (lang === "hi") ld[0].inLanguage = "hi-IN";
  if (d.specimen && fileExists(`assets/img/specimens/${d.specimen}-1072.webp`)) ld[0].image = `${base}/assets/img/specimens/${d.specimen}-1072.webp`;
  if (faqs.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", ...(lang === "hi" ? { inLanguage: "hi-IN" } : {}), mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  send(res, req, {
    lang, title: T("{dept} in Gurugram", { dept: d.label }), path: `/specialities/${d.slug}`, active: "/specialities",
    image: d.specimen ? `assets/img/specimens/${d.specimen}-1072.webp` : d.image || "",
    description: T(docs.length === 1 ? "{dept} at {hospital}, Gurugram. {desc} Conditions treated, procedures, indicative costs and {n} consultant." : "{dept} at {hospital}, Gurugram. {desc} Conditions treated, procedures, indicative costs and {n} consultants.", { dept: d.label, hospital: s.name, desc: d.desc, n: docs.length }),
    jsonLd: ld, body
  });
}

/* =========================================================
   Health library
   ========================================================= */
function readingTime(a, lang = "en") {
  if (a.readTime) return lang === "hi" ? String(a.readTime).replace(/\bmin\b/, "मिनट") : a.readTime;
  return tr(lang, "{n} min", { n: Math.max(1, Math.round(words(a.body) / 200)) });
}
function articleAuthor(a, lang) { return doctorByName(a.authorDoctor, lang) || doctorByName(a.author, lang) || null; }

function libraryIndex(req, res) {
  const lang = langOf(req);
  const T = (s, v) => tr(lang, s, v);
  const L = (p) => i18n.localizeHref(p, lang);
  const base = baseUrl(req);
  const list = vis("articles", lang);
  const trail = [{ name: T("Home"), path: "/" }, { name: T("Health library"), path: "/library" }];
  const body = `
  ${pageHead({ lang, trail, kicker: T("Health library"), fact: T(list.length === 1 ? "{n} article" : "{n} articles", { n: list.length }), title: T("Written by our doctors"), lead: T("Plain-language guides from CareNova's consultants on symptoms, tests, treatment and recovery."), side: true })}
  <section class="section pg-section pg-section--tight"><div class="wrap">
    <ul class="articles pg-articles">${list.map((a) => {
      const ext = a.url && /^https?:/i.test(a.url);
      const href = a.url || `/library/${a.slug}`;
      return `<li><a href="${esc(rewriteUrl(href))}"${ext ? ' target="_blank" rel="noopener"' : ""}>` +
        (a.image ? `<img class="articles__thumb${a.round ? " articles__thumb--round" : ""}" src="${esc(rewriteUrl(a.image))}" width="320" height="320" alt="" loading="lazy" decoding="async">` : `<span class="articles__thumb pg-articles__blank" aria-hidden="true"></span>`) +
        `<span class="articles__cat">${esc(a.category || "")}</span><span class="articles__title">${esc(a.title)}</span>` +
        `<span class="articles__meta mono">${esc((articleAuthor(a, lang) || {}).name || a.author || "")}${a.body || a.readTime ? ` · <span class="nowrap">${esc(readingTime(a, lang))}</span>` : ""}</span>${icon(ext ? "i-arrow-ur" : "i-arrow")}</a></li>`;
    }).join("")}</ul>
  </div></section>`;
  send(res, req, {
    lang, title: T("Health library"), path: "/library",
    description: T("Health guides written by {hospital} doctors: {list} and more.", { hospital: settings().name, list: list.slice(0, 3).map((a) => lower(a.title, lang)).join("; ") }),
    jsonLd: [crumbsLd(base, trail, lang), { "@context": "https://schema.org", "@type": "Blog", name: T("{hospital} health library", { hospital: settings().name }), url: `${base}${L("/library")}`, ...(lang === "hi" ? { inLanguage: "hi-IN" } : {}), blogPost: list.filter((a) => !a.url).map((a) => ({ "@type": "BlogPosting", headline: a.title, url: `${base}${L(`/library/${a.slug}`)}`, datePublished: a.date || undefined })) }],
    body
  });
}

function articlePage(req, res) {
  const lang = langOf(req);
  const T = (s, v) => tr(lang, s, v);
  const L = (p) => i18n.localizeHref(p, lang);
  const a = vis("articles", lang).find((x) => x.slug === req.params.slug);
  if (!a) return notFound(req, res);
  if (a.url && /^https?:/i.test(a.url) && !a.body) return res.redirect(302, a.url);
  const s = settings();
  const base = baseUrl(req);
  const doc = articleAuthor(a, lang);
  const authorName = (doc && doc.name) || a.author || s.name;
  const trail = [{ name: T("Home"), path: "/" }, { name: T("Health library"), path: "/library" }, { name: a.title, path: `/library/${a.slug}` }];
  const related = vis("articles", lang).filter((x) => x.slug !== a.slug && !x.url).slice(0, 3);
  const dep = doc ? deptByName(doc.dept, lang) : null;
  const body = `
  <section class="pg-head pg-head--flush"><div class="wrap">${crumbs(trail, lang)}</div></section>
  <article class="section pg-section pg-section--top"><div class="wrap pg-article">
    <header class="pg-article__head">
      <p class="pg-article__cat">${esc(a.category || T("Health library"))}</p>
      <h1 class="pg-title">${esc(a.title)}</h1>
      ${a.summary ? `<p class="pg-lead">${esc(a.summary)}</p>` : ""}
      <p class="pg-article__meta">
        ${doc ? `<a class="pg-byline" href="/doctors/${esc(doc.slug)}"><span class="avatar" aria-hidden="true">${esc(initials(doc.name))}</span><span><b>${esc(doc.name)}</b><small>${esc(doc.role)}</small></span></a>` : `<span class="pg-byline"><span><b>${esc(authorName)}</b></span></span>`}
        <span class="pg-article__facts mono">${a.date ? `<time datetime="${esc(a.date)}">${esc(fmtDate(a.date, lang))}</time> · ` : ""}<span class="nowrap">${esc(T("{time} read", { time: readingTime(a, lang) }))}</span></span>
      </p>
    </header>
    ${a.image ? `<figure class="pg-article__fig${a.round ? " is-deep" : ""}"><img src="${esc(rewriteUrl(a.image))}" alt="" width="640" height="640" decoding="async"></figure>` : ""}
    <div class="prose pg-article__body">${a.body ? renderMarkdown(a.body) : `<p>${T("This article is being written. Please check back soon.")}</p>`}</div>
    <aside class="pg-article__aside" aria-label="${esc(T("About the author"))}">
      ${doc ? `<div class="pg-author">
        <p class="kicker">${T("About the author")}</p>
        <p class="pg-author__name"><a href="/doctors/${esc(doc.slug)}">${esc(doc.name)}</a></p>
        <p class="pg-author__role">${esc(doc.role)}${dep ? `, <a href="/specialities/${esc(dep.slug)}">${esc(dep.label)}</a>` : ""}</p>
        <a class="btn btn--accent btn--sm" href="${esc(bookHref({ doctor: doc.name }))}">${T("Book with {name}", { name: esc(doc.name.replace(/^Dr\.?\s*/i, "Dr ")) })}</a>
      </div>` : ""}
      <p class="pg-note">${T('This article is general information, not medical advice. Speak to a doctor about your own health. In an emergency, call <a class="mono" href="tel:18001234567">1800-123-4567</a>.')}</p>
    </aside>
  </div></article>
  ${related.length ? `<section class="section section--sunk pg-section"><div class="wrap">
    <header class="sec-head"><div class="sec-head__bar"><p class="kicker">${T("Keep reading")}</p><p class="sec-fact"><a href="/library">${T("All articles")}</a></p></div><h2 class="pg-h2 pg-h2--lg">${T("More from the health library")}</h2></header>
    <ul class="articles">${related.map((x) => `<li><a href="/library/${esc(x.slug)}">${x.image ? `<img class="articles__thumb${x.round ? " articles__thumb--round" : ""}" src="${esc(rewriteUrl(x.image))}" width="320" height="320" alt="" loading="lazy" decoding="async">` : `<span class="articles__thumb pg-articles__blank" aria-hidden="true"></span>`}<span class="articles__cat">${esc(x.category || "")}</span><span class="articles__title">${esc(x.title)}</span><span class="articles__meta mono">${esc((articleAuthor(x, lang) || {}).name || x.author || "")} · <span class="nowrap">${esc(readingTime(x, lang))}</span></span>${icon("i-arrow")}</a></li>`).join("")}</ul>
  </div></section>` : ""}`;
  const ld = {
    "@context": "https://schema.org", "@type": "MedicalWebPage", "@id": `${base}${L(`/library/${a.slug}`)}#article`, headline: a.title, name: a.title, url: `${base}${L(`/library/${a.slug}`)}`,
    description: a.summary || firstPara(a.body), datePublished: a.date || undefined, articleSection: a.category || undefined, inLanguage: lang === "hi" ? "hi-IN" : "en-IN",
    author: doc ? { "@type": "Physician", name: doc.name, url: `${base}${L(`/doctors/${doc.slug}`)}` } : { "@type": "Person", name: authorName },
    publisher: hospitalLd(base), lastReviewed: a.date || undefined
  };
  if (a.image) ld.image = base + rewriteUrl(a.image);
  send(res, req, {
    lang, title: a.title, path: `/library/${a.slug}`, type: "article", image: a.image,
    description: a.summary || firstPara(a.body) || T("{title}. By {author}.", { title: a.title, author: authorName }), jsonLd: [ld, crumbsLd(base, trail, lang)], body
  });
}

/* =========================================================
   Custom pages and 404
   ========================================================= */
function customPage(req, res, next) {
  const lang = langOf(req);
  const T = (s, v) => tr(lang, s, v);
  const L = (p) => i18n.localizeHref(p, lang);
  const slug = String(req.params.slug || "");
  if (!/^[a-z0-9-]+$/.test(slug)) return next();
  const p = vis("pages", lang).find((x) => x.slug === slug);
  if (!p) return FIXED.includes(slug) && lang === "en" ? next() : notFound(req, res);   // /admin and the static folders are handled later
  const base = baseUrl(req);
  const trail = [{ name: T("Home"), path: "/" }, { name: p.title, path: `/${p.slug}` }];
  const body = `
  <section class="pg-head${p.image ? " pg-head--image" : ""}"><div class="wrap">
    ${crumbs(trail, lang)}
    <header class="sec-head pg-head__h">
      <div class="sec-head__bar"><p class="kicker">${esc(settings().name)}</p></div>
      <h1 class="pg-title">${esc(p.title)}</h1>
      ${p.summary ? `<p class="sec-head__sub">${esc(p.summary)}</p>` : ""}
    </header>
  </div>
  ${p.image ? `<div class="wrap"><figure class="pg-hero-img"><img src="${esc(rewriteUrl(p.image))}" alt="${esc(p.imageAlt || "")}" width="1600" height="686" decoding="async"></figure></div>` : ""}
  </section>
  <section class="section pg-section pg-section--tight"><div class="wrap pg-page">
    <div class="prose pg-page__body">${renderMarkdown(p.body)}</div>
    <aside class="pg-page__aside" aria-label="${esc(T("Help"))}">
      <div class="pg-help">
        <p class="kicker">${T("Need help?")}</p>
        <p><a class="mono" href="${esc(telHref(settings().helpdesk))}">${esc(settings().helpdesk)}</a><br><span>${T("Helpdesk, 8 AM – 10 PM")}</span></p>
        <p><a class="mono er-text" href="tel:18001234567">1800-123-4567</a><br><span>${T("Emergency, 24x7")}</span></p>
        <a class="btn btn--accent btn--sm btn--block" href="/#book">${T("Book a visit")}</a>
      </div>
    </aside>
  </div></section>`;
  send(res, req, {
    lang, title: p.title, path: `/${p.slug}`, active: `/${p.slug}`, image: p.image,
    description: p.summary || firstPara(p.body),
    jsonLd: [{ "@context": "https://schema.org", "@type": p.slug === "contact" ? "ContactPage" : "WebPage", name: p.title, url: `${base}${L(`/${p.slug}`)}`, ...(lang === "hi" ? { inLanguage: "hi-IN" } : {}), description: p.summary || firstPara(p.body), isPartOf: { "@type": "WebSite", name: settings().name, url: base + "/" }, about: hospitalLd(base) }, crumbsLd(base, trail, lang)],
    body
  });
}

function notFound(req, res) {
  const lang = langOf(req);
  const T = (s, v) => tr(lang, s, v);
  const depts = vis("departments", lang).slice(0, 6);
  const body = `
  <section class="section pg-404"><div class="wrap pg-404__in">
    <p class="kicker">${T("Error 404")}</p>
    <h1 class="pg-title pg-title--xl">${T("We couldn't find that page.")}</h1>
    <p class="pg-lead">${T("The link may be old, or the page may have moved. These might help:")}</p>
    <div class="pg-actions"><a class="btn btn--accent" href="/doctors">${T("Find a doctor")}</a><a class="btn btn--line" href="/">${T("Go to the home page")}</a></div>
    <ul class="pg-404__links">
      <li><a href="/specialities">${T("All specialities")} ${icon("i-arrow")}</a></li>
      ${depts.map((d) => `<li><a href="/specialities/${esc(d.slug)}">${esc(d.label)} ${icon("i-arrow")}</a></li>`).join("")}
      <li><a href="/library">${T("Health library")} ${icon("i-arrow")}</a></li>
      <li><a href="/#book">${T("Book a visit")} ${icon("i-arrow")}</a></li>
    </ul>
    <p class="pg-note">${T('In an emergency, call <a class="mono er-text" href="tel:18001234567">1800-123-4567</a>.')}</p>
  </div></section>`;
  send(res, req, { lang, status: 404, title: T("Page not found"), description: T("This page could not be found."), body, noindex: true, path: i18n.basePath(req.path) });
}

/* =========================================================
   Sitemap and robots
   ========================================================= */
function sitemap(req, res) {
  const base = baseUrl(req);
  const urls = [{ loc: "/", pr: "1.0" }, { loc: "/doctors", pr: "0.9" }, { loc: "/specialities", pr: "0.9" }];
  for (const d of visible("departments")) urls.push({ loc: `/specialities/${d.slug}`, pr: "0.8" });
  for (const d of visible("doctors")) urls.push({ loc: `/doctors/${d.slug}`, pr: "0.8" });
  const arts = visible("articles").filter((a) => !a.url || !/^https?:/i.test(a.url));
  if (arts.length) urls.push({ loc: "/library", pr: "0.6" });
  for (const a of arts) urls.push({ loc: `/library/${a.slug}`, pr: "0.6", lastmod: /^\d{4}-\d{2}-\d{2}$/.test(a.date || "") ? a.date : "" });
  for (const p of visible("pages")) urls.push({ loc: `/${p.slug}`, pr: "0.5" });
  // other modules can add public paths: ctx.sitemapPaths = ["/privacy-policy", …] or a function returning them
  const extra = typeof C.sitemapPaths === "function" ? C.sitemapPaths() : C.sitemapPaths;
  for (const p of asArray(extra)) if (typeof p === "string" && p.startsWith("/")) urls.push({ loc: p, pr: "0.3" });
  // legal pages (server/privacy.js); /manage-booking is noindex, so it stays out
  for (const p of ["/privacy-policy", "/terms", "/patient-rights", "/data-request"]) if (hasRoute(p)) urls.push({ loc: p, pr: "0.3" });
  if (fileExists("credits.html")) urls.push({ loc: "/credits.html", pr: "0.2", shared: true });
  // every page is listed in English and in Hindi (/hi/…), each with its hreflang alternates
  const seen = new Set();
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
  for (const u of urls) {
    if (seen.has(u.loc)) continue;
    seen.add(u.loc);
    const langs = u.shared ? ["en"] : ["en", "hi"];
    const alts = u.shared ? "" : ["en", "hi"].map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(base + i18n.localizeHref(u.loc, l))}"/>`).join("") + `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(base + u.loc)}"/>`;
    for (const l of langs) xml.push(`  <url><loc>${esc(base + i18n.localizeHref(u.loc, l))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.pr}</priority>${alts}</url>`);
  }
  xml.push("</urlset>");
  res.type("application/xml").setHeader("Cache-Control", "no-cache");
  res.send(xml.join("\n"));
}
function robots(req, res) {
  res.type("text/plain").send(["User-agent: *", "Disallow: /admin", "Disallow: /api", "", `Sitemap: ${baseUrl(req)}/sitemap.xml`, ""].join("\n"));
}

/* =========================================================
   Menu and footer links on every page (render hook)
   ========================================================= */
function decorate($, opts = {}) {
  if (!C) return;
  const lang = i18n.norm(opts.lang);
  const T = (s, v) => tr(lang, s, v);
  if (!$('link[href$="css/pages.css"]').length) {
    const anchor = $('head link[rel="stylesheet"]').last();
    if (anchor.length) anchor.after('<link rel="stylesheet" href="css/pages.css">'); else $("head").append('<link rel="stylesheet" href="css/pages.css">');
  }
  const pages = vis("pages", lang);
  const link = (p, cls) => `<a href="/${esc(p.slug)}"${cls ? ` class="${cls}"` : ""}>${esc(p.title)}</a>`;
  for (const p of pages.filter((x) => x.showInNav)) {
    $("#nav").append(link(p, "nav__link"));
    const er = $("#mobileMenu .mobile-menu__er");
    if (er.length) er.before(link(p)); else $("#mobileMenu .mobile-menu__in").append(link(p));
  }
  const cols = $(".footer__cols");
  if (!cols.length) return;
  cols.find('a[href="#specialities"]').attr("href", "/specialities");
  cols.find('a[href="#doctors"]').attr("href", "/doctors");
  const careers = pages.find((p) => p.slug === "careers" && p.showInFooter);
  cols.find('a[href="#contact"]').filter((_, a) => $(a).attr("data-link") === "careers" || $(a).text().trim() === "Careers").each((_, a) => { if (careers) $(a).attr("href", "/careers"); else $(a).remove(); });
  if (visible("articles").length) {
    const faq = cols.find('a[href="#faq"]').first();
    const lib = `<a href="/library">${T("Health library")}</a>`;
    if (faq.length) faq.after(lib); else cols.children("div").eq(1).append(lib);
  }
  const more = pages.filter((p) => p.showInFooter && !(careers && p === careers));
  if (more.length) {
    cols.children("div").last().before(`<div><h4>${T("About us")}</h4>${more.map((p) => link(p)).join("")}</div>`);
    cols.addClass("footer__cols--4");
  }
}

/* =========================================================
   Migration: once per database, never overwrites
   ========================================================= */
function migrate() {
  const data = db();
  data.content = data.content || {};
  data.migrations = data.migrations || {};
  let changed = false;
  if (!Array.isArray(data.content.pages)) { data.content.pages = []; changed = true; }
  if (!data.migrations["pages-v1"]) {
    const fill = (item, extra) => {
      if (!item || !extra) return;
      for (const [k, v] of Object.entries(extra)) {
        const cur = item[k];
        if (cur === undefined || cur === null || cur === "" || (Array.isArray(cur) && !cur.length)) item[k] = JSON.parse(JSON.stringify(v));
      }
    };
    for (const d of data.content.doctors || []) fill(d, DEMO.DOCTORS[d.name]);
    for (const d of data.content.departments || []) fill(d, DEMO.DEPARTMENTS[d.name]);
    for (const a of data.content.articles || []) {
      const extra = DEMO.ARTICLES[a.title];
      if (!extra) continue;
      if (a.url === "#library") a.url = "";
      fill(a, extra);
    }
    if (!data.content.pages.length) {
      for (const p of DEMO.PAGES) data.content.pages.push({ id: C.newId(), hidden: false, ...JSON.parse(JSON.stringify(p)) });
    }
    data.migrations["pages-v1"] = C.nowIso();
    changed = true;
  }
  if (ensureSlugs()) changed = true;
  if (changed) { C.store.save(); console.log("pages: content migrated (pages-v1)"); }
}

/* =========================================================
   Register
   ========================================================= */
function register(ctx) {
  C = ctx;
  ctx.renderInner = renderInner;   // the one inner-page shell, shared with server/privacy.js
  const { app, store } = ctx;
  migrate();

  // keep slugs filled and unique whenever anything is saved (admin edits, new items)
  const origSave = store.save.bind(store);
  store.save = function () { try { ensureSlugs(); } catch (e) { console.warn("slug check failed:", e.message); } return origSave(); };

  addRenderHook(($, _db, _s, opts) => decorate($, opts));

  app.get("/robots.txt", robots);
  app.get("/sitemap.xml", sitemap);
  app.get("/js/pages.js", (req, res, next) => {
    // served with the settings replacements (phone numbers in chat fallbacks), like js/main.js
    const file = path.join(ctx.ROOT, "js", "pages.js");
    if (!fs.existsSync(file)) return next();
    res.type("application/javascript").setHeader("Cache-Control", "no-cache");
    res.send(ctx.applyReplacements(fs.readFileSync(file, "utf8"), db().settings));
  });
  // every page in English and, under /hi/, in Hindi (the handlers read the language from the URL)
  for (const pre of ["", "/hi"]) {
    app.get(pre + "/doctors", doctorsIndex);
    app.get(pre + "/doctors/:slug", doctorPage);
    app.get(pre + "/specialities", specialitiesIndex);
    app.get(pre + "/specialities/:slug", specialityPage);
    app.get([pre + "/specialties", pre + "/specialties/:slug"], (req, res) => res.redirect(301, pre + "/specialities" + (req.params.slug ? "/" + encodeURIComponent(req.params.slug) : "")));
    app.get(pre + "/library", libraryIndex);
    app.get(pre + "/library/:slug", articlePage);
  }
  app.get("/hi/:slug", customPage);
  app.get("/:slug", customPage);
  // unknown deeper paths under the page sections (and anything else under /hi/) get the friendly 404 as well
  app.get(["/doctors/*", "/specialities/*", "/library/*", "/hi/*"], notFound);
}

module.exports = { register, renderInner, renderMarkdown, slugify, langOf };
