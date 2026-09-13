import { heightAt, roadX, routeX, smooth, type Mission } from './missions';

/** Route coordinates are stable stations, not world Z. A radius-preserving bend
 * has an exact inverse: progress cannot jump to the neighbouring switchback leg.
 * Terrain, road art and collision vertices all use this same mapping. */
function turn(m: Mission, radius: number) {
  return m.bend === 0
    ? 0
    : (2.23 + m.id * 0.025) * (1 - smooth(15, 90, radius));
}
function map(m: Mission, x: number, z: number, inverse: boolean) {
  const cx = roadX(m, 365),
    dx = x - cx,
    dz = z - 365;
  const angle = turn(m, Math.hypot(dx, dz)) * (inverse ? -1 : 1);
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return { x: cx + dx * c + dz * s, z: 365 - dx * s + dz * c };
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
export function ridgeAt(m: Mission, station: number) {
  return m.bend === 0
    ? 0
    : smooth(290, 314, station) * (1 - smooth(419, 445, station));
}
export function roadWidth(m: Mission, station: number) {
  const ridge = ridgeAt(m, station);
  if (!ridge) return 4.8 + Math.sin(station * 0.047) * 0.32;
  const a = toWorld(m, roadX(m, station - 0.1), station - 0.1);
  const b = toWorld(m, roadX(m, station + 0.1), station + 0.1);
  // Compensate the bend's lateral shear, keeping a usable 6.8–8.2 m corridor.
  const scale = Math.hypot(b.x - a.x, b.z - a.z) / 0.2;
  return (4.8 * (1 - ridge) + (4.1 - m.id * 0.15) * ridge) * scale;
}
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
  return m.bend === 0
    ? 0
    : (18 + m.id * 1.5) *
        smooth(275, 354, station) *
        (1 - smooth(390, 505, station));
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
