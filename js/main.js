/* ============================================================
   Interaction layer — preloader, smooth scroll (Lenis),
   custom cursor, scroll reveals, counters, magnetic links.
   GSAP + Lenis loaded from CDN with graceful fallback.
   ============================================================ */

/* ---------- dynamic CDN loaders (so the page still works if one fails) ---------- */
async function load(src){
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

let lenis = null;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

await Promise.allSettled([
  load("https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"),
  load("https://unpkg.com/gsap@3.12.5/dist/gsap.min.js"),
  load("https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js"),
]);

/* ============================================================
   PRELOADER
   ============================================================ */
(function preloader(){
  const pre = document.getElementById("preloader");
  const countEl = document.getElementById("count");
  const barFill = document.getElementById("barFill");
  const statusEl = document.getElementById("loadStatus");
  const stages = [
    "booting fabric…", "loading RTL…", "placing cells…",
    "routing metal…", "running STA…", "WNS/TNS = 0 · clean"
  ];
  let n = 0;
  const dur = reduced ? 200 : 2100;
  const start = performance.now();

  function step(now){
    const t = Math.min((now - start) / dur, 1);
    // ease-out
    const eased = 1 - Math.pow(1 - t, 3);
    n = Math.round(eased * 100);
    countEl.textContent = n;
    barFill.style.width = n + "%";
    statusEl.textContent = stages[Math.min(stages.length - 1, Math.floor(eased * stages.length))];
    if (t < 1) requestAnimationFrame(step);
    else finish();
  }

  let entered = false;
  function finish(){
    // arm the ENTER gate instead of auto-revealing
    setTimeout(() => {
      if (reduced){ enterSite(false); return; }   // skip the gate for reduced-motion
      statusEl.textContent = "ready — click to enter";
      pre.classList.add("is-armed");
    }, 200);
  }

  function enterSite(sound){
    if (entered) return;
    entered = true;
    pre.classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    if (sound && window.__enableSound) window.__enableSound();
    if (window.__glIntro) window.__glIntro();      // sync fabric fly-in to reveal
    window.dispatchEvent(new Event("app:ready"));
    startReveals();
  }

  const enterBtn = document.getElementById("enterBtn");
  const enterMute = document.getElementById("enterMute");
  if (enterBtn) enterBtn.addEventListener("click", () => enterSite(true));
  if (enterMute) enterMute.addEventListener("click", () => enterSite(false));

  requestAnimationFrame(step);
})();

/* ============================================================
   SMOOTH SCROLL (Lenis) + GSAP ScrollTrigger sync
   ============================================================ */
function initScroll(){
  if (reduced || typeof Lenis === "undefined") return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1.0, smoothWheel: true });
  window.__lenis = lenis;

  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined"){
    gsap.registerPlugin(ScrollTrigger);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  // smooth anchor jumps
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1){
        const el = document.querySelector(id);
        if (el){ e.preventDefault(); lenis.scrollTo(el, { offset: 0 }); }
      }
    });
  });
}
initScroll();

/* ============================================================
   SCROLL PROGRESS → WebGL + nav hide
   ============================================================ */
(function scrollLink(){
  const nav = document.getElementById("nav");
  let lastY = 0;
  function onScroll(y){
    const max = document.body.scrollHeight - window.innerHeight;
    const p = max > 0 ? y / max : 0;
    if (window.__setGLScroll) window.__setGLScroll(Math.min(p * 1.4, 1));

    // hide nav scrolling down, show scrolling up
    if (y > lastY && y > 400) nav.classList.add("is-hidden");
    else nav.classList.remove("is-hidden");
    lastY = y;
  }
  if (lenis) lenis.on("scroll", ({ scroll }) => onScroll(scroll));
  else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive:true });
})();

/* ============================================================
   SCROLL REVEALS + COUNTERS (IntersectionObserver)
   ============================================================ */
function startReveals(){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting){
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

  document.querySelectorAll("[data-reveal]").forEach((el, idx) => {
    // subtle stagger for siblings
    el.style.transitionDelay = ((idx % 6) * 0.05) + "s";
    io.observe(el);
  });

  // animated counters
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting){
        animateCount(en.target);
        cio.unobserve(en.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach(el => cio.observe(el));
}

function animateCount(el){
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || "";
  if (target === 0){ el.textContent = suffix || "0"; return; }
  const dur = 1200; const start = performance.now();
  function step(now){
    const t = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ============================================================
   CUSTOM CURSOR  (+ magnetic + state)
   ============================================================ */
(function cursor(){
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const cur = document.getElementById("cursor");
  let x = innerWidth/2, y = innerHeight/2, tx = x, ty = y;

  window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive:true });
  document.addEventListener("mouseleave", () => cur.classList.add("is-hidden"));
  document.addEventListener("mouseenter", () => cur.classList.remove("is-hidden"));

  function raf(){
    x += (tx - x) * 0.2; y += (ty - y) * 0.2;
    cur.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(raf);
  }
  raf();

  // hover states
  document.querySelectorAll("[data-cursor='link']").forEach(el => {
    el.addEventListener("mouseenter", () => cur.classList.add("is-link"));
    el.addEventListener("mouseleave", () => cur.classList.remove("is-link"));
  });
  document.querySelectorAll("[data-cursor='view']").forEach(el => {
    el.addEventListener("mouseenter", () => cur.classList.add("is-view"));
    el.addEventListener("mouseleave", () => cur.classList.remove("is-view"));
  });
})();

/* ============================================================
   PROJECT ACCENT — set per-card hover color from data-accent
   ============================================================ */
document.querySelectorAll(".project[data-accent]").forEach(p => {
  p.style.setProperty("--p-accent", p.dataset.accent);
});

/* ============================================================
   MAGNETIC ELEMENTS (nav cta, contact mail)
   ============================================================ */
(function magnetic(){
  if (window.matchMedia("(pointer: coarse)").matches) return;
  document.querySelectorAll(".nav__cta, .contact__mail").forEach(el => {
    const strength = 0.3;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width/2);
      const my = e.clientY - (r.top + r.height/2);
      el.style.transform = `translate(${mx*strength}px, ${my*strength}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
})();

/* ---------- year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- if reduced motion, reveal everything immediately ---------- */
if (reduced){
  document.body.classList.remove("is-loading");
  document.querySelectorAll("[data-reveal]").forEach(el => el.classList.add("is-in"));
  document.querySelectorAll("[data-count]").forEach(el => {
    el.textContent = (el.dataset.count === "0") ? (el.dataset.suffix || "0") : el.dataset.count + (el.dataset.suffix||"");
  });
}
