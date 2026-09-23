import {
  remainingDistance,
  ridgeAt,
  ridgeElevation,
  roadWidth,
  toWorld,
} from './routes';
import { branchSections, roadDepression, roadSections } from './road-sections';
import { CLINICS } from './clinic-stories';
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
  rain: number;
  night: number;
  seed: number;
  bend: number;
  sky: string;
  sun: string;
  mud: [number, number][];
  bridge?: [number, number];
  fork: [number, number];
  radio: { at: number; who: string; text: string }[];
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
      [280, 320],
      [710, 760],
    ],
    fork: [450, 610],
    radio: [
      {
        at: 35,
        who: 'MINA · CLINIC',
        text: 'You are on your way. Keep the panels safe — every light here is waiting for you.',
      },
      {
        at: 210,
        who: 'JO · DISPATCH',
        text: 'Deep ruts ahead. Ease off before the rough ground; let the suspension work.',
      },
      {
        at: 410,
        who: 'JO · DISPATCH',
        text: 'Road splits ahead. Right is shorter and rough. Left is a longer, firmer road. Both reach us.',
      },
      {
        at: 840,
        who: 'MINA · CLINIC',
        text: 'I can hear the engine. Follow the teal signs into our courtyard.',
      },
    ],
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
    rain: 0.65,
    night: 0.9,
    seed: 41,
    bend: 1.2,
    sky: '#182c37',
    sun: '#dbe1c3',
    mud: [
      [180, 260],
      [500, 600],
      [860, 915],
    ],
    fork: [410, 660],
    radio: [
      {
        at: 45,
        who: 'JO · DISPATCH',
        text: 'The Kijani team sends their thanks. They have marked this road for you.',
      },
      {
        at: 150,
        who: 'JO · DISPATCH',
        text: 'Mud ahead. Steady throttle, gentle steering. Braking early gives you options.',
      },
      {
        at: 370,
        who: 'JO · DISPATCH',
        text: 'At the fork, the left-hand ridge is firmer. The short route is muddy.',
      },
      {
        at: 960,
        who: 'MINA · CLINIC',
        text: 'We have made a dry space for the battery. Come through the front gate.',
      },
    ],
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
    seconds: 265,
    lives: 6,
    rain: 0.25,
    night: 0.86,
    seed: 68,
    bend: 1.1,
    sky: '#193444',
    sun: '#fce2bb',
    mud: [
      [240, 285],
      [900, 965],
    ],
    bridge: [490, 560],
    fork: [430, 620],
    radio: [
      {
        at: 70,
        who: 'MINA · CLINIC',
        text: 'The river is high. Our guide has put markers on the safe part of the bridge.',
      },
      {
        at: 370,
        who: 'JO · DISPATCH',
        text: 'Bridge ahead: keep to the centre, under 20 kilometres an hour. The left fork goes around.',
      },
      {
        at: 650,
        who: 'JO · DISPATCH',
        text: 'You are across. The clinic has heard the good news.',
      },
      {
        at: 1020,
        who: 'MINA · CLINIC',
        text: 'We can see your headlights. The receiving team is at the gate.',
      },
    ],
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
    seconds: 265,
    lives: 8,
    rain: 0.45,
    night: 0.88,
    seed: 93,
    bend: 1.4,
    sky: '#223647',
    sun: '#a3c9d5',
    mud: [
      [260, 300],
      [740, 800],
    ],
    fork: [460, 680],
    radio: [
      {
        at: 50,
        who: 'MINA · CLINIC',
        text: 'The ward is quiet. We are doing everything we can. You bring the power; we will keep caring.',
      },
      {
        at: 205,
        who: 'JO · DISPATCH',
        text: 'Follow the reflectors. The next curve is tighter than it looks.',
      },
      {
        at: 410,
        who: 'JO · DISPATCH',
        text: 'Left-hand route is wider. Keep your headlights on the markers.',
      },
      {
        at: 1060,
        who: 'MINA · CLINIC',
        text: 'The porch is just ahead. I will be there with a torch.',
      },
    ],
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
    seconds: 290,
    lives: 12,
    rain: 1,
    night: 0.96,
    seed: 121,
    bend: 1.45,
    sky: '#172a35',
    sun: '#c5d9cf',
    mud: [
      [220, 280],
      [680, 760],
      [1060, 1120],
    ],
    bridge: [520, 580],
    fork: [450, 650],
    radio: [
      {
        at: 45,
        who: 'JO · DISPATCH',
        text: 'Kijani, Mawingu, Mto and Nyota are all on the radio. Everyone is with you.',
      },
      {
        at: 175,
        who: 'JO · DISPATCH',
        text: 'A fallen tree leaves a passage ahead. Keep to the marked side.',
      },
      {
        at: 390,
        who: 'JO · DISPATCH',
        text: 'The bridge is narrow. The ridge route to the left remains open.',
      },
      {
        at: 800,
        who: 'MINA · CLINIC',
        text: 'Our crew is ready. One more delivery, Amani. One more clinic.',
      },
      {
        at: 1190,
        who: 'JO · DISPATCH',
        text: 'There it is. All those lights on the hills are the places you helped.',
      },
    ],
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
  return (
    (Math.sin(z * 0.014 + m.id * 0.4) * 15 + Math.sin(z * 0.006) * 24) *
    m.bend *
    end
  );
}
export function roadY(m: Mission, z: number) {
  return (
    5 +
    ridgeElevation(m, z) +
    Math.sin(z * 0.009) * 3 +
    Math.sin(z * 0.003) * 5 +
    (m.id >= 3 ? z * 0.012 : 0)
  );
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
  if (m.bridge) {
    const b =
      smooth(m.bridge[0] - 25, m.bridge[0], z) *
      (1 - smooth(m.bridge[1], m.bridge[1] + 25, z));
    const channel =
      b *
      smooth(2.7, 7, Math.abs(x - roadX(m, z))) *
      smooth(5, 9, Math.abs(x - routeX(m, z, true)));
    const riverBed = roadY(m, (m.bridge[0] + m.bridge[1]) / 2) - 6;
    h += (riverBed - h) * channel;
  }
  const ridge = ridgeAt(m, z),
    offset = x - roadX(m, z);
  // The abyss is part of the collider, with a short gravel shoulder and a steep face.
  h -= ridge * (54 + m.id * 7) * smooth(width + 0.75, width + 7, -offset);
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
/**
 * Beyond the drivable corridor the land opens into vistas: one side falls
 * away into a broad valley while the other rises into forested hills. The
 * sides trade places along the route. Only affects ground > 45 m from the road.
 */
export function macroRelief(m: Mission, offset: number, z: number, d = Math.abs(offset)) {
  const reach = smooth(45, 190, d);
  if (reach <= 0) return 0;
  const valleySide = Math.sin(z * 0.0042 + m.id * 1.7 + 0.6);
  const s = Math.sign(offset) || 1;
  const toward = valleySide * s;
  const drop = -52 * Math.max(0, toward) * reach;
  const rise = 38 * Math.max(0, -toward) * smooth(60, 260, d);
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
