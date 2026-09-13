import { beforeAll, describe, it, expect } from 'vitest';
import { GameEngine, initPhysics, emptyInput } from '../src/engine';
import { MISSIONS, routeX, clamp, roadX } from '../src/missions';
beforeAll(() => initPhysics());
export function pilot(e: GameEngine, alternate = false) {
  const p = e.position,
    z = Math.min(e.mission.length, p.z + 7 + Math.abs(e.speed) * 0.55),
    x = routeX(e.mission, z, alternate);
  let error = Math.atan2(x - p.x, z - p.z) - e.heading;
  while (error > Math.PI) error -= 2 * Math.PI;
  while (error < -Math.PI) error += 2 * Math.PI;
  const remain = e.mission.length - p.z;
  const target =
    remain < 15
      ? Math.max(0, (remain - 2) * 0.7)
      : e.surface === 'Mud'
        ? 6.5
        : e.surface === 'Bridge'
          ? 4.5
          : 9;
  return {
    steer: clamp(error * 2.3, -1, 1),
    throttle: e.speed < target ? 0.8 : 0,
    brake: e.speed > target + 0.3 ? 0.45 : 0,
    action: e.canDeliver,
  };
}
describe('ordinary driving', () => {
  for (const mission of MISSIONS)
    for (const alt of [false, true])
      it(`delivers ${mission.title} via ${alt ? 'firmer' : 'short'} route with ordinary inputs`, () => {
        const e = new GameEngine(mission);
        try {
          for (
            let i = 0;
            i < mission.seconds * 60 &&
            e.phase !== 'restoring' &&
            e.phase !== 'failed';
            i++
          )
            e.step(1 / 60, pilot(e, alt));
          console.log(
            mission.title,
            alt ? 'alternate' : 'main',
            e.phase,
            Math.round(e.position.z),
            Math.round(e.time),
            Math.round(e.integrity),
          );
          expect(e.phase).toBe('restoring');
          expect(e.result?.stars).toBeGreaterThan(0);
          expect(e.result?.lives).toBe(mission.lives);
        } finally {
          e.dispose();
        }
      });
});
