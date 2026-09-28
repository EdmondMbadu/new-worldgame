import { beforeEach, describe, it, expect, vi } from 'vitest';
import { freshSave, recordResult, writeSave, readSave } from '../src/save';
import {
  checkpointHref,
  readCheckpoint,
  mergeProgress,
  invitation,
  updatePending,
  pendingRuns,
  claimGuestRuns,
  safeReturn,
} from '../src/journey';
import { safeAuthReturn } from '../../../src/app/services/auth-return';
import {
  validateDrive,
  mergeBest,
  totalBest,
  eligibleOwner,
  publicName,
  guestKey,
  boardsFor,
} from '../../../functions/src/last-light-core';
import type { Drive } from '../../../functions/src/last-light-core';
import { MISSIONS } from '../src/missions';
import { ROAD_REVISION } from '../src/vehicle';
const drive: Drive = {
  mission: 0,
  mode: 'standard',
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
beforeEach(() => {
  const data: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  });
});
describe('account handoff', () => {
  it('round trips the exact completed chapter, difficulty, score and settings', () => {
    const save = recordResult(freshSave(), drive);
    save.settings.sound = false;
    const href = checkpointHref({
      mission: 0,
      mode: 'standard',
      variant: 0,
      result: drive,
      owner: null,
      save,
    });
    const restored = readCheckpoint(href!.slice(href!.indexOf('?')))!;
    expect(restored.result).toEqual(drive);
    expect(restored.save.story.completed).toEqual([0]);
    expect(restored.save.settings.sound).toBe(false);
  });
  it('restores a failure and its practice checkpoint without inventing a completion', () => {
    const href = checkpointHref({
      mission: 3,
      mode: 'relaxed',
      variant: 1,
      failure: 'Reserve depleted',
      safeZ: 320,
      safeAlt: true,
      owner: 'alice',
      save: freshSave(),
    });
    const c = readCheckpoint(href!.slice(href!.indexOf('?')))!;
    expect(c.failure).toBe('Reserve depleted');
    expect(c.safeZ).toBe(320);
    expect(c.save.story.completed).toEqual([]);
  });
  it('does not erase a better local score when the cloud returns an older record', () => {
    const best = recordResult(freshSave(), drive);
    expect(
      mergeProgress(best, [{ ...drive, score: 1700 }]).story.best[
        '0:standard:r6:v0'
      ].score,
    ).toBe(1800);
  });
  it('isolates different accounts and guest saves', () => {
    const guest = recordResult(freshSave(), drive);
    writeSave(guest);
    writeSave({ ...freshSave(), owner: 'alice' });
    expect(readSave('alice').story.completed).toEqual([]);
    expect(readSave('bob').story.completed).toEqual([]);
    expect(readSave().story.completed).toEqual([0]);
  });
  it('guest claims cannot be overwritten by a late network response or another claim', () => {
    updatePending({ id: 'run', owner: null, result: drive });
    claimGuestRuns('alice');
    updatePending({
      id: 'run',
      owner: null,
      result: drive,
      ticket: { id: 'ticket', secret: 'secret' },
    });
    claimGuestRuns('bob');
    expect(pendingRuns()[0].owner).toBe('alice');
    expect(pendingRuns()[0].ticket?.id).toBe('ticket');
  });
  it('refuses auth handoff when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw Error('Quota');
      },
    });
    expect(
      checkpointHref({
        mission: 0,
        mode: 'standard',
        variant: 0,
        result: drive,
        owner: null,
        save: freshSave(),
      }),
    ).toBeNull();
  });
  it('validates invitations without completing or unlocking unrelated chapters', () => {
    expect(
      invitation('?challenge=1&chapter=4&mode=relaxed&variant=1&revision=6'),
    ).toEqual({ mission: 3, mode: 'relaxed', variant: 1 });
    expect(
      invitation('?challenge=1&chapter=999&mode=relaxed&variant=1&revision=6'),
    ).toBeNull();
    expect(
      invitation('?challenge=1&chapter=4&mode=relaxed&variant=1&revision=5'),
    ).toBeNull();
  });
  it.each([
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example/',
    '/\nevil.example',
    'javascript:alert(1)',
  ])('rejects unsafe return destination %s', (raw) => {
    expect(safeReturn(raw)).toBeNull();
    expect(safeAuthReturn(raw)).toBeNull();
  });
  it('preserves a nested return query through auth parsing', () => {
    const url = '/games/last-light/?resume=123';
    expect(safeAuthReturn(url)).toBe(url);
  });
});
describe('authoritative score rules', () => {
  it('matches the five shipped mission clocks and version', () => {
    expect(ROAD_REVISION).toBe(6);
    expect(MISSIONS.map((m) => m.seconds)).toEqual([235, 255, 270, 285, 300]);
    for (const m of MISSIONS)
      expect(
        validateDrive({
          ...drive,
          mission: m.id,
          lives: m.lives,
          remaining: m.seconds / 2,
        }).score,
      ).toBe(1800);
  });
  it('recomputes scores and rejects practice, invented points and impossible metrics', () => {
    expect(validateDrive(drive)).toEqual(drive);
    for (const patch of [
      { practice: true },
      { score: 2000 },
      { stars: 1 },
      { remaining: NaN },
      { encounters: 0 },
      { clean: 20 },
      { lives: 999 },
      { revision: 5 },
      { integrity: 101 },
    ])
      expect(() => validateDrive({ ...drive, ...patch })).toThrow();
  });
  it('separates difficulty and route and counts each chapter only once overall', () => {
    const best = mergeBest({}, [
      drive,
      { ...drive, score: 1700 },
      { ...drive, mission: 1, lives: 5 },
      { ...drive, mode: 'relaxed' },
      { ...drive, variant: 1 },
    ]);
    expect(totalBest(best, drive)).toEqual({ score: 3600, chapters: 2 });
  });
  it('prevents reassignment of a claimed or signed-in run', () => {
    expect(eligibleOwner(null, null, 'alice')).toBe(true);
    expect(eligibleOwner('alice', 'alice', 'alice')).toBe(true);
    expect(eligibleOwner(null, 'alice', 'bob')).toBe(false);
    expect(eligibleOwner('alice', null, 'bob')).toBe(false);
  });
  it('accepts names with accents while rejecting emails and markup', () => {
    expect(publicName('  Élodie  Road ')).toBe('Élodie Road');
    expect(() => publicName('private@example.com')).toThrow();
    expect(() => publicName('<script>')).toThrow();
  });
});

