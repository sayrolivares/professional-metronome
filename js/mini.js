/* mini.js — the floating metronome: the beats of the bar, the time signature, the tempo with
   − and +, play and stop, small enough to keep in view while you do something else.

   It shows up in two places, both switched on by one setting ("Floating metronome"):
     • Pop-out window: floats over every other tab and app. Browsers with Document
       Picture-in-Picture (Chrome, Edge, Brave and Opera on computers) get the full, clickable
       widget. Where only video picture-in-picture exists (Chrome on Android, Safari), a live
       picture of the widget floats instead; play/pause and ± tempo work through the window's
       own media buttons.
     • Dock: a card in the corner of the page whenever the big metronome is scrolled out of
       view (Advanced panels, long pages, Stand mode) and the pop-out isn't open.

   Everything goes through the same controls as the page (setBpm, start, pause, stop from
   js/ui.js), so tempo programs, the practice log and the count-in behave exactly the same.
   Text is translated here with MN.i18n.tr (the pop-out window is a separate document that
   the page translator doesn't watch), so the widget is marked data-i18n="off". */
(function (root) {
  const MN = (root.MN = root.MN || {});

  const PLAY = 'M8 5.5v13l11-6.5z', PAUSE = 'M7 5h4v14H7zM13 5h4v14h-4z', STOP = 'M6 6h12v12H6z';
  const POP = 'M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4', CLOSE = 'M6 6l12 12M18 6L6 18';

  function init(api) {
    const { store, engine } = api;
    const S = () => store.get();
    const R = MN.rhythm, I = MN.i18n;
    const tr = (s) => (I ? I.tr(s) : s);
    const toast = (s) => api.toast(s);
    let topLevel = true; try { topLevel = root.top === root; } catch (e) { topLevel = false; }
    /* Document Picture-in-Picture only opens from a top-level page; inside a frame (an
       embedded preview) the video picture-in-picture is used instead */
    const hasDocPiP = 'documentPictureInPicture' in root && root.isSecureContext !== false && topLevel;
    const hasVideoPiP = !hasDocPiP && !!document.pictureInPictureEnabled && typeof HTMLCanvasElement !== 'undefined'
      && !!HTMLCanvasElement.prototype.captureStream && 'requestPictureInPicture' in HTMLVideoElement.prototype;
    const canPop = hasDocPiP || hasVideoPiP;
    const reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ================= the widget, in any document ================= */
    function createWidget(doc, variant) {
      const win = doc.defaultView;
      const NS = 'http://www.w3.org/2000/svg';
      const icon = (d, filled) => {
        const s = doc.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
        if (!filled) { s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); }
        const p = doc.createElementNS(NS, 'path'); p.setAttribute('d', d); s.append(p); return s;
      };
      const mk = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
      const btn = (cls, label, child) => { const b = mk('button', cls); b.type = 'button'; b.dataset.label = label; b.append(child); return b; };

      const box = mk('div', 'mini mini-' + variant);
      box.setAttribute('data-i18n', 'off');
      box.setAttribute('role', 'region');
      const head = mk('div', 'mini-head');
      const sig = mk('span', 'mini-sig');
      const beats = mk('div', 'mini-beats'); beats.setAttribute('aria-hidden', 'true');
      head.append(sig, beats);
      let popBtn = null, closeBtn = null;
      if (variant === 'dock') {
        const acts = mk('span', 'mini-acts');
        if (canPop) { popBtn = btn('mini-ico', 'Pop out over other tabs', icon(POP)); acts.append(popBtn); }
        closeBtn = btn('mini-ico', 'Turn off the floating metronome', icon(CLOSE));
        acts.append(closeBtn);
        head.append(acts);
      }
      const ctl = mk('div', 'mini-ctl');
      const minus = btn('mini-round', 'Slower', doc.createTextNode('−'));
      const tempo = mk('span', 'mini-tempo');
      const unit = mk('span', 'mini-unit'), num = mk('b', 'mini-bpm'), bpmLbl = mk('span', 'mini-bpmlbl', 'BPM');
      tempo.append(unit, num, bpmLbl);
      const plus = btn('mini-round', 'Faster', doc.createTextNode('+'));
      const play = btn('mini-play', 'Play', icon(PLAY, true));
      const stop = btn('mini-stop', 'Stop', icon(STOP, true));
      const live = mk('span', 'mini-sr'); live.setAttribute('aria-live', 'polite');
      ctl.append(minus, tempo, plus, mk('span', 'mini-gap'), play, stop);
      box.append(head, ctl, live);

      /* − and +: click = 1 BPM, hold = repeat (timers of the widget's own window, which keeps
         running while the page's tab is in the background) */
      const hold = (b, d) => {
        let t1 = null, t2 = null, held = false;
        const end = () => { win.clearTimeout(t1); win.clearInterval(t2); t1 = t2 = null; };
        b.addEventListener('pointerdown', (e) => {
          end(); held = false;
          try { b.setPointerCapture(e.pointerId); } catch (err) {}
          t1 = win.setTimeout(() => { held = true; t2 = win.setInterval(() => api.setBpm(S().bpm + d), 70); }, 450);
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, end));
        b.addEventListener('click', () => { if (!held) api.setBpm(S().bpm + d); held = false; });
      };
      hold(minus, -1); hold(plus, 1);
      play.addEventListener('click', () => toggle());
      stop.addEventListener('click', () => api.stop());
      if (popBtn) popBtn.addEventListener('click', () => openPopout());
      if (closeBtn) closeBtn.addEventListener('click', () => { setFloating(false); toast('Floating metronome off'); });
      /* keyboard inside the pop-out: the same keys as the page */
      if (variant === 'window') doc.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey) return;
        if (e.key === ' ') { e.preventDefault(); if (!e.repeat) toggle(); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); api.setBpm(S().bpm + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : e.altKey ? 10 : 1)); }
        else if (e.key === 'r' || e.key === 'R') api.stop();
      });

      let dots = [], key = '', cur = -1;
      function build(s) {
        const n = R.beatsPerBar(s.sig);
        const k = n + '|' + s.accents.join(',');
        if (k === key) return; key = k;
        beats.textContent = ''; dots = []; cur = -1;
        beats.style.setProperty('--d', n <= 6 ? '1.05em' : n <= 9 ? '0.85em' : n <= 12 ? '0.68em' : '0.5em');
        beats.classList.toggle('many', n > 12);
        for (let i = 0; i < n; i++) {
          const lvl = s.accents[i] === undefined ? 1 : s.accents[i];
          const d = mk('i', 'mini-dot ' + ['silent', '', 'medium', 'strong'][lvl]);
          beats.append(d); dots.push(d);
        }
      }
      function labels() {
        for (const b of box.querySelectorAll('button[data-label]')) { const t = tr(b.dataset.label); b.setAttribute('aria-label', t); b.title = t; }
        box.setAttribute('aria-label', tr('Floating metronome'));
      }
      function render(s) {
        build(s);
        sig.textContent = `${s.sig.num}/${s.sig.den}`;
        sig.title = tr('Time signature');
        unit.textContent = R.beatUnitLabel(s.sig);
        num.textContent = String(s.bpm);
        minus.disabled = s.bpm <= 20; plus.disabled = s.bpm >= s.maxBpm;
        sync();
      }
      function sync() {
        const on = engine.running;
        play.classList.toggle('playing', on);
        play.dataset.label = on ? 'Pause' : 'Play';
        play.textContent = ''; play.append(icon(on ? PAUSE : PLAY, true));
        labels();
      }
      function beat(ev) {
        if (cur >= 0 && dots[cur]) dots[cur].classList.remove('on', 'countin', 'muted-bar');
        const d = dots[ev.beat];
        cur = ev.beat;
        if (!d) return;
        d.classList.add('on');
        if (ev.countIn) d.classList.add('countin');
        if (ev.silent) d.classList.add('muted-bar');
        if (!reduced() && !ev.silent && d.animate) {
          const k = ev.accent === 3 ? 1.45 : ev.accent === 2 ? 1.3 : 1.18;
          d.animate([{ transform: `scale(${k})` }, { transform: 'scale(1)' }], { duration: Math.min(220, ev.beatDur * 700), easing: 'ease-out' });
        }
      }
      function clear() { dots.forEach((d) => d.classList.remove('on', 'countin', 'muted-bar')); cur = -1; }
      return { el: box, render, sync, beat, clear, labels, popBtn };
    }

    const toggle = () => {
      if (engine.running) { api.pause(); return; }
      /* the metronome only plays on its own page (leaving it stops it), so starting from the
         pop-out brings the app back to the metronome first */
      if (MN.views && MN.views.current !== 'metronome') MN.views.show('metronome', { scroll: false });
      api.start();
    };

    /* ================= dock (in the page) ================= */
    const dock = createWidget(document, 'dock');
    dock.el.hidden = true;
    document.body.append(dock.el);
    let faceVisible = true;
    const face = document.querySelector('#view-metronome .face');
    if (face && 'IntersectionObserver' in root) {
      new IntersectionObserver((entries) => { for (const e of entries) faceVisible = e.isIntersecting && e.intersectionRatio > 0.2; placeDock(); }, { threshold: [0, 0.2, 0.5] }).observe(face);
    }
    function placeDock() {
      const s = S();
      const show = s.floating && document.body.dataset.view === 'metronome' && !faceVisible && !pop.open;
      if (show === !dock.el.hidden) return;
      dock.el.hidden = !show;
      if (show) dock.render(s);
    }
    root.addEventListener('mn:view', placeDock);

    /* ================= pop-out ================= */
    const pop = { open: false, win: null, widget: null, video: null, canvas: null, timer: null, raf: 0 };

    function copyStyles(target) {
      const doc = target.document;
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const base = sheet.href || document.baseURI;
          const css = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n')
            .replace(/url\((["']?)([^"')]+)\1\)/g, (m, q, u) => (/^(data:|https?:|blob:|#)/.test(u) ? m : `url("${new URL(u, base).href}")`));
          const st = doc.createElement('style'); st.textContent = css; doc.head.append(st);
        } catch (e) { /* a sheet we may not read: skip it */ }
      }
    }
    function syncLook(doc) {
      const src = document.documentElement, dst = doc.documentElement;
      for (const a of ['data-theme', 'data-palette', 'data-cvd', 'data-stand', 'data-lefty', 'style', 'lang']) {
        if (src.hasAttribute(a)) dst.setAttribute(a, src.getAttribute(a)); else dst.removeAttribute(a);
      }
      doc.title = tr('Metronome');
    }

    async function openPopout() {
      if (pop.open) { if (pop.win && pop.win.focus) pop.win.focus(); return true; }
      try {
        if (hasDocPiP) await openDocPiP();
        else if (hasVideoPiP) await openVideoPiP();
        else return false;
        placeDock();
        return true;
      } catch (e) {
        console.warn('pop-out', e);
        toast('The floating window could not open. The mini metronome stays in the page.');
        closePopout();
        return false;
      }
    }

    async function openDocPiP() {
      const w = await root.documentPictureInPicture.requestWindow({ width: 320, height: 132 });
      pop.win = w; pop.open = true;
      copyStyles(w); syncLook(w.document);
      w.document.body.className = 'mini-window';
      pop.widget = createWidget(w.document, 'window');
      w.document.body.append(pop.widget.el);
      pop.widget.render(S());
      /* frames of the floating window drive the visuals while the page's tab is hidden */
      const loop = () => { if (!pop.open) return; if (document.hidden) { try { api.pump(); } catch (e) {} } pop.raf = w.requestAnimationFrame(loop); };
      pop.raf = w.requestAnimationFrame(loop);
      w.addEventListener('pagehide', () => { pop.open = false; pop.win = null; pop.widget = null; placeDock(); renderDesc(); });
    }

    /* ---- video picture-in-picture: a live drawing of the widget ---- */
    async function openVideoPiP() {
      const W = 480, H = 200;
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.className = 'mini-video';
      document.body.append(video);
      pop.canvas = canvas; pop.video = video;
      drawCanvas();
      video.srcObject = canvas.captureStream(30);
      await video.play();
      await video.requestPictureInPicture();
      pop.open = true;
      video.addEventListener('leavepictureinpicture', () => closePopout(), { once: true });
      pop.timer = setInterval(() => { if (document.hidden) { try { api.pump(); } catch (e) {} } drawCanvas(); }, 33);
      const ms = navigator.mediaSession;
      if (ms) {
        const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch (e) {} };
        set('play', () => toggle()); set('pause', () => api.pause());
        set('previoustrack', () => api.setBpm(S().bpm - 1)); set('nexttrack', () => api.setBpm(S().bpm + 1));
        set('seekbackward', () => api.setBpm(S().bpm - 5)); set('seekforward', () => api.setBpm(S().bpm + 5));
        set('stop', () => api.stop());
      }
      syncMedia();
    }
    let vBeat = -1, vFlags = {}, vAt = 0;
    function drawCanvas() {
      const c = pop.canvas; if (!c) return;
      const g = c.getContext('2d'), s = S(), W = c.width, H = c.height;
      const cs = getComputedStyle(document.documentElement);
      const col = (v) => cs.getPropertyValue(v).trim();
      const font = getComputedStyle(document.body).fontFamily;
      g.fillStyle = col('--surface'); g.fillRect(0, 0, W, H);
      g.strokeStyle = col('--line-strong'); g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
      /* time signature and tempo */
      g.fillStyle = col('--muted'); g.font = `500 26px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText(`${s.sig.num}/${s.sig.den}`, 22, 40);
      g.textAlign = 'right'; g.fillStyle = col('--text'); g.font = `300 64px ${font}`;
      g.fillText(String(s.bpm), W - 92, 44);
      g.fillStyle = col('--muted'); g.font = `500 20px ${font}`; g.fillText('BPM', W - 22, 50);
      if (!engine.running) { g.textAlign = 'left'; g.font = `500 18px ${font}`; g.fillText(tr('Stopped'), 22, 76); }
      /* beats */
      const n = R.beatsPerBar(s.sig);
      const gap = Math.min(52, (W - 44) / n), r = Math.min(16, gap * 0.36);
      const x0 = W / 2 - ((n - 1) * gap) / 2, y = 146;
      const fresh = performance.now() - vAt < 2000 && engine.running;
      for (let i = 0; i < n; i++) {
        const lvl = s.accents[i] === undefined ? 1 : s.accents[i];
        const on = fresh && i === vBeat;
        const rr = lvl === 3 ? r : lvl === 2 ? r * 0.86 : lvl === 1 ? r * 0.72 : r * 0.5;
        g.beginPath(); g.arc(x0 + i * gap, y, on ? rr * 1.15 : rr, 0, Math.PI * 2);
        g.fillStyle = on ? (vFlags.countIn ? col('--muted') : vFlags.silent ? col('--faint') : col('--accent')) : col('--surface-2');
        g.fill();
        g.lineWidth = lvl === 3 ? 3 : 2; g.setLineDash(lvl === 0 ? [3, 3] : lvl === 2 ? [5, 3] : []);
        g.strokeStyle = on ? g.fillStyle : lvl >= 2 ? col('--accent') : col('--line-strong'); g.stroke(); g.setLineDash([]);
      }
    }
    function syncMedia() {
      const ms = navigator.mediaSession;
      if (!ms || !pop.video) return;
      try { ms.playbackState = engine.running ? 'playing' : 'paused'; } catch (e) {}
      try { if (root.MediaMetadata) ms.metadata = new MediaMetadata({ title: `${tr('Metronome')} · ${S().bpm} BPM`, artist: `${S().sig.num}/${S().sig.den}` }); } catch (e) {}
    }

    function closePopout() {
      if (pop.win) { try { pop.win.close(); } catch (e) {} }
      if (pop.video) {
        try { if (document.pictureInPictureElement === pop.video) document.exitPictureInPicture(); } catch (e) {}
        try { pop.video.srcObject = null; pop.video.remove(); } catch (e) {}
        const ms = navigator.mediaSession;
        if (ms) for (const a of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'stop']) { try { ms.setActionHandler(a, null); } catch (e) {} }
      }
      clearInterval(pop.timer);
      Object.assign(pop, { open: false, win: null, widget: null, video: null, canvas: null, timer: null });
      placeDock(); renderDesc();
    }

    /* ================= the setting ================= */
    async function setFloating(on) {
      if (on === S().floating && (!on || pop.open)) { if (on) openPopout(); return; }
      store.set({ floating: on });
      if (!on) { closePopout(); return; }
      /* opening a floating window needs the click that switched it on, so it happens here */
      const ok = await openPopout();
      if (!ok && !canPop) toast('This browser can’t float a window over other tabs. The mini metronome appears in the page when you scroll away from the big one.');
    }
    for (const id of ['#floatSw', '#floatSw2']) { const b = document.querySelector(id); if (b) b.addEventListener('click', () => setFloating(!S().floating)); }

    function renderDesc() {
      const d = document.querySelector('#floatDesc');
      if (!d) return;
      d.textContent = canPop
        ? 'A small metronome that floats over your other tabs and apps, and in a corner of the page when you scroll away from the big one.'
        : 'A small metronome in a corner of the page when you scroll away from the big one. This browser can’t float it over other tabs.';
    }
    renderDesc();

    /* ================= keep both copies in step ================= */
    const all = () => [dock, pop.widget].filter(Boolean);
    api.onVisual((ev) => {
      if (ev.type !== 'beat') return;
      for (const w of all()) w.beat(ev);
      vBeat = ev.beat; vFlags = { countIn: ev.countIn, silent: ev.silent }; vAt = performance.now();
    });
    api.onReset(() => { for (const w of all()) w.clear(); vBeat = -1; });
    engine.on((type) => { if (type === 'start' || type === 'stop') { for (const w of all()) { w.sync(); if (type === 'stop' && !engine.running) w.clear(); } syncMedia(); } });
    store.subscribe((s, patch) => {
      if ('floating' in patch) placeDock();
      if (['bpm', 'sig', 'accents', 'maxBpm'].some((k) => k in patch)) { if (!dock.el.hidden) dock.render(s); if (pop.widget) pop.widget.render(s); syncMedia(); }
      if (pop.win && ['theme', 'palette', 'textScale', 'cvd', 'stand', 'leftHanded'].some((k) => k in patch)) syncLook(pop.win.document);
    });
    if (I) I.onChange(() => { for (const w of all()) { w.labels(); w.render(S()); } if (pop.win) syncLook(pop.win.document); renderDesc(); });
    root.addEventListener('pagehide', () => closePopout());

    MN.mini.api = { open: openPopout, close: closePopout, get isOpen() { return pop.open; }, canPop, hasDocPiP, hasVideoPiP, dock };
  }

  MN.mini = { init };
})(window);
