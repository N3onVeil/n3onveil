/* 公共工具：数学、噪声、程序化贴图、色板 */
(function () {
  const AH = (window.AH = window.AH || {});
  const T = (AH.T = window.THREE);

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * Math.max(0, dt)));
  const mod = (n, m) => ((n % m) + m) % m;

  function hash2(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7 + 74.7) * 43758.5453123;
    return n - Math.floor(n);
  }
  function vnoise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  function fbm2(x, y, oct = 4) {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += a * vnoise2(x * f, y * f); f *= 2.03; a *= 0.5; }
    return s;
  }
  // 周期噪声：u,v ∈ [0,1)，period = 频率，保证贴图无缝
  function pnoise2(x, y, per) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = mod(xi, per), y0 = mod(yi, per);
    const x1 = mod(x0 + 1, per), y1 = mod(y0 + 1, per);
    const a = hash2(x0, y0), b = hash2(x1, y0), c = hash2(x0, y1), d = hash2(x1, y1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  function tileFbm(u, v, freq, oct = 3) {
    let s = 0, a = 0.5, f = freq;
    for (let i = 0; i < oct; i++) { s += a * pnoise2(u * f, v * f, f); f *= 2; a *= 0.5; }
    return s;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PAL = {
    skyZenith: 0x030a15,
    skyMid: 0x0a1e3a,
    skyHorizon: 0x18374f,
    auroraA: 0x14f0a2,
    auroraB: 0x6bffd8,
    auroraC: 0x2f74ff,
    auroraD: 0x7a3cff,
    snow: 0xdceaf7,
    snowDeep: 0x8ba8c6,
    wood: 0x2b1d16,
    woodDark: 0x19110c,
    snowLit: 0xe8f3fd,
    window: 0xffb469,
    tree: 0x0a1512,
    fog: 0x081826
  };

  /* ---------- 程序化贴图 ---------- */

  function makeSnowNormalMap(size = 256) {
    const N = size;
    const h = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const u = x / N, v = y / N;
        let n = 0.62 * tileFbm(u, v, 5, 3) + 0.30 * tileFbm(u, v, 13, 3) + 0.18 * tileFbm(u, v, 34, 2);
        n += 0.06 * tileFbm(u, v, 61, 2);
        h[y * N + x] = n;
      }
    }
    const cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(N, N);
    const d = img.data;
    const s = 4.2;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const xl = (x - 1 + N) % N, xr = (x + 1) % N;
        const yu = (y - 1 + N) % N, yd = (y + 1) % N;
        const dx = (h[y * N + xr] - h[y * N + xl]) * s;
        const dy = (h[yd * N + x] - h[yu * N + x]) * s;
        let nx = -dx, ny = -dy, nz = 1.0;
        const inv = 1 / Math.hypot(nx, ny, nz);
        nx *= inv; ny *= inv; nz *= inv;
        const i = (y * N + x) * 4;
        d[i] = (nx * 0.5 + 0.5) * 255;
        d[i + 1] = (ny * 0.5 + 0.5) * 255;
        d[i + 2] = (nz * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new T.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.colorSpace = T.NoColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  function makeRoughnessMap(size = 128) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        let r = 0.70 + 0.14 * (tileFbm(u, v, 6, 3) - 0.5);
        r = clamp(r, 0.34, 0.94);
        const i = (y * size + x) * 4;
        const c = r * 255;
        d[i] = d[i + 1] = d[i + 2] = c;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new T.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.colorSpace = T.NoColorSpace;
    return tex;
  }

  function makeRadialTexture(size = 128) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.62)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.16)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  function makeSmokeTexture(size = 128) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const dx = u - 0.5, dy = v - 0.5;
        const r = Math.hypot(dx, dy) * 2;
        let a = clamp(1 - r, 0, 1);
        a = Math.pow(a, 1.8) * (0.45 + 1.0 * tileFbm(u, v, 5, 3));
        const i = (y * size + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = clamp(a, 0, 1) * 210;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  function makeWoodTexture(size = 256) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const n = 0.55 * tileFbm(u, v, 6, 3) + 0.30 * tileFbm(u, v, 13, 2) + 0.15 * tileFbm(u, v, 29, 2);
        const grain = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 23 + n * 9.0);
        const streak = Math.pow(0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 3 + n * 4.0), 3.0);
        const shade = 0.58 + 0.32 * grain + 0.14 * streak;
        const i = (y * size + x) * 4;
        d[i] = Math.round(shade * 132 + 16);
        d[i + 1] = Math.round(shade * 96 + 11);
        d[i + 2] = Math.round(shade * 68 + 7);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // 几道节疤 / 裂纹
    for (let k = 0; k < 5; k++) {
      const cx = (k * 0.19 + 0.07) * size;
      const cy = (k * 0.31 + 0.13) * size;
      const rr = 3 + k * 1.6;
      ctx.strokeStyle = 'rgba(30,18,11,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rr, rr * 1.8, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    const tex = new T.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.repeat.set(1, 2);
    return tex;
  }

  function makeWindowTexture(w = 160, h = 120) {    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0c0805';
    ctx.fillRect(0, 0, w, h);
    const cols = 2, rows = 2;
    const pad = 9, gap = 7;
    const pw = (w - pad * 2 - gap) / cols, ph = (h - pad * 2 - gap) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * (pw + gap), y = pad + r * (ph + gap);
        const g = ctx.createRadialGradient(x + pw * 0.45, y + ph * 0.55, 2, x + pw * 0.45, y + ph * 0.55, pw * 0.85);
        g.addColorStop(0, '#ffe3b0');
        g.addColorStop(0.45, '#ffb268');
        g.addColorStop(0.85, '#e0742c');
        g.addColorStop(1, '#b34f18');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, pw, ph);
      }
    }
    // 窗棂
    ctx.fillStyle = '#160f0a';
    ctx.fillRect(w / 2 - 3, 0, 6, h);
    ctx.fillRect(0, h / 2 - 3, w, 6);
    ctx.strokeStyle = '#1a120c';
    ctx.lineWidth = 10;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  AH.clamp = clamp; AH.lerp = lerp; AH.smoothstep = smoothstep; AH.damp = damp;
  AH.hash2 = hash2; AH.vnoise2 = vnoise2; AH.fbm2 = fbm2; AH.tileFbm = tileFbm;
  AH.mulberry32 = mulberry32; AH.PAL = PAL;
  AH.makeSnowNormalMap = makeSnowNormalMap;
  AH.makeRoughnessMap = makeRoughnessMap;
  AH.makeRadialTexture = makeRadialTexture;
  AH.makeSmokeTexture = makeSmokeTexture;
  AH.makeWindowTexture = makeWindowTexture;
  AH.makeWoodTexture = makeWoodTexture;
  AH.$ = (id) => document.getElementById(id);
  AH.params = new URLSearchParams(location.search);
  AH.mobile = AH.params.has('mobile')
    || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  AH.touch = { x: 0, y: 0, run: false, jump: false, active: false };
})();
