import { beforeAll, describe, it, expect } from 'vitest';
import { GameEngine, initPhysics, emptyInput } from '../src/engine';
import { MISSIONS, routeX, clamp, roadX } from '../src/missions';
beforeAll(() => initPhysics());
import { driveInput } from '../src/qa-driver';
export const pilot = (e: GameEngine, alternate = false) =>
  driveInput(e, alternate);
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
