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
  $("#fontToggle")?.addEventListener("click", () => { fs = (fs + 1) % sizes.length; storage.set("cn-fs", String(sizes[fs])); applyFs(); toast(`Text size ${Math.round(sizes[fs] * 100)}%`); });
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
    if (!navigator.geolocation) { msg.className = "form-msg err"; msg.textContent = "This device can't share location. Please call us."; return; }
    msg.className = "form-msg"; msg.textContent = "Finding your location…";
    navigator.geolocation.getCurrentPosition(
      (p) => { msg.className = "form-msg ok"; msg.textContent = `Location shared (${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}). Our ER team will call you back.`; },
      () => { msg.className = "form-msg err"; msg.textContent = "We couldn't get your location. Please call 1800-123-4567."; },
      { timeout: 8000 });
  });

  /* newsletter in the footer */
  $("#newsletter")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("input[type=email]", e.target);
    if (!inp.checkValidity() || !inp.value.trim()) { toast("Enter a valid email address."); return; }
    fetch("/api/submit/subscribe", { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "cms" }, body: JSON.stringify({ email: inp.value.trim(), consent: true }) })
      .then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d.error || "We couldn't subscribe you. Please try again."); }))
      .then(() => { inp.value = ""; toast("Subscribed. The next issue arrives on the 1st."); })
      .catch((err) => toast(err.message));
  });
})();
