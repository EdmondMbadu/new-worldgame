import { beforeAll, describe, expect, it } from 'vitest';
import { GameEngine, emptyInput, initPhysics } from '../src/engine';
import { MISSIONS, roadDistance, routeX } from '../src/missions';
import { roadWidth } from '../src/routes';
import { sceneryLayout, TRUNK_RADIUS, worldPose } from '../src/scenery-layout';
import { darknessAt, sunElevation } from '../src/night';

beforeAll(() => initPhysics());

/** Aim the truck at a world point from `back` metres away and give it speed. */
function launchAt(e: GameEngine, target: { x: number; y: number; z: number }, back: number, speed: number, dir = 0) {
  const heading = dir;
  const x = target.x - Math.sin(heading) * back,
    z = target.z - Math.cos(heading) * back;
  e.body.setTranslation({ x, y: target.y + 1.2, z }, true);
  e.body.setRotation({ x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }, true);
  e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  for (let i = 0; i < 30; i++) {
    e.body.setLinvel({ x: Math.sin(heading) * speed, y: 0, z: Math.cos(heading) * speed }, true);
    e.step(1 / 60, { ...emptyInput(), throttle: 1 });
  }
}

describe('golden hour to dusk', () => {
  it('starts every chapter in daylight and sets the sun as the clinic approaches', () => {
    for (const m of MISSIONS) {
      expect(darknessAt(m, 0)).toBeLessThan(0.05);
      let last = Infinity;
      for (let s = 0; s <= m.length; s += 50) {
        const e = sunElevation(m, s);
        expect(e).toBeLessThanOrEqual(last);
        last = e;
      }
      expect(darknessAt(m, m.length)).toBeGreaterThan(m.id >= 3 ? 0.9 : 0.3);
    }
  });
});

describe('a solid, physical roadside', () => {
  it('keeps trees, rocks and homes out of both drivable routes', () => {
    for (const m of MISSIONS) {
      const layout = sceneryLayout(m);
      for (const p of layout.plants)
        if (TRUNK_RADIUS[p.kind] > 0) expect(roadDistance(m, p.x, p.z)).toBeGreaterThan(roadWidth(m, p.z) + 3);
      for (const h of layout.homes) {
        expect(Math.abs(h.x - routeX(m, h.z))).toBeGreaterThan(9);
        expect(Math.abs(h.x - routeX(m, h.z, true))).toBeGreaterThan(9);
      }
      expect(sceneryLayout(m)).toBe(layout);
    }
  });

  it('stops the truck at a tree trunk instead of passing through it', () => {
    const m = MISSIONS[0];
    const e = new GameEngine(m);
    try {
      const tree = sceneryLayout(m).plants.find(
        (p) => (p.kind === 'acacia' || p.kind === 'broadleaf') && roadDistance(m, p.x, p.z) < 25 && p.z > 60,
      )!;
      const w = worldPose(m, tree.x, tree.z);
      const heading = Math.PI / 2 * Math.sign(w.x - e.position.x || 1);
      launchAt(e, w, 14, 9, heading);
      let closest = Infinity;
      for (let i = 0; i < 120; i++) {
        e.step(1 / 60, { ...emptyInput(), throttle: 1 });
        const along = (e.position.x - w.x) * Math.sin(heading) + (e.position.z - w.z) * Math.cos(heading);
        closest = Math.min(closest, Math.abs(along));
        // The truck's centre never reaches the far side of the trunk.
        expect(along).toBeLessThan(0.5);
      }
      expect(e.contactSerial).toBeGreaterThan(0);
    } finally {
      e.dispose();
    }
  });

  it('knocks a reflector post flying and keeps driving', () => {
    const m = MISSIONS[0];
    const e = new GameEngine(m);
    try {
      const layout = sceneryLayout(m);
      const index = layout.posts.findIndex((p) => p.kind === 'reflector' && p.z > 100 && p.z < 200);
      const post = layout.posts[index];
      const w = worldPose(m, post.x, post.z);
      const start = worldPose(m, post.x, post.z - 12);
      const heading = Math.atan2(w.x - start.x, w.z - start.z);
      launchAt(e, w, 12, 8, heading);
      for (let i = 0; i < 90; i++) e.step(1 / 60, { ...emptyInput(), throttle: 0.6 });
      expect(e.knocked.map((k) => k.index)).toContain(index);
      expect(e.integrity).toBe(100);
      expect(Math.abs(e.speed)).toBeGreaterThan(3);
    } finally {
      e.dispose();
    }
  });

  it('shoves a struck car away and lets it recover its lane', () => {
    const e = new GameEngine(MISSIONS[0]);
    try {
      const car = e.traffic.cars[0];
      const before = { ...car.pose };
      e.traffic.push(car.id, 4, 0, 0.8);
      const player = { x: 9999, y: 0, z: 9999, station: -500, speed: 0, heading: 0 };
      e.traffic.update(0.1, player, e.encounters);
      const moved = car.shove!.x;
      expect(moved).toBeGreaterThan(0.2);
      for (let i = 0; i < 600; i++) e.traffic.update(1 / 60, player, e.encounters);
      expect(Math.abs(car.shove?.x ?? 0)).toBeLessThan(moved);
      expect(before).toBeDefined();
    } finally {
      e.dispose();
    }
  });
});
