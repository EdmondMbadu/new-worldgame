import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameEngine, initPhysics, emptyInput, type Phase } from '../src/engine';
import { MISSIONS, heightAt } from '../src/missions';
import { ridgeAt, roadWidth, routeHeading, routePoint } from '../src/routes';

beforeAll(initPhysics);

describe('getting a trapped truck back onto the road', () => {
  it.each(['forward', 'reverse'] as const)('keeps recovery available after releasing a blocked %s attempt', (direction) => {
    const mission = { ...MISSIONS[0], bend: 0, mud: [] };
    const engine = new GameEngine(mission);
    try {
      const z = direction === 'forward' ? 20 : 3;
      engine.world.createCollider(
        RAPIER.ColliderDesc.cuboid(5, 3, 1).setTranslation(0, heightAt(mission, 0, z) + 1, z),
      );
      engine.phase = 'driving';
      const attempt = { ...emptyInput(), [direction === 'forward' ? 'throttle' : 'brake']: 1 };
      for (let i = 0; i < 480; i++) engine.step(1 / 60, attempt);
      expect(Math.abs(engine.speed)).toBeLessThan(0.6);
      expect(engine.needsRecovery).toBe(true);

      // A player lets go of the arrows to find/click Recover or press E.
      for (let i = 0; i < 90; i++) engine.step(1 / 60, emptyInput());
      expect(engine.needsRecovery).toBe(true);
      const reserve = engine.time;
      const integrity = engine.integrity;
      engine.step(1 / 60, { ...emptyInput(), action: true });
      expect(engine.recoveries).toBe(1);
      expect(engine.time).toBeCloseTo(reserve - 8 - 1 / 60);
      expect(engine.integrity).toBe(integrity);
      expect(engine.needsRecovery).toBe(false);
      for (let i = 0; i < 90; i++) engine.step(1 / 60, { ...emptyInput(), action: true });
      expect(engine.recoveries).toBe(1);
    } finally {
      engine.dispose();
    }
  });

  it('recovers an undetected cliff-edge jam from pause, avoiding traffic at the checkpoint', () => {
    const mission = MISSIONS[3];
    const engine = new GameEngine(mission);
    try {
      const pivot = mission.ridges[0];
      const edge = routePoint(mission, pivot, false, -roadWidth(mission, pivot) + 0.5);
      const heading = routeHeading(mission, pivot);
      engine.body.setTranslation({ ...edge, y: routePoint(mission, pivot).y + 1.05 }, true);
      engine.body.setRotation({ x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }, true);
      engine.phase = 'driving';
      engine.step(1 / 60, emptyInput());
      engine.safeZ = pivot - 100;
      engine.integrity = 61;
      expect(engine.needsRecovery).toBe(false);
      const car = engine.traffic.cars[0];
      car.pose = { ...car.pose, ...routePoint(mission, engine.safeZ) };
      const reserve = engine.time;
      engine.pause();
      engine.recover();
      expect(engine.phase).toBe('driving');
      expect(engine.recoveries).toBe(1);
      expect(engine.time).toBe(reserve - 8);
      expect(engine.integrity).toBe(61);
      expect(engine.practice).toBe(false);
      expect(engine.progress).toBeLessThan(engine.safeZ);
      expect(ridgeAt(mission, engine.progress)).toBeLessThan(0.05);
      expect(engine.traffic.occupied(engine.position.x, engine.position.z, 12)).toBe(false);
      expect(engine.body.linvel()).toMatchObject({ x: 0, y: 0, z: 0 });
    } finally {
      engine.dispose();
    }
  });

  it('fails normally when recovery from pause uses the last of the reserve', () => {
    const engine = new GameEngine(MISSIONS[0]);
    try {
      engine.phase = 'driving';
      engine.time = 7;
      engine.pause();
      engine.recover();
      expect(engine.phase).toBe('failed');
      expect(engine.time).toBe(0);
      expect(engine.recoveries).toBe(1);
      expect(engine.result).toBeNull();
    } finally {
      engine.dispose();
    }
  });

  it.each(['ready', 'restoring', 'results', 'failed'] as Phase[])('does not recover during %s or its pause screen', (phase) => {
    const engine = new GameEngine(MISSIONS[0]);
    try {
      engine.phase = phase;
      engine.recover();
      engine.pause();
      const pausedPhase = engine.phase;
      engine.recover();
      expect(engine.phase).toBe(pausedPhase);
      expect(engine.time).toBe(engine.initial);
      expect(engine.recoveries).toBe(0);
    } finally {
      engine.dispose();
    }
  });
});
