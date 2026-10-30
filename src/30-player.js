/* 玩家：第一 / 第三人称、行走、角色与提灯 */
(function () {
  const AH = window.AH, T = AH.T, R = AH.R;
  const scene = R.scene;
  const camera = R.camera;
  const clamp = AH.clamp, damp = AH.damp;

  const SENS = 0.0021;
  const MOBILE = !!AH.mobile;
  const WALK = 2.35, RUN = 4.9;

  const st = {
    pos: new T.Vector3(2.0, 0, 11.5),
    vel: new T.Vector3(),
    vy: 0,
    onGround: true,
    yaw: -0.52,
    pitch: 0.02,
    mode: 'fp',
    speed: 0,
    walkPhase: 0,
    bob: 0,
    dragging: false,
    locked: false,
    freeCam: false,
    sit: null
  };
  st.pos.y = AH.terrainH(st.pos.x, st.pos.z);

  const keys = Object.create(null);
  const canvas = R.canvas;

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (st.sit && st.sit.type === 'sled') {
      dt = Math.min(dt, 0.05);
      if (e.code === 'KeyW' || e.code === 'ArrowUp') st.sit.speed = Math.min(17, st.sit.speed + 1.2);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') st.sit.speed = Math.max(-4, st.sit.speed - 1.2);
    }
    if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  canvas.addEventListener('mousedown', () => { st.dragging = true; });
  window.addEventListener('mouseup', () => { st.dragging = false; });
  document.addEventListener('mousemove', (e) => {
    const locked = document.pointerLockElement === canvas;
    if (!locked && !st.dragging) return;
    st.yaw += e.movementX * SENS;
    st.pitch -= e.movementY * SENS;
    st.pitch = clamp(st.pitch, -1.15, 1.25);
  });

  document.addEventListener('pointerlockchange', () => {
    st.locked = document.pointerLockElement === canvas;
    document.body.classList.toggle('locked', st.locked);
  });

  // 触屏：单指环视
  let touchX = 0, touchY = 0, touchId = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchId = t.identifier; touchX = t.clientX; touchY = t.clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      st.yaw += (t.clientX - touchX) * 0.004;
      st.pitch = clamp(st.pitch - (t.clientY - touchY) * 0.004, -1.1, 1.2);
      touchX = t.clientX; touchY = t.clientY;
    }
  }, { passive: true });

  /* ---------------- 角色 ---------------- */

  const char = new T.Group();
  scene.add(char);
  const charMats = [];
  function M(color, rough, metal) {
    const m = new T.MeshStandardMaterial({
      color, roughness: rough === undefined ? 0.9 : rough,
      metalness: metal || 0, transparent: true, opacity: 1
    });
    charMats.push(m);
    return m;
  }
  const matParka = M(0x27323f, 0.92);
  const matPants = M(0x131a23, 0.95);
  const matFur = M(0xb9c9d5, 1.0);
  const matBoot = M(0x0d1319, 0.85);
  const matSkin = M(0x2b2320, 0.95);
  const matPack = M(0x1b242e, 0.95);
  const matLeather = M(0x3a2a1e, 0.8);

  function mesh(geo, mat, x, y, z) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    return m;
  }

  const body = mesh(new T.CapsuleGeometry(0.24, 0.58, 4, 12), matParka, 0, 1.08, 0);
  body.scale.set(1, 1.02, 0.84);
  char.add(body);

  const hood = mesh(new T.SphereGeometry(0.23, 16, 12), matParka, 0, 1.67, -0.02);
  hood.scale.set(1, 1.06, 1.02);
  char.add(hood);

  const fur = mesh(new T.TorusGeometry(0.19, 0.028, 6, 18), matPack, 0, 1.44, 0.02);
  fur.rotation.x = Math.PI / 2;
  char.add(fur);

  const face = mesh(new T.SphereGeometry(0.145, 10, 8), matSkin, 0, 1.65, 0.10);
  face.scale.set(1, 0.95, 0.8);
  char.add(face);

  const pack = mesh(new T.BoxGeometry(0.34, 0.46, 0.2), matPack, 0, 1.12, -0.27);
  pack.rotation.x = 0.06;
  char.add(pack);
  const roll = mesh(new T.CylinderGeometry(0.08, 0.08, 0.38, 8), matLeather, 0, 1.4, -0.29);
  roll.rotation.z = Math.PI / 2;
  char.add(roll);

  const legs = [];
  for (const sx of [-0.14, 0.14]) {
    const g = new T.Group();
    g.position.set(sx, 0.82, 0);
    const leg = mesh(new T.CapsuleGeometry(0.115, 0.42, 3, 7), matPants, 0, -0.3, 0);
    g.add(leg);
    const boot = mesh(new T.BoxGeometry(0.19, 0.15, 0.32), matBoot, 0, -0.62, 0.05);
    g.add(boot);
    char.add(g);
    legs.push(g);
  }

  const arms = [];
  for (const sx of [-0.31, 0.31]) {
    const g = new T.Group();
    g.position.set(sx, 1.36, 0);
    const arm = mesh(new T.CapsuleGeometry(0.09, 0.4, 3, 7), matParka, 0, -0.27, 0);
    g.add(arm);
    const hand = mesh(new T.SphereGeometry(0.075, 7, 6), matLeather, 0, -0.52, 0.02);
    g.add(hand);
    char.add(g);
    arms.push(g);
  }

  // 提灯（挂在右手）
  const lantern = new T.Group();
  lantern.position.set(0.05, -0.62, 0.05);
  const lampBody = mesh(new T.CylinderGeometry(0.055, 0.07, 0.16, 8), matLeather, 0, 0, 0);
  lantern.add(lampBody);
  const lampGlow = mesh(new T.SphereGeometry(0.05, 8, 6),
    new T.MeshBasicMaterial({ color: new T.Color(3.2, 2.0, 1.0) }), 0, 0, 0);
  lantern.add(lampGlow);
  const lampHandle = mesh(new T.TorusGeometry(0.07, 0.012, 4, 10, Math.PI), matLeather, 0, 0.1, 0);
  lantern.add(lampHandle);
  arms[1].add(lantern);

  const lampSpriteMat = new T.SpriteMaterial({
    map: AH.makeRadialTexture(128), color: 0xffb066, transparent: true, opacity: 0.75,
    blending: T.AdditiveBlending, depthWrite: false, fog: false
  });
  const lampSprite = new T.Sprite(lampSpriteMat);
  lampSprite.scale.set(1.5, 1.5, 1);
  lantern.add(lampSprite);

  const lampLight = new T.PointLight(0xffb070, 2.6, 7, 2);
  scene.add(lampLight);

  // 相机侧的冷色补光，让角色在逆光下仍有轮廓
  const fill = new T.DirectionalLight(0x9fc4ff, 0.38);
  scene.add(fill);
  scene.add(fill.target);

  /* ---------------- 雪地足迹 ---------------- */
  const footTex = new T.TextureLoader().load(window.AH_ASSETS ? AH_ASSETS.foot : '');
  footTex.colorSpace = T.SRGBColorSpace;
  footTex.anisotropy = 4;
  const footGeo = new T.PlaneGeometry(0.30, 0.46);
  footGeo.rotateX(-Math.PI / 2);
  const prints = [];
  const PRINT_N = MOBILE ? 36 : 70;
  for (let i = 0; i < PRINT_N; i++) {
    const m = new T.Mesh(footGeo, new T.MeshBasicMaterial({
      map: footTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false,
      alphaTest: 0.02, color: 0xffffff,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    }));
    m.visible = false; m.renderOrder = 3;
    scene.add(m);
    prints.push({ m, age: 99, life: 24 });
  }
  let printIdx = 0, footSide = 1;
  const lastPrint = new T.Vector3(1e9, 0, 1e9);

  if (AH.params.has('trail')) {
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const x = 2.0 - t * 7.5, z = 11.5 - t * 9.5;
      const p = prints[i % prints.length];
      p.age = 0; p.life = 999;
      p.m.visible = true;
      p.m.position.set(x, AH.terrainH(x, z) + 0.06, z);
      p.m.rotation.y = 0.65;
      p.m.material.opacity = 0.45;
    }
  }

  /* ---------------- 更新 ---------------- */

  const fwd = new T.Vector3();
  const move = new T.Vector3();
  const camPos = new T.Vector3();
  const lookAt = new T.Vector3();
  const tmp = new T.Vector3();

  function desiredForward() {
    const cp = Math.cos(st.pitch);
    fwd.set(Math.sin(st.yaw) * cp, Math.sin(st.pitch), -Math.cos(st.yaw) * cp);
    return fwd;
  }

  function update(dt, t) {
    if (st.sit && st.sit.type === 'sled') {
      const s = st.sit;
      if ((update._n = (update._n || 0) + 1) % 30 === 0) console.log('SLEDDBG', s.speed, st.pos.x.toFixed(2), st.pos.z.toFixed(2));
      if (s.speed === undefined) s.speed = 0;
      if (s.heading === undefined) s.heading = s.yaw;
      const thr = ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0);
      const steer = ((keys.KeyA || keys.ArrowLeft) ? 1 : 0) - ((keys.KeyD || keys.ArrowRight) ? 1 : 0);
      s.speed += thr * 10 * dt;
      s.speed *= Math.max(0, 1 - 0.9 * dt);
      s.speed = Math.max(-4, Math.min(17, s.speed));
      console.log('US', s.speed.toFixed(2), st.pos.x.toFixed(1), st.pos.z.toFixed(1));
      if (Math.abs(s.speed) > 0.05) s.heading += steer * dt * (0.9 + Math.abs(s.speed) * 0.03) * Math.sign(s.speed);
      const fx = Math.sin(s.heading), fz = -Math.cos(s.heading);
      const px = st.pos.x, pz = st.pos.z;
      st.pos.x += fx * s.speed * dt;
      st.pos.z += fz * s.speed * dt;
      if (AH.cabin && Math.hypot(st.pos.x + 9, st.pos.z + 5) < 14) {
        AH.cabin.collide(st.pos, 0.95);
        if (Math.abs(st.pos.x - px) > 1e-3 || Math.abs(st.pos.z - pz) > 1e-3) {
          st.pos.x = px; st.pos.z = pz;
          s.speed *= -0.18;
        }
      }
      const gy = AH.terrainH(st.pos.x, st.pos.z);
      st.pos.y = gy;
      const lean = steer * Math.min(1, Math.abs(s.speed) / 10);
      if (AH.life && AH.life.ride) AH.life.ride(st.pos.x, st.pos.z, s.heading, lean, s.speed);
      if (AH.life && AH.life.spray) AH.life.spray(st.pos.x, st.pos.z, s.heading, s.speed);
      camera.position.set(st.pos.x - fx * 2.2, gy + 2.0 + Math.sin(t * 7.5) * 0.012, st.pos.z - fz * 0.8);
      lookAt.set(st.pos.x + fx * 16, gy + 1.15, st.pos.z + fz * 16);
      camera.lookAt(lookAt);
      camera.rotateZ(-lean * 0.07);
      camera.fov = damp(camera.fov, 70, 6, dt);
      camera.updateProjectionMatrix();
      char.visible = false;
      R.focus = 4;
      return;
    }
    if (st.sit) {
      st.pos.set(st.sit.x, st.sit.y, st.sit.z);
      const eye = st.sit.eye === undefined ? 0.55 : st.sit.eye;
      camera.position.set(st.sit.x, st.sit.y + eye, st.sit.z);
      desiredForward();
      lookAt.copy(camera.position).add(fwd);
      camera.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(camera.position, lookAt, camera.up));
      camera.fov = damp(camera.fov, 55, 6, dt);
      camera.updateProjectionMatrix();
      char.position.copy(st.pos);
      char.visible = false;
      R.focus = 4;
      return;
    }
    const touch = AH.touch || { x: 0, y: 0, run: false, jump: false };
    const sprint = !!(keys.ShiftLeft || keys.ShiftRight) || !!touch.run;
    const f = MOBILE ? touch.y : (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const s = MOBILE ? touch.x : (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);

    move.set(
      Math.sin(st.yaw) * f + Math.cos(st.yaw) * s,
      0,
      -Math.cos(st.yaw) * f + Math.sin(st.yaw) * s
    );
    if (move.lengthSq() > 0) move.normalize();

    const targetSpeed = move.lengthSq() > 0 ? (sprint ? RUN : WALK) : 0;
    const accel = st.onGround ? 12 : 3;
    st.vel.x = damp(st.vel.x, move.x * targetSpeed, accel, dt);
    st.vel.z = damp(st.vel.z, move.z * targetSpeed, accel, dt);
    st.speed = Math.hypot(st.vel.x, st.vel.z);

    st.pos.x += st.vel.x * dt;
    st.pos.z += st.vel.z * dt;
    if (AH.cabin) AH.cabin.collide(st.pos, 0.26);

    // 跳跃 / 重力
    if ((keys.Space || touch.jump) && st.onGround) { st.vy = 4.4; st.onGround = false; }
    if (touch.jump) touch.jump = false;
    st.vy -= 13.5 * dt;
    st.pos.y += st.vy * dt;
    let ground = AH.terrainH(st.pos.x, st.pos.z);
    if (AH.cabin) { const fy = AH.cabin.floorAt(st.pos); if (fy !== null) ground = fy; }
    if (st.pos.y <= ground + 0.02) { st.pos.y = ground; st.vy = 0; st.onGround = true; }

    const limit = 330;
    st.pos.x = clamp(st.pos.x, -limit, limit);
    st.pos.z = clamp(st.pos.z, -limit, limit);
    R.playerPos = st.pos;

    // 雪地足迹
    if (st.speed > 0.35 && st.onGround) {
      const dx = st.pos.x - lastPrint.x, dz = st.pos.z - lastPrint.z;
      if (dx * dx + dz * dz > 0.42 * 0.42) {
        const inside = AH.cabin && AH.cabin.floorAt(st.pos) !== null;
        if (!inside) {
          const dirYaw = Math.atan2(st.vel.x, st.vel.z);
          footSide *= -1;
          const px = st.pos.x + Math.cos(dirYaw) * 0.11 * footSide;
          const pz = st.pos.z - Math.sin(dirYaw) * 0.11 * footSide;
          const p = prints[printIdx++ % prints.length];
          p.age = 0; p.life = 24; p.m.visible = true;
          p.m.position.set(px, AH.terrainH(px, pz) + 0.06, pz);
          p.m.rotation.y = dirYaw + footSide * 0.12;
          p.m.material.opacity = 0.8;
          lastPrint.copy(st.pos);
        }
      }
    }
    for (const p of prints) {
      if (!p.m.visible) continue;
      p.age += dt;
      const k = 1 - Math.max(0, (p.age - (p.life - 6)) / 6);
      p.m.material.opacity = 0.8 * Math.max(0, k);
      if (p.age >= p.life) p.m.visible = false;
    }

    // 行走相位
    const moving = st.speed > 0.2;
    st.walkPhase += st.speed * dt * 2.5;
    const bobTarget = moving && st.onGround ? Math.sin(st.walkPhase * 2.0) * 0.035 * clamp(st.speed / RUN, 0.3, 1) : 0;
    st.bob = damp(st.bob, bobTarget, 10, dt);

    // 角色姿态
    char.position.copy(st.pos);
    const faceDir = moving ? Math.atan2(st.vel.x, st.vel.z) : Math.atan2(Math.sin(st.yaw), -Math.cos(st.yaw));
    char.rotation.y = damp(char.rotation.y, faceDir, 8, dt);
    const swing = moving ? Math.sin(st.walkPhase) * 0.62 * clamp(st.speed / RUN, 0.35, 1) : 0;
    legs[0].rotation.x = damp(legs[0].rotation.x, swing, 14, dt);
    legs[1].rotation.x = damp(legs[1].rotation.x, -swing, 14, dt);
    arms[0].rotation.x = damp(arms[0].rotation.x, -swing * 0.7, 12, dt);
    arms[1].rotation.x = damp(arms[1].rotation.x, swing * 0.45 - 0.12, 12, dt);
    char.position.y += Math.abs(Math.sin(st.walkPhase)) * 0.03 * (moving ? 1 : 0);
    body.scale.y = 1.02 + Math.sin(t * 1.4) * 0.006;

    // 提灯灯焰
    const flick = 3.9 + Math.sin(t * 7.3) * 0.7 + Math.sin(t * 13.1) * 0.35;
    lampLight.intensity = flick;
    lampSpriteMat.opacity = 0.5 + Math.sin(t * 6.0) * 0.07;
    lampGlow.material.color.setRGB(3.0 + Math.sin(t * 9.0) * 0.3, 1.9, 0.95);

    // 相机
    desiredForward();
    const eyeH = 1.66 + st.bob;
    const fpPos = tmp.copy(st.pos).setY(st.pos.y + eyeH);
    const target = new T.Vector3(st.pos.x, st.pos.y + 1.44, st.pos.z);

    let dist = 5.9;
    if (st.mode === 'tp') {
      for (let k = 0; k < 8; k++) {
        camPos.copy(target).addScaledVector(fwd, -dist);
        const gh = AH.terrainH(camPos.x, camPos.z) + 0.55;
        if (camPos.y > gh) break;
        dist *= 0.84;
      }
      camPos.copy(target).addScaledVector(fwd, -dist);
      if (AH.cabin) AH.cabin.collide(camPos, 0.18);
      const gh = AH.terrainH(camPos.x, camPos.z) + 0.5;
      if (camPos.y < gh) camPos.y = gh;
      if (AH.cabin) { const cf = AH.cabin.floorAt(camPos); if (cf !== null && camPos.y < cf + 0.4) camPos.y = cf + 0.4; }
    } else {
      camPos.copy(fpPos);
    }

    const posLambda = st.mode === 'tp' ? 7.5 : 26;
    camera.position.x = damp(camera.position.x, camPos.x, posLambda, dt);
    camera.position.y = damp(camera.position.y, camPos.y, posLambda, dt);
    camera.position.z = damp(camera.position.z, camPos.z, posLambda, dt);

    if (st.mode === 'fp') {
      lookAt.copy(camera.position).add(fwd);
    } else {
      lookAt.copy(target).addScaledVector(fwd, 1.0);
    }
    const mtx = new T.Matrix4().lookAt(camera.position, lookAt, camera.up);
    const qd = new T.Quaternion().setFromRotationMatrix(mtx);
    const rotLambda = st.mode === 'fp' ? 32 : 11;
    camera.quaternion.slerp(qd, 1 - Math.exp(-rotLambda * dt));

    // 角色显隐（第一人称淡出）
    const camDist = camera.position.distanceTo(st.pos);
    const targetOpacity = st.mode === 'fp' ? 0 : clamp((camDist - 0.6) / 1.2, 0, 1);
    for (const mat of charMats) {
      mat.opacity = damp(mat.opacity, targetOpacity, 10, dt);
    }
    char.visible = !st.hideChar && charMats[0].opacity > 0.02;

    if (AH.dbg) {
      const el = AH.$('stat');
      if (el) {
        el.style.display = 'block';
        el.textContent = 'cam ' + camera.position.x.toFixed(1) + ',' + camera.position.y.toFixed(1) + ',' + camera.position.z.toFixed(1)
          + ' | pos ' + st.pos.x.toFixed(1) + ',' + st.pos.y.toFixed(1) + ',' + st.pos.z.toFixed(1)
          + ' | yaw ' + st.yaw.toFixed(2) + ' pitch ' + st.pitch.toFixed(2) + ' dist ' + dist.toFixed(2);
      }
    }

    // 提灯位置
    lantern.getWorldPosition(tmp);
    lampLight.position.copy(tmp);
    fill.position.copy(camera.position);
    fill.target.position.set(st.pos.x, st.pos.y + 1.1, st.pos.z);
    fill.target.updateMatrixWorld();
    if (st.mode === 'fp') {
      lampLight.position.copy(st.pos).add(new T.Vector3(0.45, 1.2, 0.2).applyAxisAngle(new T.Vector3(0, 1, 0), st.yaw));
    }

    // 对焦：相机到木屋
    const cabinPos = AH.cabin ? AH.cabin.base : { x: -9, y: 2, z: -5 };
    R.focus = Math.max(4, camera.position.distanceTo(new T.Vector3(cabinPos.x, cabinPos.y + 2.2, cabinPos.z)));
    if (AH.focusOverride) R.focus = AH.focusOverride;

    // 视距随速度轻微变化
    const targetFov = st.mode === 'fp' ? 46 : 43 + clamp(st.speed / RUN, 0, 1) * 3;
    camera.fov = damp(camera.fov, targetFov, 3, dt);
    camera.updateProjectionMatrix();
  }

  function toggleMode() {
    st.mode = st.mode === 'tp' ? 'fp' : 'tp';
  }

  AH.player = {
    state: st,
    update,
    toggleMode,
    keys,
    sit(opts) {
      st.sit = opts;
      st.pos.set(opts.x, opts.y, opts.z);
      st.yaw = opts.yaw;
      if (opts.pitch !== undefined) st.pitch = opts.pitch;
      st.vel.set(0, 0, 0);
      if (opts.type === 'sled') { opts.speed = 0; opts.heading = opts.yaw; }
    },
    stand() { st.sit = null; },
    char,
    get position() { return st.pos; }
  };
})();
