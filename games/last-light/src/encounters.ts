import { clamp, heightAt, roadX, smooth, type Mission } from './missions';
import { driverSide, roadSections, type RoadSection } from './road-sections';
export type EncounterKind = RoadSection['kind'];
export type Encounter = {
  id: string;
  kind: EncounterKind;
  z: number;
  length: number;
  side: number;
  title: string;
  instruction: string;
  warned: boolean;
  entered: boolean;
  resolved: boolean;
  clean: boolean;
  impactAtEntry: number;
  recoveryAtEntry: number;
  elapsed: number;
  state: 'waiting' | 'approaching' | 'crossing' | 'clearing' | 'clear';
  actorZ: number;
  passedSafely: boolean;
  blockedFor: number;
};
export function makeEncounters(m: Mission): Encounter[] {
  return roadSections(m).map((s, i) => ({
    id: `${m.id}:${m.seed}:${i}`,
    kind: s.kind,
    z: s.z,
    length: s.length,
    side: s.safeSide,
    title: {
      washout: 'ROAD WASHED AWAY',
      minibus: 'BLOCKED ROAD',
      bridge: 'SINGLE-LANE BRIDGE',
      tree: 'FALLEN TREE',
      flood: 'FLOODED CROSSING',
      gust: 'EXPOSED DESCENT',
    }[s.kind],
    instruction:
      s.kind === 'bridge'
        ? 'Wait behind the line until the truck clears. The left ridge bypass stays open.'
        : s.kind === 'washout'
          ? `Brake early. Firm strip on your ${driverSide(s.safeSide)}; left detour avoids the washout.`
          : s.kind === 'minibus'
            ? `Centre blocked. Slow down and pass on your ${driverSide(s.safeSide)}.`
            : s.kind === 'tree'
              ? `Brake before the branches. Take the marked ${driverSide(s.safeSide)} passage.`
              : s.kind === 'flood'
                ? `Shallow line on your ${driverSide(s.safeSide)}. Steady throttle, or take the left bypass.`
                : 'Brake before the bend. Follow the chevrons and keep a steady line.',
    warned: false,
    entered: false,
    resolved: false,
    clean: false,
    impactAtEntry: 0,
    recoveryAtEntry: 0,
    elapsed: 0,
    state: 'waiting',
    actorZ: s.kind === 'bridge' ? s.z + s.length / 2 + 8 : s.z,
    passedSafely: false,
    blockedFor: 0,
  }));
}
export function warningDistance(speed: number, wet: number) {
  const v = Math.abs(speed);
  return Math.max(145, v * 3 + (v * v) / (2 * (wet > 0.4 ? 4.5 : 6)) + 20);
}
export function encounterPose(m: Mission, event: Encounter) {
  const z = event.kind === 'bridge' ? event.actorZ : event.z;
  let offset =
    event.kind === 'bridge'
      ? 0
      : event.kind === 'minibus'
        ? -event.side * 0.35
        : -event.side * 1.75;
  if (event.kind === 'bridge' && event.state === 'clearing')
    offset = -event.side * 4.3 * smooth(0, 16, event.z - event.length / 2 - z);
  if (event.kind === 'bridge' && event.state === 'clear')
    offset = -event.side * 4.3;
  const fall = smooth(0, 2.2, event.elapsed);
  const tilt = event.kind === 'tree' ? -Math.acos(fall) : 0;
  if (event.kind === 'tree') offset = -event.side * (4.3 - 2.55 * fall);
  const x = roadX(m, z) + offset;
  const heading =
    Math.atan2(roadX(m, z + 1) - roadX(m, z - 1), 2) +
    (event.kind === 'bridge'
      ? Math.PI
      : event.kind === 'tree'
        ? (event.side * Math.PI) / 2
        : 0.12);
  return {
    x,
    y:
      heightAt(m, x, z) +
      (event.kind === 'tree' ? 2.55 * Math.sqrt(1 - fall * fall) : 0),
    z,
    heading,
    tilt,
    rotation: {
      x: Math.cos(heading / 2) * Math.sin(tilt / 2),
      y: Math.sin(heading / 2) * Math.cos(tilt / 2),
      z: -Math.sin(heading / 2) * Math.sin(tilt / 2),
      w: Math.cos(heading / 2) * Math.cos(tilt / 2),
    },
  };
}
export function windForce(event: Encounter) {
  return event.kind === 'gust' && event.entered && !event.resolved
    ? event.side * Math.sin(clamp(event.elapsed / 5, 0, 1) * Math.PI) * 800
    : 0;
}
