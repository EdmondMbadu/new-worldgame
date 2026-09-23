import {
  remainingDistance,
  ridgeAt,
  ridgeElevation,
  roadWidth,
  toWorld,
} from './routes';
import { branchSections, roadDepression, roadSections } from './road-sections';
import { CLINICS } from './clinic-stories';

export type SectionKind =
  | 'washout'
  | 'minibus'
  | 'bridge'
  | 'tree'
  | 'flood'
  | 'gust'
  | 'ridge'
  | 'herd'
  | 'traffic'
  | 'market'
  | 'lorry'
  | 'planks'
  | 'breakdown'
  | 'landslide';
/** An authored road moment. +X is the driver's left when travelling along +Z. */
export type SectionSpec = {
  kind: SectionKind;
  z: number;
  length: number;
  safeSide: number;
};
/** One sine component: amplitude (m), angular frequency (rad/m), phase (rad). */
export type Wave = [number, number, number];
export type Mission = {
  id: number;
  variant?: number;
  title: string;
  place: string;
  tagline: string;
  briefing: string;
  outcome: string;
  length: number;
  seconds: number;
  lives: number;
  /** Rain at the clinic. With `rainStart`, the weather arrives during the drive. */
  rain: number;
  rainStart?: number;
  night: number;
  seed: number;
  /** Scales every lateral bend; 0 straightens the road and removes the switchbacks. */
  bend: number;
  sky: string;
  sun: string;
  mud: [number, number][];
  bridge?: [number, number];
  fork: [number, number];
  radio: { at: number; who: string; text: string }[];
  /** The landscape this chapter crosses, shown on the chapter card. */
  region: string;
  /** The chapter's signature moment, shown before the drive. */
  signature: string;
  /** Half-width of the ordinary road deck (m). */
  width: number;
  /** Lateral shape of the road. */
  curve: Wave[];
  /** Vertical rolling of the road deck. */
  hills: Wave[];
  /** Overall climb (+) or descent (−) in metres per metre. */
  grade: number;
  /** A broad low point in the road profile, e.g. a river valley. */
  basin?: { at: number; depth: number; spread: number };
  /** Hillside switchback centres (stations). Each is a radius-preserving bend. */
  ridges: number[];
  /** Depth of the open drop beside each switchback (m). */
  cliff: number;
  /** Beyond the corridor: how far valleys fall, hills rise, and how quickly they trade sides. */
  vista: { drop: number; rise: number; roll: number };
  sections: SectionSpec[];
  /** Signed firm bypasses in addition to the fork and flood bypasses. */
  detours: [number, number][];
  /** Village centres (stations). */
  villages: number[];
  /** A river that follows the road and passes under the bridge. */
  river?: { side: number; width: number };
};
export const MISSIONS: Mission[] = [
  {
    id: 0,
    title: 'The First Light',
    place: 'Kijani Valley Clinic',
    tagline: 'A small delivery. A whole world of difference.',
    briefing:
      'Amani, the clinic is running on its last reserve. The solar connections are ready. Bring the panels and the charged battery — we will do the rest.',
    outcome:
      'Emergency care is back. Three patients have the power they need, and the valley has a brighter tomorrow.',
    length: 1050,
    seconds: 235,
    lives: 3,
    rain: 0,
    night: 0.82,
    seed: 17,
    bend: 1,
    sky: '#172b40',
    sun: '#ffe1a3',
    mud: [
      [330, 370],
      [690, 735],
    ],
    fork: [600, 770],
    radio: [],
    region: 'Open savanna valley',
    signature: 'Market day in the village · goats at dusk',
    width: 5.2,
    // Long, open sweeps down into a wide valley.
    curve: [
      [30, 0.0047, 0.35],
      [8, 0.0135, 1.1],
    ],
    hills: [
      [3.5, 0.0085, 0.2],
      [5, 0.0031, 0.9],
    ],
    grade: -0.011,
    ridges: [],
    cliff: 54,
    vista: { drop: 74, rise: 26, roll: 0.0036 },
    sections: [
      { kind: 'washout', z: 250, length: 24, safeSide: 1 },
      { kind: 'market', z: 470, length: 44, safeSide: 1 },
      { kind: 'herd', z: 880, length: 30, safeSide: -1 },
    ],
    detours: [[160, 310]],
    villages: [85, 470, 889],
  },
  {
    id: 1,
    title: 'Before the Rain',
    place: 'Mawingu Forest Clinic',
    tagline: 'The storm is moving. So are you.',
    briefing:
      'Rain is reaching the forest. Our friends at Kijani have marked the firmer road. Mawingu needs its solar kit before the reserve runs out.',
    outcome:
      'Five patients can continue treatment. The rain keeps falling; inside, the clinic is warm and bright.',
    length: 1160,
    seconds: 255,
    lives: 5,
    rain: 0.8,
    rainStart: 0.05,
    night: 0.9,
    seed: 41,
    bend: 1,
    sky: '#182c37',
    sun: '#dbe1c3',
    mud: [
      [395, 470],
      [1010, 1050],
    ],
    fork: [330, 530],
    radio: [],
    region: 'Rain forest',
    signature: 'The rain arrives · a lorry bogged in the mud',
    width: 4.4,
    // A narrow road that winds between the trunks.
    curve: [
      [4.5, 0.06, 0.9],
      [12, 0.013, 2.1],
      [10, 0.0052, 0.3],
    ],
    hills: [
      [4.5, 0.011, 0.3],
      [2.5, 0.023, 1.4],
    ],
    grade: 0.004,
    ridges: [640],
    cliff: 54,
    vista: { drop: 30, rise: 58, roll: 0.0061 },
    sections: [
      { kind: 'tree', z: 235, length: 12, safeSide: -1 },
      { kind: 'lorry', z: 432, length: 22, safeSide: 1 },
      { kind: 'flood', z: 900, length: 30, safeSide: -1 },
    ],
    detours: [],
    villages: [85, 780, 1000],
  },
  {
    id: 2,
    title: 'Across the River',
    place: 'Mto Riverside Clinic',
    tagline: 'Some roads ask you to slow down.',
    briefing:
      'The river bridge has lost part of its deck. A narrow marked lane is open. You can cross carefully or take the longer ridge road to the left.',
    outcome:
      'Six lives supported by restored emergency care. The riverside community has a dependable source of power.',
    length: 1210,
    seconds: 270,
    lives: 6,
    rain: 0.25,
    night: 0.86,
    seed: 68,
    bend: 1,
    sky: '#193444',
    sun: '#fce2bb',
    mud: [
      [335, 372],
      [1110, 1140],
    ],
    bridge: [640, 700],
    fork: [585, 770],
    radio: [],
    region: 'River country',
    signature: 'Timber plank crossing · the broken bridge',
    width: 4.8,
    // The road follows the river's meanders down to the crossing.
    curve: [
      [24, 0.0062, 1.4],
      [8, 0.0165, 0.4],
    ],
    hills: [
      [2.5, 0.012, 0.6],
      [3, 0.0045, 2.2],
    ],
    grade: 0.006,
    basin: { at: 670, depth: 16, spread: 300 },
    ridges: [905],
    cliff: 60,
    vista: { drop: 46, rise: 44, roll: 0.0047 },
    sections: [
      { kind: 'planks', z: 250, length: 16, safeSide: 1 },
      { kind: 'minibus', z: 455, length: 12, safeSide: 1 },
      { kind: 'bridge', z: 670, length: 60, safeSide: 1 },
      { kind: 'traffic', z: 1065, length: 12, safeSide: -1 },
    ],
    detours: [[180, 320]],
    villages: [80, 450, 1110],
    river: { side: 1, width: 17 },
  },
  {
    id: 3,
    title: 'Night Watch',
    place: 'Nyota Maternity Clinic',
    tagline: 'Carry a little light into the night.',
    briefing:
      'Amani, this is Mina. We have mothers and newborns in the ward. The high road is foggy, but the reflectors will guide you. We are ready for your battery.',
    outcome:
      'The maternity ward is bright again. Eight patients and their families can face the night with hope.',
    length: 1280,
    seconds: 285,
    lives: 8,
    rain: 0.45,
    night: 0.88,
    seed: 93,
    bend: 1,
    sky: '#223647',
    sun: '#a3c9d5',
    mud: [
      [250, 285],
      [1000, 1040],
    ],
    fork: [770, 970],
    radio: [],
    region: 'Highland escarpment',
    signature: 'Twin switchbacks · a breakdown marked with branches',
    width: 4.5,
    // Short straights between tight highland bends, climbing all the way.
    curve: [
      [15, 0.0092, 0.5],
      [9, 0.0165, 2.2],
      [3.5, 0.05, 1.3],
    ],
    hills: [
      [3, 0.013, 1],
      [2, 0.024, 0.2],
    ],
    grade: 0.02,
    ridges: [395, 640],
    cliff: 82,
    vista: { drop: 96, rise: 72, roll: 0.0042 },
    sections: [
      { kind: 'washout', z: 205, length: 24, safeSide: -1 },
      { kind: 'breakdown', z: 875, length: 16, safeSide: 1 },
      { kind: 'gust', z: 1110, length: 12, safeSide: -1 },
    ],
    detours: [[115, 265]],
    villages: [85, 518, 1040],
  },
  {
    id: 4,
    title: 'The Last Connection',
    place: 'Umoja Regional Clinic',
    tagline: 'Five clinics. One chain of light.',
    briefing:
      'This is the final delivery. Teams from every clinic you powered are relaying the route. The storm has reached Umoja. Bring the last kit home.',
    outcome:
      'Twelve patients have power for their care. Five clinics now shine across the region. You brought the light; together, you kept hope alive.',
    length: 1400,
    seconds: 300,
    lives: 12,
    rain: 1,
    rainStart: 0.55,
    night: 0.96,
    seed: 121,
    bend: 1,
    sky: '#172a35',
    sun: '#c5d9cf',
    mud: [
      [300, 345],
      [1170, 1210],
    ],
    bridge: [690, 750],
    fork: [640, 820],
    radio: [],
    region: 'Storm country',
    signature: 'A fresh landslide · every hazard, one last time',
    width: 4.6,
    curve: [
      [20, 0.008, 1],
      [11, 0.0142, 0.1],
      [5, 0.024, 1.7],
    ],
    hills: [
      [4, 0.0095, 0.8],
      [5, 0.0037, 2.6],
    ],
    grade: -0.006,
    ridges: [480],
    cliff: 70,
    vista: { drop: 62, rise: 50, roll: 0.0052 },
    sections: [
      { kind: 'landslide', z: 240, length: 26, safeSide: 1 },
      { kind: 'bridge', z: 720, length: 60, safeSide: 1 },
      { kind: 'flood', z: 960, length: 30, safeSide: 1 },
      { kind: 'herd', z: 1110, length: 16, safeSide: -1 },
      { kind: 'tree', z: 1250, length: 12, safeSide: 1 },
    ],
    detours: [],
    villages: [80, 600, 1119],
  },
];
// Keep the established road rules and legacy score schema; story facts are separate.
MISSIONS.forEach((mission, index) => {
  const clinic = CLINICS[index];
  mission.place = clinic.shortName;
  mission.tagline = clinic.context;
  mission.briefing = clinic.opening;
  mission.outcome = clinic.closing;
  mission.radio = [];
});
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function roadX(m: Mission, z: number) {
  const end = 1 - smooth(m.length - 110, m.length - 30, z);
  let x = 0;
  for (const [amplitude, frequency, phase] of m.curve)
    x += Math.sin(z * frequency + phase) * amplitude;
  return x * m.bend * end;
}
export function roadY(m: Mission, z: number) {
  let y = 5 + ridgeElevation(m, z) + m.grade * z;
  for (const [amplitude, frequency, phase] of m.hills)
    y += Math.sin(z * frequency + phase) * amplitude;
  if (m.basin)
    y -= m.basin.depth * Math.exp(-Math.pow((z - m.basin.at) / m.basin.spread, 2));
  return y;
}
/** Rain at a station: chapters with `rainStart` see the weather arrive mid-drive. */
export function rainAt(m: Mission, z: number) {
  if (m.rainStart === undefined) return m.rain;
  return m.rainStart + (m.rain - m.rainStart) * smooth(m.length * 0.2, m.length * 0.55, z);
}
/** The river's centre line (route x) at a station, when the chapter has one. */
export function riverX(m: Mission, z: number) {
  if (!m.river || !m.bridge) return null;
  const mid = (m.bridge[0] + m.bridge[1]) / 2;
  // Upstream it runs beside the road on one side, crosses under the bridge,
  // then continues downstream on the other side.
  const side = m.river.side * Math.tanh((mid - z) / 38);
  const away = Math.max(0, z - mid - 50) * 0.45;
  const meander = Math.sin(z * 0.017 + 1.3) * 8 + Math.sin(z * 0.0071 + 0.4) * 7;
  return roadX(m, z) + side * (38 + meander) - m.river.side * away;
}
/** Water surface of the river: always falling downstream, level with the bridge channel. */
export function riverLevel(m: Mission, z: number) {
  if (!m.bridge) return -Infinity;
  const mid = (m.bridge[0] + m.bridge[1]) / 2;
  return roadY(m, mid) - 4.4 - (z - mid) * 0.018;
}
export function forkOffset(m: Mission, z: number) {
  return branchSections(m).reduce((offset, [a, b]) => {
    const t = (z - a) / (b - a);
    return t > 0 && t < 1
      ? Math.max(offset, Math.pow(Math.sin(t * Math.PI), 2) * 27)
      : offset;
  }, 0);
}
export function routeX(m: Mission, z: number, alt = false) {
  return roadX(m, z) + (alt ? forkOffset(m, z) : 0);
}
export function roadDistance(m: Mission, x: number, z: number) {
  return Math.min(Math.abs(x - roadX(m, z)), Math.abs(x - routeX(m, z, true)));
}
export function isMud(m: Mission, x: number, z: number) {
  return (
    m.mud.some(([a, b]) => z > a && z < b) && Math.abs(x - roadX(m, z)) < 6
  );
}
export function onBridge(m: Mission, z: number) {
  return !!m.bridge && z > m.bridge[0] && z < m.bridge[1];
}
export type Obstacle = {
  x: number;
  z: number;
  radius: number;
  depth?: number;
  kind: 'rock' | 'rut' | 'log';
};
const obstacleCache = new WeakMap<Mission, Obstacle[]>();
export function obstacles(m: Mission): Obstacle[] {
  const existing = obstacleCache.get(m);
  if (existing) return existing;
  const rand = random(m.seed);
  const list: Obstacle[] = [];
  for (let z = 115; z < m.length - 110; z += 48 + rand() * 30) {
    if (onBridge(m, z)) continue;
    list.push({
      x: roadX(m, z) + (rand() > 0.5 ? 1 : -1) * (2.3 + rand() * 1.8),
      z,
      radius: 0.85 + rand() * 0.55,
      depth: 0.16 + rand() * 0.16,
      kind: 'rut',
    });
    if (z > 330 && rand() > 0.6)
      list.push({
        x:
          roadX(m, z + 12) +
          (rand() > 0.5 ? 1 : -1) * (roadWidth(m, z + 12) + 1.1),
        z: z + 12,
        radius: 0.7,
        kind: 'rock',
      });
  }

  // Keep incidental roughness out of the approach and marked exit corridors.
  // The authored hazard itself is the challenge; its safe line must stay usable.
  const clear = list.filter(
    (o) =>
      !roadSections(m).some(
        (s) => o.z > s.z - 135 && o.z < s.z + s.length / 2 + 40,
      ),
  );
  obstacleCache.set(m, clear);
  return clear;
}
export function rutDepthAt(m: Mission, x: number, z: number) {
  let depth = 0;
  for (const o of obstacles(m)) {
    if (o.kind !== 'rut' || Math.abs(z - o.z) > o.radius * 1.8) continue;
    const r = Math.hypot((x - o.x) / o.radius, (z - o.z) / (o.radius * 1.8));
    depth = Math.max(depth, (o.depth || 0.2) * (1 - smooth(0, 1, r)));
  }
  return depth;
}
export function missionVariant(m: Mission, variant = 0): Mission {
  return variant === 0 ? m : { ...m, variant, seed: m.seed + variant * 7919 };
}
export function heightAt(m: Mission, x: number, z: number) {
  const d = roadDistance(m, x, z);
  let h = roadY(m, z);
  const width = roadWidth(m, z);
  const blend = smooth(width + 1.2, width + 21, d);
  h +=
    blend *
    (Math.sin(x * 0.055 + z * 0.01) * 7 +
      Math.sin(x * 0.018 - z * 0.019) * 8 +
      Math.max(0, d - 55) * 0.09);
  h += macroRelief(m, x - roadX(m, z), z, d);
  const river = riverX(m, z);
  if (m.bridge) {
    const b =
      smooth(m.bridge[0] - 25, m.bridge[0], z) *
      (1 - smooth(m.bridge[1], m.bridge[1] + 25, z));
    // A chapter river confines the crossing channel to its own banks.
    const banks =
      river === null
        ? 1
        : 1 - smooth(m.river!.width / 2 + 6, m.river!.width / 2 + 22, Math.abs(x - river));
    const channel =
      b *
      banks *
      smooth(2.7, 7, Math.abs(x - roadX(m, z))) *
      smooth(5, 9, Math.abs(x - routeX(m, z, true)));
    const riverBed = roadY(m, (m.bridge[0] + m.bridge[1]) / 2) - 6;
    h += (riverBed - h) * channel;
  }
  if (river !== null) h = riverBanks(m, x, z, h, river, d, width);
  const ridge = ridgeAt(m, z),
    offset = x - roadX(m, z);
  // The abyss is part of the collider, with a short gravel shoulder and a steep face.
  h -= ridge * m.cliff * smooth(width + 0.75, width + 7, -offset);
  h += ridge * 16 * smooth(width + 1.2, width + 18, offset);
  if (d < width && !onBridge(m, z)) {
    h += 0.09 * (1 - smooth(0, 5, d));
    h += 0.014 * Math.sin(z * 1.7) + 0.012 * Math.sin(z * 3.1 + x * 2);
    if (isMud(m, x, z)) h += Math.sin(z * 1.9) * 0.045;
    h -= rutDepthAt(m, x, z);
  }
  h -= roadDepression(m, x - roadX(m, z), z);
  // The expanded clinic wings and receiving paths share a level site in both worlds.
  const clinicSite =
    smooth(m.length - 24, m.length - 2, z) *
    (1 - smooth(m.length + 38, m.length + 53, z)) *
    (1 - smooth(18, 30, Math.abs(x)));
  h += (roadY(m, m.length) - h) * clinicSite;
  return h;
}
/** Stations where the chapter river is visible: it bends away before the next switchback. */
export function riverSpan(m: Mission): [number, number] | null {
  if (!m.river || !m.bridge) return null;
  const bridge = m.bridge;
  const next = m.ridges.find((r) => r > bridge[1]);
  return [-60, (next ?? m.length + 170) - 110];
}
/**
 * The river runs in its own channel: a bed below the water, banks just above
 * it, then a blend back to the natural slope. The drivable corridors, the
 * switchbacks and the river's downstream end are left untouched.
 */
