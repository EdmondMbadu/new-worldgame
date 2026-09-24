import type { Mission, SectionKind, SectionSpec } from './missions';

export type RoadSection = SectionSpec;
/** Stationary vehicles and debris that close one side of the road. */
export const BLOCKERS: SectionKind[] = ['tree', 'lorry', 'breakdown', 'landslide'];
/** Fresh tracks put the damage on the other side of these moments. */
const FLIPPABLE: SectionKind[] = [
  'washout',
  'flood',
  'tree',
  'lorry',
  'breakdown',
  'landslide',
  'herd',
];
const cache = new WeakMap<Mission, RoadSection[]>();
/** The chapter's authored moments, plus one switchback section per hairpin. */
export function roadSections(m: Mission): RoadSection[] {
  const old = cache.get(m);
  if (old) return old;
  const flip = (m.variant ?? 0) % 2 === 1 ? -1 : 1;
  const sections: RoadSection[] = [
    ...m.sections.map((s) => ({
      ...s,
      safeSide: FLIPPABLE.includes(s.kind) ? s.safeSide * flip : s.safeSide,
    })),
    ...m.ridges.map((z) => ({
      kind: 'ridge' as const,
      z,
      length: 145,
      safeSide: 1,
    })),
  ];
  sections.sort((a, b) => a.z - b.z);
  cache.set(m, sections);
  return sections;
}
const branchCache = new WeakMap<Mission, [number, number][]>();
export function branchSections(m: Mission): [number, number][] {
  let list = branchCache.get(m);
  if (!list)
    branchCache.set(
      m,
      (list = [
        ...m.detours,
        m.fork,
        ...roadSections(m)
          .filter((s) => s.kind === 'flood')
          .map((s) => [s.z - 75, s.z + 75] as [number, number]),
      ]),
    );
  return list;
}
export function sectionEnvelope(z: number, centre: number, length: number) {
  const t = Math.max(
    0,
    Math.min(1, (length / 2 + 5 - Math.abs(z - centre)) / 5),
  );
  return t * t * (3 - 2 * t);
}
/** Wheel centres sit 0.86 m either side of the truck's centre line. */
export const PLANK_CENTRE = 0.88;
export const PLANK_HALF_WIDTH = 0.52;
/** 1 on a plank runner, 0 over the creek. */
export function onPlank(offset: number) {
  const t = Math.max(
    0,
    Math.min(1, (PLANK_HALF_WIDTH + 0.12 - Math.abs(Math.abs(offset) - PLANK_CENTRE)) / 0.2),
  );
  return t * t * (3 - 2 * t);
}
export const CREEK_DEPTH = 0.55;
/** 1 across the creek bed, easing in over a metre and a half at each bank. */
export function creekAt(s: { z: number; length: number }, z: number) {
  const t = Math.max(0, Math.min(1, (s.length / 2 + 1 - Math.abs(z - s.z)) / 1.5));
  return t * t * (3 - 2 * t);
}
/** How much a landslide raises the ground here (m); 0 on the open passage. */
export function slideHeight(s: RoadSection, offset: number, z: number) {
  const along = Math.abs(z - s.z) / (s.length / 2 + 4);
  if (along >= 1) return 0;
  const lateral = offset * s.safeSide;
  // The passage keeps about 4 m open between the debris and the marked road edge.
  const cover = 1 - Math.max(0, Math.min(1, (lateral + 0.9) / 1.6));
  const shape = Math.cos((along * Math.PI) / 2);
  const lumps =
    0.82 +
    0.12 * Math.sin(z * 1.3 + offset * 0.9) +
    0.08 * Math.sin(z * 2.9 - offset * 1.7);
  // The debris fan spreads from the uphill side and thins across the road.
  const fan = 1.25 + 0.55 * Math.max(0, Math.min(1, (-lateral - 1) / 8));
  const edge = Math.max(0, Math.min(1, (14 - Math.abs(offset)) / 4));
  return cover * cover * (3 - 2 * cover) * shape * lumps * fan * edge;
}
export function roadDepression(m: Mission, offset: number, z: number) {
  let depth = 0;
  let rise = 0;
  for (const s of roadSections(m)) {
    if (s.kind === 'landslide') {
      if (Math.abs(offset) < 14) rise = Math.max(rise, slideHeight(s, offset, z));
      continue;
    }
    if (s.kind === 'planks') {
      // A creek crosses the road; two timber runners carry the wheels over it.
      if (Math.abs(offset) >= 13) continue;
      const creek = creekAt(s, z);
      const gully = 1 - Math.max(0, Math.min(1, (Math.abs(offset) - 10) / 3));
      depth = Math.max(depth, creek * gully * (1 - onPlank(offset)) * CREEK_DEPTH);
      continue;
    }
    const envelope = sectionEnvelope(z, s.z, s.length);
    if (!envelope || Math.abs(offset) > 7) continue;
    const safe = Math.max(0, Math.min(1, (offset * s.safeSide - 1.2) / 0.9));
    if (s.kind === 'washout')
      depth = Math.max(depth, envelope * (1 - safe) * 1.25);
    if (s.kind === 'flood')
      depth = Math.max(depth, envelope * (0.18 + (1 - safe) * 0.5));
  }
  return depth - rise;
}
export const driverSide = (worldSide: number) =>
  worldSide > 0 ? 'left' : 'right';
