import {
  clamp,
  isMud,
  onBridge,
  roadDistance,
  roadX,
  smooth,
  type Mission,
} from './missions';

export const ROAD_REVISION = 2;
export const RESTORE_DURATION = 18;
export const TUNING = {
  speed: 22.2, // 80 km/h on firm, visible road; curves still require braking.
  mudSpeed: 10.5,
  vergeSpeed: 7.5,
  force: 1250,
  brake: 34,
  wheelRadius: 0.43,
  suspension: 0.45,
};
export type SurfaceSample = {
  name: 'Gravel' | 'Mud' | 'Verge' | 'Bridge';
  grip: number;
  sideGrip: number;
  speed: number;
  wet: number;
};

export function surfaceAt(m: Mission, x: number, z: number): SurfaceSample {
  if (onBridge(m, z) && Math.abs(x - roadX(m, z)) < 2.8)
    return {
      name: 'Bridge',
      grip: 4.4,
      sideGrip: 1.05,
      speed: TUNING.speed,
      wet: m.rain,
    };
  const verge = smooth(5.1, 7.4, roadDistance(m, x, z));
  let mud = 0;
  for (const [a, b] of m.mud)
    mud = Math.max(
      mud,
      smooth(a - 4, a + 5, z) *
        (1 - smooth(b - 5, b + 4, z)) *
        (1 - smooth(4.7, 6.2, Math.abs(x - roadX(m, z)))),
    );
  return {
    name: verge > 0.65 ? 'Verge' : isMud(m, x, z) ? 'Mud' : 'Gravel',
    grip: 4.8 - mud * 1.4 - verge * 0.9 - m.rain * 0.2,
    sideGrip: 1.15 - mud * 0.32 - verge * 0.2,
    speed:
      TUNING.speed * (1 - verge) * (1 - mud) +
      TUNING.mudSpeed * mud * (1 - verge) +
      TUNING.vergeSpeed * verge,
    wet: Math.max(m.rain, mud),
  };
}

export function impactDamage(
  speedLost: number,
  landingSpeed: number,
  compressionRate: number,
  speed: number,
) {
  // Shallow roughness creates feedback, not an invisible damage tax.
  const collision = speedLost > 3.8 ? (speedLost - 3) * 3.1 : 0;
  const landing = landingSpeed > 4.2 ? (landingSpeed - 3.7) * 5 : 0;
  const bottomOut =
    compressionRate > 4.5 && speed > 13 ? (compressionRate - 4.1) * 2.4 : 0;
  return clamp(Math.max(collision, landing, bottomOut), 0, 36);
}

export function engineRpm(speed: number, gear: number, throttle: number) {
  const ratios = [0, 520, 290, 205, 155, 125];
  return clamp(
    850 + Math.abs(speed) * ratios[gear] + throttle * 360,
    850,
    4900,
  );
}
