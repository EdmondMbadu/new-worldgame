import type { Result } from './engine';
import type { DriveSnapshot } from '../../../functions/src/last-light-snapshot';
import { validateSnapshot } from '../../../functions/src/last-light-snapshot';
import {
  load,
  persist,
  validResult,
  pendingRuns,
  type Pending,
  type Ticket,
} from './journey';
import { readSave, writeSave, freshSave } from './save';
export type DriveRecord = {
  id: string;
  owner: string | null;
  result: Result;
  completedAt: number;
  journeyId?: string | null;
  saved?: boolean;
  eligible?: boolean;
  published?: boolean;
  imported?: boolean;
};
export type ActiveJourney = {
  owner: string | null;
  runId: string;
  journeyId: string;
  version: number;
  savedAt: number;
  status: 'driving' | 'between' | 'finished' | 'abandoned';
  mission: number;
  mode: 'standard' | 'relaxed';
  variant: number;
  revision: number;
  snapshot?: DriveSnapshot;
  ticket?: Ticket;
  dirty?: boolean;
  localOnly?: boolean;
};
const key = (owner: string | null, kind: string) =>
  `last-light.${kind}.v2.${owner || 'guest'}`;
const signal = () => {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('last-light:records'));
};
export function driveHistory(owner: string | null): DriveRecord[] {
  const records = load<unknown>(key(owner, 'history'), []);
  const valid: DriveRecord[] = Array.isArray(records)
    ? records
        .filter(
          (d) =>
            d &&
            d.owner === owner &&
            typeof d.id === 'string' &&
            Number.isFinite(d.completedAt) &&
            validResult({ ...d.result, practice: false }),
        )
        .map((d) => ({
          ...d,
          imported:
            d.imported || (d.completedAt === 0 && d.id.startsWith('legacy-')),
        }))
    : [];
  const known = new Set(
    valid.filter((d) => !d.imported).map((d) => resultKey(d.result)),
  );
  return valid.filter((d) => {
    if (!d.imported) return true;
    const key = resultKey(d.result);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
}
export function rememberDrive(record: DriveRecord) {
  const records = driveHistory(record.owner),
    old = records.find((d) => d.id === record.id);
  // A retry can enrich an immutable result, but cannot change its score/time.
  if (
    old &&
    Object.keys({ ...old.result, ...record.result }).some(
      (k) => (old.result as any)[k] !== (record.result as any)[k],
    )
  )
    return false;
  const ok = persist(
    key(record.owner, 'history'),
    [...records.filter((d) => d.id !== record.id), { ...old, ...record }].sort(
      (a, b) => b.completedAt - a.completedAt || a.id.localeCompare(b.id),
    ),
  );
  signal();
  return ok;
}
export function rememberRun(p: Pending) {
  if (p.result)
    rememberDrive({
      id: p.id,
      owner: p.owner,
      result: p.result,
      completedAt: p.completedAt || Date.now(),
      journeyId: p.journeyId,
      saved: p.saved,
      eligible: p.eligible,
      published: p.published,
    });
}
function resultKey(r: Result) {
  const normalized = {
    ...r,
    variant: r.variant || 0,
    revision: r.revision || 1,
    practice: !!r.practice,
  };
  return JSON.stringify(
    Object.keys(normalized)
      .sort()
      .map((k) => [k, normalized[k as keyof typeof normalized]]),
  );
}
function fingerprint(r: Result) {
  let n = 2166136261;
  for (const c of resultKey(r)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return (n >>> 0).toString(16);
}
export function hydrateLocalHistory(owner: string | null) {
  for (const p of pendingRuns().filter((p) => p.owner === owner))
    rememberRun(p);
  const save = readSave(owner || undefined),
    existing = driveHistory(owner);
  for (const r of [
    ...Object.values(save.best),
    ...Object.values(save.story.best),
  ]) {
    if (!existing.some((d) => resultKey(d.result) === resultKey(r)))
      rememberDrive({
        id: `legacy-${fingerprint(r)}`,
        owner,
        result: r,
        completedAt: 0,
        imported: true,
        eligible: false,
      });
  }
}
export function claimLocalHistory(uid: string) {
  const records = driveHistory(null);
  let saved = true;
  for (const d of records)
    saved = rememberDrive({ ...d, owner: uid, saved: false }) && saved;
  if (saved) {
    const guest = readSave();
    persist(key(null, 'history'), []);
    writeSave({ ...freshSave(), settings: guest.settings });
  }
  return saved;
}
export function readActive(owner: string | null): ActiveJourney | null {
  const a = load<ActiveJourney | null>(key(owner, 'active'), null);
  if (
    !a ||
    a.owner !== owner ||
    !['driving', 'between', 'finished', 'abandoned'].includes(a.status) ||
    !Number.isFinite(a.savedAt) ||
    !Number.isInteger(a.version) ||
    (['driving', 'between'].includes(a.status) &&
      (a.revision !== 6 ||
        !Number.isInteger(a.mission) ||
        a.mission < 0 ||
        a.mission > 4 ||
        !['standard', 'relaxed'].includes(a.mode) ||
        ![0, 1].includes(a.variant)))
  )
    return null;
  try {
    if (a.status === 'driving') validateSnapshot(a.snapshot);
  } catch {
    return null;
  }
  return a;
}
export function storeActive(a: ActiveJourney): boolean {
  const ok = persist(key(a.owner, 'active'), a);
  signal();
  return ok;
}
export function removeActive(owner: string | null) {
  try {
    localStorage.removeItem(key(owner, 'active'));
    signal();
  } catch {
    /* storage is unavailable */
  }
}
export function personalBest(
  owner: string | null,
  mode: string,
  variant: number,
  revision: number,
  mission: number | 'all',
  cloud: Record<string, Result> = {},
) {
  const best = new Map<number, Result>(),
    save = readSave(owner || undefined);
  for (const r of [
    ...Object.values(save.story.best),
    ...Object.values(cloud),
    ...driveHistory(owner).map((d) => d.result),
  ]) {
    if (
      r.practice ||
      r.mode !== mode ||
      (r.variant || 0) !== variant ||
      r.revision !== revision ||
      (mission !== 'all' && r.mission !== mission)
    )
      continue;
    if (!best.has(r.mission) || best.get(r.mission)!.score < r.score)
      best.set(r.mission, r);
  }
  return {
    score: [...best.values()].reduce((sum, r) => sum + r.score, 0),
    chapters: best.size,
  };
}
export function bestJourney(
  owner: string | null,
  mode: string,
  variant: number,
  revision: number,
) {
  const journeys = new Map<string, Map<number, DriveRecord>>();
  for (const d of driveHistory(owner)) {
    const r = d.result;
    if (
      !d.journeyId ||
      r.practice ||
      r.mode !== mode ||
      (r.variant || 0) !== variant ||
      r.revision !== revision
    )
      continue;
    const legs = journeys.get(d.journeyId) || new Map<number, DriveRecord>();
    // First completed leg belongs to this playthrough. Replays use a new journey ID.
    if (
      !legs.has(r.mission) ||
      legs.get(r.mission)!.completedAt > d.completedAt
    )
      legs.set(r.mission, d);
    journeys.set(d.journeyId, legs);
  }
  return Math.max(
    0,
    ...[...journeys.values()]
      .filter((legs) => legs.size === 5)
      .map((legs) =>
        [...legs.values()].reduce((sum, d) => sum + d.result.score, 0),
      ),
  );
}
