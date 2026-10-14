/* =========================================================
   CareNova Hospitals – header, footer and modals on inner pages
   (legal pages, manage booking). The home page uses js/main.js instead.
   ========================================================= */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  };
  const root = document.documentElement;
  /* i18n: window.I18N (set by the server on Hindi pages) maps English text to the page language */
  const I18N = window.I18N || {};
  const tr = (s, v) => { let r = Object.prototype.hasOwnProperty.call(I18N, s) ? I18N[s] : s; if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); return r; };
  const LANG = (window.CMS && window.CMS.lang) || "en";

  /* toast */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }
  window.CNShell = { toast };

  /* theme and text size (same keys as the home page) */
  const savedTheme = storage.get("cn-theme");
  if (savedTheme) root.dataset.theme = savedTheme;
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  $("#themeToggle")?.addEventListener("click", () => { root.dataset.theme = isDark() ? "light" : "dark"; storage.set("cn-theme", root.dataset.theme); });
  const sizes = [1, 1.1, 1.2];
  let fs = Math.max(0, sizes.indexOf(parseFloat(storage.get("cn-fs") || "1")));
  const applyFs = () => root.style.setProperty("--fs-scale", String(sizes[fs]));
  $("#fontToggle")?.addEventListener("click", () => { fs = (fs + 1) % sizes.length; storage.set("cn-fs", String(sizes[fs])); applyFs(); toast(tr("Text size {n}%", { n: Math.round(sizes[fs] * 100) })); });
  applyFs();

  /* header and mobile menu */
  const header = $("#header"), burger = $("#burger"), menu = $("#mobileMenu");
  const iconSvg = (id) => `<svg class="ic"><use href="#${id}"/></svg>`;
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    burger.innerHTML = iconSvg(open ? "i-x" : "i-menu");
  }
  burger?.addEventListener("click", () => setMenu(menu.hidden));
  if (menu) $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const year = $("#year"); if (year) year.textContent = String(new Date().getFullYear());

  /* modals (emergency pop-up) */
  let lastFocus = null;
  const behind = () => $$("body > header, body > main, body > footer, body > .float-sos, body > .skip-link");
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    m.classList.add("open"); m.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    behind().forEach((el) => { el.inert = true; });
    setTimeout(() => $(".modal__close", m)?.focus(), 30);
  }
  function closeModal(m) {
    m.classList.remove("open"); m.setAttribute("aria-hidden", "true");
    if (!$(".modal.open")) { document.body.classList.remove("no-scroll"); behind().forEach((el) => { el.inert = false; }); }
    lastFocus?.focus?.();
  }
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) { e.preventDefault(); openModal(opener.dataset.open); return; }
    const closer = e.target.closest(".modal [data-close]");
    if (closer) closeModal(closer.closest(".modal"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { const m = $(".modal.open"); if (m) closeModal(m); else if (menu && !menu.hidden) { setMenu(false); burger.focus(); } }
  });
  $("#shareLoc")?.addEventListener("click", () => {
    const msg = $("#locMsg");
    if (!navigator.geolocation) { msg.className = "form-msg err"; msg.textContent = tr("This device can't share location. Please call us."); return; }
    msg.className = "form-msg"; msg.textContent = tr("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => { msg.className = "form-msg ok"; msg.textContent = tr("Location shared ({lat}, {lng}). Our ER team will call you back.", { lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) }); },
      () => { msg.className = "form-msg err"; msg.textContent = tr("We couldn't get your location. Please call 1800-123-4567."); },
      { timeout: 8000 });
  });

  /* newsletter in the footer */
  $("#newsletter")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("input[type=email]", e.target);
    if (!inp.checkValidity() || !inp.value.trim()) { toast(tr("Enter a valid email address.")); return; }
    fetch("/api/submit/subscribe", { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "cms" }, body: JSON.stringify({ email: inp.value.trim(), consent: true, ...(LANG === "en" ? {} : { lang: LANG }) }) })
      .then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d.error || tr("We couldn't subscribe you. Please try again.")); }))
      .then(() => { inp.value = ""; toast(tr("Subscribed. The next issue arrives on the 1st.")); })
      .catch((err) => toast(err.message));
  });
})();
