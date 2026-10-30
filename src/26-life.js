/* 冰湖、雪橇与驯鹿、北极狐、渡鸦、远山 */
(function () {
  const AH = window.AH, T = AH.T, R = AH.R;
  const scene = R.scene;
  const rng = AH.mulberry32(77123);
  const MOBILE = !!AH.mobile;

  function box(w, h, d, mat, x, y, z, rx, ry, rz) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function bar(a, b, r, mat) {
    const d = new T.Vector3().subVectors(b, a);
    const m = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 6), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
    m.castShadow = true;
    return m;
  }
  function cyl(r0, r1, h, seg, mat, x, y, z, rx, ry, rz) {
    const m = new T.Mesh(new T.CylinderGeometry(r0, r1, h, seg), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  /* ---------------- 冰湖 ---------------- */
  const LAKE = { x: -78, z: 26, y: 0.62, r: 16 };
  function iceTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 512;
    const c = cv.getContext('2d');
    c.fillStyle = '#081e26'; c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 240; i++) {
      const x = rng() * 512, y = rng() * 512, r = 4 + rng() * 40;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const t = rng();
      g.addColorStop(0, t > 0.7 ? 'rgba(150,215,225,0.10)' : 'rgba(20,70,85,0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    // 裂纹
    for (let i = 0; i < 18; i++) {
      let x = rng() * 512, y = rng() * 512;
      c.strokeStyle = `rgba(170,225,235,${0.12 + rng() * 0.18})`;
      c.lineWidth = 0.6 + rng() * 1.4;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (rng() - 0.5) * 90; y += (rng() - 0.5) * 90;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    // 雪斑
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(220,238,244,${0.05 + rng() * 0.10})`;
      c.beginPath(); c.ellipse(rng() * 512, rng() * 512, 10 + rng() * 40, 4 + rng() * 18, rng() * 3, 0, Math.PI * 2); c.fill();
    }
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(0.07, 0.07);
    tex.anisotropy = 8;
    return tex;
  }
  function lakeShape(scale) {
    const sh = new T.Shape();
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = LAKE.r * scale * (1 + 0.10 * Math.sin(3 * a + 1.3) + 0.055 * Math.sin(7 * a + 2.1) + 0.03 * Math.sin(11 * a + 0.7));
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
    }
    sh.closePath();
    return sh;
  }
  const iceMat = new T.MeshStandardMaterial({
    map: iceTexture(), color: 0x9fd6de, roughness: 0.1, metalness: 0.12,
    emissive: 0x0a2a33, emissiveIntensity: 0.85,
    envMapIntensity: 2.0, transparent: true, opacity: 0.97
  });
  const ice = new T.Mesh(new T.ShapeGeometry(lakeShape(1), 24), iceMat);
  ice.rotation.x = -Math.PI / 2;
  ice.position.set(LAKE.x, LAKE.y, LAKE.z);
  ice.receiveShadow = true;
  scene.add(ice);

  const lakeLight = new T.PointLight(0x2f8f96, 5, 46, 2);
  lakeLight.position.set(LAKE.x, 2.0, LAKE.z);
  scene.add(lakeLight);

  let reflMesh = null;
  // 冰面极光倒影
  (function reflection() {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, 512, 256);
    c.filter = 'blur(12px)';
    for (let i = 0; i < 14; i++) {
      const x = rng() * 512, w = 40 + rng() * 130, h = 60 + rng() * 160;
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, 'rgba(40,200,160,0)');
      g.addColorStop(0.5, `rgba(${60 + rng() * 40},${190 + rng() * 50},${150 + rng() * 50},${0.12 + rng() * 0.20})`);
      g.addColorStop(1, 'rgba(40,200,160,0)');
      c.fillStyle = g;
      c.fillRect(x, 20 + rng() * 90, w, h);
    }
    c.filter = 'none';
    const mask = c.createRadialGradient(256, 128, 20, 256, 128, 250);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.7, 'rgba(0,0,0,0.6)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = mask;
    c.fillRect(0, 0, 512, 256);
    c.globalCompositeOperation = 'source-over';
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.7,
      blending: T.AdditiveBlending, depthWrite: false
    });
    const m = new T.Mesh(new T.CircleGeometry(LAKE.r * 0.85, 48), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(LAKE.x, LAKE.y + 0.012, LAKE.z - 1.5);
    m.renderOrder = 2;
    reflMesh = m;
    scene.add(m);
  })();

  // 冰面环境反射（CubeCamera，真实反射天空与极光）
  const cubeRT = new T.WebGLCubeRenderTarget(256, { type: T.HalfFloatType });
  const cubeCam = new T.CubeCamera(0.5, 1500, cubeRT);
  cubeCam.position.set(LAKE.x, LAKE.y + 2.0, LAKE.z);
  iceMat.envMap = cubeRT.texture;
  iceMat.metalness = 0.55;
  iceMat.roughness = 0.06;
  iceMat.envMapIntensity = 1.6;
  let cubeT = 0;
  function updateCube(dt) {
    cubeT -= dt;
    if (cubeT <= 0 && R.renderer) {
      cubeT = 8;
      ice.visible = false;
      if (reflMesh) reflMesh.visible = false;
      cubeCam.update(R.renderer, scene);
      ice.visible = true;
      if (reflMesh) reflMesh.visible = true;
    }
  }

  const rim = new T.Mesh(new T.ShapeGeometry(lakeShape(1.26), 24),
    new T.MeshStandardMaterial({ color: 0xdcecf2, roughness: 0.95, metalness: 0 }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(LAKE.x, LAKE.y - 0.02, LAKE.z);
  rim.receiveShadow = true;
  scene.add(rim);

  /* ---------- 散落岩石 ---------- */
  (function rocks() {
    const rockMat = new T.MeshStandardMaterial({ color: 0x24313d, roughness: 0.92, metalness: 0.02 });
    const capMat = new T.MeshStandardMaterial({ color: 0xeaf5f8, roughness: 0.8, metalness: 0 });
    const rockGeos = [];
    for (let v = 0; v < 4; v++) {
      const g = new T.IcosahedronGeometry(1, 3);
      const p = g.attributes.position;
      const vec = new T.Vector3();
      for (let i = 0; i < p.count; i++) {
        vec.fromBufferAttribute(p, i);
        const n = AH.fbm2(vec.x * 2.2 + v * 3.1, vec.z * 2.0 + vec.y * 1.7);
        vec.multiplyScalar(0.72 + 0.48 * n);
        p.setXYZ(i, vec.x, vec.y * 0.78, vec.z);
      }
      g.computeVertexNormals();
      rockGeos.push(g);
    }
    const capGeo = new T.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    const N = MOBILE ? 20 : 42;
    let placed = 0, guard = 0;
    while (placed < N && guard++ < N * 30) {
      const a = rng() * Math.PI * 2;
      const rad = 16 + Math.pow(rng(), 0.7) * 120;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (Math.hypot(x + 9, z + 5) < 12) continue;
      if (Math.hypot(x + 78, z - 26) < 21) continue;
      if (Math.hypot(x - 2, z - 11.5) < 7) continue;
      const s = 0.35 + Math.pow(rng(), 1.7) * 2.3;
      const y = AH.terrainH(x, z);
      const m = new T.Mesh(rockGeos[placed % rockGeos.length], rockMat);
      m.position.set(x, y + s * 0.25, z);
      m.scale.set(s * (0.85 + rng() * 0.45), s * (0.65 + rng() * 0.45), s * (0.85 + rng() * 0.45));
      m.rotation.set(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.5);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      const cap = new T.Mesh(capGeo, capMat);
      cap.position.set(x + (rng() - 0.5) * s * 0.2, y + s * 0.52, z + (rng() - 0.5) * s * 0.2);
      cap.scale.set(s * 0.82, s * 0.26, s * 0.82);
      cap.rotation.y = rng() * Math.PI * 2;
      cap.castShadow = false; cap.receiveShadow = true;
      scene.add(cap);
      placed++;
    }
  })();

  // 冰洞
  const HX = LAKE.x + 4.2, HZ = LAKE.z - 3.0;
  const hole = new T.Mesh(new T.CircleGeometry(0.52, 24),
    new T.MeshBasicMaterial({ color: 0x010608 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(HX, LAKE.y + 0.006, HZ);
  scene.add(hole);
  const slush = new T.Mesh(new T.RingGeometry(0.5, 1.05, 24),
    new T.MeshStandardMaterial({ color: 0xbcd8e2, roughness: 0.8 }));
  slush.rotation.x = -Math.PI / 2;
  slush.position.set(HX, LAKE.y + 0.004, HZ);
  scene.add(slush);

  const woodMat = AH.pbr('beam', [1, 1]);
  const rod = cyl(0.015, 0.025, 1.5, 6, woodMat, HX + 0.55, LAKE.y + 0.6, HZ + 0.35, 0, 0, 0.9);
  scene.add(rod);
  const line = new T.Mesh(new T.CylinderGeometry(0.003, 0.003, 0.9, 3),
    new T.MeshBasicMaterial({ color: 0xdfeef5 }));
  line.position.set(HX + 0.05, LAKE.y + 0.45, HZ + 0.1);
  line.rotation.z = 0.12;
  scene.add(line);

  const bucket = cyl(0.26, 0.22, 0.34, 12, AH.pbr('iron', [1, 1]), HX - 0.9, LAKE.y + 0.17, HZ - 0.5);
  scene.add(bucket);
  const stool = box(0.5, 0.08, 0.35, woodMat, HX - 0.5, LAKE.y + 0.42, HZ + 1.0);
  scene.add(stool);
  for (const [ox, oz] of [[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.13], [0.2, 0.13]]) {
    scene.add(cyl(0.02, 0.02, 0.42, 5, woodMat, HX - 0.5 + ox, LAKE.y + 0.21, HZ + 1.0 + oz));
  }

  /* ---------------- 驯鹿 + 雪橇 ---------------- */
  const fur = new T.MeshStandardMaterial({ color: 0x7d6957, roughness: 0.95, metalness: 0 });
  const furLight = new T.MeshStandardMaterial({ color: 0xd6c9b6, roughness: 0.95, metalness: 0 });
  const antlerMat = new T.MeshStandardMaterial({ color: 0x9c8b74, roughness: 0.85, metalness: 0 });
  const darkMat = new T.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.9 });

  const deer = new T.Group();
  const dy = AH.terrainH(12, 2);
  deer.position.set(12, dy, 2);
  deer.rotation.y = Math.PI + 0.05;
  scene.add(deer);

  const body = new T.Mesh(new T.CapsuleGeometry(0.38, 0.85, 6, 12), fur);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 1.12, 0);
  body.castShadow = true;
  deer.add(body);
  const chest = new T.Mesh(new T.SphereGeometry(0.24, 10, 8), furLight);
  chest.scale.set(0.55, 1.05, 0.85);
  chest.position.set(0.38, 1.05, 0);
  deer.add(chest);

  const neck = cyl(0.17, 0.22, 0.75, 8, fur, 0.56, 1.5, 0, 0, 0, -0.55);
  deer.add(neck);
  const head = new T.Mesh(new T.CapsuleGeometry(0.16, 0.32, 5, 8), fur);
  head.rotation.z = Math.PI / 2;
  head.position.set(0.83, 1.78, 0);
  deer.add(head);
  const muzzle = new T.Mesh(new T.SphereGeometry(0.13, 8, 6), furLight);
  muzzle.position.set(1.03, 1.72, 0);
  deer.add(muzzle);
  const nose = new T.Mesh(new T.SphereGeometry(0.045, 6, 5), darkMat);
  nose.position.set(1.13, 1.71, 0);
  deer.add(nose);
  for (const s of [-1, 1]) {
    const ear = new T.Mesh(new T.ConeGeometry(0.07, 0.22, 6), fur);
    ear.position.set(0.78, 1.94, s * 0.12);
    ear.rotation.z = -0.4;
    ear.rotation.x = s * 0.5;
    deer.add(ear);
    const eye = new T.Mesh(new T.SphereGeometry(0.028, 6, 5), darkMat);
    eye.position.set(0.93, 1.82, s * 0.13);
    deer.add(eye);
    // 鹿角
    const bx = 0.78, by = 1.96, bz = s * 0.07;
    deer.add(cyl(0.024, 0.034, 0.45, 5, antlerMat, bx, by + 0.24, bz, 0, 0, 0.2));
    deer.add(cyl(0.014, 0.022, 0.38, 4, antlerMat, bx + 0.10, by + 0.46, bz, 0, 0, 0.9));
    deer.add(cyl(0.012, 0.018, 0.26, 4, antlerMat, bx + 0.04, by + 0.62, bz + 0.05, 0.4, 0, 0.25));
    deer.add(cyl(0.010, 0.016, 0.22, 4, antlerMat, bx - 0.06, by + 0.50, bz - 0.04, -0.5, 0, 1.1));
  }
  const tail = new T.Mesh(new T.ConeGeometry(0.09, 0.25, 6), furLight);
  tail.position.set(-0.52, 1.18, 0);
  tail.rotation.z = 1.9;
  deer.add(tail);

  for (const [lx, lz] of [[0.38, 0.17], [0.38, -0.17], [-0.38, 0.17], [-0.38, -0.17]]) {
    const leg = cyl(0.055, 0.075, 0.95, 6, fur, lx, 0.52, lz);
    deer.add(leg);
    const hoof = cyl(0.07, 0.06, 0.1, 6, darkMat, lx, 0.06, lz);
    deer.add(hoof);
  }
  // 缰绳
  const harness = new T.Mesh(new T.TorusGeometry(0.34, 0.035, 6, 16), new T.MeshStandardMaterial({ color: 0x6b2f24, roughness: 0.8 }));
  harness.rotation.y = Math.PI / 2;
  harness.position.set(0.18, 1.12, 0);
  deer.add(harness);
  const collar = new T.Mesh(new T.TorusGeometry(0.33, 0.045, 6, 18),
    new T.MeshStandardMaterial({ color: 0x4a2a1e, roughness: 0.8 }));
  collar.rotation.y = Math.PI / 2;
  collar.position.set(0.42, 1.05, 0);
  deer.add(collar);

  // CC0 鹿模型（Quaternius），失败则保留程序化驯鹿
  let deerMixer = null;
  let deerAction = null;
  const deerActions = {};
  if (window.GLTFLoader && window.AH_ASSETS && AH_ASSETS.deer) {
    fetch(AH_ASSETS.deer).then((r) => r.arrayBuffer()).then((buf) => {
      new window.GLTFLoader().parse(buf, '', (gltf) => {
        const model = gltf.scene;
        const box = new T.Box3().setFromObject(model);
        const size = box.getSize(new T.Vector3());
        const sc = 1.9 / Math.max(0.01, size.y);
        model.scale.setScalar(sc);
        box.setFromObject(model);
        model.position.y -= box.min.y;
        model.rotation.y = Math.PI / 2;
        for (const c of deer.children) c.visible = false;
        deer.add(model);
        if (gltf.animations && gltf.animations.length) {
          deerMixer = new T.AnimationMixer(model);
          for (const clip of gltf.animations) {
            const name = clip.name.split('|').pop();
            deerActions[name] = deerMixer.clipAction(clip);
          }
          deerAction = deerActions.Idle || deerActions.Idle_2 || deerActions.Walk;
          if (deerAction) deerAction.play();
        }
      }, (e) => console.warn('deer glb', e));
    }).catch((e) => console.warn('deer fetch', e));
  }

  const sled = new T.Group();
  const sy = AH.terrainH(15, 2);
  sled.position.set(15, sy, 2);
  scene.add(sled);
  const sledWood = AH.pbr('beam', [1, 2]);
  const ropeMat = new T.MeshStandardMaterial({ color: 0x6b2f24, roughness: 0.85 });
  const metalMat = new T.MeshStandardMaterial({ color: 0x2b3036, metalness: 0.75, roughness: 0.35 });
  const cushionMat = new T.MeshStandardMaterial({ color: 0x3d2b26, roughness: 0.95 });
  // 弯曲滑轨
  const pts = [[-1.18, 0.05], [-0.45, 0.02], [0.55, 0.04], [1.05, 0.18], [1.22, 0.48]];
  for (const s of [-1, 1]) {
    const curve = new T.CatmullRomCurve3(pts.map(([x, y]) => new T.Vector3(x, y, s * 0.42)));
    sled.add(new T.Mesh(new T.TubeGeometry(curve, 26, 0.032, 6, false), metalMat));
  }
  // 甲板木条
  for (const s of [-1, 1]) {
    for (const x of [-0.62, 0.45]) sled.add(cyl(0.022, 0.022, 0.38, 6, sledWood, x, 0.22, s * 0.42));
  }
  for (let i = 0; i < 5; i++) sled.add(box(1.72, 0.045, 0.17, sledWood, 0, 0.42, -0.36 + i * 0.18));
  // 侧栏
  for (const s of [-1, 1]) {
    sled.add(bar(new T.Vector3(-0.8, 0.56, s * 0.52), new T.Vector3(0.82, 0.56, s * 0.52), 0.022, sledWood));
    for (const x of [-0.62, 0.02, 0.66]) sled.add(cyl(0.018, 0.018, 0.16, 6, sledWood, x, 0.49, s * 0.52));
  }
  // 座位与靠背
  sled.add(box(0.62, 0.11, 0.74, cushionMat, 0.28, 0.51, 0));
  sled.add(box(0.10, 0.46, 0.76, sledWood, 0.82, 0.74, 0, 0, 0, -0.12));
  sled.add(box(0.08, 0.36, 0.66, cushionMat, 0.76, 0.72, 0, 0, 0, -0.12));
  // 绳圈
  const coil = new T.Mesh(new T.TorusGeometry(0.16, 0.035, 6, 16), ropeMat);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(-0.55, 0.48, 0.1);
  sled.add(coil);
  // 牵引杆
  for (const s of [-1, 1]) {
    sled.add(bar(new T.Vector3(-0.9, 0.3, s * 0.34), new T.Vector3(-3.35, 0.78, s * 0.24), 0.024, sledWood));
  }
  sled.add(bar(new T.Vector3(-3.35, 0.78, -0.24), new T.Vector3(-3.35, 0.78, 0.24), 0.02, metalMat));
  // 驾驶扶手（第一视角可见，随雪橇一起转向）
  sled.add(box(0.06, 0.06, 1.0, sledWood, -0.55, 0.95, 0));
  for (const s2 of [-1, 1]) {
    sled.add(cyl(0.035, 0.035, 0.18, 8, darkMat, -0.55, 0.95, s2 * 0.45, Math.PI / 2, 0, 0));
    sled.add(bar(new T.Vector3(-0.55, 0.95, s2 * 0.45), new T.Vector3(-0.15, 0.62, s2 * 0.4), 0.022, metalMat));
  }

  // 雪橇压痕由玩家移动时的轨迹承担，这里不再放硬边贴片

  /* ---------------- 北极狐 ---------------- */
  const fox = new T.Group();
  const fx = -3, fz = 17;
  fox.position.set(fx, AH.terrainH(fx, fz), fz);
  scene.add(fox);
  const white = new T.MeshStandardMaterial({ color: 0xd9e6ea, roughness: 0.95 });
  const fbody = new T.Mesh(new T.CapsuleGeometry(0.14, 0.38, 5, 8), white);
  fbody.rotation.z = Math.PI / 2;
  fbody.position.y = 0.32;
  fox.add(fbody);
  const fhead = new T.Mesh(new T.SphereGeometry(0.15, 8, 6), white);
  fhead.position.set(0.3, 0.42, 0);
  fox.add(fhead);
  const fsnout = new T.Mesh(new T.ConeGeometry(0.07, 0.18, 6), white);
  fsnout.rotation.z = -Math.PI / 2;
  fsnout.position.set(0.44, 0.38, 0);
  fox.add(fsnout);
  for (const s of [-1, 1]) {
    const ear = new T.Mesh(new T.ConeGeometry(0.06, 0.16, 5), white);
    ear.position.set(0.29, 0.56, s * 0.09);
    ear.rotation.x = s * 0.25;
    fox.add(ear);
  }
  const ftail = new T.Mesh(new T.CapsuleGeometry(0.09, 0.35, 5, 8), white);
  ftail.rotation.z = 1.0;
  ftail.position.set(-0.35, 0.36, 0);
  fox.add(ftail);
  const flegs = [];
  for (const [lx, lz] of [[0.18, 0.1], [0.18, -0.1], [-0.18, 0.1], [-0.18, -0.1]]) {
    const leg = cyl(0.025, 0.02, 0.28, 5, white, lx, 0.14, lz);
    fox.add(leg);
    flegs.push(leg);
  }

  /* ---------------- 渡鸦 ---------------- */
  const ravens = [];
  const ravenMat = new T.MeshStandardMaterial({ color: 0x080b10, roughness: 0.7, metalness: 0.2 });
  for (let i = 0; i < 3; i++) {
    const g = new T.Group();
    const b = new T.Mesh(new T.SphereGeometry(0.12, 6, 5), ravenMat);
    b.scale.set(1.6, 1, 1);
    g.add(b);
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new T.Mesh(new T.PlaneGeometry(0.7, 0.22), ravenMat);
      w.material.side = T.DoubleSide;
      w.position.x = s * 0.35;
      g.add(w);
      wings.push(w);
    }
    g.position.set(0, 22 + i * 3, 0);
    scene.add(g);
    ravens.push({ g, wings, phase: i * 2.1, rad: 26 + i * 6, h: 20 + i * 4, sp: 0.10 + i * 0.02 });
  }

  const holeParts = [hole, slush, rod, line, bucket, stool];
  for (const p of holeParts) p.visible = false;
  let drilled = false;
  if (AH.params.has('drill')) { drilled = true; for (const p of holeParts) p.visible = true; }
  const fishSpot = {
    pos: new T.Vector3(HX, LAKE.y + 1.0, HZ), label: '凿冰洞', r: 2.4,
    fn: () => {
      if (!drilled) {
        drilled = true;
        for (const p of holeParts) p.visible = true;
        fishSpot.label = '冰钓';
        if (AH.ui) AH.ui.openBook('冰面', '冰镐砸下去，声音闷得像敲在一面很厚的鼓上。\n\n第三下，黑色的水从洞口涌上来，冒着白气。');
      } else if (AH.ui) AH.ui.openFish();
    }
  };

  /* ---------------- 交互 ---------------- */
  const IA = (AH.interactables = AH.interactables || []);
  IA.push(fishSpot);
  IA.push({
    pos: new T.Vector3(15, sy + 1.1, 2), label: '坐上雪橇', r: 2.6,
    fn: () => {
      if (!AH.player || !AH.player.sit) return;
      const p = new T.Vector3(14.6, sy + 0.62, 2.0);
      AH.player.sit({ x: p.x, y: p.y, z: p.z, yaw: -1.15, eye: 0.85, type: 'sled' });
    }
  });
  IA.push({
    pos: new T.Vector3(12, dy + 1.3, 2), label: '喂驯鹿', r: 2.4,
    fn: () => AH.ui && AH.ui.openBook('驯鹿', '它低下头，温热的鼻息喷在你手心里。\n\n雪橇的缰绳轻轻一响，像有人从很远的地方叹了口气。')
  });

  /* ---------------- 雪雾 ---------------- */
  const SPRAY_N = MOBILE ? 36 : 72;
  const sprayPos = new Float32Array(SPRAY_N * 3);
  const sprayVel = new Float32Array(SPRAY_N * 3);
  const sprayLife = new Float32Array(SPRAY_N);
  for (let i = 0; i < SPRAY_N; i++) sprayPos[i * 3 + 1] = -999;
  const sprayGeo = new T.BufferGeometry();
  sprayGeo.setAttribute('position', new T.BufferAttribute(sprayPos, 3));
  const sprayMat = new T.PointsMaterial({
    color: 0xe9f5fb, size: 0.075, transparent: true, opacity: 0.7,
    depthWrite: false, sizeAttenuation: true
  });
  const sprayPts = new T.Points(sprayGeo, sprayMat);
  sprayPts.frustumCulled = false;
  scene.add(sprayPts);
  let sprayIdx = 0;
  function spray(x, z, heading, speed) {
    if (Math.abs(speed) < 3) return;
    const n = Math.min(3, Math.ceil(Math.abs(speed) / 8));
    for (let k = 0; k < n; k++) {
      const i = sprayIdx++ % SPRAY_N;
      const back = heading + Math.PI;
      const side = (Math.random() - 0.5) * 0.9;
      sprayPos[i * 3] = x + Math.sin(back) * 0.9 + Math.cos(back) * side;
      sprayPos[i * 3 + 1] = AH.terrainH(x, z) + 0.12;
      sprayPos[i * 3 + 2] = z - Math.cos(back) * 0.9 + Math.sin(back) * side;
      sprayVel[i * 3] = Math.sin(back) * (1.4 + Math.random() * 2.2) + (Math.random() - 0.5);
      sprayVel[i * 3 + 1] = 1.0 + Math.random() * 1.6;
      sprayVel[i * 3 + 2] = -Math.cos(back) * (1.4 + Math.random() * 2.2) + (Math.random() - 0.5);
      sprayLife[i] = 0.6 + Math.random() * 0.5;
    }
  }
  function updateSpray(dt) {
    let dirty = false;
    for (let i = 0; i < SPRAY_N; i++) {
      if (sprayLife[i] <= 0) continue;
      sprayLife[i] -= dt;
      sprayPos[i * 3] += sprayVel[i * 3] * dt;
      sprayPos[i * 3 + 1] += sprayVel[i * 3 + 1] * dt;
      sprayPos[i * 3 + 2] += sprayVel[i * 3 + 2] * dt;
      sprayVel[i * 3 + 1] -= 6.5 * dt;
      if (sprayLife[i] <= 0) sprayPos[i * 3 + 1] = -999;
      dirty = true;
    }
    if (dirty) sprayGeo.attributes.position.needsUpdate = true;
  }

  /* ---------------- 更新 ---------------- */
  const _v = new T.Vector3();
  function setDeerAnim(name) {
    if (!deerMixer || !deerActions[name] || deerAction === deerActions[name]) return;
    const next = deerActions[name];
    next.reset().setEffectiveWeight(1).fadeIn(0.25).play();
    if (deerAction) deerAction.fadeOut(0.25);
    deerAction = next;
  }
  function update(t, dt) {
    updateCube(dt);
    updateSpray(dt);
    if (!AH.player || !AH.player.state.sit || AH.player.state.sit.type !== 'sled') {
      setDeerAnim('Idle');
      if (deerAction) deerAction.timeScale = 1;
    }
    if (deerMixer) {
      deerMixer.update(dt);
    } else {
      // 程序化驯鹿呼吸 / 低头
      body.position.y = 1.12 + Math.sin(t * 1.6) * 0.012;
      neck.rotation.z = -0.55 + Math.sin(t * 1.1) * 0.05;
      head.position.y = 1.78 + Math.sin(t * 1.1 + 0.4) * 0.03;
      muzzle.position.y = 1.72 + Math.sin(t * 1.1 + 0.4) * 0.03;
      nose.position.y = 1.71 + Math.sin(t * 1.1 + 0.4) * 0.03;
    }

    // 北极狐绕圈
    const a = t * 0.18;
    const px = fx + Math.cos(a) * 2.4, pz = fz + Math.sin(a) * 2.0;
    fox.position.set(px, AH.terrainH(px, pz), pz);
    fox.rotation.y = -a + Math.PI / 2;
    fox.position.y += Math.abs(Math.sin(t * 4.0)) * 0.04;
    flegs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + i * Math.PI / 2) * 0.45; });
    ftail.rotation.z = 1.0 + Math.sin(t * 3.2) * 0.12;

    // 渡鸦
    for (const r of ravens) {
      const ang = t * r.sp + r.phase;
      const x = Math.cos(ang) * r.rad, z = Math.sin(ang) * r.rad;
      r.g.position.set(x, r.h + Math.sin(t * 0.7 + r.phase) * 2.0, z);
      r.g.rotation.y = -ang + Math.PI / 2;
      const flap = Math.sin(t * 7 + r.phase) * 0.6;
      r.wings[0].rotation.z = flap;
      r.wings[1].rotation.z = -flap;
    }
  }
  AH.life = {
    update,
    lake: LAKE,
    spray,
    ride(x, z, heading, lean, speed) {
      const y = AH.terrainH(x, z);
      sled.position.set(x, y, z);
      sled.rotation.set(0, heading - Math.PI / 2, -(lean || 0) * 0.22);
      sled.rotation.y = heading - Math.PI / 2;
      deer.position.set(x + Math.sin(heading) * 4.1, y, z - Math.cos(heading) * 4.1);
      deer.rotation.y = Math.PI / 2 - heading;
      const sp = Math.abs(speed || 0);
      setDeerAnim(sp > 7 ? 'Gallop' : sp > 0.4 ? 'Walk' : 'Idle');
      if (deerAction) deerAction.timeScale = Math.max(0.7, Math.min(1.8, sp / 4));
    }
  };
})();
