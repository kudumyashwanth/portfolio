/* ============================================================
   LEGENDARY layer
   · Web-Audio sound design (ambient + UI + whoosh + boot) + mute
   · text decode / scramble on reveal
   · scroll-velocity skew + chromatic aberration
   ============================================================ */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   1.  SOUND ENGINE  (fully synthesized — no audio files)
   ============================================================ */
const Sound = (() => {
  let ctx = null, master = null, ambientOn = false;
  let enabled = false;

  function ensure(){
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);
  }

  function startAmbient(){
    if (!ctx || ambientOn) return;
    ambientOn = true;
    const bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 0.7;
    lp.connect(bus);

    // detuned drone
    [55, 82.5, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.04 : 0.07;
      o.connect(g); g.connect(lp); o.start();
    });
    // slow filter movement
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lfoG = ctx.createGain(); lfoG.gain.value = 180;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();

    // airy noise pad
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const nbp = ctx.createBiquadFilter(); nbp.type = "bandpass"; nbp.frequency.value = 1200; nbp.Q.value = 0.5;
    const ng = ctx.createGain(); ng.gain.value = 0.015;
    noise.connect(nbp); nbp.connect(ng); ng.connect(bus); noise.start();
  }

  function blip(freq = 1100, dur = 0.05, vol = 0.05, type = "sine"){
    if (!enabled || !ctx) return;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(master); o.start(now); o.stop(now + dur + 0.02);
  }

  function whoosh(){
    if (!enabled || !ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    const now = ctx.currentTime;
    bp.frequency.setValueAtTime(300, now);
    bp.frequency.exponentialRampToValueAtTime(2600, now + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(now); src.stop(now + 0.42);
  }

  function bootChord(){
    if (!ctx) return;
    [440, 660, 880].forEach((f, i) => setTimeout(() => blip(f, 0.5, 0.04, "triangle"), i * 90));
  }

  function setEnabled(on){
    enabled = on;
    ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    if (on){ startAmbient(); }
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.linearRampToValueAtTime(on ? 0.9 : 0.0, now + 0.4);
    if (on) bootChord();
  }

  return {
    toggle(){ setEnabled(!enabled); return enabled; },
    isEnabled(){ return enabled; },
    blip, whoosh
  };
})();

/* ---- toggle button ---- */
(function soundToggle(){
  const btn = document.getElementById("soundToggle");
  if (!btn) return;
  const label = btn.querySelector(".sound-toggle__label");
  function reflect(on){
    btn.classList.toggle("is-off", !on);
    if (label) label.textContent = on ? "sound on" : "sound off";
  }
  btn.addEventListener("click", () => {
    const on = Sound.toggle();
    reflect(on);
    if (on) Sound.blip(1320, 0.06, 0.05);
  });
  // entry gate can switch sound on
  window.__enableSound = () => { if (!Sound.isEnabled()){ Sound.toggle(); reflect(true); } };
})();

/* ---- UI sounds wiring ---- */
(function uiSounds(){
  if (coarsePointer()) return;
  const hoverSel = '.nav__links a, .nav__cta, .project, .contact__mail, .fp-block, .sound-toggle, .rail--right a, .modal__close';
  document.querySelectorAll(hoverSel).forEach(el => {
    el.addEventListener("pointerenter", () => Sound.blip(1180 + Math.random()*180, 0.04, 0.035));
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest('.project, .nav__cta, .contact__mail, .modal__close')) Sound.blip(720, 0.09, 0.05, "triangle");
  });
  // whoosh on section enter
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting && en.intersectionRatio > 0.25) Sound.whoosh(); });
  }, { threshold: [0.25] });
  document.querySelectorAll("section").forEach((s, i) => { if (i > 0) io.observe(s); });
  function coarsePointer(){ return window.matchMedia("(pointer:coarse)").matches; }
})();

/* ============================================================
   2.  TEXT DECODE / SCRAMBLE on reveal
   ============================================================ */
(function decode(){
  if (reduced) return;
  const CH = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%<>/[]{}*+=";
  function run(el){
    const final = el.textContent;
    const len = final.length;
    let frame = 0; const total = 16;
    el.classList.add("decoding");
    const id = setInterval(() => {
      frame++;
      const shown = Math.floor((frame / total) * len);
      let out = "";
      for (let i = 0; i < len; i++){
        const c = final[i];
        if (c === " " || c === "\n" || i < shown) out += c;
        else out += CH[(Math.random() * CH.length) | 0];
      }
      el.textContent = out;
      if (frame >= total){ clearInterval(id); el.textContent = final; el.classList.remove("decoding"); }
    }, 28);
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting){ run(en.target); io.unobserve(en.target); } });
  }, { threshold: 0.6 });
  document.querySelectorAll(".section__index, .project__tag, .stack__col h4, .resume__time")
    .forEach(el => io.observe(el));
})();

/* ============================================================
   3.  SCROLL-VELOCITY SKEW + CHROMATIC ABERRATION
   ============================================================ */
(function skew(){
  if (reduced || window.matchMedia("(hover:none)").matches) return;  // skip on touch
  const main = document.querySelector("main");
  if (!main) return;
  let last = window.scrollY, vel = 0;
  function loop(){
    requestAnimationFrame(loop);
    const y = window.scrollY;
    const dv = y - last; last = y;
    vel += (dv - vel) * 0.18;
    const sk = Math.max(-2.4, Math.min(2.4, vel * 0.045));
    main.style.transform = `skewY(${sk.toFixed(3)}deg)`;
    const rgb = Math.min(Math.abs(vel) * 0.07, 4.5);
    document.documentElement.style.setProperty("--rgb", rgb.toFixed(2) + "px");
  }
  loop();
})();
