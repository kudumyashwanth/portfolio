/* ============================================================
   EXTRA — advanced interactions
   char-split · cursor trail · scroll rail + accent shift ·
   die-shot generator · floorplan · metrics · case-study modal
   ============================================================ */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse  = window.matchMedia("(pointer: coarse)").matches;

/* ============================================================
   1.  PROCEDURAL "DIE-SHOT" SVG GENERATOR  (seeded per project)
   ============================================================ */
function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dieShot(seed, accent, size = 300){
  const r = mulberry32(seed * 9973 + 7);
  const g = size, pad = 14, inner = g - pad * 2;
  let blocks = "", traces = "", pads = "";

  // recursive block partition
  const rects = [];
  function split(x, y, w, h, depth){
    if (depth <= 0 || (w < inner*0.13 && h < inner*0.13) || (depth < 3 && r() < 0.12)){
      rects.push([x, y, w, h]); return;
    }
    const horiz = w > h ? r() < 0.75 : r() < 0.25;
    const f = 0.34 + r() * 0.32;
    const gap = 3;
    if (horiz){
      const w1 = w * f;
      split(x, y, w1 - gap/2, h, depth-1);
      split(x + w1 + gap/2, y, w - w1 - gap/2, h, depth-1);
    } else {
      const h1 = h * f;
      split(x, y, w, h1 - gap/2, depth-1);
      split(x, y + h1 + gap/2, w, h - h1 - gap/2, depth-1);
    }
  }
  split(pad, pad, inner, inner, 6);
  rects.forEach(([x,y,w,h]) => {
    const fill = r() < 0.28 ? accent : "none";
    const op = r() * 0.45 + 0.18;
    blocks += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(w,2).toFixed(1)}" height="${Math.max(h,2).toFixed(1)}" rx="1.2" fill="${fill}" fill-opacity="${(fill==='none'?0:op).toFixed(2)}" stroke="${accent}" stroke-opacity="0.55" stroke-width="0.8"/>`;
    // micro routing inside larger blocks
    if (w > 22 && h > 10 && r() < 0.75){
      const n = 1 + Math.floor(r()*3);
      for (let j=1;j<=n;j++){
        const ly = (y + h*j/(n+1)).toFixed(1);
        traces += `<line x1="${(x+2.5).toFixed(1)}" y1="${ly}" x2="${(x+w-2.5).toFixed(1)}" y2="${ly}" stroke="${accent}" stroke-opacity="0.28" stroke-width="0.6"/>`;
      }
    }
  });
  // bonding pads around the ring
  for (let i=0;i<10;i++){
    const t = i/10;
    pads += `<rect x="${(pad + t*inner).toFixed(1)}" y="4" width="6" height="4" fill="${accent}" fill-opacity="0.5"/>`;
    pads += `<rect x="${(pad + t*inner).toFixed(1)}" y="${g-8}" width="6" height="4" fill="${accent}" fill-opacity="0.5"/>`;
    pads += `<rect x="4" y="${(pad + t*inner).toFixed(1)}" width="4" height="6" fill="${accent}" fill-opacity="0.5"/>`;
    pads += `<rect x="${g-8}" y="${(pad + t*inner).toFixed(1)}" width="4" height="6" fill="${accent}" fill-opacity="0.5"/>`;
  }
  return `<svg viewBox="0 0 ${g} ${g}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${g}" height="${g}" fill="#06070d"/>
    <rect x="${pad-2}" y="${pad-2}" width="${inner+4}" height="${inner+4}" fill="none" stroke="${accent}" stroke-opacity="0.4" stroke-width="0.8"/>
    ${pads}${blocks}${traces}
  </svg>`;
}

document.querySelectorAll(".project__thumb[data-die]").forEach(el => {
  const seed = parseInt(el.dataset.die, 10);
  const accent = el.closest(".project").dataset.accent || "#7aa2f7";
  el.innerHTML = dieShot(seed, accent);
});

/* ============================================================
   2.  HERO PER-LETTER SPLIT
   ============================================================ */
(function splitHero(){
  document.querySelectorAll(".hero__title .word").forEach((word, wi) => {
    const text = word.textContent;
    word.textContent = "";
    [...text].forEach((ch, ci) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      span.style.transitionDelay = (wi * 0.25 + ci * 0.04) + "s";
      word.appendChild(span);
    });
  });
})();

