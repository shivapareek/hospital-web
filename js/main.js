/* =========================================================
   CareNova Hospitals – Interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
  };
  const icon = (id, cls = "ic") => `<svg class="${cls}"><use href="#${id}"/></svg>`;
  const initials = (name) => name.replace(/^Dr\.?\s*/i, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const inr = (n) => "₹" + n.toLocaleString("en-IN");
  const deptHue = (d) => (DEPARTMENTS.find((x) => x.name === d) || { hue: 190 }).hue;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------- Preloader ---------- */
  const hidePreloader = () => $("#preloader")?.classList.add("hide");
  window.addEventListener("load", () => setTimeout(hidePreloader, 400));
  setTimeout(hidePreloader, 2500); // safety net

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const savedTheme = storage.get("cn-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = savedTheme || root.dataset.theme || (prefersDark ? "dark" : "light");
  $("#themeToggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    storage.set("cn-theme", root.dataset.theme);
  });

  /* ---------- Font size (accessibility) ---------- */
  let fs = parseInt(storage.get("cn-fs") || "0", 10);
  const applyFs = () => {
    root.style.setProperty("--fs-scale", String(1 + fs * 0.1));
    $$(".fontsize button").forEach((b) => b.classList.toggle("active", +b.dataset.fs === fs || (b.dataset.fs === "0" && fs === 0)));
  };
  $$(".fontsize button").forEach((b) => b.addEventListener("click", () => {
    const v = +b.dataset.fs;
    fs = v === 0 ? 0 : Math.max(-1, Math.min(2, fs + v));
    storage.set("cn-fs", String(fs));
    applyFs();
  }));
  applyFs();

  /* ---------- Header / Nav ---------- */
  const header = $("#header");
  const nav = $("#nav");
  const burger = $("#burger");
  const overlay = document.createElement("div");
  overlay.className = "nav-overlay";
  document.body.appendChild(overlay);

  function setNav(open) {
    nav.classList.toggle("open", open);
    overlay.classList.toggle("show", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.innerHTML = icon(open ? "i-x" : "i-menu");
    document.body.classList.toggle("no-scroll", open);
  }
  burger.addEventListener("click", () => setNav(!nav.classList.contains("open")));
  overlay.addEventListener("click", () => setNav(false));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setNav(false)));

  const toTop = $("#toTop");
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 10);
    toTop.classList.toggle("show", y > 800);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // Active link on scroll
  const navLinks = $$(".nav__link");
  const sections = navLinks.map((l) => $(l.getAttribute("href"))).filter(Boolean);
  const secObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => secObserver.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const sibs = $$(".reveal", e.target.parentElement);
        const idx = Math.max(0, sibs.indexOf(e.target));
        e.target.style.transitionDelay = Math.min(idx * 70, 350) + "ms";
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  const observeReveals = (scope = document) => $$(".reveal:not(.in)", scope).forEach((el) => revealObserver.observe(el));

  /* ---------- Counters ---------- */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const to = parseFloat(el.dataset.to);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      const dur = 1800;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        const val = to * eased;
        el.textContent = (dec ? val.toFixed(dec) : Math.round(val).toLocaleString("en-IN")) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  $$(".counter").forEach((c) => counterObserver.observe(c));

  /* ---------- Live status (simulated feed) ---------- */
  const live = { er: 8, beds: 42, icu: 7, token: 114, docs: 68 };
  let lastUpdate = Date.now();
  function setLive(id, val) {
    const el = $(id);
    if (el.textContent === String(val)) return;
    el.textContent = val;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 900);
  }
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  setInterval(() => {
    live.er = Math.max(4, Math.min(18, live.er + rand(-2, 2)));
    live.beds = Math.max(28, Math.min(60, live.beds + rand(-2, 2)));
    live.icu = Math.max(3, Math.min(12, live.icu + rand(-1, 1)));
    live.token += rand(0, 2);
    live.docs = Math.max(60, Math.min(74, live.docs + rand(-1, 1)));
    setLive("#liveEr", live.er + " min");
    setLive("#liveBeds", live.beds);
    setLive("#liveIcu", live.icu);
    setLive("#liveToken", "A-" + live.token);
    setLive("#liveDocs", live.docs);
    lastUpdate = Date.now();
  }, 6000);
  setInterval(() => {
    const s = Math.round((Date.now() - lastUpdate) / 1000);
    $("#liveUpdated").textContent = s < 3 ? "just now" : s + "s ago";
  }, 1000);

  // Hero BPM wobble
  setInterval(() => { $("#bpm").textContent = rand(70, 78); }, 2600);

  /* ---------- Departments ---------- */
  $("#deptGrid").innerHTML = DEPARTMENTS.map((d) => `
    <article class="dept reveal" style="--h:${d.hue}">
      <span class="dept__icon">${icon(d.icon)}</span>
      <h3>${d.name}</h3>
      <p>${d.desc}</p>
      <span class="dept__stat">${d.stat}</span>
      <div class="dept__links">
        <button type="button" data-find-dept="${d.name}">Find doctors</button>
        <button type="button" data-book-dept="${d.name}">Book ${icon("i-arrow")}</button>
      </div>
    </article>`).join("");

  /* ---------- Doctors ---------- */
  const docGrid = $("#docGrid");
  const docSearch = $("#docSearch");
  const docDept = $("#docDept");
  const docToday = $("#docToday");
  const docVideo = $("#docVideo");
  const deptOptions = DEPARTMENTS.map((d) => `<option value="${d.name}">${d.name}</option>`).join("");
  docDept.insertAdjacentHTML("beforeend", deptOptions);

  function docCard(d, i) {
    return `
    <article class="doc" style="animation-delay:${Math.min(i, 8) * 50}ms">
      <div class="doc__top" style="--h:${deptHue(d.dept)}">
        <div class="doc__badges">
          ${d.today ? `<span class="badge badge--green"><span class="dot"></span>Today</span>` : `<span class="badge badge--blue">Next: Tomorrow</span>`}
          ${d.video ? `<span class="badge badge--blue">${icon("i-video", "ic")} Video</span>` : "<span></span>"}
        </div>
        <div class="avatar" style="--h:${deptHue(d.dept)}">${initials(d.name)}</div>
      </div>
      <div class="doc__body">
        <span class="doc__dept">${d.dept}</span>
        <h3>${d.name}</h3>
        <div class="doc__role">${d.role}</div>
        <div class="doc__deg">${d.deg}</div>
        <div class="doc__meta">
          <span><svg class="star"><use href="#i-star"/></svg><b>${d.rating}</b> (${d.reviews.toLocaleString("en-IN")})</span>
          <span>${icon("i-award")}<b>${d.exp}</b> yrs</span>
        </div>
        <div class="doc__foot">
          <div class="doc__fee"><small>Consultation</small><b>${inr(d.fee)}</b></div>
          <button class="btn btn--primary" data-book-doc="${esc(d.name)}">Book</button>
        </div>
      </div>
    </article>`;
  }

  function renderDoctors() {
    const q = docSearch.value.trim().toLowerCase();
    const dep = docDept.value;
    const list = DOCTORS.filter((d) =>
      (!q || (d.name + " " + d.dept + " " + d.role + " " + d.deg).toLowerCase().includes(q)) &&
      (!dep || d.dept === dep) &&
      (!docToday.checked || d.today) &&
      (!docVideo.checked || d.video)
    );
    docGrid.innerHTML = list.map(docCard).join("");
    $("#docEmpty").hidden = list.length > 0;
  }
  [docSearch, docDept, docToday, docVideo].forEach((el) => el.addEventListener("input", renderDoctors));
  renderDoctors();

  function showDoctors({ q = "", dept = "" } = {}) {
    docSearch.value = q;
    docDept.value = dept;
    docToday.checked = false;
    docVideo.checked = false;
    renderDoctors();
    $("#doctors").scrollIntoView({ behavior: "smooth" });
  }

  // Hero search
  $("#heroSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#heroSearchInput").value.trim();
    const match = DEPARTMENTS.find((d) => d.name.toLowerCase() === q.toLowerCase());
    showDoctors(match ? { dept: match.name } : { q });
  });
  $$(".hero__tags button").forEach((b) => b.addEventListener("click", () => showDoctors({ dept: b.dataset.q })));

  /* ---------- Symptom finder ---------- */
  const chipsWrap = $("#symptomChips");
  chipsWrap.innerHTML = SYMPTOMS.map((s, i) => `<button type="button" class="chip" data-i="${i}" aria-pressed="false">${s.label}</button>`).join("");
  const picked = new Set();
  chipsWrap.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const i = +b.dataset.i;
    picked.has(i) ? picked.delete(i) : picked.add(i);
    b.classList.toggle("active", picked.has(i));
    b.setAttribute("aria-pressed", String(picked.has(i)));
    renderSymptomResult();
  });

  function renderSymptomResult() {
    const out = $("#symptomResult");
    if (!picked.size) {
      out.innerHTML = `<div class="symptom__empty">${icon("i-spark")} Choose one or more symptoms to see a recommendation.</div>`;
      return;
    }
    const tally = {};
    let urgent = false;
    picked.forEach((i) => {
      const s = SYMPTOMS[i];
      tally[s.dept] = (tally[s.dept] || 0) + 1;
      if (s.urgent) urgent = true;
    });
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const top = ranked[0][0];
    const also = ranked.slice(1, 3).map((r) => r[0]);
    const docs = DOCTORS.filter((d) => d.dept === top).slice(0, 2);
    out.innerHTML = `
      ${urgent ? `<div class="sr-urgent">${icon("i-sos")} <span>Some symptoms may need urgent attention. If severe or sudden, call <a href="tel:18001234567">1800-123-4567</a> now.</span></div>` : ""}
      <div class="sr-head">
        <div><small>Recommended speciality</small><h4>${top}</h4>${also.length ? `<small>Also consider: ${also.join(", ")}</small>` : ""}</div>
        <button class="btn btn--light" data-book-dept="${top}">Book ${top}</button>
      </div>
      <div class="sr-docs">
        ${docs.map((d) => `
          <div class="sr-doc">
            <div class="avatar avatar--sm" style="--h:${deptHue(d.dept)}">${initials(d.name)}</div>
            <div><strong>${d.name}</strong><small>${d.role} • ${d.exp} yrs • ★ ${d.rating}</small></div>
            <button class="btn btn--primary" data-book-doc="${esc(d.name)}">Book</button>
          </div>`).join("")}
      </div>`;
  }

  /* ---------- Booking wizard ---------- */
  const form = $("#bookingForm");
  const bDept = $("#bDept");
  const bDoctor = $("#bDoctor");
  const bFee = $("#bFee");
  const bError = $("#bError");
  let step = 1;
  const booking = { date: null, slot: null };

  bDept.insertAdjacentHTML("beforeend", deptOptions);

  function fillDoctors(dept, selectName) {
    const list = DOCTORS.filter((d) => d.dept === dept);
    bDoctor.disabled = !dept;
    bDoctor.innerHTML = dept
      ? `<option value="">Select doctor</option>` + list.map((d) => `<option value="${esc(d.name)}">${d.name} – ${d.role}</option>`).join("")
      : `<option value="">Select speciality first</option>`;
    if (selectName) bDoctor.value = selectName;
    updateFee();
  }
  function currentDoctor() { return DOCTORS.find((d) => d.name === bDoctor.value); }
  function consultType() { return $("input[name=bType]:checked", form).value; }

  function updateFee() {
    const d = currentDoctor();
    if (!d) { bFee.hidden = true; return; }
    bFee.hidden = false;
    bFee.innerHTML = `<div class="avatar avatar--sm" style="--h:${deptHue(d.dept)}">${initials(d.name)}</div>
      <div><strong>${d.name}</strong><small>${d.exp} yrs exp • ★ ${d.rating} • ${d.lang}</small></div>
      <b>${inr(d.fee)}</b>`;
    if (!d.video && consultType() === "Video") {
      $("input[name=bType][value='In-clinic']", form).checked = true;
      toast(`${d.name} is available for in-clinic visits only.`);
    }
  }
  bDept.addEventListener("change", () => { fillDoctors(bDept.value); clearInvalid(bDept); });
  bDoctor.addEventListener("change", () => { updateFee(); clearInvalid(bDoctor); booking.slot = null; });
  $$("input[name=bType]", form).forEach((r) => r.addEventListener("change", updateFee));

  // Dates
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  const dateKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  function renderDates() {
    $("#dateStrip").innerHTML = dates.map((d, i) => {
      const closed = d.getDay() === 0;
      const label = i === 0 ? "Today" : i === 1 ? "Tmrw" : DAY[d.getDay()];
      return `<button type="button" class="date-btn${booking.date && dateKey(booking.date) === dateKey(d) ? " active" : ""}" data-i="${i}" ${closed ? "disabled title='OPD closed on Sundays'" : ""}>
        <small>${label}</small><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></button>`;
    }).join("");
  }
  $("#dateStrip").addEventListener("click", (e) => {
    const b = e.target.closest(".date-btn");
    if (!b || b.disabled) return;
    booking.date = dates[+b.dataset.i];
    booking.slot = null;
    renderDates();
    renderSlots();
  });

  // Simple deterministic hash so the same doctor/date shows the same booked slots
  function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }

  function renderSlots() {
    const wrap = $("#slots");
    if (!booking.date) { wrap.innerHTML = `<small style="color:var(--muted)">Select a date to view slots.</small>`; return; }
    const groups = { Morning: [], Afternoon: [], Evening: [] };
    const now = new Date();
    const isToday = dateKey(booking.date) === dateKey(now);
    const seed = hash((bDoctor.value || "x") + dateKey(booking.date));
    const times = [];
    for (let m = 9 * 60; m <= 19 * 60 + 30; m += 30) { if (m >= 13 * 60 && m < 14 * 60) continue; times.push(m); }
    times.forEach((m, i) => {
      const h = Math.floor(m / 60), mm = m % 60;
      const label = `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
      const past = isToday && (h * 60 + mm) <= now.getHours() * 60 + now.getMinutes() + 30;
      const taken = ((seed >> (i % 28)) & 1) === 1 && i % 3 !== 0;
      const g = h < 12 ? "Morning" : h < 16 ? "Afternoon" : "Evening";
      groups[g].push(`<button type="button" class="slot${booking.slot === label ? " active" : ""}" data-slot="${label}" ${past || taken ? "disabled" : ""}>${label}</button>`);
    });
    wrap.innerHTML = Object.entries(groups).map(([g, s]) => `<div class="slot-group"><small>${g}</small><div>${s.join("")}</div></div>`).join("");
  }
  $("#slots").addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    booking.slot = b.dataset.slot;
    $$(".slot", $("#slots")).forEach((s) => s.classList.toggle("active", s === b));
    bError.textContent = "";
  });

  function goStep(n) {
    step = n;
    $$(".bstep", form).forEach((f) => f.classList.toggle("active", +f.dataset.step === n));
    $$(".bp-step").forEach((s) => {
      const k = +s.dataset.step;
      s.classList.toggle("active", k === n);
      s.classList.toggle("done", k < n);
    });
    bError.textContent = "";
    if (n === 2) {
      if (!booking.date) booking.date = dates.find((d) => d.getDay() !== 0);
      renderDates();
      renderSlots();
    }
    if (n === 3) renderSummary();
  }

  function markInvalid(el) { el.classList.add("invalid"); el.addEventListener("input", () => clearInvalid(el), { once: true }); }
  function clearInvalid(el) { el.classList.remove("invalid"); }

  function validate(n) {
    if (n === 1) {
      if (!bDept.value) { markInvalid(bDept); bError.textContent = "Please select a speciality."; return false; }
      if (!bDoctor.value) { markInvalid(bDoctor); bError.textContent = "Please select a doctor."; return false; }
    }
    if (n === 2) {
      if (!booking.date || !booking.slot) { bError.textContent = "Please choose a date and an available time slot."; return false; }
    }
    if (n === 3) {
      let ok = true;
      const name = $("#bName"), phone = $("#bPhone"), age = $("#bAge"), gender = $("#bGender");
      if (name.value.trim().length < 2) { markInvalid(name); ok = false; }
      if (!/^[6-9]\d{9}$/.test(phone.value.trim())) { markInvalid(phone); ok = false; }
      if (age.value === "" || +age.value < 0 || +age.value > 120) { markInvalid(age); ok = false; }
      if (!gender.value) { markInvalid(gender); ok = false; }
      if (!ok) bError.textContent = "Please fill in the highlighted fields (valid 10-digit mobile).";
      return ok;
    }
    return true;
  }

  function fmtDate(d) { return `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; }

  function renderSummary() {
    const d = currentDoctor();
    $("#bSummary").innerHTML = `
      <div><span>Doctor</span><b>${d.name}</b></div>
      <div><span>Speciality</span><b>${d.dept}</b></div>
      <div><span>When</span><b>${fmtDate(booking.date)}, ${booking.slot}</b></div>
      <div><span>Type</span><b>${consultType()}</b></div>
      <div><span>Fee</span><b>${inr(d.fee)} <small style="color:var(--muted)">(pay at hospital)</small></b></div>`;
  }

  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-next]")) { if (validate(step)) goStep(step + 1); }
    if (e.target.closest("[data-prev]")) goStep(step - 1);
  });

  let lastBooking = null;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate(3)) return;
    const d = currentDoctor();
    const token = d.dept.slice(0, 2).toUpperCase() + "-" + String(rand(100, 999));
    lastBooking = { doctor: d, date: booking.date, slot: booking.slot, type: consultType(), name: $("#bName").value.trim(), token };
    try {
      const all = JSON.parse(storage.get("cn-appointments") || "[]");
      all.push({ ...lastBooking, doctor: d.name, date: booking.date.toISOString() });
      storage.set("cn-appointments", JSON.stringify(all));
    } catch { /* ignore */ }
    $("#ticket").innerHTML = `
      <div class="ticket__token"><small>YOUR TOKEN</small><b>${token}</b></div>
      <div class="row"><span>Patient</span><b>${esc(lastBooking.name)}</b></div>
      <div class="row"><span>Doctor</span><b>${d.name}</b></div>
      <div class="row"><span>Date</span><b>${fmtDate(booking.date)}</b></div>
      <div class="row"><span>Time</span><b>${booking.slot}</b></div>
      <div class="row"><span>Type</span><b>${lastBooking.type}</b></div>
      <div class="row"><span>Reporting</span><b>${lastBooking.type === "Video" ? "Link sent via SMS" : "15 min early, Block A"}</b></div>`;
    openModal("successModal");
    form.reset();
    fillDoctors("");
    booking.date = null; booking.slot = null;
    goStep(1);
  });

  // Add to calendar (.ics)
  $("#addToCal").addEventListener("click", () => {
    if (!lastBooking) return;
    const [time, ap] = lastBooking.slot.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const start = new Date(lastBooking.date); start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    const f = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CareNova Hospitals//EN", "BEGIN:VEVENT",
      `UID:${lastBooking.token}@carenovahospitals.com`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
      `SUMMARY:Appointment with ${lastBooking.doctor.name} (Token ${lastBooking.token})`,
      "LOCATION:CareNova Hospitals\\, Sector 44\\, Gurugram",
      "DESCRIPTION:Please arrive 15 minutes early with a valid ID and previous reports.",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `CareNova-${lastBooking.token}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  function startBooking({ dept, doctor, video } = {}) {
    closeAllModals();
    goStep(1);
    if (doctor) {
      const d = DOCTORS.find((x) => x.name === doctor);
      if (d) { bDept.value = d.dept; fillDoctors(d.dept, d.name); }
    } else if (dept) {
      bDept.value = dept;
      fillDoctors(dept);
    }
    if (video) $("input[name=bType][value='Video']", form).checked = true;
    updateFee();
    $("#appointment").scrollIntoView({ behavior: "smooth" });
    const box = $("#booking");
    box.classList.remove("flash-highlight");
    void box.offsetWidth;
    box.classList.add("flash-highlight");
  }

  /* ---------- Packages ---------- */
  function renderPackages(filter = "all") {
    $("#pkgGrid").innerHTML = PACKAGES.filter((p) => p.tag.includes(filter)).map((p, i) => `
      <article class="pkg${p.popular ? " pkg--popular" : ""}" style="animation-delay:${i * 60}ms">
        ${p.popular ? `<span class="pkg__ribbon">Most popular</span>` : ""}
        <h3>${p.name}</h3>
        <div class="pkg__tests">${p.tests} tests & parameters</div>
        <div class="pkg__price"><b>${inr(p.price)}</b><s>${inr(p.mrp)}</s></div>
        <span class="pkg__save">Save ${Math.round((1 - p.price / p.mrp) * 100)}%</span>
        <ul>${p.items.map((it) => `<li>${icon("i-check")}${it}</li>`).join("")}</ul>
        <button class="btn ${p.popular ? "btn--primary" : "btn--ghost"} btn--block" data-pkg="${esc(p.name)}">Book Package</button>
      </article>`).join("");
  }
  $("#pkgTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $$("#pkgTabs button").forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-selected", String(x === b)); });
    renderPackages(b.dataset.filter);
  });
  renderPackages();

  /* ---------- Health tools ---------- */
  function bmi() {
    const h = parseFloat($("#bmiH").value), w = parseFloat($("#bmiW").value);
    const out = $("#bmiOut"), pin = $("#bmiPin");
    if (!(h > 50 && w > 10)) { out.textContent = "Enter your height and weight."; pin.style.opacity = 0; return; }
    const v = w / Math.pow(h / 100, 2);
    let cat, tip;
    if (v < 18.5) { cat = "Underweight"; tip = "Consider a nutrition consult."; }
    else if (v < 25) { cat = "Healthy"; tip = "Great — keep it up!"; }
    else if (v < 30) { cat = "Overweight"; tip = "Small lifestyle changes can help."; }
    else { cat = "Obese"; tip = "We recommend a doctor consultation."; }
    // map 12–40 BMI onto the bar
    const pct = Math.max(2, Math.min(98, ((v - 12) / (40 - 12)) * 100));
    pin.style.left = pct + "%";
    pin.style.opacity = 1;
    out.innerHTML = `Your BMI is <b>${v.toFixed(1)}</b> — ${cat}. ${tip}`;
  }
  ["#bmiH", "#bmiW"].forEach((s) => $(s).addEventListener("input", bmi));

  function water() {
    const w = parseFloat($("#waterW").value), a = parseFloat($("#waterA").value);
    const out = $("#waterOut"), g = $("#waterGlasses");
    if (!(w > 10)) { out.textContent = "Enter your weight."; g.innerHTML = ""; return; }
    const litres = w * 0.033 + a;
    const glasses = Math.round((litres * 1000) / 250);
    g.innerHTML = Array.from({ length: Math.min(glasses, 20) }, (_, i) => `<span class="glass" style="animation-delay:${i * 30}ms"></span>`).join("");
    out.innerHTML = `Aim for about <b>${litres.toFixed(1)} L</b> a day (~${glasses} glasses).`;
  }
  ["#waterW", "#waterA"].forEach((s) => $(s).addEventListener("input", water));

  $("#lmp").max = new Date().toISOString().split("T")[0];
  $("#lmp").addEventListener("input", (e) => {
    const out = $("#dueOut");
    if (!e.target.value) { out.textContent = "Select a date to estimate your due date."; return; }
    const lmp = new Date(e.target.value + "T00:00:00");
    const due = new Date(lmp); due.setDate(due.getDate() + 280);
    const weeks = Math.floor((Date.now() - lmp) / (7 * 864e5));
    if (weeks < 0 || weeks > 42) { out.textContent = "Please choose a date within the last 42 weeks."; return; }
    out.innerHTML = `Estimated due date: <b>${due.getDate()} ${MON[due.getMonth()]} ${due.getFullYear()}</b><br/>You are about <b>${weeks}</b> weeks along (trimester ${weeks < 13 ? 1 : weeks < 27 ? 2 : 3}).`;
  });

  /* ---------- Testimonials slider ---------- */
  const track = $("#tTrack");
  track.innerHTML = TESTIMONIALS.map((t) => `
    <div class="t-card"><div class="t-card__inner">
      <svg class="t-card__quote"><use href="#i-quote"/></svg>
      <div class="stars">${"<svg><use href='#i-star'/></svg>".repeat(t.rating)}</div>
      <p>“${t.text}”</p>
      <div class="t-card__who"><div class="avatar avatar--sm" style="--h:${t.hue}">${initials(t.name)}</div><div><strong>${t.name}</strong><small>${t.meta}</small></div></div>
    </div></div>`).join("");
  let tIndex = 0;
  const perView = () => (window.innerWidth <= 600 ? 1 : window.innerWidth <= 1024 ? 2 : 3);
  const maxIndex = () => Math.max(0, TESTIMONIALS.length - perView());
  function renderDots() {
    $("#tDots").innerHTML = Array.from({ length: maxIndex() + 1 }, (_, i) => `<button aria-label="Go to slide ${i + 1}" class="${i === tIndex ? "active" : ""}" data-i="${i}"></button>`).join("");
  }
  function goSlide(i) {
    tIndex = (i + maxIndex() + 1) % (maxIndex() + 1);
    track.style.transform = `translateX(-${tIndex * (100 / perView())}%)`;
    renderDots();
  }
  $("#tPrev").addEventListener("click", () => { goSlide(tIndex - 1); resetAuto(); });
  $("#tNext").addEventListener("click", () => { goSlide(tIndex + 1); resetAuto(); });
  $("#tDots").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { goSlide(+b.dataset.i); resetAuto(); } });
  let auto = setInterval(() => goSlide(tIndex + 1), 6000);
  function resetAuto() { clearInterval(auto); auto = setInterval(() => goSlide(tIndex + 1), 6000); }
  window.addEventListener("resize", () => goSlide(Math.min(tIndex, maxIndex())));
  // swipe
  let sx = null;
  track.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) { goSlide(tIndex + (dx < 0 ? 1 : -1)); resetAuto(); }
    sx = null;
  });
  goSlide(0);

  /* ---------- FAQ: one open at a time ---------- */
  $$("#faqList details").forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) $$("#faqList details").forEach((o) => { if (o !== d) o.open = false; });
  }));

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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
      if (chat.classList.contains("open")) toggleChat(false);
      if (nav.classList.contains("open")) setNav(false);
    }
  });

  // SOS – share location
  $("#shareLoc").addEventListener("click", () => {
    const msg = $("#locMsg");
    if (!navigator.geolocation) { msg.className = "form-msg err"; msg.textContent = "Location is not supported on this device."; return; }
    msg.className = "form-msg"; msg.textContent = "Fetching your location…";
    navigator.geolocation.getCurrentPosition(
      (p) => { msg.className = "form-msg ok"; msg.textContent = `✓ Location shared (${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}). Our ER team will call you back.`; },
      () => { msg.className = "form-msg err"; msg.textContent = "Couldn't access location. Please call us directly."; },
      { timeout: 8000 }
    );
  });

  // Reports
  $("#reportForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#reportMsg");
    const uhid = $("#rUhid"), ph = $("#rPhone");
    if (uhid.value.trim().length < 5 || !/^[6-9]\d{9}$/.test(ph.value.trim())) {
      msg.className = "form-msg err"; msg.textContent = "Please enter a valid UHID and 10-digit mobile number."; return;
    }
    msg.className = "form-msg ok";
    msg.textContent = `✓ OTP sent to ******${ph.value.trim().slice(-4)}. Enter it on the next screen to view reports.`;
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
    if (!ok) { msg.className = "form-msg err"; msg.textContent = "Please complete the highlighted fields."; return; }
    msg.className = "form-msg ok";
    msg.textContent = "✓ Thank you! Our patient care team will reach out within 2 hours.";
    f.reset();
  });
  $("#newsletter").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("input", e.target);
    if (!inp.checkValidity()) { toast("Please enter a valid email address."); return; }
    inp.value = "";
    toast("🎉 Subscribed! Health tips are on their way.");
  });

  /* ---------- Chat assistant ---------- */
  const chat = $("#chat");
  const chatBody = $("#chatBody");
  const chatToggleBtn = $("#chatToggle");
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
      t.innerHTML = rule ? rule.a : "I'm not sure about that yet 🙂 Please call our helpdesk at <a href=\"tel:+919876543210\">+91 98765 43210</a> or try one of the quick options below.";
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 700 + Math.random() * 500);
  }
  function toggleChat(open) {
    chat.classList.toggle("open", open);
    chat.setAttribute("aria-hidden", String(!open));
    chatToggleBtn.setAttribute("aria-expanded", String(open));
    if (open && !chatStarted) {
      chatStarted = true;
      addMsg("Hi there! 👋 I'm <b>Nova</b>, CareNova's virtual assistant. How can I help you today?");
    }
    if (open) setTimeout(() => $("#chatInput").focus(), 300);
  }
  chatToggleBtn.addEventListener("click", () => toggleChat(!chat.classList.contains("open")));
  $$("[data-open-chat]").forEach((b) => b.addEventListener("click", () => toggleChat(true)));
  $("#chatQuick").innerHTML = ["Book appointment", "Emergency", "Health packages", "Insurance", "OPD timings", "Lab reports"]
    .map((q) => `<button type="button">${q}</button>`).join("");
  $("#chatQuick").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    addMsg(esc(b.textContent), "user");
    botReply(b.textContent);
  });
  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#chatInput");
    const v = inp.value.trim();
    if (!v) return;
    addMsg(esc(v), "user");
    inp.value = "";
    botReply(v);
  });

  /* ---------- Global delegated actions ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open], [data-book-dept], [data-book-doc], [data-find-dept], [data-pkg], [data-video-book], .chat a[href^='#']");
    if (!t) return;
    if (t.dataset.open) { e.preventDefault(); openModal(t.dataset.open); return; }
    if (t.dataset.bookDoc) { e.preventDefault(); startBooking({ doctor: t.dataset.bookDoc }); return; }
    if (t.dataset.bookDept) { e.preventDefault(); startBooking({ dept: t.dataset.bookDept }); return; }
    if (t.dataset.findDept) { e.preventDefault(); showDoctors({ dept: t.dataset.findDept }); return; }
    if (t.dataset.pkg) { toast(`✓ Request received for "${t.dataset.pkg}". We'll call you to schedule it.`); return; }
    if (t.hasAttribute("data-video-book")) { e.preventDefault(); startBooking({ video: true }); return; }
    if (t.matches(".chat a[href^='#']") && window.innerWidth <= 600) toggleChat(false);
  });

  /* ---------- Misc ---------- */
  $("#year").textContent = new Date().getFullYear();
  observeReveals();
})();
