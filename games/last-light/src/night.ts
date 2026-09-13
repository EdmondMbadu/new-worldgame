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
export function beamMode(m: Mission, speed: number) {
  return m.id === 3 || (m.rain > 0.6 && speed < 13)
    ? 'FOG BEAMS'
    : speed > 10
      ? 'HIGH BEAMS'
      : 'DIPPED BEAMS';
}
