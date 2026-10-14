/* =========================================================
   CareNova Hospitals – inner pages (doctors, specialities, health library, CMS pages)
   The home page uses js/main.js, which expects the home page's sections.
   This file wires the shared chrome only: theme and text size, header and mobile menu,
   emergency and reports pop-ups, newsletter, the assistant, and the doctor directory filter.
   ========================================================= */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (id) => `<svg class="ic"><use href="#${id}"/></svg>`;
  const root = document.documentElement;
  const CMS = window.CMS || { api: "/api" };

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  async function post(kind, body) {
    const r = await fetch(`${CMS.api}/submit/${kind}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "cms" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "We couldn't send that. Please try again or call us.");
    return data;
  }

  /* ---------- theme and text size (same keys as the home page) ---------- */
  const savedTheme = storage.get("cn-theme");
  if (savedTheme) root.dataset.theme = savedTheme;
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  $("#themeToggle")?.addEventListener("click", () => { root.dataset.theme = isDark() ? "light" : "dark"; storage.set("cn-theme", root.dataset.theme); });
  const sizes = [1, 1.1, 1.2];
  let fs = Math.max(0, sizes.indexOf(parseFloat(storage.get("cn-fs") || "1")));
  const applyFs = () => root.style.setProperty("--fs-scale", String(sizes[fs]));
  $("#fontToggle")?.addEventListener("click", () => { fs = (fs + 1) % sizes.length; storage.set("cn-fs", String(sizes[fs])); applyFs(); toast(`Text size ${Math.round(sizes[fs] * 100)}%`); });
  applyFs();

  /* ---------- header and mobile menu ---------- */
  const header = $("#header"), burger = $("#burger"), menu = $("#mobileMenu");
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    burger.innerHTML = icon(open ? "i-x" : "i-menu");
  }
  burger?.addEventListener("click", () => setMenu(menu.hidden));
  if (menu) $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- pop-ups (emergency, reports) ---------- */
  let lastFocus = null;
  const behind = () => $$("body > header, body > main, body > footer, body > .float-sos, body > .float-chat, body > #chat, body > .skip-link");
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    if (!m.classList.contains("open")) lastFocus = document.activeElement;
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    behind().forEach((el) => { el.inert = true; });
    setTimeout(() => $(".modal__close", m)?.focus(), 30);
  }
  function closeModal(m) {
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    if (!$(".modal.open")) { document.body.classList.remove("no-scroll"); behind().forEach((el) => { el.inert = false; }); }
    lastFocus?.focus?.();
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      const m = $(".modal.open");
      if (!m) return;
      const items = $$("a[href], button:not([disabled]), input:not([disabled]), select, textarea", m).filter((el) => el.getClientRects().length);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.key !== "Escape") return;
    $$(".modal.open").forEach(closeModal);
    if (chat?.classList.contains("open")) toggleChat(false);
    if (menu && !menu.hidden) { const inMenu = menu.contains(document.activeElement); setMenu(false); if (inMenu) burger.focus(); }
  });

  $("#shareLoc")?.addEventListener("click", () => {
    const msg = $("#locMsg");
    if (!navigator.geolocation) { msg.className = "form-msg err"; msg.textContent = "This device can't share location. Please call us."; return; }
    msg.className = "form-msg"; msg.textContent = "Finding your location…";
    navigator.geolocation.getCurrentPosition(
      (p) => { msg.className = "form-msg ok"; msg.textContent = `Location shared (${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}). Our ER team will call you back.`; },
      () => { msg.className = "form-msg err"; msg.textContent = "We couldn't get your location. Please call 1800-123-4567."; },
      { timeout: 8000 });
  });

  /** A form's consent box (added by the privacy module) must be ticked when it is there. */
  function consentOk(form) {
    const box = $("input[name=consent]", form);
    if (!box || box.checked) return true;
    const lab = box.closest(".consent") || box.parentElement;
    lab.classList.add("invalid");
    box.addEventListener("change", () => lab.classList.remove("invalid"), { once: true });
    return false;
  }

  $("#reportForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target, msg = $("#reportMsg"), uhid = $("#rUhid"), ph = $("#rPhone");
    if (uhid.value.trim().length < 5 || !/^[6-9]\d{9}$/.test(ph.value.trim())) { msg.className = "form-msg err"; msg.textContent = "Enter your UHID and a 10-digit mobile number."; return; }
    if (!consentOk(f)) { msg.className = "form-msg err"; msg.textContent = "Tick the box to agree to the privacy policy."; return; }
    msg.className = "form-msg"; msg.textContent = "Sending…";
    post("report", { uhid: uhid.value.trim(), phone: ph.value.trim(), consent: true })
      .then(() => { msg.className = "form-msg ok"; msg.textContent = `Request received. We'll send your reports to ******${ph.value.trim().slice(-4)}.`; })
      .catch((err) => { msg.className = "form-msg err"; msg.textContent = err.message; });
  });

  $("#newsletter")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("input[type=email]", e.target);
    if (!inp.checkValidity() || !inp.value.trim()) { toast("Enter a valid email address."); return; }
    post("subscribe", { email: inp.value.trim(), consent: true })
      .then(() => { inp.value = ""; toast("Subscribed. The next issue arrives on the 1st."); })
      .catch((err) => toast(err.message));
  });

  /* ---------- assistant ---------- */
  const chat = $("#chat"), chatBody = $("#chatBody"), chatBtn = $("#chatToggle");
  const RULES = typeof CHAT_RULES !== "undefined" ? CHAT_RULES : [];
  // replies link to home-page sections ("#book"): from here they go to the home page
  const homeLinks = (html) => String(html).replace(/href="#([a-z][\w-]*)"/gi, 'href="/#$1"');
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
    const rule = RULES.find((r) => (r.k || []).some((k) => q.includes(k)));
    setTimeout(() => {
      t.classList.remove("msg--typing");
      t.innerHTML = rule ? homeLinks(rule.a) : "I don't have an answer for that yet. Call our helpdesk on <b>+91 98765 43210</b>, or tap one of the options below.";
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 600 + Math.random() * 400);
  }
  function toggleChat(open) {
    if (!chat) return;
    const had = !open && chat.contains(document.activeElement);
    chat.classList.toggle("open", open);
    chat.setAttribute("aria-hidden", String(!open));
    chatBtn.setAttribute("aria-expanded", String(open));
    if (open && !chatStarted) { chatStarted = true; addMsg("Namaste. I'm Nova, CareNova's assistant. What can I help you with?"); }
    if (open) setTimeout(() => $("#chatInput")?.focus(), 30);
    if (had) chatBtn.focus();
  }
  if (chat && chatBtn && chatBody) {
    chatBtn.addEventListener("click", () => toggleChat(!chat.classList.contains("open")));
    const quick = $("#chatQuick");
    if (quick) {
      quick.innerHTML = ["Book appointment", "Emergency", "Health packages", "Insurance", "OPD timings", "WhatsApp"].map((q) => `<button type="button">${q}</button>`).join("");
      quick.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; addMsg(esc(b.textContent), "user"); botReply(b.textContent); });
    }
    $("#chatForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = $("#chatInput"), v = inp.value.trim();
      if (!v) return;
      addMsg(esc(v), "user");
      inp.value = "";
      botReply(v);
    });
  }

  /* ---------- delegated actions ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open], [data-open-chat], [data-close], [data-video-book]");
    if (!t) return;
    if (t.dataset.open) { e.preventDefault(); openModal(t.dataset.open); return; }
    if (t.hasAttribute("data-close")) { const m = t.closest(".modal"); if (m) closeModal(m); return; }
    if (t.hasAttribute("data-open-chat")) { toggleChat(true); return; }
    if (t.hasAttribute("data-video-book")) { e.preventDefault(); location.href = "/#book?video=1"; }
  });

  /* ---------- doctor directory: search and quick filters (the page works without them) ---------- */
  const search = $("[data-filter]");
  if (search) {
    const cards = $$(search.dataset.filter);
    const flags = $$("[data-filter-flag]");
    const empty = $("#dirEmpty");
    const apply = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach((c) => {
        const ok = (!q || (c.dataset.doc || c.textContent.toLowerCase()).includes(q)) && flags.every((f) => !f.checked || c.dataset[f.dataset.filterFlag] === "1");
        c.hidden = !ok;
        if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    };
    [search, ...flags].forEach((el) => el.addEventListener("input", apply));
    apply();
  }
})();