function riverBanks(
  m: Mission,
  x: number,
  z: number,
  h: number,
  river: number,
  d: number,
  width: number,
) {
  const span = riverSpan(m)!;
  const half = m.river!.width / 2;
  const across = Math.abs(x - river);
  const fade =
    smooth(span[0] - 40, span[0], z) *
    (1 - smooth(span[1] - 60, span[1], z)) *
    (1 - ridgeAt(m, z));
  const weight =
    fade *
    (1 - smooth(half + 3, half + 18, across)) *
    smooth(width + 5, width + 12, d);
  if (weight <= 0) return h;
  const level = riverLevel(m, z);
  const target =
    across < half
      ? level - 1.4 - 1.3 * (1 - smooth(0, half, across))
      : level + 0.9 + (across - half) * 0.18;
  return h + (target - h) * weight;
}
/**
 * Beyond the drivable corridor the land opens into vistas: one side falls
 * away into a broad valley while the other rises into hills. The sides trade
 * places along the route. Only affects ground > 45 m from the road.
 */
export function macroRelief(m: Mission, offset: number, z: number, d = Math.abs(offset)) {
  const reach = smooth(45, 190, d);
  if (reach <= 0) return 0;
  const valleySide = Math.sin(z * m.vista.roll + m.id * 1.7 + 0.6);
  const s = Math.sign(offset) || 1;
  const toward = valleySide * s;
  const drop = -m.vista.drop * Math.max(0, toward) * reach;
  const rise = m.vista.rise * Math.max(0, -toward) * smooth(60, 260, d);
  const hills =
    (Math.sin(offset * 0.021 + z * 0.013 + m.id) * 0.6 +
      Math.sin(offset * 0.0071 - z * 0.009 + m.seed) * 0.8) *
    16 *
    reach;
  return drop + rise + hills;
}
export function pathLength(m: Mission, from = 0, alt = false) {
  return remainingDistance(m, from, alt);
}

/** Lateral terrain sample offsets from the road centre (m). */
export const TERRAIN_OFFSETS = (() => {
  return [
    -330,
    -265,
    -200,
    -140,
    -100,
    -75,
    -60,
    -46,
    ...Array.from({ length: 161 }, (_, i) => i * 0.5 - 40),
    46,
    60,
    75,
    100,
    140,
    200,
    265,
    330,
  ];
})();
export function makeTerrain(m: Mission) {
  const offsets = TERRAIN_OFFSETS;
  const cols = offsets.length,
    rows = Math.ceil(m.length + 140);
  const vertices = new Float32Array((rows + 1) * cols * 3);
  const indices: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const z = j - 60;
    for (let i = 0; i < cols; i++) {
      const x = roadX(m, z) + offsets[i],
        k = (j * cols + i) * 3;
      const world = toWorld(m, x, z);
      vertices[k] = world.x;
      vertices[k + 1] = heightAt(m, x, z);
      vertices[k + 2] = world.z;
      if (i < cols - 1 && j < rows) {
        const a = j * cols + i;
        indices.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
      }
    }
  }
  return { vertices, indices: new Uint32Array(indices), cols, rows };
}
