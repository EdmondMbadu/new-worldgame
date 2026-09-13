import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  GameEngine,
  emptyInput,
  initPhysics,
  type Result,
} from '../src/engine';
import { MISSIONS, heightAt, roadX, roadY, pathLength } from '../src/missions';
import { makeEncounters } from '../src/encounters';
import { updateTraffic, herdPose } from '../src/traffic';
import {
  ridgeAt,
  roadWidth,
  routePoint,
  toRoute,
  toWorld,
  worldHeight,
} from '../src/routes';
import { driveInput } from '../src/qa-driver';
import { bestKey, freshSave, parseSave, recordResult } from '../src/save';
import { ROAD_REVISION, surfaceAt } from '../src/vehicle';

beforeAll(initPhysics);

describe('a physical hillside route', () => {
  it('has a genuine reversal of world Z and an exact, unambiguous station inverse', () => {
    for (const m of MISSIONS) {
      let reversals = 0;
      for (let s = 280; s < 451; s += 0.7) {
        for (const offset of [-30, -4, 0, 4, 30]) {
          const w = toWorld(m, roadX(m, s) + offset, s),
            r = toRoute(m, w.x, w.z);
          expect(r.x).toBeCloseTo(roadX(m, s) + offset, 8);
          expect(r.z).toBeCloseTo(s, 8);
        }
        if (routePoint(m, s + 0.7).z < routePoint(m, s).z) reversals++;
      }
      expect(reversals).toBeGreaterThan(20);
      expect(roadY(m, 365)).toBeGreaterThan(roadY(m, 275) + 10);
      expect(pathLength(m, 340)).toBeGreaterThan(pathLength(m, 370));
    }
  });

  it('renders and collides with the same road deck and 50+ metre drop', () => {
    const m = MISSIONS[0],
      e = new GameEngine(m);
    try {
      for (const s of [315, 345, 365, 395, 420]) {
        for (const offset of [0, -roadWidth(m, s) - 8]) {
          const p = routePoint(m, s, false, offset);
          e.world.updateSceneQueries();
          const hit = e.world.castRay(
            new RAPIER.Ray({ x: p.x, y: 100, z: p.z }, { x: 0, y: -1, z: 0 }),
            200,
            true,
          );
          expect(hit).not.toBeNull();
          expect(100 - hit!.toi).toBeCloseTo(p.y, 0);
          expect(worldHeight(m, p.x, p.z)).toBeCloseTo(p.y, 8);
        }
      }
      const deck = routePoint(m, 365),
        valley = routePoint(m, 365, false, -roadWidth(m, 365) - 10);
      expect(deck.y - valley.y).toBeGreaterThan(50);
    } finally {
      e.dispose();
    }
  });

  it('lets a truck fall, then recovers once to the last firm checkpoint with a penalty', () => {
    const m = MISSIONS[0],
      e = new GameEngine(m);
    try {
      const p = routePoint(m, 365, false, -roadWidth(m, 365) - 9);
      e.body.setTranslation({ ...p, y: roadY(m, 365) + 1 }, true);
      e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      e.safeZ = 280;
      e.phase = 'driving';
      let lowest = 100;
      for (let i = 0; i < 220 && e.recoveries === 0; i++) {
        e.step(1 / 60, emptyInput());
        lowest = Math.min(lowest, e.position.y);
      }
      expect(lowest).toBeLessThan(roadY(m, 365) - 7);
      expect(e.recoveries).toBe(1);
      expect(e.progress).toBeCloseTo(280, 0);
      expect(e.time).toBeLessThan(e.initial - 9);
      expect(e.integrity).toBeGreaterThanOrEqual(90);
      expect(e.phase).toBe('driving');
    } finally {
      e.dispose();
    }
  });

  it('keeps normal progress, distance and checkpoints stable through the backwards leg', () => {
    const e = new GameEngine(MISSIONS[0]);
    try {
      let previousProgress = 0,
        previousZ = 0,
        previousDistance = e.distance,
        backwardsFrames = 0;
      for (let i = 0; i < 7000 && e.progress < 450; i++) {
        e.step(1 / 60, driveInput(e));
        if (ridgeAt(e.mission, e.progress) > 0.4) {
          if (e.position.z < previousZ) backwardsFrames++;
          expect(e.progress).toBeGreaterThan(previousProgress - 0.1);
          expect(e.distance).toBeLessThanOrEqual(previousDistance + 0.01);
          expect(ridgeAt(e.mission, e.safeZ)).toBeLessThan(0.05);
        }
        previousProgress = e.progress;
        previousZ = e.position.z;
        previousDistance = e.distance;
      }
      expect(e.progress).toBeGreaterThan(445);
      expect(backwardsFrames).toBeGreaterThan(100);
      expect(e.recoveries).toBe(0);
    } finally {
      e.dispose();
    }
  });
});

