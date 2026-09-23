import type { Mission } from './missions';
export const NIGHT_PROFILES = [
  {
    name: 'MOONLIT VALLEY',
    moon: 0.75,
    fill: 0.48,
    fog: 0.0017,
    sky: '#122538',
    exposure: 1.5,
    beam: 145,
  },
  {
    name: 'FOREST RAIN',
    moon: 0.35,
    fill: 0.43,
    fog: 0.0027,
    sky: '#152a35',
    exposure: 1.6,
    beam: 120,
  },
  {
    name: 'RIVER MIST',
    moon: 0.58,
    fill: 0.46,
    fog: 0.0023,
    sky: '#142b3c',
    exposure: 1.55,
    beam: 135,
  },
  {
    name: 'HIGHLAND FOG',
    moon: 0.24,
    fill: 0.49,
    fog: 0.0034,
    sky: '#1b3041',
    exposure: 1.6,
    beam: 110,
  },
  {
    name: 'STORM FRONT',
    moon: 0.3,
    fill: 0.42,
    fog: 0.0029,
    sky: '#142733',
    exposure: 1.6,
    beam: 120,
  },
];
export const nightProfile = (m: Mission) => NIGHT_PROFILES[m.id];
/**
 * Golden hour → dusk. Each chapter's sun is driven by route progress, not wall
 * time, so a careful driver still arrives in the light the chapter was written for.
 */
export type ChapterLook = {
  name: string;
  /** Sun elevation in degrees at the start and at the clinic. */
  from: number;
  to: number;
  /** Compass of the sun (radians, world). */
  azimuth: number;
  cloud: number; // coverage 0..1
  storm: number; // darkness of the cloud base 0..1
  haze: number; // aerial perspective strength
  mist: number; // valley mist
  lush: number; // 0 dry savanna → 1 rainforest
};
export const LOOKS: ChapterLook[] = [
  { name: 'Savanna sunset', from: 15, to: -4, azimuth: 0.42, cloud: 0.32, storm: 0.1, haze: 1, mist: 0.35, lush: 0.25 },
  { name: 'Storm light', from: 10, to: -7, azimuth: 0.55, cloud: 0.72, storm: 0.72, haze: 1.1, mist: 0.75, lush: 1 },
  { name: 'River dusk', from: 11, to: -6, azimuth: 0.3, cloud: 0.45, storm: 0.25, haze: 1.2, mist: 1, lush: 0.7 },
  { name: 'Highland nightfall', from: 3.5, to: -13, azimuth: 0.6, cloud: 0.5, storm: 0.35, haze: 1.25, mist: 1, lush: 0.55 },
  { name: 'Storm sunset', from: 7, to: -13, azimuth: 0.5, cloud: 0.82, storm: 0.85, haze: 1.1, mist: 0.8, lush: 0.85 },
];
export const chapterLook = (m: Mission) => LOOKS[m.id] ?? LOOKS[0];
/** Sun elevation (degrees) along the route. Most of the fall happens late. */
export function sunElevation(m: Mission, progress: number) {
  const look = chapterLook(m);
  const t = Math.pow(Math.max(0, Math.min(1, progress / Math.max(1, m.length))), 1.35);
  return look.from + (look.to - look.from) * t;
}
/** 0 in daylight → 1 in full night. */
export function darknessAt(m: Mission, progress: number) {
  const e = sunElevation(m, progress);
  const t = Math.max(0, Math.min(1, (4 - e) / 11));
  return t * t * (3 - 2 * t);
}
export function beamMode(m: Mission, speed: number, progress?: number) {
  if (progress !== undefined && darknessAt(m, progress) < 0.3)
    return m.rain > 0.3 ? 'DAY LIGHTS · RAIN' : 'DAYLIGHT';
  return m.id === 3 || (m.rain > 0.6 && speed < 13)
    ? 'FOG BEAMS'
    : speed > 10
      ? 'HIGH BEAMS'
      : 'DIPPED BEAMS';
}