/* ============================================================
   3.  CURSOR TRAIL (canvas)
   ============================================================ */
(function trail(){
  if (coarse || reduced) return;
  const cv = document.getElementById("cursorTrail");
  const ctx = cv.getContext("2d");
  let w, h, dpr = Math.min(devicePixelRatio, 2);
  function size(){ w = cv.width = innerWidth*dpr; h = cv.height = innerHeight*dpr;
    cv.style.width = innerWidth+"px"; cv.style.height = innerHeight+"px"; }
  size(); addEventListener("resize", size);

  const pts = [];
  let mx = innerWidth/2, my = innerHeight/2;
  addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; }, {passive:true});

  const accent = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7aa2f7";
  function loop(){
    requestAnimationFrame(loop);
    pts.push({ x:mx, y:my, life:1 });
    if (pts.length > 22) pts.shift();
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation = "lighter";
    for (let i=0;i<pts.length;i++){
      const p = pts[i]; p.life *= 0.92;
      const rad = (i / pts.length) * 5 * dpr;
      ctx.beginPath();
      ctx.fillStyle = accent();
      ctx.globalAlpha = (i / pts.length) * 0.25;
      ctx.arc(p.x*dpr, p.y*dpr, rad, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  loop();
})();

/* ============================================================
   4.  SCROLL RAIL  +  ACCENT SHIFTING
   ============================================================ */
(function scrollRail(){
  const fill = document.getElementById("scrollFill");
  const railSec = document.getElementById("railSection");
  const labels = {
    hero:"00 / intro", about:"02 / about", work:"01 / work",
    anatomy:"01.5 / aurora", stack:"03 / stack", contact:"04 / contact"
  };
  const sections = [...document.querySelectorAll("section[id]")];
  const projects = [...document.querySelectorAll(".project[data-accent]")];
  const DEFAULT = "#7aa2f7";
  let curAccent = DEFAULT;

  function setAccent(hex){
    if (window.__OVERCLOCK) hex = "#ff7a59";   // overclock locks a hot accent
    if (hex === curAccent) return;
    curAccent = hex;
    document.documentElement.style.setProperty("--accent", hex);
    if (window.__setGLAccent) window.__setGLAccent(hex);
  }

  let ticking = false;
  function update(){
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    fill.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";

    const mid = y + innerHeight / 2;

    // rail label = section containing viewport middle
    let active = null;
    for (const s of sections){
      const top = s.offsetTop, bot = top + s.offsetHeight;
      if (mid >= top && mid < bot){ active = s; break; }
    }
    if (active && railSec){
      railSec.textContent = labels[active.id] || active.id;
    }

    // accent = nearest project to viewport middle while inside #work; else section base
    let acc = DEFAULT;
    if (active && active.id === "work"){
      let best = Infinity, bestAcc = DEFAULT;
      projects.forEach(p => {
        const rect = p.getBoundingClientRect();
        const center = rect.top + rect.height/2;
        const d = Math.abs(center - innerHeight/2);
        if (d < best){ best = d; bestAcc = p.dataset.accent; }
      });
      acc = bestAcc;
    } else if (active && active.id === "anatomy"){ acc = "#7aa2f7"; }
    else if (active && active.id === "stack"){ acc = "#7dcfff"; }
    else if (active && active.id === "contact"){ acc = "#bb9af7"; }
    setAccent(acc);
  }
  function onScroll(){ if (!ticking){ ticking = true; requestAnimationFrame(update); } }
  addEventListener("scroll", onScroll, { passive:true });
  addEventListener("resize", onScroll);
  update();
})();

/* ============================================================
   5.  AURORA FLOORPLAN — hover readout + tooltip
   ============================================================ */
(function floorplan(){
  const fp = document.getElementById("floorplan");
  if (!fp) return;
  const tip = document.getElementById("floorTip");
  const rk = document.querySelector(".anatomy__readout-key");
  const rv = document.querySelector(".anatomy__readout-val");
  const blocks = fp.querySelectorAll(".fp-block");

  blocks.forEach(b => {
    b.addEventListener("pointerenter", () => {
      blocks.forEach(x => x.classList.remove("is-active"));
      b.classList.add("is-active");
      if (rk) rk.textContent = b.dataset.name;
      if (rv) rv.textContent = b.dataset.info;
      tip.textContent = b.dataset.info;
      tip.classList.add("is-on");
    });
    b.addEventListener("pointermove", (e) => {
      tip.style.left = e.clientX + "px";
      tip.style.top  = e.clientY + "px";
    });
    b.addEventListener("pointerleave", () => {
      b.classList.remove("is-active");
      tip.classList.remove("is-on");
    });
  });
})();

/* ============================================================
   6.  METRIC VALUE COUNTERS
   ============================================================ */
(function metrics(){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const target = parseFloat(el.dataset.metric);
      const suffix = el.dataset.suffix || "";
      const dur = 1300, start = performance.now();
      function step(now){
        const t = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(e * target) + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: 0.8 });
  document.querySelectorAll("[data-metric]").forEach(el => io.observe(el));
})();

