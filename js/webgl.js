/* ============================================================
   Living Silicon Die — GPU particle fabric  (v2)
   + UnrealBloom  + click ripples  + depth dust
   + per-section accent color shifting
   ============================================================ */

let THREE, EffectComposer, RenderPass, UnrealBloomPass;
const coarse = window.matchMedia("(pointer:coarse)").matches;
const lowPower = coarse || window.innerWidth < 640;

try {
  THREE = await import("three");
  if (!lowPower){
    ({ EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js"));
    ({ RenderPass }     = await import("three/addons/postprocessing/RenderPass.js"));
    ({ UnrealBloomPass }= await import("three/addons/postprocessing/UnrealBloomPass.js"));
  }
} catch (e) {
  console.warn("[webgl] three.js failed to load — CSS gradient fallback.", e);
  document.body.classList.add("no-webgl");
  fallbackGradient();
}

function fallbackGradient(){
  const c = document.getElementById("gl");
  if (c) c.style.background =
    "radial-gradient(120% 120% at 30% 20%, #16182a 0%, #0b0d16 55%, #06070d 100%)";
}

if (THREE) initScene();

function initScene(){
  const canvas = document.getElementById("gl");
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias:!lowPower, alpha:true, powerPreference:"high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.3 : 1.8));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
  camera.position.set(0, 2.2, 9);
  camera.lookAt(0, 0, 0);

  const RCOUNT = 6;

  /* ---- grid of points (the "die") ---- */
  const SEG = lowPower ? 150 : 220;
  const SIZE = 26;
  const count = SEG * SEG;
  const positions = new Float32Array(count * 3);
  const aRand = new Float32Array(count);
  const aDist = new Float32Array(count);
  let i = 0;
  for (let x = 0; x < SEG; x++){
    for (let z = 0; z < SEG; z++){
      const px = (x / (SEG - 1) - 0.5) * SIZE;
      const pz = (z / (SEG - 1) - 0.5) * SIZE;
      positions[i*3] = px; positions[i*3+1] = 0; positions[i*3+2] = pz;
      aRand[i] = Math.random();
      aDist[i] = Math.sqrt(px*px + pz*pz);
      i++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
  geo.setAttribute("aDist", new THREE.BufferAttribute(aDist, 1));

  const rPos = []; const rTime = [];
  for (let k=0;k<RCOUNT;k++){ rPos.push(new THREE.Vector2(0,0)); rTime.push(-100); }

  const uniforms = {
    uTime:    { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uRipple:  { value: 0 },
    uScroll:  { value: 0 },
    uPixel:   { value: renderer.getPixelRatio() },
    uColA:    { value: new THREE.Color("#7aa2f7") },
    uColB:    { value: new THREE.Color("#bb9af7") },
    uColC:    { value: new THREE.Color("#7dcfff") },
    uRPos:    { value: rPos },
    uRTime:   { value: rTime },
    uReveal:  { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    defines: { RCOUNT },
    vertexShader: /* glsl */`
      uniform float uTime; uniform vec2 uPointer; uniform float uRipple;
      uniform float uScroll; uniform float uPixel;
      uniform vec2 uRPos[RCOUNT]; uniform float uRTime[RCOUNT];
      attribute float aRand; attribute float aDist;
      varying float vH; varying float vRand; varying float vEdge;

      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
      }
      void main(){
        vec3 p = position;
        float t = uTime * 0.35;
        float densify = uScroll;          // scene morph: fabric gets busier mid-scroll
        float w = 0.0;
        w += sin(p.x*(0.45 + densify*0.25) + t*1.6) * 0.28;
        w += cos(p.z*0.55 - t*1.2) * 0.24;
        w += sin((p.x+p.z)*0.30 + t) * 0.18;
        w += noise(p.xz*(0.35 + densify*0.35) + t*0.4) * (0.65 + densify*0.25);

        float ring = sin(aDist*1.4 - uTime*2.2) * exp(-aDist*0.10) * 0.5;
        w += ring * (0.35 + uRipple);

        vec2 ptr = uPointer * 13.0;
        float pd = distance(p.xz, ptr);
        float bulge = exp(-pd*pd*0.03) * 0.9;
        w += bulge;

        // click ripples
        for(int k=0;k<RCOUNT;k++){
          float age = uTime - uRTime[k];
          if(age > 0.0 && age < 4.0){
            float rd = distance(p.xz, uRPos[k]);
            float wave = sin(rd*2.2 - age*5.0) * exp(-rd*0.25) * exp(-age*1.4);
            w += wave * 1.6;
          }
        }

        p.y += w;
        vH = w; vRand = aRand; vEdge = smoothstep(11.0, 3.0, aDist);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (0.9 + aRand*1.1 + bulge*1.0 + max(w,0.0)*0.5) * uPixel;
        gl_PointSize = size * (78.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uColA, uColB, uColC;
      uniform float uReveal;
      varying float vH; varying float vRand; varying float vEdge;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.0, d);
        if (alpha < 0.01) discard;
        float h = clamp(vH*0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uColA, uColC, h);
        col = mix(col, uColB, vRand*0.5);
        col += vec3(0.18,0.22,0.34) * smoothstep(0.5,1.1,vH);
        float a = alpha * (0.04 + vEdge*0.12 + max(vH,0.0)*0.08) * uReveal;
        gl_FragColor = vec4(col, a);
      }
    `,
  });

  const points = new THREE.Points(geo, material);
  points.rotation.x = -0.15; points.position.y = -2.4;
  scene.add(points);

  /* ---- depth dust (parallax) ---- */
  const dustN = lowPower ? 350 : 900;
  const dpos = new Float32Array(dustN*3);
  for (let k=0;k<dustN;k++){
    dpos[k*3]   = (Math.random()-0.5)*40;
    dpos[k*3+1] = Math.random()*18 - 2;
    dpos[k*3+2] = (Math.random()-0.5)*30 - 5;
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute("position", new THREE.BufferAttribute(dpos,3));
  const dmat = new THREE.PointsMaterial({
    color:new THREE.Color("#7aa2f7"), size:0.04, transparent:true, opacity:0.5,
    blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true
  });
  const dust = new THREE.Points(dgeo, dmat);
  scene.add(dust);

  /* ---- post-processing (bloom) ---- */
  let composer = null;
  if (EffectComposer && UnrealBloomPass){
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.5, 0.28);
    composer.addPass(bloom);
  }

  /* ---- resize ---- */
  function resize(){
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    uniforms.uPixel.value = renderer.getPixelRatio();
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---- pointer ---- */
  const pointer = { x:0, y:0, tx:0, ty:0 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive:true });

  let ripple = 0, rIdx = 0;
  window.addEventListener("pointerdown", () => {
    ripple = 1.2;
    // drop a ripple at the current pointer (same mapping as bulge)
    rPos[rIdx].set(pointer.x * 13.0, -pointer.y * 13.0);
    rTime[rIdx] = uniforms.uTime.value;
    rIdx = (rIdx + 1) % RCOUNT;
  });

  /* ---- accent color shifting (called from extra.js) ---- */
  const targetA = new THREE.Color("#7aa2f7");
  const targetB = new THREE.Color("#bb9af7");
  const targetC = new THREE.Color("#7dcfff");
  window.__setGLAccent = (hex) => {
    try {
      const base = new THREE.Color(hex);
      targetA.copy(base);
      const hsl = {}; base.getHSL(hsl);
      targetB.setHSL((hsl.h + 0.08) % 1, Math.min(hsl.s*1.05,1), Math.min(hsl.l*1.1,0.8));
      targetC.setHSL((hsl.h + 0.5) % 1,  Math.min(hsl.s,1),      Math.min(hsl.l*1.25,0.85));
    } catch(_){}
  };
  window.__setGLScroll = (p) => { uniforms.uScroll.value = p; };

  /* ---- visibility pause ---- */
  let visible = true;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

  /* ---- cinematic intro ---- */
  let introT = 0;                       // 0 → 1 fly-in
  window.__glIntro = () => { introT = 0; };   // (re)trigger from preloader finish

  /* ---- overclock turbo ---- */
  let turbo = 1;
  window.__glTurbo = (on) => { turbo = on ? 3.2 : 1; };

  /* ---- loop ---- */
  const clock = new THREE.Clock();
  function tick(){
    requestAnimationFrame(tick);
    if (!visible) return;
    const dt = clock.getDelta();
    uniforms.uTime.value += dt * turbo;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    uniforms.uPointer.value.set(pointer.x, pointer.y);

    ripple *= 0.94; uniforms.uRipple.value = ripple;

    uniforms.uColA.value.lerp(targetA, 0.04);
    uniforms.uColB.value.lerp(targetB, 0.04);
    uniforms.uColC.value.lerp(targetC, 0.04);
    dmat.color.lerp(targetA, 0.04);

    // intro fly-in
    if (introT < 1) introT = Math.min(1, introT + dt / 2.4);
    const intro = 1 - Math.pow(1 - introT, 3);          // easeOutCubic

    const s = uniforms.uScroll.value;
    // scene morph: clean fade-out as you reach the end (contact = starfield)
    const endFade = Math.min(Math.max((s - 0.82) / 0.18, 0), 1);
    uniforms.uReveal.value = intro * (1 - endFade);
    dmat.opacity = 0.5 * (0.3 + intro * 0.7);

    // camera: base framing + scroll dive + intro pull-back
    const pullZ = (1 - intro) * 20, pullY = (1 - intro) * 10;
    camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.03;
    camera.position.y += ((2.2 - s * 3.5 + pullY) - camera.position.y) * 0.06;
    camera.position.z = 9 + s * 4.0 + pullZ;
    points.rotation.z += dt * 0.01;
    points.rotation.x = -0.15 - s * 0.12;               // tilt the die as you descend
    dust.rotation.y += dt * 0.02;
    dust.position.y = -s * 2.0;
    camera.lookAt(0, -s * 1.5, 0);

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  tick();
  window.dispatchEvent(new Event("gl:ready"));
}
