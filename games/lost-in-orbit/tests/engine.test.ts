import { describe, expect, it } from 'vitest';
import { CONFIG as C, ASTEROID_LAYOUT, CELL_LAYOUT } from '../src/config';
import { GameEngine, distance, emptyInput, type Input } from '../src/engine';

function advance(
  engine: GameEngine,
  seconds: number,
  input: Partial<Input> = {},
  fps = 60,
) {
  for (let i = 0; i / fps < seconds - 1e-10; i++)
    engine.step(Math.min(1 / fps, seconds - i / fps), {
      ...emptyInput(),
      ...input,
      boost: i === 0 && !!input.boost,
      deposit: i === 0 && !!input.deposit,
    });
}
function openSpace(engine: GameEngine) {
  engine.reset();
  engine.player.x = -1;
  engine.player.z = -14;
}

describe('flight simulation', () => {
  it('starts on the title with a safe authored layout', () => {
    const engine = new GameEngine();
    expect(engine.phase).toBe('title');
    expect(engine.cells).toHaveLength(5);
    expect(engine.cargo).toBe(0);
    for (const cell of engine.cells) {
      expect(distance(engine.player, cell)).toBeGreaterThan(
        C.cargo.pickupRadius,
      );
      for (const asteroid of engine.asteroids)
        expect(distance(cell, asteroid)).toBeGreaterThan(asteroid.radius + 0.6);
    }
    for (const a of ASTEROID_LAYOUT)
      expect(
        Math.hypot(a.x, a.z) - Math.max(a.rx, a.rz) - a.radius,
      ).toBeGreaterThan(C.docking.radius);
  });
  it('does not move or run the timer until rescue starts', () => {
    const engine = new GameEngine();
    advance(engine, 3, { z: -1 });
    expect(engine.time).toBe(0);
    expect(engine.player.z).toBe(5.8);
  });
  it('maps up to -Z and right to +X with normalized diagonals', () => {
    const cardinal = new GameEngine(),
      diagonal = new GameEngine();
    openSpace(cardinal);
    openSpace(diagonal);
    advance(cardinal, 0.5, { z: -1 });
    advance(diagonal, 0.5, { z: -1, x: 1 });
    expect(cardinal.player.z).toBeLessThan(-14);
    expect(diagonal.player.x).toBeGreaterThan(-1);
    expect(Math.hypot(cardinal.player.vx, cardinal.player.vz)).toBeCloseTo(
      Math.hypot(diagonal.player.vx, diagonal.player.vz),
      8,
    );
  });
  it('produces the same trajectory at 30, 60 and 144 FPS', () => {
    const games = [30, 60, 144].map((fps) => {
      const g = new GameEngine();
      openSpace(g);
      advance(g, 0.8, { x: 1 }, fps);
      return g;
    });
    for (const g of games.slice(1)) {
      expect(g.player.x).toBeCloseTo(games[0].player.x, 8);
      expect(g.time).toBeCloseTo(games[0].time, 8);
    }
  });
  it('brakes much faster than passive drift', () => {
    const drift = new GameEngine(),
      brake = new GameEngine();
    openSpace(drift);
    openSpace(brake);
    drift.player.vx = 6;
    brake.player.vx = 6;
    advance(drift, 0.5);
    advance(brake, 0.5, { brake: true });
    expect(Math.abs(brake.player.vx)).toBeLessThan(
      Math.abs(drift.player.vx) * 0.1,
    );
    expect(drift.player.vx).toBeGreaterThan(2);
  });
  it('caps frame stalls and ignores non-finite deltas', () => {
    const g = new GameEngine();
    g.reset();
    g.step(9, { ...emptyInput(), x: 1 });
    expect(g.time).toBeCloseTo(0.1, 6);
    const time = g.time;
    g.step(NaN, emptyInput());
    g.step(Infinity, emptyInput());
    g.step(-3, emptyInput());
    expect(g.time).toBe(time);
  });
  it('boosts, expires, rejects early reactivation, and recharges exactly once', () => {
    const g = new GameEngine();
    openSpace(g);
    const events: string[] = [];
    g.onEvent((e) => events.push(e.type));
    advance(g, 0.3, { z: -1, boost: true });
    expect(Math.hypot(g.player.vx, g.player.vz)).toBeGreaterThan(
      C.movement.speed,
    );
    const cooldown = g.player.cooldown;
    g.step(1 / 60, { ...emptyInput(), boost: true });
    expect(g.player.cooldown).toBeLessThan(cooldown);
    advance(g, 0.2, { brake: true });
    expect(g.player.boosting).toBe(0);
    advance(g, 3, { brake: true });
    expect(g.player.cooldown).toBe(0);
    expect(events.filter((e) => e === 'boost')).toHaveLength(1);
    expect(events.filter((e) => e === 'recharge')).toHaveLength(1);
  });
  it('can boost while stationary using its facing direction', () => {
    const g = new GameEngine();
    openSpace(g);
    g.player.facing = Math.PI / 2;
    advance(g, 0.1, { boost: true });
    expect(g.player.vx).toBeGreaterThan(0);
    expect(Math.abs(g.player.vz)).toBeLessThan(0.01);
  });
  it('contains high-speed motion at all four outer limits', () => {
    for (const axis of ['x', 'z'] as const)
      for (const sign of [-1, 1]) {
        const g = new GameEngine();
        g.reset();
        const limit = axis === 'x' ? C.arena.halfWidth : C.arena.halfDepth;
        g.player[axis] = sign * (limit - 0.7);
        g.player[axis === 'x' ? 'vx' : 'vz'] = sign * 200;
        advance(g, 1, axis === 'x' ? { x: sign } : { z: sign });
        expect(Math.abs(g.player[axis])).toBeLessThanOrEqual(
          limit - C.movement.radius,
        );
      }
  });
});