/* ============================================================
   7.  PROJECT CASE-STUDY MODAL
   ============================================================ */
const DETAILS = {
  aurora: {
    index:"01 / case study", title:"Aurora v1", tag:"RISC-V + AI ACCELERATOR SoC · RTL-TO-GDSII",
    copy:[
      "A multi-clock System-on-Chip pairing a Rocket RV64IMAC RISC-V CPU tile with a 4×4 systolic int16 matrix-multiply accelerator over an 8×8 AXI4 crossbar fabric — boot ROM, SRAM, UART, GPIO, timer and interrupt controller — carried through the complete RTL-to-GDSII flow.",
      "Bridged a 33 MHz CPU domain and a 50 MHz fabric/accelerator domain with dual asynchronous-FIFO clock-domain-crossing bridges, and hardened the CPU and accelerator into reusable AXI4 macros via a TileLink-to-AXI4 bridge.",
      "Resolved routing-congestion, power-grid/LVS and timing-closure issues, then verified full-SoC bring-up in simulation — it boots, runs a matrix multiply on the accelerator, reads results back over AXI, with zero traps. Closed the entire flow on commodity hardware with 100% open-source tools."
    ],
    stats:[["DIE AREA","41.25 mm²"],["STD CELLS","~130k"],["LVS","137,562 = 137,562"],["TIMING","WNS/TNS = 0"],["METAL STACK","5-layer"],["DRC","clean"]],
    meta:["SystemVerilog","AMBA AXI4","Rocket RV64IMAC","4×4 Systolic","Async-FIFO CDC","TileLink→AXI4","Verilator","Yosys","OpenLane/OpenROAD","Magic","netgen","KLayout","Sky130"],
    repo:"https://github.com/kudumyashwanth/aurora-v1"
  },
  neural: {
    index:"02 / case study", title:"Neural Accelerator", tag:"CNN INFERENCE ASIC · AXI4-STREAM",
    copy:[
      "A modular CNN inference accelerator — image preprocessing, a sequential MAC-based convolution engine, ReLU, pooling and a fully-connected layer — taken through a full RTL-to-GDSII ASIC flow.",
      "Built a 32-bit AXI4-Stream interface with ready/valid handshake and backpressure-aware pipeline stalling, using sequential MAC reuse for a deliberate area–performance tradeoff across parameterized RTL modules.",
      "Verified in Vivado and Cadence Xcelium — validating FSM transitions, AXI transactions, convolution correctness and pipeline synchronization before sign-off."
    ],
    stats:[["TARGET","100 MHz"],["CRITICAL PATH","1.08 ns"],["DIE / CORE","4.0 / 3.23 mm²"],["PHYS CELLS","~324k"],["WIRELENGTH","32,320 µm"],["DRC / LVS","0 / clean"]],
    meta:["SystemVerilog","AXI4-Stream","Sequential MAC","Vivado","Cadence Xcelium","OpenLane","Sky130"],
    repo:"https://github.com/kudumyashwanth/AI-Chip-Accelerator-for-Neural-Network-Processing-RTL--GDSII-"
  },
  rover: {
    index:"03 / case study", title:"The Thousand Sunny", tag:"AUTONOMOUS EXPLORATION ROVER · ROS 2",
    copy:[
      "An AI-driven 6WD exploration rover built around a Jetson Orin NX for on-board AI processing.",
      "A ROS 2 Humble navigation stack with SLAM (RTAB-Map, Cartographer) and multi-sensor fusion across IMU, LiDAR, RGBD and EKF.",
      "Deployed YOLOv8 and DeepLabV3+ optimized via TensorRT for real-time inference, with a hardware-in-loop test environment in NVIDIA Isaac Sim and a Flask telemetry dashboard over LoRa + Wi-Fi."
    ],
    stats:[["COMPUTE","Jetson Orin NX"],["DRIVE","6WD"],["NAV","ROS 2 Humble"],["PERCEPTION","YOLOv8 · DeepLabV3+"],["FUSION","IMU+LiDAR+RGBD+EKF"],["SIM","Isaac Sim"]],
    meta:["ROS 2","SLAM","RTAB-Map","Cartographer","TensorRT","Isaac Sim","Flask","LoRa"]
  },
  assistant: {
    index:"04 / case study", title:"Pocket Assistant", tag:"VOICE-CONTROLLED AI · ESP32 EMBEDDED",
    copy:[
      "A portable voice-controlled AI assistant integrating an ESP32 with an I²S microphone and audio amplifier, with interrupt-driven firmware for button-triggered audio capture.",
      "Buffered Wi-Fi API communication for AI response generation, with a real-time audio pipeline that keeps a stable capture → process → playback cycle.",
      "Reworked an open-source PCB to optimize power delivery and signal integrity, adding recovery logic and status indication for standalone stability."
    ],
    stats:[["MCU","ESP32"],["AUDIO IN","I²S mic"],["FIRMWARE","interrupt-driven"],["LINK","Wi-Fi API"],["HW","custom PCB rev"],["MODE","standalone"]],
    meta:["ESP32","C/C++","I²S","PCB Design","Wi-Fi","Real-time Audio"]
  },
  bridge: {
    index:"05 / case study", title:"AHB → APB Bridge", tag:"AMBA 4 PROTOCOL BRIDGE · VERIFICATION",
    copy:[
      "FSM-based protocol translation between a high-performance AHB bus and a low-speed APB bus, with wait-state handling and full handshake-timing compliance.",
      "Correct sequencing of HADDR, HWRITE, HREADY, PSEL, PENABLE and PREADY across the address, data and handshake phases.",
      "Verified with a constrained-random, assertion-driven testbench — achieving full functional coverage and zero handshake violations. (Built during my VLSI internship at Maven Silicon.)"
    ],
    stats:[["PROTOCOL","AMBA 4"],["STYLE","FSM bridge"],["TB","constrained-random"],["CHECKS","assertions"],["COVERAGE","full"],["VIOLATIONS","0"]],
    meta:["SystemVerilog","AMBA 4","AHB","APB","UVM-style TB","Functional Coverage"]
  }
};