describe('traffic with room to react', () => {
  const m = { ...MISSIONS[0], bend: 0, mud: [] };
  it('signals before pulling into the stop and brakes instead of sweeping through an occupied lane', () => {
    const e = makeEncounters(m).find((e) => e.kind === 'minibus')!;
    const driver = { x: 0, z: e.z - 90, speed: 6 };
    for (let i = 0; i < 600 && e.actorZ < e.z - 11; i++)
      updateTraffic(e, m, driver, 1 / 60);
    expect(e.indicator).toBe(-e.side);
    expect(e.actorZ).toBeGreaterThan(e.z - 30);
    const before = { z: e.actorZ, offset: e.actorOffset };
    for (let i = 0; i < 180; i++)
      updateTraffic(e, m, { x: -e.side * 3.25, z: e.actorZ, speed: 0 }, 1 / 60);
    expect(e.actorZ).toBe(before.z);
    expect(e.actorOffset).toBe(before.offset);
    expect(e.brakeLights).toBe(true);
    for (let i = 0; i < 1100; i++) updateTraffic(e, m, driver, 1 / 60);
    expect(e.state).toBe('clear');
    expect(Math.abs(e.actorOffset)).toBeGreaterThan(3);
  });

  it('oncoming traffic holds for a stopped player and resumes after the lane clears', () => {
    const mission = { ...MISSIONS[1], bend: 0 };
    const e = makeEncounters(mission).find((e) => e.kind === 'traffic')!;
    const z = e.actorZ;
    for (let i = 0; i < 240; i++)
      updateTraffic(
        e,
        mission,
        { x: -e.side * 3.3, z: z - 14, speed: 0 },
        1 / 60,
      );
    expect(e.actorZ).toBe(z);
    expect(e.brakeLights).toBe(true);
    for (let i = 0; i < 1000; i++)
      updateTraffic(
        e,
        mission,
        { x: e.side * 3, z: e.z - 55, speed: 6 },
        1 / 60,
      );
    expect(e.state).toBe('clear');
  });
  it('rewards a careful centre-line pass once the minibus has fully pulled aside', () => {
    const e = new GameEngine(m);
    try {
      const bus = e.encounters.find((event) => event.kind === 'minibus')!;
      const p = routePoint(m, bus.z - 70);
      e.body.setTranslation({ ...p, y: p.y + 0.9 }, true);
      e.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      e.phase = 'driving';
      for (let i = 0; i < 1100; i++) e.step(1 / 60, emptyInput());
      expect(bus.state).toBe('clear');
      for (let i = 0; i < 1900 && !bus.resolved; i++)
        e.step(1 / 60, {
          ...emptyInput(),
          throttle: e.speed < 7 ? 0.5 : 0,
          brake: e.speed > 7.5 ? 0.4 : 0,
        });
      expect(bus.resolved).toBe(true);
      expect(bus.clean).toBe(true);
      expect(e.impacts).toBe(0);
    } finally {
      e.dispose();
    }
  });

  it('the herder waits for fast traffic, admits a slow approach and clears every animal in finite time', () => {
    const e = makeEncounters(m).find((e) => e.kind === 'herd')!;
    for (let i = 0; i < 90; i++)
      updateTraffic(e, m, { x: 0, z: e.z - 45, speed: 20 }, 1 / 60);
    expect(e.state).toBe('waiting');
    updateTraffic(e, m, { x: 0, z: e.z - 45, speed: 6 }, 1 / 60);
    expect(e.state).toBe('crossing');
    const before = herdPose(m, e, 0);
    for (let i = 0; i < 300; i++)
      updateTraffic(e, m, { x: 0, z: e.z - 28, speed: 0 }, 1 / 60);
    expect(herdPose(m, e, 0).x).not.toBe(before.x);
    for (let i = 0; i < 320; i++)
      updateTraffic(e, m, { x: 0, z: e.z - 28, speed: 0 }, 1 / 60);
    expect(e.state).toBe('clear');
    for (let i = 0; i < 3; i++)
      expect(Math.abs(herdPose(m, e, i).offset)).toBeGreaterThan(7);
  });

  it('a driver who ignores the lantern loses the clean pass without animals being sent into their path', () => {
    const e = makeEncounters(m).find((e) => e.kind === 'herd')!;
    e.passedSafely = true;
    updateTraffic(e, m, { x: 0, z: e.z - 12, speed: 19 }, 1 / 60);
    expect(e.passedSafely).toBe(false);
    expect(e.state).toBe('waiting');
    expect(Math.abs(herdPose(m, e, 0).offset)).toBeGreaterThan(7);
  });

  it('runoff rises before commitment, holds its level during crossing and changes tire response', () => {
    const mission = MISSIONS[1],
      e = makeEncounters(mission).find((e) => e.kind === 'flood')!;
    e.elapsed = 8;
    updateTraffic(e, mission, { x: 0, z: e.z - 100, speed: 10 }, 1 / 60);
    expect(e.waterLevel).toBeGreaterThan(0.1);
    const level = e.waterLevel;
    e.elapsed = 20;
    updateTraffic(e, mission, { x: 0, z: e.z - 20, speed: 5 }, 1 / 60);
    expect(e.waterLevel).toBe(level);
    const x = roadX(mission, e.z);
    expect(surfaceAt(mission, x, e.z, level).speed).toBeLessThan(
      surfaceAt(mission, x, e.z, 0).speed,
    );
  });
});

