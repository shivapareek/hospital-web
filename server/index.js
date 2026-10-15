/* CareNova Hospitals – website + CMS server.
   Run: npm install && npm start   (PORT=3000 by default; data in ./data, uploads in ./uploads) */
const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { Store, newId } = require("./store");
const { seed, SIMPLE_HOME_HIDDEN } = require("./seed");
const { COLLECTIONS, SUBMISSIONS, SETTINGS, DEFAULT_SETTINGS } = require("./schema");
const { renderPage, renderDataJs, textGroups, sectionList, applyReplacements, loadTemplate, sanitizeInline } = require("./render");
const auth = require("./auth");
const privacy = require("./privacy");
const i18n = require("./i18n");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, "uploads");
const PORT = Number(process.env.PORT) || 3000;
const SECURE_COOKIE = process.env.COOKIE_SECURE === "1";

const store = new Store(path.join(DATA_DIR, "cms.json"));
const fresh = store.load(seed);
const db = () => store.data;
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
try { store.backup(); } catch (e) { console.warn("backup failed:", e.message); }
setInterval(() => { try { auth.pruneSessions(db()); store.save(); store.backup(); } catch { /* ignore */ } }, 6 * 3600e3).unref();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "1");
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.path.startsWith("/admin") || req.path.startsWith("/api/admin")) {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});

/* ---------- helpers ---------- */
const bad = (res, code, error) => res.status(code).json({ error });
const nowIso = () => new Date().toISOString();
const str = (v, max = 500) => (v == null ? "" : String(v)).trim().slice(0, max);
const ROLE_CAN = {
  admin: () => true,
  editor: (area) => ["content", "texts", "sections", "media", "settings", "live", "dashboard", "account"].includes(area),
  reception: (area) => ["dashboard", "submissions", "live", "account"].includes(area)
};

function audit(user, action, target) {
  const log = db().audit;
  log.unshift({ at: nowIso(), user: user ? user.email : "website", action, target: str(target, 200) });
  if (log.length > 2000) log.length = 2000;
}

function requireAuth(area) {
  return (req, res, next) => {
    const s = auth.getSession(db(), req);
    if (!s) return bad(res, 401, "Please sign in.");
    if (!(ROLE_CAN[s.user.role] || (() => false))(area)) return bad(res, 403, "Your role cannot do this.");
    if (req.method !== "GET" && req.get("X-Requested-With") !== "cms") return bad(res, 403, "Missing request header.");
    req.user = s.user;
    req.sessionKey = s.key;
    next();
  };
}

/* simple in-memory rate limiter */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, lastLogin: u.lastLogin });

/* ---------- cleaning content items against the schema ---------- */
// Markdown fields are sanitised when rendered (server/pages.js), so they are stored as typed
const isMarkdown = (f) => f.markdown === true || /^Markdown/.test(f.help || "");   // Hindi copies of Markdown fields carry markdown:true
function cleanItem(col, body, existing) {
  const def = COLLECTIONS[col];
  const out = { ...(existing || {}) };
  for (const f of def.fields) {
    if (!(f.name in body)) continue;
    let v = body[f.name];
    switch (f.type) {
      case "number": v = v === "" || v == null ? null : Number(v); if (v != null && !Number.isFinite(v)) throw new Error(`${f.label} must be a number.`); break;
      case "boolean": v = !!v; break;
      case "tags": case "list": v = (Array.isArray(v) ? v : String(v || "").split(f.type === "list" ? "\n" : ",")).map((x) => str(x, 300)).filter(Boolean); break;
      case "json": if (typeof v === "string") { try { v = v.trim() ? JSON.parse(v) : null; } catch { throw new Error(`${f.label} is not valid JSON.`); } } break;
      case "textarea": v = str(v, f.max || (isMarkdown(f) ? 40000 : 5000)); break;
      default: v = str(v, 1000);
    }
    if (f.required && (v === "" || v == null || (Array.isArray(v) && !v.length))) throw new Error(`${f.label} is required.`);
    out[f.name] = v;
  }
  for (const f of def.fields) if (f.required && (out[f.name] === undefined || out[f.name] === "")) throw new Error(`${f.label} is required.`);
  if ("hidden" in body) out.hidden = !!body.hidden;
  if (out.hidden === undefined) out.hidden = false;
  // text shown with innerHTML on the site: keep plain text as is, clean anything that looks like markup
  for (const f of def.fields) if ((f.type === "text" || f.type === "textarea") && !isMarkdown(f) && typeof out[f.name] === "string" && out[f.name].includes("<")) out[f.name] = sanitizeInline(out[f.name]);
  for (const f of def.fields) if (f.type === "image" && out[f.name] && !/^(\/uploads\/|assets\/|https?:\/\/)/.test(out[f.name])) throw new Error(`${f.label} must be an uploaded image or a web address.`);
  return out;
}

