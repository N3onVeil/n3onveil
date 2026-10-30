/* 极夜环境：地形 / 天空 / 星空 / 极光 / 针叶林 / 雪与雾 */
(function () {
  const AH = window.AH, T = AH.T, R = AH.R;
  const scene = R.scene;
  const rng = AH.mulberry32(20261030);
  const lerp = AH.lerp, smoothstep = AH.smoothstep;
  const MOBILE = !!AH.mobile;

  /* ---------------- 地形 ---------------- */
  const SIZE = 780;
  const SEG = MOBILE ? 200 : 300;

  function baseH(x, z) {
    let h = (AH.fbm2(x * 0.0052 + 11.3, z * 0.0052 - 7.1, 4) - 0.5) * 17.0;
    h += (AH.fbm2(x * 0.017 - 3.7, z * 0.017 + 9.2, 4) - 0.5) * 2.6;
    h += (AH.fbm2(x * 0.075 + 1.1, z * 0.075 - 2.2, 3) - 0.5) * 0.55;
    const r = Math.hypot(x, z);
    h += smoothstep(300, 640, r) * 26.0;
    return h;
  }
  function terrainH(x, z) {
    let h = baseH(x, z);
    const w = AH.fbm2(x * 0.02 + 5.0, z * 0.02 - 2.0, 2);
    const d = Math.hypot(x + 2.0, z - 2.0);
    h += 0.16 * Math.sin(x * 0.11 + z * 0.05 + w * 2.0) * smoothstep(18, 42, d);
    h += 0.32 * (AH.fbm2(x * 0.04 + 7.0, z * 0.04 - 3.0, 3) - 0.5) * smoothstep(8, 24, d);
    h = lerp(h, 0.42, (1 - smoothstep(5, 16, d)) * 0.72);
    const d2 = Math.hypot(x + 9.0, z + 5.0);
    h += 1.05 * (1 - smoothstep(6, 28, d2));
    h = lerp(h, 1.62, 1 - smoothstep(4.5, 11.0, d2));
    const dl = Math.hypot(x + 78.0, z - 26.0);
    h = lerp(h, 0.52, 1 - smoothstep(15.0, 25.0, dl));
    return h;
  }
  AH.terrainH = terrainH;

  const geo = new T.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrainH(x, z));
    const n = AH.fbm2(x * 0.035 + 3.0, z * 0.035 - 1.0, 3);
    const v = 0.9 + 0.1 * n;
    colors[i * 3] = v * 0.97; colors[i * 3 + 1] = v * 0.99; colors[i * 3 + 2] = v;
  }
  geo.setAttribute('color', new T.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const snowNormal = AH.makeSnowNormalMap(256);
  const snowRough = AH.makeRoughnessMap(128);
  for (const t of [snowNormal, snowRough]) {
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(90, 90);
    t.minFilter = T.LinearMipmapLinearFilter;
  }
  snowNormal.anisotropy = 8;
  const snowMacro = snowNormal.clone();
  snowMacro.wrapS = snowMacro.wrapT = T.RepeatWrapping;
  snowMacro.repeat.set(6, 6);
  snowMacro.needsUpdate = true;

  const terrainMat = new T.MeshPhysicalMaterial({
    color: 0xcfe8ec, roughness: 0.88, metalness: 0, vertexColors: true,
    normalMap: snowNormal, normalScale: new T.Vector2(0.5, 0.5),
    roughnessMap: snowRough, envMapIntensity: 0.55, dithering: true,
    clearcoat: 0.22, clearcoatRoughness: 0.55,
    clearcoatNormalMap: snowMacro, clearcoatNormalScale: new T.Vector2(0.8, 0.8)
  });
  terrainMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 cell = floor(vWPos.xz * 30.0);
          float g = h21(cell);
          vec3 pert = vec3(g - 0.5, 0.0, h21(cell + 7.0) - 0.5) * 0.18;
          normal = normalize(normal + pert);
          vec3 macro = vec3(sin(vWPos.x * 0.045 + sin(vWPos.z * 0.031)) * 0.05, 0.0, cos(vWPos.z * 0.038 + sin(vWPos.x * 0.027)) * 0.05);
          normal = normalize(normal + macro);
        }`);
  };
  const terrain = new T.Mesh(geo, terrainMat);
  if (window.AH_ASSETS && AH_ASSETS.snow) {
    const L = new T.TextureLoader();
    const apply = (key, srgb, set) => L.load(AH_ASSETS.snow[key], (t) => {
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(30, 30);
      t.anisotropy = 8;
      if (srgb) t.colorSpace = T.SRGBColorSpace;
      set(t);
      terrainMat.needsUpdate = true;
    });
    apply('nor', false, (t) => { terrainMat.normalMap = t; terrainMat.normalScale.set(0.42, 0.42); });
    apply('rough', false, (t) => { terrainMat.roughnessMap = t; });
    terrainMat.color.setHex(0xf2fafc);
  }
  terrain.receiveShadow = true;
  terrain.frustumCulled = false;
  scene.add(terrain);

  /* ---------------- 天空 ---------------- */
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uTime: { value: 0 }, uKp: { value: 0.85 } },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uKp;
      varying vec3 vDir;
      float hash31(vec3 p){
        p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23)); p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise3(vec3 x){
        vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
              mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
              mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm3(vec3 p){
        float s = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++){ s += a * noise3(p); p *= 2.02; a *= 0.5; }
        return s;
      }
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.12, 1.0);
        vec3 zenith  = vec3(0.0012, 0.0032, 0.0090);
        vec3 middle  = vec3(0.0040, 0.0125, 0.0300);
        vec3 horizon = vec3(0.0125, 0.0360, 0.0620);
        vec3 col = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.62));
        col += middle * 0.4 * exp(-pow((h - 0.18) / 0.26, 2.0));

        vec3 gn = normalize(vec3(0.86, 0.16, -0.48));
        float band = exp(-pow(dot(d, gn) / 0.17, 2.0));
        float cloud = fbm3(d * 4.0 + 3.0);
        float dust = smoothstep(0.45, 0.72, fbm3(d * 9.0 + 17.0));
        float dust2 = smoothstep(0.5, 0.72, fbm3(d * 15.0 + 41.0));
        vec3 neb = mix(vec3(0.028, 0.042, 0.095), vec3(0.075, 0.035, 0.105), fbm3(d * 2.0 + 8.0));
        vec3 coreDir = normalize(vec3(-0.25, 0.28, 0.92));
        float gcore = exp(-pow(dot(d, coreDir) / 0.30, 2.0));
        neb += vec3(0.10, 0.075, 0.055) * gcore * 0.55;
        col += neb * band * (0.2 + 0.8 * cloud) * 1.3;
        col *= 1.0 - band * dust * 0.55;
        col *= 1.0 - band * dust2 * 0.35;

        vec2 hd = normalize(d.xz + vec2(0.0001));
        float auroraMask = smoothstep(-0.25, 0.85, dot(hd, normalize(vec2(0.85, -0.55))));
        float dirMask = auroraMask;
        col += vec3(0.004, 0.028, 0.020) * exp(-max(h, 0.0) * 8.0) * dirMask * (0.3 + 0.7 * uKp);
        float left = smoothstep(0.25, 0.95, dot(hd, normalize(vec2(-0.95, 0.18)))) * exp(-max(h, 0.0) * 12.0);
        col += vec3(0.075, 0.024, 0.040) * left * 0.5;

        // 隐约的粉紫霞光（用方向点积，避免方位角接缝）
        float pink = exp(-pow((h - 0.07) / 0.20, 2.0)) * (0.55 + 0.45 * dot(hd, normalize(vec2(0.55, -0.83))));
        col += vec3(0.085, 0.022, 0.105) * pink * 0.95;
        float violet = exp(-pow((h - 0.42) / 0.34, 2.0));
        col += vec3(0.022, 0.009, 0.050) * violet * 0.9;
        col += vec3(0.010, 0.004, 0.022) * smoothstep(0.4, 1.0, h);
        col *= smoothstep(-0.12, 0.02, h) * 0.88 + 0.12;

        float dth = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        gl_FragColor = vec4(col + (dth - 0.5) / 160.0, 1.0);
      }`
  });
  const sky = new T.Mesh(new T.SphereGeometry(5000, 48, 32), skyMat);
  sky.renderOrder = -100; sky.frustumCulled = false; scene.add(sky);

  /* ---------------- 星空 ---------------- */
  function starGeometry(count, radius, sizeMin, sizeMax, band, warmBias) {
    const p = new Float32Array(count * 3), s = new Float32Array(count);
    const ph = new Float32Array(count), a = new Float32Array(count), c = new Float32Array(count * 3);
    const gn = new T.Vector3(0.86, 0.16, -0.48).normalize();
    const u = new T.Vector3(1, 0, 0).cross(gn).normalize();
    const v = new T.Vector3().crossVectors(gn, u).normalize();
    for (let i = 0; i < count; i++) {
      let dir;
      if (band) {
        const ang = rng() * Math.PI * 2;
        const off = (rng() + rng() + rng() - 1.5) * 0.085;
        dir = new T.Vector3(
          Math.cos(ang) * u.x + Math.sin(ang) * v.x + off * gn.x,
          Math.cos(ang) * u.y + Math.sin(ang) * v.y + off * gn.y,
          Math.cos(ang) * u.z + Math.sin(ang) * v.z + off * gn.z).normalize();
      } else {
        const zz = rng() * 2 - 1, th = rng() * Math.PI * 2, rr = Math.sqrt(1 - zz * zz);
        dir = new T.Vector3(rr * Math.cos(th), zz, rr * Math.sin(th));
      }
      p[i * 3] = dir.x * radius; p[i * 3 + 1] = dir.y * radius; p[i * 3 + 2] = dir.z * radius;
      const mag = Math.pow(rng(), band ? 2.0 : 3.0);
      s[i] = lerp(sizeMin, sizeMax, mag); ph[i] = rng();
      a[i] = (band ? 0.25 : 0.4) + 0.7 * mag;
      const warm = rng() < warmBias;
      const col = new T.Color().setRGB(
        lerp(0.68, 1.0, warm ? 1 : rng() * 0.4),
        lerp(0.78, 0.95, rng()),
        lerp(1.0, 0.72, warm ? 0.15 : rng() * 0.8));
      const boost = 1.1 + 1.6 * mag;
      c[i * 3] = col.r * boost; c[i * 3 + 1] = col.g * boost; c[i * 3 + 2] = col.b * boost;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(p, 3));
    g.setAttribute('aSize', new T.BufferAttribute(s, 1));
    g.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
    g.setAttribute('aAlpha', new T.BufferAttribute(a, 1));
    g.setAttribute('aColor', new T.BufferAttribute(c, 3));
    return g;
  }
  const starMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: R.renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSize, aPhase, aAlpha;
      attribute vec3 aColor;
      uniform float uTime, uPixelRatio;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.72 + 0.28 * sin(uTime * 1.7 + aPhase * 6.2831);
        gl_PointSize = aSize * tw * uPixelRatio;
        gl_Position = projectionMatrix * mv;
        vColor = aColor;
        vAlpha = aAlpha * tw * smoothstep(-0.04, 0.14, normalize(position).y);
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p) * 2.0;
        float core = pow(smoothstep(1.0, 0.0, d), 2.2);
        float sx = max(0.0, 1.0 - abs(p.x) * 22.0) * max(0.0, 1.0 - abs(p.y) * 2.4);
        float sy = max(0.0, 1.0 - abs(p.y) * 22.0) * max(0.0, 1.0 - abs(p.x) * 2.4);
        float spike = (sx + sy) * smoothstep(0.55, 1.0, vAlpha);
        float a = clamp(core + spike * 0.30, 0.0, 1.0);
        gl_FragColor = vec4(vColor * (core + spike * 0.5) * vAlpha, a);
      }`
  });
  const stars = new T.Points(starGeometry(MOBILE ? 24000 : 52000, 4600, 1.0, 4.2, false, 0.28), starMat);
  stars.renderOrder = -95; stars.frustumCulled = false; scene.add(stars);
  const milky = new T.Points(starGeometry(MOBILE ? 42000 : 92000, 4500, 0.65, 2.0, true, 0.2), starMat);
  milky.renderOrder = -94; milky.frustumCulled = false; scene.add(milky);

  /* ---------------- 流星 ---------------- */
  const meteors = [];
  for (let i = 0; i < 4; i++) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
    const m = new T.LineBasicMaterial({
      color: 0xd8e8ff, transparent: true, opacity: 0,
      blending: T.AdditiveBlending, depthWrite: false, depthTest: false
    });
    const line = new T.Line(g, m);
    line.frustumCulled = false;
    line.renderOrder = -93;
    scene.add(line);
    meteors.push({ line, mat: m, geo: g, t: -1, dur: 1, wait: 4 + Math.random() * 18, start: new T.Vector3(), tan: new T.Vector3() });
  }
  function spawnMeteor(mt) {
    const az = Math.random() * Math.PI * 2;
    const alt = 0.25 + Math.random() * 0.95;
    mt.start.set(Math.cos(az) * Math.cos(alt), Math.sin(alt), Math.sin(az) * Math.cos(alt)).normalize();
    const up = new T.Vector3(0, 1, 0);
    const t = new T.Vector3().crossVectors(mt.start, up);
    if (t.lengthSq() < 0.01) t.set(1, 0, 0);
    t.normalize().applyAxisAngle(mt.start, (Math.random() - 0.5) * 1.8);
    t.y -= 0.6;
    mt.tan.copy(t.normalize());
    mt.t = 0;
    mt.dur = 0.65 + Math.random() * 0.6;
  }
  if (AH.params.has('meteor')) { spawnMeteor(meteors[0]); meteors[0].t = 0; }

  /* ---------------- 极光 ---------------- */
  const AURORA_FRAG = `
    uniform float uTime, uKp, uIntensity, uSpeed, uRayFreq, uBrightGrad;
    uniform vec3 uColorA, uColorB, uColorC, uColorD;
    varying vec2 vUv;
    float hash21(vec2 p){
      p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i), b = hash21(i + vec2(1,0));
      float c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
      return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
    }
    float fbm(vec2 p){
      float s = 0.0, a = 0.52;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = m * p; a *= 0.5; }
      return s;
    }
    void main(){
      vec2 uv = vUv;
      float t = uTime * 0.014 * uSpeed;
      float warp = fbm(vec2(uv.x * 1.7 + t * 0.5, uv.y * 0.55 - t * 0.22));
      float curtain = fbm(vec2(uv.x * 2.4 + warp * 1.6 + t * 0.15, uv.y * 0.75 - t * 0.35));
      float rays = fbm(vec2(uv.x * uRayFreq + curtain * 3.0, uv.y * 0.9 - t * 1.3));
      float fine = fbm(vec2(uv.x * uRayFreq * 2.3 + curtain * 6.0, uv.y * 0.6 - t * 2.1));
      float filament = smoothstep(0.46, 0.52, rays) * (0.35 + 0.9 * fine * fine);
      float vProfile = smoothstep(0.10, 0.26, uv.y) * (1.0 - smoothstep(0.52, 0.92, uv.y));
      float hFade = smoothstep(0.0, 0.075, uv.x) * (1.0 - smoothstep(0.90, 1.0, uv.x));
      float grad = mix(1.0, 0.35 + 0.9 * smoothstep(0.0, 0.8, uv.x), uBrightGrad);
      float swell = 0.55 + 0.65 * smoothstep(0.15, 0.8, fbm(vec2(uv.x * 1.1 + t * 0.18, 0.5)));
      float hue = fbm(vec2(uv.x * 1.35 + t * 0.12, 0.31));
      float a = (curtain * 0.16 + filament * 0.92) * vProfile * hFade * grad * swell
              * (0.55 + 0.65 * hue);
      a += exp(-pow((uv.y - 0.18) / 0.12, 2.0)) * filament * 0.30 * hFade * grad;
      a *= uIntensity * (0.5 + 0.6 * uKp);
      vec3 col = mix(uColorA, uColorB, smoothstep(0.15, 0.85, hue));
      col = mix(col, uColorC, smoothstep(0.38, 0.95, uv.y));
      col += uColorD * pow(1.0 - abs(hue - 0.5) * 2.0, 5.0) * 0.32;
      col += vec3(0.50, 0.95, 0.72) * pow(filament, 4.0) * 0.65;
      gl_FragColor = vec4(col * (0.82 + 0.22 * uKp), clamp(a, 0.0, 1.0));
    }
  `;
  const AURORA_VERT = `
    uniform float uTime, uSpeed, uTilt;
    varying vec2 vUv;
    void main(){
      vUv = uv;
      vec3 p = position;
      float t = uTime * uSpeed;
      float fold = sin(uv.x * 7.0 + t * 0.45) * 0.7 + sin(uv.x * 17.0 - t * 0.28) * 0.3;
      vec2 dir = normalize(p.xz + vec2(0.0001));
      p.xz += dir * fold * 16.0 * uv.y;
      float hang = sin(uv.x * 11.0 + t * 0.3) * 0.5 + sin(uv.x * 27.0 - t * 0.19) * 0.3 + sin(uv.x * 53.0 + t * 0.4) * 0.2;
      p.y += hang * 26.0;
      p.y += (0.5 + 0.5 * sin(uv.x * 6.0 + t * 0.18)) * 26.0 * uv.y;
      p.y += uv.x * uTilt;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;
  const auroras = [];
  function curtain(o) {
    const seg = MOBILE ? 140 : 200, rows = MOBILE ? 10 : 16;
    const positions = [], uvs = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, th = lerp(o.theta0, o.theta1, t);
      const x = Math.sin(th) * o.radius, z = -Math.cos(th) * o.radius;
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        positions.push(x, o.base + v * o.height, z); uvs.push(t, v);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j, b = a + 1, c = a + rows + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    const m = new T.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uKp: { value: 0.85 }, uIntensity: { value: o.intensity },
        uSpeed: { value: o.speed }, uRayFreq: { value: o.rayFreq }, uTilt: { value: o.tilt || 0 },
        uBrightGrad: { value: o.brightGrad === undefined ? 1 : o.brightGrad },
        uColorA: { value: new T.Color(o.colorA) }, uColorB: { value: new T.Color(o.colorB) },
        uColorC: { value: new T.Color(o.colorC) }, uColorD: { value: new T.Color(o.colorD || 0x5a2a9a) }
      },
      vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG,
      transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: true,
      side: T.DoubleSide, fog: false
    });
    const mesh = new T.Mesh(g, m);
    mesh.frustumCulled = false; mesh.renderOrder = o.order || -80;
    scene.add(mesh);
    auroras.push({ mesh, mat: m, offset: o.offset || 0 });
  }
  curtain({ radius: 520, theta0: -0.60, theta1: 1.62, base: 48, height: 160, intensity: 1.2, speed: 1.0,
    rayFreq: 64, brightGrad: 0.95, tilt: 18, colorA: 0x2fe0a0, colorB: 0x12c46e, colorC: 0x0a5f9e, order: -78 });
  curtain({ radius: 680, theta0: -0.30, theta1: 1.70, base: 62, height: 180, intensity: 0.7, speed: 0.72,
    rayFreq: 66, brightGrad: 0.6, tilt: 14, offset: 40, colorA: 0x25c79c, colorB: 0x0d8a62, colorC: 0x1550b0, order: -82 });
  curtain({ radius: 880, theta0: -0.80, theta1: 1.35, base: 80, height: 200, intensity: 0.4, speed: 0.45,
    rayFreq: 84, brightGrad: 0.35, tilt: 10, offset: 90, colorA: 0x1a8a7a, colorB: 0x0d4f52, colorC: 0x24336f, order: -86 });
  curtain({ radius: 1180, theta0: -1.0, theta1: 1.5, base: 100, height: 220, intensity: 0.22, speed: 0.3,
    rayFreq: 110, brightGrad: 0.25, tilt: 8, offset: 140, colorA: 0x1a4a5a, colorB: 0x0a3038, colorC: 0x1a2450, order: -90 });
  curtain({ radius: 430, theta0: -0.9, theta1: 1.85, base: 4, height: 110, intensity: 0.35, speed: 0.32,
    rayFreq: 9, brightGrad: 1.0, tilt: 16, offset: 170, colorA: 0x2a9068, colorB: 0x0a4034, colorC: 0x08303c, order: -92 });

  /* ---------------- 灯光 ---------------- */
  const hemi = new T.HemisphereLight(0x596470, 0x0d1014, 0.38);
  scene.add(hemi);
  const moon = new T.DirectionalLight(0xdfe9ff, 0.62);
  moon.position.set(-85, 110, 65);
  moon.castShadow = true;
  moon.shadow.mapSize.set(MOBILE ? 1024 : 4096, MOBILE ? 1024 : 4096);
  moon.shadow.camera.left = -55; moon.shadow.camera.right = 55;
  moon.shadow.camera.top = 55; moon.shadow.camera.bottom = -55;
  moon.shadow.camera.near = 30; moon.shadow.camera.far = 260;
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.05;
  scene.add(moon); scene.add(moon.target);
  const auroraLight = new T.DirectionalLight(0xe8eef2, 0.32);
  auroraLight.position.set(120, 55, -180);
  scene.add(auroraLight);
  scene.add(new T.AmbientLight(0x161c22, 0.22));
  const fillDir = new T.DirectionalLight(0xdfe8f2, 0.5);
  fillDir.position.set(55, 45, 90);
  scene.add(fillDir);

  /* ---------------- 环境贴图 ---------------- */
  (function environment() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#03070f'); g.addColorStop(0.45, '#071325');
    g.addColorStop(0.62, '#123049'); g.addColorStop(0.72, '#0b1e2c'); g.addColorStop(1, '#05090f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
    const ag = ctx.createLinearGradient(0, 210, 0, 360);
    ag.addColorStop(0, 'rgba(40,255,180,0)'); ag.addColorStop(0.35, 'rgba(40,255,170,0.55)'); ag.addColorStop(1, 'rgba(20,120,160,0)');
    ctx.fillStyle = ag; ctx.fillRect(380, 200, 644, 180);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 1024, y = Math.random() * 250;
      ctx.fillStyle = `rgba(210,230,255,${0.25 + Math.random() * 0.6})`;
      ctx.fillRect(x, y, 1.2, 1.2);
    }
    const tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.colorSpace = T.SRGBColorSpace;
    const pmrem = new T.PMREMGenerator(R.renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    tex.dispose(); pmrem.dispose();
  })();

  /* ---------------- 雪 / 闪点 / 雾 ---------------- */
  const SNOW_N = MOBILE ? 900 : 1800;
  const snowGeo = new T.BufferGeometry();
  {
    const p = new Float32Array(SNOW_N * 3), sz = new Float32Array(SNOW_N), ph = new Float32Array(SNOW_N);
    for (let i = 0; i < SNOW_N; i++) {
      p[i * 3] = (rng() - 0.5) * 76; p[i * 3 + 1] = rng() * 26; p[i * 3 + 2] = (rng() - 0.5) * 76;
      sz[i] = 0.7 + rng() * 1.4; ph[i] = rng();
    }
    snowGeo.setAttribute('position', new T.BufferAttribute(p, 3));
    snowGeo.setAttribute('aSize', new T.BufferAttribute(sz, 1));
    snowGeo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
  }
  const snowGroup = new T.Group();
  scene.add(snowGroup);
  const snowFallMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: R.renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSize, aPhase;
      uniform float uTime, uPixelRatio;
      varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(position.y - uTime * 1.15 - aPhase * 26.0, 26.0);
        p.x += sin(uTime * 0.22 + aPhase * 6.2831) * 1.7;
        p.z += cos(uTime * 0.17 + aPhase * 6.2831) * 1.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(0.4, -mv.z);
        gl_PointSize = clamp(aSize * uPixelRatio * (16.0 / dist), 0.7, 5.0);
        vA = smoothstep(0.6, 2.4, dist) * smoothstep(38.0, 14.0, dist);
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(smoothstep(1.0, 0.0, d), 1.5);
        gl_FragColor = vec4(vec3(0.85, 0.95, 1.0) * a * vA * 0.8, a * vA);
      }`
  });
  const snowfall = new T.Points(snowGeo, snowFallMat);
  snowfall.frustumCulled = false;
  snowGroup.add(snowfall);

  const SPARK_N = MOBILE ? 900 : 2200;
  const sparkGeo = new T.BufferGeometry();
  {
    const p = new Float32Array(SPARK_N * 3), sz = new Float32Array(SPARK_N), ph = new Float32Array(SPARK_N);
    for (let i = 0; i < SPARK_N; i++) {
      const x = (rng() - 0.5) * 110, z = (rng() - 0.5) * 110;
      p[i * 3] = x; p[i * 3 + 1] = terrainH(x, z) + 0.03; p[i * 3 + 2] = z;
      sz[i] = 0.6 + rng() * 1.3; ph[i] = rng();
    }
    sparkGeo.setAttribute('position', new T.BufferAttribute(p, 3));
    sparkGeo.setAttribute('aSize', new T.BufferAttribute(sz, 1));
    sparkGeo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
  }
  const sparkMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: R.renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSize, aPhase;
      uniform float uTime, uPixelRatio;
      varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = pow(0.5 + 0.5 * sin(uTime * 2.2 + aPhase * 6.2831), 7.0);
        gl_PointSize = aSize * uPixelRatio;
        vA = tw * smoothstep(120.0, 15.0, -mv.z);
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(vec3(0.75, 1.0, 0.92) * a * vA * 2.4, a * vA);
      }`
  });
  const sparks = new T.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);

  const glowTex = AH.makeRadialTexture(128);
  const mists = [];
  for (let i = 0; i < (MOBILE ? 5 : 9); i++) {
    const m = new T.SpriteMaterial({
      map: glowTex, color: 0x8fd8cf, transparent: true, opacity: 0.08 + rng() * 0.05,
      blending: T.AdditiveBlending, depthWrite: false, fog: false
    });
    const sp = new T.Sprite(m);
    const ang = -0.7 + rng() * 1.8, rad = 45 + rng() * 80;
    sp.position.set(Math.sin(ang) * rad, 1.2 + rng() * 2.6, -Math.cos(ang) * rad);
    sp.scale.set(70 + rng() * 50, 14 + rng() * 8, 1);
    scene.add(sp);
    mists.push({ sp, phase: rng() * 6.28, speed: 0.05 + rng() * 0.04 });
  }

  /* ---------------- 更新 ---------------- */
  const world = {
    update(t, dt, camera, kp) {
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
      milky.position.copy(camera.position);
      skyMat.uniforms.uTime.value = t;
      skyMat.uniforms.uKp.value = kp;
      starMat.uniforms.uTime.value = t;
      sparkMat.uniforms.uTime.value = t;
      snowFallMat.uniforms.uTime.value = t;
      for (const a of auroras) {
        a.mat.uniforms.uTime.value = t + a.offset;
        a.mat.uniforms.uKp.value = kp;
      }
      snowGroup.position.set(camera.position.x, 0, camera.position.z);
      for (const mt of meteors) {
        if (mt.t < 0) {
          mt.wait -= dt;
          if (mt.wait <= 0) spawnMeteor(mt);
          continue;
        }
        mt.t += dt / mt.dur;
        if (mt.t > 1) {
          mt.t = -1; mt.wait = 7 + Math.random() * 24; mt.mat.opacity = 0;
          continue;
        }
        const ang = mt.t * 0.065;
        const head = mt.start.clone().multiplyScalar(Math.cos(ang)).addScaledVector(mt.tan, Math.sin(ang)).normalize();
        const ta = Math.max(0, ang - 0.022);
        const tail = mt.start.clone().multiplyScalar(Math.cos(ta)).addScaledVector(mt.tan, Math.sin(ta)).normalize();
        const p = mt.geo.attributes.position.array;
        p[0] = camera.position.x + head.x * 3000;
        p[1] = camera.position.y + head.y * 3000;
        p[2] = camera.position.z + head.z * 3000;
        p[3] = camera.position.x + tail.x * 3000;
        p[4] = camera.position.y + tail.y * 3000;
        p[5] = camera.position.z + tail.z * 3000;
        mt.geo.attributes.position.needsUpdate = true;
        mt.mat.opacity = Math.sin(Math.PI * mt.t) * 0.8;
      }
      auroraLight.intensity = 0.04 + kp * 0.06;
      hemi.intensity = 0.24 + kp * 0.08;
      for (const m of mists) {
        m.sp.position.x += Math.sin(t * m.speed + m.phase) * dt * 0.5;
        m.sp.material.opacity = 0.07 + 0.025 * (0.5 + 0.5 * Math.sin(t * 0.12 + m.phase));
      }
    },
    terrainH, moon, glowTex
  };
  AH.world = world;
})();
