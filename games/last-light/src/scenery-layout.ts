import { pivots, ridgeAt, roadWidth, routeHeading, toWorld } from './routes';
import { branchSections } from './road-sections';
import { heightAt, onBridge, random, riverSpan, riverX, roadDistance, roadX, routeX, type Mission } from './missions';
import { roadSections } from './road-sections';

/**
 * One deterministic source of roadside placement, shared by the physics world
 * (colliders) and the renderer (meshes). Everything here is in route
 * coordinates: x is lateral, z is the station along the road.
 */
export type PlantKind = 'acacia' | 'baobab' | 'palm' | 'banana' | 'euphorbia' | 'broadleaf';
export type Plant = { kind: PlantKind; x: number; z: number; scale: number; yaw: number; tint: number };
export type Boulder = { x: number; z: number; sx: number; sy: number; sz: number; yaw: number };
export type Mound = { x: number; z: number; scale: number; yaw: number };
export type Home = { x: number; z: number; yaw: number; width: number; depth: number; site: number; side: number; index: number };
export type Box = { x: number; z: number; yaw: number; hx: number; hy: number; hz: number; y: number; site?: number };
export type Post = { x: number; z: number; kind: 'reflector' | 'ridge' | 'sign'; text?: string; side: number; instance?: number };

export const TRUNK_RADIUS: Record<PlantKind, number> = {
  acacia: 0.24,
  baobab: 1.15,
  palm: 0.21,
  banana: 0,
  euphorbia: 0.34,
  broadleaf: 0.36,
};

/** 0 is dry savanna, 1 is rainforest. */
export const LUSH = [0.25, 1, 0.7, 0.55, 0.85];
/** Relative number of trees per chapter. */
const DENSITY = [0.85, 1.6, 1.05, 1, 1.15];

export type SceneryLayout = {
  plants: Plant[];
  boulders: Boulder[];
  mounds: Mound[];
  homes: Home[];
  wells: { x: number; z: number; site: number; side: number }[];
  farHomes: Box[];
  posts: Post[];
};

const cache = new WeakMap<Mission, SceneryLayout>();

export function villageSites(m: Mission) {
  return m.villages;
}
/** Signs at each village's water point. */
export const VILLAGE_SIGNS = [
  ['WATER POINT', 'MARKET DAY · WALKING PACE', 'HERDS CROSS HERE'],
  ['WATER POINT', 'FOREST SCHOOL', 'WATER POINT'],
  ['RIVER LANDING', 'MINIBUS STOP', 'WATER POINT'],
  ['WATER POINT', 'SADDLE VILLAGE', 'WATER POINT'],
  ['WATER POINT', 'RELAY POINT · ALL CLINICS', 'HERDS CROSS HERE'],
];
/** Set-piece ground (markets, slides, creeks) and the river stay clear of scenery. */
function setPieceClear(m: Mission, x: number, z: number, clearance: number) {
  for (const s of roadSections(m)) {
    if (s.kind !== 'market' && s.kind !== 'landslide' && s.kind !== 'planks') continue;
    if (Math.abs(z - s.z) < s.length / 2 + 10 && Math.abs(x - roadX(m, z)) < 22 + clearance)
      return true;
  }
  const span = riverSpan(m);
  const river = riverX(m, z);
  if (span && river !== null && z > span[0] && z < span[1] + 20 && Math.abs(x - river) < m.river!.width / 2 + 3 + clearance * 0.4)
    return true;
  return false;
}