/* =========================================================
   Public site
   ========================================================= */
app.get(["/", "/index.html"], (req, res) => {
  res.type("html").setHeader("Cache-Control", "no-cache");
  res.send(renderPage(db(), { lang: "en", path: "/", base: i18n.baseUrl(req) }));
});
// Hindi home page (every other Hindi page is registered by its module: /hi/doctors…, /hi/privacy-policy…)
app.get(["/hi", "/hi/", "/hi/index.html"], (req, res) => {
  // /hi → /hi/ (relative links and "#section" anchors on the page resolve against /hi/)
  if (!/^\/hi\/(index\.html)?(\?|$)/.test(req.originalUrl)) return res.redirect(301, "/hi/" + (req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : ""));
  res.type("html").setHeader("Cache-Control", "no-cache");
  res.send(renderPage(db(), { lang: "hi", path: "/", base: i18n.baseUrl(req) }));
});
app.get(["/js/data.js", "/hi/js/data.js"], (req, res) => {
  res.type("application/javascript").setHeader("Cache-Control", "no-cache");
  res.send(renderDataJs(db(), { lang: req.query.lang === "hi" || req.path.startsWith("/hi/") ? "hi" : "en" }));
});
// scripts build some image paths relative to the page ("assets/img/…"): the same files from /hi/
app.use("/hi/assets", express.static(path.join(ROOT, "assets"), { maxAge: "7d" }));
app.get("/hi/credits.html", (req, res) => res.redirect(301, "/credits.html"));
for (const file of ["js/main.js", "credits.html"]) {
  app.get("/" + file, (req, res) => {
    res.type(file.endsWith(".js") ? "application/javascript" : "html").setHeader("Cache-Control", "no-cache");
    res.send(applyReplacements(fs.readFileSync(path.join(ROOT, file), "utf8"), db().settings));
  });
}

app.get("/api/live", (req, res) => res.json(db().live));

app.get("/api/slots", (req, res) => {
  const doctor = str(req.query.doctor, 120), date = str(req.query.date, 10);
  const perSlot = Math.max(1, Number(db().settings.perSlot) || 1);
  const count = {};
  for (const a of db().submissions.appointments) {
    if (a.doctor === doctor && a.date === date && !["cancelled", "no-show"].includes(a.status)) count[a.slot] = (count[a.slot] || 0) + 1;
  }
  res.json({ taken: Object.keys(count).filter((s) => count[s] >= perSlot) });
});

