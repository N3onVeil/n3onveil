/* 程序化 PBR 材质库：albedo / roughness / normal，全部离屏生成 */
(function () {
  const AH = window.AH, T = AH.T;
  const { tileFbm, hash2, clamp, lerp, smoothstep } = AH;

  function canvasFrom(data, size, srgb) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    img.data.set(data);
    ctx.putImageData(img, 0, 0);
    const tex = new T.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = T.LinearMipmapLinearFilter;
    tex.magFilter = T.LinearFilter;
    return tex;
  }

  // gen(u,v) -> {r,g,b,rough,h}
  function buildMaps(size, gen) {
    const alb = new Uint8ClampedArray(size * size * 4);
    const rgh = new Uint8ClampedArray(size * size * 4);
    const hgt = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const o = gen(x / size, y / size);
        const i = (y * size + x) * 4;
        alb[i] = o.r; alb[i + 1] = o.g; alb[i + 2] = o.b; alb[i + 3] = 255;
        const rv = clamp(o.rough, 0, 1) * 255;
        rgh[i] = rgh[i + 1] = rgh[i + 2] = rv; rgh[i + 3] = 255;
        hgt[y * size + x] = o.h;
      }
    }
    const nrm = new Uint8ClampedArray(size * size * 4);
    const s = 2.2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const xl = (x - 1 + size) % size, xr = (x + 1) % size;
        const yu = (y - 1 + size) % size, yd = (y + 1) % size;
        const dx = (hgt[y * size + xr] - hgt[y * size + xl]) * s;
        const dy = (hgt[yd * size + x] - hgt[yu * size + x]) * s;
        let nx = -dx, ny = -dy, nz = 1;
        const inv = 1 / Math.hypot(nx, ny, nz);
        nx *= inv; ny *= inv; nz *= inv;
        const i = (y * size + x) * 4;
        nrm[i] = (nx * 0.5 + 0.5) * 255;
        nrm[i + 1] = (ny * 0.5 + 0.5) * 255;
        nrm[i + 2] = (nz * 0.5 + 0.5) * 255;
        nrm[i + 3] = 255;
      }
    }
    return {
      map: canvasFrom(alb, size, true),
      roughnessMap: canvasFrom(rgh, size, false),
      normalMap: canvasFrom(nrm, size, false)
    };
  }

  // ---------- 木料 ----------
  function woodGen(opt) {
    const seed = opt.seed || 0;
    const planks = opt.planks || 0;
    const base = opt.base;            // [r,g,b] 0-255
    const grainAmt = opt.grain === undefined ? 1 : opt.grain;
    const dark = opt.dark || 0.55;
    return (u, v) => {
      const p = planks ? Math.floor(v * planks) : 0;
      const vv = planks ? v * planks - p : v;
      const board = planks ? (hash2(p + seed, 3.1) - 0.5) * 0.22 : 0;
      const warp = tileFbm(u * 2 + seed, v * 2 + seed * 3, 6, 3);
      const grain = 0.5 + 0.5 * Math.sin((v * (planks ? planks * 13 : 11) + warp * 7 + seed));
      const ring = 0.5 + 0.5 * Math.sin((v * (planks ? planks * 26 : 23) + warp * 11));
      // 节疤
      const kx = hash2(seed + 1.3, 2.7), ky = hash2(seed + 4.1, 8.3);
      let knot = 0;
      const dxk = Math.min(Math.abs(u - kx), 1 - Math.abs(u - kx));
      const dyk = Math.min(Math.abs(v - ky), 1 - Math.abs(v - ky));
      const kd = Math.hypot(dxk * 2.2, dyk * 1.0);
      if (kd < 0.10) knot = (0.5 + 0.5 * Math.sin(kd * 160 + warp * 5)) * (1 - kd / 0.10);
      // 裂纹/划痕
      const sc = hash2(Math.floor(u * 140) + seed, Math.floor(v * 240));
      const scratch = sc > 0.997 ? 0.82 : 1.0;
      const gap = planks ? smoothstep(0, 0.018, Math.min(vv, 1 - vv)) : 1;
      const tone = 0.84 + 0.11 * grain * grainAmt + 0.04 * ring + board - knot * 0.22
        + 0.05 * (tileFbm(u * 9 + 3, v * 9 - 2, 10, 2) - 0.5);
      const shade = tone * gap * scratch;
      const r = clamp(base[0] * shade, 0, 255);
      const g = clamp(base[1] * shade, 0, 255);
      const b = clamp(base[2] * shade, 0, 255);
      const rough = clamp(0.80 + 0.09 * (1 - grain) + knot * 0.08 + (1 - gap) * 0.12, 0.6, 0.98);
      const h = 0.10 * grain + 0.05 * ring - knot * 0.25 - (1 - gap) * 0.6
        + 0.03 * (tileFbm(u * 9 + 3, v * 9 - 2, 10, 2) - 0.5) + (sc > 0.997 ? -0.04 : 0);
      return { r, g, b, rough, h };
    };
  }

  // ---------- 金属 ----------
  function metalGen(opt) {
    const base = opt.base || [58, 62, 68];
    const rust = opt.rust === undefined ? 0.35 : opt.rust;
    return (u, v) => {
      const n = tileFbm(u * 4, v * 4, 8, 3);
      const n2 = tileFbm(u * 12 + 3, v * 3, 16, 2);
      const patch = smoothstep(0.55, 0.78, tileFbm(u * 2 + 9, v * 2 + 4, 5, 3));
      const rustA = patch * rust;
      const scratch = hash2(Math.floor(u * 220), Math.floor(v * 40)) > 0.994 ? 0.5 : 1;
      const r = clamp((base[0] * (0.7 + 0.5 * n) + rustA * 85) * scratch, 0, 255);
      const g = clamp((base[1] * (0.7 + 0.5 * n) + rustA * 42) * scratch, 0, 255);
      const b = clamp((base[2] * (0.7 + 0.5 * n) + rustA * 18) * scratch, 0, 255);
      const rough = clamp(0.28 + 0.35 * n2 + rustA * 0.45, 0.15, 0.95);
      const h = n2 * 0.25 + (scratch < 1 ? -0.3 : 0) + rustA * 0.2;
      return { r, g, b, rough, h };
    };
  }

  // ---------- 石 ----------
  function stoneGen() {
    return (u, v) => {
      const n = tileFbm(u * 3, v * 3, 8, 3);
      const crack = Math.abs(tileFbm(u * 5 + 11, v * 5 + 7, 6, 3) - 0.5);
      const crackLine = smoothstep(0.03, 0.0, crack);
      const grain = tileFbm(u * 24, v * 24, 40, 2);
      const shade = 0.55 + 0.35 * n + 0.12 * grain - crackLine * 0.35;
      const r = clamp(92 * shade, 0, 255), g = clamp(96 * shade, 0, 255), b = clamp(100 * shade, 0, 255);
      return { r, g, b, rough: clamp(0.75 + 0.2 * grain, 0.5, 1), h: n * 0.6 - crackLine * 0.8 + grain * 0.15 };
    };
  }

  // ---------- 织物 ----------
  function woolGen(opt) {
    const base = opt.base || [96, 92, 84];
    const weave = opt.weave === undefined ? 34 : opt.weave;
    return (u, v) => {
      const w = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * weave) * Math.sin(v * Math.PI * 2 * weave);
      const n = tileFbm(u * 6, v * 6, 8, 3);
      const fuzz = tileFbm(u * 40, v * 40, 48, 2);
      const shade = 0.72 + 0.2 * w + 0.14 * n + 0.06 * fuzz;
      const r = clamp(base[0] * shade, 0, 255), g = clamp(base[1] * shade, 0, 255), b = clamp(base[2] * shade, 0, 255);
      return { r, g, b, rough: clamp(0.9 + 0.08 * fuzz, 0.8, 1), h: w * 0.5 + n * 0.2 + fuzz * 0.1 };
    };
  }

  function furGen(opt) {
    const base = opt.base || [120, 104, 88];
    return (u, v) => {
      const strand = tileFbm(u * 28, v * 3, 32, 3);
      const n = tileFbm(u * 5, v * 5, 6, 3);
      const shade = 0.6 + 0.5 * strand + 0.15 * n;
      const r = clamp(base[0] * shade, 0, 255), g = clamp(base[1] * shade, 0, 255), b = clamp(base[2] * shade, 0, 255);
      return { r, g, b, rough: 0.95, h: strand * 0.8 + n * 0.2 };
    };
  }

  function leatherGen() {
    return (u, v) => {
      const cells = tileFbm(u * 10, v * 10, 12, 3);
      const grain = tileFbm(u * 30, v * 30, 32, 2);
      const scuff = smoothstep(0.6, 0.85, tileFbm(u * 3 + 5, v * 3, 5, 3));
      const shade = 0.62 + 0.3 * cells + 0.1 * grain + scuff * 0.18;
      const r = clamp(88 * shade, 0, 255), g = clamp(62 * shade, 0, 255), b = clamp(44 * shade, 0, 255);
      return { r, g, b, rough: clamp(0.62 + 0.25 * grain - scuff * 0.1, 0.45, 0.95), h: cells * 0.3 + grain * 0.4 };
    };
  }

  function paperGen() {
    return (u, v) => {
      const fiber = tileFbm(u * 30, v * 30, 40, 2);
      const stain = smoothstep(0.55, 0.8, tileFbm(u * 2 + 3, v * 2 + 9, 5, 3));
      const shade = 0.86 + 0.08 * fiber - stain * 0.22;
      const r = clamp(214 * shade, 0, 255), g = clamp(204 * shade, 0, 255), b = clamp(178 * shade, 0, 255);
      return { r, g, b, rough: 0.92, h: fiber * 0.2 };
    };
  }

  function ceramicGen() {
    return (u, v) => {
      const n = tileFbm(u * 6, v * 6, 8, 3);
      const speck = hash2(Math.floor(u * 200), Math.floor(v * 200)) > 0.985 ? 0.7 : 1;
      const shade = (0.88 + 0.1 * n) * speck;
      const r = clamp(206 * shade, 0, 255), g = clamp(198 * shade, 0, 255), b = clamp(184 * shade, 0, 255);
      return { r, g, b, rough: clamp(0.18 + 0.12 * n, 0.1, 0.45), h: n * 0.05 };
    };
  }

  // ---------- 树皮 ----------
  function spruceBarkGen() {
    return (u, v) => {
      const n = tileFbm(u * 7, v * 2, 8, 3);
      const plate = 0.5 + 0.5 * Math.sin(u * 58 + n * 9);
      const crack = smoothstep(0.9, 1.0, plate);
      const moss = smoothstep(0.62, 0.8, tileFbm(u * 3 + 4, v * 3, 5, 2));
      const shade = 0.42 + 0.38 * plate + 0.16 * n - crack * 0.2;
      return {
        r: clamp(74 * shade + moss * 16, 0, 255),
        g: clamp(64 * shade + moss * 22, 0, 255),
        b: clamp(55 * shade + moss * 8, 0, 255),
        rough: clamp(0.88 + 0.08 * n, 0.7, 1),
        h: plate * 0.55 + n * 0.25 - crack * 0.4
      };
    };
  }
  function birchBarkGen() {
    return (u, v) => {
      const n = tileFbm(u * 4, v * 8, 8, 3);
      const band = 0.5 + 0.5 * Math.sin(v * 90 + n * 7);
      const mark = smoothstep(0.78, 0.92, band) * smoothstep(0.35, 0.55, n);
      const peel = smoothstep(0.6, 0.85, tileFbm(u * 3 + 7, v * 3, 5, 3));
      const shade = 0.82 + 0.12 * n - mark * 0.55 - peel * 0.08;
      const g = 214 * shade;
      return {
        r: clamp(g + 6, 0, 255), g: clamp(g, 0, 255), b: clamp(g - 10, 0, 255),
        rough: clamp(0.75 + 0.15 * n, 0.6, 0.98),
        h: n * 0.25 - mark * 0.3
      };
    };
  }

  // ---------- 构建 ----------
  const K = {};
  K.floor = woodGen({ seed: 1, planks: 5, base: [146, 106, 74], grain: 1, dark: 0.5 });
  K.beam = woodGen({ seed: 2, planks: 0, base: [132, 96, 66], grain: 1.1 });
  K.log = woodGen({ seed: 3, planks: 0, base: [142, 102, 70], grain: 1.3 });
  K.iron = metalGen({ base: [54, 56, 60], rust: 0.4 });
  K.brass = metalGen({ base: [150, 110, 58], rust: 0.18 });
  K.stone = stoneGen();
  K.wool = woolGen({ base: [96, 90, 80], weave: 30 });
  K.woolRed = woolGen({ base: [96, 52, 42], weave: 26 });
  K.fur = furGen({ base: [126, 110, 92] });
  K.leather = leatherGen();
  K.paper = paperGen();
  K.ceramic = ceramicGen();
  K.barkSpruce = spruceBarkGen();
  K.barkBirch = birchBarkGen();

  const CACHE = {};
  const ALL = [];
  const DEF = {
    floor: { size: 512, metalness: 0.0, normalScale: 0.35 },
    beam: { size: 256, metalness: 0.0, normalScale: 0.4 },
    log: { size: 512, metalness: 0.0, normalScale: 0.5 },
    iron: { size: 256, metalness: 0.85, normalScale: 0.7 },
    brass: { size: 256, metalness: 0.9, normalScale: 0.5 },
    stone: { size: 256, metalness: 0.0, normalScale: 1.0 },
    wool: { size: 256, metalness: 0.0, normalScale: 0.35 },
    woolRed: { size: 256, metalness: 0.0, normalScale: 0.35 },
    fur: { size: 256, metalness: 0.0, normalScale: 0.9 },
    leather: { size: 256, metalness: 0.0, normalScale: 0.6 },
    paper: { size: 256, metalness: 0.0, normalScale: 0.25 },
    ceramic: { size: 256, metalness: 0.0, normalScale: 0.3 },
    barkSpruce: { size: 512, metalness: 0.0, normalScale: 0.9 },
    barkBirch: { size: 512, metalness: 0.0, normalScale: 0.5 }
  };

  function getMaps(kind) {
    if (!K[kind].maps) K[kind].maps = buildMaps(DEF[kind].size, K[kind]);
    return K[kind].maps;
  }

  AH.pbr = function (kind, repeat, extra) {
    const key = kind + '|' + (repeat ? repeat.join(',') : '1') + '|' + (extra ? JSON.stringify(extra) : '');
    if (CACHE[key]) return CACHE[key];
    const d = DEF[kind];
    const m = getMaps(kind);
    const clone = (t) => {
      const c = t.clone();
      c.needsUpdate = true;
      if (repeat) c.repeat.set(repeat[0], repeat[1]);
      return c;
    };
    const mat = new T.MeshStandardMaterial(Object.assign({
      map: clone(m.map),
      roughnessMap: clone(m.roughnessMap),
      normalMap: clone(m.normalMap),
      normalScale: new T.Vector2(d.normalScale, d.normalScale),
      metalness: d.metalness,
      roughness: 1.0,
      envMapIntensity: 0.45
    }, extra || {}));
    CACHE[key] = mat;
    mat.userData.kind = kind;
    ALL.push(mat);
    return mat;
  };

  AH.simple = function (color, roughness, metalness, extra) {
    return new T.MeshStandardMaterial(Object.assign({
      color, roughness: roughness === undefined ? 0.8 : roughness,
      metalness: metalness || 0, envMapIntensity: 0.7
    }, extra || {}));
  };

  AH.emit = function (color, intensity) {
    return new T.MeshStandardMaterial({
      color: 0x000000, emissive: color, emissiveIntensity: intensity === undefined ? 1 : intensity,
      roughness: 0.6, metalness: 0
    });
  };

  /* ---------- 在线拉取 Poly Haven CC0 木纹（离线自动回退） ---------- */
  const REMOTE_WOOD = {
    diff: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_diff_1k.jpg',
    nor: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_nor_dx_1k.jpg',
    rough: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_rough_1k.jpg'
  };
  AH.remote = { wood: false, error: null };
  const WOOD_SRC = (window.AH_ASSETS && AH_ASSETS.wood)
    ? AH_ASSETS.wood
    : (AH.params.has('cdn') ? REMOTE_WOOD : null);
  if (WOOD_SRC) (function loadWood() {
    const loader = new T.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const res = {};
    let n = 0, failed = false;
    function apply() {
      for (const mat of ALL) {
        const k = mat.userData.kind;
        if (k !== 'floor' && k !== 'beam' && k !== 'log') continue;
        const rep = mat.map ? mat.map.repeat.clone() : new T.Vector2(1, 1);
        const mk = (src, srgb) => {
          const c = src.clone();
          c.needsUpdate = true;
          c.wrapS = c.wrapT = T.RepeatWrapping;
          c.repeat.copy(rep);
          if (srgb) c.colorSpace = T.SRGBColorSpace;
          return c;
        };
        mat.map = mk(res.diff, true);
        mat.normalMap = mk(res.nor, false);
        mat.roughnessMap = mk(res.rough, false);
        mat.color.setHex(0xffffff);
        mat.normalScale.set(0.55, 0.55);
        mat.needsUpdate = true;
      }
      AH.remote.wood = true;
    }
    for (const key of Object.keys(WOOD_SRC)) {
      loader.load(WOOD_SRC[key], (t) => {
        res[key] = t;
        if (++n === 3 && !failed) apply();
      }, undefined, () => { failed = true; AH.remote.error = key; });
    }
  })();
})();