describe('cargo and recovery', () => {
  it('collects once, never overfills, and deposits all carried cells once', () => {
    const g = new GameEngine();
    g.reset();
    Object.assign(g.player, { x: -8, z: -5 });
    g.cells.forEach((c) => Object.assign(c, { x: -8, z: -5 }));
    advance(g, 0.2);
    expect(g.cargo).toBe(2);
    expect(g.cells.filter((c) => c.state === 'floating')).toHaveLength(3);
    advance(g, 1);
    expect(g.cargo).toBe(2);
    g.player.x = 0;
    g.player.z = 3.8;
    g.deposit();
    g.deposit();
    expect(g.power).toBe(2);
    expect(g.cargo).toBe(0);
    expect(g.cells.filter((c) => c.state === 'deposited')).toHaveLength(2);
  });
  it('rejects deposits outside the docking ring', () => {
    const g = new GameEngine();
    g.reset();
    g.cells[0].state = 'carried';
    g.deposit();
    expect(g.power).toBe(0);
    expect(g.cargo).toBe(1);
  });
  it('separates overlapping players, drops one safe cell, and respects pickup grace', () => {
    const g = new GameEngine();
    g.reset();
    g.cells[0].state = 'carried';
    g.cells[1].state = 'carried';
    g.player.x = g.asteroids[0].x;
    g.player.z = g.asteroids[0].z;
    advance(g, 1 / 60);
    expect(g.bumps).toBe(1);
    expect(g.cargo).toBe(1);
    expect(g.player.immunity).toBeGreaterThan(1.4);
    const dropped = g.cells.find((c) => c.state === 'dropped')!;
    expect(dropped).toBeDefined();
    expect(Math.hypot(dropped.x, dropped.z)).toBeGreaterThan(C.docking.radius);
    for (const a of g.asteroids)
      expect(distance(dropped, a)).toBeGreaterThan(a.radius + 1.3);
    expect(Math.abs(dropped.x)).toBeLessThan(38);
    expect(Math.abs(dropped.z)).toBeLessThan(28);
    Object.assign(g.player, { x: dropped.x, z: dropped.z, vx: 0, vz: 0 });
    advance(g, 0.5, { brake: true });
    expect(dropped.state).toBe('dropped');
    advance(g, 0.4, { brake: true });
    expect(dropped.state).toBe('carried');
    expect(g.cargo).toBe(2);
  });
  it('does not repeat penalties during immunity or delete deposited cells', () => {
    const g = new GameEngine();
    g.reset();
    g.cells[0].state = 'deposited';
    g.power = 1;
    for (let i = 0; i < 60; i++) {
      g.player.x = g.asteroids[0].x;
      g.player.z = g.asteroids[0].z;
      g.step(1 / 60, emptyInput());
    }
    expect(g.bumps).toBe(1);
    expect(g.cells).toHaveLength(5);
    expect(g.cells[0].state).toBe('deposited');
    expect(g.power).toBe(1);
  });
  it('prevents boosted tunneling through an obstacle on a long frame', () => {
    const g = new GameEngine();
    g.reset();
    const a = g.asteroids[0];
    Object.assign(g.player, {
      x: a.x - a.radius - 1.3,
      z: a.z,
      vx: 13,
      vz: 0,
      boosting: 0.4,
    });
    g.step(0.1, { ...emptyInput(), x: 1 });
    expect(g.bumps).toBe(1);
    expect(g.player.x).toBeLessThan(g.asteroids[0].x);
  });
  it('always finds a reachable drop throughout the authored asteroid cycle', () => {
    const g = new GameEngine();
    g.reset();
    for (let t = 0; t < 120; t += 5) {
      g.time = t;
      g.step(1 / 120, emptyInput());
      for (const origin of [
        ...g.asteroids,
        { x: 39, z: 29 },
        { x: -39, z: -29 },
        { x: 0, z: 0 },
      ]) {
        const drop = g.safeDropPosition(origin);
        expect(Math.abs(drop.x)).toBeLessThan(38);
        expect(Math.abs(drop.z)).toBeLessThan(28);
        expect(Math.hypot(drop.x, drop.z)).toBeGreaterThan(5.5);
        for (const a of g.asteroids)
          expect(distance(drop, a)).toBeGreaterThan(a.radius + 1.4);
      }
    }
  });
});