const PHONE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
app.post("/api/submit/:kind", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  // messages in the language of the page the form was sent from (body.lang / X-Lang)
  const lang = i18n.reqLang(req);
  const T = (msg, vars) => i18n.tr(lang, msg, vars);
  const bad = (r, code, error) => r.status(code).json({ error: T(error) });
  if (limited("submit:" + ip, 20, 10 * 60e3)) return bad(res, 429, "Too many requests. Please call us instead.");
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot
  // consent (privacy.js): every form that collects personal data must carry consent:true
  const consentError = privacy.consentError(req.params.kind, b);
  if (consentError) return bad(res, 400, consentError);
  const base = { id: newId(), createdAt: nowIso(), status: "new", note: "", consent: privacy.consentRecord(lang), ...(lang === "hi" ? { lang } : {}) };
  const S = db().submissions;
  switch (req.params.kind) {
    case "appointment": {
      if (db().settings.bookingOn === false) return bad(res, 400, "Online booking is paused. Please call the helpdesk.");
      const p = b.patient || {};
      const doctor = db().content.doctors.find((d) => d.name === b.doctor && !d.hidden);
      if (!doctor) return bad(res, 400, "Choose a doctor.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(str(b.date))) return bad(res, 400, "Choose a date.");
      if (!str(b.slot)) return bad(res, 400, "Choose a time.");
      if (str(p.name).length < 2) return bad(res, 400, "Enter the patient's name.");
      if (!PHONE.test(str(p.phone))) return bad(res, 400, "Enter a 10-digit mobile number.");
      const perSlot = Math.max(1, Number(db().settings.perSlot) || 1);
      const same = S.appointments.filter((a) => a.doctor === doctor.name && a.date === b.date && a.slot === b.slot && !["cancelled", "no-show"].includes(a.status));
      if (same.length >= perSlot) return bad(res, 409, "That time was just booked. Please pick another slot.");
      let token;
      do { token = doctor.dept.slice(0, 2).toUpperCase() + "-" + (100 + Math.floor(Math.random() * 900)); } while (S.appointments.some((a) => a.token === token && a.date === b.date));
      const item = {
        ...base, token, source: "website",
        patient: { name: str(p.name, 120), phone: str(p.phone, 10), age: str(p.age, 3), gender: str(p.gender, 20) },
        reason: str(b.reason, 1000), doctor: doctor.name, dept: doctor.dept, date: b.date, slot: str(b.slot, 20),
        type: b.type === "Video" ? "Video" : "In-clinic", fee: doctor.fee
      };
      S.appointments.unshift(item);
      const extra = privacy.onBooked(item, req);   // queues the confirmation message, returns {manage, notify}
      store.save();
      return res.json({ ok: true, token, ...extra });
    }
    case "message": {
      if (str(b.name).length < 2 || !PHONE.test(str(b.phone)) || !EMAIL.test(str(b.email)) || str(b.message).length < 2) return bad(res, 400, "Fill in your name, mobile, email and message.");
      S.messages.unshift({ ...base, name: str(b.name, 120), phone: str(b.phone, 10), email: str(b.email, 200), message: str(b.message, 4000) });
      break;
    }
    case "report": {
      if (str(b.uhid).length < 5 || !PHONE.test(str(b.phone))) return bad(res, 400, "Enter your UHID and a 10-digit mobile number.");
      S.reports.unshift({ ...base, uhid: str(b.uhid, 40), phone: str(b.phone, 10) });
      break;
    }
    case "package": {
      if (!str(b.package)) return bad(res, 400, "Choose a package.");
      if (b.phone && !PHONE.test(str(b.phone))) return bad(res, 400, "Enter a 10-digit mobile number.");
      S.packages.unshift({ ...base, package: str(b.package, 120), name: str(b.name, 120), phone: str(b.phone, 10) });
      break;
    }
    case "subscribe": {
      if (!EMAIL.test(str(b.email))) return bad(res, 400, "Enter a valid email address.");
      if (!S.subscribers.some((s) => s.email.toLowerCase() === str(b.email).toLowerCase())) S.subscribers.unshift({ ...base, email: str(b.email, 200) });
      break;
    }
    case "datarequest": {
      const r = privacy.dataRequest(b, base, lang);
      if (r.error) return bad(res, 400, r.error);
      S.dataRequests.unshift(r.item);
      break;
    }
    default: return bad(res, 404, "Unknown form.");
  }
  store.save();
  res.json({ ok: true });
});

/* =========================================================
   Admin API
   ========================================================= */
app.post("/api/admin/login", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  const email = str(req.body.email, 200).toLowerCase();
  const key = "login:" + ip + ":" + email;
  const recent = (hits.get(key) || []).filter((t) => Date.now() - t < 15 * 60e3);
  if (recent.length >= 8) return bad(res, 429, "Too many attempts. Try again in 15 minutes.");
  const user = db().users.find((u) => u.email.toLowerCase() === email);
  if (!user || !auth.verifyPassword(req.body.password || "", user.password)) {
    limited(key, 99, 15 * 60e3);
    return bad(res, 401, "Wrong email or password.");
  }
  hits.delete(key);
  const token = auth.createSession(db(), user.id);
  user.lastLogin = nowIso();
  audit(user, "Signed in", "");
  store.save();
  res.setHeader("Set-Cookie", auth.sessionCookie(token, SECURE_COOKIE, auth.SESSION_DAYS * 86400));
  res.json({ user: publicUser(user) });
});

app.post("/api/admin/logout", (req, res) => {
  const s = auth.getSession(db(), req);
  if (s) { delete db().sessions[s.key]; store.save(); }
  res.setHeader("Set-Cookie", auth.sessionCookie("", SECURE_COOKIE, 0));
  res.json({ ok: true });
});

