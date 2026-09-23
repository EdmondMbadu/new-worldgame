import { heightAt, random, roadX, type Mission } from './missions';
import { roadSections } from './road-sections';
import { roadWidth } from './routes';

/**
 * Deterministic placement for the chapters' signature moments, shared by the
 * physics world (colliders) and the renderer (meshes). Route coordinates:
 * x is lateral, z is the station.
 */
export type Stall = { x: number; z: number; side: number; hx: number; hz: number; height: number; hue: number };
export type Rock = { x: number; z: number; y: number; radius: number };
export type Walker = { lane: number; z: number; delay: number; shirt: number };

const stallCache = new WeakMap<Mission, Stall[]>();
/** Market stalls line both verges; the middle of the market stays open for people crossing. */
export function marketStalls(m: Mission): Stall[] {
  const old = stallCache.get(m);
  if (old) return old;
  const list: Stall[] = [];
  const rand = random(m.seed * 13 + 7);
  for (const s of roadSections(m).filter((s) => s.kind === 'market'))
    for (const side of [-1, 1])
      for (let z = s.z - s.length / 2 + 2.5; z <= s.z + s.length / 2 - 2.5; z += 5.3) {
        if (Math.abs(z - s.z) < 4.5) continue;
        const width = roadWidth(m, z);
        list.push({
          x: roadX(m, z) + side * (width + 1.75 + rand() * 0.5),
          z: z + (rand() - 0.5) * 1.2,
          side,
          hx: 0.85,
          hz: 1.25 + rand() * 0.25,
          height: 2.1 + rand() * 0.3,
          hue: rand(),
        });
      }
  stallCache.set(m, list);
  return list;
}
/** People who cross the market between the stalls. Lanes are stations near the gap. */
export function marketWalkers(s: { z: number }, count: number): Walker[] {
  return Array.from({ length: count }, (_, i) => ({
    lane: i % 2 ? 1 : -1,
    z: s.z + ((i % 3) - 1) * 1.6 + (i > 2 ? 0.8 : 0),
    delay: i * 2.3,
    shirt: i,
  }));
}
/** Where a crossing walker stands at a time: a slow walk from verge to verge and back. */
export function walkerOffset(w: Walker, time: number, width: number) {
  const period = 22;
  const t = (((time + w.delay) % period) + period) % period;
  const edge = width + 1.1;
  // Walk across (0–8 s), linger at the stalls (8–11 s), walk back (11–19 s), linger.
  const u =
    t < 8 ? t / 8 : t < 11 ? 1 : t < 19 ? 1 - (t - 11) / 8 : 0;
  const eased = u * u * (3 - 2 * u);
  return {
    offset: w.lane * edge * (1 - 2 * eased),
    walking: (t > 0.2 && t < 7.8) || (t > 11.2 && t < 18.8),
    facing: t < 11 ? -w.lane : w.lane,
  };
}

const rockCache = new WeakMap<Mission, Rock[]>();
/** Boulders resting on the landslide, all on the closed side of its passage. */
export function slideRocks(m: Mission): Rock[] {
  const old = rockCache.get(m);
  if (old) return old;
  const list: Rock[] = [];
  const rand = random(m.seed * 29 + 3);
  for (const s of roadSections(m).filter((s) => s.kind === 'landslide')) {
    for (let i = 0; i < 22; i++) {
      const big = i < 7;
      const radius = big ? 0.9 + rand() * 0.6 : 0.35 + rand() * 0.45;
      // Big rocks rest up the bank; smaller ones scatter over the road half it covers.
      const lateral = big
        ? -(roadWidth(m, s.z) + 1.5 + rand() * 5)
        : -(radius + 1.3 + rand() * (roadWidth(m, s.z) - radius - 1.3));
      const z = s.z + (rand() - 0.5) * (s.length - 4);
      const x = roadX(m, z) + lateral * s.safeSide;
      list.push({ x, z, radius, y: heightAt(m, x, z) + radius * 0.35 });
    }
  }
  rockCache.set(m, list);
  return list;
}
