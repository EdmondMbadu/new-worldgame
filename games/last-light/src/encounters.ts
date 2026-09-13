import {
  clamp,
  heightAt,
  random,
  roadX,
  smooth,
  type Mission,
} from './missions';

export type EncounterKind = 'minibus' | 'oncoming' | 'rockfall' | 'gust';
export type Encounter = {
  id: string;
  kind: EncounterKind;
  z: number;
  side: number;
  title: string;
  instruction: string;
  warned: boolean;
  entered: boolean;
  resolved: boolean;
  clean: boolean;
  impactAtEntry: number;
  elapsed: number;
};

export function makeEncounters(m: Mission): Encounter[] {
  const rng = random(m.seed + 731);
  const kinds: EncounterKind[] =
    m.id === 0
      ? ['minibus', 'gust']
      : m.id === 1
        ? ['minibus', 'oncoming', 'gust']
        : m.id === 2
          ? ['minibus', 'oncoming', 'rockfall']
          : ['minibus', 'rockfall', 'oncoming', 'gust'];
  const positions =
    m.id < 3 ? [350, 750, m.length - 180] : [345, 715, 945, m.length - 170];
  return kinds
    .map((kind, i) => {
      const side = rng() > 0.5 ? 1 : -1;
      const title = {
        minibus: 'STOPPED MINIBUS',
        oncoming: 'ONCOMING VEHICLE',
        rockfall: 'LOOSE ROCKS',
        gust: 'EXPOSED RIDGE',
      }[kind];
      const instruction =
        kind === 'minibus'
          ? `Pass on the ${side > 0 ? 'left' : 'right'}. Leave room for the crew.`
          : kind === 'oncoming'
            ? `Keep ${side > 0 ? 'left' : 'right'}. The other driver is yielding.`
            : kind === 'rockfall'
              ? `Falling stones on the ${side > 0 ? 'right' : 'left'}. Take the clear line.`
              : 'Watch the wind in the trees. Keep a steady line.';
      return {
        id: `${m.id}:${m.seed}:${i}`,
        kind,
        z: positions[i],
        side,
        title,
        instruction,
        warned: false,
        entered: false,
        resolved: false,
        clean: false,
        impactAtEntry: 0,
        elapsed: 0,
      };
    })
    .sort((a, b) => a.z - b.z);
}

export function warningDistance(speed: number, wet: number) {
  const v = Math.abs(speed);
  return Math.max(110, v * 3 + (v * v) / (2 * (wet > 0.4 ? 4.5 : 6)) + 18);
}

// All moving visuals and colliders use this one trajectory. Time advances only in physics steps.
export function encounterPose(m: Mission, event: Encounter) {
  let z = event.z;
  let offset = event.side * 3.15;
  let lift = 0;
  if (event.kind === 'oncoming') z -= Math.min(28, event.elapsed * 3.2);
  if (event.kind === 'rockfall') {
    const fall = smooth(0, 2.2, event.elapsed);
    offset = event.side * (8 - fall * 4.8);
    lift = (1 - fall) * 5 + Math.sin(fall * Math.PI * 3) * (1 - fall) * 0.3;
  }
  const x = roadX(m, z) + offset;
  return {
    x,
    y: heightAt(m, x, z) + lift,
    z,
    heading:
      Math.atan2(roadX(m, z + 1) - roadX(m, z - 1), 2) +
      (event.kind === 'oncoming' ? Math.PI : 0),
  };
}

export function windForce(event: Encounter) {
  return event.kind === 'gust' && event.entered && !event.resolved
    ? event.side * Math.sin(clamp(event.elapsed / 5, 0, 1) * Math.PI) * 230
    : 0;
}