describe('shared-device guest claims', () => {
  it('lets a later guest keep their new drive without claiming an earlier player’s history', () => {
    updatePending({id:'first-player',owner:null,result:drive});
    expect(claimGuestRuns('alice')).toHaveLength(1);
    updatePending({id:'second-player',owner:null,result:{...drive,mission:1,lives:5}});
    const claimed=claimGuestRuns('bob');
    expect(claimed.map(r=>r.mission)).toEqual([1]);
    expect(pendingRuns().find(r=>r.id==='first-player')?.owner).toBe('alice');
  });
  it('rejects a checkpoint whose result belongs to another chapter', () => {
    const href=checkpointHref({mission:4,mode:'standard',variant:0,result:drive,owner:null,save:freshSave()});
    expect(readCheckpoint(href!.slice(href!.indexOf('?')))).toBeNull();
  });
  it('accepts only a full private device key and lists every board a player appears on', () => {
    expect(() => guestKey('abc')).toThrow();
    expect(() => guestKey('g'.repeat(64))).toThrow();
    expect(guestKey('a'.repeat(64))).toBe('a'.repeat(64));
    const best = mergeBest({}, [drive, { ...drive, mission: 1, lives: 5 }]);
    const boards = boardsFor(best);
    expect(boards.chapters.map((b) => b.board).sort()).toEqual(['r6-v0-standard-0', 'r6-v0-standard-1']);
    expect(boards.overall).toEqual([{ board: 'r6-v0-standard-all', score: 3600, chapters: 2 }]);
  });
});

