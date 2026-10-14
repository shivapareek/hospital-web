/* Privacy, compliance and patient self-service (India DPDP Act 2023 oriented, demo).
   - Legal pages (/privacy-policy, /terms, /patient-rights, /data-request) rendered from Markdown settings
   - Consent: required on every public form, stored as {given, at, textVersion}
   - Data subject requests + admin "find and delete this person's data" + daily retention job
   - Manage booking (/manage-booking): look up by token + mobile, cancel, reschedule
   - Notification outbox (SMS / WhatsApp, demo) with reminders and a pluggable webhook sender
   Exports helpers used by the /api/submit handler in index.js and a reusable page shell (renderShell). */
const crypto = require("crypto");
const cheerio = require("cheerio");
const { marked } = require("marked");
const { DEFAULT_SETTINGS } = require("./schema");

let C = null; // ctx from index.js
const settings = () => ({ ...DEFAULT_SETTINGS, ...((C && C.db().settings) || {}) });
const nowIso = () => new Date().toISOString();
const PHONE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const IST = "+05:30";             // slot times are hospital local time (India)
const CHANGE_CUTOFF_MS = 2 * 3600e3; // patients cannot change a booking within 2 hours of it
const BOOKING_DAYS = 14;           // same window as the booking form
const SYSTEM = { email: "system" };
const PATIENT = { email: "patient (website)" };

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const mask = (s) => { s = String(s || ""); if (s.includes("@")) { const [u, d] = s.split("@"); return u.slice(0, 2) + "***@" + d; } return s ? "******" + s.slice(-4) : ""; };
const last10 = (p) => String(p || "").replace(/\D/g, "").slice(-10);

/* =========================================================
   Consent
   ========================================================= */
const CONSENT_KINDS = new Set(["appointment", "message", "report", "package", "subscribe", "datarequest"]);
function consentVersion() { return "c-" + sha(settings().consentText).slice(0, 10); }
function consentError(kind, b) {
  if (!CONSENT_KINDS.has(kind)) return null;
  return b && b.consent === true ? null : "Please tick the box to agree to the privacy policy before sending.";
}
function consentRecord() {
  const v = consentVersion();
  if (C) {
    const db = C.db();
    db.consentVersions = db.consentVersions || {};
    if (!db.consentVersions[v]) db.consentVersions[v] = { text: settings().consentText, firstUsed: nowIso() };
  }
  return { given: true, at: nowIso(), textVersion: v };
}

/* =========================================================
   Time helpers (hospital local time)
   ========================================================= */
function todayIst(offsetDays = 0) {
  const d = new Date(Date.now() + 5.5 * 3600e3 + offsetDays * 864e5);
  return d.toISOString().slice(0, 10);
}
function nowIstMinutes() { const d = new Date(Date.now() + 5.5 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
function slotMinutes(slot) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(slot || "").trim());
  if (!m) return null;
  let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12;
  return h * 60 + +m[2];
}
function apptTime(a) {
  const mins = slotMinutes(a.slot);
  if (mins == null || !/^\d{4}-\d{2}-\d{2}$/.test(a.date || "")) return NaN;
  return Date.parse(`${a.date}T${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00${IST}`);
}
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function isClosed(date, s = settings()) {
  const dow = new Date(`${date}T12:00:00${IST}`).getUTCDay();
  return (s.closedDays || []).some((d) => DAY_NAMES.findIndex((n) => n.startsWith(String(d).trim().toLowerCase().slice(0, 3))) === dow);
}
const toMin = (t, fb) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim()); return m ? +m[1] * 60 + +m[2] : fb; };
/** Slot labels exactly as the booking form builds them ("09:30 AM"). */
function slotLabels(s = settings()) {
  const first = toMin(s.slotStart, 540), last = toMin(s.slotEnd, 1170), step = Math.max(5, Number(s.slotMinutes) || 30);
  const brA = toMin(s.breakStart, -1), brB = toMin(s.breakEnd, -1);
  const out = [];
  for (let m = first; m <= last; m += step) {
    if (brA >= 0 && m >= brA && m < brB) continue;
    const h = Math.floor(m / 60), mm = m % 60;
    out.push(`${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
  }
  return out;
}
function fmtDate(date) {
  const d = new Date(`${date}T12:00:00${IST}`);
  if (isNaN(d)) return date;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

/* =========================================================
   Notifications (demo outbox + optional webhook sender)
   ========================================================= */
let lastOrigin = "";
function siteBase(req) {
  const s = settings();
  if (s.siteUrl && /^https?:\/\//.test(s.siteUrl)) return s.siteUrl.replace(/\/+$/, "");
  if (req) lastOrigin = `${req.protocol}://${req.get("host")}`;
  return lastOrigin || `http://localhost:${process.env.PORT || 3000}`;
}
const manageLink = (a, req) => `${siteBase(req)}/manage-booking?token=${encodeURIComponent(a.token)}`;
function fill(tpl, vars) { return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m)); }
function apptVars(a, req, link) {
  const p = a.patient || {};
  return { name: String(p.name || "").split(/\s+/)[0] || "there", token: a.token, doctor: a.doctor, date: fmtDate(a.date), time: a.slot, link: link || manageLink(a, req) };
}

