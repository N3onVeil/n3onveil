/* 木屋：原木外墙 + 完整室内陈设 + 火光/灯火 + 碰撞 */
(function () {
  const AH = window.AH, T = AH.T, R = AH.R;
  const scene = R.scene;
  const MOBILE = !!AH.mobile;
  const rng = AH.mulberry32(773311);

  const BASE = new T.Vector3(-9.0, AH.terrainH(-9, -5), -5.0);
  const ROT = 0.18;

  const G = new T.Group();
  G.position.copy(BASE);
  G.rotation.y = ROT;
  scene.add(G);

  /* ---------- 材质 ---------- */
  const M = {
    floor: AH.pbr('floor', [3, 3]),
    log: AH.pbr('log', [2, 2]),
    beam: AH.pbr('beam', [1, 2]),
    stone: AH.pbr('stone', [2, 2]),
    iron: AH.pbr('iron', [1, 1]),
    brass: AH.pbr('brass', [1, 1]),
    wool: AH.pbr('wool', [2, 2]),
    woolRed: AH.pbr('woolRed', [2, 2]),
    fur: AH.pbr('fur', [2, 2]),
    leather: AH.pbr('leather', [1, 1]),
    paper: AH.pbr('paper', [1, 1]),
    ceramic: AH.pbr('ceramic', [1, 1])
  };
  const snowMat = new T.MeshStandardMaterial({
    color: 0xf7f5ef, roughness: 0.92, metalness: 0, envMapIntensity: 0.02
  });
  const linen = new T.MeshStandardMaterial({ color: 0xbfae96, roughness: 0.97, metalness: 0 });
  const glassMat = new T.MeshPhysicalMaterial({
    color: 0x142a38, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28,
    transmission: 0.35, thickness: 0.02, side: T.DoubleSide, envMapIntensity: 1.2
  });
  const glowWarm = new T.MeshBasicMaterial({ color: new T.Color(2.0, 1.15, 0.55), transparent: true, opacity: 0.8 });
  const fireMat = new T.MeshBasicMaterial({ color: new T.Color(3.0, 1.1, 0.35), transparent: true, opacity: 0.9 });
  const wickMat = new T.MeshBasicMaterial({ color: new T.Color(2.4, 1.2, 0.5) });

  function add(geo, mat, x, y, z, rx, ry, rz, shadow) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    G.add(m);
    return m;
  }
  const B = (w, h, d, mat, x, y, z, rx, ry, rz, sh) => add(new T.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz, sh);
  const C = (r1, r2, h, seg, mat, x, y, z, rx, ry, rz, sh) =>
    add(new T.CylinderGeometry(r1, r2, h, seg), mat, x, y, z, rx, ry, rz, sh);

  /* ---------- 基础 ---------- */
  B(9.6, 0.6, 7.9, M.stone, 0, 0.0, 0);          // 石基
  B(9.05, 0.12, 7.15, M.floor, 0, 0.26, 0);      // 室内地板
  B(9.3, 0.10, 7.4, M.beam, 0, 0.14, 0);         // 地板梁

  /* ---------- 原木墙 ---------- */
  const logGeoCache = {};
  function log(len, mat, x, y, z, alongZ) {
    const key = len.toFixed(2) + (alongZ ? 'z' : 'x');
    if (!logGeoCache[key]) logGeoCache[key] = new T.CylinderGeometry(0.175, 0.175, len, 10, 1);
    const g = logGeoCache[key];
    const m = new T.Mesh(g, mat);
    m.position.set(x, y, z);
    m.rotation.z = alongZ ? 0 : Math.PI / 2;
    if (alongZ) m.rotation.x = Math.PI / 2;
    m.castShadow = true; m.receiveShadow = true;
    G.add(m);
  }
  const logMats = [M.log, M.log.clone(), M.log.clone()];
  logMats[1].color.setHex(0xe8d8c6);
  logMats[2].color.setHex(0xd8c4b0);
  function logMat() { return logMats[Math.floor(rng() * 3)]; }

  const wallY0 = 0.42, stepY = 0.335, rows = 9;
  for (let i = 0; i < rows; i++) {
    const y = wallY0 + i * stepY;
    const mat = logMat();
    // 后墙
    log(9.0, mat, 0, y, -3.55, false);
    // 前墙（门洞）
    if (y < 2.28) {
      log(5.9, mat, -1.65, y, 3.55, false);
      log(2.3, logMat(), 3.45, y, 3.55, false);
    } else {
      log(9.0, mat, 0, y, 3.55, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    const y = 0.58 + i * stepY;
    log(7.0, logMat(), 4.55, y, 0, true);
    log(7.0, logMat(), -4.55, y, 0, true);
  }
  // 填缝阴影线
  const chinkMat = AH.simple(0x17100b, 1, 0);
  for (let i = 0; i < 8; i++) {
    const y = 0.42 + i * stepY + stepY * 0.5;
    B(9.0, 0.02, 0.03, chinkMat, 0, y, 3.73, 0, 0, 0, false);
    B(9.0, 0.02, 0.03, chinkMat, 0, y, -3.73, 0, 0, 0, false);
    B(0.03, 0.02, 7.0, chinkMat, 4.72, y, 0, 0, 0, 0, false);
    B(0.03, 0.02, 7.0, chinkMat, -4.72, y, 0, 0, 0, 0, false);
  }
  // 门头梁
  B(1.15, 0.22, 0.42, M.beam, 1.8, 2.36, 3.55);
  // 墙角立柱
  for (const sx of [-4.55, 4.55]) for (const sz of [-3.55, 3.55]) {
    C(0.19, 0.21, 3.1, 10, M.log, sx, 1.75, sz);
  }

  /* ---------- 山墙 / 屋顶 ---------- */
  function gable(z, dir) {
    const g = new T.BufferGeometry();
    const v = new Float32Array([-4.55, 3.28, z, 4.55, 3.28, z, 0, 5.98, z]);
    g.setAttribute('position', new T.BufferAttribute(v, 3));
    g.setIndex(dir > 0 ? [0, 1, 2] : [0, 2, 1]);
    g.computeVertexNormals();
    const m = new T.Mesh(g, M.beam);
    m.material.side = T.DoubleSide;
    m.castShadow = true; m.receiveShadow = true;
    G.add(m);
  }
  gable(3.56, 1); gable(-3.56, -1);

  const roofAng = Math.atan2(2.7, 4.9);
  const slope = Math.hypot(4.9, 2.7);
  for (const sgn of [1, -1]) {
    B(slope, 0.16, 8.15, M.beam, sgn * 2.45, 4.56, 0, 0, 0, -sgn * roofAng).receiveShadow = true;
    const roofSnow = B(slope * 1.03, 0.30, 8.3, snowMat, sgn * 2.45, 4.74, 0, 0, 0, -sgn * roofAng);
    roofSnow.castShadow = false;
    // 椽子略
    // 檐口雪沿
    const lip = C(0.14, 0.14, 8.3, 9, snowMat, sgn * 4.88, 3.38, 0, Math.PI / 2, 0, 0);
    lip.castShadow = true;
  }
  B(0.5, 0.24, 8.35, snowMat, 0, 6.06, 0);      // 脊雪盖

  /* ---------- 门 ---------- */
  const doorFrameY = 1.28;
  B(0.14, 2.1, 0.42, M.beam, 1.24, doorFrameY, 3.55);
  B(0.14, 2.1, 0.42, M.beam, 2.36, doorFrameY, 3.55);
  B(1.3, 0.14, 0.42, M.beam, 1.8, 2.35, 3.55);
  const hinge = new T.Group();
  hinge.position.set(1.30, 0.30, 3.55);
  hinge.rotation.y = -1.85;                      // 向室内敞开
  G.add(hinge);
  const doorPanel = new T.Mesh(new T.BoxGeometry(1.0, 2.0, 0.08), M.beam);
  doorPanel.position.set(0.5, 1.0, 0);
  doorPanel.castShadow = true; doorPanel.receiveShadow = true;
  hinge.add(doorPanel);
  // 门板压条
  for (let i = 0; i < 3; i++) {
    const strip = new T.Mesh(new T.BoxGeometry(0.9, 0.09, 0.03), M.iron);
    strip.position.set(0.5, 0.35 + i * 0.62, 0.06);
    hinge.add(strip);
  }
  C(0.03, 0.03, 0.22, 8, M.brass, 0.92, 1.02, -0.09, Math.PI / 2, 0, 0, false);
  C(0.035, 0.035, 0.08, 8, M.iron, 0.94, 1.04, 0.01, Math.PI / 2, 0, 0, false);
  // 门框暖光
  const spill = new T.PointLight(0xffa860, 7, 6, 2);
  spill.position.set(1.8, 1.2, 3.1);
  G.add(spill);

  /* ---------- 窗 ---------- */
  const windowDefs = [
    { x: -0.8, y: 1.95, w: 1.55, h: 1.15 },
    { x: -3.4, y: 1.95, w: 0.95, h: 0.9 }
  ];
  const paneMat = new T.MeshBasicMaterial({ color: new T.Color(1.05, 0.66, 0.36), transparent: true, opacity: 0.68 });
  const frostPane = new T.MeshStandardMaterial({
    color: 0x2b3c46, roughness: 0.4, metalness: 0.05, transparent: true, opacity: 0.9,
    emissive: 0x0a1218, emissiveIntensity: 0.4
  });
  for (const w of windowDefs) {
    const f = 0.07;
    // 室外侧
    B(w.w + 0.18, f, 0.24, M.beam, w.x, w.y + w.h / 2, 3.82);
    B(w.w + 0.18, f, 0.24, M.beam, w.x, w.y - w.h / 2, 3.82);
    B(f, w.h + 0.14, 0.24, M.beam, w.x - w.w / 2, w.y, 3.82);
    B(f, w.h + 0.14, 0.24, M.beam, w.x + w.w / 2, w.y, 3.82);
    B(0.05, w.h, 0.04, M.beam, w.x, w.y, 3.86);
    B(w.w, 0.05, 0.04, M.beam, w.x, w.y + 0.04, 3.86);
    const glass = new T.Mesh(new T.PlaneGeometry(w.w, w.h), glassMat);
    glass.position.set(w.x, w.y, 3.85);
    G.add(glass);
    const warm = new T.Mesh(new T.PlaneGeometry(w.w * 0.94, w.h * 0.94), paneMat);
    warm.position.set(w.x, w.y, 3.87);
    G.add(warm);
    const spillW = new T.PointLight(0xffb060, 1.4, 4.5, 2);
    spillW.position.set(w.x, w.y - 0.1, 4.6);
    G.add(spillW);
    B(w.w + 0.34, 0.08, 0.32, M.beam, w.x, w.y - w.h / 2 - 0.09, 3.74);
    // 室内侧窗框
    B(w.w + 0.16, 0.07, 0.16, M.beam, w.x, w.y + w.h / 2, 3.34);
    B(w.w + 0.16, 0.07, 0.16, M.beam, w.x, w.y - w.h / 2, 3.34);
    B(0.07, w.h, 0.16, M.beam, w.x - w.w / 2, w.y, 3.34);
    B(0.07, w.h, 0.16, M.beam, w.x + w.w / 2, w.y, 3.34);
    const pane = new T.Mesh(new T.PlaneGeometry(w.w, w.h), frostPane);
    pane.position.set(w.x, w.y, 3.36);
    pane.rotation.y = Math.PI;
    G.add(pane);
    // 窗台
    B(w.w + 0.3, 0.07, 0.3, M.beam, w.x, w.y - w.h / 2 - 0.06, 3.30);
    // 窗帘
    for (const s of [-1, 1]) {
      const cur = new T.Mesh(new T.BoxGeometry(0.30, w.h + 0.55, 0.06), M.wool);
      cur.position.set(w.x + s * (w.w / 2 + 0.16), w.y + 0.12, 3.24);
      cur.castShadow = true;
      G.add(cur);
    }
  }

  /* ---------- 室内：地面 / 天花板 ---------- */
  const rug = B(3.5, 0.035, 2.35, M.woolRed, -0.2, 0.335, 0.55);
  rug.castShadow = false;
  for (let i = 0; i < 16; i++) {
    B(0.035, 0.012, 0.12, M.wool, -1.93 + i * 0.23, 0.335, 1.72 + 0.0, 0, 0, 0, false);
    B(0.035, 0.012, 0.12, M.wool, -1.93 + i * 0.23, 0.335, -0.62 + 0.0, 0, 0, 0, false);
  }
  B(1.4, 0.01, 0.9, M.wool, -0.2, 0.36, 0.55, 0, 0.2, 0, false); // 磨损补丁
  B(8.95, 0.08, 7.05, M.beam, 0, 3.30, 0);       // 天花
  for (let i = 0; i < 5; i++) {
    B(8.9, 0.20, 0.16, M.beam, 0, 3.18, -3.0 + i * 1.5); // 梁
  }

  /* ---------- 炉子 ---------- */
  const stoveX = 3.55, stoveZ = -2.25;
  B(1.05, 0.06, 0.95, M.stone, stoveX, 0.35, stoveZ);      // 炉底石
  const stove = B(0.72, 0.82, 0.62, M.iron, stoveX, 0.78, stoveZ);
  B(0.72, 0.08, 0.62, M.iron, stoveX, 1.19, stoveZ);
  for (const sx of [-0.28, 0.28]) for (const sz of [-0.22, 0.22]) {
    C(0.035, 0.035, 0.26, 8, M.iron, stoveX + sx, 0.5, stoveZ + sz);
  }
  // 炉门 + 火
  B(0.42, 0.34, 0.05, M.iron, stoveX, 0.82, stoveZ + 0.33);
  B(0.30, 0.22, 0.02, new T.MeshBasicMaterial({ color: new T.Color(2.2, 0.7, 0.2) }), stoveX, 0.82, stoveZ + 0.36, 0, 0, 0, false);
  C(0.03, 0.03, 0.16, 8, M.brass, stoveX + 0.18, 0.90, stoveZ + 0.38, 0, 0, Math.PI / 2, false);
  // 烟囱管
  C(0.10, 0.10, 3.0, 12, M.iron, stoveX, 3.0, stoveZ);
  C(0.13, 0.13, 0.12, 12, M.iron, stoveX, 1.55, stoveZ);
  // 水壶
  const kettle = new T.Mesh(new T.SphereGeometry(0.16, 14, 10), M.iron);
  kettle.position.set(stoveX - 0.05, 1.10, stoveZ + 0.05);
  kettle.scale.set(1, 0.8, 1);
  kettle.castShadow = true; G.add(kettle);
  C(0.03, 0.03, 0.18, 8, M.iron, stoveX - 0.05, 1.24, stoveZ + 0.05);
  const handle = new T.Mesh(new T.TorusGeometry(0.14, 0.018, 5, 12, Math.PI), M.iron);
  handle.position.set(stoveX - 0.05, 1.16, stoveZ + 0.05);
  handle.rotation.z = 0.2; G.add(handle);
  // 炉边柴
  for (let i = 0; i < 8; i++) {
    C(0.055, 0.06, 0.5, 7, M.beam, stoveX - 0.75 + (i % 2) * 0.13, 0.42 + Math.floor(i / 4) * 0.11, stoveZ + 0.45 + (i % 3) * 0.12, 0, 0, Math.PI / 2);
  }

  /* ---------- 床 ---------- */
  const bedX = -2.7, bedZ = -2.45;
  B(2.05, 0.22, 1.5, M.beam, bedX, 0.56, bedZ);
  for (const sx of [-1.0, 1.0]) {
    B(0.12, 1.15, 0.12, M.beam, bedX + sx, 0.86, bedZ - 0.65);
  }
  B(2.1, 0.9, 0.10, M.beam, bedX, 1.28, bedZ - 0.72); // 床头板
  B(1.9, 0.24, 1.38, linen, bedX, 0.78, bedZ);       // 床垫
  B(1.7, 0.12, 1.05, M.woolRed, bedX + 0.1, 0.92, bedZ + 0.1); // 毯子
  B(0.95, 0.10, 1.34, M.fur, bedX + 0.38, 0.96, bedZ + 0.02);  // 毛皮
  B(0.62, 0.16, 0.40, linen, bedX - 0.62, 0.96, bedZ - 0.5); // 枕
  B(0.66, 0.05, 1.2, M.wool, bedX + 0.5, 1.02, bedZ + 0.42);    // 折叠毯
  B(0.30, 0.09, 0.34, linen, bedX + 0.55, 0.99, bedZ - 0.52); // 第二个枕
  B(1.62, 0.08, 1.02, M.wool, bedX + 0.06, 0.94, bedZ + 0.16);  // 羊毛被
  B(1.66, 0.04, 0.18, M.fur, bedX + 0.06, 0.99, bedZ + 0.62);   // 被沿毛边
  // 床下木箱
  B(0.9, 0.32, 0.65, M.beam, bedX - 0.2, 0.42, bedZ + 0.35);

  /* ---------- 桌 / 椅 ---------- */
  const tableX = -0.35, tableZ = 0.65;
  B(1.7, 0.08, 0.95, M.beam, tableX, 0.80, tableZ);
  for (const sx of [-0.7, 0.7]) for (const sz of [-0.35, 0.35]) {
    B(0.09, 0.75, 0.09, M.beam, tableX + sx, 0.42, tableZ + sz);
  }
  B(1.5, 0.10, 0.08, M.beam, tableX, 0.70, tableZ - 0.42);
  // 桌上：杯、盘、地图、蜡烛、刀、面包
  C(0.045, 0.04, 0.10, 12, M.ceramic, tableX - 0.5, 0.89, tableZ + 0.18);
  const mugHandle = new T.Mesh(new T.TorusGeometry(0.038, 0.010, 6, 10, Math.PI * 1.4), M.ceramic);
  mugHandle.position.set(tableX - 0.45, 0.89, tableZ + 0.18); mugHandle.rotation.y = Math.PI / 2; G.add(mugHandle);
  C(0.13, 0.12, 0.012, 20, M.ceramic, tableX + 0.35, 0.85, tableZ + 0.2);
  C(0.10, 0.11, 0.05, 16, M.ceramic, tableX + 0.35, 0.87, tableZ + 0.2);
  // 桌面纸张（可书写）
  const paperCv = document.createElement('canvas');
  paperCv.width = 512; paperCv.height = 384;
  const pctx = paperCv.getContext('2d');
  function drawPaper(text) {
    pctx.fillStyle = '#cfc3a8'; pctx.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 40; i++) {
      pctx.fillStyle = `rgba(110,90,60,${Math.random() * 0.05})`;
      pctx.fillRect(Math.random() * 512, Math.random() * 384, 40 + Math.random() * 90, 20 + Math.random() * 50);
    }
    pctx.strokeStyle = 'rgba(120,100,70,0.28)'; pctx.lineWidth = 1;
    for (let y = 60; y < 360; y += 34) { pctx.beginPath(); pctx.moveTo(36, y); pctx.lineTo(476, y); pctx.stroke(); }
    pctx.fillStyle = '#2a2016';
    pctx.font = '22px "Songti SC", serif';
    const lines = (text || '').split('\n');
    lines.slice(0, 9).forEach((ln, i) => pctx.fillText(ln.slice(0, 20), 40, 78 + i * 34));
  }
  drawPaper('');
  const paperTex = new T.CanvasTexture(paperCv);
  paperTex.colorSpace = T.SRGBColorSpace;
  paperTex.anisotropy = 4;
  const paperMesh = new T.Mesh(new T.PlaneGeometry(0.42, 0.30),
    new T.MeshStandardMaterial({ map: paperTex, roughness: 0.92, metalness: 0 }));
  paperMesh.rotation.set(-Math.PI / 2, 0, 0.18);
  paperMesh.position.set(tableX + 0.1, 0.852, tableZ - 0.18);
  G.add(paperMesh);
  C(0.022, 0.023, 0.22, 8, M.ceramic, tableX - 0.15, 0.91, tableZ - 0.25);
  const flame = new T.Mesh(new T.SphereGeometry(0.018, 8, 6), wickMat);
  flame.position.set(tableX - 0.15, 1.03, tableZ - 0.25);
  flame.scale.y = 1.8; G.add(flame);
  // 桌上杂物
  const glassGreen = new T.MeshPhysicalMaterial({
    color: 0x2e4a30, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.75,
    transmission: 0.35, thickness: 0.04
  });
  C(0.036, 0.046, 0.22, 12, glassGreen, tableX + 0.62, 0.93, tableZ - 0.02);
  C(0.018, 0.02, 0.09, 8, glassGreen, tableX + 0.62, 1.08, tableZ - 0.02);
  B(0.20, 0.03, 0.14, new T.MeshStandardMaterial({ color: 0x4a2a20, roughness: 0.7 }), tableX + 0.58, 0.86, tableZ + 0.28, 0, 0.25, 0, false);
  B(0.18, 0.02, 0.12, M.paper, tableX + 0.58, 0.88, tableZ + 0.28, 0, 0.3, 0, false);
  // 刀 / 面包 / 炖锅
  B(0.015, 0.008, 0.19, M.iron, tableX - 0.02, 0.85, tableZ + 0.12, 0, 0.5, 0, false);
  B(0.035, 0.02, 0.05, M.leather, tableX + 0.04, 0.85, tableZ + 0.02, 0, 0.5, 0, false);
  const bread = new T.Mesh(new T.SphereGeometry(0.09, 12, 8), new T.MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.85 }));
  bread.position.set(tableX + 0.18, 0.87, tableZ + 0.2);
  bread.scale.set(1.3, 0.6, 0.8); bread.castShadow = true; G.add(bread);
  C(0.085, 0.07, 0.055, 16, M.iron, tableX - 0.02, 0.86, tableZ - 0.02);
  C(0.075, 0.075, 0.012, 16, new T.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.5 }), tableX - 0.02, 0.885, tableZ - 0.02, 0, 0, 0, false);
  // 椅
  function chair(x, z, ry) {
    const c = new T.Group();
    c.position.set(x, 0.30, z); c.rotation.y = ry; G.add(c);
    const seat = new T.Mesh(new T.BoxGeometry(0.46, 0.05, 0.44), M.beam);
    seat.position.y = 0.44; seat.castShadow = true; c.add(seat);
    for (const sx of [-0.19, 0.19]) for (const sz of [-0.18, 0.18]) {
      const leg = new T.Mesh(new T.BoxGeometry(0.05, 0.44, 0.05), M.beam);
      leg.position.set(sx, 0.22, sz); leg.castShadow = true; c.add(leg);
    }
    const back = new T.Mesh(new T.BoxGeometry(0.46, 0.5, 0.05), M.beam);
    back.position.set(0, 0.69, -0.20); back.castShadow = true; c.add(back);
    return c;
  }
  chair(tableX - 0.55, tableZ + 0.85, Math.PI + 0.1);
  chair(tableX + 0.5, tableZ - 0.8, 0.15);

  /* ---------- 置物架 / 书 / 罐 ---------- */
  const shelfX = -4.28, shelfZ = 0.4;
  for (const y of [1.35, 1.85]) {
    B(0.12, 0.05, 1.9, M.beam, shelfX + 0.22, y, shelfZ);
    B(0.06, 0.25, 0.06, M.iron, shelfX + 0.42, y - 0.14, shelfZ - 0.7);
    B(0.06, 0.25, 0.06, M.iron, shelfX + 0.42, y - 0.14, shelfZ + 0.7);
  }
  const bookCols = [0x6a2c22, 0x2c3c55, 0x4a5a32, 0x6b5a3a, 0x3a2c44, 0x7a4a2a];
  for (let i = 0; i < 9; i++) {
    const w = 0.04 + rng() * 0.03, h = 0.20 + rng() * 0.08;
    const b = new T.Mesh(new T.BoxGeometry(w, h, 0.17),
      new T.MeshStandardMaterial({ color: bookCols[i % bookCols.length], roughness: 0.85 }));
    b.position.set(shelfX + 0.30, 1.35 + h / 2 + 0.03, shelfZ - 0.65 + i * 0.055);
    b.rotation.x = (rng() - 0.5) * 0.08;
    b.castShadow = true; G.add(b);
  }
  for (let i = 0; i < 4; i++) {
    const jar = C(0.055, 0.055, 0.14, 12, M.ceramic, shelfX + 0.3, 1.85 + 0.1, shelfZ + 0.1 + i * 0.13);
    jar.castShadow = true;
    C(0.045, 0.05, 0.02, 12, M.iron, shelfX + 0.3, 1.85 + 0.18, shelfZ + 0.1 + i * 0.13, 0, 0, 0, false);
  }
  // 墙上的地图 / 照片
  B(1.15, 0.75, 0.02, M.paper, -2.2, 2.15, -3.38);
  // 炉上方烟熏
  const sootTex = AH.makeSmokeTexture(128);
  const soot = new T.Mesh(new T.PlaneGeometry(1.7, 2.1), new T.MeshBasicMaterial({
    map: sootTex, color: 0x050403, transparent: true, opacity: 0.55, depthWrite: false
  }));
  soot.position.set(3.2, 2.45, -3.36);
  G.add(soot);
  for (let i = 0; i < 3; i++) {
    B(0.20, 0.24, 0.015, M.paper, 1.1 + i * 0.28, 2.1, 3.42, 0, 0, (rng() - 0.5) * 0.06, false);
    B(0.16, 0.20, 0.005, new T.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.4 }), 1.1 + i * 0.28, 2.1, 3.41, 0, 0, 0, false);
  }

  /* ---------- 箱子 / 衣柜 / 杂物 ---------- */
  const chest = B(1.0, 0.52, 0.62, M.beam, -2.65, 0.56, -0.85);
  for (const sx of [-0.4, 0.4]) B(0.05, 0.54, 0.64, M.iron, -2.65 + sx, 0.56, -0.85);
  B(0.16, 0.12, 0.05, M.brass, -2.65, 0.62, -0.52);
  // 水桶 / 盆
  C(0.17, 0.14, 0.32, 14, M.iron, 2.75, 0.5, 0.9);
  C(0.20, 0.17, 0.07, 14, M.iron, 2.75, 0.34, 1.35);
  // 斧
  C(0.02, 0.022, 0.85, 7, M.beam, 2.35, 0.72, 3.2, 0, 0, 0.18);
  B(0.18, 0.13, 0.04, M.iron, 2.40, 1.10, 3.2, 0, 0, 0.18);
  // 挂衣架
  C(0.035, 0.04, 1.9, 8, M.beam, 2.95, 1.25, 2.85);
  B(0.55, 0.04, 0.04, M.beam, 2.95, 2.05, 2.85);
  // 大衣
  const coat = new T.Mesh(new T.CylinderGeometry(0.18, 0.24, 0.95, 10), M.wool);
  coat.position.set(2.75, 1.55, 2.85); coat.castShadow = true; G.add(coat);
  B(0.42, 0.12, 0.42, M.fur, 2.75, 2.05, 2.85);
  // 靴子
  for (const sx of [-0.12, 0.12]) {
    B(0.14, 0.32, 0.22, M.leather, 3.2 + sx, 0.44, 2.75);
  }
  // 雪鞋
  for (const sz of [-0.22, 0.22]) {
    const shoe = new T.Mesh(new T.TorusGeometry(0.32, 0.02, 5, 16), M.leather);
    shoe.position.set(-1.4, 1.85, 3.35 + sz); shoe.scale.set(0.55, 1, 1);
    shoe.rotation.y = Math.PI / 2; G.add(shoe);
  }

  /* ---------- 电台桌 ---------- */
  const deskX = 3.85, deskZ = 1.15;
  B(1.05, 0.07, 0.55, M.beam, deskX, 0.96, deskZ);
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.2, 0.2]) {
    B(0.07, 0.66, 0.07, M.beam, deskX + sx, 0.63, deskZ + sz);
  }
  B(0.52, 0.30, 0.24, M.iron, deskX, 1.14, deskZ);
  B(0.34, 0.16, 0.01, new T.MeshStandardMaterial({ color: 0x2a2a20, roughness: 0.4 }), deskX, 1.16, deskZ + 0.13, 0, 0, 0, false);
  for (let i = 0; i < 3; i++) {
    C(0.035, 0.035, 0.02, 10, M.brass, deskX - 0.12 + i * 0.12, 1.10, deskZ + 0.14, Math.PI / 2, 0, 0, false);
  }
  C(0.008, 0.008, 0.7, 5, M.iron, deskX + 0.2, 1.55, deskZ - 0.05, 0.3, 0, 0.2);
  for (let i = 0; i < 3; i++) B(0.24, 0.005, 0.32, M.paper, deskX - 0.1, 1.0, deskZ + 0.05 + i * 0.008, 0, (rng() - 0.5) * 0.3, 0, false);

  /* ---------- 灯 / 火 / 烟 ---------- */
  // 吊灯
  const lantern = new T.Group();
  lantern.position.set(0.0, 2.55, 0.5);
  G.add(lantern);
  C(0.005, 0.005, 0.55, 5, M.iron, 0, 0.28, 0, 0, 0, 0, false);
  C(0.06, 0.07, 0.16, 10, M.brass, 0, 0, 0);
  const lanternGlass = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, 0.13, 10), wickMat);
  lanternGlass.position.y = 0; lantern.add(lanternGlass);
  for (let i = 0; i < 4; i++) {
    const bar = new T.Mesh(new T.BoxGeometry(0.012, 0.15, 0.012), M.iron);
    const a = i * Math.PI / 2;
    bar.position.set(Math.cos(a) * 0.058, 0, Math.sin(a) * 0.058);
    lantern.add(bar);
  }
  C(0.075, 0.06, 0.05, 10, M.iron, 0, 0.10, 0);
  C(0.06, 0.075, 0.04, 10, M.iron, 0, -0.10, 0);
  // 蜡烛群
  const candleGroup = new T.Group(); candleGroup.position.set(-0.55, 1.22, -3.05); G.add(candleGroup);
  for (let i = 0; i < 3; i++) {
    C(0.022, 0.024, 0.12 + i * 0.03, 8, M.ceramic, i * 0.09 - 0.08, 0.06, 0, 0, 0, 0, false);
    const fl = new T.Mesh(new T.SphereGeometry(0.012, 6, 5), wickMat);
    fl.position.set(i * 0.09 - 0.08, 0.14 + i * 0.03, 0); fl.scale.y = 1.8; candleGroup.add(fl);
  }
  // 壁炉火光
  const fireLight = new T.PointLight(0xff7a38, 20, 14, 2);
  fireLight.position.set(stoveX, 0.85, stoveZ + 0.2);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(MOBILE ? 256 : 512, MOBILE ? 256 : 512);
  fireLight.shadow.bias = -0.004;
  fireLight.shadow.camera.near = 0.2; fireLight.shadow.camera.far = 9;
  G.add(fireLight);
  const lanternLight = new T.PointLight(0xffb46a, 12, 10, 2);
  lanternLight.position.set(0, 2.45, 0.5);
  G.add(lanternLight);
  const ceilingFill = new T.PointLight(0xffd6b0, 3.5, 12, 2);
  ceilingFill.position.set(-0.4, 2.95, 0.2);
  G.add(ceilingFill);
  const candleLight = new T.PointLight(0xffa050, 2.5, 3.5, 2);
  candleLight.position.set(-0.55, 1.35, -3.0);
  G.add(candleLight);
  const windowFill = new T.PointLight(0xb8d8ff, 4, 9, 2);
  windowFill.position.set(-0.8, 1.9, 3.05);
  G.add(windowFill);
  let lampOn = true, candleOn = true, fireOn = true;
  for (const wx of [-0.8, -3.4]) {
    const wl = new T.PointLight(0xffb060, 2.4, 4, 2);
    wl.position.set(wx, 2.0, 3.05);
    G.add(wl);
  }

  // 火焰 sprite
  const fireTex = AH.makeRadialTexture(128);
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const mat = new T.SpriteMaterial({
      map: fireTex, color: 0xff8a3a, transparent: true, opacity: 0.75,
      blending: T.AdditiveBlending, depthWrite: false
    });
    const sp = new T.Sprite(mat);
    sp.position.set(stoveX - 0.12 + i * 0.08, 0.8, stoveZ + 0.40);
    sp.scale.set(0.22, 0.3, 1);
    G.add(sp);
    flames.push({ sp, phase: rng() * 6.28, speed: 3 + rng() * 3 });
  }
  // 烟
  const smokeTex = AH.makeSmokeTexture(128);
  const smokes = [];
  for (let i = 0; i < 12; i++) {
    const mat = new T.SpriteMaterial({
      map: smokeTex, color: 0x9ab6c8, transparent: true, opacity: 0,
      depthWrite: false, fog: true
    });
    const sp = new T.Sprite(mat);
    sp.position.set(3.1, 6.3, -2.3);
    sp.scale.set(0.6, 0.6, 1);
    G.add(sp);
    smokes.push({ sp, life: rng() * 6, speed: 0.35 + rng() * 0.2, phase: rng() });
  }

  /* ---------- 屋顶/外墙细节 ---------- */
  // 烟囱
  B(1.05, 2.4, 1.05, M.stone, 3.1, 5.6, -2.3);
  B(1.22, 0.2, 1.22, M.stone, 3.1, 6.86, -2.3);
  B(1.26, 0.14, 1.26, snowMat, 3.1, 6.99, -2.3);
  // 冰柱
  for (let i = 0; i < 14; i++) {
    const len = 0.12 + rng() * 0.5;
    const ic = new T.Mesh(new T.ConeGeometry(0.03 + rng() * 0.015, len, 5),
      new T.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.75 }));
    ic.position.set(4.88, 3.2 - len / 2, -3.3 + i * 0.5);
    ic.rotation.x = Math.PI; G.add(ic);
  }
  // 门廊
  B(2.9, 0.12, 2.1, M.beam, 1.8, 2.62, 4.55);
  const porchSnow = B(3.0, 0.18, 2.2, snowMat, 1.8, 2.74, 4.55);
  porchSnow.castShadow = false;
  for (const x of [0.55, 3.05]) C(0.08, 0.09, 2.4, 8, M.beam, x, 1.42, 5.3);
  B(2.6, 0.14, 0.9, M.stone, 1.8, 0.12, 4.6);
  B(2.6, 0.14, 0.7, M.stone, 1.8, 0.26, 4.0);
  // 门廊灯
  C(0.05, 0.06, 0.16, 10, M.brass, 0.75, 2.05, 4.15);
  const porchGlass = new T.Mesh(new T.CylinderGeometry(0.048, 0.048, 0.11, 10), wickMat);
  porchGlass.position.set(0.75, 2.05, 4.15); G.add(porchGlass);
  const porchLamp = new T.PointLight(0xffb060, 6, 7, 2);
  porchLamp.position.set(0.75, 2.0, 4.2);
  G.add(porchLamp);
  // 屋外柴堆 / 雪橇
  for (let i = 0; i < 18; i++) {
    C(0.07, 0.075, 0.9, 7, M.beam, -4.2 + (i % 6) * 0.15, 0.36 + Math.floor(i / 6) * 0.14, 4.9 + (i % 3) * 0.14, 0, 0, Math.PI / 2);
  }
  const sled = new T.Group();
  sled.position.set(-6.0, 0.05, 3.4); sled.rotation.y = 0.5; G.add(sled);
  const sledBody = new T.Mesh(new T.BoxGeometry(1.7, 0.4, 0.8), M.leather);
  sledBody.position.y = 0.3; sled.add(sledBody);
  B(0.9, 0.18, 0.55, M.beam, -0.2, 0.6, 0);
  for (const sz of [-0.45, 0.45]) B(1.3, 0.06, 0.1, M.iron, 0.9, 0.08, sz);

  /* ---------- 追加细节：接触阴影 / 侧窗 / 挂具 / 步枪 ---------- */
  const shadowCv = document.createElement('canvas');
  shadowCv.width = shadowCv.height = 128;
  {
    const ctx = shadowCv.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = new T.CanvasTexture(shadowCv);
  const contactMat = new T.MeshBasicMaterial({
    map: shadowTex, color: 0x000000, transparent: true, opacity: 0.42,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1
  });
  function contact(x, z, w, d, y) {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), contactMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y === undefined ? 0.326 : y, z);
    G.add(m);
  }
  contact(-0.35, 0.65, 2.2, 1.4);
  contact(-2.7, -2.45, 2.5, 1.9);
  contact(3.55, -2.25, 1.5, 1.3);
  contact(-2.65, -0.85, 1.3, 0.9);
  contact(3.85, 1.15, 1.35, 0.9);
  contact(-1.2, 1.5, 0.8, 0.8);
  contact(0.5, 0.0, 0.8, 0.8);
  // 门口到桌子的磨损路径
  const wearTex = shadowTex;
  const wear = new T.Mesh(new T.PlaneGeometry(1.1, 3.4), new T.MeshBasicMaterial({
    map: wearTex, color: 0x2a1a10, transparent: true, opacity: 0.22, depthWrite: false
  }));
  wear.rotation.x = -Math.PI / 2;
  wear.rotation.z = -0.25;
  wear.position.set(0.6, 0.322, 1.9);
  G.add(wear);

  // 侧窗（左侧墙）
  {
    const wx = -4.42, wy = 2.0, wz = 1.15, ww = 0.85, wh = 0.8;
    B(0.10, wh + 0.14, 0.07, M.beam, wx + 0.04, wy + wh / 2, wz - ww / 2);
    B(0.10, wh + 0.14, 0.07, M.beam, wx + 0.04, wy + wh / 2, wz + ww / 2);
    B(0.10, 0.07, ww + 0.14, M.beam, wx + 0.04, wy - wh / 2, wz);
    B(0.10, 0.07, ww + 0.14, M.beam, wx + 0.04, wy + wh / 2, wz);
    const pane = new T.Mesh(new T.PlaneGeometry(ww, wh), frostPane);
    pane.rotation.y = Math.PI / 2;
    pane.position.set(wx + 0.05, wy, wz);
    G.add(pane);
    for (const s of [-1, 1]) {
      const cur = new T.Mesh(new T.BoxGeometry(0.06, wh + 0.45, 0.26), M.wool);
      cur.position.set(wx + 0.10, wy + 0.1, wz + s * (ww / 2 + 0.15));
      cur.castShadow = true; G.add(cur);
    }
    const wl = new T.PointLight(0x9fc4ff, 2.0, 6, 2);
    wl.position.set(wx + 1.0, wy, wz);
    G.add(wl);
  }

  // 吊锅 / 香草
  for (const [px, pz, r] of [[2.45, -2.55, 0.09], [2.72, -2.75, 0.07]]) {
    C(0.008, 0.008, 0.34, 5, M.iron, px, 2.42, pz, 0, 0, 0, false);
    C(r, r * 0.8, r * 1.5, 12, M.iron, px, 2.22, pz);
    C(r * 0.9, r * 0.9, 0.012, 12, new T.MeshStandardMaterial({ color: 0x241a10, roughness: 0.9 }), px, 2.26, pz, 0, 0, 0, false);
  }
  for (let i = 0; i < 6; i++) {
    const hx = 1.15 + (i % 3) * 0.10, hz = -3.15 + Math.floor(i / 3) * 0.10;
    C(0.006, 0.008, 0.26, 5, new T.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 1 }), hx, 2.5, hz);
    const leaf = new T.Mesh(new T.ConeGeometry(0.035, 0.18, 5), new T.MeshStandardMaterial({ color: 0x4a4a26, roughness: 1 }));
    leaf.position.set(hx, 2.36, hz); leaf.rotation.x = Math.PI; G.add(leaf);
  }

  // 步枪
  B(0.55, 0.06, 0.05, M.beam, -2.55, 2.55, -3.36, 0, 0, 0.02);
  C(0.018, 0.022, 0.72, 8, M.iron, -2.02, 2.57, -3.36, 0, 0, Math.PI / 2);
  B(0.10, 0.10, 0.03, M.iron, -2.62, 2.55, -3.33);

  // 长凳 / 水盆
  B(1.15, 0.07, 0.34, M.beam, -3.95, 0.53, 1.2);
  for (const sz of [-0.13, 0.13]) B(1.05, 0.23, 0.05, M.beam, -3.95, 0.41, 1.2 + sz);
  C(0.27, 0.30, 0.26, 16, M.iron, -3.6, 0.46, 2.55);
  C(0.24, 0.24, 0.01, 16, new T.MeshStandardMaterial({ color: 0x121a1e, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85 }), -3.6, 0.58, 2.55, 0, 0, 0, false);

  // 山墙小窗
  B(0.86, 0.08, 0.14, M.beam, 0, 4.88, 3.60);
  B(0.86, 0.08, 0.14, M.beam, 0, 4.26, 3.60);
  B(0.08, 0.70, 0.14, M.beam, -0.42, 4.57, 3.60);
  B(0.08, 0.70, 0.14, M.beam, 0.42, 4.57, 3.60);
  const gw = new T.Mesh(new T.PlaneGeometry(0.76, 0.6), paneMat);
  gw.position.set(0, 4.57, 3.64);
  G.add(gw);
  const gwLight = new T.PointLight(0xffb060, 2.2, 3, 2);
  gwLight.position.set(0, 4.5, 3.3);
  G.add(gwLight);

  // 门廊栏杆
  for (const [x0, x1] of [[0.55, 1.15], [2.45, 3.05]]) {
    B(x1 - x0, 0.06, 0.06, M.beam, (x0 + x1) / 2, 1.12, 5.25);
    B(x1 - x0, 0.06, 0.06, M.beam, (x0 + x1) / 2, 0.78, 5.25);
  }

  /* ---------- 交互 ---------- */
  G.updateMatrixWorld(true);
  const IA = (AH.interactables = AH.interactables || []);
  function reg(local, label, fn, r) {
    const p = new T.Vector3(local[0], local[1], local[2]);
    G.localToWorld(p);
    IA.push({ pos: p, label, fn, r: r || 2.0 });
  }
  function sitAt(lx, lz, eye, type) {
    const p = new T.Vector3(lx, 0.30 + 0.46, lz); G.localToWorld(p);
    const t = new T.Vector3(tableX, 0.4, tableZ); G.localToWorld(t);
    const yaw = Math.atan2(t.x - p.x, -(t.z - p.z));
    if (AH.player && AH.player.sit) AH.player.sit({ x: p.x, y: p.y, z: p.z, yaw, eye, type });
  }
  reg([tableX - 0.55, 1.0, tableZ + 0.85], '坐下', () => sitAt(tableX - 0.55, tableZ + 0.85, 0.58, 'chair'));
  reg([tableX + 0.5, 1.0, tableZ - 0.8], '坐下', () => sitAt(tableX + 0.5, tableZ - 0.8, 0.58, 'chair'));
  reg([bedX, 1.2, bedZ], '躺下', () => {
    const p = new T.Vector3(bedX, 1.02, bedZ); G.localToWorld(p);
    const t = new T.Vector3(bedX - 0.6, 0.4, bedZ - 1.5); G.localToWorld(t);
    const yaw = Math.atan2(t.x - p.x, -(t.z - p.z));
    if (AH.player && AH.player.sit) AH.player.sit({ x: p.x, y: p.y, z: p.z, yaw, eye: 0.40, type: 'bed', pitch: 1.15 });
  });
  reg([tableX + 0.1, 0.9, tableZ - 0.18], '书写', () => AH.ui && AH.ui.openPaper());
  reg([tableX + 0.58, 0.9, tableZ + 0.28], '阅读日志', () => AH.ui && AH.ui.openBook('补给队日志',
    '第三十七日。煤油只剩两罐。\n\n极光今夜低得反常，像有人把帘子掀开了一角。\n\n我在石环边捡到一枚黄铜扣子，不属于我们的人。'));
  reg([shelfX + 0.35, 1.45, shelfZ], '翻看书架', () => AH.ui && AH.ui.openBook('极地生存手册',
    '一、失温从指尖开始。若手指发白而无痛感，立即回火边。\n\n二、雪水必须煮沸。\n\n三、不要在极光最亮时独自出门。'));
  reg([0, 2.35, 0.5], '开关吊灯', () => { lampOn = !lampOn; lanternGlass.visible = lampOn; });
  reg([-0.55, 1.3, -3.0], '吹灭 / 点燃蜡烛', () => { candleOn = !candleOn; });
  reg([stoveX, 0.95, stoveZ + 0.7], '压灭 / 添柴', () => { fireOn = !fireOn; });

  /* ---------- 碰撞与地面 ---------- */
  const solids = [
    // 前墙（门洞 1.3..2.3）
    { x0: -4.75, x1: 1.30, z0: 3.32, z1: 3.78 },
    { x0: 2.30, x1: 4.75, z0: 3.32, z1: 3.78 },
    { x0: -4.75, x1: 4.75, z0: -3.78, z1: -3.32 },
    { x0: -4.82, x1: -4.28, z0: -3.78, z1: 3.78 },
    { x0: 4.28, x1: 4.82, z0: -3.78, z1: 3.78 },
    // 家具
    { x0: -1.35, x1: 0.65, z0: 0.05, z1: 1.25 },   // 桌
    { x0: -3.85, x1: -1.55, z0: -3.4, z1: -1.55 },  // 床
    { x0: 2.95, x1: 4.15, z0: -2.95, z1: -1.55 },   // 炉
    { x0: -4.35, x1: -3.85, z0: -0.7, z1: 1.5 },    // 架
    { x0: -3.2, x1: -2.1, z0: -1.2, z1: -0.5 },     // 箱
    { x0: 3.2, x1: 4.4, z0: 0.55, z1: 1.75 }        // 电台桌
  ];

  const invQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -ROT);
  const tmpV = new T.Vector3();

  function toLocal(p) {
    tmpV.copy(p).sub(BASE).applyQuaternion(invQ);
    return tmpV;
  }

  function collide(pos, r) {
    const l = toLocal(pos);
    let lx = l.x, lz = l.z;
    for (const s of solids) {
      const ex0 = s.x0 - r, ex1 = s.x1 + r, ez0 = s.z0 - r, ez1 = s.z1 + r;
      if (lx > ex0 && lx < ex1 && lz > ez0 && lz < ez1) {
        const dl = lx - ex0, dr = ex1 - lx, db = lz - ez0, df = ez1 - lz;
        const m = Math.min(dl, dr, db, df);
        if (m === dl) lx = ex0; else if (m === dr) lx = ex1;
        else if (m === db) lz = ez0; else lz = ez1;
      }
    }
    if (lx !== l.x || lz !== l.z) {
      const out = new T.Vector3(lx, l.y, lz).applyQuaternion(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ROT)).add(BASE);
      pos.x = out.x; pos.z = out.z;
    }
  }

  function floorAt(p) {
    const l = toLocal(p);
    if (l.x > -4.5 && l.x < 4.5 && l.z > -3.6 && l.z < 3.7) return BASE.y + 0.30;
    if (l.x > 0.3 && l.x < 3.3 && l.z >= 3.7 && l.z < 4.4) return BASE.y + 0.33;
    if (l.x > 0.3 && l.x < 3.3 && l.z >= 4.4 && l.z < 5.1) return BASE.y + 0.19;
    return null;
  }

  const cabin = {
    group: G, base: BASE, rot: ROT, solids,
    toLocal, collide, floorAt,
    update(t, dt) {
      const flick = 17 + Math.sin(t * 7.1) * 3.5 + Math.sin(t * 13.7) * 2.2 + Math.sin(t * 23.3) * 1.4;
      fireLight.intensity = fireOn ? flick : 0;
      lanternLight.intensity = lampOn ? 12 + Math.sin(t * 2.3) * 0.8 : 0;
      candleLight.intensity = candleOn ? 3.0 + Math.sin(t * 9.0) * 0.6 : 0;
      for (const f of flames) f.sp.visible = fireOn;
      candleGroup.visible = candleOn;
      lantern.position.y = 2.55 + Math.sin(t * 0.9) * 0.012;
      lantern.rotation.z = Math.sin(t * 0.7) * 0.02;
      for (const f of flames) {
        const k = 0.75 + 0.5 * Math.sin(t * f.speed + f.phase);
        f.sp.scale.set(0.18 + 0.06 * k, 0.22 + 0.16 * k, 1);
        f.sp.material.opacity = 0.45 + 0.3 * k;
      }
      for (const s of smokes) {
        s.life += dt;
        if (s.life > 6.5) { s.life -= 6.5; s.phase = Math.random(); }
        const k = s.life / 6.5;
        s.sp.position.set(3.1 + k * 2.4, 6.35 + s.life * s.speed, -2.3 + Math.sin(s.life * 0.6 + s.phase) * 0.9);
        const sc = 0.5 + k * 2.6;
        s.sp.scale.set(sc, sc, 1);
        s.sp.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.14;
      }
    }
  };
  AH.cabin = cabin;
  cabin.setPaperText = (text) => { drawPaper(text); paperTex.needsUpdate = true; };
  cabin.paperText = '';
})();
