import { heightAt, perStation, roadX, routeX, smooth, type Mission } from './missions';

/** Switchback centres in effect: a straightened test road has none. */
export const pivots = (m: Mission) => (m.bend === 0 ? [] : m.ridges);
/** Route coordinates are stable stations, not world Z. A radius-preserving bend
 * has an exact inverse: progress cannot jump to the neighbouring switchback leg.
 * Chapters may have several bends; their discs never overlap, so composing
 * them keeps the inverse exact. Terrain, road art and collision vertices all
 * use this same mapping. */
function turn(m: Mission, radius: number) {
  return (2.23 + m.id * 0.025) * (1 - smooth(15, 90, radius));
}
const centres = new WeakMap<Mission, Map<number, number>>();
/** Each switchback's centre line position, computed once per chapter. */
function centre(m: Mission, pivot: number) {
  let map = centres.get(m);
  if (!map) centres.set(m, (map = new Map()));
  let x = map.get(pivot);
  if (x === undefined) map.set(pivot, (x = roadX(m, pivot)));
  return x;
}
function warp(m: Mission, pivot: number, x: number, z: number, sign: number) {
  const cx = centre(m, pivot),
    dx = x - cx,
    dz = z - pivot;
  const radius = Math.hypot(dx, dz);
  if (radius >= 90) return { x, z };
  const angle = turn(m, radius) * sign;
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return { x: cx + dx * c + dz * s, z: pivot - dx * s + dz * c };
}
function map(m: Mission, x: number, z: number, inverse: boolean) {
  let p = { x, z };
  const list = pivots(m);
  if (inverse)
    for (let i = list.length - 1; i >= 0; i--) p = warp(m, list[i], p.x, p.z, -1);
  else for (const pivot of list) p = warp(m, pivot, p.x, p.z, 1);
  return p;
}
export const toWorld = (m: Mission, x: number, station: number) =>
  map(m, x, station, false);
export const toRoute = (m: Mission, x: number, z: number) => map(m, x, z, true);
export function routePoint(
  m: Mission,
  station: number,
  alternate = false,
  offset = 0,
) {
  const x = routeX(m, station, alternate) + offset;
  const p = toWorld(m, x, station);
  return { ...p, y: heightAt(m, x, station) };
}
export function routeHeading(
  m: Mission,
  station: number,
  alternate = false,
  offset = 0,
) {
  const a = toWorld(
    m,
    routeX(m, station - 0.1, alternate) + offset,
    station - 0.1,
  );
  const b = toWorld(
    m,
    routeX(m, station + 0.1, alternate) + offset,
    station + 0.1,
  );
  return Math.atan2(b.x - a.x, b.z - a.z);
}
export function worldHeight(m: Mission, x: number, z: number) {
  const p = toRoute(m, x, z);
  return heightAt(m, p.x, p.z);
}
export const ridgeAt = perStation(function ridgeAt(m: Mission, station: number) {
  let ridge = 0;
  for (const p of pivots(m))
    ridge = Math.max(
      ridge,
      smooth(p - 75, p - 51, station) * (1 - smooth(p + 54, p + 80, station)),
    );
  return ridge;
});
/** The switchback whose approach or exit contains this station, if any. */
export function nearestPivot(m: Mission, station: number) {
  let best: number | undefined;
  for (const p of pivots(m))
    if (best === undefined || Math.abs(p - station) < Math.abs(best - station))
      best = p;
  return best;
}
export const roadWidth = perStation(function roadWidth(m: Mission, station: number) {
  const ridge = ridgeAt(m, station);
  const base = m.width + Math.sin(station * 0.047) * 0.32;
  if (!ridge) return base;
  const a = toWorld(m, roadX(m, station - 0.1), station - 0.1);
  const b = toWorld(m, roadX(m, station + 0.1), station + 0.1);
  // Compensate the bend's lateral shear, keeping a usable 6.8–8.2 m corridor.
  const scale = Math.hypot(b.x - a.x, b.z - a.z) / 0.2;
  return (base * (1 - ridge) + (4.1 - m.id * 0.15) * ridge) * scale;
});
const distanceCache = new WeakMap<Mission, [Float64Array, Float64Array]>();
export function remainingDistance(
  m: Mission,
  from: number,
  alternate: boolean,
) {
  let paths = distanceCache.get(m);
  if (!paths) {
    paths = [false, true].map((alt) => {
      const totals = new Float64Array(m.length + 1);
      let last = routePoint(m, m.length, alt);
      for (let s = m.length - 1; s >= 0; s--) {
        const p = routePoint(m, s, alt);
        totals[s] =
          totals[s + 1] + Math.hypot(p.x - last.x, p.y - last.y, p.z - last.z);
        last = p;
      }
      return totals;
    }) as [Float64Array, Float64Array];
    distanceCache.set(m, paths);
  }
  const s = Math.max(0, Math.min(m.length, from)),
    i = Math.floor(s),
    path = paths[alternate ? 1 : 0];
  return path[i] + ((path[i + 1] ?? path[i]) - path[i]) * (s - i);
}

export function ridgeElevation(m: Mission, station: number) {
  let rise = 0;
  for (const p of pivots(m))
    rise +=
      (18 + m.id * 1.5) *
      smooth(p - 90, p - 11, station) *
      (1 - smooth(p + 25, p + 140, station));
  return rise;
}
export function stationAhead(
  m: Mission,
  station: number,
  metres: number,
  alternate = false,
) {
  const target = remainingDistance(m, station, alternate) - metres;
  let low = Math.max(0, station),
    high = Math.min(m.length, station + metres * 2 + 20);
  for (let i = 0; i < 12; i++) {
    const middle = (low + high) / 2;
    if (remainingDistance(m, middle, alternate) > target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
