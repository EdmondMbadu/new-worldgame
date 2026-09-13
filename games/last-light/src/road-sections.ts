import type { Mission } from './missions';

export type RoadSection = {
  kind:
    | 'washout'
    | 'minibus'
    | 'bridge'
    | 'tree'
    | 'flood'
    | 'gust'
    | 'ridge'
    | 'herd'
    | 'traffic';
  z: number;
  length: number;
  safeSide: number; // +X is the driver's left when travelling forward along +Z.
};
const cache = new WeakMap<Mission, RoadSection[]>();
export function roadSections(m: Mission): RoadSection[] {
  const old = cache.get(m);
  if (old) return old;
  const side = m.seed % 2 ? 1 : -1;
  const sections: RoadSection[] = [
    { kind: 'washout', z: 225, length: 24, safeSide: side },
    { kind: 'ridge', z: 365, length: 145, safeSide: 1 },
    {
      kind: m.bridge ? 'bridge' : 'minibus',
      z: m.bridge ? (m.bridge[0] + m.bridge[1]) / 2 : 525,
      length: m.bridge ? m.bridge[1] - m.bridge[0] : 12,
      safeSide: m.bridge ? -side : 1,
    },
    {
      kind: m.id === 1 || m.id === 4 ? 'flood' : 'herd',
      z: m.id === 0 ? 810 : 855,
      length: 30,
      safeSide: -side,
    },
  ];
  if (m.id > 0)
    sections.push({
      kind: m.id === 3 ? 'gust' : m.id === 4 ? 'tree' : 'traffic',
      z: m.length - 170,
      length: 12,
      safeSide: m.id === 1 || m.id === 2 ? -1 : side,
    });
  if (m.id === 1 || m.id === 4)
    sections.push({ kind: 'herd', z: 705, length: 16, safeSide: side });
  sections.sort((a, b) => a.z - b.z);
  cache.set(m, sections);
  return sections;
}
export function branchSections(m: Mission): [number, number][] {
  return [
    [135, 285],
    m.fork,
    ...roadSections(m)
      .filter((s) => s.kind === 'flood')
      .map((s) => [s.z - 75, s.z + 75] as [number, number]),
  ];
}
export function sectionEnvelope(z: number, centre: number, length: number) {
  const t = Math.max(
    0,
    Math.min(1, (length / 2 + 5 - Math.abs(z - centre)) / 5),
  );
  return t * t * (3 - 2 * t);
}
export function roadDepression(m: Mission, offset: number, z: number) {
  let depth = 0;
  for (const s of roadSections(m)) {
    const envelope = sectionEnvelope(z, s.z, s.length);
    if (!envelope || Math.abs(offset) > 7) continue;
    const safe = Math.max(0, Math.min(1, (offset * s.safeSide - 1.2) / 0.9));
    if (s.kind === 'washout')
      depth = Math.max(depth, envelope * (1 - safe) * 1.25);
    if (s.kind === 'flood')
      depth = Math.max(depth, envelope * (0.18 + (1 - safe) * 0.5));
  }
  return depth;
}
export const driverSide = (worldSide: number) =>
  worldSide > 0 ? 'left' : 'right';
