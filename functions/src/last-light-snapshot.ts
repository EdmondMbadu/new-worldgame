/** Wire format shared by the game and its callable functions. Never a physics dump. */
export type DriveSnapshot = {
  version: 1;
  revision: number;
  mission: number;
  mode: 'standard' | 'relaxed';
  variant: number;
  stage: 'ready' | 'driving';
  safeZ: number;
  safeAlt: boolean;
  remaining: number;
  integrity: number;
  elapsed: number;
  furthest: number;
  impacts: number;
  recoveries: number;
  cleanEncounters: number;
  radioIndex: number;
  damageCooldown: number;
  practice: boolean;
  events: Record<string, string | number | boolean>[];
  cars: Record<string, string | number | boolean>[];
  knocked: number[];
};
const lengths = [1050, 1160, 1210, 1280, 1400];
const seconds = [235, 255, 270, 285, 300];
export function validateSnapshot(
  raw: any,
  previous?: DriveSnapshot,
): DriveSnapshot {
  const bounded = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const actors = (v: unknown, max: number) =>
    Array.isArray(v) &&
    v.length <= max &&
    v.every(
      (a) =>
        a &&
        typeof a === 'object' &&
        !Array.isArray(a) &&
        Object.keys(a).length <= 40 &&
        Object.entries(a).every(
          ([k, value]) =>
            !['__proto__', 'constructor', 'prototype'].includes(k) &&
            (typeof value === 'boolean' ||
              (typeof value === 'string' && value.length <= 300) ||
              bounded(value, -100000, 100000)),
        ),
    );
  if (
    !raw ||
    raw.version !== 1 ||
    raw.revision !== 6 ||
    !Number.isInteger(raw.mission) ||
    !bounded(raw.mission, 0, 4) ||
    !['standard', 'relaxed'].includes(raw.mode) ||
    ![0, 1].includes(raw.variant) ||
    !['ready', 'driving'].includes(raw.stage) ||
    typeof raw.safeAlt !== 'boolean' ||
    typeof raw.practice !== 'boolean' ||
    !bounded(raw.safeZ, 8, lengths[raw.mission]) ||
    !bounded(raw.furthest, 0, lengths[raw.mission] + 50) ||
    !bounded(
      raw.remaining,
      0.000001,
      seconds[raw.mission] * (raw.mode === 'relaxed' ? 1.35 : 1),
    ) ||
    !bounded(raw.integrity, 0.000001, 100) ||
    !bounded(raw.elapsed, 0, 10000) ||
    !['impacts', 'recoveries', 'cleanEncounters', 'radioIndex'].every(
      (k) => Number.isInteger(raw[k]) && bounded(raw[k], 0, 10000),
    ) ||
    !bounded(raw.damageCooldown, 0, 100) ||
    !actors(raw.events, 18) ||
    !actors(raw.cars, 12) ||
    !Array.isArray(raw.knocked) ||
    raw.knocked.length > 2000 ||
    !raw.knocked.every(
      (n: unknown) => Number.isInteger(n) && bounded(n, 0, 10000),
    )
  )
    throw new Error(
      'This saved drive is incompatible. Your completed records are safe.',
    );
  if (JSON.stringify(raw).length > 60000)
    throw new Error('This saved drive is too large.');
  const out: DriveSnapshot = Object.fromEntries(
    [
      'version',
      'revision',
      'mission',
      'mode',
      'variant',
      'stage',
      'safeZ',
      'safeAlt',
      'remaining',
      'integrity',
      'elapsed',
      'furthest',
      'impacts',
      'recoveries',
      'cleanEncounters',
      'radioIndex',
      'damageCooldown',
      'practice',
      'events',
      'cars',
      'knocked',
    ].map((k) => [k, raw[k]]),
  ) as DriveSnapshot;
  if (
    previous &&
    (out.mission !== previous.mission ||
      out.mode !== previous.mode ||
      out.variant !== previous.variant ||
      out.elapsed < previous.elapsed ||
      (!out.practice &&
        (previous.practice ||
          out.remaining > previous.remaining + 0.001 ||
          out.integrity > previous.integrity + 0.001)) ||
      out.impacts < previous.impacts ||
      out.recoveries < previous.recoveries)
  )
    throw new Error(
      'A newer checkpoint already exists. Reload your saved journey.',
    );
  return out;
}