app.get("/api/admin/me", requireAuth("account"), (req, res) => res.json({ user: publicUser(req.user), mustChangePassword: !!req.user.mustChangePassword }));

app.post("/api/admin/password", requireAuth("account"), (req, res) => {
  const { current, next } = req.body || {};
  if (!auth.verifyPassword(current || "", req.user.password)) return bad(res, 400, "Your current password is wrong.");
  if (String(next || "").length < 8) return bad(res, 400, "Use at least 8 characters.");
  req.user.password = auth.hashPassword(next);
  req.user.mustChangePassword = false;
  // sign out other sessions of this user
  for (const [k, s] of Object.entries(db().sessions)) if (s.userId === req.user.id && k !== req.sessionKey) delete db().sessions[k];
  audit(req.user, "Changed password", "");
  store.save();
  res.json({ ok: true });
});

/* ---------- dashboard ---------- */
app.get("/api/admin/stats", requireAuth("submissions"), (req, res) => {
  const S = db().submissions;
  const today = new Date().toISOString().slice(0, 10);
  const appts = S.appointments;
  const byDay = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    byDay.push({ date: d, count: appts.filter((a) => a.createdAt.slice(0, 10) === d).length });
  }
  const enquiries = [...S.messages.map((x) => ({ ...x, type: "messages" })), ...S.reports.map((x) => ({ ...x, type: "reports" })), ...S.packages.map((x) => ({ ...x, type: "packages" }))]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({
    appointments: {
      today: appts.filter((a) => a.date === today && !["cancelled"].includes(a.status)).length,
      upcoming: appts.filter((a) => a.date >= today && ["new", "confirmed"].includes(a.status)).length,
      new: appts.filter((a) => a.status === "new").length,
      total: appts.length
    },
    enquiries: { new: enquiries.filter((e) => e.status === "new").length, total: enquiries.length },
    subscribers: S.subscribers.length,
    byDay,
    recentAppointments: appts.slice(0, 6),
    recentEnquiries: enquiries.slice(0, 6),
    live: db().live
  });
});

/* ---------- schema ---------- */
app.get("/api/admin/schema", requireAuth("dashboard"), (req, res) => {
  const collections = {};
  for (const [k, v] of Object.entries(COLLECTIONS)) { const { constName, ...rest } = v; collections[k] = rest; }
  res.json({ collections, submissions: SUBMISSIONS });
});

/* ---------- content ---------- */
const colGuard = (req, res, next) => (COLLECTIONS[req.params.col] ? next() : bad(res, 404, "Unknown collection."));
app.get("/api/admin/content/:col", requireAuth("dashboard"), colGuard, (req, res) => res.json({ items: db().content[req.params.col] }));