/** Village homes use the same random stream the village art always used. */
function villages(m: Mission) {
  const rng = random(m.seed + 724);
  const homes: Home[] = [],
    wells: SceneryLayout['wells'] = [],
    farHomes: Box[] = [];
  villageSites(m).forEach((z, site) => {
    for (let house = 0; house < 6; house++) {
      let side = house % 2 ? 1 : -1;
      const hz = z + (Math.floor(house / 2) - 1) * 20 + rng() * 5;
      let hx = roadX(m, hz) + side * (15 + rng() * 8);
      // Homes stand back from the river bank: they move to the dry side of the road.
      const river = riverX(m, hz);
      if (river !== null && Math.abs(hx - river) < m.river!.width / 2 + 22) {
        side = -side;
        hx = roadX(m, hz) * 2 - hx;
      }
      // Homes stand clear of the signed detour as well as the main road.
      const alt = routeX(m, hz, true);
      if (Math.abs(alt - roadX(m, hz)) > 1 && Math.sign(alt - roadX(m, hz)) === side && Math.abs(hx - alt) < 13)
        hx = alt + side * (13 + Math.abs(hx - roadX(m, hz)) - 15);
      const yaw = (side > 0 ? -0.7 : 0.65) + (rng() - 0.5) * 0.35;
      const width = 4.7 + rng() * 1.8,
        depth = 4.3 + rng();
      homes.push({ x: hx, z: hz, yaw, width, depth, site, side, index: house });
    }
    const side = site % 2 ? 1 : -1;
    wells.push({ x: roadX(m, z) + side * 10.5, z, site, side });
    for (let i = 0; i < 7; i++) {
      const pz = z + 25 + i * 12,
        px = roadX(m, pz) - side * (43 + (i % 3) * 13);
      const river = riverX(m, pz);
      if (river !== null && Math.abs(px - river) < m.river!.width / 2 + 12) continue;
      farHomes.push({ x: px, z: pz, yaw: 0, hx: 2.5, hy: 1.75, hz: 2, y: 1.7, site });
    }
  });
  return { homes, wells, farHomes };
}

function posts(m: Mission): Post[] {
  const list: Post[] = [];
  const slides = roadSections(m).filter((s) => s.kind === 'landslide');
  for (let z = 5; z < m.length; z += 18)
    for (const side of [-1, 1]) {
      // Reflectors on the buried side of a landslide lie under the debris.
      if (slides.some((s) => Math.abs(z - s.z) < s.length / 2 + 6 && side === -s.safeSide)) continue;
      list.push({
        x: roadX(m, z) + side * (roadWidth(m, z) + (ridgeAt(m, z) > 0.1 ? 0.3 : 1.6)),
        z,
        kind: 'reflector',
        side,
      });
    }
  for (const p of pivots(m))
    for (let z = p - 63; z < p + 71; z += 5)
      list.push({ x: roadX(m, z) - roadWidth(m, z) + 0.1, z, kind: 'ridge', side: -1 });
  const sign = (z: number, text: string, side = 1) =>
    list.push({ x: roadX(m, z) + side * 7.3, z, kind: 'sign', text, side });
  sign(35, 'CLINIC ↑');
  for (const p of pivots(m)) {
    sign(p - 92, 'HAIRPIN · 25 km/h');
    sign(p - 71, 'OPEN EDGE · STAY ON ROAD', 1);
  }
  for (const s of roadSections(m)) {
    if (s.kind === 'market') sign(s.z - s.length / 2 - 45, 'MARKET · WALKING PACE');
    if (s.kind === 'planks') sign(s.z - 62, 'PLANK CROSSING · 10 km/h', -1);
    if (s.kind === 'landslide') sign(s.z - 85, 'LANDSLIDE · ONE LANE', s.safeSide);
  }
  for (const [a] of branchSections(m)) sign(a - 20, '← FIRMER DETOUR   /   SHORT →');
  sign(m.length - 75, 'CLINIC 75 m ↑');
  if (m.bridge) sign(m.bridge[0] - 35, 'NARROW BRIDGE · SLOW');
  for (const [a] of m.mud) sign(a - 25, 'MUD · STEADY SPEED', -1);
  return list;
}

function pickKind(lush: number, r: number, nearVillage: boolean): PlantKind {
  if (nearVillage && r < 0.35) return r < 0.2 ? 'banana' : 'palm';
  const w: [PlantKind, number][] = [
    ['acacia', 0.5 * (1 - lush) + 0.06],
    ['baobab', 0.1 * (1 - lush) + 0.01],
    ['euphorbia', 0.12 * (1 - lush)],
    ['broadleaf', 0.2 + 0.45 * lush],
    ['palm', 0.08 + 0.2 * lush],
    ['banana', 0.02 + 0.1 * lush],
  ];
  const total = w.reduce((n, [, v]) => n + v, 0);
  let t = r * total;
  for (const [k, v] of w) {
    if ((t -= v) <= 0) return k;
  }
  return 'broadleaf';
}