function outbox() { const db = C.db(); if (!Array.isArray(db.notifications)) db.notifications = []; return db.notifications; }

async function dispatch(n) {
  const url = process.env.SMS_WEBHOOK_URL;
  n.attempts = (n.attempts || 0) + 1;
  if (!url) { n.status = "logged"; n.sentAt = nowIso(); C.store.save(); return n; }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), Number(process.env.SMS_WEBHOOK_TIMEOUT_MS) || 8000);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: n.to, text: n.text, channel: n.channel }), signal: ac.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    n.status = "sent"; n.sentAt = nowIso(); delete n.error;
  } catch (e) {
    n.status = "failed"; n.error = String(e.name === "AbortError" ? "Timed out" : e.message).slice(0, 200);
  } finally { clearTimeout(timer); }
  C.store.save();
  return n;
}

/** Queue a message and send it in the background. */
function queue({ channel, to, template, text, related }) {
  const n = { id: C.newId(), at: nowIso(), channel: channel || settings().notifyChannel || "sms", to, template, text: C.applyReplacements(text, C.db().settings), status: "queued", related: related || null };
  const list = outbox();
  list.unshift(n);
  if (list.length > 5000) list.length = 5000;
  C.store.save();
  dispatch(n).catch(() => {});
  return n;
}
const TEMPLATE_KEY = { confirm: "tplConfirm", reminder: "tplReminder", cancel: "tplCancel", reschedule: "tplReschedule" };
function notifyAppointment(a, template, req, link) {
  const s = settings();
  if (s.notifyOn === false) return null;
  const phone = a.patient && a.patient.phone;
  if (!PHONE.test(phone || "")) return null;
  return queue({ to: "+91" + phone, template, text: fill(s[TEMPLATE_KEY[template]], apptVars(a, req, link)), related: { type: "appointments", id: a.id, token: a.token } });
}

/** Called by index.js after an appointment is created. */
function onBooked(a, req) {
  const s = settings();
  a.history = a.history || [];
  notifyAppointment(a, "confirm", req);
  return { manage: `/manage-booking?token=${encodeURIComponent(a.token)}`, notify: s.notifyOn !== false, channel: s.notifyChannel, reminderHours: Number(s.reminderHours) || 24 };
}

/** Sends due reminders once per appointment. Returns how many were queued. */
function runReminders() {
  const s = settings();
  if (s.notifyOn === false) return 0;
  const hours = Math.max(0, Number(s.reminderHours) || 24);
  const now = Date.now();
  let n = 0;
  for (const a of C.db().submissions.appointments) {
    if (a.reminderSentAt || a.anonymisedAt || !["new", "confirmed"].includes(a.status)) continue;
    const t = apptTime(a);
    if (!Number.isFinite(t) || t <= now || t - now > hours * 3600e3) continue;
    a.reminderSentAt = nowIso();
    if (notifyAppointment(a, "reminder")) n++;
  }
  if (n) C.store.save();
  return n;
}

/* =========================================================
   Anonymise / delete / retention
   ========================================================= */
const SUB_TYPES = ["appointments", "messages", "reports", "packages", "subscribers", "dataRequests"];
function anonymise(type, x) {
  if (type === "appointments") {
    x.patient = { ...(x.patient || {}), name: "Removed", phone: "", age: "" };
    x.reason = ""; x.note = ""; if (x.cancelReason) x.cancelReason = "";
    if (Array.isArray(x.history)) x.history.forEach((h) => { if (h.reason) h.reason = ""; });
  } else if (type === "notifications") {
    x.to = ""; x.text = "(removed)";
  } else {
    if ("name" in x) x.name = "Removed";
    for (const k of ["phone", "email", "uhid", "message", "details", "note"]) if (k in x) x[k] = "";
  }
  x.anonymisedAt = nowIso();
}