describe('pause, victory and replay', () => {
  it('freezes simulation and all cooldowns until explicit resume', () => {
    const g = new GameEngine();
    g.reset();
    advance(g, 0.2, { boost: true });
    g.pause();
    const saved = JSON.stringify({
      player: g.player,
      time: g.time,
      asteroids: g.asteroids,
    });
    advance(g, 20, { x: 1, boost: true, deposit: true });
    expect(
      JSON.stringify({
        player: g.player,
        time: g.time,
        asteroids: g.asteroids,
      }),
    ).toBe(saved);
    g.resume();
    advance(g, 0.2);
    expect(g.time).toBeGreaterThan(0.3);
  });
  it('wins exactly once, freezes the round timer, and pauses the launch too', () => {
    const g = new GameEngine();
    g.reset();
    const events: string[] = [];
    g.onEvent((event) => events.push(event.type));
    advance(g, 5);
    g.player.z = 3.8;
    for (let i = 0; i < 5; i++) {
      g.cells[i].state = 'carried';
      g.deposit();
    }
    expect(g.phase).toBe('winning');
    expect(g.power).toBe(5);
    const time = g.time;
    g.deposit();
    advance(g, 1);
    g.pause();
    const launchTime = g.launchTime;
    advance(g, 10);
    expect(g.launchTime).toBe(launchTime);
    g.resume();
    advance(g, 5);
    expect(g.phase).toBe('results');
    expect(g.time).toBe(time);
    expect(events.filter((e) => e === 'win')).toHaveLength(1);
    const bumps = g.bumps;
    advance(g, 10);
    expect(g.bumps).toBe(bumps);
  });
  it('replays with identical layout and completely fresh gameplay state', () => {
    const g = new GameEngine();
    g.reset();
    const initial = JSON.stringify(g.asteroids);
    g.cells[0].state = 'deposited';
    g.cells[1].state = 'carried';
    g.power = 1;
    g.bumps = 4;
    g.tutorial = 5;
    g.player.immunity = 1;
    advance(g, 2, { x: 1, boost: true });
    g.reset();
    expect(g.phase).toBe('playing');
    expect(g.power).toBe(0);
    expect(g.cargo).toBe(0);
    expect(g.time).toBe(0);
    expect(g.bumps).toBe(0);
    expect(g.tutorial).toBe(0);
    expect(g.player.vx).toBe(0);
    expect(g.player.vz).toBe(0);
    expect(g.player.cooldown).toBe(0);
    expect(g.player.immunity).toBe(0);
    expect(JSON.stringify(g.asteroids)).toBe(initial);
    expect(g.cells.map(({ x, z }) => ({ x, z }))).toEqual(
      CELL_LAYOUT.map(({ x, z }) => ({ x, z })),
    );
  });
});
