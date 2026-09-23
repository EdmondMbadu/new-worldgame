import { beforeAll, describe, expect, it } from 'vitest';
import { GameEngine, emptyInput, initPhysics, type Input } from '../src/engine';
import {
  clamp,
  heightAt,
  MISSIONS,
  missionVariant,
  rainAt,
  riverLevel,
  riverSpan,
  riverX,
  roadDistance,
  roadX,
  roadY,
  type Mission,
  type SectionKind,
} from '../src/missions';
import {
  branchSections,
  onPlank,
  PLANK_CENTRE,
  roadSections,
  slideHeight,
} from '../src/road-sections';
import { ridgeAt, roadWidth, routeHeading, routePoint } from '../src/routes';
import { makeEncounters } from '../src/encounters';
import { updateTraffic } from '../src/traffic';
import { trafficLaneOffset } from '../src/traffic-flow';
import { surfaceAt, ROAD_REVISION } from '../src/vehicle';
import { marketStalls, slideRocks } from '../src/set-pieces';
import { bestKey, freshSave, parseSave, recordResult } from '../src/save';

beforeAll(() => initPhysics());

const SIGNATURE: SectionKind[] = ['market', 'lorry', 'planks', 'breakdown', 'landslide'];
const section = (m: Mission, kind: SectionKind) => roadSections(m).find((s) => s.kind === kind)!;

/** Park routine traffic at the far ends of its lanes so a test meets only its set piece. */
function clearTraffic(e: GameEngine) {
  for (const car of e.traffic.cars) {
    car.distance = car.direction > 0 ? 0 : car.path.total;
    const sample = car.path.sample(car.distance);
    car.pose = sample.pose;
    car.previous = { ...sample.pose };
    car.station = sample.station;
    car.hold = 1e9;
    car.speed = 0;
    // Move the kinematic body too, so it does not sweep across the road next step.
    (e as unknown as { trafficBodies: { setTranslation(p: object, wake: boolean): void }[] }).trafficBodies[car.id].setTranslation(sample.pose, false);
  }
}
/** Put the truck on the road at a station and lateral offset, rolling forward. */
function place(e: GameEngine, station: number, offset: number, speed: number) {
  const m = e.mission;
  const p = routePoint(m, station, false, offset),
    a = routeHeading(m, station, false, offset);
  e.body.setTranslation({ x: p.x, y: p.y + 1.05, z: p.z }, true);
  e.body.setRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) }, true);
  e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  e.body.setLinvel({ x: Math.sin(a) * speed, y: 0, z: Math.cos(a) * speed }, true);
  e.phase = 'driving';
}
/** An ordinary driver holding a lateral line at a steady speed. */
function hold(e: GameEngine, offset: number, speed: number): Input {
  const m = e.mission;
  const target = routePoint(m, e.progress + 5 + Math.abs(e.speed) * 0.5, false, offset);
  let error = Math.atan2(target.x - e.position.x, target.z - e.position.z) - e.heading;
  while (error > Math.PI) error -= Math.PI * 2;
  while (error < -Math.PI) error += Math.PI * 2;
  return {
    steer: clamp(-error * 2.5, -1, 1),
    throttle: e.speed < speed - 0.1 ? 0.7 : 0,
    brake: e.speed > speed + 0.4 ? 0.6 : 0,
    action: false,
  };
}
function drivePast(e: GameEngine, kind: SectionKind, offset: number, speed: number, lead = 45) {
  const s = section(e.mission, kind);
  clearTraffic(e);
  place(e, s.z - lead, offset, speed);
  const event = e.encounters.find((x) => x.kind === kind)!;
  for (let i = 0; i < 60 * 60 && !event.resolved && e.recoveries === 0; i++) e.step(1 / 60, hold(e, offset, speed));
  return event;
}