app.post("/api/admin/content/:col/reorder", requireAuth("content"), colGuard, (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const list = db().content[req.params.col];
  const byId = new Map(list.map((x) => [x.id, x]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  for (const x of list) if (!ids.includes(x.id)) ordered.push(x);
  db().content[req.params.col] = ordered;
  audit(req.user, "Reordered", COLLECTIONS[req.params.col].label);
  store.save();
  res.json({ ok: true });
});

app.post("/api/admin/content/:col", requireAuth("content"), colGuard, (req, res) => {
  try {
    const item = { id: newId(), ...cleanItem(req.params.col, req.body || {}) };
    db().content[req.params.col].push(item);
    audit(req.user, "Added", `${COLLECTIONS[req.params.col].label}: ${item[COLLECTIONS[req.params.col].titleField]}`);
    store.save();
    res.json({ item });
  } catch (e) { bad(res, 400, e.message); }
});

app.put("/api/admin/content/:col/:id", requireAuth("content"), colGuard, (req, res) => {
  const list = db().content[req.params.col];
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return bad(res, 404, "Not found.");
  try {
    const before = list[idx];
    const item = { ...cleanItem(req.params.col, req.body || {}, before), id: before.id };
    list[idx] = item;
    // renaming a speciality updates the doctors and symptoms that point at it
    if (req.params.col === "departments" && before.name !== item.name) {
      for (const d of db().content.doctors) if (d.dept === before.name) d.dept = item.name;
      for (const s of db().content.symptoms) if (s.dept === before.name) s.dept = item.name;
    }
    audit(req.user, "Edited", `${COLLECTIONS[req.params.col].label}: ${item[COLLECTIONS[req.params.col].titleField]}`);
    store.save();
    res.json({ item });
  } catch (e) { bad(res, 400, e.message); }
});

app.delete("/api/admin/content/:col/:id", requireAuth("content"), colGuard, (req, res) => {
  const list = db().content[req.params.col];
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return bad(res, 404, "Not found.");
  const [gone] = list.splice(idx, 1);
  audit(req.user, "Deleted", `${COLLECTIONS[req.params.col].label}: ${gone[COLLECTIONS[req.params.col].titleField]}`);
  store.save();
  res.json({ ok: true });
});

/* ---------- page text ---------- */
// ?lang=hi reads and writes the Hindi overrides (db.textsHi); without it, English (db.texts)
const textLang = (req) => (req.query.lang === "hi" ? "hi" : "en");
app.get("/api/admin/texts", requireAuth("texts"), (req, res) => res.json({ lang: textLang(req), groups: textGroups(db(), { lang: textLang(req) }) }));
app.put("/api/admin/texts", requireAuth("texts"), (req, res) => {
  const values = (req.body && req.body.values) || {};
  const lang = textLang(req);
  const target = lang === "hi" ? (db().textsHi = db().textsHi || {}) : db().texts;
  const known = new Map(loadTemplate().fields.map((f) => [f.key, f]));
  let n = 0;
  for (const [key, v] of Object.entries(values)) {
    const f = known.get(key);
    if (!f) continue;
    if (v === null) { delete target[key]; n++; continue; }
    if (f.kind === "image") {
      if (typeof v !== "object") return bad(res, 400, "Image values need src and alt.");
      target[key] = { value: { src: str(v.src, 500), alt: str(v.alt, 300) }, default: f.default };
    } else {
      target[key] = { value: f.kind === "html" ? sanitizeInline(str(v, 5000)) : str(v, 5000), default: f.default };
    }
    n++;
  }
  audit(req.user, lang === "hi" ? "Edited page text (Hindi)" : "Edited page text", `${n} field(s)`);
  store.save();
  res.json({ ok: true });
});

/* ---------- sections ---------- */
app.get("/api/admin/sections", requireAuth("sections"), (req, res) => res.json({ items: sectionList(db()) }));
app.put("/api/admin/sections", requireAuth("sections"), (req, res) => {
  const valid = new Set(sectionList(db()).map((s) => s.id));
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  db().hiddenSections = items.filter((i) => valid.has(i.id) && i.visible === false).map((i) => i.id);
  audit(req.user, "Changed section visibility", db().hiddenSections.join(", ") || "all visible");
  store.save();
  res.json({ ok: true });
});

/* ---------- settings ---------- */
app.get("/api/admin/settings", requireAuth("settings"), (req, res) => res.json({ values: { ...DEFAULT_SETTINGS, ...db().settings }, schema: SETTINGS }));
app.put("/api/admin/settings", requireAuth("settings"), (req, res) => {
  const v = (req.body && req.body.values) || {};
  const fields = SETTINGS.flatMap((g) => g.fields);
  const s = db().settings;
  for (const f of fields) {
    if (!(f.name in v)) continue;
    let x = v[f.name];
    if (f.type === "boolean") x = !!x;
    else if (f.type === "number") x = Number(x) || 0;
    else if (f.type === "tags") x = (Array.isArray(x) ? x : String(x || "").split(",")).map((t) => str(t, 40)).filter(Boolean);
    else if (f.type === "color") { x = str(x, 7); if (x && !/^#[0-9a-f]{6}$/i.test(x)) return bad(res, 400, "Colour must look like #0F5C4D."); }
    else x = str(x, f.max || (f.type === "textarea" ? 1000 : 300));
    s[f.name] = x;
  }
  for (const k of ["name", "shortName", "helpdesk", "emergency", "email"]) if (!s[k]) s[k] = DEFAULT_SETTINGS[k];
  audit(req.user, "Changed settings", Object.keys(v).join(", "));
  store.save();
  res.json({ ok: true });
});

/* ---------- live status ---------- */
app.get("/api/admin/live", requireAuth("live"), (req, res) => res.json(db().live));
app.put("/api/admin/live", requireAuth("live"), (req, res) => {
  const b = req.body || {};
  const L = db().live;
  if (b.mode) L.mode = b.mode === "manual" ? "manual" : "demo";
  for (const k of ["erWait", "beds", "icu"]) if (k in b) { const n = Number(b[k]); if (!Number.isFinite(n) || n < 0) return bad(res, 400, `${k} must be a number.`); L[k] = Math.round(n); }
  if ("token" in b) L.token = str(b.token, 12);
  L.updatedAt = nowIso();
  audit(req.user, "Updated live status", `${L.mode}: ER ${L.erWait} min, beds ${L.beds}, ICU ${L.icu}, token ${L.token}`);
  store.save();
  res.json(L);
});

/* ---------- submissions ---------- */
const subGuard = (req, res, next) => (SUBMISSIONS[req.params.type] ? next() : bad(res, 404, "Unknown list."));
function filterSubs(type, q) {
  let items = db().submissions[type];
  if (q.status) items = items.filter((x) => x.status === q.status);
  const dateOf = (x) => (type === "appointments" ? x.date : x.createdAt.slice(0, 10));
  if (q.from) items = items.filter((x) => dateOf(x) >= q.from);
  if (q.to) items = items.filter((x) => dateOf(x) <= q.to);
  if (q.q) { const s = String(q.q).toLowerCase(); items = items.filter((x) => JSON.stringify(x).toLowerCase().includes(s)); }
  return items;
}
app.get("/api/admin/submissions/:type", requireAuth("submissions"), subGuard, (req, res) => res.json({ items: filterSubs(req.params.type, req.query) }));

app.post("/api/admin/submissions/appointments", requireAuth("submissions"), (req, res) => {
  const b = req.body || {};
  const p = b.patient || {};
  const doctor = db().content.doctors.find((d) => d.name === b.doctor);
  if (!doctor) return bad(res, 400, "Choose a doctor.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(b.date)) || !str(b.slot)) return bad(res, 400, "Choose a date and time.");
  if (str(p.name).length < 2 || !PHONE.test(str(p.phone))) return bad(res, 400, "Enter the patient's name and a 10-digit mobile number.");
  const token = doctor.dept.slice(0, 2).toUpperCase() + "-" + (100 + Math.floor(Math.random() * 900));
  const item = {
    id: newId(), createdAt: nowIso(), status: b.status || "confirmed", note: str(b.note, 2000), token, source: "admin",
    patient: { name: str(p.name, 120), phone: str(p.phone, 10), age: str(p.age, 3), gender: str(p.gender, 20) },
    reason: str(b.reason, 1000), doctor: doctor.name, dept: doctor.dept, date: b.date, slot: str(b.slot, 20), type: b.type === "Video" ? "Video" : "In-clinic", fee: doctor.fee
  };
  db().submissions.appointments.unshift(item);
  privacy.onBooked(item, req);
  audit(req.user, "Added appointment", `${token} · ${item.patient.name}`);
  store.save();
  res.json({ item });
});

app.patch("/api/admin/submissions/:type/:id", requireAuth("submissions"), subGuard, (req, res) => {
  const item = db().submissions[req.params.type].find((x) => x.id === req.params.id);
  if (!item) return bad(res, 404, "Not found.");
  const b = req.body || {};
  if ("status" in b) {
    if (!SUBMISSIONS[req.params.type].statuses.includes(b.status)) return bad(res, 400, "Unknown status.");
    if (req.params.type === "appointments" && item.status !== b.status) (item.history = item.history || []).push({ at: nowIso(), action: "status", from: item.status, to: b.status, by: req.user.email });
    item.status = b.status;
  }
  if ("note" in b) item.note = str(b.note, 2000);
  item.updatedAt = nowIso();
  audit(req.user, `Updated ${SUBMISSIONS[req.params.type].label.toLowerCase()}`, `${item.token || item.email || item.name || item.uhid || item.id} → ${item.status}`);
  store.save();
  res.json({ item });
});

app.delete("/api/admin/submissions/:type/:id", requireAuth("submissions"), subGuard, (req, res) => {
  const list = db().submissions[req.params.type];
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return bad(res, 404, "Not found.");
  const [gone] = list.splice(idx, 1);
  audit(req.user, `Deleted from ${SUBMISSIONS[req.params.type].label.toLowerCase()}`, gone.token || gone.email || gone.name || gone.id);
  store.save();
  res.json({ ok: true });
});

app.get("/api/admin/export/:file", requireAuth("submissions"), (req, res) => {
  const type = req.params.file.replace(/\.csv$/, "");
  if (!SUBMISSIONS[type]) return bad(res, 404, "Unknown list.");
  const items = filterSubs(type, req.query);
  const flat = (o, pre = "") => Object.entries(o).reduce((acc, [k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? Object.assign(acc, flat(v, pre + k + ".")) : ((acc[pre + k] = v), acc)), {});
  const rows = items.map((x) => flat(x));
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((c) => c !== "id");
  // prefix formula-like cells so spreadsheets do not execute them
  const cell = (v) => { let s = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const csv = [cols.map(cell).join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send("﻿" + csv);
});

/* ---------- media ---------- */
const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif", "application/pdf": ".pdf" };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const base = path.basename(file.originalname, path.extname(file.originalname)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
      cb(null, `${base}-${Date.now().toString(36)}${ALLOWED[file.mimetype]}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(ALLOWED[file.mimetype] ? null : new Error("Only JPG, PNG, WebP, GIF, AVIF or PDF files."), !!ALLOWED[file.mimetype])
});
function magicOk(file) {
  const b = Buffer.alloc(12);
  const fd = fs.openSync(file, "r"); fs.readSync(fd, b, 0, 12, 0); fs.closeSync(fd);
  const hex = b.toString("hex");
  return hex.startsWith("ffd8ff") || hex.startsWith("89504e47") || (hex.startsWith("52494646") && b.slice(8, 12).toString() === "WEBP") ||
    hex.startsWith("47494638") || b.slice(4, 12).toString().startsWith("ftypavi") || hex.startsWith("25504446");
}
const mediaItem = (name) => {
  const st = fs.statSync(path.join(UPLOAD_DIR, name));
  const ext = path.extname(name).slice(1);
  return { name, url: "/uploads/" + name, size: st.size, type: ext === "pdf" ? "application/pdf" : "image/" + (ext === "jpg" ? "jpeg" : ext), uploadedAt: st.mtime.toISOString() };
};
app.get("/api/admin/media", requireAuth("media"), (req, res) => {
  const items = fs.readdirSync(UPLOAD_DIR).filter((f) => !f.startsWith(".")).map(mediaItem).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  res.json({ items });
});
app.post("/api/admin/media", requireAuth("media"), (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return bad(res, 400, err.code === "LIMIT_FILE_SIZE" ? "Files must be 8 MB or smaller." : err.message);
    if (!req.file) return bad(res, 400, "Choose a file.");
    if (!magicOk(req.file.path)) { fs.unlinkSync(req.file.path); return bad(res, 400, "That file is not a real image or PDF."); }
    audit(req.user, "Uploaded", req.file.filename);
    store.save();
    res.json({ item: mediaItem(req.file.filename) });
  });
});
app.delete("/api/admin/media/:name", requireAuth("media"), (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) return bad(res, 404, "Not found.");
  fs.unlinkSync(file);
  audit(req.user, "Deleted file", name);
  store.save();
  res.json({ ok: true });
});

/* ---------- users ---------- */
const ROLES = ["admin", "editor", "reception"];
app.get("/api/admin/users", requireAuth("users"), (req, res) => res.json({ items: db().users.map(publicUser) }));
app.post("/api/admin/users", requireAuth("users"), (req, res) => {
  const b = req.body || {};
  const email = str(b.email, 200).toLowerCase();
  if (!EMAIL.test(email) && !/^[^\s@]+@[^\s@]+$/.test(email)) return bad(res, 400, "Enter a valid email.");
  if (db().users.some((u) => u.email.toLowerCase() === email)) return bad(res, 400, "A user with this email already exists.");
  if (String(b.password || "").length < 8) return bad(res, 400, "Use a password of at least 8 characters.");
  if (!ROLES.includes(b.role)) return bad(res, 400, "Choose a role.");
  const u = { id: newId(), name: str(b.name, 120) || email, email, role: b.role, password: auth.hashPassword(b.password), mustChangePassword: true, createdAt: nowIso(), lastLogin: null };
  db().users.push(u);
  audit(req.user, "Added user", `${email} (${u.role})`);
  store.save();
  res.json({ item: publicUser(u) });
});
app.put("/api/admin/users/:id", requireAuth("users"), (req, res) => {
  const u = db().users.find((x) => x.id === req.params.id);
  if (!u) return bad(res, 404, "Not found.");
  const b = req.body || {};
  if (b.role && !ROLES.includes(b.role)) return bad(res, 400, "Unknown role.");
  if (b.role && b.role !== "admin" && u.role === "admin" && db().users.filter((x) => x.role === "admin").length === 1) return bad(res, 400, "Keep at least one admin.");
  if (b.name) u.name = str(b.name, 120);
  if (b.role) u.role = b.role;
  if (b.password) {
    if (String(b.password).length < 8) return bad(res, 400, "Use a password of at least 8 characters.");
    u.password = auth.hashPassword(b.password); u.mustChangePassword = u.id !== req.user.id;
    for (const [k, s] of Object.entries(db().sessions)) if (s.userId === u.id && k !== req.sessionKey) delete db().sessions[k];
  }
  audit(req.user, "Edited user", u.email);
  store.save();
  res.json({ item: publicUser(u) });
});
app.delete("/api/admin/users/:id", requireAuth("users"), (req, res) => {
  const idx = db().users.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return bad(res, 404, "Not found.");
  const u = db().users[idx];
  if (u.id === req.user.id) return bad(res, 400, "You cannot delete yourself.");
  if (u.role === "admin" && db().users.filter((x) => x.role === "admin").length === 1) return bad(res, 400, "Keep at least one admin.");
  db().users.splice(idx, 1);
  for (const [k, s] of Object.entries(db().sessions)) if (s.userId === u.id) delete db().sessions[k];
  audit(req.user, "Deleted user", u.email);
  store.save();
  res.json({ ok: true });
});

/* ---------- audit ---------- */
app.get("/api/admin/audit", requireAuth("users"), (req, res) => res.json({ items: db().audit.slice(0, Math.min(1000, Number(req.query.limit) || 200)) }));

/* ---------- feature modules (each owns its routes) ---------- */
const ctx = { app, store, db, ROOT, UPLOAD_DIR, requireAuth, audit, bad, str, nowIso, newId, limited, renderPage, applyReplacements };
privacy.register(ctx);   // legal pages, consent, data requests, manage booking, reminders
require("./pages").register(ctx);     // doctor / speciality / article / custom pages, sitemap
require("./i18n/migrate").run(ctx);  // Hindi: db.textsHi and the Hindi demo content (once, never overwrites)

/* Migration "simple-home-v1": the simpler home page hides the detailed sections (imaging, "Look closer",
   health tools) once. Admins can show them again under Sections; this never runs a second time. */
{
  const d = db();
  d.migrations = d.migrations || {};
  if (!d.migrations["simple-home-v1"]) {
    d.hiddenSections = [...new Set([...(d.hiddenSections || []), ...SIMPLE_HOME_HIDDEN])];
    d.migrations["simple-home-v1"] = nowIso();
    store.save();
  }
}

app.use("/api", (req, res) => bad(res, 404, "Not found."));

/* =========================================================
   Static files
   ========================================================= */
app.use("/uploads", express.static(UPLOAD_DIR, {
  maxAge: "7d",
  setHeaders: (res, file) => { res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"); if (file.endsWith(".pdf")) res.setHeader("Content-Disposition", "inline"); }
}));
app.get("/admin", (req, res, next) => (req.originalUrl === "/admin" ? res.redirect("/admin/") : next()));
app.use("/admin", express.static(path.join(ROOT, "admin"), { index: "index.html" }));
// only the public parts of the repo are served (never server/, data/, node_modules/)
for (const dir of ["assets", "css", "js"]) app.use("/" + dir, express.static(path.join(ROOT, dir), { maxAge: dir === "assets" ? "7d" : 0 }));

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") return bad(res, 400, "Invalid JSON.");
  console.error(err);
  bad(res, 500, "Something went wrong on the server.");
});
app.use((req, res) => res.status(404).type("html").send('<!doctype html><meta charset="utf-8"><title>Not found</title><p style="font-family:system-ui;padding:40px">Page not found. <a href="/">Go to the home page</a></p>'));

app.listen(PORT, () => {
  console.log(`CareNova site:  http://localhost:${PORT}/`);
  console.log(`Admin panel:    http://localhost:${PORT}/admin/`);
  if (fresh) console.log(`First run. Sign in as admin@carenova.local with password ${process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD)" : "ChangeMe@123"} and change it.`);
});