(function modal(){
  const modal = document.getElementById("modal");
  if (!modal) return;
  const $ = (id) => document.getElementById(id);
  let lastFocus = null;

  function open(id, accent, dieSeed){
    const d = DETAILS[id]; if (!d) return;
    document.documentElement.style.setProperty("--accent", accent);
    if (window.__setGLAccent) window.__setGLAccent(accent);
    $("modalIndex").textContent = d.index;
    $("modalTitle").textContent = d.title;
    $("modalTag").textContent = d.tag;
    $("modalCopy").innerHTML = d.copy.map(p => `<p>${p}</p>`).join("");
    $("modalStats").innerHTML = d.stats.map(([k,v]) => `<li>${k}<b>${v}</b></li>`).join("");
    $("modalMeta").innerHTML = d.meta.map(m => `<li>${m}</li>`).join("");
    const repo = $("modalRepo");
    if (repo){
      if (d.repo){ repo.href = d.repo; repo.style.display = "inline-flex"; }
      else repo.style.display = "none";
    }
    $("modalDie").innerHTML = dieShot(dieSeed, accent, 340);
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("modal-open");
    if (window.__lenis) window.__lenis.stop();
  }
  function close(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
    if (window.__lenis) window.__lenis.start();
    if (lastFocus) lastFocus.focus?.();
  }

  document.querySelectorAll(".project[data-id]").forEach((p, i) => {
    p.addEventListener("click", () => open(p.dataset.id, p.dataset.accent, i + 1));
  });
  modal.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();

/* ============================================================
   8.  LIVE IST CLOCK
   ============================================================ */
(function clock(){
  const el = document.getElementById("clock");
  if (!el) return;
  function tick(){
    const t = new Date().toLocaleTimeString("en-GB", {
      timeZone:"Asia/Kolkata", hour:"2-digit", minute:"2-digit", second:"2-digit"
    });
    el.textContent = t + " IST";
  }
  tick(); setInterval(tick, 1000);
})();
