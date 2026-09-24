import { MISSIONS } from './missions';
import type { Result } from './engine';
import { ROAD_REVISION } from './vehicle';
import { STORY_EDITION } from './clinic-stories';
export const bestKey = (
  mission: number,
  mode: string,
  variant = 0,
  revision = ROAD_REVISION,
) => `${mission}:${mode}:r${revision}:v${variant}`;
const resultKey = (r: Result) =>
  r.revision !== undefined
    ? bestKey(r.mission, r.mode, r.variant ?? 0, r.revision)
    : `${r.mission}:${r.mode}`;
export type Settings = {
  sound: boolean;
  voice: boolean;
  subtitles: boolean;
  roadSounds: boolean;
  reducedMotion: boolean;
  singlePress: boolean;
  brightness: number;
  enhancedVisibility: boolean;
  reducedFlashes: boolean;
  quality: 'auto' | 'high' | 'medium' | 'low';
  mode: 'standard' | 'relaxed';
  volume: number;
  keys: Record<string, string>;
};
export type Save = {
  version: 1;
  completed: number[];
  best: Record<string, Result>;
  settings: Settings;
  story: { edition: string; completed: number[]; best: Record<string, Result> };
};
export const defaultSettings = (): Settings => ({
  sound: true,
  voice: true,
  subtitles: true,
  roadSounds: false,
  reducedMotion:
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  singlePress: false,
  brightness: 1,
  enhancedVisibility: false,
  reducedFlashes: false,
  quality: 'auto',
  mode: 'standard',
  volume: 0.65,
  keys: {
    left: 'KeyA',
    right: 'KeyD',
    throttle: 'KeyW',
    brake: 'KeyS',
    action: 'KeyE',
  },
});
export const freshSave = (): Save => ({
  version: 1,
  completed: [],
  best: {},
  settings: defaultSettings(),
  story: { edition: STORY_EDITION, completed: [], best: {} },
});
export function parseSave(raw: string | null): Save {
  const base = freshSave();
  try {
    const p = JSON.parse(raw || 'null');
    if (!p || p.version !== 1) return base;
    base.completed = Array.isArray(p.completed)
      ? [
          ...new Set<number>(
            p.completed.filter(
              (n: unknown) =>
                Number.isInteger(n) && Number(n) >= 0 && Number(n) < 5,
            ),
          ),
        ]
      : [];
    const candidates = [
      { source: p.best, target: base.best },
      { source: p.story?.edition === STORY_EDITION ? p.story.best : {}, target: base.story.best },
    ];
    for (const { source, target } of candidates) for (const [k, v] of Object.entries(source || {})) {
      const r = v as Result;
      if (
        r &&
        !r.practice &&
        Number.isInteger(r.mission) &&
        r.mission >= 0 &&
        r.mission < 5 &&
        ['standard', 'relaxed'].includes(r.mode) &&
        Number.isFinite(r.score) &&
        r.score >= 1000 &&
        r.score <= 2000 &&
        [1, 2, 3].includes(r.stars) &&
        Number.isFinite(r.integrity) &&
        r.integrity >= 0 &&
        r.integrity <= 100 &&
        Number.isFinite(r.remaining) &&
        r.remaining >= 0 &&
        r.remaining <=
          (r.revision === ROAD_REVISION
            ? MISSIONS[r.mission].seconds
            : r.revision === 5
              ? [235, 255, 265, 265, 290][r.mission]
              : r.revision === 4
              ? [200, 220, 230, 230, 255][r.mission]
              : r.revision === 3
                ? [160, 180, 190, 185, 215][r.mission]
                : r.revision === 2
                  ? [160, 180, 205, 215, 235][r.mission]
                  : [235, 250, 270, 280, 300][r.mission]) *
            1.35 &&
        r.lives === MISSIONS[r.mission].lives &&
        (r.revision === undefined ||
          ([2, 3, 4, 5, ROAD_REVISION].includes(r.revision) &&
            [0, 1].includes(r.variant ?? 0) &&
            Number.isInteger(r.clean) &&
            Number.isInteger(r.encounters) &&
            r.clean! >= 0 &&
            r.clean! <= r.encounters! &&
            r.encounters! <=
              (r.revision === ROAD_REVISION || r.revision === 5
                ? 18
                : r.revision === 4
                  ? 6
                  : 4))) &&
        k === resultKey(r)
      )
        target[k] = r;
    }
    // Completion is backed by an accepted record, never copied from the legacy campaign.
    base.story.completed = [...new Set(Object.values(base.story.best).map((r) => r.mission))];
    const s = p.settings || {};
    for (const k of [
      'sound',
      'voice',
      'subtitles',
      'roadSounds',
      'reducedMotion',
      'singlePress',
      'enhancedVisibility',
      'reducedFlashes',
    ] as const)
      if (typeof s[k] === 'boolean') base.settings[k] = s[k];
    if (['auto', 'high', 'medium', 'low'].includes(s.quality))
      base.settings.quality = s.quality;
    if (['standard', 'relaxed'].includes(s.mode)) base.settings.mode = s.mode;
    if (Number.isFinite(s.brightness))
      base.settings.brightness = Math.max(0.8, Math.min(1.4, s.brightness));
    if (Number.isFinite(s.volume))
      base.settings.volume = Math.max(0, Math.min(1, s.volume));
    if (
      s.keys &&
      Object.keys(base.settings.keys).every((key) => key in s.keys) &&
      Object.values(s.keys).length === 5 &&
      new Set(Object.values(s.keys)).size === 5 &&
      Object.values(s.keys).every(
        (v) => typeof v === 'string' && /^(Key[A-Z]|Digit[0-9])$/.test(v),
      )
    )
      base.settings.keys = { ...base.settings.keys, ...s.keys };
    return base;
  } catch {
    return base;
  }
}
export function readSave(): Save {
  try {
    return parseSave(localStorage.getItem('last-light.v1'));
  } catch {
    return freshSave();
  }
}
export function writeSave(save: Save) {
  try {
    localStorage.setItem('last-light.v1', JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
export function recordResult(save: Save, result: Result): Save {
  if (result.practice) return save;
  const next = {
    ...save,
    completed: [...save.completed],
    best: { ...save.best },
    story: { edition: STORY_EDITION, completed: [...save.story.completed], best: { ...save.story.best } },
  };
  if (!next.completed.includes(result.mission))
    next.completed.push(result.mission);
  const k = resultKey(result);
  if (!next.best[k] || result.score > next.best[k].score)
    next.best[k] = { ...result };
  if (!next.story.completed.includes(result.mission)) next.story.completed.push(result.mission);
  if (!next.story.best[k] || result.score > next.story.best[k].score)
    next.story.best[k] = { ...result };
  return next;
}
export const livesSaved = (save: Save) =>
  save.completed.reduce((n, id) => n + MISSIONS[id].lives, 0);
export const unlocked = (save: Save, id: number) =>
  id === 0 || save.completed.includes(id - 1);
