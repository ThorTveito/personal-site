(async function () {
  const stage = document.getElementById('stage');
  const scene = document.getElementById('scene');
  const captionEl = document.getElementById('caption');
  const viewer = document.getElementById('viewer');
  const viewerImg = document.getElementById('viewer-img');
  const viewerCap = document.getElementById('viewer-cap');

  let data;
  try {
    data = await (await fetch('photos.json', { cache: 'no-cache' })).json();
  } catch (e) {
    document.getElementById('loader').classList.add('done');
    captionEl.textContent = 'Fant ikke photos.json. Kjør: node scripts/build-photos.mjs';
    return;
  }
  document.getElementById('site-name').textContent = data.name || '';
  document.title = data.name || 'Bilder';
  const photos = data.photos || [];

  // Last bildene først, så vi kjenner sideforholdet.
  const loader = document.getElementById('loader');
  const fill = document.getElementById('loader-fill');
  const text = document.getElementById('loader-text');
  document.getElementById('loader-name').textContent = data.name || '';
  let count = 0;
  const tick = () => {
    count++;
    fill.style.width = (photos.length ? (count / photos.length) * 100 : 100) + '%';
    text.textContent = `Laster bilder ${count} / ${photos.length}`;
  };
  const loaded = await Promise.all(photos.map((p) => new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => { tick(); resolve(null); }, 15000); // gi opp på trege bilder
    const done = () => { clearTimeout(timer); tick(); resolve({ ...p, ratio: img.naturalHeight / img.naturalWidth || 1 }); };
    img.onload = () => { (img.decode ? img.decode() : Promise.resolve()).then(done, done); };
    img.onerror = () => { clearTimeout(timer); tick(); resolve(null); };
    img.src = p.thumb || p.src;
  })));
  const items = loaded.filter(Boolean);

  // Plasser bildene i et dypt rutenett. Utgangspunktet er nytt for hver innlasting,
  // så bildene havner på nye steder hver gang.
  let seed = 1 + Math.floor(Math.random() * 233279);
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const spread = Math.max(1, Math.sqrt(items.length / 28));
  const nodes = [];
  items.forEach((p, i) => {
    const w = Math.round(120 + rnd() * 240);
    const h = Math.round(w * Math.min(Math.max(p.ratio, 0.5), 1.8));
    const x = Math.round((rnd() - 0.5) * 1700 * spread);
    const y = Math.round((rnd() - 0.5) * 1000 * spread);
    const z = Math.round(-700 + rnd() * 1000);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'photo';
    el.setAttribute('aria-label', p.title || 'Bilde ' + (i + 1));
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.marginLeft = -w / 2 + 'px';
    el.style.marginTop = -h / 2 + 'px';
    el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
    const img = document.createElement('img');
    img.src = p.thumb || p.src; img.alt = ''; img.draggable = false;
    el.appendChild(img);
    el.addEventListener('mouseenter', () => { captionEl.textContent = p.title; });
    el.addEventListener('mouseleave', () => { captionEl.textContent = ''; });
    el.addEventListener('focus', () => { captionEl.textContent = p.title; });
    el.addEventListener('blur', () => { captionEl.textContent = ''; });
    el.addEventListener('click', () => { if (!moved) openViewer(i); });
    scene.appendChild(el);
    nodes.push({ el, img, p, x, y, z, w, h, up: false, shown: true });
  });

  requestAnimationFrame(() => {
    scene.classList.add('ready');
    loader.classList.add('done');
  });

  // Kamera: dra for å flytte deg, hjulet (og knappene) zoomer, musa gir litt parallakse.
  const Z_MIN = -3200, Z_MAX = 1500, PERSPECTIVE = 900;
  const limit = 1100 * spread;
  const cam = { fx: 0, fy: 0, tx: 0, ty: 0, z: 0, tz: 0, x: 0, y: 0, px: 0, py: 0 };
  const clampZ = (v) => Math.max(Z_MIN, Math.min(Z_MAX, v));
  const clampP = (v) => Math.max(-limit, Math.min(limit, v));
  let dragging = false, moved = false, lastX = 0, lastY = 0, downX = 0, downY = 0;

  stage.addEventListener('pointermove', (e) => {
    if (dragging) {
      // Skaler draget etter zoomnivå, så scenen følger pekeren.
      const scale = PERSPECTIVE / (PERSPECTIVE - cam.z);
      cam.px = clampP(cam.px + (e.clientX - lastX) / scale);
      cam.py = clampP(cam.py + (e.clientY - lastY) / scale);
      kick();
      lastX = e.clientX; lastY = e.clientY;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
    } else if (e.pointerType === 'mouse') {
      cam.tx = e.clientX / innerWidth - 0.5;
      cam.ty = e.clientY / innerHeight - 0.5;
      kick();
    }
  });
  // Hindre nettleserens egen bildedra og tekstmarkering.
  stage.addEventListener('dragstart', (e) => e.preventDefault());
  stage.addEventListener('selectstart', (e) => e.preventDefault());
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    dragging = true; moved = false;
    lastX = downX = e.clientX; lastY = downY = e.clientY;
    stage.classList.add('dragging');
  });
  const end = () => { dragging = false; stage.classList.remove('dragging'); setTimeout(() => { moved = false; }, 0); };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  stage.addEventListener('wheel', (e) => { e.preventDefault(); cam.tz = clampZ(cam.tz - e.deltaY * 1.4); kick(); }, { passive: false });
  document.getElementById('zoom-in').addEventListener('click', () => { cam.tz = clampZ(cam.tz + 300); kick(); });
  document.getElementById('zoom-out').addEventListener('click', () => { cam.tz = clampZ(cam.tz - 300); kick(); });
  addEventListener('keydown', (e) => {
    if (viewer.open) return;
    const step = 120 / (PERSPECTIVE / (PERSPECTIVE - cam.z));
    if (e.key === 'ArrowLeft') cam.px = clampP(cam.px + step);
    else if (e.key === 'ArrowRight') cam.px = clampP(cam.px - step);
    else if (e.key === 'ArrowUp') cam.py = clampP(cam.py + step);
    else if (e.key === 'ArrowDown') cam.py = clampP(cam.py - step);
    else if (e.key === '+' || e.key === '=') cam.tz = clampZ(cam.tz + 300);
    else if (e.key === '-') cam.tz = clampZ(cam.tz - 300);
    else return;
    kick();
  });

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false;
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  // Skjul bilder utenfor skjermen eller bak kameraet, og last full oppløsning på de som er store på skjermen.
  function cull(X, Y) {
    const hw = innerWidth / 2 + 200, hh = innerHeight / 2 + 200;
    for (const n of nodes) {
      const dz = n.z + cam.z;
      let show = false, s = 0;
      if (dz < 860) {
        s = PERSPECTIVE / (PERSPECTIVE - dz);
        const sx = (n.x + X) * s, sy = (n.y + Y) * s;
        show = Math.abs(sx) - n.w * s / 2 < hw && Math.abs(sy) - n.h * s / 2 < hh;
      }
      if (show !== n.shown) { n.el.style.display = show ? '' : 'none'; n.shown = show; }
      if (show && !n.up && n.p.thumb && s * n.w > 480) {
        n.up = true;
        const full = new Image();
        full.src = n.p.src;
        (full.decode ? full.decode() : Promise.resolve()).then(() => { n.img.src = n.p.src; }, () => {});
      }
    }
  }

  function frame() {
    const k = still ? 1 : 0.14;
    cam.fx += (cam.tx - cam.fx) * k;
    cam.fy += (cam.ty - cam.fy) * k;
    cam.z += (cam.tz - cam.z) * k;
    cam.x += (cam.px - cam.x) * k;
    cam.y += (cam.py - cam.y) * k;
    // Musa gir bare litt parallakse, og mindre jo lenger inn du er (ellers hopper bildene).
    const zoomScale = Math.max(1, PERSPECTIVE / (PERSPECTIVE - cam.z));
    const x = cam.x - (cam.fx * 160) / zoomScale, y = cam.y - (cam.fy * 110) / zoomScale;
    scene.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${cam.z.toFixed(1)}px)`;
    cull(x, y);
    const moving = Math.abs(cam.tx - cam.fx) + Math.abs(cam.ty - cam.fy) > 0.0005
      || Math.abs(cam.tz - cam.z) > 0.3 || Math.abs(cam.px - cam.x) > 0.3 || Math.abs(cam.py - cam.y) > 0.3;
    if (moving) requestAnimationFrame(frame); else running = false;
  }
  addEventListener('resize', kick);
  kick();

  // Visning av ett bilde.
  let current = 0;
  function show(i) {
    current = (i + items.length) % items.length;
    viewerImg.src = items[current].src;
    viewerImg.alt = items[current].title || 'Bilde ' + (current + 1);
    viewerCap.textContent = items[current].title;
  }
  function openViewer(i) { show(i); if (!viewer.open) viewer.showModal(); }
  viewer.querySelector('.close').addEventListener('click', () => viewer.close());
  viewer.querySelector('.prev').addEventListener('click', () => show(current - 1));
  viewer.querySelector('.next').addEventListener('click', () => show(current + 1));
  viewer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();
