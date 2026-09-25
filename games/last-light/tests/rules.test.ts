import { beforeAll, describe, it, expect } from 'vitest';
import { RESTORE_DURATION } from '../src/vehicle';
import { GameEngine, initPhysics, emptyInput } from '../src/engine';
import { MISSIONS, roadX, roadY, heightAt } from '../src/missions';
import {
  freshSave,
  parseSave,
  recordResult,
  livesSaved,
  unlocked,
} from '../src/save';
beforeAll(() => initPhysics());
function atClinic(e: GameEngine) {
  const z = e.mission.length;
  e.body.setTranslation({ x: 0, y: roadY(e.mission, z) + 0.87, z }, true);
  e.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  e.phase = 'driving';
  e.step(1 / 60, emptyInput());
}
describe('mission rules', () => {
  it('does not start the deadline while waiting for the first driving input', () => {
    const e = new GameEngine(MISSIONS[0]);
    const p = { ...e.position };
    for (let i = 0; i < 600; i++) e.step(1 / 60, emptyInput());
    expect(e.time).toBe(e.initial);
    expect(e.phase).toBe('ready');
    expect(e.position).toEqual(p);
    e.dispose();
  });
  it('lets a new driver try steering and braking before acceleration starts the reserve', () => {
    const e = new GameEngine(MISSIONS[0]);
    try {
      const position = { ...e.position };
      for (let i = 0; i < 180; i++) e.step(1 / 60, { ...emptyInput(), steer: i % 2 ? -1 : 1, brake: 1 });
      expect(e.phase).toBe('ready');
      expect(e.time).toBe(e.initial);
      expect(e.position).toEqual(position);
      e.pause('settings'); e.resume();
      e.step(1 / 60, { ...emptyInput(), steer: 1 });
      expect(e.phase).toBe('ready');
      expect(e.time).toBe(e.initial);
      e.step(1 / 60, { ...emptyInput(), throttle: 1 });
      expect(e.phase).toBe('driving');
      expect(e.time).toBeLessThan(e.initial);
    } finally { e.dispose(); }
  });
  it('bounds foreground hitch catch-up without a pause modal or clock penalty for dropped time', () => {
    const e = new GameEngine(MISSIONS[0]);
    try {
      e.advance(0.1, { ...emptyInput(), throttle: 1 });
      const time = e.time;
      e.advance(3, emptyInput());
      expect(e.phase).toBe('driving');
      expect(e.lastSubsteps).toBe(6);
      expect(e.time).toBeCloseTo(time - 0.1, 6);
      expect(e.droppedTime).toBeCloseTo(2.9, 6);
      e.pause('blur');
      const stopped = e.time;
      e.advance(1, { ...emptyInput(), throttle: 1 });
      expect(e.phase).toBe('paused');
      expect(e.pauseReason).toBe('blur');
      expect(e.time).toBe(stopped);
      e.resume();
      e.advance(0.1, emptyInput());
      expect(e.time).toBeLessThan(stopped);
    } finally {
      e.dispose();
    }
  });
  it('recovery costs eight seconds and does not replenish equipment or advance the road', () => {
    const e = new GameEngine(MISSIONS[0]);
    e.phase = 'driving';
    e.integrity = 41;
    const z = e.safeZ,
      t = e.time;
    e.recover();
    expect(e.time).toBe(t - 8);
    expect(e.integrity).toBe(41);
    expect(e.position.z).toBeCloseTo(z);
    e.dispose();
  });
  it('fails when recovery exhausts the reserve', () => {
    const e = new GameEngine(MISSIONS[0]);
    e.phase = 'driving';
    e.time = 7;
    e.recover();
    expect(e.phase).toBe('failed');
    expect(e.result).toBeNull();
    e.dispose();
  });
  it('cancels a partial handover when the action is released', () => {
    const e = new GameEngine(MISSIONS[0]);
    atClinic(e);
    for (let i = 0; i < 20; i++)
      e.step(1 / 60, { ...emptyInput(), action: true, brake: 1 });
    expect(e.delivery).toBeGreaterThan(0.2);
    e.step(1 / 60, { ...emptyInput(), brake: 1 });
    expect(e.delivery).toBe(0);
    expect(e.phase).toBe('driving');
    e.dispose();
  });
  it('locks the result and freezes the deadline throughout restoration and skipping', () => {
    const e = new GameEngine(MISSIONS[0]);
    atClinic(e);
    e.step(1 / 60, { ...emptyInput(), action: true }, true);
    expect(e.phase).toBe('restoring');
    const result = { ...e.result },
      time = e.time;
    for (let i = 0; i < 400; i++) e.step(1 / 60, emptyInput());
    expect(e.time).toBe(time);
    e.skip();
    e.skip();
    expect(e.phase).toBe('results');
    expect(e.restoreTime).toBe(RESTORE_DURATION);
    expect(e.result).toEqual(result);
    e.dispose();
  });
  it('deadline expiry wins an exact tie with delivery', () => {
    const e = new GameEngine(MISSIONS[0]);
    atClinic(e);
    e.time = 1 / 60;
    e.step(1 / 60, { ...emptyInput(), action: true }, true);
    expect(e.phase).toBe('failed');
    expect(e.result).toBeNull();
    e.dispose();
  });
  it('zero kit integrity fails and repeated impacts in one contact are debounced', () => {
    const e = new GameEngine(MISSIONS[0]);
    e.phase = 'driving';
    e.hurt(8);
    e.hurt(8);
    expect(e.integrity).toBe(92);
    e.advance(0.12, emptyInput());
    expect(e.integrity).toBe(92);
    e.dispose();
    const broken = new GameEngine(MISSIONS[0]);
    broken.phase = 'driving';
    broken.hurt(200);
    expect(broken.phase).toBe('failed');
    broken.dispose();
  });
  it('relaxed mode adds time and softens impacts', () => {
    const e = new GameEngine(MISSIONS[0], 'relaxed');
    expect(e.initial).toBeCloseTo(MISSIONS[0].seconds * 1.35);
    e.phase = 'driving';
    e.hurt(20);
    expect(e.integrity).toBe(85);
    e.dispose();
  });
  it('keeps outcomes equivalent at 30, 60, and 144 Hz render schedules', () => {
    const outcomes = [];
    for (const fps of [30, 60, 144]) {
      const e = new GameEngine(MISSIONS[0]);
      for (let i = 0; i < fps * 8; i++)
        e.advance(1 / fps, { ...emptyInput(), throttle: 0.7 });
      outcomes.push({ z: e.position.z, time: e.time, integrity: e.integrity });
      e.dispose();
    }
    for (const o of outcomes) {
      expect(o.z).toBeCloseTo(outcomes[0].z, 0);
      expect(o.time).toBeCloseTo(outcomes[0].time, 1);
      expect(o.integrity).toBe(outcomes[0].integrity);
    }
  });
});
describe('progress and storage', () => {
  const result = {
    mission: 0,
    mode: 'standard' as const,
    remaining: 100,
    integrity: 90,
    lives: 3,
    score: 1615,
    stars: 3,
  };
  it('credits lives once and keeps the best score per difficulty', () => {
    let s = freshSave();
    s = recordResult(s, result);
    s = recordResult(s, { ...result, score: 1500 });
    expect(s.completed).toEqual([0]);
    expect(livesSaved(s)).toBe(3);
    expect(s.best['0:standard'].score).toBe(1615);
    expect(unlocked(s, 1)).toBe(true);
    expect(unlocked(s, 2)).toBe(false);
    s = recordResult(s, { ...result, mode: 'relaxed', score: 1700 });
    expect(Object.keys(s.best)).toHaveLength(2);
    expect(livesSaved(s)).toBe(3);
  });
  it('recovers safely from malformed and obsolete storage', () => {
    expect(parseSave('{').completed).toEqual([]);
    expect(parseSave('{"version":2}').completed).toEqual([]);
    const s = parseSave(
      JSON.stringify({
        version: 1,
        completed: [0, 0, 9, -1, '1'],
        settings: { mode: 'cheat', volume: 9 },
        best: { bad: { score: Infinity } },
      }),
    );
    expect(s.completed).toEqual([0]);
    expect(s.settings.mode).toBe('standard');
    expect(s.settings.volume).toBe(1);
    expect(s.best).toEqual({});
  });
  it('preserves a valid result and settings through serialization', () => {
    const s = recordResult(freshSave(), result);
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
});
