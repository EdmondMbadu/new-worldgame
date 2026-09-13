import { beforeAll, describe, expect, it } from 'vitest';
import { GameEngine, initPhysics, emptyInput } from '../src/engine';
import { MISSIONS, roadX, roadY, heightAt } from '../src/missions';
import { driveInput } from '../src/qa-driver';
import { bestKey, freshSave, parseSave, recordResult } from '../src/save';
import { ROAD_REVISION } from '../src/vehicle';

beforeAll(() => initPhysics());
describe('steering from the driver’s viewpoint', () => {
  for (const direction of [-1, 1])
    it(`${direction < 0 ? 'left' : 'right'} input moves to that side of the forward-facing camera`, () => {
      const e = new GameEngine({ ...MISSIONS[0], bend: 0, mud: [] });
      try {
        for (let i = 0; i < 140; i++)
          e.step(1 / 60, { ...emptyInput(), throttle: 1 });
        const start = { ...e.position };
        // The car faces +Z. The driver's right is -X; adapter signs must not be world-X signs.
        for (let i = 0; i < 65; i++)
          e.step(1 / 60, {
            ...emptyInput(),
            throttle: 0.7,
            steer: direction * 0.55,
          });
        expect((e.position.x - start.x) * direction).toBeLessThan(-1);
      } finally {
        e.dispose();
      }
    });
});
describe('consequential road encounters', () => {
  it('a fast centre-line approach to the washout causes a real physical consequence', () => {
    const m = { ...MISSIONS[0], bend: 0, mud: [] },
      e = new GameEngine(m);
    try {
      for (
        let i = 0;
        i < 2400 && e.position.z < 270 && e.phase !== 'failed';
        i++
      )
        e.step(1 / 60, {
          ...emptyInput(),
          throttle: 1,
          steer: Math.max(-1, Math.min(1, e.position.x * 0.5 + e.heading * 2)),
        });
      expect(e.encounters[0].passedSafely).toBe(false);
      expect(e.impacts).toBeGreaterThan(0);
      expect(e.integrity).toBeLessThan(100);
    } finally {
      e.dispose();
    }
  });
  it('crosses the same washout without damage when the driver follows the marked strip', () => {
    const e = new GameEngine(MISSIONS[0]);
    try {
      for (let i = 0; i < 3600 && !e.encounters[0].resolved; i++)
        e.step(1 / 60, driveInput(e, false, true));
      expect(e.encounters[0].clean).toBe(true);
      expect(e.integrity).toBe(100);
    } finally {
      e.dispose();
    }
  });
  it('bridge traffic finishes its crossing and releases the lane while the driver waits', () => {
    const m = MISSIONS[2],
      e = new GameEngine(m);
    try {
      const event = e.encounters.find((x) => x.kind === 'bridge')!,
        z = m.bridge![0] - 28;
      e.body.setTranslation({ x: roadX(m, z), y: roadY(m, z) + 0.9, z }, true);
      e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      e.phase = 'driving';
      for (let i = 0; i < 1200 && event.state !== 'clear'; i++)
        e.step(1 / 60, emptyInput());
      expect(event.state).toBe('clear');
      expect(event.actorZ).toBeLessThan(m.bridge![0] - 19);
      expect(e.integrity).toBe(100);
      expect(event.resolved).toBe(false);
    } finally {
      e.dispose();
    }
  });
  it('preserves revision 2 records when night records are introduced', () => {
    const old = {
      mission: 3,
      mode: 'standard' as const,
      remaining: 130,
      integrity: 99,
      lives: 8,
      score: 1784,
      stars: 3,
      revision: 2,
      variant: 0,
      clean: 3,
      encounters: 4,
    };
    const next = {
      ...old,
      remaining: 35,
      revision: ROAD_REVISION,
      score: 1690,
    };
    const save = parseSave(
      JSON.stringify(recordResult(recordResult(freshSave(), old), next)),
    );
    expect(save.best[bestKey(3, 'standard', 0, 2)]).toEqual(old);
    expect(save.best[bestKey(3, 'standard')]).toEqual(next);
    expect(save.completed).toEqual([3]);
  });
  for (const kind of ['tree', 'bridge'] as const)
    it(`rushing into the ${kind} causes a physical impact`, () => {
      const m = { ...MISSIONS[kind === 'bridge' ? 2 : 4], bend: 0, mud: [] },
        e = new GameEngine(m);
      try {
        const event = e.encounters.find((x) => x.kind === kind)!,
          z = event.z - event.length / 2 - 28;
        e.body.setTranslation({ x: 0, y: heightAt(m, 0, z) + 0.9, z }, true);
        e.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        e.phase = 'driving';
        for (let i = 0; i < 90; i++) e.step(1 / 60, emptyInput());
        e.body.setLinvel({ x: 0, y: 0, z: 18 }, true);
        for (let i = 0; i < 240; i++)
          e.step(1 / 60, { ...emptyInput(), throttle: 1 });
        expect(e.impacts).toBeGreaterThan(0);
        expect(e.integrity).toBeLessThan(100);
        expect(event.clean).toBe(false);
      } finally {
        e.dispose();
      }
    });
  it('deep floodwater costs more forward progress than the marked shallow line', () => {
    const m = { ...MISSIONS[1], bend: 0, mud: [] };
    const travel = (shallow: boolean) => {
      const e = new GameEngine(m);
      try {
        const event = e.encounters.find((x) => x.kind === 'flood')!,
          z = event.z - 8,
          x = shallow ? event.side * 3.3 : 0;
        e.body.setTranslation({ x, y: heightAt(m, x, z) + 0.9, z }, true);
        e.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        e.phase = 'driving';
        for (let i = 0; i < 90; i++) e.step(1 / 60, emptyInput());
        const start = e.position.z;
        for (let i = 0; i < 120; i++)
          e.step(1 / 60, { ...emptyInput(), throttle: 1 });
        return e.position.z - start;
      } finally {
        e.dispose();
      }
    };
    expect(travel(true)).toBeGreaterThan(travel(false) * 1.2);
  });
});
