/* =========================================================
   CareNova – patient self-service: manage booking and data requests.
   Loaded on /manage-booking and /data-request (server pages).
   ========================================================= */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PHONE = /^[6-9]\d{9}$/;
  /* i18n: window.I18N (set by the server on Hindi pages) maps English text to the page language */
  const I18N = window.I18N || {};
  const tr = (s, v) => { let r = Object.prototype.hasOwnProperty.call(I18N, s) ? I18N[s] : s; if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); return r; };
  const LANG = (window.CMS && window.CMS.lang) || "en";
  const HOME = (window.CMS && window.CMS.home) || "/";

  async function api(path, body) {
    // lang: the server answers (errors, dates, labels) in the page language
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "cms" }, body: JSON.stringify(LANG === "en" ? body : { ...body, lang: LANG }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.error || tr("Something went wrong. Please try again or call us.")); e.status = r.status; throw e; }
    return data;
  }
  function markInvalid(el) { el.classList.add("invalid"); el.addEventListener("input", () => el.classList.remove("invalid"), { once: true }); }
  function consentOk(form) {
    const box = $("input[name=consent]", form);
    if (!box || box.checked) return true;
    const lab = box.closest(".consent");
    lab.classList.add("invalid");
    box.addEventListener("change", () => lab.classList.remove("invalid"), { once: true });
    return false;
  }

  /* ---------- Data request ---------- */
  const dr = $("#dataRequestForm");
  if (dr) {
    dr.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = $("#drMsg");
      const f = dr.elements;
      let ok = true;
      if (f.name.value.trim().length < 2) { markInvalid(f.name); ok = false; }
      if (!PHONE.test(f.phone.value.trim())) { markInvalid(f.phone); ok = false; }
      if (f.email.value.trim() && !f.email.checkValidity()) { markInvalid(f.email); ok = false; }
      if (!ok) { msg.className = "form-msg err"; msg.textContent = tr("Check the highlighted fields. Mobile numbers have 10 digits and start with 6–9."); $(".invalid", dr)?.focus(); return; }
      if (!consentOk(dr)) { msg.className = "form-msg err"; msg.textContent = tr("Tick the box to agree to the privacy policy."); f.consent.focus(); return; }
      const btn = $("button[type=submit]", dr);
      btn.disabled = true;
      msg.className = "form-msg"; msg.textContent = tr("Sending…");
      api("/api/submit/datarequest", {
        name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), requestType: f.requestType.value,
        details: f.details.value.trim(), website: f.website.value, consent: true
      }).then(() => {
        msg.className = "form-msg ok";
        msg.textContent = tr("Request received. We'll call {phone} to confirm it's you, and reply within 30 days.", { phone: "******" + f.phone.value.trim().slice(-4) });
        dr.reset();
      }).catch((err) => { msg.className = "form-msg err"; msg.textContent = err.message; })
        .finally(() => { btn.disabled = false; });
    });
  }

  /* ---------- Manage booking ---------- */
  const lookup = $("#lookupForm");
  if (!lookup) return;
  const out = $("#manageResult");
  const tokenIn = $("#mToken"), phoneIn = $("#mPhone"), lmsg = $("#lookupMsg");
  const qsToken = new URLSearchParams(location.search).get("token");
  if (qsToken) { tokenIn.value = qsToken.toUpperCase().slice(0, 8); phoneIn.focus({ preventScroll: true }); }
  let cred = null;     // {token, phone}
  let booking = null;
  let notice = "";

  const DAY = I18N["@days"] || ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = I18N["@months"] || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const parse = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
  const iso = (d) => d.toISOString().slice(0, 10);
  const label = (isoDate) => { const d = parse(isoDate); return LANG === "hi" ? `${DAY[d.getUTCDay()]}, ${d.getUTCDate()} ${MON[d.getUTCMonth()]}` : `${DAY[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
  const slotMin = (s) => { const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s || ""); if (!m) return 0; let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + +m[2]; };
  const ACTIONS = { rescheduled: "Moved", cancelled: "Cancelled" };

  lookup.addEventListener("submit", (e) => {
    e.preventDefault();
    const token = tokenIn.value.trim().toUpperCase(), phone = phoneIn.value.trim();
    let ok = true;
    if (!/^[A-Z0-9]{1,4}-\d{3,4}$/.test(token)) { markInvalid(tokenIn); ok = false; }
    if (!PHONE.test(phone)) { markInvalid(phoneIn); ok = false; }
    if (!ok) { lmsg.className = "form-msg err"; lmsg.textContent = tr("Enter your token (like CA-123) and the 10-digit mobile number you booked with."); return; }
    lmsg.className = "form-msg"; lmsg.textContent = tr("Looking up your booking…");
    api("/api/booking/lookup", { token, phone }).then((d) => {
      cred = { token, phone }; booking = d.booking; notice = "";
      lmsg.textContent = "";
      draw();
      out.focus({ preventScroll: true });
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch((err) => { out.hidden = true; lmsg.className = "form-msg err"; lmsg.textContent = err.message; });
  });

  function card() {
    const b = booking;
    const hist = (b.history || []).map((h) => {
      const dt = new Date(h.at);
      // Hindi: the same short month names as the date tiles (browsers spell some hi-IN months differently)
      const at = LANG === "hi" ? `${dt.getDate()} ${MON[dt.getMonth()]}, ${dt.toLocaleTimeString("hi-IN", { hour: "numeric", minute: "2-digit" })}` : dt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      if (h.action === "rescheduled") return `<li>${esc(at)}: ${esc(tr("moved from {from} to {to}", { from: h.from, to: h.to }))}</li>`;
      return `<li>${esc(at)}: ${esc(tr(ACTIONS[h.action] || h.action))}</li>`;
    }).join("");
    const STATUS = { new: "Booked", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", "no-show": "No show" };
    return `<div class="mb-card" aria-live="polite">
      <div class="mb-card__top"><h2>${b.patient ? esc(tr("{name}'s visit", { name: b.patient })) : tr("Your visit")}</h2><span class="mb-token" aria-label="${esc(tr("Token {token}", { token: b.token }))}">${esc(b.token)}</span></div>
      ${notice ? `<p class="mb-done" role="status">${esc(notice)}</p><br>` : ""}
      <dl class="mb-rows">
        <div><dt>${tr("Doctor")}</dt><dd>${esc(b.doctor)}<br><small>${esc(b.dept || "")}</small></dd></div>
        <div><dt>${tr("Status")}</dt><dd><span class="mb-status mb-status--${esc(b.status)}">${esc(STATUS[b.status] ? tr(STATUS[b.status]) : b.status.charAt(0).toUpperCase() + b.status.slice(1).replace("-", " "))}</span></dd></div>
        <div><dt>${tr("Date")}</dt><dd>${esc(b.dateLabel || label(b.date))}</dd></div>
        <div><dt>${tr("Time")}</dt><dd class="mono">${esc(b.slot)}</dd></div>
        <div><dt>${tr("Consultation")}</dt><dd>${esc(b.type === "Video" ? tr("Video call") : tr("At the hospital"))}</dd></div>
        ${b.fee ? `<div><dt>${tr("Fee")}</dt><dd>₹${esc(Number(b.fee).toLocaleString("en-IN"))}</dd></div>` : ""}
      </dl>
      ${b.canChange ? `<div class="mb-actions"><button type="button" class="btn btn--accent" data-act="reschedule">${tr("Change date or time")}</button><button type="button" class="btn btn--line" data-act="cancel">${tr("Cancel appointment")}</button></div>`
        : `<p class="mb-lock">${esc(b.lockReason)}${b.status === "cancelled" ? " " + tr('<a href="{href}">Book a new visit</a>.', { href: HOME + "#book" }) : ""}</p>`}
      ${hist ? `<div class="mb-history"><h3>${tr("Changes")}</h3><ul>${hist}</ul></div>` : ""}
    </div><div data-panel></div>`;
  }
  function draw() {
    out.hidden = false;
    out.innerHTML = card();
    $$("[data-act]", out).forEach((btn) => btn.addEventListener("click", () => (btn.dataset.act === "cancel" ? cancelPanel() : reschedulePanel())));
  }

  /* reschedule */
  function reschedulePanel() {
    const panel = $("[data-panel]", out);
    const r = booking.rules;
    const closed = (r.closedDays || []).map((d) => DAY_NAMES.findIndex((n) => n.startsWith(String(d).trim().toLowerCase().slice(0, 3)))).filter((i) => i >= 0);
    const days = Array.from({ length: r.days || 14 }, (_, i) => { const d = parse(r.today); d.setUTCDate(d.getUTCDate() + i); return iso(d); });
    let pick = { date: days.find((d) => !closed.includes(parse(d).getUTCDay())) || days[0], slot: null };
    let taken = [];
    panel.innerHTML = `<div class="mb-panel" role="region" aria-labelledby="rsTitle">
      <h3 id="rsTitle" tabindex="-1">${tr("Choose a new date and time")}</h3>
      <div class="field"><span>${tr("Date")}</span><div class="dates" data-dates></div></div>
      <div class="field"><span>${tr("Time")}</span><div class="slots" data-slots aria-live="polite"></div></div>
      <div class="mb-btns"><button type="button" class="btn btn--accent" data-go>${tr("Move my appointment")}</button><button type="button" class="btn btn--line" data-close>${tr("Keep current time")}</button></div>
      <p class="form-msg" data-msg role="status"></p></div>`;
    const datesEl = $("[data-dates]", panel), slotsEl = $("[data-slots]", panel), msg = $("[data-msg]", panel);
    const drawDates = () => {
      datesEl.innerHTML = days.map((d, i) => {
        const dt = parse(d), off = closed.includes(dt.getUTCDay()), on = d === pick.date;
        return `<button type="button" class="date${on ? " is-active" : ""}" data-d="${d}" aria-pressed="${on}" ${off ? `disabled title="${esc(tr("OPD is closed on this day"))}"` : ""}><small>${i === 0 ? tr("Today") : DAY[dt.getUTCDay()]}</small><b>${dt.getUTCDate()}</b><small>${MON[dt.getUTCMonth()]}</small></button>`;
      }).join("");
    };
    const drawSlots = () => {
      const groups = { Morning: [], Afternoon: [], Evening: [] };
      for (const s of r.slots) {
        const m = slotMin(s);
        const past = pick.date === r.today && m <= r.nowMinutes + (r.leadMinutes || 30);
        const isCur = pick.date === booking.date && s === booking.slot;
        const off = past || taken.includes(s) || isCur;
        const g = m < 720 ? "Morning" : m < 960 ? "Afternoon" : "Evening";
        groups[g].push(`<button type="button" class="slot${pick.slot === s ? " is-active" : ""}${isCur ? " is-current" : ""}" data-s="${esc(s)}" aria-pressed="${pick.slot === s}" ${off ? "disabled" : ""}${isCur ? ` title="${esc(tr("Your current time"))}"` : ""}>${esc(s)}</button>`);
      }
      slotsEl.innerHTML = Object.entries(groups).filter(([, v]) => v.length).map(([g, v]) => `<div class="slot-group"><small>${tr(g)}</small><div>${v.join("")}</div></div>`).join("");
    };
    const loadTaken = () => {
      const want = pick.date;
      taken = [];
      drawSlots();
      fetch(`/api/slots?doctor=${encodeURIComponent(booking.doctor)}&date=${want}`).then((x) => x.json()).then((d) => {
        if (want !== pick.date) return;
        taken = d.taken || [];
        if (pick.slot && taken.includes(pick.slot)) pick.slot = null;
        drawSlots();
      }).catch(() => {});
    };
    datesEl.addEventListener("click", (e) => {
      const b = e.target.closest(".date"); if (!b || b.disabled) return;
      pick = { date: b.dataset.d, slot: null };
      drawDates(); loadTaken(); msg.textContent = "";
      $(`.date[data-d="${b.dataset.d}"]`, datesEl)?.focus({ preventScroll: true });
    });
    slotsEl.addEventListener("click", (e) => {
      const b = e.target.closest(".slot"); if (!b || b.disabled) return;
      pick.slot = b.dataset.s;
      $$(".slot", slotsEl).forEach((x) => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      msg.textContent = "";
    });
    $("[data-close]", panel).addEventListener("click", () => { panel.innerHTML = ""; $("[data-act=reschedule]", out)?.focus(); });
    $("[data-go]", panel).addEventListener("click", (e) => {
      if (!pick.slot) { msg.className = "form-msg err"; msg.textContent = tr("Pick one of the open times."); return; }
      const btn = e.currentTarget; btn.disabled = true;
      msg.className = "form-msg"; msg.textContent = tr("Moving your appointment…");
      api("/api/booking/reschedule", { ...cred, date: pick.date, slot: pick.slot }).then((d) => {
        booking = d.booking;
        cred.token = booking.token;
        notice = tr("Done. Your visit is now on {date} at {time}.", { date: booking.dateLabel, time: booking.slot }) + (booking.notify ? " " + tr("We'll send the new details to your mobile.") : "");
        draw();
        $(".mb-card h2", out)?.setAttribute("tabindex", "-1");
        $(".mb-card h2", out)?.focus();
      }).catch((err) => {
        btn.disabled = false;
        msg.className = "form-msg err"; msg.textContent = err.message;
        if (err.status === 409) loadTaken();
      });
    });
    drawDates(); loadTaken();
    $("#rsTitle", panel).focus({ preventScroll: true });
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* cancel */
  function cancelPanel() {
    const panel = $("[data-panel]", out);
    // the reason is stored in English for the staff; the patient sees it in the page language
    const reasons = ["I'm feeling better", "I can't make it at this time", "I booked another doctor or time", "Other"];
    panel.innerHTML = `<div class="mb-panel" role="region" aria-labelledby="cnTitle">
      <h3 id="cnTitle" tabindex="-1">${tr("Cancel this appointment")}</h3>
      <fieldset class="mb-reasons"><legend>${tr("Why are you cancelling?")}</legend>
        ${reasons.map((r, i) => `<label><input type="radio" name="cnReason" value="${esc(r)}"${i === 0 ? " checked" : ""}> ${esc(tr(r))}</label>`).join("")}
      </fieldset>
      <label class="field" data-other hidden><span>${tr("Tell us more")} <em>${tr("(optional)")}</em></span><textarea rows="2" maxlength="250"></textarea></label>
      <div class="mb-btns"><button type="button" class="btn btn--danger" data-ask>${tr("Cancel appointment")}</button><button type="button" class="btn btn--line" data-close>${tr("Keep it")}</button></div>
      <div data-confirm></div>
      <p class="form-msg" data-msg role="status"></p></div>`;
    const other = $("[data-other]", panel), msg = $("[data-msg]", panel), conf = $("[data-confirm]", panel);
    panel.addEventListener("change", (e) => { if (e.target.name === "cnReason") other.hidden = e.target.value !== "Other"; });
    $("[data-close]", panel).addEventListener("click", () => { panel.innerHTML = ""; $("[data-act=cancel]", out)?.focus(); });
    $("[data-ask]", panel).addEventListener("click", () => {
      // in-page confirmation (no browser pop-up)
      conf.innerHTML = `<div class="mb-confirm" role="alertdialog" aria-labelledby="cnQ"><p id="cnQ">${esc(tr("Cancel your visit with {doctor} on {date} at {time}? The slot will be released to other patients.", { doctor: booking.doctor, date: booking.dateLabel, time: booking.slot }))}</p>
        <div class="btn-row"><button type="button" class="btn btn--danger btn--sm" data-yes>${tr("Yes, cancel it")}</button><button type="button" class="btn btn--line btn--sm" data-no>${tr("No, go back")}</button></div></div>`;
      $("[data-no]", conf).focus();
      $("[data-no]", conf).addEventListener("click", () => { conf.innerHTML = ""; $("[data-ask]", panel).focus(); });
      $("[data-yes]", conf).addEventListener("click", (e) => {
        const btn = e.currentTarget; btn.disabled = true;
        let reason = $("input[name=cnReason]:checked", panel).value;
        const more = $("textarea", other).value.trim();
        if (reason === "Other") reason = more ? "Other: " + more : "Other";
        msg.className = "form-msg"; msg.textContent = tr("Cancelling…");
        api("/api/booking/cancel", { ...cred, reason }).then((d) => {
          booking = d.booking;
          notice = tr("Your appointment is cancelled.") + (booking.notify ? " " + tr("We'll send a confirmation to your mobile.") : "");
          draw();
          $(".mb-card h2", out)?.setAttribute("tabindex", "-1");
          $(".mb-card h2", out)?.focus();
        }).catch((err) => { btn.disabled = false; msg.className = "form-msg err"; msg.textContent = err.message; });
      });
    });
    $("#cnTitle", panel).focus({ preventScroll: true });
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
})();
