/* 渲染器 / 场景 / 相机 */
(function () {
  const AH = window.AH, T = AH.T;
  const canvas = AH.$('scene');

  const quality = (AH.params.get('q') || (AH.mobile ? 'mid' : 'high')).toLowerCase();
  const prCap = AH.mobile ? 1.25 : (quality === 'low' ? 1.0 : quality === 'mid' ? 1.25 : 1.5);

  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, prCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = T.LinearSRGBColorSpace;
  renderer.toneMapping = T.NoToneMapping;
  renderer.setClearColor(0x02060b, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x061a22, 0.0032);

  const camera = new T.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.08, 12000);
  camera.position.set(3.2, 3, 15.5);

  const R = (AH.R = { renderer, scene, camera, canvas, quality, prCap });
  AH.onResize = [];

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (R.post) R.post.resize(w, h);
    for (const fn of AH.onResize) fn(w, h);
  }
  window.addEventListener('resize', resize);

  AH.resize = resize;
})();
