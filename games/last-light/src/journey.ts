import type { Result } from './engine';
import { parseSave, freshSave, recordResult, type Save } from './save';
import { ROAD_REVISION } from './vehicle';
export type Ticket = { id: string; secret: string; owner?: string | null; journeyId?: string };
export type Pending = {
  id: string;
  owner: string | null;
  ticket?: Ticket;
  result?: Result;
  published?: boolean;
  rejected?: boolean;
  offline?: boolean;
  saved?: boolean;
  eligible?: boolean;
  completedAt?: number;
  journeyId?: string;
};
export type Checkpoint = {
  version: 1;
  id: string;
  created: number;
  mission: number;
  variant: number;
  mode: 'standard' | 'relaxed';
  result?: Result;
  failure?: string;
  safeZ?: number;
  safeAlt?: boolean;
  owner: string | null;
  save: Save;
};
export function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
export function persist(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function validResult(value: unknown): Result | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Result,
    s = freshSave();
  const key = `${r.mission}:${r.mode}:r${r.revision}:v${r.variant ?? 0}`;
  s.story.best[key] = r;
  return parseSave(JSON.stringify(s)).story.best[key] || null;
}
export function readCheckpoint(search = location.search): Checkpoint | null {
  const id = new URLSearchParams(search).get('resume');
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) return null;
  const c = load<Checkpoint | null>(`last-light.resume.${id}`, null);
  if (
    !c ||
    c.version !== 1 ||
    c.id !== id ||
    !Number.isInteger(c.mission) ||
    c.mission < 0 ||
    c.mission > 4 ||
    ![0, 1].includes(c.variant) ||
    !['standard', 'relaxed'].includes(c.mode) ||
    !Number.isFinite(c.created) ||
    Date.now() - c.created > 30 * 86400000 ||
    (c.owner !== null && typeof c.owner !== 'string')
  )
    return null;
  if (c.result && (!validResult(c.result) || c.result.mission !== c.mission || c.result.mode !== c.mode || (c.result.variant || 0) !== c.variant)) return null;
  if (!c.result && !c.failure) return null;
  return {
    ...c,
    save: parseSave(JSON.stringify(c.save)),
    failure:
      typeof c.failure === 'string' ? c.failure.slice(0, 500) : undefined,
  };
}
export function checkpointHref(
  c: Omit<Checkpoint, 'id' | 'created' | 'version'>,
): string | null {
  const id = crypto.randomUUID(),
    value = { ...c, id, created: Date.now(), version: 1 };
  if (!persist(`last-light.resume.${id}`, value)) return null;
  // Retain recent handoffs, bounded to avoid gradually exhausting browser storage.
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('last-light.resume.'))
      .map((k) => ({ k, c: load<Checkpoint | null>(k, null) }))
      .sort((a, b) => (b.c?.created || 0) - (a.c?.created || 0))
      .slice(12)
      .forEach((x) => localStorage.removeItem(x.k));
  } catch {
    /* optional cleanup */
  }
  return `/games/last-light/?resume=${id}`;
}
export function invitation(search = location.search) {
  const p = new URLSearchParams(search),
    chapter = Number(p.get('chapter'));
  if (
    p.get('challenge') !== '1' ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > 5 ||
    !['standard', 'relaxed'].includes(p.get('mode') || '') ||
    !['0', '1'].includes(p.get('variant') || '') ||
    p.get('revision') !== String(ROAD_REVISION)
  )
    return null;
  return {
    mission: chapter - 1,
    mode: p.get('mode') as 'standard' | 'relaxed',
    variant: Number(p.get('variant')),
  };
}
export function challengeUrl(mission: number, mode: string, variant: number) {
  return `${location.origin}/games/last-light/?${new URLSearchParams({ challenge: '1', chapter: String(mission + 1), mode, variant: String(variant), revision: String(ROAD_REVISION) })}`;
}
export function mergeProgress(save: Save, results: unknown[]): Save {
  return results.reduce<Save>((s, r) => {
    const valid = validResult(r);
    return valid ? recordResult(s, valid) : s;
  }, save);
}
const pendingKey = 'last-light.pending.v1';
export function pendingRuns(): Pending[] {
  const values = load<unknown>(pendingKey, []);
  return Array.isArray(values)
    ? values
        .filter(
          (p: any) =>
            p &&
            typeof p.id === 'string' &&
            (p.owner === null || typeof p.owner === 'string') &&
            (!p.result || validResult(p.result)),
        )
    : [];
}
export function updatePending(p: Pending) {
  const runs = pendingRuns(),
    previous = runs.find((x) => x.id === p.id);
  const next = {
    ...previous,
    ...p,
    owner: previous?.owner || p.owner,
    published: p.published ?? previous?.published ?? false,
  };
  return persist(
    pendingKey,
    [...runs.filter((x) => x.id !== p.id), next],
  );
}
export function claimGuestRuns(uid: string): Result[] {
  const results: Result[] = [];
  for (const p of pendingRuns()) {
    if (!p.owner) updatePending({ ...p, owner: uid });
    if ((!p.owner || p.owner === uid) && p.result) results.push(p.result);
  }
  return results;
}
export function safeReturn(raw: unknown): string | null {
  if (
    typeof raw !== 'string' ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    /[\\\u0000-\u0020]/.test(raw)
  )
    return null;
  try {
    const u = new URL(raw, 'https://local.invalid');
    return u.origin === 'https://local.invalid'
      ? u.pathname + u.search + u.hash
      : null;
  } catch {
    return null;
  }
}
