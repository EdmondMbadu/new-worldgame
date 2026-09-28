import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine, initPhysics, emptyInput } from '../src/engine';
import { MISSIONS, missionVariant } from '../src/missions';
import { validateSnapshot } from '../../../functions/src/last-light-snapshot';
import {
  driveHistory,
  rememberDrive,
  bestJourney,
  personalBest,
  storeActive,
  readActive,
  hydrateLocalHistory,
} from '../src/records';
import { updatePending, pendingRuns } from '../src/journey';
import { freshSave, recordResult, writeSave } from '../src/save';
const result = {
  mission: 0,
  mode: 'standard' as const,
  variant: 0,
  revision: 6,
  score: 1800,
  stars: 3,
  integrity: 100,
  remaining: 117.5,
  clean: 5,
  encounters: 5,
  lives: 3,
};
beforeAll(initPhysics);
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
});
describe('durable private records', () => {
  it('retains more than forty attempts and a lower replay never erases the best', () => {
    for (let i = 0; i < 65; i++)
      rememberDrive({
        id: `attempt-${i}`,
        owner: 'a',
        result: { ...result, score: 1800 - i },
        completedAt: i,
      });
    expect(driveHistory('a')).toHaveLength(65);
    expect(driveHistory('b')).toHaveLength(0);
    expect(personalBest('a', 'standard', 0, 6, 'all').score).toBe(1800);
    rememberDrive({
      id: 'higher',
      owner: 'a',
      result: { ...result, score: 1900 },
      completedAt: 66,
    });
    expect(personalBest('a', 'standard', 0, 6, 'all').score).toBe(1900);
    rememberDrive({
      id: 'higher',
      owner: 'a',
      result: { ...result, score: 1200 },
      completedAt: 67,
    });
    expect(driveHistory('a').find((d) => d.id === 'higher')!.result.score).toBe(
      1900,
    );
  });
  it('does not confuse separate journeys with a combined personal-best total', () => {
    for (let mission = 0; mission < 5; mission++)
      rememberDrive({
        id: `leg-${mission}`,
        journeyId: 'one-playthrough',
        owner: 'a',
        result: { ...result, mission, lives: MISSIONS[mission].lives },
        completedAt: mission + 1,
      });
    rememberDrive({
      id: 'replay',
      journeyId: 'new-playthrough',
      owner: 'a',
      result: { ...result, score: 1900 },
      completedAt: 10,
    });
    expect(bestJourney('a', 'standard', 0, 6)).toBe(9000);
    expect(personalBest('a', 'standard', 0, 6, 'all').score).toBe(9100);
    expect(bestJourney('a', 'relaxed', 0, 6)).toBe(0);
  });
  it('migrates old local bests and queued completions once, with owner isolation', () => {
    writeSave({ ...recordResult(freshSave(), result), owner: 'a' });
    updatePending({ id: 'queued', owner: 'b', result });
    hydrateLocalHistory('a');
    hydrateLocalHistory('a');
    expect(driveHistory('a')).toHaveLength(1);
    expect(driveHistory('a')[0].imported).toBe(true);
    expect(driveHistory('a')[0].eligible).toBe(false);
  });
  it('publication acknowledgements can explicitly clear a previous public state', () => {
    updatePending({ id: 'retry', owner: 'a', result, published: true });
    updatePending({
      id: 'retry',
      owner: 'a',
      result,
      saved: true,
      published: false,
    });
    expect(pendingRuns()[0].published).toBe(false);
  });
  it('does not import the same legacy best twice when fields have different ordering', () => {
    const reordered = Object.fromEntries(
      Object.entries({ ...result, practice: false }).reverse(),
    ) as typeof result;
    writeSave({ ...recordResult(freshSave(), result), owner: 'a' });
    rememberDrive({
      id: 'legacy-original',
      owner: 'a',
      result: reordered,
      completedAt: 0,
      imported: true,
    });
    hydrateLocalHistory('a');
    expect(driveHistory('a')).toHaveLength(1);
    rememberDrive({ id: 'actual-run', owner: 'a', result, completedAt: 100 });
    expect(driveHistory('a').map((d) => d.id)).toEqual(['actual-run']);
    rememberDrive({
      id: 'actual-replay',
      owner: 'a',
      result,
      completedAt: 200,
    });
    expect(driveHistory('a')).toHaveLength(2);
  });
});
describe('safe checkpoint restoration', () => {
  it.each([0, 1, 2, 3, 4])(
    'round-trips clinic %i without consuming time away or duplicating encounter credits',
    (mission) => {
      const source = new GameEngine(
        missionVariant(MISSIONS[mission], 1),
        'relaxed',
      );
      const restored = new GameEngine(
        missionVariant(MISSIONS[mission], 1),
        'relaxed',
      );
      try {
        source.phase = 'driving';
        for (let i = 0; i < 90; i++) {
          source.step(1 / 60, { ...emptyInput(), throttle: 1 });
          if (i % 10 === 0) expect(source.checkpoint()).not.toBeNull();
        }
        source.safeZ = 40;
        source.time = 140;
        source.integrity = 61;
        source.impacts = 2;
        source.recoveries = 1;
        source.encounters[0].resolved = true;
        source.encounters[0].clean = true;
        source.cleanEncounters = 1;
        source.traffic.cars[0].observed = true;
        source.traffic.cars[0].credited = true;
        source.traffic.cars[0].clean = true;
        source.pause();
        const snap = JSON.parse(JSON.stringify(source.checkpoint()));
        storeActive({
          owner: 'a',
          runId: 'run',
          journeyId: 'journey',
          version: 3,
          savedAt: Date.now(),
          status: 'driving',
          mission,
          mode: 'relaxed',
          variant: 1,
          revision: 6,
          snapshot: snap,
        });
        expect(readActive('b')).toBeNull();
        restored.restoreDrive(readActive('a')!.snapshot!);
        expect(restored.phase).toBe('paused');
        expect(restored.previous).toBe('driving');
        expect(restored.time).toBe(140);
        expect(restored.integrity).toBe(61);
        expect(restored.impacts).toBe(2);
        expect(restored.recoveries).toBe(1);
        expect(restored.encounters[0].resolved).toBe(true);
        expect(restored.traffic.cars[0].credited).toBe(true);
        expect(restored.body.linvel()).toEqual({ x: 0, y: 0, z: 0 });
        restored.advance(3600, emptyInput());
        expect(restored.time).toBe(140);
        restored.resume();
        restored.step(1 / 60, emptyInput());
        expect(restored.cleanEncounters).toBe(1);
        expect(restored.time).toBeCloseTo(140 - 1 / 60);
      } finally {
        source.dispose();
        restored.dispose();
      }
    },
  );
  it('rejects incompatible, corrupt and resource-reset snapshots', () => {
    const engine = new GameEngine(MISSIONS[0]);
    try {
      const snap = engine.checkpoint()!;
      for (const patch of [
        { revision: 7 },
        { remaining: Infinity },
        { integrity: 101 },
        { safeZ: 999999 },
        { events: null },
      ])
        expect(() => validateSnapshot({ ...snap, ...patch })).toThrow();
      expect(() =>
        validateSnapshot(
          { ...snap, remaining: 200 },
          { ...snap, remaining: 190 },
        ),
      ).toThrow();
      expect(() => engine.restoreDrive({ ...snap, events: [] })).toThrow();
    } finally {
      engine.dispose();
    }
  });
});
