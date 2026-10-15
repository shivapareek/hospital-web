/* =========================================================
   CareNova Hospitals – Interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  };
  const icon = (id) => `<svg class="ic"><use href="#${id}"/></svg>`;
  const initials = (name) => name.replace(/^Dr\.?\s*/i, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const inr = (n) => "₹" + n.toLocaleString("en-IN");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tone = (name) => (name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 5) + 1;
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const deptIcon = (d) => (DEPARTMENTS.find((x) => x.name === d) || {}).icon || "i-steth";

  /* ---------- Language: window.I18N (set by the server on Hindi pages) maps English text to the page language ---------- */
  const I18N = window.I18N || {};
  const LANG = (window.CMS && window.CMS.lang) || "en";
  const tr = (s, v) => { let r = Object.prototype.hasOwnProperty.call(I18N, s) ? I18N[s] : s; if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); return r; };
  /** A speciality's display name: `label` in the Hindi data, the English name otherwise. Doctors and symptoms store the English name. */
  const deptName = (name) => (DEPARTMENTS.find((x) => x.name === name) || {}).label || name;

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------- Theme & text size ---------- */
  const root = document.documentElement;
  const savedTheme = storage.get("cn-theme");
  if (savedTheme) root.dataset.theme = savedTheme;
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  $("#themeToggle").addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    storage.set("cn-theme", root.dataset.theme);
  });

  const sizes = [1, 1.1, 1.2];
  let fs = Math.max(0, sizes.indexOf(parseFloat(storage.get("cn-fs") || "1")));
  const applyFs = () => root.style.setProperty("--fs-scale", String(sizes[fs]));
  $("#fontToggle").addEventListener("click", () => {
    fs = (fs + 1) % sizes.length;
    storage.set("cn-fs", String(sizes[fs]));
    applyFs();
    toast(tr("Text size {n}%", { n: Math.round(sizes[fs] * 100) }));
  });
  applyFs();

  /* ---------- Header ---------- */
  const header = $("#header");
  const burger = $("#burger");
  const menu = $("#mobileMenu");
  function setMenu(open) {
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    burger.innerHTML = icon(open ? "i-x" : "i-menu");
  }
  burger.addEventListener("click", () => setMenu(menu.hidden));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = $$(".nav__link");
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) navLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  // every section is observed: one without a nav link (the hero, finder, booking, tools, stories, FAQ,
  // library, the "Look closer" band) clears the underline, so a link is current only over its own section
  $$("main > section[id]").forEach((sec) => navObserver.observe(sec));

  /* ---------- Counters (numbers are already correct at rest) ---------- */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const to = parseFloat(el.dataset.to);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / 1400);
        const v = to * (1 - Math.pow(1 - p, 4));
        el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-IN");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) $$(".counter").forEach((c) => counterObserver.observe(c));

  /* ---------- CMS connection (window.CMS is set when the site runs on the CMS server) ---------- */
  const CMS = window.CMS || null;
  async function cmsPost(kind, body) {
    // lang: the server answers with messages in the page language
    const r = await fetch(`${CMS.api}/submit/${kind}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "cms" }, body: JSON.stringify(LANG === "en" ? body : { ...body, lang: LANG }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.error || tr("We couldn't send that. Please try again or call us.")); e.status = r.status; throw e; }
    return data;
  }

  /* ---------- Consent (privacy): every form that collects personal data needs the tick box ---------- */
  const CONSENT_TEXT = "I agree that CareNova Hospitals may use these details to handle this request, as set out in the privacy policy.";
  const CONSENT_MSG = tr("Tick the box to agree to the privacy policy.");
  let privacyCfg = window.CMS_PRIVACY || null;   // set by the server: consent version, notification settings
  // the server fills the consent labels; the static site (or an older server) gets the default text here
  $$("[data-consent]").forEach((el) => { if (!el.textContent.trim()) el.innerHTML = `${esc(CONSENT_TEXT)} <a href="privacy-policy" target="_blank" rel="noopener">${tr("Read the privacy policy")}</a>.`; });
  $$("[data-consent-note]").forEach((el) => { if (!el.textContent.trim()) el.innerHTML = 'By subscribing you agree to receive a monthly email and to our <a href="privacy-policy">privacy policy</a>. Unsubscribe any time.'; });
  if (CMS && !privacyCfg) fetch(`${CMS.api}/privacy/config${LANG === "en" ? "" : "?lang=" + LANG}`).then((r) => r.json()).then((c) => { privacyCfg = c; }).catch(() => {});
  /** True when the form's consent box is ticked; otherwise marks it and returns false. */
  function consentOk(form) {
    const box = $("input[name=consent]", form);
    if (!box || box.checked) return true;
    const lab = box.closest(".consent");
    lab.classList.add("invalid");
    box.addEventListener("change", () => lab.classList.remove("invalid"), { once: true });
    return false;
  }
  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const closedDays = CMS ? (CMS.booking.closedDays || []).map((d) => DAY_NAMES.findIndex((n) => n.startsWith(String(d).trim().toLowerCase().slice(0, 3)))).filter((i) => i >= 0) : [0];
  const isClosed = (d) => closedDays.includes(d.getDay());
  const toMin = (t, fb) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim()); return m ? +m[1] * 60 + +m[2] : fb; };

  /* ---------- Live status (demo feed, or the values set in the admin panel) ---------- */
  const live = { er: 8, beds: 42, icu: 7, token: 114 };
  let lastUpdate = Date.now();
  function setLive(sel, val) {
    const el = $(sel);
    if (el.textContent === String(val)) return;
    el.textContent = val;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 900);
  }
  function applyLive(L) {
    if (!L) return;
    setLive("#liveEr", String(L.erWait ?? 0).padStart(2, "0"));
    setLive("#liveBeds", L.beds ?? "—");
    setLive("#liveIcu", L.icu ?? "—");
    setLive("#liveToken", L.token || "—");
    lastUpdate = L.updatedAt ? Date.parse(L.updatedAt) || Date.now() : Date.now();
  }
  if (CMS && CMS.live.mode === "manual") {
    applyLive(CMS.live);
    setInterval(() => fetch(`${CMS.api}/live`).then((r) => r.json()).then((L) => { if (L.mode === "manual") applyLive(L); }).catch(() => {}), 30000);
  } else setInterval(() => {
    live.er = Math.max(4, Math.min(16, live.er + rand(-2, 2)));
    live.beds = Math.max(30, Math.min(58, live.beds + rand(-2, 2)));
    live.icu = Math.max(3, Math.min(11, live.icu + rand(-1, 1)));
    live.token += rand(0, 2);
    setLive("#liveEr", String(live.er).padStart(2, "0"));
    setLive("#liveBeds", live.beds);
    setLive("#liveIcu", live.icu);
    setLive("#liveToken", "A-" + live.token);
    lastUpdate = Date.now();
  }, 7000);
  setInterval(() => {
    const s = Math.round((Date.now() - lastUpdate) / 1000);
    $("#liveUpdated").textContent = s < 3 ? tr("just now") : s < 120 ? tr("{n} s ago", { n: s }) : s < 7200 ? tr("{n} min ago", { n: Math.round(s / 60) }) : tr("{n} h ago", { n: Math.round(s / 3600) });
  }, 1000);

  /* ---------- Hero search with suggestions ---------- */
  const searchInput = $("#heroSearchInput");
  const drop = $("#searchDrop");
  let suggestions = [];
  let activeIdx = -1;
  function buildSuggestions(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    // on Hindi pages both the Hindi label and the English name match
    DEPARTMENTS.forEach((d) => { if (d.name.toLowerCase().includes(q) || (d.label && d.label.toLowerCase().includes(q))) out.push({ label: d.label || d.name, kind: tr("Speciality"), run: () => showDoctors({ dept: d.name }) }); });
    DOCTORS.forEach((d) => { if (d.name.toLowerCase().includes(q)) out.push({ label: d.name, kind: deptName(d.dept), run: () => startBooking({ doctor: d.name }) }); });
    SYMPTOMS.forEach((s) => { if (s.label.toLowerCase().includes(q)) out.push({ label: s.label, kind: "→ " + deptName(s.dept), run: () => showDoctors({ dept: s.dept }) }); });
    return out.slice(0, 7);
  }
  function setDrop(open) {
    drop.hidden = !open;
    searchInput.setAttribute("aria-expanded", String(open));
    if (!open) searchInput.removeAttribute("aria-activedescendant");
  }
  function renderDrop() {
    if (!suggestions.length) { setDrop(false); return; }
    setDrop(true);
    drop.innerHTML = suggestions.map((s, i) => `<button type="button" role="option" id="searchOpt-${i}" data-i="${i}" aria-selected="${i === activeIdx}" tabindex="-1" class="${i === activeIdx ? "is-active" : ""}"><span>${esc(s.label)}</span><small>${esc(s.kind)}</small></button>`).join("");
    if (activeIdx >= 0) searchInput.setAttribute("aria-activedescendant", `searchOpt-${activeIdx}`);
    else searchInput.removeAttribute("aria-activedescendant");
  }
  searchInput.addEventListener("input", () => { suggestions = buildSuggestions(searchInput.value); activeIdx = -1; renderDrop(); });
  searchInput.addEventListener("keydown", (e) => {
    if (drop.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); activeIdx = (activeIdx + 1) % suggestions.length; renderDrop(); }
    if (e.key === "ArrowUp") { e.preventDefault(); activeIdx = (activeIdx - 1 + suggestions.length) % suggestions.length; renderDrop(); }
    if (e.key === "Escape") setDrop(false);
  });
  drop.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    setDrop(false);
    suggestions[+b.dataset.i].run();
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#heroSearch") && !drop.hidden) setDrop(false); });
  $("#heroSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    setDrop(false);
    if (activeIdx >= 0 && suggestions[activeIdx]) { suggestions[activeIdx].run(); return; }
    const q = searchInput.value.trim();
    if (suggestions[0]) { suggestions[0].run(); return; }
    showDoctors({ q });
  });

  /* ---------- Specialities ---------- */
  $("#specList").innerHTML = DEPARTMENTS.map((d) => {
    const n = DOCTORS.filter((x) => x.dept === d.name).length;
    const thumb = d.still
      ? `<img class="spec__still" src="${d.still}-128.webp" width="64" height="64" alt="" loading="lazy" decoding="async">`
      : `<span class="spec__still spec__still--type${(d.stillText || "").length > 4 ? " is-long" : ""}" aria-hidden="true">${d.stillText || ""}</span>`;
    return `<li><button type="button" class="spec" data-find-dept="${d.name}">
      ${thumb}
      <span class="spec__text"><span class="spec__name">${d.label || d.name}</span><span class="spec__desc">${d.desc}</span></span>
      <span class="spec__count">${tr(n === 1 ? "{n} doctor" : "{n} doctors", { n })}</span>
      <span class="spec__go">${icon("i-arrow")}</span>
    </button>${d.slug ? `<a class="spec__page" href="specialities/${d.slug}">${tr("Overview")}<span class="sr-only">${tr(" of {name}", { name: d.label || d.name })}</span></a>` : ""}</li>`;
  }).join("");

  /* ---------- Doctors ---------- */
  const docGrid = $("#docGrid");
  const docSearch = $("#docSearch");
  const docToday = $("#docToday");
  const docVideo = $("#docVideo");
  const docMore = $("#docMore");
  let docDept = "";
  let showAll = false;
  const tabDepts = ["", ...DEPARTMENTS.map((d) => d.name)];
  $("#docTabs").innerHTML = tabDepts.map((d) => `<button role="tab" data-dept="${d}" aria-selected="${d === "" ? "true" : "false"}">${d ? deptName(d) : tr("All")}</button>`).join("");
  $("#docTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    docDept = b.dataset.dept;
    renderDoctors();
  });

  /** "Mon, Wed, Fri · 10 AM – 4 PM, 5 – 7 PM": lines break only between days, at the dot or between ranges. */
  function opdHtml(opd) {
    const [days, hours] = String(opd).split(" · ");
    if (!hours) return esc(opd);
    return `${esc(days)} · ${hours.split(", ").map((r) => `<span class="nowrap">${esc(r)}</span>`).join(", ")}`;
  }

  function docCard(d) {
    return `<article class="doc">
      <p class="doc__status${d.today ? " is-today" : ""}"><span class="doc__bar" aria-hidden="true"></span>${d.today ? tr("In today") : tr("Next: tomorrow")}${d.room ? `<span class="doc__room">${tr("Room {room}", { room: esc(d.room) })}</span>` : ""}</p>
      ${d.photo ? `<img class="doc__photo" src="${esc(d.photo)}" alt="${esc(d.photoAlt || d.name)}" width="800" height="1000" loading="lazy" decoding="async">` : ""}
      <div class="doc__id">
        ${d.photo ? "" : `<span class="avatar avatar--lg" aria-hidden="true">${initials(d.name)}</span>`}
        <div><h3>${d.slug ? `<a class="doc__link" href="doctors/${d.slug}">${d.name}</a>` : d.name}</h3><p class="doc__role">${d.role}</p>${d.role.toLowerCase().includes(deptName(d.dept).toLowerCase()) ? "" : `<p class="doc__dept">${deptName(d.dept)}</p>`}</div>
      </div>
      <p class="doc__deg">${d.deg}</p>
      <dl class="doc__facts">
        <div><dt>${tr("Speaks")}</dt><dd>${d.lang}</dd></div>
        ${d.opd ? `<div><dt>OPD</dt><dd class="num">${opdHtml(d.opd)}</dd></div>` : ""}
      </dl>
      <p class="doc__meta num"><span>${tr("<b>{n}</b> yrs", { n: d.exp })}</span> · <span>★ <b>${d.rating}</b> (${d.reviews.toLocaleString("en-IN")})</span></p>
      <div class="doc__foot">
        <span><span class="doc__fee num">${inr(d.fee)}</span>${d.video ? ` <span class="doc__video">${icon("i-video")} ${tr("Video")}</span>` : ""}</span>
        <button class="link-btn" data-book-doc="${esc(d.name)}">${tr("Book")} ${icon("i-arrow")}<span class="sr-only"> ${d.name}</span></button>
      </div>
    </article>`;
  }

  function renderDoctors() {
    $$("#docTabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.dept === docDept)));
    const q = docSearch.value.trim().toLowerCase();
    const list = DOCTORS.filter((d) =>
      (!q || (d.name + " " + d.dept + " " + deptName(d.dept) + " " + d.role).toLowerCase().includes(q)) &&
      (!docDept || d.dept === docDept) &&
      (!docToday.checked || d.today) &&
      (!docVideo.checked || d.video));
    const limit = showAll || docDept || q ? list.length : 8;
    docGrid.innerHTML = list.slice(0, limit).map(docCard).join("");
    $("#docEmpty").hidden = list.length > 0;
    docMore.hidden = list.length <= limit;
    docMore.textContent = tr("Show all {n} doctors", { n: list.length });
  }
  [docSearch, docToday, docVideo].forEach((el) => el.addEventListener("input", renderDoctors));
  docMore.addEventListener("click", () => { showAll = true; renderDoctors(); });
  $("#docReset").addEventListener("click", () => { docSearch.value = ""; docToday.checked = false; docVideo.checked = false; docDept = ""; renderDoctors(); });
  renderDoctors();

  function showDoctors({ q = "", dept = "" } = {}) {
    docSearch.value = q;
    docDept = dept;
    docToday.checked = false;
    docVideo.checked = false;
    renderDoctors();
    $("#doctors").scrollIntoView({ behavior: "smooth" });
    const tab = $(`#docTabs button[data-dept="${dept}"]`);
    if (tab) tab.scrollIntoView({ block: "nearest", inline: "center" });
  }

  /* ---------- Symptom finder ---------- */
  const chipsWrap = $("#symptomChips");
  chipsWrap.innerHTML = SYMPTOMS.map((s, i) => `<button type="button" class="chip" data-i="${i}" aria-pressed="false">${s.label}</button>`).join("");
  const picked = new Set();
  chipsWrap.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const i = +b.dataset.i;
    picked.has(i) ? picked.delete(i) : picked.add(i);
    b.setAttribute("aria-pressed", String(picked.has(i)));
    renderFinder();
  });
  function renderFinder() {
    const out = $("#symptomResult");
    if (!picked.size) {
      out.innerHTML = `<div class="fr-empty"><strong>${tr("Your suggestion appears here.")}</strong><span>${tr("For example, \"Knee or joint pain\" points you to Orthopedics and its consultants.")}</span></div>`;
      return;
    }
    const tally = {};
    let urgent = false;
    picked.forEach((i) => { const s = SYMPTOMS[i]; tally[s.dept] = (tally[s.dept] || 0) + 1; if (s.urgent) urgent = true; });
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const top = ranked[0][0];
    const also = ranked.slice(1, 3).map((r) => r[0]);
    const docs = DOCTORS.filter((d) => d.dept === top).sort((a, b) => b.today - a.today).slice(0, 2);
    const dep = DEPARTMENTS.find((x) => x.name === top);
    out.innerHTML = `
      ${urgent ? `<p class="fr-urgent">${icon("i-sos")}<span>${tr("One or more of these can be urgent. If it's sudden or severe, call <b class=\"mono\">1800-123-4567</b> now.")}</span></p>` : ""}
      <div class="fr-head">
        <div><small>${tr("Suggested speciality")}</small><h3>${deptName(top)}</h3>${also.length ? `<small>${tr("Also consider {list}", { list: also.map(deptName).join(", ") })}</small>` : ""}</div>
        ${dep && dep.still ? `<img class="fr-still" src="${dep.still}-320.webp" width="120" height="120" alt="" loading="lazy" decoding="async">` : ""}
        <button class="btn btn--accent btn--sm" data-book-dept="${top}">${tr("Book {dept}", { dept: deptName(top) })}</button>
      </div>
      <div class="fr-docs">${docs.map((d) => `
        <div class="fr-doc"><span class="avatar" data-tone="${tone(d.name)}">${initials(d.name)}</span>
          <div><strong>${d.name}</strong><small>${d.today ? tr("Available today") : tr("Next: tomorrow")} · ★ ${d.rating}</small></div>
          <button class="link-btn" data-book-doc="${esc(d.name)}">${tr("Book")} ${icon("i-arrow")}</button></div>`).join("")}
      </div>`;
  }
  renderFinder();

  /* ---------- Booking ---------- */
  const form = $("#bookingForm");
  const bDept = $("#bDept");
  const bDoctor = $("#bDoctor");
  const bError = $("#bError");
  const ticket = $("#ticket");
  // short day and month names in the page language (Hindi: the hi-IN forms, e.g. मंगल, अक्टू॰)
  const DAY = I18N["@days"] || ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = I18N["@months"] || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const booking = { date: null, slot: null };
  let step = 1;
  let lastBooking = null;

  bDept.insertAdjacentHTML("beforeend", DEPARTMENTS.map((d) => `<option value="${d.name}">${d.label || d.name}</option>`).join(""));

  const currentDoctor = () => DOCTORS.find((d) => d.name === bDoctor.value);
  const consultType = () => $("input[name=bType]:checked", form).value;
  const fmtDate = (d) => (LANG === "hi" ? `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}` : `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`);
  const dateKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  function fillDoctors(dept, selectName) {
    const list = DOCTORS.filter((d) => d.dept === dept);
    bDoctor.disabled = !dept;
    bDoctor.innerHTML = dept
      ? `<option value="">${tr("Select doctor")}</option>` + list.map((d) => `<option value="${esc(d.name)}">${d.name}${d.today ? tr(" · today") : ""}</option>`).join("")
      : `<option value="">${tr("Select a speciality first")}</option>`;
    if (selectName) bDoctor.value = selectName;
  }

  function setRow(id, val, set) {
    const el = $(id);
    el.textContent = val;
    el.classList.toggle("is-set", !!set);
  }
  function updateTicket() {
    const d = currentDoctor();
    setRow("#tDoc", d ? d.name : tr("Not chosen yet"), d);
    setRow("#tDept", d ? deptName(d.dept) : bDept.value ? deptName(bDept.value) : "—", d || bDept.value);
    setRow("#tDate", booking.date ? fmtDate(booking.date) : "—", booking.date);
    setRow("#tTime", booking.slot || "—", booking.slot);
    setRow("#tType", consultType() === "Video" ? tr("Video call") : tr("At the hospital"), true);
    setRow("#tFee", d ? inr(d.fee) : "—", d);
  }

  /** A video consult needs a doctor who offers video. Called wherever the doctor or the visit type is set,
      including in code (startBooking) where no change event fires. Returns true when it switched the type. */
  function enforceVideo() {
    const d = currentDoctor();
    if (d && !d.video && consultType() === "Video") {
      $("input[name=bType][value='In-clinic']", form).checked = true;
      toast(tr("{name} sees patients at the hospital only.", { name: d.name }));
      updateTicket();
      return true;
    }
    return false;
  }

  bDept.addEventListener("change", () => { fillDoctors(bDept.value); bDept.classList.remove("invalid"); booking.slot = null; updateTicket(); });
  bDoctor.addEventListener("change", () => {
    bDoctor.classList.remove("invalid");
    booking.slot = null;
    enforceVideo();
    updateTicket();
  });
  $$("input[name=bType]", form).forEach((r) => r.addEventListener("change", () => {
    enforceVideo();
    updateTicket();
  }));

  const dates = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  function renderDates() {
    $("#dateStrip").innerHTML = dates.map((d, i) => {
      const closed = isClosed(d);
      const label = i === 0 ? tr("Today") : DAY[d.getDay()];
      const active = booking.date && dateKey(booking.date) === dateKey(d);
      return `<button type="button" class="date${active ? " is-active" : ""}" data-i="${i}" aria-pressed="${active ? "true" : "false"}" ${closed ? `disabled title="${esc(tr("OPD is closed on this day"))}"` : ""}><small>${label}</small><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></button>`;
    }).join("");
  }
  $("#dateStrip").addEventListener("click", (e) => {
    const b = e.target.closest(".date");
    if (!b || b.disabled) return;
    booking.date = dates[+b.dataset.i];
    booking.slot = null;
    renderDates(); renderSlots(); updateTicket(); loadTaken();
    // the strip was re-rendered: put focus back on the tile that was picked
    $(`#dateStrip .date[data-i="${b.dataset.i}"]`)?.focus({ preventScroll: true });
  });

  const slotCache = {};
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  /** Fetches booked slots for the chosen doctor/date, then re-renders (CMS only). */
  function loadTaken() {
    if (!CMS || !booking.date || !bDoctor.value) return;
    const key = bDoctor.value + "|" + isoDate(booking.date);
    fetch(`${CMS.api}/slots?doctor=${encodeURIComponent(bDoctor.value)}&date=${isoDate(booking.date)}`).then((r) => r.json()).then((d) => {
      slotCache[key] = d.taken || [];
      if (booking.slot && slotCache[key].includes(booking.slot)) booking.slot = null;
      if (booking.date && key === bDoctor.value + "|" + isoDate(booking.date)) { renderSlots(); updateTicket(); }
    }).catch(() => {});
  }
  function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
  function renderSlots() {
    const wrap = $("#slots");
    const groups = { Morning: [], Afternoon: [], Evening: [] };
    const now = new Date();
    const isToday = dateKey(booking.date) === dateKey(now);
    const seed = hash((bDoctor.value || "x") + dateKey(booking.date));
    const cfg = CMS ? CMS.booking : null;
    const first = cfg ? toMin(cfg.slotStart, 540) : 540, last = cfg ? toMin(cfg.slotEnd, 1170) : 1170;
    const step = cfg ? Math.max(5, cfg.slotMinutes || 30) : 30;
    const brA = cfg ? toMin(cfg.breakStart, -1) : 780, brB = cfg ? toMin(cfg.breakEnd, -1) : 840;
    const takenSet = CMS ? (slotCache[(bDoctor.value || "") + "|" + isoDate(booking.date)] || []) : null;
    let i = 0;
    for (let m = first; m <= last; m += step) {
      if (brA >= 0 && m >= brA && m < brB) continue;
      const h = Math.floor(m / 60), mm = m % 60;
      const label = `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
      const past = isToday && m <= now.getHours() * 60 + now.getMinutes() + 30;
      const taken = takenSet ? takenSet.includes(label) : ((seed >> (i % 28)) & 1) === 1 && i % 3 !== 0;
      const g = h < 12 ? "Morning" : h < 16 ? "Afternoon" : "Evening";
      groups[g].push(`<button type="button" class="slot${booking.slot === label ? " is-active" : ""}" data-slot="${label}" aria-pressed="${booking.slot === label ? "true" : "false"}" ${past || taken ? "disabled" : ""}>${label}</button>`);
      i++;
    }
    wrap.innerHTML = Object.entries(groups).map(([g, s]) => `<div class="slot-group"><small>${tr(g)}</small><div>${s.join("")}</div></div>`).join("");
  }
  $("#slots").addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    booking.slot = b.dataset.slot;
    $$(".slot", $("#slots")).forEach((s) => { s.classList.toggle("is-active", s === b); s.setAttribute("aria-pressed", String(s === b)); });
    bError.textContent = "";
    updateTicket();
  });

  /** First control of the active step: the picked (or first open) date tile in step 2. */
  function stepFocus() {
    if (step === 1) return bDept;
    if (step === 2) return $("#dateStrip .date.is-active") || $("#dateStrip .date:not(:disabled)");
    return $("#bName");
  }
  function goStep(n, { focus = true } = {}) {
    step = n;
    $$(".bstep", form).forEach((f) => f.classList.toggle("is-active", +f.dataset.step === n));
    $$(".steps__item", form).forEach((s) => {
      const k = +s.dataset.step;
      s.classList.toggle("is-active", k === n);
      s.classList.toggle("is-done", k < n);
    });
    bError.textContent = "";
    if (n === 2) {
      if (!booking.date) booking.date = dates.find((d) => !isClosed(d));
      renderDates(); renderSlots(); updateTicket(); loadTaken();
    }
    // the old step's fieldset is now hidden, so focus would fall to <body>
    if (focus) stepFocus()?.focus({ preventScroll: true });
  }
  function markInvalid(el) { el.classList.add("invalid"); el.addEventListener("input", () => el.classList.remove("invalid"), { once: true }); }
  function validate(n) {
    if (n === 1) {
      enforceVideo();   // safety net: never carry Video forward with a doctor who has no video
      if (!bDept.value) { markInvalid(bDept); bError.textContent = tr("Choose a speciality to continue."); return false; }
      if (!bDoctor.value) { markInvalid(bDoctor); bError.textContent = tr("Choose a doctor to continue."); return false; }
    }
    if (n === 2 && (!booking.date || !booking.slot)) { bError.textContent = tr("Pick a date and one of the open time slots."); return false; }
    if (n === 3) {
      let ok = true;
      const name = $("#bName"), phone = $("#bPhone"), age = $("#bAge"), gender = $("#bGender");
      if (name.value.trim().length < 2) { markInvalid(name); ok = false; }
      if (!/^[6-9]\d{9}$/.test(phone.value.trim())) { markInvalid(phone); ok = false; }
      if (age.value === "" || +age.value < 0 || +age.value > 120) { markInvalid(age); ok = false; }
      if (!gender.value) { markInvalid(gender); ok = false; }
      if (!ok) { bError.textContent = tr("Check the highlighted fields. Mobile numbers have 10 digits and start with 6–9."); return false; }
      if (!consentOk(form)) { bError.textContent = CONSENT_MSG; $("#bConsent").focus(); return false; }
      return true;
    }
    return true;
  }
  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-next]")) {
      if (validate(step)) goStep(step + 1);
      else $(".bstep.is-active .invalid", form)?.focus();
    }
    if (e.target.closest("[data-prev]")) goStep(step - 1);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate(3)) { $(".bstep.is-active .invalid", form)?.focus(); return; }
    bError.textContent = "";   // a fix after a failed submit must not leave the old error under the confirmation
    const d = currentDoctor();
    const phone = $("#bPhone").value.trim();
    if (CMS) {
      const submitBtn = $('button[type="submit"]', form);
      submitBtn.disabled = true;
      cmsPost("appointment", {
        doctor: d.name, date: isoDate(booking.date), slot: booking.slot, type: consultType(),
        patient: { name: $("#bName").value.trim(), phone, age: $("#bAge").value, gender: $("#bGender").value },
        reason: ($("#bNote") || {}).value || "", consent: true
      }).then((r) => confirmBooking(d, r.token, phone, r)).catch((err) => {
        bError.textContent = err.message;
        if (err.status === 409 || /just booked/.test(err.message)) { delete slotCache[d.name + "|" + isoDate(booking.date)]; booking.slot = null; goStep(2); loadTaken(); }
      }).finally(() => { submitBtn.disabled = false; });
      return;
    }
    confirmBooking(d, d.dept.slice(0, 2).toUpperCase() + "-" + rand(100, 999), phone);
  });

  function confirmBooking(d, token, phone, server) {
    lastBooking = { doctor: d, date: booking.date, slot: booking.slot, token };
    try {
      const all = JSON.parse(storage.get("cn-appointments") || "[]");
      all.push({ doctor: d.name, date: booking.date.toISOString(), slot: booking.slot, token });
      storage.set("cn-appointments", JSON.stringify(all));
    } catch { /* ignore */ }
    $$(".bstep", form).forEach((f) => f.classList.remove("is-active"));
    $$(".steps__item", form).forEach((s) => { s.classList.remove("is-active"); s.classList.add("is-done"); });
    // only promise messages the hospital will actually send (notifications on, on the CMS server)
    const notify = $("#doneNotify"), manage = $("#doneManage");
    const n = (server && server.notify !== undefined) ? { on: server.notify, channel: server.channel, reminderHours: server.reminderHours } : privacyCfg && privacyCfg.notify;
    if (notify) {
      notify.hidden = !(server && n && n.on);
      if (!notify.hidden) notify.textContent = tr(n.channel === "whatsapp" ? "We'll send the details on WhatsApp to {phone}, and a reminder about {hours} hours before your visit." : "We'll send the details by SMS to {phone}, and a reminder about {hours} hours before your visit.", { phone: "******" + phone.slice(-4), hours: n.reminderHours || 24 });
    }
    if (manage) {
      manage.hidden = !(server && server.manage);
      // relative link: from /hi/ it opens the Hindi manage page
      if (!manage.hidden) manage.innerHTML = tr('Need to change it? <a href="{href}">Manage this booking</a> with your token and mobile number.', { href: esc(server.manage.replace(/^\//, "")) });
    }
    $("#bookingDone").hidden = false;
    $("#tToken").textContent = token;
    ticket.classList.add("is-confirmed");
    // the confirmation replaces the form: take focus there, so it is announced and Tab continues from it
    $("#doneTitle").focus({ preventScroll: true });
  }

  $("#bookAgain").addEventListener("click", () => {
    form.reset();
    fillDoctors("");
    booking.date = null; booking.slot = null;
    $("#bookingDone").hidden = true;
    $("#tToken").textContent = "— — —";
    ticket.classList.remove("is-confirmed");
    goStep(1);
    updateTicket();
  });

  $("#addToCal").addEventListener("click", () => {
    if (!lastBooking) return;
    const [time, ap] = lastBooking.slot.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const start = new Date(lastBooking.date); start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    const f = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CareNova Hospitals//EN", "BEGIN:VEVENT",
      `UID:${lastBooking.token}@carenovahospitals.com`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
      `SUMMARY:${tr("{doctor} (token {token})", { doctor: lastBooking.doctor.name, token: lastBooking.token })}`, "LOCATION:CareNova Hospitals\\, Sector 44\\, Gurugram",
      `DESCRIPTION:${tr("Arrive 15 minutes early with a photo ID and previous reports.")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `CareNova-${lastBooking.token}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  function startBooking({ dept, doctor, video } = {}) {
    closeAllModals();
    if (!$("#bookingDone").hidden) $("#bookAgain").click();
    goStep(1, { focus: false });
    if (doctor) {
      const d = DOCTORS.find((x) => x.name === doctor);
      if (d) { bDept.value = d.dept; fillDoctors(d.dept, d.name); }
    } else if (dept) {
      bDept.value = dept;
      fillDoctors(dept);
    }
    if (video) {
      $("input[name=bType][value='Video']", form).checked = true;
      // asked for a video consult, but a doctor chosen earlier sees patients at the hospital only:
      // keep the video consult and let the patient choose a doctor who offers it
      const d = currentDoctor();
      if (d && !d.video && !doctor) {
        bDoctor.value = "";
        toast(tr("{name} sees patients at the hospital only. Choose a doctor who offers video.", { name: d.name }));
      }
    }
    enforceVideo();   // a doctor without video (from a Book button or the search) turns Video back to At the hospital
    booking.slot = null;
    updateTicket();
    $("#book").scrollIntoView({ behavior: "smooth" });
    const box = $("#booking");
    box.classList.remove("flash-ring"); void box.offsetWidth; box.classList.add("flash-ring");
    // keyboard and screen-reader users continue in the form, not back where they pressed Book
    (bDoctor.value ? bDoctor : bDept).focus({ preventScroll: true });
  }
  updateTicket();

  /* "Book appointment" on a doctor or speciality page links to /#book?doctor=<name> (or ?dept=, ?video=1) */
  function bookFromHash() {
    const m = /^#book\?(.+)$/.exec(location.hash);
    if (!m) return;
    const p = new URLSearchParams(m[1]);
    const doctor = p.get("doctor"), dept = p.get("dept");
    startBooking({
      doctor: doctor && DOCTORS.some((d) => d.name === doctor) ? doctor : undefined,
      dept: dept && DEPARTMENTS.some((d) => d.name === dept) ? dept : undefined,
      video: p.get("video") === "1"
    });
  }
  window.addEventListener("hashchange", bookFromHash);
  bookFromHash();

  /* ---------- Packages ---------- */
  const ORGAN = { heart: "Heart", lungs: "Lungs", liver: "Liver", kidney: "Kidneys", brain: "Brain", eye: "Eyes", spine: "Bones", uterus: "Uterus" };
  function renderPackages(filter = "all") {
    $("#pkgGrid").innerHTML = PACKAGES.filter((p) => p.tag.includes(filter)).map((p) => `
      <article class="pkg${p.popular ? " pkg--featured" : ""}">
        <div class="pkg__head"><div><h3>${p.label || p.name}</h3><small>${tr("{n} tests", { n: p.tests })}</small></div>${p.popular ? `<span class="pkg__flag">${tr("Most chosen")}</span>` : ""}</div>
        ${p.covers ? `<ul class="pkg__covers" aria-label="${esc(tr("Looks at"))}">${p.covers.map((o) => `<li><img src="assets/img/specimens/${o}-64.webp" width="36" height="36" alt="" loading="lazy" decoding="async"><span>${tr(ORGAN[o])}</span></li>`).join("")}</ul>` : ""}
        <div class="pkg__price"><b>${inr(p.price)}</b><s>${inr(p.mrp)}</s><span>${tr("save {n}%", { n: Math.round((1 - p.price / p.mrp) * 100) })}</span></div>
        <ul>${p.items.map((it) => `<li>${icon("i-check")}${it}</li>`).join("")}</ul>
        <button class="btn btn--line btn--block" data-pkg="${esc(p.name)}" data-pkg-label="${esc(p.label || p.name)}">${tr("Book this check-up")}</button>
      </article>`).join("");
  }
  $("#pkgTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $$("#pkgTabs button").forEach((x) => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-selected", String(x === b)); });
    renderPackages(b.dataset.filter);
  });
  renderPackages();

  /* ---------- Tools ---------- */
  function bmi() {
    const h = parseFloat($("#bmiH").value), w = parseFloat($("#bmiW").value);
    const out = $("#bmiOut"), pin = $("#bmiPin");
    if (!(h > 50 && w > 10)) { out.textContent = tr("Enter your height and weight."); return; }
    const v = w / Math.pow(h / 100, 2);
    const [cat, tip] = v < 18.5 ? ["in the underweight range", "A nutrition consult can help."] : v < 25 ? ["in the healthy range", "Keep it up."] : v < 30 ? ["in the overweight range", "Small daily changes add up."] : ["in the obese range", "We'd suggest a doctor's review."];
    pin.style.left = Math.max(2, Math.min(98, ((v - 12) / (40 - 12)) * 100)) + "%";
    out.innerHTML = `<b>${v.toFixed(1)}</b>${tr("Your BMI is {range}.", { range: tr(cat) })} ${tr(tip)}`;
  }
  ["#bmiH", "#bmiW"].forEach((s) => $(s).addEventListener("input", bmi));
  bmi();

  function water() {
    const w = parseFloat($("#waterW").value), a = parseFloat($("#waterA").value);
    const out = $("#waterOut"), g = $("#waterGlasses");
    if (!(w > 10)) { out.textContent = tr("Enter your weight."); g.innerHTML = ""; return; }
    const litres = w * 0.033 + a;
    const glasses = Math.round((litres * 1000) / 250);
    g.innerHTML = Array.from({ length: Math.min(glasses, 20) }, () => `<span class="glass"></span>`).join("");
    out.innerHTML = `<b>${tr("{n} L", { n: litres.toFixed(1) })}</b>${tr("About {n} glasses of water a day.", { n: glasses })}`;
  }
  ["#waterW", "#waterA"].forEach((s) => $(s).addEventListener("input", water));
  water();

  const lmp = $("#lmp");
  lmp.max = new Date().toISOString().split("T")[0];
  const sample = new Date(); sample.setDate(sample.getDate() - 70);
  lmp.value = sample.toISOString().split("T")[0];
  function due() {
    const out = $("#dueOut");
    if (!lmp.value) { out.textContent = tr("Pick a date to estimate your due date."); return; }
    const start = new Date(lmp.value + "T00:00:00");
    const d = new Date(start); d.setDate(d.getDate() + 280);
    const weeks = Math.floor((Date.now() - start) / (7 * 864e5));
    if (weeks < 0 || weeks > 42) { out.textContent = tr("Choose a date within the last 42 weeks."); return; }
    out.innerHTML = `<b>${d.getDate()} ${(I18N["@monthsLong"] || MON)[d.getMonth()]} ${d.getFullYear()}</b>${tr("Your estimated due date. You're about {weeks} weeks along, in trimester {n}.", { weeks, n: weeks < 13 ? 1 : weeks < 27 ? 2 : 3, nth: tr(weeks < 13 ? "first" : weeks < 27 ? "second" : "third") })}`;
  }
  lmp.addEventListener("input", due);
  due();

  /* ---------- Stories ---------- */
  const quote = $("#quote");
  const bar = $("#quoteBar");
  const storyList = $("#storyList");
  let qIdx = 0;
  let qTimer;
  storyList.innerHTML = TESTIMONIALS.map((t, i) => `<li><button type="button" data-i="${i}"><span><strong>${t.name}</strong><small>${t.meta}</small></span>${icon("i-arrow")}</button></li>`).join("");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pauseBtn = $("#quotePause");
  const storiesEl = $("#stories");
  let qPaused = reduceMotion, qHold = false;
  pauseBtn.textContent = qPaused ? tr("Play stories") : tr("Pause stories");
  function schedule() {
    clearTimeout(qTimer);
    bar.classList.remove("run");
    if (qPaused || qHold) return;
    const words = TESTIMONIALS[qIdx].text.split(/\s+/).length;
    const ms = Math.max(9000, Math.round((words / 3.3) * 1000));
    bar.style.setProperty("--dur", ms + "ms");
    void bar.offsetWidth; bar.classList.add("run");
    qTimer = setTimeout(() => showQuote(qIdx + 1), ms);
  }
  function showQuote(i) {
    qIdx = (i + TESTIMONIALS.length) % TESTIMONIALS.length;
    const t = TESTIMONIALS[qIdx];
    quote.innerHTML = `<p>“${t.text}”</p><footer><span>${t.name}<small>${t.meta}</small></span></footer>`;
    $$("button", storyList).forEach((b) => b.setAttribute("aria-current", String(+b.dataset.i === qIdx)));
    schedule();
  }
  pauseBtn.addEventListener("click", () => { qPaused = !qPaused; pauseBtn.textContent = qPaused ? tr("Play stories") : tr("Pause stories"); schedule(); });
  storiesEl.addEventListener("mouseenter", () => { qHold = true; schedule(); });
  storiesEl.addEventListener("mouseleave", () => { qHold = false; schedule(); });
  storiesEl.addEventListener("focusin", () => { qHold = true; schedule(); });
  storiesEl.addEventListener("focusout", (e) => { if (!storiesEl.contains(e.relatedTarget)) { qHold = false; schedule(); } });
  storyList.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showQuote(+b.dataset.i); });
  showQuote(0);

  /* ---------- FAQ (side panel on desktop, inline on phones) ---------- */
  const faqWrap = $("#faqList");
  faqWrap.innerHTML = `<div class="faq__qs" role="tablist">${FAQS.map((f, i) => `
      <div class="faq__item"><button type="button" class="faq__q" role="tab" data-i="${i}" aria-selected="false">${f.q}${icon("i-arrow")}</button>
      <p class="faq__inline" hidden>${f.a}</p></div>`).join("")}</div>
    <div class="faq__a" id="faqAnswer" role="tabpanel" aria-live="polite"></div>`;
  function showFaq(i) {
    $$(".faq__q", faqWrap).forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.i === i)));
    $$(".faq__item", faqWrap).forEach((it, k) => { it.classList.toggle("is-open", k === i); $(".faq__inline", it).hidden = k !== i; });
    $("#faqAnswer").innerHTML = `<h3>${FAQS[i].q}</h3><p>${FAQS[i].a}</p><button class="link-btn" data-open-chat>${tr("Ask something else")} ${icon("i-arrow")}</button>`;
  }
  faqWrap.addEventListener("click", (e) => { const b = e.target.closest(".faq__q"); if (b) showFaq(+b.dataset.i); });
  showFaq(0);

  /* ---------- Modals ---------- */
  let lastFocus = null;
  // everything outside an open modal: inert, so neither Tab nor a screen reader reaches the page behind
  const behind = () => $$("body > header, body > main, body > footer, body > .float-sos, body > .float-chat, body > #chat, body > .skip-link");
  const shown = (el) => !!el && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    if (!m.classList.contains("open")) lastFocus = document.activeElement;
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    behind().forEach((el) => { el.inert = true; });
    // .modal.open is visible at once (CSS); still, retry shortly if the first focus() did not take
    const close = $(".modal__close", m);
    const from = document.activeElement;
    let tries = 0;
    const focusClose = () => {
      const a = document.activeElement;
      // stop once focus is in the modal, or the user has moved it somewhere else meanwhile
      if (!m.classList.contains("open") || m.contains(a) || (a !== from && a !== document.body)) return;
      close?.focus();
      if (document.activeElement !== close && ++tries < 10) setTimeout(focusClose, 40);
    };
    focusClose();
  }
  function closeModal(m) {
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    if (!$(".modal.open")) {
      document.body.classList.remove("no-scroll");
      behind().forEach((el) => { el.inert = false; });
    }
    // back to the opener; if it is gone or hidden (a link in the closed chat), to the chat button
    (shown(lastFocus) ? lastFocus : chatBtn).focus?.();
  }
  // Tab and Shift+Tab wrap inside the open modal (a fallback where inert is not supported)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const m = $(".modal.open");
    if (!m) return;
    const items = $$("a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])", m).filter(shown);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !m.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !m.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });
  function closeAllModals() { $$(".modal.open").forEach(closeModal); }
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(m); }));

  $("#shareLoc").addEventListener("click", () => {
    const msg = $("#locMsg");
    if (!navigator.geolocation) { msg.className = "form-msg err"; msg.textContent = tr("This device can't share location. Please call us."); return; }
    msg.className = "form-msg"; msg.textContent = tr("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => { msg.className = "form-msg ok"; msg.textContent = tr("Location shared ({lat}, {lng}). Our ER team will call you back.", { lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) }); },
      () => { msg.className = "form-msg err"; msg.textContent = tr("We couldn't get your location. Please call 1800-123-4567."); },
      { timeout: 8000 });
  });

  $("#reportForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#reportMsg"), uhid = $("#rUhid"), ph = $("#rPhone");
    if (uhid.value.trim().length < 5 || !/^[6-9]\d{9}$/.test(ph.value.trim())) {
      msg.className = "form-msg err"; msg.textContent = tr("Enter your UHID and a 10-digit mobile number."); return;
    }
    if (!consentOk(e.target)) { msg.className = "form-msg err"; msg.textContent = CONSENT_MSG; return; }
    if (CMS) {
      msg.className = "form-msg"; msg.textContent = tr("Sending…");
      cmsPost("report", { uhid: uhid.value.trim(), phone: ph.value.trim(), consent: true })
        .then(() => { msg.className = "form-msg ok"; msg.textContent = tr("Request received. We'll send your reports to {phone}.", { phone: "******" + ph.value.trim().slice(-4) }); })
        .catch((err) => { msg.className = "form-msg err"; msg.textContent = err.message; });
      return;
    }
    msg.className = "form-msg ok";
    msg.textContent = tr("OTP sent to {phone}.", { phone: "******" + ph.value.trim().slice(-4) });
  });

  /* ---------- Health check-up request (CMS) ---------- */
  let pkgChosen = "";
  function openPkgRequest(pkg, label) {
    pkgChosen = pkg;   // the request carries the English name; the dialog shows the page-language label
    const nameEl = $("#pkgName"); if (nameEl) nameEl.textContent = label || pkg;
    $("#pkgMsg").textContent = "";
    openModal("pkgModal");
  }
  $("#pkgForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#pkgMsg"), nm = $("#pkName"), ph = $("#pkPhone");
    let ok = true;
    if (nm.value.trim().length < 2) { markInvalid(nm); ok = false; }
    if (!/^[6-9]\d{9}$/.test(ph.value.trim())) { markInvalid(ph); ok = false; }
    if (!ok) { msg.className = "form-msg err"; msg.textContent = tr("Enter your name and a 10-digit mobile number."); return; }
    if (!consentOk(e.target)) { msg.className = "form-msg err"; msg.textContent = CONSENT_MSG; return; }
    msg.className = "form-msg"; msg.textContent = tr("Sending…");
    cmsPost("package", { package: pkgChosen, name: nm.value.trim(), phone: ph.value.trim(), consent: true })
      .then(() => { msg.className = "form-msg ok"; msg.textContent = tr("Request received. We'll call you to schedule it."); e.target.reset(); })
      .catch((err) => { msg.className = "form-msg err"; msg.textContent = err.message; });
  });

  /* ---------- Contact & newsletter ---------- */
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target, msg = $("#contactMsg");
    let ok = true;
    $$("input:not([type=checkbox]), textarea", f).forEach((el) => {
      const valid = el.name === "phone" ? /^[6-9]\d{9}$/.test(el.value.trim()) : el.checkValidity() && el.value.trim() !== "";
      if (!valid) { markInvalid(el); ok = false; }
    });
    if (!ok) { msg.className = "form-msg err"; msg.textContent = tr("Fill in the highlighted fields."); return; }
    if (!consentOk(f)) { msg.className = "form-msg err"; msg.textContent = CONSENT_MSG; return; }
    if (CMS) {
      const fd = Object.fromEntries(new FormData(f).entries());
      msg.className = "form-msg"; msg.textContent = tr("Sending…");
      cmsPost("message", { name: fd.name, phone: fd.phone, email: fd.email, message: fd.message, consent: true })
        .then(() => { msg.className = "form-msg ok"; msg.textContent = tr("Message sent. We'll reply within 2 hours."); f.reset(); })
        .catch((err) => { msg.className = "form-msg err"; msg.textContent = err.message; });
      return;
    }
    msg.className = "form-msg ok";
    msg.textContent = tr("Message sent. We'll reply within 2 hours.");
    f.reset();
  });
  $("#newsletter").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("input", e.target);
    if (!inp.checkValidity()) { toast(tr("Enter a valid email address.")); return; }
    if (CMS) {
      cmsPost("subscribe", { email: inp.value.trim(), consent: true }).then(() => { inp.value = ""; toast(tr("Subscribed. The next issue arrives on the 1st.")); }).catch((err) => toast(err.message));
      return;
    }
    inp.value = "";
    toast(tr("Subscribed. The next issue arrives on the 1st."));
  });

  /* ---------- Assistant ---------- */
  const chat = $("#chat");
  const chatBody = $("#chatBody");
  const chatBtn = $("#chatToggle");
  let chatStarted = false;
  function addMsg(html, who = "bot") {
    const m = document.createElement("div");
    m.className = "msg msg--" + who;
    m.innerHTML = html;
    chatBody.appendChild(m);
    chatBody.scrollTop = chatBody.scrollHeight;
    return m;
  }
  function botReply(text) {
    const t = addMsg("<i></i><i></i><i></i>");
    t.classList.add("msg--typing");
    const q = text.toLowerCase();
    const rule = CHAT_RULES.find((r) => r.k.some((k) => q.includes(k)));
    setTimeout(() => {
      t.classList.remove("msg--typing");
      t.innerHTML = rule ? rule.a : tr("I don't have an answer for that yet. Call our helpdesk on <b>+91 98765 43210</b>, or tap one of the options below.");
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 600 + Math.random() * 400);
  }
  function toggleChat(open) {
    const had = !open && chat.contains(document.activeElement);
    chat.classList.toggle("open", open);
    chat.setAttribute("aria-hidden", String(!open));
    chatBtn.setAttribute("aria-expanded", String(open));
    if (open && !chatStarted) { chatStarted = true; addMsg(tr("Namaste. I'm Nova, CareNova's assistant. What can I help you with?")); }
    if (open) {
      // .chat.open is visible at once (CSS); retry shortly if the first focus() did not take,
      // but never pull focus out of a modal opened in the meantime
      const inp = $("#chatInput");
      const from = document.activeElement;
      let tries = 0;
      const focusInput = () => {
        const a = document.activeElement;
        if (!chat.classList.contains("open") || $(".modal.open") || chat.contains(a) || (a !== from && a !== document.body)) return;
        inp.focus();
        if (document.activeElement !== inp && ++tries < 10) setTimeout(focusInput, 40);
      };
      focusInput();
    }
    if (had) chatBtn.focus();   // closing with focus inside: back to the chat button, not <body>
  }
  chatBtn.addEventListener("click", () => toggleChat(!chat.classList.contains("open")));
  $("#chatQuick").innerHTML = ["Book appointment", "Emergency", "Health packages", "Insurance", "OPD timings", "WhatsApp"].map((q) => `<button type="button">${tr(q)}</button>`).join("");
  $("#chatQuick").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; addMsg(esc(b.textContent), "user"); botReply(b.textContent); });
  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#chatInput"), v = inp.value.trim();
    if (!v) return;
    addMsg(esc(v), "user");
    inp.value = "";
    botReply(v);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    // one Escape closes everything; focus goes back to the opener, or to the chat or menu button
    closeAllModals();
    if (chat.classList.contains("open")) toggleChat(false);
    if (!menu.hidden) {
      const inMenu = menu.contains(document.activeElement);
      setMenu(false);
      if (inMenu) burger.focus();
    }
  });

  /* ---------- Delegated actions ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open], [data-open-chat], [data-book-dept], [data-book-doc], [data-find-dept], [data-pkg], [data-video-book]");
    if (!t) return;
    if (t.dataset.open) { e.preventDefault(); openModal(t.dataset.open); return; }
    if (t.hasAttribute("data-open-chat")) { toggleChat(true); return; }
    if (t.dataset.bookDoc) { e.preventDefault(); startBooking({ doctor: t.dataset.bookDoc }); return; }
    if (t.dataset.bookDept) { e.preventDefault(); startBooking({ dept: t.dataset.bookDept }); return; }
    if (t.dataset.findDept) { e.preventDefault(); showDoctors({ dept: t.dataset.findDept }); return; }
    if (t.dataset.pkg) {
      if (CMS) { const pkg = t.dataset.pkg; openPkgRequest(pkg, t.dataset.pkgLabel); return; }
      toast(tr("Request received for {pkg}. We'll call you to schedule it.", { pkg: t.dataset.pkgLabel || t.dataset.pkg })); return;
    }
    if (t.hasAttribute("data-video-book")) { e.preventDefault(); startBooking({ video: true }); if (window.innerWidth <= 600) toggleChat(false); }
  });

  $("#year").textContent = new Date().getFullYear();
})();
