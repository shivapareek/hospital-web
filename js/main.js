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
    toast(`Text size ${Math.round(sizes[fs] * 100)}%`);
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
  navLinks.forEach((l) => { const s = $(l.getAttribute("href")); if (s) navObserver.observe(s); });

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

  /* ---------- Live status (demo feed) ---------- */
  const live = { er: 8, beds: 42, icu: 7, token: 114 };
  let lastUpdate = Date.now();
  function setLive(sel, val) {
    const el = $(sel);
    if (el.textContent === String(val)) return;
    el.textContent = val;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 900);
  }
  setInterval(() => {
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
    $("#liveUpdated").textContent = s < 3 ? "just now" : s + " s ago";
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
    DEPARTMENTS.forEach((d) => { if (d.name.toLowerCase().includes(q)) out.push({ label: d.name, kind: "Speciality", run: () => showDoctors({ dept: d.name }) }); });
    DOCTORS.forEach((d) => { if (d.name.toLowerCase().includes(q)) out.push({ label: d.name, kind: d.dept, run: () => startBooking({ doctor: d.name }) }); });
    SYMPTOMS.forEach((s) => { if (s.label.toLowerCase().includes(q)) out.push({ label: s.label, kind: "→ " + s.dept, run: () => showDoctors({ dept: s.dept }) }); });
    return out.slice(0, 7);
  }
  function renderDrop() {
    if (!suggestions.length) { drop.hidden = true; return; }
    drop.hidden = false;
    drop.innerHTML = suggestions.map((s, i) => `<button type="button" role="option" data-i="${i}" class="${i === activeIdx ? "is-active" : ""}"><span>${esc(s.label)}</span><small>${esc(s.kind)}</small></button>`).join("");
  }
  searchInput.addEventListener("input", () => { suggestions = buildSuggestions(searchInput.value); activeIdx = -1; renderDrop(); });
  searchInput.addEventListener("keydown", (e) => {
    if (drop.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); activeIdx = (activeIdx + 1) % suggestions.length; renderDrop(); }
    if (e.key === "ArrowUp") { e.preventDefault(); activeIdx = (activeIdx - 1 + suggestions.length) % suggestions.length; renderDrop(); }
    if (e.key === "Escape") drop.hidden = true;
  });
  drop.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    suggestions[+b.dataset.i].run();
    drop.hidden = true;
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#heroSearch")) drop.hidden = true; });
  $("#heroSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    drop.hidden = true;
    if (activeIdx >= 0 && suggestions[activeIdx]) { suggestions[activeIdx].run(); return; }
    const q = searchInput.value.trim();
    if (suggestions[0]) { suggestions[0].run(); return; }
    showDoctors({ q });
  });

  /* ---------- Specialities ---------- */
  $("#specList").innerHTML = DEPARTMENTS.map((d) => {
    const n = DOCTORS.filter((x) => x.dept === d.name).length;
    return `<li><button type="button" class="spec" data-find-dept="${d.name}">
      <span class="spec__icon">${icon(d.icon)}</span>
      <span><span class="spec__name">${d.name}</span><span class="spec__desc">${d.desc}</span></span>
      <span class="spec__count">${n} ${n === 1 ? "doctor" : "doctors"}</span>
      <span class="spec__go">${icon("i-arrow")}</span>
    </button></li>`;
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
  $("#docTabs").innerHTML = tabDepts.map((d) => `<button role="tab" data-dept="${d}" aria-selected="${d === "" ? "true" : "false"}">${d || "All"}</button>`).join("");
  $("#docTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    docDept = b.dataset.dept;
    renderDoctors();
  });

  function docCard(d) {
    return `<article class="doc">
      <div class="doc__top">
        <span class="avatar" data-tone="${tone(d.name)}">${initials(d.name)}</span>
        <span class="doc__avail${d.today ? " is-today" : ""}">${d.today ? "Available today" : "Next: tomorrow"}</span>
      </div>
      <div>
        <h3>${d.name}</h3>
        <p class="doc__role">${d.role} · ${d.dept}</p>
        <p class="doc__deg">${d.deg}</p>
      </div>
      <div class="doc__meta mono"><span><b>${d.exp}</b> yrs</span><span>★ <b>${d.rating}</b> (${d.reviews.toLocaleString("en-IN")})</span></div>
      <div class="doc__foot">
        <span><span class="doc__fee mono">${inr(d.fee)}</span> ${d.video ? `<span class="doc__video">${icon("i-video")} Video</span>` : ""}</span>
        <button class="link-btn" data-book-doc="${esc(d.name)}">Book ${icon("i-arrow")}</button>
      </div>
    </article>`;
  }

  function renderDoctors() {
    $$("#docTabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.dept === docDept)));
    const q = docSearch.value.trim().toLowerCase();
    const list = DOCTORS.filter((d) =>
      (!q || (d.name + " " + d.dept + " " + d.role).toLowerCase().includes(q)) &&
      (!docDept || d.dept === docDept) &&
      (!docToday.checked || d.today) &&
      (!docVideo.checked || d.video));
    const limit = showAll || docDept || q ? list.length : 8;
    docGrid.innerHTML = list.slice(0, limit).map(docCard).join("");
    $("#docEmpty").hidden = list.length > 0;
    docMore.hidden = list.length <= limit;
    docMore.textContent = `Show all ${list.length} doctors`;
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
      out.innerHTML = `<div class="fr-empty"><strong>Your suggestion appears here.</strong><span>For example, "Knee or joint pain" points you to Orthopedics and its consultants.</span></div>`;
      return;
    }
    const tally = {};
    let urgent = false;
    picked.forEach((i) => { const s = SYMPTOMS[i]; tally[s.dept] = (tally[s.dept] || 0) + 1; if (s.urgent) urgent = true; });
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const top = ranked[0][0];
    const also = ranked.slice(1, 3).map((r) => r[0]);
    const docs = DOCTORS.filter((d) => d.dept === top).sort((a, b) => b.today - a.today).slice(0, 2);
    out.innerHTML = `
      ${urgent ? `<p class="fr-urgent">${icon("i-sos")}<span>One or more of these can be urgent. If it's sudden or severe, call <b class="mono">1800-123-4567</b> now.</span></p>` : ""}
      <div class="fr-head">
        <div><small>Suggested speciality</small><h3>${top}</h3>${also.length ? `<small>Also consider ${also.join(", ")}</small>` : ""}</div>
        <button class="btn btn--accent btn--sm" data-book-dept="${top}">Book ${top}</button>
      </div>
      <div class="fr-docs">${docs.map((d) => `
        <div class="fr-doc"><span class="avatar" data-tone="${tone(d.name)}">${initials(d.name)}</span>
          <div><strong>${d.name}</strong><small>${d.today ? "Available today" : "Next: tomorrow"} · ★ ${d.rating}</small></div>
          <button class="link-btn" data-book-doc="${esc(d.name)}">Book ${icon("i-arrow")}</button></div>`).join("")}
      </div>`;
  }
  renderFinder();

  /* ---------- Booking ---------- */
  const form = $("#bookingForm");
  const bDept = $("#bDept");
  const bDoctor = $("#bDoctor");
  const bError = $("#bError");
  const ticket = $("#ticket");
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const booking = { date: null, slot: null };
  let step = 1;
  let lastBooking = null;

  bDept.insertAdjacentHTML("beforeend", DEPARTMENTS.map((d) => `<option value="${d.name}">${d.name}</option>`).join(""));

  const currentDoctor = () => DOCTORS.find((d) => d.name === bDoctor.value);
  const consultType = () => $("input[name=bType]:checked", form).value;
  const fmtDate = (d) => `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  const dateKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  function fillDoctors(dept, selectName) {
    const list = DOCTORS.filter((d) => d.dept === dept);
    bDoctor.disabled = !dept;
    bDoctor.innerHTML = dept
      ? `<option value="">Select doctor</option>` + list.map((d) => `<option value="${esc(d.name)}">${d.name}${d.today ? " · today" : ""}</option>`).join("")
      : `<option value="">Select a speciality first</option>`;
    if (selectName) bDoctor.value = selectName;
  }

  function setRow(id, val, set) {
    const el = $(id);
    el.textContent = val;
    el.classList.toggle("is-set", !!set);
  }
  function updateTicket() {
    const d = currentDoctor();
    setRow("#tDoc", d ? d.name : "Not chosen yet", d);
    setRow("#tDept", d ? d.dept : bDept.value || "—", d || bDept.value);
    setRow("#tDate", booking.date ? fmtDate(booking.date) : "—", booking.date);
    setRow("#tTime", booking.slot || "—", booking.slot);
    setRow("#tType", consultType() === "Video" ? "Video call" : "At the hospital", true);
    setRow("#tFee", d ? inr(d.fee) : "—", d);
  }

  bDept.addEventListener("change", () => { fillDoctors(bDept.value); bDept.classList.remove("invalid"); booking.slot = null; updateTicket(); });
  bDoctor.addEventListener("change", () => {
    bDoctor.classList.remove("invalid");
    booking.slot = null;
    const d = currentDoctor();
    if (d && !d.video && consultType() === "Video") {
      $("input[name=bType][value='In-clinic']", form).checked = true;
      toast(`${d.name} sees patients at the hospital only.`);
    }
    updateTicket();
  });
  $$("input[name=bType]", form).forEach((r) => r.addEventListener("change", () => {
    const d = currentDoctor();
    if (d && !d.video && consultType() === "Video") {
      $("input[name=bType][value='In-clinic']", form).checked = true;
      toast(`${d.name} sees patients at the hospital only.`);
    }
    updateTicket();
  }));

  const dates = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  function renderDates() {
    $("#dateStrip").innerHTML = dates.map((d, i) => {
      const closed = d.getDay() === 0;
      const label = i === 0 ? "Today" : DAY[d.getDay()];
      const active = booking.date && dateKey(booking.date) === dateKey(d);
      return `<button type="button" class="date${active ? " is-active" : ""}" data-i="${i}" ${closed ? "disabled title=\"OPD is closed on Sundays\"" : ""}><small>${label}</small><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></button>`;
    }).join("");
  }
  $("#dateStrip").addEventListener("click", (e) => {
    const b = e.target.closest(".date");
    if (!b || b.disabled) return;
    booking.date = dates[+b.dataset.i];
    booking.slot = null;
    renderDates(); renderSlots(); updateTicket();
  });

  function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
  function renderSlots() {
    const wrap = $("#slots");
    const groups = { Morning: [], Afternoon: [], Evening: [] };
    const now = new Date();
    const isToday = dateKey(booking.date) === dateKey(now);
    const seed = hash((bDoctor.value || "x") + dateKey(booking.date));
    let i = 0;
    for (let m = 9 * 60; m <= 19 * 60 + 30; m += 30) {
      if (m >= 13 * 60 && m < 14 * 60) continue;
      const h = Math.floor(m / 60), mm = m % 60;
      const label = `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
      const past = isToday && m <= now.getHours() * 60 + now.getMinutes() + 30;
      const taken = ((seed >> (i % 28)) & 1) === 1 && i % 3 !== 0;
      const g = h < 12 ? "Morning" : h < 16 ? "Afternoon" : "Evening";
      groups[g].push(`<button type="button" class="slot${booking.slot === label ? " is-active" : ""}" data-slot="${label}" ${past || taken ? "disabled" : ""}>${label}</button>`);
      i++;
    }
    wrap.innerHTML = Object.entries(groups).map(([g, s]) => `<div class="slot-group"><small>${g}</small><div>${s.join("")}</div></div>`).join("");
  }
  $("#slots").addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    booking.slot = b.dataset.slot;
    $$(".slot", $("#slots")).forEach((s) => s.classList.toggle("is-active", s === b));
    bError.textContent = "";
    updateTicket();
  });

  function goStep(n) {
    step = n;
    $$(".bstep", form).forEach((f) => f.classList.toggle("is-active", +f.dataset.step === n));
    $$(".steps__item", form).forEach((s) => {
      const k = +s.dataset.step;
      s.classList.toggle("is-active", k === n);
      s.classList.toggle("is-done", k < n);
    });
    bError.textContent = "";
    if (n === 2) {
      if (!booking.date) booking.date = dates.find((d) => d.getDay() !== 0);
      renderDates(); renderSlots(); updateTicket();
    }
  }
  function markInvalid(el) { el.classList.add("invalid"); el.addEventListener("input", () => el.classList.remove("invalid"), { once: true }); }
  function validate(n) {
    if (n === 1) {
      if (!bDept.value) { markInvalid(bDept); bError.textContent = "Choose a speciality to continue."; return false; }
      if (!bDoctor.value) { markInvalid(bDoctor); bError.textContent = "Choose a doctor to continue."; return false; }
    }
    if (n === 2 && (!booking.date || !booking.slot)) { bError.textContent = "Pick a date and one of the open time slots."; return false; }
    if (n === 3) {
      let ok = true;
      const name = $("#bName"), phone = $("#bPhone"), age = $("#bAge"), gender = $("#bGender");
      if (name.value.trim().length < 2) { markInvalid(name); ok = false; }
      if (!/^[6-9]\d{9}$/.test(phone.value.trim())) { markInvalid(phone); ok = false; }
      if (age.value === "" || +age.value < 0 || +age.value > 120) { markInvalid(age); ok = false; }
      if (!gender.value) { markInvalid(gender); ok = false; }
      if (!ok) bError.textContent = "Check the highlighted fields. Mobile numbers have 10 digits and start with 6–9.";
      return ok;
    }
    return true;
  }
  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-next]") && validate(step)) goStep(step + 1);
    if (e.target.closest("[data-prev]")) goStep(step - 1);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate(3)) return;
    const d = currentDoctor();
    const token = d.dept.slice(0, 2).toUpperCase() + "-" + rand(100, 999);
    const phone = $("#bPhone").value.trim();
    lastBooking = { doctor: d, date: booking.date, slot: booking.slot, token };
    try {
      const all = JSON.parse(storage.get("cn-appointments") || "[]");
      all.push({ doctor: d.name, date: booking.date.toISOString(), slot: booking.slot, token });
      storage.set("cn-appointments", JSON.stringify(all));
    } catch { /* ignore */ }
    $$(".bstep", form).forEach((f) => f.classList.remove("is-active"));
    $$(".steps__item", form).forEach((s) => { s.classList.remove("is-active"); s.classList.add("is-done"); });
    $("#doneMobile").textContent = "******" + phone.slice(-4);
    $("#bookingDone").hidden = false;
    $("#tToken").textContent = token;
    ticket.classList.add("is-confirmed");
  });

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
      `SUMMARY:${lastBooking.doctor.name} (token ${lastBooking.token})`, "LOCATION:CareNova Hospitals\\, Sector 44\\, Gurugram",
      "DESCRIPTION:Arrive 15 minutes early with a photo ID and previous reports.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `CareNova-${lastBooking.token}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  function startBooking({ dept, doctor, video } = {}) {
    closeAllModals();
    if (!$("#bookingDone").hidden) $("#bookAgain").click();
    goStep(1);
    if (doctor) {
      const d = DOCTORS.find((x) => x.name === doctor);
      if (d) { bDept.value = d.dept; fillDoctors(d.dept, d.name); }
    } else if (dept) {
      bDept.value = dept;
      fillDoctors(dept);
    }
    if (video) $("input[name=bType][value='Video']", form).checked = true;
    booking.slot = null;
    updateTicket();
    $("#book").scrollIntoView({ behavior: "smooth" });
    const box = $("#booking");
    box.classList.remove("flash-ring"); void box.offsetWidth; box.classList.add("flash-ring");
  }
  updateTicket();

  /* ---------- Packages ---------- */
  function renderPackages(filter = "all") {
    $("#pkgGrid").innerHTML = PACKAGES.filter((p) => p.tag.includes(filter)).map((p) => `
      <article class="pkg${p.popular ? " pkg--featured" : ""}">
        <div class="pkg__head"><div><h3>${p.name}</h3><small>${p.tests} tests</small></div>${p.popular ? `<span class="pkg__flag">Most chosen</span>` : ""}</div>
        <div class="pkg__price"><b>${inr(p.price)}</b><s>${inr(p.mrp)}</s><span>save ${Math.round((1 - p.price / p.mrp) * 100)}%</span></div>
        <ul>${p.items.map((it) => `<li>${icon("i-check")}${it}</li>`).join("")}</ul>
        <button class="btn btn--line btn--block" data-pkg="${esc(p.name)}">Book this check-up</button>
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
    if (!(h > 50 && w > 10)) { out.textContent = "Enter your height and weight."; return; }
    const v = w / Math.pow(h / 100, 2);
    const [cat, tip] = v < 18.5 ? ["underweight", "A nutrition consult can help."] : v < 25 ? ["in the healthy range", "Keep it up."] : v < 30 ? ["overweight", "Small daily changes add up."] : ["in the obese range", "We'd suggest a doctor's review."];
    pin.style.left = Math.max(2, Math.min(98, ((v - 12) / (40 - 12)) * 100)) + "%";
    out.innerHTML = `<b>${v.toFixed(1)}</b> — ${cat}. ${tip}`;
  }
  ["#bmiH", "#bmiW"].forEach((s) => $(s).addEventListener("input", bmi));
  bmi();

  function water() {
    const w = parseFloat($("#waterW").value), a = parseFloat($("#waterA").value);
    const out = $("#waterOut"), g = $("#waterGlasses");
    if (!(w > 10)) { out.textContent = "Enter your weight."; g.innerHTML = ""; return; }
    const litres = w * 0.033 + a;
    const glasses = Math.round((litres * 1000) / 250);
    g.innerHTML = Array.from({ length: Math.min(glasses, 20) }, () => `<span class="glass"></span>`).join("");
    out.innerHTML = `About <b>${litres.toFixed(1)} L</b> a day, or ${glasses} glasses.`;
  }
  ["#waterW", "#waterA"].forEach((s) => $(s).addEventListener("input", water));
  water();

  const lmp = $("#lmp");
  lmp.max = new Date().toISOString().split("T")[0];
  const sample = new Date(); sample.setDate(sample.getDate() - 70);
  lmp.value = sample.toISOString().split("T")[0];
  function due() {
    const out = $("#dueOut");
    if (!lmp.value) { out.textContent = "Pick a date to estimate your due date."; return; }
    const start = new Date(lmp.value + "T00:00:00");
    const d = new Date(start); d.setDate(d.getDate() + 280);
    const weeks = Math.floor((Date.now() - start) / (7 * 864e5));
    if (weeks < 0 || weeks > 42) { out.textContent = "Choose a date within the last 42 weeks."; return; }
    out.innerHTML = `Due around <b>${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}</b>. You're about ${weeks} weeks along, trimester ${weeks < 13 ? 1 : weeks < 27 ? 2 : 3}.`;
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
  function showQuote(i) {
    qIdx = (i + TESTIMONIALS.length) % TESTIMONIALS.length;
    const t = TESTIMONIALS[qIdx];
    quote.innerHTML = `<p>“${t.text}”</p><footer><span class="avatar" data-tone="${tone(t.name)}">${initials(t.name)}</span><span>${t.name}<small>${t.meta}</small></span></footer>`;
    $$("button", storyList).forEach((b) => b.setAttribute("aria-current", String(+b.dataset.i === qIdx)));
    bar.classList.remove("run"); void bar.offsetWidth; bar.classList.add("run");
    clearTimeout(qTimer);
    qTimer = setTimeout(() => showQuote(qIdx + 1), 7000);
  }
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
    $("#faqAnswer").innerHTML = `<h3>${FAQS[i].q}</h3><p>${FAQS[i].a}</p><button class="link-btn" data-open-chat>Ask something else ${icon("i-arrow")}</button>`;
  }
  faqWrap.addEventListener("click", (e) => { const b = e.target.closest(".faq__q"); if (b) showFaq(+b.dataset.i); });
  showFaq(0);

  /* ---------- Modals ---------- */
  let lastFocus = null;
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    setTimeout(() => $(".modal__close", m)?.focus(), 50);
  }
  function closeModal(m) {
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    if (!$(".modal.open")) document.body.classList.remove("no-scroll");
    lastFocus?.focus?.();
  }
  function closeAllModals() { $$(".modal.open").forEach(closeModal); }
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(m); }));

  $("#shareLoc").addEventListener("click", () => {
    const msg = $("#locMsg");
    if (!navigator.geolocation) { msg.className = "form-msg err"; msg.textContent = "This device can't share location. Please call us."; return; }
    msg.className = "form-msg"; msg.textContent = "Finding your location…";
    navigator.geolocation.getCurrentPosition(
      (p) => { msg.className = "form-msg ok"; msg.textContent = `Location shared (${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}). Our ER team will call you back.`; },
      () => { msg.className = "form-msg err"; msg.textContent = "We couldn't get your location. Please call 1800-123-4567."; },
      { timeout: 8000 });
  });

  $("#reportForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#reportMsg"), uhid = $("#rUhid"), ph = $("#rPhone");
    if (uhid.value.trim().length < 5 || !/^[6-9]\d{9}$/.test(ph.value.trim())) {
      msg.className = "form-msg err"; msg.textContent = "Enter your UHID and a 10-digit mobile number."; return;
    }
    msg.className = "form-msg ok";
    msg.textContent = `OTP sent to ******${ph.value.trim().slice(-4)}.`;
  });

  /* ---------- Contact & newsletter ---------- */
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target, msg = $("#contactMsg");
    let ok = true;
    $$("input, textarea", f).forEach((el) => {
      const valid = el.name === "phone" ? /^[6-9]\d{9}$/.test(el.value.trim()) : el.checkValidity() && el.value.trim() !== "";
      if (!valid) { markInvalid(el); ok = false; }
    });
    if (!ok) { msg.className = "form-msg err"; msg.textContent = "Fill in the highlighted fields."; return; }
    msg.className = "form-msg ok";
    msg.textContent = "Message sent. We'll reply within 2 hours.";
    f.reset();
  });
  $("#newsletter").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("input", e.target);
    if (!inp.checkValidity()) { toast("Enter a valid email address."); return; }
    inp.value = "";
    toast("Subscribed. The next issue arrives on the 1st.");
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
      t.innerHTML = rule ? rule.a : "I don't have an answer for that yet. Call our helpdesk on <b>+91 98765 43210</b>, or tap one of the options below.";
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 600 + Math.random() * 400);
  }
  function toggleChat(open) {
    chat.classList.toggle("open", open);
    chat.setAttribute("aria-hidden", String(!open));
    chatBtn.setAttribute("aria-expanded", String(open));
    if (open && !chatStarted) { chatStarted = true; addMsg("Namaste. I'm Nova, CareNova's assistant. What can I help you with?"); }
    if (open) setTimeout(() => $("#chatInput").focus(), 250);
  }
  chatBtn.addEventListener("click", () => toggleChat(!chat.classList.contains("open")));
  $("#chatQuick").innerHTML = ["Book appointment", "Emergency", "Health packages", "Insurance", "OPD timings", "WhatsApp"].map((q) => `<button type="button">${q}</button>`).join("");
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
    closeAllModals();
    if (chat.classList.contains("open")) toggleChat(false);
    if (!menu.hidden) setMenu(false);
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
    if (t.dataset.pkg) { toast(`Request received for ${t.dataset.pkg}. We'll call you to schedule it.`); return; }
    if (t.hasAttribute("data-video-book")) { e.preventDefault(); startBooking({ video: true }); if (window.innerWidth <= 600) toggleChat(false); }
  });

  $("#year").textContent = new Date().getFullYear();
})();