function runRetention(user = SYSTEM) {
  const s = settings();
  const S = C.db().submissions;
  const now = Date.now();
  const rules = [["appointments", s.retentionAppointments], ["messages", s.retentionEnquiries], ["reports", s.retentionEnquiries], ["packages", s.retentionEnquiries], ["subscribers", s.retentionSubscribers]];
  const counts = {};
  for (const [type, daysRaw] of rules) {
    const days = Number(daysRaw);
    if (!S[type] || !Number.isFinite(days) || days <= 0) continue;
    const cutoff = now - days * 864e5;
    if (type === "subscribers") {
      const before = S[type].length;
      S[type] = S[type].filter((x) => !(Date.parse(x.createdAt) < cutoff));
      if (before - S[type].length) counts[type] = before - S[type].length;
      continue;
    }
    for (const x of S[type]) {
      if (x.anonymisedAt || !(Date.parse(x.createdAt) < cutoff)) continue;
      anonymise(type, x);
      counts[type] = (counts[type] || 0) + 1;
    }
  }
  // the outbox holds names and numbers too: keep it no longer than appointments
  const nDays = Number(s.retentionAppointments);
  if (nDays > 0) {
    const cutoff = now - nDays * 864e5;
    for (const n of outbox()) if (!n.anonymisedAt && Date.parse(n.at) < cutoff) { anonymise("notifications", n); counts.notifications = (counts.notifications || 0) + 1; }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  C.db().retentionLastRun = nowIso();
  if (total) C.audit(user, "Retention job anonymised old records", Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", "));
  C.store.save();
  return { total, counts };
}

/** All records that belong to a mobile number and/or email. */
function findPersonal(phone, email) {
  const S = C.db().submissions;
  const p = last10(phone), e = String(email || "").trim().toLowerCase();
  const hitP = (v) => p.length === 10 && last10(v) === p;
  const hitE = (v) => !!e && String(v || "").trim().toLowerCase() === e;
  const out = [];
  const add = (type, x, label, summary) => out.push({ type, id: x.id, label, summary, createdAt: x.createdAt || x.at, anonymised: !!x.anonymisedAt });
  for (const a of S.appointments) if (hitP(a.patient && a.patient.phone)) add("appointments", a, `Appointment ${a.token}`, `${(a.patient || {}).name} · ${a.doctor} · ${a.date} ${a.slot} · ${a.status}`);
  for (const m of S.messages) if (hitP(m.phone) || hitE(m.email)) add("messages", m, "Message", `${m.name}: ${String(m.message || "").slice(0, 80)}`);
  for (const r of S.reports) if (hitP(r.phone)) add("reports", r, "Report request", `UHID ${r.uhid}`);
  for (const k of S.packages) if (hitP(k.phone)) add("packages", k, "Check-up request", `${k.name || ""} · ${k.package}`);
  for (const s of S.subscribers) if (hitE(s.email)) add("subscribers", s, "Newsletter subscription", s.email);
  for (const d of S.dataRequests || []) if (hitP(d.phone) || hitE(d.email)) add("dataRequests", d, "Data request", `${d.requestType} · ${d.status}`);
  for (const n of outbox()) if (hitP(n.to) || hitE(n.to)) out.push({ type: "notifications", id: n.id, label: `Message (${n.channel})`, summary: `${n.template} · ${String(n.text || "").slice(0, 60)}`, createdAt: n.at, anonymised: !!n.anonymisedAt });
  return out;
}

/* =========================================================
   Data requests (public form → submissions.dataRequests)
   ========================================================= */
const REQUEST_TYPES = { access: "Access my data", correction: "Correct my data", deletion: "Delete my data", "withdraw-consent": "Withdraw consent" };
function dataRequest(b, base) {
  const str = C.str;
  if (str(b.name).length < 2) return { error: "Enter your name." };
  if (!PHONE.test(str(b.phone))) return { error: "Enter the 10-digit mobile number you used with us." };
  if (str(b.email) && !EMAIL.test(str(b.email))) return { error: "Enter a valid email address, or leave it empty." };
  if (!REQUEST_TYPES[b.requestType]) return { error: "Choose what you would like us to do." };
  const item = {
    ...base, name: str(b.name, 120), phone: str(b.phone, 10), email: str(b.email, 200), requestType: b.requestType,
    details: str(b.details, 2000), dueBy: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  };
  C.audit(PATIENT, "Data request received", `${REQUEST_TYPES[b.requestType]} · ${mask(item.phone)}`);
  return { item };
}

/* =========================================================
   Manage booking
   ========================================================= */
const failures = new Map();
function tooManyFailures(ip) {
  const now = Date.now();
  const arr = (failures.get(ip) || []).filter((t) => now - t < 15 * 60e3);
  failures.set(ip, arr);
  return arr.length >= 8;
}
function noteFailure(ip) { const arr = failures.get(ip) || []; arr.push(Date.now()); failures.set(ip, arr); }
setInterval(() => { const now = Date.now(); for (const [k, v] of failures) if (!v.some((t) => now - t < 15 * 60e3)) failures.delete(k); }, 600e3).unref();

