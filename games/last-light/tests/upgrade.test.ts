import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameEngine, initPhysics, emptyInput } from '../src/engine';
import {
  MISSIONS,
  missionVariant,
  obstacles,
  heightAt,
  roadX,
} from '../src/missions';
import { driveInput } from '../src/qa-driver';
import { impactDamage, surfaceAt, ROAD_REVISION } from '../src/vehicle';
import { makeEncounters, warningDistance } from '../src/encounters';
import {
  bestKey,
  freshSave,
  parseSave,
  recordResult,
  livesSaved,
} from '../src/save';

beforeAll(() => initPhysics());
describe('faster driving and meaningful surfaces', () => {
  it('accelerates beyond 50 km/h, then brakes to a stop without cargo damage', () => {
    const mission = { ...MISSIONS[0], bend: 0, mud: [] };
    const e = new GameEngine(mission);
    try {
      for (let i = 0; i < 360; i++)
        e.step(1 / 60, { ...emptyInput(), throttle: 1 });
      expect(e.speed * 3.6).toBeGreaterThan(50);
      expect(e.speed * 3.6).toBeLessThan(90);
      const from = e.position.z;
      for (let i = 0; i < 180 && e.speed > 0.4; i++)
        e.step(1 / 60, { ...emptyInput(), brake: 1 });
      expect(e.speed).toBeLessThan(0.5);
      expect(e.position.z - from).toBeLessThan(50);
      expect(e.integrity).toBe(100);
    } finally {
      e.dispose();
    }
  });
  it('gives separate wheels different, smoothly changing traction at a mud boundary', () => {
    const m = MISSIONS[1],
      z = 200,
      x = roadX(m, z);
    const firm = surfaceAt(m, x + 7, z),
      mud = surfaceAt(m, x + 4, z);
    expect(mud.name).toBe('Mud');
    expect(mud.grip).toBeLessThan(firm.grip);
    const before = surfaceAt(m, x, 179.99),
      after = surfaceAt(m, x, 180.01);
    expect(Math.abs(before.grip - after.grip)).toBeLessThan(0.02);
  });
  it('puts rut depressions in the same terrain used for rendering and collision', () => {
    const m = MISSIONS[0],
      rut = obstacles(m).find((o) => o.kind === 'rut')!;
    const comparison = { ...m, seed: m.seed + 420 };
    expect(heightAt(m, rut.x, rut.z)).toBeLessThan(
      heightAt(comparison, rut.x, rut.z) - 0.1,
    );
    expect(impactDamage(0, 0, 2, 17)).toBe(0);
    expect(impactDamage(8, 0, 0, 18)).toBeGreaterThan(10);
    expect(impactDamage(0, 7, 0, 18)).toBeGreaterThan(10);
  });
  for (const base of MISSIONS)
    for (const variant of [0, 1])
      for (const alternate of [false, true])
        it(`delivers ${base.title}, edition ${variant}, ${alternate ? 'ridge' : 'main'} at the faster pace`, async () => {
          const e = new GameEngine(missionVariant(base, variant));
          let top = 0;
          try {
            for (
              let i = 0;
              i < e.initial * 60 &&
              e.phase !== 'restoring' &&
              e.phase !== 'failed';
              i++
            ) {
              if (i % 900 === 0) await new Promise((r) => setTimeout(r, 0));
              e.step(1 / 60, driveInput(e, alternate, true));
              top = Math.max(top, e.speed * 3.6);
            }
            if (e.phase !== 'restoring')
              console.log(
                'Drive failure',
                e.failure,
                e.position,
                e.time,
                e.integrity,
                e.encounters,
              );
            expect(e.phase).toBe('restoring');
            expect(top).toBeGreaterThan(60);
            expect(e.result?.revision).toBe(ROAD_REVISION);
            expect(e.result?.score).toBeLessThanOrEqual(2000);
          } finally {
            e.dispose();
          }
        });
  it('registers a real high-speed collision with a stopped minibus', () => {
    const m = { ...MISSIONS[0], bend: 0 },
      e = new GameEngine(m);
    try {
      const event = e.encounters[0],
        z = event.z - 15,
        x = event.side * 3.15;
      e.body.setTranslation({ x, y: heightAt(m, x, z) + 0.85, z }, true);
      e.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      e.body.setLinvel({ x: 0, y: 0, z: 18 }, true);
      e.phase = 'driving';
      for (let i = 0; i < 100; i++) e.step(1 / 60, emptyInput());
      expect(e.impacts).toBeGreaterThan(0);
      expect(e.integrity).toBeLessThan(100);
    } finally {
      e.dispose();
    }
  });
  it('offers recovery when the truck is physically stuck, then charges the time penalty', () => {
    const m = { ...MISSIONS[0], bend: 0, mud: [] };
    const e = new GameEngine(m);
    try {
      // A solid barrier reproduces an upright truck wedged against a road obstacle.
      e.world.createCollider(
        RAPIER.ColliderDesc.cuboid(5, 3, 1).setTranslation(
          0,
          heightAt(m, 0, 20) + 1,
          20,
        ),
      );
      for (let i = 0; i < 480; i++)
        e.step(1 / 60, { ...emptyInput(), throttle: 1 });
      expect(e.needsRecovery).toBe(true);
      expect(Math.abs(e.speed)).toBeLessThan(0.6);
      const before = e.time;
      e.recover();
      expect(e.time).toBeCloseTo(before - 8);
      expect(e.recoveries).toBe(1);
      expect(e.needsRecovery).toBe(false);
    } finally {
      e.dispose();
    }
  });
});
describe('fair encounters and persistent rewards', () => {
  it('has deterministic variations, warning room, and no overlapping major encounter zones', () => {
    for (const m of MISSIONS) {
      expect(makeEncounters(m)).toEqual(makeEncounters(m));
      expect(makeEncounters(missionVariant(m, 1))).not.toEqual(
        makeEncounters(m),
      );
      const events = makeEncounters(m);
      for (let i = 1; i < events.length; i++)
        expect(events[i].z - events[i - 1].z).toBeGreaterThan(130);
      expect(warningDistance(22, 0.8)).toBeGreaterThan(22 * 3 + (22 * 22) / 9);
    }
  });
  it('pauses moving hazards and awards a clean pass only once after revisiting', () => {
    const e = new GameEngine(MISSIONS[0]);
    try {
      const event = e.encounters[0];
      for (let i = 0; i < 6000 && !event.resolved; i++)
        e.step(1 / 60, driveInput(e));
      expect(event.resolved).toBe(true);
      expect(event.clean).toBe(true);
      const clean = e.cleanEncounters,
        elapsed = event.elapsed;
      e.pause();
      e.advance(0.1, emptyInput());
      expect(event.elapsed).toBe(elapsed);
      e.resume();
      e.safeZ = event.z - 40;
      e.recover();
      for (let i = 0; i < 900 && e.progress < event.z + 35; i++)
        e.step(1 / 60, driveInput(e));
      expect(e.cleanEncounters).toBe(clean);
    } finally {
      e.dispose();
    }
  });
  it('retains legacy records and lives while separating new road editions and difficulties', () => {
    const legacy = {
      mission: 0,
      mode: 'standard' as const,
      remaining: 100,
      integrity: 90,
      lives: 3,
      score: 1615,
      stars: 3,
    };
    let save = recordResult(freshSave(), legacy);
    save = recordResult(save, {
      ...legacy,
      revision: ROAD_REVISION,
      variant: 0,
      clean: 2,
      encounters: 2,
      score: 1700,
    });
    save = recordResult(save, {
      ...legacy,
      revision: ROAD_REVISION,
      variant: 1,
      clean: 1,
      encounters: 2,
      score: 1650,
    });
    const restored = parseSave(JSON.stringify(save));
    expect(restored.best['0:standard'].score).toBe(1615);
    expect(restored.best[bestKey(0, 'standard', 0)].score).toBe(1700);
    expect(restored.best[bestKey(0, 'standard', 1)].score).toBe(1650);
    expect(livesSaved(restored)).toBe(3);
    expect(restored.completed).toEqual([0]);
  });
});
