/* ============================================================
   HUD layer — live readout, keyboard nav, Konami "overclock",
   click spark bursts, project-thumbnail tilt.
   Purely additive: nothing here mutates existing behaviour.
   ============================================================ */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   1.  LIVE HUD READOUT
   ============================================================ */
(function hud(){
  const fpsEl = document.getElementById("hudFps");
  const scrollEl = document.getElementById("hudScroll");
  const posEl = document.getElementById("hudPos");
  const gpuEl = document.getElementById("hudGpu");
  if (!fpsEl) return;

  // GPU / context label
  try {
    const c = document.createElement("canvas");
    gpuEl.textContent = c.getContext("webgl2") ? "WEBGL2" : (c.getContext("webgl") ? "WEBGL" : "CPU");
  } catch(_){ gpuEl.textContent = "WEBGL"; }

  let mx = 0, my = 0;
  addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; }, { passive:true });

  let frames = 0, lastT = performance.now(), fps = 0;
  function loop(now){
    requestAnimationFrame(loop);
    frames++;
    if (now - lastT >= 500){
      fps = Math.round((frames * 1000) / (now - lastT));
      frames = 0; lastT = now;
      fpsEl.textContent = fps;
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollEl.textContent = (max > 0 ? Math.round((scrollY / max) * 100) : 0) + "%";
    posEl.textContent = mx + "," + my;
  }
  requestAnimationFrame(loop);
})();

/* ============================================================
   2.  KEYBOARD NAVIGATION  (1–6 jump, g/G top/bottom)
   ============================================================ */
(function keynav(){
  const order = ["top", "about", "work", "chip", "stack", "contact"];
  function go(target){
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el);
    else el.scrollIntoView({ behavior: "smooth" });
  }
  addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key >= "1" && e.key <= "6"){ go(order[+e.key - 1]); }
    else if (e.key === "g"){ go("top"); }
    else if (e.key === "G"){ go("contact"); }
  });
})();

/* ============================================================
   3.  KONAMI CODE  →  OVERCLOCK MODE
   ============================================================ */
(function konami(){
  const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let pos = 0;
  const toast = document.getElementById("toast");
  let on = false;

  function showToast(msg){
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("is-on"), 2600);
  }
  function setOverclock(state){
    on = state;
    window.__OVERCLOCK = state;
    document.body.classList.toggle("overclock", state);
    if (window.__glTurbo) window.__glTurbo(state);
    if (state){
      document.documentElement.style.setProperty("--accent", "#ff7a59");
      if (window.__setGLAccent) window.__setGLAccent("#ff7a59");
      showToast("⚡ OVERCLOCK ENGAGED — WNS/TNS still 0");
    } else {
      document.documentElement.style.setProperty("--accent", "#7aa2f7");
      if (window.__setGLAccent) window.__setGLAccent("#7aa2f7");
      showToast("◦ nominal clocks restored");
    }
  }

  addEventListener("keydown", (e) => {
    const k = e.key;
    pos = (k === seq[pos] || k.toLowerCase() === seq[pos]) ? pos + 1 : (k === seq[0] ? 1 : 0);
    if (pos === seq.length){ pos = 0; setOverclock(!on); }
  });

  // also let the hint be discoverable: triple-click the brand reveals the hint
  const hint = document.getElementById("hudHint");
  if (hint) hint.textContent = "[1–6] jump · ↑↑↓↓←→←→ba";
})();

/* ============================================================
   4.  CLICK SPARK BURSTS
   ============================================================ */
(function sparks(){
  if (reduced) return;
  const cv = document.getElementById("spark");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  let dpr = Math.min(devicePixelRatio, 2), w, h;
  function size(){ w = cv.width = innerWidth*dpr; h = cv.height = innerHeight*dpr; cv.style.width = innerWidth+"px"; cv.style.height = innerHeight+"px"; }
  size(); addEventListener("resize", size);

  const parts = [];
  const accent = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7aa2f7";

  addEventListener("pointerdown", (e) => {
    const col = accent();
    const n = 14;
    for (let i = 0; i < n; i++){
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = 2 + Math.random() * 4;
      parts.push({ x:e.clientX*dpr, y:e.clientY*dpr, vx:Math.cos(a)*sp*dpr, vy:Math.sin(a)*sp*dpr, life:1, col });
    }
  });

  function loop(){
    requestAnimationFrame(loop);
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation = "lighter";
    for (let i = parts.length - 1; i >= 0; i--){
      const p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life -= 0.035;
      if (p.life <= 0){ parts.splice(i,1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2*dpr*p.life, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  loop();
})();

/* ============================================================
   5.  PROJECT FILTER
   ============================================================ */
(function filter(){
  const bar = document.getElementById("workFilter");
  if (!bar) return;
  const projects = [...document.querySelectorAll(".project[data-cat]")];
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    bar.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("is-active", b === btn));
    const f = btn.dataset.filter;
    projects.forEach(p => {
      const show = f === "all" || (p.dataset.cat || "").split(" ").includes(f);
      p.classList.toggle("is-filtered", !show);
    });
  });
})();

/* ============================================================
   6.  GUIDED AUTO-TOUR
   ============================================================ */
(function tour(){
  const btn = document.getElementById("tourBtn");
  if (!btn) return;
  const order = ["top", "about", "work", "chip", "stack", "contact"];
  let touring = false, idx = 0, timer = null;

  function go(id){
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: "smooth" });
  }
  function label(){
    btn.innerHTML = touring
      ? `<span class="tour-btn__ic">■</span> stop <span class="tour-btn__n">${idx + 1}/${order.length}</span>`
      : `<span class="tour-btn__ic">▶</span> guided tour`;
  }
  function step(){
    if (!touring) return;
    go(order[idx]); label();
    timer = setTimeout(() => {
      idx++;
      if (idx >= order.length) stop();
      else step();
    }, idx === 0 ? 2200 : 3800);
  }
  function start(){ touring = true; idx = 0; document.body.classList.add("touring"); step(); }
  function stop(){ touring = false; clearTimeout(timer); document.body.classList.remove("touring"); label(); }

  btn.addEventListener("click", () => (touring ? stop() : start()));
  // any manual input cancels the tour
  ["wheel", "touchmove"].forEach(ev =>
    addEventListener(ev, () => { if (touring) stop(); }, { passive: true }));

  label();
})();

/* ============================================================
   7.  PROJECT THUMBNAIL TILT
   ============================================================ */
(function tilt(){
  if (window.matchMedia("(pointer:coarse)").matches) return;
  document.querySelectorAll(".project").forEach(p => {
    const thumb = p.querySelector(".project__thumb");
    if (!thumb) return;
    p.addEventListener("pointermove", (e) => {
      const r = thumb.getBoundingClientRect();
      const rx = ((e.clientY - (r.top + r.height/2)) / r.height) * -10;
      const ry = ((e.clientX - (r.left + r.width/2)) / r.width) * 10;
      thumb.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    });
    p.addEventListener("pointerleave", () => { thumb.style.transform = ""; });
  });
})();
