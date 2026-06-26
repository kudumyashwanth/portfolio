/* ============================================================
   Orbitable 3D chip — the Aurora die package
   Lazy-initialised when the section scrolls into view.
   ============================================================ */

const canvas = document.getElementById("chipCanvas");
const loading = document.getElementById("chipLoading");
const section = document.getElementById("chip");
if (canvas && section) boot();

function boot(){
  let started = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !started){ started = true; init(); io.disconnect(); }
    });
  }, { threshold: 0.2 });
  io.observe(section);
}

async function init(){
  let THREE, OrbitControls;
  try {
    THREE = await import("three");
    ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
  } catch (e) {
    console.warn("[chip3d] three.js failed — hiding 3D stage.", e);
    if (loading) loading.textContent = "3D unavailable offline";
    return;
  }

  const small = window.innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:!small, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.shadowMap.enabled = !small;        // shadows are the costliest part on mobile
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(6.5, 5.2, 8.5);

  function size(){
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }

  /* ---- accent (follows site accent) ---- */
  const accentHex = () =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7aa2f7";
  const accent = new THREE.Color(accentHex());

  /* ---- lights ---- */
  scene.add(new THREE.AmbientLight(0x33406b, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(6, 10, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.PointLight(accent.getHex(), 8, 30);
  rim.position.set(-5, 3, -4); scene.add(rim);
  const fill = new THREE.PointLight(0x7dcfff, 3, 30);
  fill.position.set(4, -2, 5); scene.add(fill);

  /* ---- the chip ---- */
  const chip = new THREE.Group();
  scene.add(chip);

  // package substrate (dark green PCB-ish)
  const pkg = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.35, 4),
    new THREE.MeshStandardMaterial({ color:0x0c1320, roughness:0.65, metalness:0.3 })
  );
  pkg.castShadow = pkg.receiveShadow = true;
  chip.add(pkg);

  // metal lid frame (the package ring)
  const ring = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.18, 3.5),
    new THREE.MeshStandardMaterial({ color:0x1a2236, roughness:0.4, metalness:0.7 })
  );
  ring.position.y = 0.26; ring.castShadow = true; chip.add(ring);

  // the silicon die (reflective, tinted)
  const dieMat = new THREE.MeshStandardMaterial({
    color:0x111a2e, roughness:0.25, metalness:0.85,
    emissive:accent.clone().multiplyScalar(0.12)
  });
  const die = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 2.6), dieMat);
  die.position.y = 0.4; die.castShadow = true; chip.add(die);

  // on-die blocks: CPU tile + 4x4 systolic accelerator + peripherals
  const emiss = new THREE.MeshStandardMaterial({
    color:0x0e1626, roughness:0.3, metalness:0.6,
    emissive:accent, emissiveIntensity:0.0
  });
  const cells = [];

  // CPU tile (one big block, left)
  const cpu = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), emiss.clone());
  cpu.position.set(-0.62, 0.5, -0.55); chip.add(cpu); cells.push(cpu);

  // 4x4 systolic array (right) — the showpiece that lights up
  const arr = [];
  for (let i=0;i<4;i++) for (let j=0;j<4;j++){
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.22), emiss.clone());
    c.position.set(0.35 + i*0.28, 0.5, -0.95 + j*0.28);
    chip.add(c); arr.push(c); cells.push(c);
  }
  // peripheral strip (front)
  for (let i=0;i<6;i++){
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.3), emiss.clone());
    p.position.set(-1.0 + i*0.4, 0.48, 0.85); chip.add(p); cells.push(p);
  }

  // gold bond wires — die edge → package ring
  const wireMat = new THREE.MeshStandardMaterial({ color:0xd8b878, roughness:0.3, metalness:0.95 });
  const dieTop = 0.47, ringTop = 0.36, dieHalf = 1.3, ringHalf = 1.62;
  for (let side = 0; side < 4; side++){
    for (let k = 0; k < 6; k++){
      const t = -1.0 + k * 0.4;
      let a, b;
      if (side === 0){ a = new THREE.Vector3(t, dieTop, -dieHalf); b = new THREE.Vector3(t, ringTop, -ringHalf); }
      if (side === 1){ a = new THREE.Vector3(t, dieTop,  dieHalf); b = new THREE.Vector3(t, ringTop,  ringHalf); }
      if (side === 2){ a = new THREE.Vector3(-dieHalf, dieTop, t); b = new THREE.Vector3(-ringHalf, ringTop, t); }
      if (side === 3){ a = new THREE.Vector3( dieHalf, dieTop, t); b = new THREE.Vector3( ringHalf, ringTop, t); }
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y += 0.16;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.011, 5, false), wireMat);
      tube.castShadow = true; chip.add(tube);
    }
  }

  // tiny SMD passives on the substrate
  const smdMat = new THREE.MeshStandardMaterial({ color:0x2a3350, roughness:0.5, metalness:0.5 });
  [[-1.5,0.2,1.5],[1.5,0.2,1.45],[-1.55,0.2,-1.4],[1.5,0.2,-1.5],[0.0,0.2,1.7]].forEach(p => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.1), smdMat);
    m.position.set(p[0], p[1], p[2]);
    m.rotation.y = Math.random() * Math.PI;
    m.castShadow = true; chip.add(m);
  });

  // gold pins around the package edge
  const pinMat = new THREE.MeshStandardMaterial({ color:0xc9a86a, roughness:0.3, metalness:0.95 });
  const pinGeo = new THREE.BoxGeometry(0.12, 0.06, 0.28);
  for (let i=0;i<14;i++){
    const t = -1.85 + (i/13)*3.7;
    [[t,-0.05,2.05,0],[t,-0.05,-2.05,0],[2.05,-0.05,t,Math.PI/2],[-2.05,-0.05,t,Math.PI/2]]
      .forEach(([x,y,z,ry]) => {
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(x,y,z); pin.rotation.y = ry; pin.castShadow = true; chip.add(pin);
      });
  }

  // contact shadow plane
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity:0.35 })
  );
  floor.rotation.x = -Math.PI/2; floor.position.y = -0.4; floor.receiveShadow = true;
  scene.add(floor);

  // glowing platform disc under the chip
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 48),
    new THREE.MeshBasicMaterial({ color:accent.clone(), transparent:true, opacity:0.07,
      blending:THREE.AdditiveBlending, depthWrite:false })
  );
  glow.rotation.x = -Math.PI/2; glow.position.y = -0.38; scene.add(glow);

  /* ---- controls ---- */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.enableZoom = false;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.9;
  controls.minPolarAngle = 0.6; controls.maxPolarAngle = Math.PI/2 - 0.05;
  controls.target.set(0, 0.35, 0);
  canvas.addEventListener("pointerdown", () => { controls.autoRotate = false; });

  size(); addEventListener("resize", size);
  if (loading) loading.classList.add("is-hidden");

  /* ---- render ---- */
  let visible = true;
  const vio = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold:0 });
  vio.observe(section);

  const clock = new THREE.Clock();
  function tick(){
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();

    // follow site accent
    const a = new THREE.Color(accentHex());
    rim.color.lerp(a, 0.05);
    dieMat.emissive.lerp(a.clone().multiplyScalar(0.12), 0.05);
    glow.material.color.lerp(a, 0.05);

    // sequential "data flow" pulse across the systolic array
    arr.forEach((c, idx) => {
      const phase = (t*1.6 - idx*0.18) % (Math.PI*2);
      const lit = Math.max(0, Math.sin(phase));
      c.material.emissive.copy(a);
      c.material.emissiveIntensity = lit * 1.6;
    });
    cpu.material.emissive.copy(a);
    cpu.material.emissiveIntensity = (Math.sin(t*1.2) * 0.5 + 0.5) * 0.6;

    chip.position.y = Math.sin(t*0.8) * 0.06;   // gentle float
    controls.update();
    renderer.render(scene, camera);
  }
  tick();
}
