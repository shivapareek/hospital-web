/* First-run database: content from js/data.js and the article list in index.html. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const cheerio = require("cheerio");
const { COLLECTIONS, DEFAULT_SETTINGS } = require("./schema");
const { newId } = require("./store");
const { hashPassword } = require("./auth");

const ROOT = path.join(__dirname, "..");

function readStaticData() {
  // the template copy is kept so the static site keeps working without the server
  const src = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
  const names = Object.values(COLLECTIONS).map((c) => c.constName).filter(Boolean);
  const ctx = {};
  vm.runInNewContext(src + `\n;__out = { ${names.map((n) => `${n}: typeof ${n} !== "undefined" ? ${n} : []`).join(", ")} };`, ctx);
  return ctx.__out;
}

function readArticles() {
  const $ = cheerio.load(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"));
  return $(".articles li").map((_, li) => {
    const $li = $(li);
    const href = $li.find("a").attr("href") || "";
    return {
      title: $li.find(".articles__title").text().trim(),
      category: $li.find(".articles__cat").text().trim(),
      author: $li.find(".articles__meta").text().split("·")[0].trim(),
      readTime: ($li.find(".articles__meta .nowrap").text() || "").trim(),
      image: $li.find("img").attr("src") || "",
      round: $li.find("img").hasClass("articles__thumb--round"),
      url: href === "#library" ? "" : href
    };
  }).get();
}

function seed() {
  const data = readStaticData();
  const content = {};
  for (const [col, def] of Object.entries(COLLECTIONS)) {
    const items = def.constName ? data[def.constName] || [] : col === "articles" ? readArticles() : [];
    content[col] = items.map((it) => ({ id: newId(), hidden: false, ...it }));
  }
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    settings: { ...DEFAULT_SETTINGS },
    content,
    texts: {},
    textsHi: {},
    hiddenSections: [],
    live: { mode: "demo", erWait: 8, beds: 42, icu: 7, token: "A-114", updatedAt: now },
    submissions: { appointments: [], messages: [], reports: [], packages: [], subscribers: [] },
    users: [{
      id: newId(), name: "Administrator", email: "admin@carenova.local", role: "admin",
      password: hashPassword(process.env.ADMIN_PASSWORD || "ChangeMe@123"), mustChangePassword: true, createdAt: now, lastLogin: null
    }],
    sessions: {},
    audit: []
  };
}

module.exports = { seed };