const NOT_FOUND = "We couldn't find a booking with that token and mobile number. Check both and try again, or call the helpdesk.";
function findBooking(token, phone) {
  const t = String(token || "").trim().toUpperCase().replace(/\s+/g, "");
  const p = last10(phone);
  if (!/^[A-Z0-9]{1,4}-\d{3,4}$/.test(t) || !PHONE.test(p)) return null;
  const list = C.db().submissions.appointments.filter((a) => !a.anonymisedAt && a.token === t && a.patient && a.patient.phone === p);
  if (!list.length) return null;
  // several bookings can share a token on different days: prefer the next upcoming one
  const now = Date.now();
  const upcoming = list.filter((a) => apptTime(a) > now).sort((a, b) => apptTime(a) - apptTime(b));
  return upcoming[0] || list.sort((a, b) => apptTime(b) - apptTime(a))[0];
}
function lockReason(a) {
  const s = settings();
  if (["cancelled", "completed", "no-show"].includes(a.status)) return `This appointment is ${a.status === "no-show" ? "marked as missed" : a.status} and can't be changed online.`;
  const t = apptTime(a);
  if (!Number.isFinite(t) || t - Date.now() < CHANGE_CUTOFF_MS) return `Online changes close 2 hours before the appointment. Please call ${s.helpdesk}.`;
  return "";
}
function publicView(a) {
  const s = settings();
  const lock = lockReason(a);
  return {
    token: a.token, patient: String((a.patient || {}).name || "").split(/\s+/)[0], doctor: a.doctor, dept: a.dept,
    date: a.date, dateLabel: fmtDate(a.date), slot: a.slot, type: a.type, status: a.status, fee: a.fee,
    canChange: !lock, lockReason: lock,
    history: (a.history || []).filter((h) => h.by === "patient" || ["cancelled", "rescheduled"].includes(h.action)).map((h) => ({ at: h.at, action: h.action, from: h.from, to: h.to })),
    rules: { closedDays: s.closedDays || [], slots: slotLabels(s), today: todayIst(), nowMinutes: nowIstMinutes(), days: BOOKING_DAYS, leadMinutes: 30 },
    notify: s.notifyOn !== false
  };
}
function takenCount(doctor, date, slot, exceptId) {
  return C.db().submissions.appointments.filter((x) => x.id !== exceptId && x.doctor === doctor && x.date === date && x.slot === slot && !["cancelled", "no-show"].includes(x.status)).length;
}

/* =========================================================
   Markdown → safe HTML
   ========================================================= */
