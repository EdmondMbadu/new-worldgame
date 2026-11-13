// The map: land drawn as evenly spaced dots that start on a turning globe and
// open out into Fuller's Dymaxion projection. Everything geographic was
// pre-computed (see scripts/build-geo.mjs), so this file is plain canvas
// drawing with no map library behind it.

const GOLDEN = (137.50776405003785 * Math.PI) / 180;
const SHADES = 9; // colour steps from met (the land's own green) to furthest from met (gold)
const NEUTRAL = SHADES; // before any data has arrived
const NODATA = SHADES + 1; // not measured / no country
const TILT = (-16 * Math.PI) / 180;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createMap(canvas, { onPick, onHover, onView, reducedMotion }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  // The accent colour comes from the page's CSS, so the map can never drift
  // from the rest of the design.
  const css = getComputedStyle(document.documentElement);
  const rgb = (name, fallback) => (css.getPropertyValue(name).trim() || fallback).split(',').map((v) => +v);
  const GOLD = rgb('--accent-rgb', '245, 184, 62');
  const LAND = rgb('--land-rgb', '116, 186, 140'); // where needs are met: the green of living land
  const GROUND = rgb('--ground-rgb', '16, 34, 28'); // the dark earth the dots sit on
  const SEA = rgb('--sea-rgb', '13, 50, 102');
  const SEA_LIT = rgb('--sea-lit-rgb', '46, 112, 190');
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const str = (c, alpha = 1) => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
  const SEA_DEEP = mix(SEA, [3, 8, 20], 0.55);
  const ACCENT = `${GOLD[0]},${GOLD[1]},${GOLD[2]}`;
  let dpr = 1, width = 0, height = 0;
  let geo = null; // map.json
  let n = 0, spacing = 2;
  let ux, uy, uz, mx, my, owner, shade;
  let hasXY = false;
  let net = null, folds = null;
  let seaLayer = null, groundLayer = null, globeLayer = null;
  let grid = null;

  let mode = 'globe'; // globe -> morph -> map
  let appear = 0; // 0..1 fade-in of the dots
  let morph = 0; // 0 globe .. 1 map
  let theta = (-18 * Math.PI) / 180;
  let stage = { x: 0, y: 0, w: 1, h: 1 };
  // view: where base point (cx, cy) sits on screen (ox, oy), at k px per unit.
  const view = { ox: 0, oy: 0, cx: 500, cy: 236, k: 1 };
  let fly = null, morphAnim = null, appearAnim = null, wave = null;
  let lensValues = null, pendingShade = null;
  let selected = 0, hovered = 0, outline = null, outlineFor = 0, glow = 0;
  let raf = 0, last = 0, userMoved = false;
  let quality = 1, slowFrames = 0; // resolution steps down if this device cannot keep up

  const colors = [];
  for (let i = 0; i < SHADES; i++) {
    const t = Math.pow(i / (SHADES - 1), 0.85);
    colors.push(mix(LAND, GOLD, t));
  }
  colors[NEUTRAL] = LAND;
  colors[NODATA] = [126, 136, 150];

  // ---------- data ----------
  function setGeo(json) {
    geo = json;
    net = new Path2D(json.net);
    folds = new Path2D(json.folds);
    view.cy = json.h / 2;
    // The ocean's colour, painted once: brightest mid-map, deepening towards
    // the edges of the sheet. Each frame only stretches this small picture.
    seaLayer = layer(256, Math.round((256 * json.h) / json.w), (g, w, h) => {
      const sea = g.createRadialGradient(w * 0.52, h * 0.5, w * 0.03, w * 0.52, h * 0.5, w * 0.6);
      sea.addColorStop(0, str(mix(SEA, SEA_LIT, 0.34))); sea.addColorStop(0.55, str(SEA)); sea.addColorStop(1, str(mix(SEA, SEA_DEEP, 0.7)));
      g.fillStyle = sea; g.fillRect(0, 0, w, h);
    });
  }
  function layer(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    paint(c.getContext('2d'), c.width, c.height);
    return c;
  }
  /** Dark earth under the dots, so land reads as land and the sea never shows
   *  through it. Painted once from the dot positions, then reused every frame. */
  function paintGround() {
    const scale = Math.min(2400, geo.w * (n > 15000 ? 2.4 : 1.5)) / geo.w, r = 0.62 * spacing * scale;
    groundLayer = layer(geo.w * scale, geo.h * scale, (g) => {
      g.fillStyle = str(GROUND);
      g.beginPath();
      for (let i = 0; i < n; i++) { const x = mx[i] * scale, y = my[i] * scale; g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); }
      g.fill();
    });
  }
  /** The globe's ocean and its thin blue atmosphere, lit from the upper left. */
  function globeSprite(R) {
    if (globeLayer && globeLayer.R === R && globeLayer.dpr === dpr) return globeLayer;
    const half = R * 1.18;
    const canvas = layer(half * 2 * dpr, half * 2 * dpr, (g) => {
      g.scale(dpr, dpr); g.translate(half, half);
      const air = g.createRadialGradient(0, 0, R * 0.96, 0, 0, R * 1.16);
      air.addColorStop(0, str(SEA_LIT, 0.42)); air.addColorStop(1, str(SEA_LIT, 0));
      g.fillStyle = air; g.beginPath(); g.arc(0, 0, R * 1.16, 0, 6.2832); g.fill();
      const sea = g.createRadialGradient(-R * 0.38, -R * 0.42, R * 0.06, -R * 0.1, -R * 0.1, R * 1.12);
      sea.addColorStop(0, str(SEA_LIT)); sea.addColorStop(0.5, str(SEA)); sea.addColorStop(1, str(SEA_DEEP));
      g.fillStyle = sea; g.beginPath(); g.arc(0, 0, R, 0, 6.2832); g.fill();
      g.strokeStyle = str(mix(SEA_LIT, [255, 255, 255], 0.35), 0.55); g.lineWidth = 1; g.stroke();
    });
    return (globeLayer = { canvas, R, dpr, half });
  }

  /** land.bin = a bit per lattice point (is it land?) then one owner byte per land dot. */
  function setLand(buffer, set) {
    const N = set.n, bytes = new Uint8Array(buffer), maskLen = Math.ceil(N / 8);
    n = set.land + set.extra.length;
    ux = new Float32Array(n); uy = new Float32Array(n); uz = new Float32Array(n);
    mx = new Float32Array(n); my = new Float32Array(n);
    owner = new Uint8Array(n); shade = new Uint8Array(n).fill(NEUTRAL);
    let k = 0;
    const put = (lon, lat, who) => {
      const c = Math.cos(lat);
      ux[k] = c * Math.sin(lon); uy[k] = Math.sin(lat); uz[k] = c * Math.cos(lon);
      owner[k++] = who;
    };
    for (let i = 0; i < N; i++) {
      if (!(bytes[i >> 3] & (1 << (i & 7)))) continue;
      const lat = Math.asin(1 - (2 * (i + 0.5)) / N);
      put(((i * GOLDEN) % (2 * Math.PI)) - Math.PI, lat, bytes[maskLen + k]);
    }
    for (const [who, x, y, lon, lat] of set.extra) {
      mx[k] = x; my[k] = y;
      put((lon * Math.PI) / 180, (lat * Math.PI) / 180, who);
    }
    spacing = Math.sqrt(286300 / N);
    if (lensValues) applyLens(false);
    start(appearAnim = { t0: performance.now(), d: reducedMotion ? 1 : 900 });
  }

  function setXY(buffer, set) {
    const xy = new Uint16Array(buffer);
    for (let i = 0; i < set.land; i++) {
      mx[i] = (xy[2 * i] / 65535) * geo.w;
      my[i] = (xy[2 * i + 1] / 65535) * geo.w;
    }
    // A coarse grid over the map so a click can find its nearest dot at once.
    const cell = 6, cols = Math.ceil(geo.w / cell) + 1, rows = Math.ceil(geo.h / cell) + 1;
    const head = new Int32Array(cols * rows).fill(-1), next = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const c = Math.floor(my[i] / cell) * cols + Math.floor(mx[i] / cell);
      next[i] = head[c]; head[c] = i;
    }
    grid = { cell, cols, rows, head, next };
    paintGround();
    hasXY = true;
    start();
  }

  // ---------- colour ----------
  function shadeOf(who) {
    if (!lensValues) return NEUTRAL;
    const v = lensValues[who];
    return who === 0 || v == null || Number.isNaN(v) ? NODATA : Math.round(clamp(v, 0, 1) * (SHADES - 1));
  }
  function applyLens(sweep) {
    if (!n) return;
    const target = new Uint8Array(n);
    for (let i = 0; i < n; i++) target[i] = shadeOf(owner[i]);
    if (!sweep || reducedMotion) { shade = target; wave = null; return start(); }
    pendingShade = target;
    start(wave = { t0: performance.now(), d: 900 });
  }
  /** values: array indexed like geo.countries (1-based), 0..1 or null. */
  function setLens(values, sweep = true) {
    lensValues = values;
    applyLens(sweep);
  }

  // ---------- geometry ----------
  const homeScale = () => Math.min(stage.w / geo.w, stage.h / geo.h) * 0.985;
  const home = () => ({ ox: stage.x + stage.w / 2, oy: stage.y + stage.h / 2, cx: geo.w / 2, cy: geo.h / 2, k: homeScale() });
  function frameView(f) {
    const k0 = homeScale();
    const fw = Math.max(f[2] - f[0], 6), fh = Math.max(f[3] - f[1], 6);
    const k = clamp(Math.min(stage.w / (fw * 1.75), stage.h / (fh * 1.75)), k0 * 1.2, k0 * 11);
    return { ox: stage.x + stage.w / 2, oy: stage.y + stage.h / 2, cx: (f[0] + f[2]) / 2, cy: (f[1] + f[3]) / 2, k };
  }
  const targetView = () => (selected && geo ? frameView(geo.countries[selected - 1].frame) : home());

  function flyTo(to, duration = 1250) {
    if (reducedMotion || mode !== 'map') { Object.assign(view, to); fly = null; onView?.(); return start(); }
    const from = { ...view };
    const travel = Math.hypot(to.cx - from.cx, to.cy - from.cy) * Math.min(from.k, to.k);
    const hop = clamp(travel / Math.max(stage.w, 1) - 0.25, 0, 0.42); // pull back a little on long journeys
    start(fly = { from, to, hop, t0: performance.now(), d: duration });
  }

  function setStage(rect, animate) {
    stage = rect;
    if (!geo) return;
    userMoved = false;
    if (animate && mode === 'map') flyTo(targetView());
    else { fly = null; Object.assign(view, targetView()); onView?.(); start(); }
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    width = box.width; height = box.height;
    // Sharp on retina screens, but never more than ~3.4 million pixels to repaint per frame.
    dpr = Math.min(window.devicePixelRatio || 1, 2, Math.max(1, Math.sqrt(3.4e6 / Math.max(1, width * height)))) * quality;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    start();
  }

  // ---------- selection ----------
  /** Marks a country as chosen. The camera follows on the next setStage(). */
  function select(index, outlinePath) {
    selected = index || 0;
    outline = null; outlineFor = 0;
    if (selected && outlinePath) setOutline(selected, outlinePath);
    userMoved = false;
    glow = performance.now();
    start();
  }
  function setOutline(index, d) {
    if (index !== selected) return;
    outline = new Path2D(d); outlineFor = index;
    start();
  }

  // ---------- the unfold ----------
  function unfold() {
    if (mode !== 'globe' || !hasXY) return false;
    Object.assign(view, targetView());
    if (reducedMotion) { mode = 'map'; morph = 1; onView?.(); start(); return true; }
    mode = 'morph';
    start(morphAnim = { t0: performance.now(), d: 2100 });
    return true;
  }
  function showMap() {
    if (!hasXY) return false;
    mode = 'map'; morph = 1; morphAnim = null;
    Object.assign(view, targetView()); onView?.();
    start();
    return true;
  }

  // ---------- drawing ----------
  const buckets = new Map();
  function push(key, x, y) {
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = []));
    b.push(x, y);
  }

  function draw(now) {
    raf = 0;
    const dt = Math.min(64, now - (last || now)); last = now;
    let busy = false;

    if (appearAnim) { appear = clamp((now - appearAnim.t0) / appearAnim.d, 0, 1); if (appear >= 1) appearAnim = null; else busy = true; }
    if (mode === 'globe' && !reducedMotion) { theta += dt * 0.00011; busy = true; }
    if (morphAnim) {
      morph = clamp((now - morphAnim.t0) / morphAnim.d, 0, 1);
      if (morph >= 1) { morphAnim = null; mode = 'map'; onView?.(); } else busy = true;
    }
    if (fly) {
      const t = clamp((now - fly.t0) / fly.d, 0, 1), e = ease(t), { from, to, hop } = fly;
      view.ox = from.ox + (to.ox - from.ox) * e; view.oy = from.oy + (to.oy - from.oy) * e;
      view.cx = from.cx + (to.cx - from.cx) * e; view.cy = from.cy + (to.cy - from.cy) * e;
      view.k = Math.exp(Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * e) * (1 - hop * Math.sin(Math.PI * t));
      if (t >= 1) fly = null; else busy = true;
      onView?.();
    }
    let sweep = 1;
    if (wave) {
      sweep = clamp((now - wave.t0) / wave.d, 0, 1);
      if (sweep >= 1) { shade = pendingShade; pendingShade = null; wave = null; } else busy = true;
    }
    const glowT = clamp((now - glow) / 1400, 0, 1);
    if (selected && glowT < 1) busy = true;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#08090b';
    ctx.fillRect(0, 0, width, height);
    if (!geo) return;

    const { ox, oy, cx, cy, k } = view;
    const k0 = homeScale();
    const mapAlpha = mode === 'globe' ? 0 : Math.pow(morph, 3);

    // The unfolded icosahedron: its silhouette and fold lines.
    if (mapAlpha > 0.01) {
      ctx.save();
      ctx.translate(ox - cx * k, oy - cy * k); ctx.scale(k, k);
      ctx.globalAlpha = mapAlpha;
      ctx.save(); ctx.clip(net); ctx.drawImage(seaLayer, 0, 0, geo.w, geo.h); ctx.restore();
      if (groundLayer) ctx.drawImage(groundLayer, 0, 0, geo.w, geo.h);
      ctx.lineWidth = 0.7 / k; ctx.strokeStyle = 'rgba(170,208,255,0.09)'; ctx.stroke(folds);
      ctx.lineWidth = 1 / k; ctx.strokeStyle = 'rgba(150,198,255,0.4)'; ctx.stroke(net);
      ctx.restore();
    }

    // Globe: centre and radius sit inside the stage.
    const gx = stage.x + stage.w / 2, gy = stage.y + stage.h / 2;
    const R = Math.min(stage.w * 0.36, stage.h * 0.46, 330);
    if (mode !== 'map' && morph < 0.6) {
      const a = (1 - ease(Math.min(1, morph * 1.7))) * appear;
      const sprite = globeSprite(R);
      ctx.globalAlpha = a;
      ctx.drawImage(sprite.canvas, gx - sprite.half, gy - sprite.half, sprite.half * 2, sprite.half * 2);
      ctx.globalAlpha = 1;
    }

    // Dots.
    buckets.clear();
    const ct = Math.cos(theta), st = Math.sin(theta), cT = Math.cos(TILT), sT = Math.sin(TILT);
    const tx = ox - cx * k, ty = oy - cy * k;
    const reach = Math.hypot(geo.w, geo.h) * k * 0.5 || 1;
    const dim = selected ? 0.34 + 0.66 * (1 - ease(glowT)) : 1;
    const pad = 4;
    for (let i = 0; i < n; i++) {
      let x, y, a = 1;
      const px = tx + mx[i] * k, py = ty + my[i] * k;
      if (mode === 'map') { x = px; y = py; }
      else {
        const X = ux[i] * ct + uz[i] * st, Z0 = -ux[i] * st + uz[i] * ct;
        const Y = uy[i] * cT - Z0 * sT, Z = uy[i] * sT + Z0 * cT;
        const sx = gx + X * R, sy = gy - Y * R;
        const front = Z > 0 ? 0.28 + 0.72 * Math.min(1, Z * 1.6) : 0;
        if (mode === 'globe') { if (Z <= 0) continue; x = sx; y = sy; a = front; }
        else {
          // Dots nearest the globe leave first, so it opens from the middle out.
          const lag = Math.min(1, Math.hypot(px - gx, py - gy) / reach) * 0.42;
          const e = ease(clamp((morph * 1.42 - lag) / 1, 0, 1));
          x = sx + (px - sx) * e; y = sy + (py - sy) * e; a = front + (1 - front) * e;
        }
      }
      if (x < -pad || y < -pad || x > width + pad || y > height + pad) continue;
      let s = shade[i];
      if (wave && pendingShade && (mode === 'map' ? mx[i] / geo.w : 0.5 - uy[i] / 2) < sweep * 1.15 - 0.075) s = pendingShade[i];
      const who = owner[i];
      const mine = selected && who === selected, hot = hovered && who === hovered && !mine;
      if (selected && !mine) a *= hot ? Math.max(dim, 0.7) : dim;
      const level = a > 0.82 ? 3 : a > 0.55 ? 2 : a > 0.3 ? 1 : a > 0.08 ? 0 : -1;
      if (level < 0) continue;
      push((s << 4) | (level << 1) | (mine || hot ? 1 : 0), x, y);
    }
    const zoom = mode === 'map' ? k / k0 : 1;
    const mapR = clamp(spacing * k0 * 0.4 * Math.pow(zoom, 0.62), 0.55, 9);
    // On the globe the dots nearly touch, so land looks solid without an earth layer.
    const globeR = clamp(spacing * (R / 149) * 0.45, 0.7, 3.2); // 149 px is the globe radius at the map's own scale
    const baseR = mode === 'map' ? mapR : globeR + (mapR - globeR) * ease(morph);
    const ALPHA = [0.2, 0.32, 0.68, 0.94];
    let shown = 0;
    for (const pts of buckets.values()) shown += pts.length;
    const round = shown < 12000; // true circles once few enough dots are in view to afford them
    for (const [key, pts] of buckets) {
      const s = key >> 4, level = (key >> 1) & 3, big = key & 1;
      const c = colors[s];
      const alpha = ALPHA[level] * appear * (s === NODATA ? 0.5 : s === NEUTRAL || s === 0 ? 0.8 : 1);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
      const r = baseR * (big ? 1.22 : 1);
      ctx.beginPath();
      if (!round || r * dpr < 1.7) for (let j = 0; j < pts.length; j += 2) ctx.rect(pts[j] - r, pts[j + 1] - r, 2 * r, 2 * r);
      else for (let j = 0; j < pts.length; j += 2) { ctx.moveTo(pts[j] + r, pts[j + 1]); ctx.arc(pts[j], pts[j + 1], r, 0, 6.2832); }
      ctx.fill();
    }

    // The chosen country's true outline.
    if (mode === 'map' && selected && outline && outlineFor === selected) {
      ctx.save();
      ctx.translate(tx, ty); ctx.scale(k, k);
      ctx.globalAlpha = ease(glowT);
      ctx.lineJoin = 'round';
      ctx.fillStyle = `rgba(${ACCENT},0.07)`; ctx.fill(outline, 'evenodd');
      ctx.lineWidth = 1.15 / k; ctx.strokeStyle = `rgba(${ACCENT},0.95)`; ctx.stroke(outline);
      ctx.restore();
    }
    if (busy) {
      slowFrames = dt > 36 ? slowFrames + 1 : 0;
      if (slowFrames > 14 && quality > 0.55) { quality -= 0.2; slowFrames = 0; resize(); }
      start();
    }
  }
  function start() { if (!raf) raf = requestAnimationFrame(draw); }

  // ---------- picking ----------
  function dotAt(sx, sy, radius = 11) {
    if (!grid || mode !== 'map') return -1;
    const bx = view.cx + (sx - view.ox) / view.k, by = view.cy + (sy - view.oy) / view.k;
    const r = Math.max(radius / view.k, 1.2), { cell, cols, rows, head, next } = grid;
    let best = -1, bestD = r * r;
    for (let gy = Math.max(0, Math.floor((by - r) / cell)); gy <= Math.min(rows - 1, Math.floor((by + r) / cell)); gy++)
      for (let gx = Math.max(0, Math.floor((bx - r) / cell)); gx <= Math.min(cols - 1, Math.floor((bx + r) / cell)); gx++)
        for (let i = head[gy * cols + gx]; i >= 0; i = next[i]) {
          const d = (mx[i] - bx) ** 2 + (my[i] - by) ** 2;
          if (d < bestD && owner[i]) { bestD = d; best = i; }
        }
    return best;
  }
  /** The land dot closest to a longitude/latitude, optionally within one country. */
  function nearestDot(lon, lat, within = 0) {
    const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
    const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
    let best = -1, bestD = -2;
    for (let i = 0; i < n; i++) {
      if (!owner[i] || (within && owner[i] !== within)) continue;
      const d = ux[i] * x + uy[i] * y + uz[i] * z;
      if (d > bestD) { bestD = d; best = i; }
    }
    return best < 0 ? null : { owner: owner[best], x: mx[best], y: my[best], degrees: (Math.acos(clamp(bestD, -1, 1)) * 180) / Math.PI };
  }
  const toScreen = (x, y) => [view.ox + (x - view.cx) * view.k, view.oy + (y - view.cy) * view.k];

  // ---------- pointer ----------
  let drag = null;
  const local = (e) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    if (drag) {
      if (!drag.pan) return; // a finger scrolls the page; only a tap picks
      if (!drag.moved && Math.hypot(x - drag.x, y - drag.y) < 5) return;
      drag.moved = true; userMoved = true; fly = null;
      view.ox = drag.ox + (x - drag.x); view.oy = drag.oy + (y - drag.y);
      canvas.style.cursor = 'grabbing';
      onView?.(); return start();
    }
    if (e.pointerType === 'touch') return;
    const i = dotAt(x, y);
    const who = i < 0 ? 0 : owner[i];
    canvas.style.cursor = who ? 'pointer' : mode === 'map' ? 'grab' : 'default';
    if (who !== hovered) { hovered = who; start(); }
    onHover?.(who, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', () => { if (hovered) { hovered = 0; start(); } onHover?.(0, 0, 0); });
  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'map' || e.button) return;
    const [x, y] = local(e);
    drag = { x, y, ox: view.ox, oy: view.oy, moved: false, pan: e.pointerType !== 'touch' };
    if (drag.pan) canvas.setPointerCapture(e.pointerId);
  });
  const release = (e) => {
    if (!drag) return;
    const [x, y] = local(e), was = drag; drag = null;
    canvas.style.cursor = '';
    if (was.moved && was.pan) return;
    if (Math.hypot(x - was.x, y - was.y) > 8) return;
    const i = dotAt(x, y, e.pointerType === 'touch' ? 20 : 11);
    onPick?.(i < 0 ? 0 : owner[i]);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    if (mode !== 'map' || !geo) return;
    e.preventDefault();
    const [x, y] = local(e), k0 = homeScale();
    const k = clamp(view.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016)), k0 * 0.8, k0 * 16);
    // Keep the point under the cursor where it is.
    const bx = view.cx + (x - view.ox) / view.k, by = view.cy + (y - view.oy) / view.k;
    view.k = k; view.ox = x - (bx - view.cx) * k; view.oy = y - (by - view.cy) * k;
    fly = null; userMoved = true;
    onView?.(); start();
  }, { passive: false });

  resize();
  return {
    setGeo, setLand, setXY, setLens, setStage, resize, select, setOutline, unfold, showMap, nearestDot, toScreen,
    recentre: () => { userMoved = false; flyTo(targetView(), 900); },
    get mode() { return mode; },
    get ready() { return hasXY; },
    get moved() { return userMoved; },
  };
}
