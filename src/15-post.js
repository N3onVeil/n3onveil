/* 电影级后期：HDR → 泛光 → 景深 → ACES → 调色 → 颗粒 */
(function () {
  const AH = window.AH, T = AH.T, R = AH.R;
  const renderer = R.renderer;

  const quadScene = new T.Scene();
  const quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), null);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const VERT = `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;

  const BRIGHT = `
    uniform sampler2D tDiffuse;
    uniform float uThreshold, uKnee;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float s = smoothstep(uThreshold, uThreshold + uKnee, l);
      gl_FragColor = vec4(c * s, 1.0);
    }
  `;

  const BLUR = `
    uniform sampler2D tDiffuse;
    uniform vec2 uDir;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
      c += texture2D(tDiffuse, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
      c += texture2D(tDiffuse, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
      c += texture2D(tDiffuse, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
      c += texture2D(tDiffuse, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
      gl_FragColor = vec4(c, 1.0);
    }
  `;

  const COPY = `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }
  `;

  const COMPOSITE = `
    uniform sampler2D tScene, tDof, tB1, tB2, tB3, tDepth;
    uniform vec2  uResolution;
    uniform float uTime, uExposure, uNear, uFar, uFocus, uDofMix;
    uniform float uBloom, uVignette, uGrain, uSat, uContrast, uCA;
    varying vec2 vUv;

    vec3 aces(vec3 x){
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c){
      return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c));
    }
    float hash(vec2 p){
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main(){
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);

      vec2 ca = d * r2 * uCA;
      vec3 sharp;
      sharp.r = texture2D(tScene, uv + ca).r;
      sharp.g = texture2D(tScene, uv).g;
      sharp.b = texture2D(tScene, uv - ca).b;

      float depth = texture2D(tDepth, uv).x;
      float ndc = depth * 2.0 - 1.0;
      float lin = (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
      lin = max(lin, 0.0001);

      float nearCoc = clamp((uFocus - lin) / max(uFocus, 1.0), 0.0, 1.0);
      nearCoc = pow(nearCoc, 1.6);
      float farCoc = clamp((lin - uFocus) / (uFar * 0.22), 0.0, 1.0) * 0.30;
      float coc = max(nearCoc, farCoc) * uDofMix;

      vec3 dof = texture2D(tDof, uv).rgb;
      vec3 col = mix(sharp, dof, clamp(coc, 0.0, 0.94));

      vec3 bloom = texture2D(tB1, uv).rgb * 0.55
                 + texture2D(tB2, uv).rgb * 0.34
                 + texture2D(tB3, uv).rgb * 0.24;
      col += bloom * uBloom;
      col += bloom * vec3(1.0, 0.50, 0.26) * 0.10;

      col *= uExposure;
      col = aces(col);
      col = toSRGB(col);

      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = max(col, 0.0);
      float s = clamp((uContrast - 1.0) * 0.9, 0.0, 0.35);
      col = mix(col, col * col * (3.0 - 2.0 * col), s);
      col += vec3(0.004, 0.006, 0.014) * (1.0 - col);
      col *= vec3(1.02, 1.0, 0.985);

      float vig = smoothstep(1.38, 0.30, length(d) * 1.40);
      col *= mix(1.0, vig, uVignette);

      float g = hash(uv * uResolution + fract(uTime * 0.37) * 137.0) - 0.5;
      col += g * uGrain;

      col += (hash(uv * uResolution + 7.0) - 0.5) / 255.0;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `;

  function mat(frag, uniforms) {
    return new T.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: frag,
      uniforms,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
  }

  const brightMat = mat(BRIGHT, {
    tDiffuse: { value: null },
    uThreshold: { value: 0.80 },
    uKnee: { value: 0.42 }
  });
  const blurMat = mat(BLUR, { tDiffuse: { value: null }, uDir: { value: new T.Vector2() } });
  const copyMat = mat(COPY, { tDiffuse: { value: null } });
  const compMat = mat(COMPOSITE, {
    tScene: { value: null }, tDof: { value: null },
    tB1: { value: null }, tB2: { value: null }, tB3: { value: null },
    tDepth: { value: null },
    uResolution: { value: new T.Vector2(1, 1) },
    uTime: { value: 0 },
    uExposure: { value: 0.92 },
    uNear: { value: 0.08 },
    uFar: { value: 7000 },
    uFocus: { value: 19 },
    uDofMix: { value: 0.0 },
    uBloom: { value: 0.50 },
    uVignette: { value: 0.72 },
    uGrain: { value: 0.04 },
    uSat: { value: 0.9 },
    uContrast: { value: 1.10 },
    uCA: { value: 0.0035 }
  });

  let PW = 1, PH = 1;
  const sceneRT = new T.WebGLRenderTarget(1, 1, {
    type: T.HalfFloatType,
    depthBuffer: true,
    stencilBuffer: false,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    generateMipmaps: false,
    samples: 0
  });
  sceneRT.depthTexture = new T.DepthTexture(1, 1);

  let L1A, L1T, L1B, L2A, L2T, L2B, L3A, L3T, L3B, D1, DT, D2;

  function mk(w, h) {
    return new T.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
      type: T.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: T.LinearFilter,
      magFilter: T.LinearFilter,
      generateMipmaps: false
    });
  }
  function all() { return [sceneRT, L1A, L1T, L1B, L2A, L2T, L2B, L3A, L3T, L3B, D1, DT, D2]; }

  function alloc() {
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    PW = Math.max(1, size.x | 0); PH = Math.max(1, size.y | 0);

    sceneRT.setSize(PW, PH);
    sceneRT.depthTexture.image.width = PW;
    sceneRT.depthTexture.image.height = PH;
    sceneRT.depthTexture.needsUpdate = true;

    const hw = Math.max(1, PW >> 1), hh = Math.max(1, PH >> 1);
    const qw = Math.max(1, PW >> 2), qh = Math.max(1, PH >> 2);
    const ew = Math.max(1, PW >> 3), eh = Math.max(1, PH >> 3);

    for (const rt of all()) if (rt && rt !== sceneRT) rt.dispose();
    L1A = mk(hw, hh); L1T = mk(hw, hh); L1B = mk(hw, hh);
    L2A = mk(qw, qh); L2T = mk(qw, qh); L2B = mk(qw, qh);
    L3A = mk(ew, eh); L3T = mk(ew, eh); L3B = mk(ew, eh);
    D1 = mk(hw, hh); DT = mk(hw, hh); D2 = mk(hw, hh);

    compMat.uniforms.uResolution.value.set(PW, PH);
    compMat.uniforms.uNear.value = R.camera.near;
    compMat.uniforms.uFar.value = R.camera.far;
  }

  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }

  function blur(src, tmp, dst, radius) {
    blurMat.uniforms.tDiffuse.value = src.texture;
    blurMat.uniforms.uDir.value.set(radius / src.width, 0);
    pass(blurMat, tmp);

    blurMat.uniforms.tDiffuse.value = tmp.texture;
    blurMat.uniforms.uDir.value.set(0, radius / src.height);
    pass(blurMat, dst);
  }

  function copy(src, dst) {
    copyMat.uniforms.tDiffuse.value = src.texture;
    pass(copyMat, dst);
  }

  function render(time) {
    const scene = R.scene, camera = R.camera;
    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    brightMat.uniforms.tDiffuse.value = sceneRT.texture;
    pass(brightMat, L1A);

    blur(L1A, L1T, L1B, 1.5);
    blur(L1B, L1T, L1B, 3.2);

    copy(L1B, L2A);
    blur(L2A, L2T, L2B, 2.0);
    blur(L2B, L2T, L2B, 4.0);

    copy(L2B, L3A);
    blur(L3A, L3T, L3B, 2.4);
    blur(L3B, L3T, L3B, 4.8);

    copy(sceneRT, D1);
    blur(D1, DT, D2, 2.2);

    const u = compMat.uniforms;
    u.tScene.value = sceneRT.texture;
    u.tDof.value = D2.texture;
    u.tB1.value = L1B.texture;
    u.tB2.value = L2B.texture;
    u.tB3.value = L3B.texture;
    u.tDepth.value = sceneRT.depthTexture;
    u.uTime.value = time;
    u.uFocus.value = R.focus || 19;

    pass(compMat, null);
  }

  const post = {
    render,
    resize() { alloc(); },
    setFocus(v) { R.focus = v; },
    uniforms: compMat.uniforms,
    bloom: { threshold: brightMat.uniforms.uThreshold, strength: compMat.uniforms.uBloom },
    quality: {
      setDof(v) { compMat.uniforms.uDofMix.value = v; },
      setBloom(v) { compMat.uniforms.uBloom.value = v; }
    }
  };
  if (AH.params.has('nobloom')) { compMat.uniforms.uBloom.value = 0; brightMat.uniforms.uThreshold.value = 99; }
  R.post = post;

  alloc();

  window.addEventListener('resize', () => { setTimeout(alloc, 0); });
})();