describe('fair records and recovery practice', () => {
  const result: Result = {
    mission: 0,
    mode: 'standard',
    score: 1600,
    stars: 3,
    integrity: 100,
    remaining: 30,
    lives: 3,
    revision: ROAD_REVISION,
    variant: 0,
    clean: 4,
    encounters: 4,
  };
  it('keeps revision 3 records separate and excludes practice deliveries from saves and unlocks', () => {
    const old = { ...result, revision: 3 };
    const save = recordResult(recordResult(freshSave(), old), result);
    expect(recordResult(save, { ...result, mission: 1, practice: true })).toBe(
      save,
    );
    const loaded = parseSave(JSON.stringify(save));
    expect(loaded.best[bestKey(0, 'standard', 0, 3)]).toEqual(old);
    expect(loaded.best[bestKey(0, 'standard')]).toEqual(result);
    expect(loaded.completed).toEqual([0]);
  });

  it('restarts from a checkpoint in clearly separated practice mode', () => {
    const e = new GameEngine(MISSIONS[0]);
    try {
      e.safeZ = 280;
      e.phase = 'failed';
      e.integrity = 0;
      e.time = 0;
      e.practiceFromCheckpoint();
      expect(e.practice).toBe(true);
      expect(e.phase).toBe('driving');
      expect(e.progress).toBeCloseTo(280, 3);
      expect(e.integrity).toBe(100);
      expect(e.time).toBe(e.initial);
      const actors = JSON.stringify(e.encounters),
        position = { ...e.position };
      e.pause();
      for (let i = 0; i < 120; i++) e.step(1 / 60, emptyInput());
      expect(e.position).toEqual(position);
      expect(JSON.stringify(e.encounters)).toBe(actors);
    } finally {
      e.dispose();
    }
  });
  it('remembers the checkpoint branch and avoids spawning inside traffic', () => {
    const m = MISSIONS[0],
      e = new GameEngine(m);
    try {
      e.safeZ = 510;
      e.safeAlt = true;
      e.isAlt = false;
      e.phase = 'driving';
      e.recover();
      // A newly populated road may occupy the old exact checkpoint. Recovery
      // must remain on its branch and choose a clear point at or behind it.
      const ridge = routePoint(m, e.progress, true);
      expect(e.progress).toBeLessThanOrEqual(510);
      expect(e.traffic.occupied(e.position.x, e.position.z, 12)).toBe(false);
      expect(
        Math.hypot(e.position.x - ridge.x, e.position.z - ridge.z),
      ).toBeLessThan(0.02);
      expect(e.isAlt).toBe(true);
      const bus = e.encounters.find((event) => event.kind === 'minibus')!;
      e.safeZ = bus.actorZ;
      e.safeAlt = false;
      e.recover();
      expect(e.progress).toBeLessThan(bus.actorZ - 9);
    } finally {
      e.dispose();
    }
  });
});