describe('five chapters, five places', () => {
  it('gives every chapter its own signature moment, road shape and width', () => {
    MISSIONS.forEach((m, i) => {
      const kinds = roadSections(m).map((s) => s.kind);
      // Each signature belongs to exactly one chapter.
      SIGNATURE.forEach((kind, j) => expect(kinds.includes(kind)).toBe(i === j));
    });
    expect(new Set(MISSIONS.map((m) => m.region)).size).toBe(5);
    expect(new Set(MISSIONS.map((m) => m.width)).size).toBeGreaterThanOrEqual(4);
    expect(MISSIONS.map((m) => m.ridges.length)).toEqual([0, 1, 1, 2, 1]);
    for (let a = 0; a < MISSIONS.length; a++)
      for (let b = a + 1; b < MISSIONS.length; b++) {
        let sum = 0,
          n = 0;
        for (let z = 0; z < 1000; z += 5, n++) sum += (roadX(MISSIONS[a], z) - roadX(MISSIONS[b], z)) ** 2;
        expect(Math.sqrt(sum / n)).toBeGreaterThan(8);
      }
  });

  it('keeps every authored moment, detour and fork off the switchbacks', () => {
    for (const m of MISSIONS) {
      for (const s of roadSections(m))
        if (s.kind !== 'ridge') {
          expect(ridgeAt(m, s.z - s.length / 2 - 30)).toBe(0);
          expect(ridgeAt(m, s.z + s.length / 2 + 30)).toBe(0);
        }
      for (const [a, b] of branchSections(m))
        for (let z = a; z <= b; z += 2) expect(ridgeAt(m, z)).toBe(0);
      // Switchbacks are far enough apart that their bends never overlap.
      for (let i = 1; i < m.ridges.length; i++) expect(m.ridges[i] - m.ridges[i - 1]).toBeGreaterThan(180);
    }
  });

  it('brings the rain in during the forest drive, and the road gets slicker', () => {
    const m = MISSIONS[1];
    expect(rainAt(m, 0)).toBeLessThan(0.1);
    expect(rainAt(m, m.length)).toBeCloseTo(m.rain, 5);
    let last = -1;
    for (let z = 0; z <= m.length; z += 20) {
      expect(rainAt(m, z)).toBeGreaterThanOrEqual(last);
      last = rainAt(m, z);
    }
    const early = surfaceAt(m, roadX(m, 60), 60),
      late = surfaceAt(m, roadX(m, 1100), 1100);
    expect(late.grip).toBeLessThan(early.grip);
    expect(late.wet).toBeGreaterThan(early.wet);
    // Chapters without arriving weather keep a steady sky.
    expect(rainAt(MISSIONS[2], 0)).toBe(rainAt(MISSIONS[2], MISSIONS[2].length));
  });

  it('keeps revision 5 records separate from the new roads', () => {
    expect(ROAD_REVISION).toBe(6);
    const old = {
      mission: 2,
      mode: 'standard' as const,
      score: 1700,
      stars: 3,
      integrity: 100,
      remaining: 90,
      lives: MISSIONS[2].lives,
      revision: 5,
      variant: 0,
      clean: 6,
      encounters: 9,
    };
    const next = { ...old, revision: ROAD_REVISION, score: 1650 };
    const save = parseSave(JSON.stringify(recordResult(recordResult(freshSave(), old), next)));
    expect(save.best[bestKey(2, 'standard', 0, 5)]).toEqual(old);
    expect(save.best[bestKey(2, 'standard')]).toEqual(next);
  });
});

describe('market day', () => {
  const m = MISSIONS[0];
  it('lines the verges with stalls and leaves the road open', () => {
    const stalls = marketStalls(m);
    expect(stalls.length).toBeGreaterThanOrEqual(12);
    for (const s of stalls) expect(roadDistance(m, s.x, s.z) - s.hx).toBeGreaterThan(roadWidth(m, s.z) + 0.5);
  });
  it('people cross while the market is calm and wait at the verge for a hurrying truck', () => {
    const e = makeEncounters(m).find((x) => x.kind === 'market')!;
    updateTraffic(e, m, { x: 0, z: e.z - 50, speed: 10 }, 1 / 60);
    expect(e.state).toBe('waiting');
    updateTraffic(e, m, { x: 0, z: e.z - 50, speed: 3 }, 1 / 60);
    expect(e.state).toBe('crossing');
    updateTraffic(e, m, { x: 0, z: e.z - 50, speed: 3, occupied: true }, 1 / 60);
    expect(e.state).toBe('waiting');
  });
  it('a walking-pace pass is clean; a hurried one is not', () => {
    const slow = new GameEngine(m);
    try {
      const event = drivePast(slow, 'market', -1.2, 4);
      expect(event.resolved).toBe(true);
      expect(event.clean).toBe(true);
      expect(slow.impacts).toBe(0);
    } finally {
      slow.dispose();
    }
    const fast = new GameEngine(m);
    try {
      const event = drivePast(fast, 'market', -1.2, 11);
      expect(event.resolved).toBe(true);
      expect(event.clean).toBe(false);
    } finally {
      fast.dispose();
    }
  });
});

