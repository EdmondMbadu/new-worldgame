import { clamp, heightAt, roadX, smooth, type Mission } from './missions';
import { driverSide, roadSections, type RoadSection } from './road-sections';
import { routeHeading, routePoint, toWorld } from './routes';
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
  actorOffset: number;
  actorSpeed: number;
  phaseTime: number;
  yieldAmount: number;
  brakeLights: boolean;
  indicator: number;
  waterLevel: number;
  stopTime: number;
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
      minibus: 'COMMUNITY MINIBUS',
      bridge: 'SINGLE-LANE BRIDGE',
      tree: 'FALLEN TREE',
      flood: 'FLOODED CROSSING',
      gust: 'EXPOSED DESCENT',
      ridge: 'HILLSIDE SWITCHBACK',
      herd: 'LANTERN CROSSING',
      traffic: 'ONCOMING VEHICLE',
      market: 'MARKET DAY',
      lorry: 'LORRY BOGGED IN MUD',
      planks: 'PLANK CROSSING',
      breakdown: 'BROKEN-DOWN TRUCK',
      landslide: 'LANDSLIDE',
    }[s.kind],
    instruction:
      s.kind === 'market'
        ? 'People are crossing between the stalls. Walking pace through the market: under 18 km/h.'
        : s.kind === 'lorry'
          ? `A lorry is stuck on your ${driverSide(-s.safeSide)}. Crawl past on the firm ${driverSide(s.safeSide)} side, or take the left detour.`
          : s.kind === 'planks'
            ? 'Two timber runners cross the creek. Line up straight and crawl over, or take the left detour.'
            : s.kind === 'breakdown'
              ? `Branches mark a broken-down truck on your ${driverSide(-s.safeSide)}. Slow down and pass on your ${driverSide(s.safeSide)}.`
              : s.kind === 'landslide'
                ? `Earth and rock cover the road. Crawl through the marked passage on your ${driverSide(s.safeSide)}.`
                : s.kind === 'bridge'
        ? 'Wait behind the line until the truck clears. The left ridge bypass stays open.'
        : s.kind === 'washout'
          ? `Brake early. Firm strip on your ${driverSide(s.safeSide)}; left detour avoids the washout.`
          : s.kind === 'minibus'
            ? `The minibus is pulling into its stop. Ease off; pass on your ${driverSide(s.safeSide)} when it settles.`
            : s.kind === 'tree'
              ? `Brake before the branches. Take the marked ${driverSide(s.safeSide)} passage.`
              : s.kind === 'flood'
                ? `Shallow line on your ${driverSide(s.safeSide)}. Steady throttle, or take the left bypass.`
                : s.kind === 'ridge'
                  ? 'Uphill hairpin and an open drop. Brake early, stay between the reflectors, and follow the turn.'
                  : s.kind === 'herd'
                    ? 'A herder is guiding goats home. Slow down behind the lantern line; wait until they clear.'
                    : s.kind === 'traffic'
                      ? `Headlights ahead. Keep to your ${driverSide(s.safeSide)}; the driver will give you room.`
                      : 'Brake before the bend. Follow the chevrons and keep a steady line.',
    warned: false,
    entered: false,
    resolved: false,
    clean: false,
    impactAtEntry: 0,
    recoveryAtEntry: 0,
    elapsed: 0,
    state: 'waiting',
    actorZ:
      s.kind === 'bridge'
        ? s.z + s.length / 2 + 8
        : s.kind === 'minibus'
          ? s.z - 30
          : s.kind === 'traffic'
            ? s.z + 30
            : s.z,
    passedSafely: false,
    blockedFor: 0,
    actorOffset: s.kind === 'traffic' ? -s.safeSide * 2.7 : 0,
    actorSpeed: 0,
    phaseTime: 0,
    yieldAmount: 0,
    brakeLights: false,
    indicator: 0,
    waterLevel: 0,
    stopTime: 0,
  }));
}
/** Stationary vehicles: their body stands in the closed half of the road. */
export const PARKED: Partial<Record<EncounterKind, { offset: number; half: [number, number, number]; lift: number }>> = {
  lorry: { offset: 1.95, half: [1.22, 1.42, 3.6], lift: 1.5 },
  breakdown: { offset: 2.3, half: [1.02, 1.05, 2.7], lift: 1.1 },
};
/** Encounters whose actor has a physical body. */
export const SOLID_ACTORS: EncounterKind[] = ['minibus', 'bridge', 'tree', 'traffic', 'lorry', 'breakdown'];
export function warningDistance(speed: number, wet: number) {
  const v = Math.abs(speed);
  return Math.max(145, v * 3 + (v * v) / (2 * (wet > 0.4 ? 4.5 : 6)) + 20);
}
export function encounterPose(m: Mission, event: Encounter) {
  const moving = ['bridge', 'minibus', 'traffic'].includes(event.kind);
  const z = moving ? event.actorZ : event.z;
  const parked = PARKED[event.kind];
  let offset =
    event.kind === 'bridge'
      ? 0
      : moving
        ? event.actorOffset
        : parked
          ? -event.side * parked.offset
          : -event.side * 1.75;
  if (event.kind === 'bridge' && event.state === 'clearing')
    offset = -event.side * 4.3 * smooth(0, 16, event.z - event.length / 2 - z);
  if (event.kind === 'bridge' && event.state === 'clear')
    offset = event.actorOffset || -event.side * 4.3;
  const fall = smooth(0, 2.2, event.elapsed);
  let tilt = event.kind === 'tree' ? -Math.acos(fall) : 0;
  if (moving) {
    const a = routePoint(m, z - 0.25, false, offset),
      b = routePoint(m, z + 0.25, false, offset);
    tilt =
      -Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)) *
      (event.kind === 'minibus' ? 1 : -1);
  }
  if (event.kind === 'tree') offset = -event.side * (4.3 - 2.55 * fall);
  const x = roadX(m, z) + offset;
  const heading =
    routeHeading(m, z, false, offset) +
    (event.kind === 'bridge' || event.kind === 'traffic'
      ? Math.PI
      : event.kind === 'tree'
        ? (event.side * Math.PI) / 2
        : 0);
  const world = toWorld(m, x, z);
  return {
    x: world.x,
    y:
      heightAt(m, x, z) +
      (event.kind === 'tree' ? 2.55 * Math.sqrt(1 - fall * fall) : 0),
    z: world.z,
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