export function sceneryLayout(m: Mission): SceneryLayout {
  const existing = cache.get(m);
  if (existing) return existing;
  const lush = LUSH[m.id] ?? 0.5;
  const rng = random(m.seed * 31 + 5);
  const { homes, wells, farHomes } = villages(m);
  const sites = villageSites(m);
  const blocked = (x: number, z: number, clearance: number) => {
    if (roadDistance(m, x, z) < roadWidth(m, z) + clearance) return true;
    if (z > m.length - 30 && Math.abs(x) < 34) return true;
    if (m.bridge && z > m.bridge[0] - 30 && z < m.bridge[1] + 30 && Math.abs(x - roadX(m, z)) < 55)
      return true;
    for (const h of homes) if (Math.hypot(h.x - x, h.z - z) < Math.max(h.width, h.depth) + 2.5) return true;
    for (const w of wells) if (Math.hypot(w.x - x, w.z - z) < 5) return true;
    for (const f of farHomes) if (Math.hypot(f.x - x, f.z - z) < 5.5) return true;
    // Keep the cliff shoulder and the reflector line open.
    if (ridgeAt(m, z) > 0.1 && x < roadX(m, z) && Math.abs(x - roadX(m, z)) < 16) return true;
    return setPieceClear(m, x, z, clearance);
  };
  const plants: Plant[] = [];
  // The forest crowds the road; the savanna leaves it open to the view.
  const count = Math.round(950 * (DENSITY[m.id] ?? 1));
  const nearest = m.id === 1 ? 6.5 : 9;
  for (let i = 0; i < count; i++) {
    const z = rng() * (m.length + 150) - 55;
    const near = rng() < 0.55;
    const side = rng() > 0.5 ? 1 : -1;
    const x = roadX(m, z) + side * (near ? nearest + rng() * 38 : 40 + rng() * 150);
    const nearVillage = sites.some((s) => Math.abs(s - z) < 55);
    const kind = pickKind(lush, rng(), nearVillage);
    const scale =
      kind === 'baobab' ? 0.8 + rng() * 0.5 : kind === 'banana' ? 0.8 + rng() * 0.45 : 0.7 + rng() * 0.65;
    const yaw = rng() * Math.PI * 2,
      tint = rng();
    const clearance = kind === 'baobab' ? 9 : kind === 'acacia' ? 7 : 5;
    if (blocked(x, z, clearance)) continue;
    plants.push({ kind, x, z, scale, yaw, tint });
  }
  const boulders: Boulder[] = [];
  for (let c = 0; c < 70; c++) {
    const z = rng() * m.length,
      side = rng() > 0.5 ? 1 : -1,
      x = roadX(m, z) + side * (10 + rng() * 95);
    const n = 1 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      const bx = x + (rng() - 0.5) * 5,
        bz = z + (rng() - 0.5) * 5;
      const s = (k === 0 ? 1.5 : 0.8) + rng() * 1.3;
      const b = { x: bx, z: bz, sx: s * (0.9 + rng() * 0.5), sy: s * (0.6 + rng() * 0.45), sz: s * (0.9 + rng() * 0.5), yaw: rng() * 6.28 };
      if (blocked(bx, bz, 4 + s)) continue;
      boulders.push(b);
    }
  }
  const mounds: Mound[] = [];
  const moundCount = Math.round(60 * (1 - lush));
  for (let i = 0; i < moundCount; i++) {
    const z = rng() * m.length,
      x = roadX(m, z) + (rng() > 0.5 ? 1 : -1) * (8 + rng() * 60);
    const scale = 0.7 + rng() * 0.9,
      yaw = rng() * 6.28;
    if (blocked(x, z, 4)) continue;
    mounds.push({ x, z, scale, yaw });
  }
  const layout = { plants, boulders, mounds, homes, wells, farHomes, posts: posts(m) };
  cache.set(m, layout);
  return layout;
}

/** Route (x, station) → world pose, including the bend's local rotation. */
export function worldPose(m: Mission, x: number, z: number, yaw = 0) {
  const a = toWorld(m, x, z - 0.25),
    b = toWorld(m, x, z + 0.25),
    w = toWorld(m, x, z);
  return { x: w.x, y: heightAt(m, x, z), z: w.z, yaw: yaw + Math.atan2(b.x - a.x, b.z - a.z) };
}

/** Bridge rails carry a world yaw; x/z are route coordinates. */
export function bridgeRails(m: Mission): Box[] {
  if (!m.bridge) return [];
  const rails: Box[] = [];
  for (let z = m.bridge[0] + 1.4; z < m.bridge[1] - 1.4; z += 2.8)
    for (const side of [-1, 1])
      rails.push({ x: roadX(m, z) + side * 2.45, z, yaw: routeHeading(m, z), hx: 0.06, hy: 0.55, hz: 1.45, y: 0.75 });
  return rails;
}

export const isOnBridge = onBridge;
