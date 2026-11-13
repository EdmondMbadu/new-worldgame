// Pre-computes everything geographic so the page needs no map library at
// run time: the dotted land (as positions on Fuller's Dymaxion map), which
// country each dot belongs to, each country's outline, and the unfolded
// icosahedron itself.
//
//   node unmet/scripts/build-geo.mjs
//
// Run it again only if the country shapes or the dot counts change. The
// output in unmet/data/geo is committed, so normal builds never run this.
import { geoPath, geoBounds, geoContains, geoArea, geoCentroid } from 'd3-geo';
import { geoAirocean } from 'd3-geo-polygon';
import { feature } from 'topojson-client';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = path.join(root, 'unmet/data/geo');
const W = 1000;
// Two densities: a phone cannot show (or afford) as many dots as a desktop.
const SETS = { l: 84000, s: 30000 };
const GOLDEN = 137.50776405003785;

const world = JSON.parse(readFileSync(path.join(root, 'src/assets/maps/countries-50m.json'), 'utf8'));
const ref = JSON.parse(readFileSync(path.join(root, 'unmet/data/countries-ref.json'), 'utf8'));
const byNumeric = new Map(ref.map((c) => [c.n3, c]));
const features = feature(world, world.objects.countries).features;

// ---- projection: Fuller's layout, turned the familiar way up ----
const projection = geoAirocean().fitWidth(W, { type: 'Sphere' });
const raw = geoPath(projection);
const [[, top], [, bottom]] = raw.bounds({ type: 'Sphere' });
const H = bottom - top;
const place = (lon, lat) => {
  const p = projection([lon, lat]);
  return p ? [W - p[0], H - (p[1] - top)] : null;
};
const r2 = (v) => Math.round(v * 100) / 100;
/** d3 path string -> the same path in our flipped base space, thinned. */
function basePath(d) {
  if (!d) return '';
  let res = '', last = null;
  for (const m of d.matchAll(/([MLZ])\s*(?:(-?[\d.]+(?:e-?\d+)?)[ ,](-?[\d.]+(?:e-?\d+)?))?/g)) {
    if (m[1] === 'Z') { res += 'Z'; last = null; continue; }
    const x = W - +m[2], y = H - (+m[3] - top);
    if (m[1] === 'L' && last && Math.abs(x - last[0]) < 0.06 && Math.abs(y - last[1]) < 0.06) continue;
    res += m[1] + r2(x) + ' ' + r2(y);
    last = [x, y];
  }
  return res;
}
function pathBounds(d) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const m of d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
    const x = +m[1], y = +m[2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

// ---- countries ----
const KOSOVO = { a3: 'XKX', a2: 'XK', name: 'Kosovo' };
const refOf = (f) => byNumeric.get(String(f.id ?? '').padStart(3, '0')) || (f.properties.name === 'Kosovo' ? KOSOVO : null);
// Disputed or unassigned areas (no ISO code of their own) stay on the map as
// land, but belong to no country here: we have no data for them.
const claimed = new Set();
const known = features.filter((f) => {
  const r = refOf(f);
  if (!r || claimed.has(r.a3)) return false;
  claimed.add(r.a3);
  return true;
});
const unassigned = features.filter((f) => !known.includes(f)).map((f) => ({ i: 0, f, bounds: geoBounds(f) }));
const countries = known.map((f, i) => {
  const r = refOf(f);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const parts = polys
    .map((coordinates) => ({ type: 'Polygon', coordinates }))
    .map((g) => ({ g, area: geoArea(g), c: geoCentroid(g) }))
    .sort((a, b) => b.area - a.area);
  const main = parts[0];
  const mc = place(main.c[0], main.c[1]) || [W / 2, H / 2];
  const mainD = basePath(raw(main.g));
  const mb = pathBounds(mainD);
  const reach = Math.max(20, 0.9 * Math.sqrt((mb[2] - mb[0]) * (mb[3] - mb[1])));
  // Frame the country on its mainland plus whatever sits close to it, so a
  // distant territory does not shrink the country to a speck when we zoom.
  const frame = [...mb];
  for (const p of parts.slice(1)) {
    const c = place(p.c[0], p.c[1]);
    if (!c) continue;
    const far = Math.hypot(c[0] - mc[0], c[1] - mc[1]);
    // Keep nearby pieces, and large ones a little further out (islands of an
    // archipelago); drop distant territories.
    if (!(far < reach || (p.area >= 0.08 * main.area && far < 140))) continue;
    const b = pathBounds(basePath(raw(p.g)));
    if (!isFinite(b[0])) continue;
    frame[0] = Math.min(frame[0], b[0]); frame[1] = Math.min(frame[1], b[1]);
    frame[2] = Math.max(frame[2], b[2]); frame[3] = Math.max(frame[3], b[3]);
  }
  return {
    i: i + 1,
    f,
    bounds: geoBounds(f),
    id: r.a3,
    a2: r.a2,
    name: r.name,
    capital: r.capital || '',
    lon: +main.c[0].toFixed(2),
    lat: +main.c[1].toFixed(2),
    c: mc.map(r2),
    frame: frame.map(r2),
    outline: basePath(raw(f)),
  };
});

function countryAt(lon, lat) {
  for (const c of [...countries, ...unassigned]) {
    const [[w, s], [e, n]] = c.bounds;
    if (lat < s || lat > n) continue;
    if (w <= e ? lon < w || lon > e : lon < w && lon > e) continue;
    if (geoContains(c.f, [lon, lat])) return c;
  }
  return null;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// ---- dots: an even (Fibonacci) lattice over the sphere, land only ----
const sets = {};
for (const [key, N] of Object.entries(SETS)) {
  const mask = new Uint8Array(Math.ceil(N / 8));
  const owner = [], xy = [];
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const lat = (Math.asin(1 - (2 * (i + 0.5)) / N) * 180) / Math.PI;
    const lon = ((i * GOLDEN) % 360) - 180;
    const c = countryAt(lon, lat);
    if (!c) continue;
    const p = place(lon, lat);
    if (!p) continue;
    mask[i >> 3] |= 1 << (i & 7);
    owner.push(c.i);
    xy.push(Math.round((p[0] / W) * 65535), Math.round((p[1] / W) * 65535));
    if (c.i) seen.add(c.i);
  }
  // Countries too small to catch a lattice point still get one dot, so
  // every country can be seen and clicked.
  const extra = [];
  for (const c of countries) {
    if (seen.has(c.i)) continue;
    extra.push([c.i, c.c[0], c.c[1], c.lon, c.lat]);
  }
  writeFileSync(path.join(out, `dots-${key}.land.bin`), Buffer.concat([Buffer.from(mask), Buffer.from(Uint8Array.from(owner))]));
  writeFileSync(path.join(out, `dots-${key}.xy.bin`), Buffer.from(Uint16Array.from(xy).buffer));
  sets[key] = { n: N, land: owner.length, extra };
  console.log(`dots-${key}: ${N} lattice points, ${owner.length} on land, ${extra.length} single-dot countries`);
}

// ---- the unfolded icosahedron: outline, and the fold lines inside it ----
const net = basePath(raw({ type: 'Sphere' }));
const corners = [...net.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
const inside = (x, y) => {
  let hit = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const [xi, yi] = corners[i], [xj, yj] = corners[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};
// Faces are equilateral triangles 1/5.5 of the map's width on a side.
const side = W / 5.5, rise = (side * Math.sqrt(3)) / 2;
let folds = '';
for (let row = 0; row <= 3; row++) {
  for (let k = -2; k <= 13; k++) {
    const x = k * (side / 2), y = row * rise;
    const ends = [[x + side, y], [x + side / 2, y + rise], [x - side / 2, y + rise]];
    for (const [ex, ey] of ends) {
      if ((k + row) % 2 !== 0) continue;
      const probes = [0.25, 0.5, 0.75].map((t) => [x + (ex - x) * t, y + (ey - y) * t]);
      // Keep an edge only where the map continues on both sides of it.
      const ok = probes.every(([px, py]) => {
        const nx = -(ey - y) / side, ny = (ex - x) / side;
        return inside(px + nx * 2, py + ny * 2) && inside(px - nx * 2, py - ny * 2);
      });
      if (ok) folds += `M${r2(x)} ${r2(y)}L${r2(ex)} ${r2(ey)}`;
    }
  }
}

// One pack in the repo; the build splits it into a small file per country so
// the page only downloads the outline it is about to draw.
writeFileSync(path.join(out, 'outlines.json'), JSON.stringify(Object.fromEntries(countries.map((c) => [c.id, c.outline]))));
writeFileSync(
  path.join(out, 'map.json'),
  JSON.stringify({
    w: W,
    h: r2(H),
    net,
    folds,
    sets,
    countries: countries.map(({ id, a2, name, capital, lon, lat, c, frame }) => ({ id, a2, name, capital, lon, lat, c, frame })),
  }),
);
console.log(`map.json: ${countries.length} countries, map ${W} x ${r2(H)}`);
