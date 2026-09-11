import { expect, it } from 'vitest';
import { GameEngine, emptyInput, distance, type Input } from '../src/engine';
import { CONFIG as C } from '../src/config';
const advance = (
  g: GameEngine,
  duration: number,
  input: Partial<Input> = {},
) => {
  for (let i = 0; i < Math.round(duration * 120); i++)
    g.step(1 / 120, {
      ...emptyInput(),
      ...input,
      boost: i === 0 && !!input.boost,
    });
};
const openSpace = () => {
  const g = new GameEngine();
  g.reset();
  Object.assign(g.player, { x: -1, y: 0, z: -14 });
  return g;
};

it('flies vertically, brakes vertical drift, and respects both altitude limits', () => {
  const g = openSpace();
  advance(g, 1, { y: 1 });
  expect(g.player.y).toBeGreaterThan(2);
  advance(g, 0.5, { brake: true });
  expect(Math.abs(g.player.vy)).toBeLessThan(0.1);
  advance(g, 8, { y: 1 });
  expect(g.player.y).toBeLessThanOrEqual(C.altitude.max);
  advance(g, 12, { y: -1 });
  expect(g.player.y).toBeGreaterThanOrEqual(C.altitude.min);
});
it('boosts vertically when climbing rather than launching forward', () => {
  const g = openSpace();
  advance(g, 0.3, { y: 1, boost: true });
  expect(g.player.vy).toBeGreaterThan(C.altitude.speed);
  expect(Math.abs(g.player.vx) + Math.abs(g.player.vz)).toBeLessThan(0.01);
});
it('requires altitude proximity for pickup and a low approach for docking', () => {
  const g = openSpace();
  const c = g.cells[2];
  Object.assign(g.player, { x: c.x, z: c.z, y: 0 });
  advance(g, 0.1);
  expect(c.state).toBe('floating');
  g.player.y = c.y;
  advance(g, 0.1);
  expect(c.state).toBe('carried');
  Object.assign(g.player, { x: 0, z: 3.8, y: 7 });
  g.deposit();
  expect(g.power).toBe(0);
  g.player.y = 0;
  g.deposit();
  expect(g.power).toBe(1);
});
it('allows flying above a rock that would block the same horizontal position', () => {
  const g = openSpace();
  const a = g.asteroids[0];
  Object.assign(g.player, { x: a.x, z: a.z, y: 8 });
  advance(g, 0.1);
  expect(g.bumps).toBe(0);
  g.player.y = 0;
  advance(g, 0.1);
  expect(g.bumps).toBe(1);
});
it('warns first, then an incoming asteroid reaches a stationary player', () => {
  const g = openSpace();
  g.cells[0].state = 'carried';
  advance(g, C.threats.firstWave + 0.1);
  const rock = g.meteors.find((m) => m.active)!;
  expect(rock).toBeDefined();
  const start = { ...rock };
  advance(g, 0.5);
  expect(rock.x).toBe(start.x);
  expect(rock.z).toBe(start.z);
  advance(g, 3.65);
  expect(g.bumps).toBe(1);
  expect(g.cargo).toBe(0);
  expect(g.cells.some((c) => c.state === 'dropped')).toBe(true);
  expect(g.cells).toHaveLength(5);
});
it('locks the incoming trajectory once so a climb can evade it', () => {
  const g = openSpace();
  advance(g, C.threats.firstWave + 0.1);
  const rock = g.meteors.find((m) => m.active)!;
  const trajectory = {
    vx: rock.vx,
    vy: rock.vy,
    vz: rock.vz,
    target: { ...rock.target },
  };
  advance(g, 2, { y: 1 });
  advance(g, 2, { brake: true });
  expect(g.bumps).toBe(0);
  expect({
    vx: rock.vx,
    vy: rock.vy,
    vz: rock.vz,
    target: rock.target,
  }).toEqual(trajectory);
});
it('a close miss rewards one dodge and immediately recharges boost', () => {
  const g = openSpace();
  const m = g.meteors[0];
  Object.assign(m, {
    active: true,
    age: 2,
    x: g.player.x - 3,
    y: 2.3,
    z: g.player.z,
    vx: 10,
    vy: 0,
    vz: 0,
    closest: Infinity,
    counted: false,
  });
  g.player.cooldown = 2;
  advance(g, 0.8);
  expect(g.bumps).toBe(0);
  expect(g.dodges).toBe(1);
  expect(g.player.cooldown).toBe(0);
  advance(g, 0.8);
  expect(g.dodges).toBe(1);
});
it('keeps docking sheltered through many waves and bounds the meteor pool', () => {
  const g = new GameEngine();
  g.reset();
  g.player.z = 3.8;
  advance(g, 90, { brake: true });
  expect(g.bumps).toBe(0);
  expect(g.meteors).toHaveLength(C.threats.pool);
  expect(
    g.meteors
      .filter((m) => m.active)
      .every((m) => distance(m, { x: 0, y: 0, z: 0 }) >= C.threats.shelter),
  ).toBe(true);
});
it('freezes incoming hazards when paused and clears them on replay', () => {
  const g = openSpace();
  advance(g, 5);
  g.pause();
  const state = JSON.stringify(g.meteors);
  advance(g, 10);
  expect(JSON.stringify(g.meteors)).toBe(state);
  g.reset();
  expect(g.meteors.some((m) => m.active)).toBe(false);
  expect(g.dodges).toBe(0);
  expect(g.player.y).toBe(0);
  expect(g.player.vy).toBe(0);
});
