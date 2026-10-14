/* Renders index.html (and the JS/HTML it depends on) from the template plus CMS data.
   - Page text/images: every visible text block and content image is discovered automatically and
     gets a stable key; overrides from the admin replace it server-side (good for SEO, no flash).
   - Sections can be hidden; settings (name, phones, email, colour, SEO, announcement) are applied.
   - js/data.js is generated from the content collections. */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { COLLECTIONS, DEFAULT_SETTINGS } = require("./schema");

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

/** Admin view: groups of fields with current values. */
function textGroups(db) {
  const { fields } = loadTemplate();
  const values = db.texts || {};
  const groups = [];
  const byId = {};
  for (const f of fields) {
    if (!byId[f.group]) { byId[f.group] = { id: f.group, label: GROUP_LABELS[f.group] || f.group, fields: [] }; groups.push(byId[f.group]); }
    byId[f.group].fields.push({
      key: f.key,
      type: f.kind === "image" ? "image" : f.kind === "html" ? "html" : "text",
      label: labelFor(f),
      default: f.default,
      value: Object.prototype.hasOwnProperty.call(values, f.key) ? values[f.key].value : null
    });
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
function sanitizeInline(html) {
  const $ = cheerio.load(`<div id="x">${html}</div>`, null, false);
  $("#x *").each((_, el) => {
    if (!INLINE.has(el.tagName)) { $(el).replaceWith($(el).text()); return; }
    for (const name of Object.keys(el.attribs || {})) {
      const v = el.attribs[name];
      const okAttr = (el.tagName === "a" && (name === "href" || name === "target" || name === "rel")) || name === "class" || name === "lang" || name === "title";
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

function renderPage(db) {
  const { html } = loadTemplate();
  const $ = cheerio.load(html);
  const settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  const texts = db.texts || {};

  // 1. page text and images (re-discover on this DOM so element refs line up with keys)
  for (const f of discover($)) {
    const o = texts[f.key];
    if (!o || o.value == null) continue;
    const $el = $(f.el);
    if (f.kind === "image") {
      if (o.value.src) {
        $el.attr("src", o.value.src).removeAttr("srcset").removeAttr("sizes");
        $el.closest("picture").find("source").remove();
      }
      if (typeof o.value.alt === "string") $el.attr("alt", o.value.alt);
    } else if (f.kind === "text") {
      $el.text(String(o.value));
    } else if (f.kind === "html") {
      $el.html(sanitizeInline(String(o.value)));
    } else if (f.kind === "textnode") {
      const node = (f.el.children || []).find((c) => c.type === "text" && c.data.trim());
      if (node) node.data = node.data.replace(node.data.trim(), escHtml(String(o.value)));
    }
  }

  // 2. hidden sections (and their nav links)
  for (const id of db.hiddenSections || []) {
    $(`main > section#${id}`).remove();
    $(`a[href="#${id}"]`).each((_, a) => { if ($(a).closest("nav, #mobileMenu, .footer__cols, .hero__links").length) $(a).remove(); });
  }

  // 3. health library from the articles collection
  const articles = (db.content.articles || []).filter((a) => !a.hidden);
  $(".articles").html(articles.map((a) => `<li><a href="${escAttr(a.url || "#library")}"${a.url && /^https?:/.test(a.url) ? ' target="_blank" rel="noopener"' : ""}>` +
    (a.image ? `<img class="articles__thumb${a.round ? " articles__thumb--round" : ""}" src="${escAttr(a.image)}" width="320" height="320" alt="" loading="lazy" decoding="async">` : "") +
    `<span class="articles__cat">${escHtml(a.category || "")}</span><span class="articles__title">${escHtml(a.title || "")}</span>` +
    `<span class="articles__meta mono">${escHtml(a.author || "")}${a.readTime ? ` · <span class="nowrap">${escHtml(a.readTime)}</span>` : ""}</span>` +
    `<svg class="ic" aria-hidden="true"><use href="#i-arrow-ur"/></svg></a></li>`).join(""));
  if (!articles.length) $("#library").remove();

  // 4. SEO, brand colour, logo, announcement, map, social links
  if (settings.seoTitle) $("title").text(settings.seoTitle);
  if (settings.seoDescription) $('meta[name="description"]').attr("content", settings.seoDescription);
  if (settings.seoTitle) $('meta[property="og:title"]').attr("content", settings.seoTitle);
  if (settings.seoDescription) $('meta[property="og:description"]').attr("content", settings.seoDescription);
  if (settings.ogImage) $("head").append(`<meta property="og:image" content="${escAttr(settings.ogImage)}">`);
  if (settings.accent && /^#[0-9a-f]{6}$/i.test(settings.accent) && settings.accent.toLowerCase() !== DEFAULT_SETTINGS.accent.toLowerCase()) {
    $("head").append(`<style id="cms-brand">:root{--accent:${settings.accent};--accent-hover:color-mix(in srgb,${settings.accent} 82%,#000)}</style>`);
    $('meta[name="theme-color"]').attr("content", settings.accent);
  }
  if (settings.logo) {
    $(".logo svg, .logo__mark").first().replaceWith(`<img class="logo__img" src="${escAttr(settings.logo)}" alt="" style="height:32px;width:auto">`);
  }
  if (settings.announcementOn && settings.announcementText) {
    const inner = settings.announcementLink
      ? `<a href="${escAttr(settings.announcementLink)}" style="color:inherit">${escHtml(settings.announcementText)}</a>`
      : escHtml(settings.announcementText);
    $(".skip-link").after(`<div class="cms-announce" role="note" style="background:var(--accent);color:var(--accent-ink);text-align:center;padding:10px max(16px,env(safe-area-inset-left,0px));font-size:15px;line-height:1.4">${inner}</div>`);
  }
  if (settings.mapQuery) {
    const q = encodeURIComponent(settings.mapQuery);
    $("iframe").filter((_, f) => /maps\.google/.test($(f).attr("src") || "")).attr("src", `https://maps.google.com/maps?q=${q}&z=14&output=embed`);
  }

  // 5. runtime config for the browser
  const live = db.live || {};
  const cfg = {
    api: "/api",
    live: { mode: live.mode || "demo", erWait: live.erWait, beds: live.beds, icu: live.icu, token: live.token, updatedAt: live.updatedAt },
    booking: {
      on: settings.bookingOn !== false, closedDays: settings.closedDays || [], slotStart: settings.slotStart, slotEnd: settings.slotEnd,
      slotMinutes: Number(settings.slotMinutes) || 30, breakStart: settings.breakStart, breakEnd: settings.breakEnd
    }
  };
  $('script[src="js/data.js"]').before(`<script>window.CMS=${JSON.stringify(cfg).replace(/</g, "\\u003c")};</script>`);

  return applyReplacements($.html(), settings);
}

/** js/data.js generated from the database. */
function renderDataJs(db) {
  const out = ["/* Generated by the CareNova CMS from the database. Edit content in /admin. */"];
  for (const [col, def] of Object.entries(COLLECTIONS)) {
    if (!def.constName) continue;
    const items = (db.content[col] || []).filter((x) => !x.hidden).map(({ id, hidden, ...rest }) => rest);
    out.push(`const ${def.constName} = ${JSON.stringify(items, null, 1)};`);
  }
  return applyReplacements(out.join("\n\n"), db.settings);
}

module.exports = { renderPage, renderDataJs, textGroups, sectionList, applyReplacements, loadTemplate, sanitizeInline };
