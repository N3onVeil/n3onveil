/* 树木资产：云杉 / 松 / 白桦 / 枯木，树皮 + 针叶 alpha 贴图 + 远景剪影 */
(function () {
  const AH = window.AH, T = AH.T, R = AH.R;
  const scene = R.scene;
  const MOBILE = !!AH.mobile;
  const rng = AH.mulberry32(198211);

  function foliageTexture(size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const n = AH.tileFbm(u * 8, v * 8, 8, 3);
        const hole = n > 0.70;
        const i = (y * size + x) * 4;
        img.data[i] = 16 + n * 10;
        img.data[i + 1] = 34 + n * 26;
        img.data[i + 2] = 22 + n * 12;
        img.data[i + 3] = hole ? 0 : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    for (let i = 0; i < 1800; i++) {
      const x = rng() * size, y = rng() * size;
      const len = 4 + rng() * 12, ang = -Math.PI / 2 + (rng() - 0.5) * 1.6;
      ctx.strokeStyle = `rgba(${30 + rng() * 26}, ${70 + rng() * 42}, ${34 + rng() * 22}, ${0.5 + rng() * 0.5})`;
      ctx.lineWidth = 0.6 + rng() * 0.9;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
    }
    const tex = new T.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function twigTexture(size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    function branch(x, y, ang, len, w, depth) {
      const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
      ctx.strokeStyle = depth < 2 ? 'rgba(52,45,38,1)' : 'rgba(92,80,66,0.95)';
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
      if (depth <= 0 || len < 7) return;
      const k = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < k; i++) branch(nx, ny, ang + (rng() - 0.5) * 1.2, len * (0.55 + rng() * 0.2), w * 0.62, depth - 1);
    }
    for (let i = 0; i < 6; i++) branch(size * (0.3 + rng() * 0.4), size * 0.99, -Math.PI / 2 + (rng() - 0.5) * 0.6, size * (0.14 + rng() * 0.1), 2.2, 4);
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  const foliageTex = foliageTexture(256);
  const twigTex = twigTexture(256);
  const foliageMat = new T.MeshStandardMaterial({
    map: foliageTex, alphaTest: 0.42, side: T.DoubleSide,
    roughness: 1, metalness: 0, color: 0x9fae9c, envMapIntensity: 0.12
  });
  const twigMat = new T.MeshStandardMaterial({
    map: twigTex, alphaTest: 0.3, side: T.DoubleSide,
    roughness: 0.95, metalness: 0, color: 0x8a7a68, envMapIntensity: 0.12
  });
  const spruceBark = AH.pbr('barkSpruce', [1, 2]);
  const birchBark = AH.pbr('barkBirch', [1, 2]);

  function merge(list) {
    let n = 0;
    const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
    for (const g of parts) n += g.attributes.position.count;
    const p = new Float32Array(n * 3), no = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of parts) {
      p.set(g.attributes.position.array, o * 3);
      no.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(p, 3));
    geo.setAttribute('normal', new T.BufferAttribute(no, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    return geo;
  }
  function cylinderBetween(a, b, r0, r1, seg) {
    const dir = new T.Vector3().subVectors(b, a);
    const len = dir.length();
    const geo = new T.CylinderGeometry(r1, r0, len, seg, 1, true);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
    geo.applyMatrix4(new T.Matrix4().compose(
      new T.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new T.Vector3(1, 1, 1)));
    return geo;
  }
  function cardAt(pos, dir, w, h, roll) {
    const geo = new T.PlaneGeometry(w, h);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
    q.premultiply(new T.Quaternion().setFromAxisAngle(dir.clone().normalize(), roll));
    geo.applyMatrix4(new T.Matrix4().compose(pos, q, new T.Vector3(1, 1, 1)));
    return geo;
  }

  function conifer(opt) {
    const { H, R0, tiers, spread, seed, pine } = opt;
    const rand = AH.mulberry32(seed);
    const trunk = [], foliage = [];
    let prev = new T.Vector3(0, 0, 0);
    const segs = 4;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const p = new T.Vector3(Math.sin(t * 2.1 + seed) * H * 0.012, H * t, Math.cos(t * 1.7 + seed) * H * 0.010);
      trunk.push(cylinderBetween(prev, p, R0 * (1 - (i - 1) / segs * 0.8), R0 * (1 - t * 0.8), 8));
      prev = p;
    }
    const startY = pine ? 0.5 : 0.28;
    for (let ti = 0; ti < tiers; ti++) {
      const t = ti / (tiers - 1);
      const y = H * (startY + (0.86 - startY) * t);
      const r = (pine ? 2.1 : 1.55) * (1 - t * 0.78) * (0.9 + rand() * 0.25);
      const h = H * (pine ? 0.30 : 0.26) * (1 - t * 0.3);
      const cone = new T.ConeGeometry(r * spread, h, 9, 1, true);
      cone.translate((rand() - 0.5) * 0.15, y + h * 0.4, (rand() - 0.5) * 0.15);
      foliage.push(cone);
    }
    const tip = new T.ConeGeometry(0.35 * spread, H * 0.14, 7, 1, true);
    tip.translate(0, H * 0.95, 0);
    foliage.push(tip);
    return { trunk: merge(trunk), foliage: merge(foliage), card: null };
  }

  function birchTemplate(seed) {
    const rand = AH.mulberry32(seed);
    const H = 8.5, trunk = [], twigs = [], cards = [];
    let prev = new T.Vector3(0, 0, 0);
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      const p = new T.Vector3(Math.sin(t * 2.2 + 1) * 0.22, H * t, Math.cos(t * 1.8) * 0.18);
      trunk.push(cylinderBetween(prev, p, 0.13 * (1 - (i - 1) * 0.16), 0.13 * (1 - t * 0.7), 8));
      prev = p;
    }
    for (let wi = 0; wi < 8; wi++) {
      const t = 0.4 + wi * 0.075;
      const y = H * t;
      const count = 3;
      const start = rand() * Math.PI * 2;
      for (let bi = 0; bi < count; bi++) {
        const ang = start + (bi / count) * Math.PI * 2 + rand();
        const len = 2.0 + rand() * 1.6;
        const tip = new T.Vector3(Math.cos(ang) * len, y + 0.8 + rand() * 1.2, Math.sin(ang) * len);
        const base = new T.Vector3(Math.cos(ang) * 0.1, y, Math.sin(ang) * 0.1);
        twigs.push(cylinderBetween(base, tip, 0.024, 0.008, 4));
        const dir = new T.Vector3().subVectors(tip, base).normalize();
        for (let ci = 0; ci < 2; ci++) {
          const pos = new T.Vector3().lerpVectors(base, tip, 0.6 + ci * 0.3);
          cards.push(cardAt(pos, dir, 2.6, 2.4, rand() * Math.PI));
        }
      }
    }
    return { trunk: merge(trunk), foliage: null, twig: merge(twigs), card: merge(cards) };
  }

  function deadTemplate(seed) {
    const rand = AH.mulberry32(seed);
    const H = 6.5, trunk = [], twigs = [];
    let prev = new T.Vector3(0, 0, 0);
    for (let i = 1; i <= 3; i++) {
      const t = i / 3;
      const p = new T.Vector3(Math.sin(t * 3 + seed) * 0.2, H * t, Math.cos(t * 2.2) * 0.15);
      trunk.push(cylinderBetween(prev, p, 0.18 * (1 - (i - 1) * 0.3), 0.18 * (1 - t * 0.85), 7));
      prev = p;
    }
    for (let i = 0; i < 8; i++) {
      const y = H * (0.45 + rand() * 0.5);
      const ang = rand() * Math.PI * 2;
      const len = 0.9 + rand() * 1.6;
      const tip = new T.Vector3(Math.cos(ang) * len, y + (rand() - 0.6) * 0.8, Math.sin(ang) * len);
      const base = new T.Vector3(Math.cos(ang) * 0.14, y, Math.sin(ang) * 0.14);
      twigs.push(cylinderBetween(base, tip, 0.04, 0.01, 4));
    }
    return { trunk: merge(trunk), foliage: null, twig: merge(twigs), card: null };
  }

  const S = {
    spruce: conifer({ H: 11, R0: 0.30, tiers: 7, spread: 1.0, seed: 11 }),
    spruce2: conifer({ H: 8.5, R0: 0.26, tiers: 6, spread: 0.95, seed: 22 }),
    pine: conifer({ H: 12, R0: 0.34, tiers: 4, spread: 1.25, seed: 33, pine: true }),
    birch: birchTemplate(44),
    dead: deadTemplate(55)
  };

  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v3 = new T.Vector3(), s3 = new T.Vector3();

  function place(species, count, rMin, rMax, scaleMin, scaleMax, shadow, cardMat) {
    const trunkMesh = new T.InstancedMesh(species.trunk, spruceBark, count);
    const foliageMesh = species.foliage ? new T.InstancedMesh(species.foliage, foliageMat, count) : null;
    const twigMesh = species.twig ? new T.InstancedMesh(species.twig, species === S.birch ? twigMat : spruceBark, count) : null;
    const cardMesh = species.card ? new T.InstancedMesh(species.card, cardMat || twigMat, count) : null;
    let i = 0, guard = 0;
    while (i < count && guard++ < count * 40) {
      const ang = rng() * Math.PI * 2;
      const rad = rMin + Math.pow(rng(), 0.6) * (rMax - rMin);
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      if (Math.hypot(x + 9, z + 5) < 15) continue;
      if (Math.hypot(x - 2, z - 11.5) < 9) continue;
      if (Math.hypot(x + 78, z - 26) < 26) continue;
      const y = AH.terrainH(x, z) - 0.1;
      const sc = scaleMin + Math.pow(rng(), 1.5) * (scaleMax - scaleMin);
      e.set((rng() - 0.5) * 0.04, rng() * Math.PI * 2, (rng() - 0.5) * 0.04);
      q.setFromEuler(e);
      v3.set(x, y, z);
      s3.set(sc, sc * (0.9 + rng() * 0.3), sc);
      m4.compose(v3, q, s3);
      trunkMesh.setMatrixAt(i, m4);
      if (foliageMesh) foliageMesh.setMatrixAt(i, m4);
      if (twigMesh) twigMesh.setMatrixAt(i, m4);
      if (cardMesh) cardMesh.setMatrixAt(i, m4);
      i++;
    }
    for (const m of [trunkMesh, foliageMesh, twigMesh, cardMesh]) {
      if (!m) continue;
      m.count = i;
      m.instanceMatrix.needsUpdate = true;
      m.frustumCulled = false;
      m.castShadow = shadow;
      m.receiveShadow = true;
      scene.add(m);
    }
  }

  place(S.spruce, MOBILE ? 70 : 150, 26, 240, 0.8, 1.4, true);
  place(S.spruce2, MOBILE ? 30 : 70, 30, 260, 0.75, 1.25, true);
  place(S.pine, MOBILE ? 18 : 40, 40, 230, 0.8, 1.25, true);
  place(S.birch, MOBILE ? 18 : 45, 20, 150, 0.8, 1.2, true, null);
  place(S.dead, MOBILE ? 8 : 16, 18, 130, 0.7, 1.1, true);

  (function far() {
    const parts = [];
    const tr = new T.CylinderGeometry(0.10, 0.22, 4.2, 5);
    tr.translate(0, 2.1, 0); parts.push(tr);
    for (const [r, h, y] of [[1.7, 4.2, 5.4], [1.2, 3.4, 7.0], [0.7, 2.6, 8.4]]) {
      const c = new T.ConeGeometry(r, h, 6);
      c.translate(0, y, 0); parts.push(c);
    }
    const geo = merge(parts);
    const mat = new T.MeshStandardMaterial({ color: 0x0a1512, roughness: 1, metalness: 0, envMapIntensity: 0.1 });
    const N = MOBILE ? 300 : 560;
    const mesh = new T.InstancedMesh(geo, mat, N);
    mesh.frustumCulled = false;
    let i = 0, guard = 0;
    while (i < N && guard++ < N * 30) {
      const ang = rng() * Math.PI * 2;
      const rad = 200 + Math.pow(rng(), 0.7) * 190;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      const sc = 0.8 + rng() * 1.1;
      e.set(0, rng() * Math.PI * 2, 0); q.setFromEuler(e);
      v3.set(x, AH.terrainH(x, z) - 0.3, z);
      s3.set(sc, sc * (0.9 + rng() * 0.4), sc);
      m4.compose(v3, q, s3);
      mesh.setMatrixAt(i++, m4);
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  })();
})();