const MD_TAGS = new Set(["p", "h2", "h3", "h4", "ul", "ol", "li", "a", "strong", "em", "b", "i", "code", "pre", "blockquote", "hr", "br", "table", "thead", "tbody", "tr", "th", "td", "del"]);
function sanitizeHtml(html) {
  const $ = cheerio.load(`<div id="md">${html}</div>`, null, false);
  $("#md script, #md style, #md iframe, #md object, #md embed, #md form, #md input, #md textarea, #md select, #md button, #md svg, #md math, #md template").remove();
  $("#md *").each((_, el) => {
    if (el.tagName === "h1") { el.tagName = "h2"; }
    if (!MD_TAGS.has(el.tagName)) { $(el).replaceWith($(el).contents()); return; }
    for (const name of Object.keys(el.attribs || {})) {
      const v = String(el.attribs[name]);
      const ok = (el.tagName === "a" && name === "href" && /^(https?:|mailto:|tel:|\/|#)/i.test(v.trim())) || ((el.tagName === "th" || el.tagName === "td") && name === "align");
      if (!ok) $(el).removeAttr(name);
    }
    if (el.tagName === "a" && /^https?:/i.test($(el).attr("href") || "")) $(el).attr("rel", "noopener").attr("target", "_blank");
  });
  $("#md table").each((_, t) => { $(t).wrap('<div class="legal__table" tabindex="0" role="region" aria-label="Table"></div>'); });
  return $("#md").html();
}
function legalVars(s = settings()) {
  const days = (n, none) => (Number(n) > 0 ? `${Number(n)} days` : none);
  return {
    hospital: s.name, helpdesk: s.helpdesk, email: s.email, dpoName: s.dpoName, dpoEmail: s.dpoEmail, dpoPhone: s.dpoPhone,
    retentionAppointments: days(s.retentionAppointments, "as long as needed"), retentionEnquiries: days(s.retentionEnquiries, "as long as needed"),
    retentionSubscribers: days(s.retentionSubscribers, "until you unsubscribe or ask us to remove you")
  };
}
function renderMarkdown(md) {
  return sanitizeHtml(marked.parse(fill(md, legalVars()), { gfm: true, breaks: true }));
}

/* =========================================================
   Page shell: the home page's head, header and footer around new <main> content.
   Exported so other modules can reuse it.
   ========================================================= */
function renderShell({ title, description, path: pagePath, main, styles = [], scripts = [], noindex = false, bodyClass = "" }) {
  const db = C.db();
  const s = settings();
  const $ = cheerio.load(C.renderPage(db));
  $("meta[charset]").first().after('<base href="/">');
  const fullTitle = `${title} · ${s.name}`;
  $("title").text(fullTitle);
  $('meta[name="description"]').attr("content", description || "");
  $('meta[property="og:title"]').attr("content", fullTitle);
  $('meta[property="og:description"]').attr("content", description || "");
  if (pagePath) $("head").append(`<link rel="canonical" href="${esc(pagePath)}">`);
  if (noindex) $("head").append('<meta name="robots" content="noindex">');
  // home-page-only scripts and widgets (they need js/main.js, which expects the home page)
  $('script[type="importmap"], script[src]').remove();
  $("link[rel=modulepreload]").remove();
  $("#chat, #chatToggle, #pkgModal, #reportsModal").remove();
  $('a[data-open="reportsModal"]').attr("href", "/#contact").removeAttr("data-open");
  // settings replacements (hospital name, phones…) were applied to the home page already: apply them to the new part only
  $("main").first().attr("id", "main").attr("class", "inner-main").html(C.applyReplacements(main, db.settings));
  if (bodyClass) $("body").addClass(bodyClass);
  for (const href of ["css/privacy.css", ...styles]) $("head").append(`<link rel="stylesheet" href="${esc(href)}">`);
  for (const src of ["js/shell.js", ...scripts]) $("body").append(`<script src="${esc(src)}" defer></script>`);
  return $.html();
}

const LEGAL_PAGES = [
  { path: "/privacy-policy", key: "legalPrivacy", title: "Privacy policy", nav: "Privacy policy", description: "How CareNova Hospitals collects, uses, keeps and protects your personal data, and your rights under India's DPDP Act 2023." },
  { path: "/terms", key: "legalTerms", title: "Terms of use", nav: "Terms of use", description: "The terms that apply when you use the CareNova Hospitals website and book appointments online." },
  { path: "/patient-rights", key: "legalPatientRights", title: "Patient rights and responsibilities", nav: "Patient rights", description: "The rights every patient has at CareNova Hospitals, your responsibilities, and how to raise a complaint." },
  { path: "/data-request", key: "legalDataRequest", title: "Request your data", nav: "Data request", description: "Ask CareNova Hospitals to show, correct or delete your personal data, or withdraw your consent." }
];
const consentLabel = (text) => `${esc(text)} <a href="privacy-policy" target="_blank" rel="noopener">Read the privacy policy</a>.`;
const NEWSLETTER_NOTE = 'By subscribing you agree to receive a monthly email and to our <a href="privacy-policy">privacy policy</a>. Unsubscribe any time.';
const DEMO_NOTE = '<p class="legal__demo" role="note"><svg class="ic" aria-hidden="true"><use href="#i-file"/></svg><span><strong>Demo website.</strong> Sample text for a demo website. Have a lawyer review before real use.</span></p>';

function asideHtml(current) {
  const s = settings();
  return `<aside class="legal__aside" aria-label="More about privacy">
    <nav class="legal__nav" aria-label="Legal pages"><p class="legal__aside-title">Privacy and legal</p><ul>
      ${LEGAL_PAGES.map((p) => `<li><a href="${p.path}"${p.path === current ? ' aria-current="page"' : ""}>${esc(p.nav)}</a></li>`).join("")}
      <li><a href="/manage-booking"${current === "/manage-booking" ? ' aria-current="page"' : ""}>Manage a booking</a></li>
    </ul></nav>
    <div class="legal__card">
      <p class="legal__aside-title">Grievance officer</p>
      <p class="legal__officer">${esc(s.dpoName)}</p>
      <p><a href="mailto:${esc(s.dpoEmail)}">${esc(s.dpoEmail)}</a><br><a class="mono" href="tel:${esc(String(s.dpoPhone).replace(/[^\d+]/g, ""))}">${esc(s.dpoPhone)}</a></p>
      ${current === "/data-request" ? "" : '<a class="btn btn--line btn--sm btn--block" href="/data-request">Make a data request</a>'}
    </div>
  </aside>`;
}

function legalHead(p, s) {
  return `<header class="legal__head">
      <nav class="legal__crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.nav)}</span></nav>
      <p class="kicker">Privacy and legal</p>
      <h1 class="legal__title" id="pageTitle">${esc(p.title)}</h1>
      ${s.legalUpdated ? `<p class="legal__meta">Last updated <time>${esc(s.legalUpdated)}</time></p>` : ""}
      ${DEMO_NOTE}
    </header>`;
}

function dataRequestForm() {
  const opts = Object.entries(REQUEST_TYPES).map(([v, l], i) => `<label><input type="radio" name="requestType" value="${v}"${i === 0 ? " checked" : ""} /><span>${esc(l)}</span></label>`).join("");
  return `<form class="legal__form" id="dataRequestForm" novalidate>
    <h2>Your request</h2>
    <div class="grid-2">
      <label class="field"><span>Full name</span><input type="text" name="name" autocomplete="name" required /></label>
      <label class="field"><span>Mobile number</span><input type="tel" name="phone" maxlength="10" inputmode="numeric" autocomplete="tel-national" placeholder="10-digit mobile" required /></label>
    </div>
    <label class="field"><span>Email <em>(optional)</em></span><input type="email" name="email" autocomplete="email" /></label>
    <fieldset class="field dr-types"><legend>What would you like us to do?</legend><div class="toggle-group toggle-group--4">${opts}</div></fieldset>
    <label class="field"><span>Details <em>(optional)</em></span><textarea name="details" rows="4" placeholder="For example: which details are wrong, or which visit this is about"></textarea></label>
    <label class="hp" aria-hidden="true">Leave empty<input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
    <label class="consent"><input type="checkbox" name="consent" required /><span data-consent>${consentLabel(settings().consentText)}</span></label>
    <button class="btn btn--accent" type="submit">Send request</button>
    <p class="form-msg" id="drMsg" role="status"></p>
  </form>`;
}

function legalPage(p) {
  const s = settings();
  const body = renderMarkdown(s[p.key] || DEFAULT_SETTINGS[p.key] || "");
  const main = `<section class="section legal" aria-labelledby="pageTitle">
    <div class="wrap legal__grid">
      ${legalHead(p, s)}
      <div class="legal__content"><article class="legal__body prose">${body}</article>${p.path === "/data-request" ? dataRequestForm() : ""}</div>
      ${asideHtml(p.path)}
    </div>
  </section>`;
  return renderShell({ title: p.title, description: p.description, path: p.path, main, scripts: p.path === "/data-request" ? ["js/manage.js"] : [] });
}

function managePage() {
  const s = settings();
  const main = `<section class="section legal manage" aria-labelledby="pageTitle">
    <div class="wrap legal__grid">
      <header class="legal__head">
        <nav class="legal__crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Manage booking</span></nav>
        <p class="kicker">Appointments</p>
        <h1 class="legal__title" id="pageTitle">Manage your booking</h1>
        <p class="legal__lead">Enter the token from your booking and the mobile number you booked with. You can change or cancel up to 2 hours before your time.</p>
      </header>
      <div class="legal__content">
        <form class="legal__form" id="lookupForm" novalidate>
          <div class="grid-2">
            <label class="field"><span>Token</span><input type="text" name="token" id="mToken" placeholder="e.g. CA-123" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="8" required /></label>
            <label class="field"><span>Registered mobile</span><input type="tel" name="phone" id="mPhone" maxlength="10" inputmode="numeric" autocomplete="tel-national" placeholder="10-digit mobile" required /></label>
          </div>
          <button class="btn btn--accent" type="submit">Find my booking</button>
          <p class="form-msg" id="lookupMsg" role="status"></p>
        </form>
        <div id="manageResult" class="manage__result" hidden tabindex="-1"></div>
      </div>
      ${asideHtml("/manage-booking")}
    </div>
  </section>`;
  return renderShell({ title: "Manage booking", description: `Change or cancel your ${s.name} appointment online.`, path: "/manage-booking", main, scripts: ["js/manage.js"], noindex: true });
}

/* =========================================================
   Routes
   ========================================================= */
function register(ctx) {
  C = ctx;
  const { app, db, store, requireAuth, audit, bad, str, limited } = ctx;
  const S = db().submissions;
  if (!Array.isArray(S.dataRequests)) S.dataRequests = [];
  outbox();

  // consent text on the home page forms, filled in on the server (js/main.js has a fallback for the static site)
  const render = require("./render");
  if (typeof render.addRenderHook === "function") {
    render.addRenderHook(($) => {
      const s = settings();
      $("[data-consent]").html(consentLabel(s.consentText));
      $("[data-consent-note]").html(NEWSLETTER_NOTE);
      if (!$('link[href="css/privacy.css"]').length) $("head").append('<link rel="stylesheet" href="css/privacy.css">');
      const cfg = { consentVersion: consentVersion(), notify: { on: s.notifyOn !== false, channel: s.notifyChannel, reminderHours: Number(s.reminderHours) || 24 } };
      const anchor = $('script[src="js/data.js"]');
      if (anchor.length) anchor.before(`<script>window.CMS_PRIVACY=${JSON.stringify(cfg).replace(/</g, "\\u003c")};</script>`);
    });
  }

  const html = (fn) => (req, res, next) => {
    try { res.type("html").setHeader("Cache-Control", "no-cache"); res.send(fn(req)); } catch (e) { next(e); }
  };
  for (const p of LEGAL_PAGES) app.get(p.path, html(() => legalPage(p)));
  app.get("/manage-booking", html(() => managePage()));

  /* ---------- public config for the forms ---------- */
  app.get("/api/privacy/config", (req, res) => {
    const s = settings();
    res.setHeader("Cache-Control", "no-cache");
    res.json({
      consentText: ctx.applyReplacements(s.consentText, db().settings), consentVersion: consentVersion(), privacyUrl: "/privacy-policy",
      notify: { on: s.notifyOn !== false, channel: s.notifyChannel, reminderHours: Number(s.reminderHours) || 24 }
    });
  });

  /* ---------- manage booking ---------- */
  const guard = (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    if (limited("booking:" + ip, 30, 15 * 60e3) || tooManyFailures(ip)) { bad(res, 429, "Too many tries. Please wait 15 minutes or call the helpdesk."); return null; }
    const b = req.body || {};
    const a = findBooking(b.token, b.phone);
    if (!a) { noteFailure(ip); bad(res, 404, NOT_FOUND); return null; }
    return a;
  };
  app.post("/api/booking/lookup", (req, res) => {
    const a = guard(req, res); if (!a) return;
    res.json({ booking: publicView(a) });
  });
  app.post("/api/booking/cancel", (req, res) => {
    const a = guard(req, res); if (!a) return;
    const lock = lockReason(a);
    if (lock) return bad(res, 400, lock);
    const reason = str(req.body.reason, 300);
    if (reason.length < 2) return bad(res, 400, "Tell us why you are cancelling.");
    (a.history = a.history || []).push({ at: nowIso(), action: "cancelled", from: a.status, to: "cancelled", by: "patient", reason });
    a.status = "cancelled"; a.cancelReason = reason; a.updatedAt = nowIso();
    audit(PATIENT, "Patient cancelled appointment", `${a.token} · ${a.date} ${a.slot}`);
    notifyAppointment(a, "cancel", req, `${siteBase(req)}/#book`);
    store.save();
    res.json({ booking: publicView(a) });
  });
  app.post("/api/booking/reschedule", (req, res) => {
    const a = guard(req, res); if (!a) return;
    const s = settings();
    const lock = lockReason(a);
    if (lock) return bad(res, 400, lock);
    if (s.bookingOn === false) return bad(res, 400, `Online changes are paused. Please call ${s.helpdesk}.`);
    const date = str(req.body.date, 10), slot = str(req.body.slot, 20);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayIst() || date > todayIst(BOOKING_DAYS - 1)) return bad(res, 400, `Choose a date in the next ${BOOKING_DAYS} days.`);
    if (isClosed(date, s)) return bad(res, 400, "The OPD is closed on that day. Choose another date.");
    if (!slotLabels(s).includes(slot)) return bad(res, 400, "Choose one of the listed times.");
    const when = apptTime({ date, slot });
    if (!(when > Date.now() + 30 * 60e3)) return bad(res, 400, "That time has passed. Choose a later time.");
    if (date === a.date && slot === a.slot) return bad(res, 400, "That is your current time. Choose a different one.");
    const perSlot = Math.max(1, Number(s.perSlot) || 1);
    if (takenCount(a.doctor, date, slot, a.id) >= perSlot) return bad(res, 409, "That time was just booked. Please pick another slot.");
    const from = `${a.date} ${a.slot}`;
    const entry = { at: nowIso(), action: "rescheduled", from, to: `${date} ${slot}`, by: "patient" };
    // tokens are unique per day: give a new one if the new day already uses it
    if (S.appointments.some((x) => x.id !== a.id && x.token === a.token && x.date === date)) {
      let t; do { t = a.token.slice(0, 2) + "-" + (100 + Math.floor(Math.random() * 900)); } while (S.appointments.some((x) => x.token === t && x.date === date));
      entry.tokenFrom = a.token; entry.tokenTo = t; a.token = t;
    }
    (a.history = a.history || []).push(entry);
    a.date = date; a.slot = slot; a.reminderSentAt = null; a.updatedAt = nowIso();
    audit(PATIENT, "Patient rescheduled appointment", `${a.token} · ${from} → ${date} ${slot}`);
    notifyAppointment(a, "reschedule", req);
    store.save();
    res.json({ booking: publicView(a) });
  });

  /* ---------- admin: notifications ---------- */
  app.get("/api/admin/notifications", requireAuth("submissions"), (req, res) => {
    let items = outbox();
    const q = req.query;
    if (q.status) items = items.filter((n) => n.status === q.status);
    if (q.channel) items = items.filter((n) => n.channel === q.channel);
    if (q.template) items = items.filter((n) => n.template === q.template);
    if (q.q) { const t = String(q.q).toLowerCase(); items = items.filter((n) => JSON.stringify(n).toLowerCase().includes(t)); }
    const limit = Math.min(1000, Number(q.limit) || 300);
    res.json({ items: items.slice(0, limit), total: items.length, webhook: !!process.env.SMS_WEBHOOK_URL, notifyOn: settings().notifyOn !== false });
  });
  app.post("/api/admin/notifications/:id/resend", requireAuth("submissions"), async (req, res) => {
    const n = outbox().find((x) => x.id === req.params.id);
    if (!n) return bad(res, 404, "Not found.");
    if (n.anonymisedAt || !n.to) return bad(res, 400, "This message was anonymised and cannot be sent again.");
    n.status = "queued";
    await dispatch(n);
    audit(req.user, "Resent notification", `${n.template} to ${mask(n.to)} → ${n.status}`);
    store.save();
    res.json({ item: n });
  });
  app.post("/api/admin/notifications/run-reminders", requireAuth("submissions"), (req, res) => {
    const count = runReminders();
    audit(req.user, "Ran reminder check", `${count} reminder(s) queued`);
    store.save();
    res.json({ count });
  });

  /* ---------- admin: find and delete a person's data (admin only) ---------- */
  app.get("/api/admin/privacy/search", requireAuth("users"), (req, res) => {
    const phone = str(req.query.phone, 20), email = str(req.query.email, 200);
    if (last10(phone).length !== 10 && !EMAIL.test(email)) return bad(res, 400, "Enter a 10-digit mobile number or an email address.");
    res.json({ items: findPersonal(phone, email) });
  });
  app.post("/api/admin/privacy/erase", requireAuth("users"), (req, res) => {
    const b = req.body || {};
    const mode = b.mode === "delete" ? "delete" : "anonymise";
    const phone = str(b.phone, 20), email = str(b.email, 200);
    const allowed = new Map(findPersonal(phone, email).map((m) => [m.type + ":" + m.id, m]));
    const wanted = (Array.isArray(b.items) ? b.items : []).filter((x) => x && allowed.has(x.type + ":" + x.id));
    if (!wanted.length) return bad(res, 400, "Select at least one record that belongs to this person.");
    let count = 0;
    for (const { type, id } of wanted) {
      const list = type === "notifications" ? outbox() : S[type];
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) continue;
      if (mode === "delete" || type === "subscribers") list.splice(idx, 1); else anonymise(type, list[idx]);
      count++;
    }
    let reqNote = "";
    if (b.requestId) {
      const r = S.dataRequests.find((x) => x.id === b.requestId);
      if (r && !wanted.some((w) => w.type === "dataRequests" && w.id === r.id)) {
        r.status = "completed"; r.updatedAt = nowIso();
        r.note = `${r.note ? r.note + "\n" : ""}${new Date().toISOString().slice(0, 10)}: ${mode === "delete" ? "deleted" : "anonymised"} ${count} record(s) by ${req.user.email}.`;
        reqNote = " · request marked completed";
      }
    }
    audit(req.user, mode === "delete" ? "Deleted a person's data" : "Anonymised a person's data", `${count} record(s) for ${[mask(phone), mask(email)].filter(Boolean).join(" / ")}${reqNote}`);
    store.save();
    res.json({ count, mode });
  });
  app.post("/api/admin/privacy/retention/run", requireAuth("users"), (req, res) => res.json(runRetention(req.user)));
  app.get("/api/admin/privacy/status", requireAuth("submissions"), (req, res) => {
    const s = settings();
    res.json({
      retentionLastRun: db().retentionLastRun || null,
      retention: { appointments: s.retentionAppointments, enquiries: s.retentionEnquiries, subscribers: s.retentionSubscribers },
      openRequests: S.dataRequests.filter((r) => ["new", "verifying"].includes(r.status)).length,
      consentVersion: consentVersion(), consentVersions: db().consentVersions || {}
    });
  });

  /* ---------- schedulers ---------- */
  setTimeout(() => { try { runRetention(); } catch (e) { console.warn("retention job failed:", e.message); } }, 2000).unref();
  setInterval(() => { try { runRetention(); } catch (e) { console.warn("retention job failed:", e.message); } }, 24 * 3600e3).unref();
  setTimeout(() => { try { runReminders(); } catch (e) { console.warn("reminders failed:", e.message); } }, 3000).unref();
  setInterval(() => { try { runReminders(); } catch (e) { console.warn("reminders failed:", e.message); } }, 60e3).unref();
}

module.exports = { register, consentError, consentRecord, onBooked, dataRequest, renderShell, renderMarkdown, runReminders, runRetention };
