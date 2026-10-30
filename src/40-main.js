/* 启动、交互、主循环 */
(function () {
  const AH = window.AH, T = AH.T, R = AH.R;
  const params = AH.params;
  const shot = params.has('shot');
  const freezeShot = shot;
  const quality = R.quality;

  const loading = AH.$('loading');
  const intro = AH.$('intro');
  const stat = AH.$('stat');

  if (AH.mobile) document.body.classList.add('mobile');
  const mobile = AH.mobile;

  let time = parseFloat(params.get('t') || '9');
  let kp = parseFloat(params.get('kp') || '0.85');
  let freeCam = false;
  let freeze = freezeShot;
  let entered = false;
  let frames = 0;
  let ready = false;
  AH.dbg = params.has('dbg');
  if (params.has('nodof') && R.post) R.post.quality.setDof(0);
  if (params.get('focus')) AH.focusOverride = parseFloat(params.get('focus'));

  // 截图机位
  if (params.get('cam')) {
    const c = params.get('cam').split(',').map(Number);
    cameraPlace(c);
  }
  function cameraPlace(c) {
    R.camera.position.set(c[0], c[1], c[2]);
    if (params.get('look')) {
      const l = params.get('look').split(',').map(Number);
      R.camera.lookAt(l[0], l[1], l[2]);
    }
    if (params.get('fov')) {
      R.camera.fov = parseFloat(params.get('fov'));
      R.camera.updateProjectionMatrix();
    }
    freeCam = true;
  }

  if (shot) {
    document.body.classList.add('reveal');
    if (params.get('ui') === '0') document.body.classList.add('photo');
    if (loading) loading.style.display = 'none';
    const ui = AH.$('ui');
    if (ui) ui.style.display = params.get('ui') === '0' ? 'none' : '';
    if (intro) intro.style.display = 'none';
    if (params.get('char') === '0' && AH.player) {
      AH.player.state.hideChar = true;
      AH.player.char.visible = false;
    }
  }
  if (params.get('tp') === '0' && AH.player) AH.player.state.mode = 'fp';
  if (params.get('tp') === '1' && AH.player) AH.player.state.mode = 'tp';
  if (params.has('walk') && AH.player) {
    AH.player.keys.KeyW = true;
    setTimeout(() => { AH.player.keys.KeyW = false; }, 2200);
  }
  if (params.has('lookback') && AH.player) {
    setTimeout(() => { AH.player.state.yaw += Math.PI; }, 2800);
  }
  if (params.has('paper')) setTimeout(() => AH.ui && AH.ui.openPaper(), 900);
  if (params.has('book')) setTimeout(() => AH.ui && AH.ui.openBook('补给队日志', '第三十七日。煤油只剩两罐。\n\n极光今夜低得反常，像有人把帘子掀开了一角。\n\n我在石环边捡到一枚黄铜扣子，不属于我们的人。'), 900);
  if (params.has('sit') && AH.player) {
    setTimeout(() => {
      const it = (AH.interactables || []).find((i) => i.label === '坐下');
      if (it) it.fn();
    }, 1200);
  }
  if (params.has('ride') && AH.player) {
    setTimeout(() => {
      const it = (AH.interactables || []).find((i) => i.label === '坐上雪橇');
      if (it) it.fn();
      const s = AH.player.state.sit;
      if (s && s.type === 'sled') { s.speed = 12; s.heading = -0.9; }
      console.log('RIDEHOOK', s && s.type, s && s.speed);
    }, 1000);
  }

  function enter() {
    if (entered) return;
    entered = true;
    intro.classList.add('gone');
    if (AH.mobile) {
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => { });
        }
      } catch (e) { }
    }
    if (!AH.mobile) {
      setTimeout(() => {
        try { R.canvas.requestPointerLock && R.canvas.requestPointerLock(); } catch (e) { }
      }, 140);
    }
  }
  intro.addEventListener('click', enter);
  intro.addEventListener('touchstart', enter, { passive: true });

  /* ---------------- 交互 UI ---------------- */
  const promptEl = AH.$('prompt');
  const modal = AH.$('modal');
  const mtitle = AH.$('mtitle');
  const mbody = AH.$('mbody');
  const minput = AH.$('minput');
  const mok = AH.$('mok');
  const mclose = AH.$('mclose');
  let uiOpen = false;
  AH.uiOpen = false;
  function openModal() {
    modal.classList.remove('hidden');
    uiOpen = true; AH.uiOpen = true;
    try { document.exitPointerLock(); } catch (e) { }
  }
  function closeModal() {
    modal.classList.add('hidden');
    uiOpen = false; AH.uiOpen = false;
    if (!AH.mobile) { try { R.canvas.requestPointerLock(); } catch (e) { } }
  }
  mclose.addEventListener('click', closeModal);
  mok.addEventListener('click', () => {
    const t = minput.value;
    try { localStorage.setItem('ah_paper', t); } catch (e) { }
    if (AH.cabin) { AH.cabin.paperText = t; AH.cabin.setPaperText(t); }
    closeModal();
  });
  AH.ui = {
    openPaper() {
      mtitle.textContent = '纸上';
      mbody.style.display = 'none';
      minput.style.display = 'block';
      mok.style.display = '';
      let saved = '';
      try { saved = localStorage.getItem('ah_paper') || ''; } catch (e) { }
      minput.value = saved || (AH.cabin ? AH.cabin.paperText : '') || '';
      openModal();
      setTimeout(() => minput.focus(), 60);
    },
    openFish() {
      const catches = ['一条北极红点鲑', '一条小鳕鱼', '一只旧靴子', '一把锈掉的刀'];
      const c = catches[Math.floor(Math.random() * catches.length)];
      mtitle.textContent = '冰钓';
      mbody.textContent = (Math.random() < 0.18
        ? '浮标在水下轻轻一颤，然后归于平静。'
        : '你从冰洞里拉出' + c + '。\n\n风把雪吹进洞口，很快又盖住了水面。');
      mbody.style.display = 'block';
      minput.style.display = 'none';
      mok.style.display = 'none';
      openModal();
    },
    openBook(title, text) {
      mtitle.textContent = title;
      mbody.textContent = text;
      mbody.style.display = 'block';
      minput.style.display = 'none';
      mok.style.display = 'none';
      openModal();
    },
    close: closeModal
  };

  const _dir = new T.Vector3(), _tmp = new T.Vector3();
  function nearest() {
    if (!AH.player || !AH.interactables) return null;
    const p = AH.player.position;
    R.camera.getWorldDirection(_dir);
    let best = null, bd = 1e9;
    for (const it of AH.interactables) {
      const dx = it.pos.x - p.x, dy = it.pos.y - (p.y + 1.2), dz = it.pos.z - p.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > (it.r || 2.2)) continue;
      _tmp.set(dx, dy, dz).normalize();
      if (_tmp.dot(_dir) < -0.15) continue;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  function checkOrientation() {
    if (!AH.mobile) return;
    document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth);
  }
  window.addEventListener('resize', checkOrientation);
  checkOrientation();

  /* ---------------- 触屏 ---------------- */
  if (mobile) {
    const stick = AH.$('stick'), knob = AH.$('knob');
    let stickId = null, sx = 0, sy = 0;
    const R0 = 46;
    if (stick) {
      stick.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        stickId = e.pointerId;
        try { stick.setPointerCapture(e.pointerId); } catch (err) { }
        const r = stick.getBoundingClientRect();
        sx = r.left + r.width / 2; sy = r.top + r.height / 2;
        AH.touch.active = true;
      });
      stick.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stickId) return;
        let dx = e.clientX - sx, dy = e.clientY - sy;
        const d = Math.hypot(dx, dy);
        if (d > R0) { dx *= R0 / d; dy *= R0 / d; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        AH.touch.x = dx / R0;
        AH.touch.y = -dy / R0;
      });
      const end = (e) => {
        if (e.pointerId !== stickId) return;
        stickId = null; AH.touch.x = 0; AH.touch.y = 0; AH.touch.active = false;
        knob.style.transform = 'translate(0,0)';
      };
      stick.addEventListener('pointerup', end);
      stick.addEventListener('pointercancel', end);
    }
    const jump = AH.$('btnJump');
    if (jump) jump.addEventListener('pointerdown', (e) => { e.preventDefault(); AH.touch.jump = true; });
    const run = AH.$('btnRun');
    if (run) run.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      AH.touch.run = !AH.touch.run;
      run.classList.toggle('on', AH.touch.run);
    });
    const view = AH.$('btnView');
    if (view) view.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (AH.player) AH.player.toggleMode();
    });
    const use = AH.$('btnUse');
    if (use) use.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (uiOpen) return;
      if (AH.player && AH.player.state.sit) { AH.player.stand(); return; }
      const it = nearest();
      if (it) it.fn();
    });
  }

  // 键盘
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && uiOpen) { closeModal(); return; }
    if (e.code === 'KeyE') {
      if (e.repeat) return;
      if (uiOpen) return;
      if (AH.player && AH.player.state.sit) { AH.player.stand(); return; }
      const it = nearest(); if (it) it.fn();
      return;
    }
    if (e.code === 'KeyV' && AH.player) AH.player.toggleMode();
    if (e.code === 'KeyP') document.body.classList.toggle('photo');
    if (e.code === 'KeyH') {
      const ui = AH.$('ui');
      ui.style.opacity = ui.style.opacity === '0' ? '1' : '0';
    }
    if (e.code === 'KeyF') {
      freeze = !freeze;
    }
    if (e.code === 'KeyR') {
      AH.player.state.pos.set(2.0, AH.terrainH(2.0, 11.5), 11.5);
      AH.player.state.yaw = -0.52;
      AH.player.state.pitch = 0.02;
    }
  });

  // 提示淡出
  setTimeout(() => {
    const hint = AH.$('hint');
    if (hint) hint.style.opacity = '0.18';
  }, 14000);

  // 渲染循环
  let last = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsTimer = 0, slowTime = 0, degraded = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const dtRaw = Math.min(0.06, Math.max(0.0, (now - last) / 1000));
    last = now;

    if (!freeze) time += dtRaw;
    else time += 0;

    if (!freeCam && !uiOpen) AH.player.update(dtRaw, time);

    // 极光强度缓慢呼吸
    const kpNow = AH.clamp(kp + Math.sin(time * 0.045) * 0.06 + Math.sin(time * 0.017 + 2.0) * 0.04, 0.25, 1.0);
    if (AH.world) AH.world.update(time, dtRaw, R.camera, kpNow);
    if (AH.cabin) AH.cabin.update(time, dtRaw);
    if (AH.life) AH.life.update(time, dtRaw);

    if (uiOpen) {
      promptEl.classList.remove('show');
    } else if (AH.player && AH.player.state.sit) {
      const st = AH.player.state.sit;
      promptEl.textContent = st.type === 'sled'
        ? 'W/S 加速 · A/D 转向 · ' + Math.round(Math.abs(st.speed || 0) * 3.6) + ' km/h · E 下车'
        : (AH.mobile ? '「用」' : 'E') + ' · 起身';
      promptEl.classList.add('show');
      AH.currentInteract = null;
    } else {
      const it = nearest();
      AH.currentInteract = it;
      if (it) {
        promptEl.textContent = (AH.mobile ? '「用」' : 'E') + ' · ' + it.label;
        promptEl.classList.add('show');
      } else {
        promptEl.classList.remove('show');
      }
    }

    R.post.render(time);

    frames++;
    if (frames === 3) loading.classList.add('gone');
    if (!ready && frames > 5) {
      ready = true;
      window.__READY__ = true;
      document.title = '极光冻原 · READY';
    }

    // 统计与自动降质
    fpsAcc += dtRaw; fpsN++; fpsTimer += dtRaw;
    if (fpsTimer > 0.5) {
      const fps = fpsN / fpsAcc;
      if (stat) {
        stat.textContent = `FPS ${fps.toFixed(0)}  ·  ${R.renderer.info.render.calls} calls  ·  ${(R.renderer.info.render.triangles / 1000).toFixed(0)}k tris`;
        stat.style.display = params.get('fps') === '1' ? 'block' : 'none';
      }
      if (!shot && !degraded && quality === 'high' && fps < 38) {
        slowTime += 0.5;
        if (slowTime > 2.5) {
          degraded = true;
          R.renderer.setPixelRatio(1);
          R.renderer.setSize(window.innerWidth, window.innerHeight);
          R.post.resize(window.innerWidth, window.innerHeight);
          R.post.quality.setDof(0.35);
          R.post.quality.setBloom(0.52);
          if (stat) stat.textContent += '  ·  quality lowered';
        }
      } else {
        slowTime = 0;
      }
      fpsAcc = 0; fpsN = 0; fpsTimer = 0;
    }
  }

  // 窗口尺寸变化后重分配后期目标
  window.addEventListener('resize', () => {
    setTimeout(() => R.post.resize(window.innerWidth, window.innerHeight), 30);
  });

  window.addEventListener('error', (e) => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:999;padding:10px 14px;background:rgba(60,0,0,.85);color:#ffd7d7;font:12px/1.5 monospace;white-space:pre-wrap';
    box.textContent = 'ERROR: ' + (e.message || e.error) + '\n' + (e.filename || '') + ':' + (e.lineno || '');
    document.body.appendChild(box);
  });

  // 预编译：先渲染一帧再淡出
  requestAnimationFrame(frame);

  // 让截图脚本能等待
  window.AH = AH;
})();
