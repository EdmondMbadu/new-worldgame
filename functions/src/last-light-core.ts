/** Authoritative rules for road revision 6. Keep in step with the game fixtures. */
export const ROAD_REVISION = 6;
const seconds = [235, 255, 270, 285, 300];
const lives = [3, 5, 6, 8, 12];
export type Drive = {
  mission: number;
  mode: 'standard' | 'relaxed';
  variant: number;
  revision: number;
  score: number;
  stars: number;
  integrity: number;
  remaining: number;
  clean: number;
  encounters: number;
  lives: number;
  practice?: boolean;
};
export function bracket(raw: any): {
  mission: number;
  mode: Drive['mode'];
  variant: number;
  revision: number;
} {
  if (
    !raw ||
    !Number.isInteger(raw.mission) ||
    raw.mission < 0 ||
    raw.mission > 4 ||
    !['standard', 'relaxed'].includes(raw.mode) ||
    ![0, 1].includes(raw.variant) ||
    raw.revision !== ROAD_REVISION
  )
    throw new Error('Choose a current chapter, route and difficulty.');
  return {
    mission: raw.mission,
    mode: raw.mode,
    variant: raw.variant,
    revision: ROAD_REVISION,
  };
}
export function validateDrive(raw: any): Drive {
  const b = bracket(raw);
  const initial = seconds[b.mission] * (b.mode === 'relaxed' ? 1.35 : 1);
  if (
    raw.practice ||
    !Number.isFinite(raw.remaining) ||
    raw.remaining <= 0 ||
    raw.remaining > initial ||
    !Number.isFinite(raw.integrity) ||
    raw.integrity <= 0 ||
    raw.integrity > 100 ||
    !Number.isInteger(raw.encounters) ||
    raw.encounters < 1 ||
    raw.encounters > 18 ||
    !Number.isInteger(raw.clean) ||
    raw.clean < 0 ||
    raw.clean > raw.encounters ||
    raw.lives !== lives[b.mission]
  )
    throw new Error('This drive is not eligible for a leaderboard.');
  if (initial - raw.remaining < [1050, 1160, 1210, 1280, 1400][b.mission] / 55)
    throw new Error('This drive is shorter than a full route.');
  const ratio = raw.remaining / initial;
  const score =
    1000 +
    Math.floor(400 * ratio) +
    Math.floor(4 * raw.integrity) +
    Math.floor((200 * raw.clean) / raw.encounters);
  const stars =
    raw.integrity >= 90 &&
    ratio >= 0.12 &&
    raw.clean >= Math.ceil(raw.encounters * 0.75)
      ? 3
      : raw.integrity >= 70
        ? 2
        : 1;
  if (raw.score !== score || raw.stars !== stars)
    throw new Error('The recorded score does not match this drive.');
  return {
    ...b,
    score,
    stars,
    integrity: raw.integrity,
    remaining: raw.remaining,
    clean: raw.clean,
    encounters: raw.encounters,
    lives: raw.lives,
  };
}
export const driveKey = (
  r: Pick<Drive, 'mission' | 'mode' | 'variant' | 'revision'>,
) => `${r.mission}:${r.mode}:r${r.revision}:v${r.variant}`;
export const boardKey = (
  r: Pick<Drive, 'mode' | 'variant' | 'revision'>,
  chapter: number | 'all',
) => `r${r.revision}-v${r.variant}-${r.mode}-${chapter}`;
export function mergeBest(best: Record<string, Drive>, results: Drive[]) {
  const next = { ...best };
  for (const r of results) {
    const key = driveKey(r);
    if (!next[key] || r.score > next[key].score) next[key] = r;
  }
  return next;
}
export function totalBest(best: Record<string, Drive>, r: Drive) {
  const drives = Object.values(best).filter(
    (d) =>
      d.mode === r.mode && d.variant === r.variant && d.revision === r.revision,
  );
  return {
    score: drives.reduce((sum, d) => sum + d.score, 0),
    chapters: drives.length,
  };
}
export function publicName(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('Choose a public player name.');
  const name = raw.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} ._'-]{2,28}$/u.test(name))
    throw new Error(
      'Use 2–28 letters, numbers, spaces, dots, hyphens or underscores.',
    );
  return name;
}
export function eligibleOwner(
  owner: string | null,
  claimedBy: string | null,
  uid: string,
): boolean {
  return (!owner || owner === uid) && (!claimedBy || claimedBy === uid);
}
export function elapsedDrive(r: Drive): number {
  return seconds[r.mission] * (r.mode === 'relaxed' ? 1.35 : 1) - r.remaining;
}