describe('the plank crossing', () => {
  const m = MISSIONS[2];
  it('carries the wheels on two runners over a real creek', () => {
    const s = section(m, 'planks');
    for (const z of [s.z - 5, s.z, s.z + 5]) {
      const x = roadX(m, z);
      for (const side of [-1, 1]) {
        expect(onPlank(side * PLANK_CENTRE)).toBe(1);
        // The runners sit at the level of the road deck.
        expect(Math.abs(heightAt(m, x + side * PLANK_CENTRE, z) - roadY(m, z))).toBeLessThan(0.2);
        // Between and outside the runners the creek is open.
        expect(heightAt(m, x + side * PLANK_CENTRE, z) - heightAt(m, x + side * 2.6, z)).toBeGreaterThan(0.4);
      }
      expect(heightAt(m, x + PLANK_CENTRE, z) - heightAt(m, x, z)).toBeGreaterThan(0.4);
      expect(surfaceAt(m, x + PLANK_CENTRE, z).name).toBe('Bridge');
      expect(surfaceAt(m, x + 2.6, z).name).toBe('Water');
    }
  });
  it('a straight, slow crossing is clean', () => {
    const e = new GameEngine(m);
    try {
      const event = drivePast(e, 'planks', 0, 2.6, 30);
      expect(event.resolved).toBe(true);
      expect(event.clean).toBe(true);
      expect(e.integrity).toBe(100);
    } finally {
      e.dispose();
    }
  });
  it('wheels off the runners drop into the creek and lose the clean pass', () => {
    const e = new GameEngine(m);
    try {
      const event = drivePast(e, 'planks', 1.05, 2.6, 30);
      expect(event.clean).toBe(false);
    } finally {
      e.dispose();
    }
  });
  it('rushing the crossing loses the clean pass', () => {
    const e = new GameEngine(m);
    try {
      const event = drivePast(e, 'planks', 0, 8, 30);
      expect(event.clean).toBe(false);
    } finally {
      e.dispose();
    }
  });
});

describe('vehicles and debris that close half the road', () => {
  for (const [id, kind, closed, open, safe] of [
    [1, 'lorry', 1.95, 2.6, 5],
    [3, 'breakdown', 2.3, 2.2, 7],
    [4, 'landslide', 2.5, 2.9, 4.5],
  ] as const)
    describe(kind, () => {
      const m = MISSIONS[id];
      it(`is solid: driving into the closed side hurts the cargo`, () => {
        const e = new GameEngine(m);
        try {
          const s = section(m, kind);
          const event = drivePast(e, kind, -s.safeSide * closed, 9, 40);
          expect(e.impacts + e.recoveries).toBeGreaterThan(0);
          expect(event.clean).toBe(false);
        } finally {
          e.dispose();
        }
      });
      it(`can be passed cleanly on the marked side at a careful pace`, () => {
        const e = new GameEngine(m);
        try {
          const s = section(m, kind);
          const event = drivePast(e, kind, s.safeSide * open, safe, 60);
          expect(event.resolved).toBe(true);
          expect(event.clean).toBe(true);
          expect(e.impacts).toBe(0);
        } finally {
          e.dispose();
        }
      });
    });
  it('buries only the closed side of the road under the landslide, and flips with fresh tracks', () => {
    const m = MISSIONS[4],
      s = section(m, 'landslide');
    expect(slideHeight(s, -s.safeSide * 2, s.z)).toBeGreaterThan(1);
    expect(slideHeight(s, s.safeSide * 1.2, s.z)).toBe(0);
    for (const rock of slideRocks(m)) expect((rock.x - roadX(m, rock.z)) * s.safeSide + rock.radius).toBeLessThan(0);
    expect(section(missionVariant(m, 1), 'landslide').safeSide).toBe(-s.safeSide);
  });
  it('sends routine traffic single file past a blocker, but only right beside it', () => {
    const m = MISSIONS[4];
    for (const kind of ['landslide', 'tree'] as const) {
      const s = section(m, kind);
      for (const direction of [-1, 1]) {
        expect(trafficLaneOffset(m, s.z, direction)).toBeCloseTo(s.safeSide * 3.25, 5);
        expect(trafficLaneOffset(m, s.z + 45, direction)).toBeCloseTo(-direction * 2.35, 5);
        expect(trafficLaneOffset(m, s.z - 45, direction)).toBeCloseTo(-direction * 2.35, 5);
      }
    }
  });
});

describe('the river', () => {
  const m = MISSIONS[2];
  const dry = { ...m, river: undefined };
  it('runs beside the road without touching the drivable deck, and passes under the bridge', () => {
    const [from, to] = riverSpan(m)!;
    const [b0, b1] = m.bridge!;
    for (let z = from + 60; z < to; z += 7)
      for (const offset of z > b0 - 30 && z < b1 + 30 ? [0] : [-roadWidth(m, z), 0, roadWidth(m, z)]) {
        const x = roadX(m, z) + offset;
        expect(heightAt(m, x, z)).toBeCloseTo(heightAt(dry, x, z), 9);
      }
    const mid = (m.bridge![0] + m.bridge![1]) / 2;
    expect(Math.abs(riverX(m, mid)! - roadX(m, mid))).toBeLessThan(1);
    // Well clear of the road, the bed lies under the water and the banks above it.
    let checked = 0;
    for (let z = from + 40; z < to - 70; z += 11) {
      const r = riverX(m, z)!;
      if (ridgeAt(m, z) > 0 || roadDistance(m, r, z) < roadWidth(m, z) + 30) continue;
      checked++;
      expect(heightAt(m, r, z)).toBeLessThan(riverLevel(m, z) - 1);
      const bank = r + Math.sign(r - roadX(m, z)) * (m.river!.width / 2 + 2);
      expect(heightAt(m, bank, z)).toBeGreaterThan(riverLevel(m, z));
    }
    expect(checked).toBeGreaterThan(10);
  });
});
