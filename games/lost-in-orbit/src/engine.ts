import { ASTEROID_LAYOUT, CELL_LAYOUT, CONFIG as C } from './config';

export type Phase = 'title' | 'playing' | 'paused' | 'winning' | 'results';
export type Vec2 = { x: number; z: number; y?: number };
export type Meteor = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  target: { x: number; y: number; z: number };
  age: number;
  closest: number;
  counted: boolean;
  radius: number;
};
export type Cell = Vec2 & {
  id: number;
  y: number;
  state: 'floating' | 'carried' | 'deposited' | 'dropped';
  availableAt: number;
};
export type Input = {
  y?: number;
  x: number;
  z: number;
  brake: boolean;
  boost: boolean;
  deposit: boolean;
};
export type GameEvent = {
  type:
    | 'pickup'
    | 'deposit'
    | 'impact'
    | 'boost'
    | 'recharge'
    | 'win'
    | 'reset'
    | 'warning'
    | 'dodge';
  x: number;
  y: number;
  z: number;
  count?: number;
};
export type Snapshot = {
  phase: Phase;
  time: number;
  power: number;
  cargo: number;
  bumps: number;
  cooldown: number;
  boost: number;
  docking: boolean;
  speed: number;
  notice: string;
  tutorial: number;
  boundary: boolean;
  round: number;
  altitude: number;
  incoming: number;
  dodges: number;
  sheltered: boolean;
};

export const emptyInput = (): Input => ({
  x: 0,
  y: 0,
  z: 0,
  brake: false,
  boost: false,
  deposit: false,
});
export const distance = (a: Vec2, b: Vec2) =>
  Math.hypot(a.x - b.x, (a.y ?? 0) - (b.y ?? 0), a.z - b.z);
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export class GameEngine {
  phase: Phase = 'title';
  previousPhase: 'playing' | 'winning' = 'playing';
  time = 0;
  launchTime = 0;
  round = 0;
  player = {
    x: 0,
    y: 0,
    vy: 0,
    z: 5.8,
    vx: 0,
    vz: 0,
    facing: Math.PI,
    immunity: 0,
    boosting: 0,
    cooldown: 0,
    thrust: 0,
    braking: false,
  };
  cells: Cell[] = [];
  asteroids = ASTEROID_LAYOUT.map((a) => ({
    ...a,
    x: a.x as number,
    z: a.z as number,
    y: 0,
  }));
  meteors: Meteor[] = Array.from({ length: C.threats.pool }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    target: { x: 0, y: 0, z: 0 },
    age: 0,
    closest: Infinity,
    counted: false,
    radius: C.threats.radius,
  }));
  dodges = 0;
  private nextWave = C.threats.firstWave as number;
  private wave = 0;
  power = 0;
  bumps = 0;
  tutorial = 0;
  notice = '';
  noticeUntil = 0;
  private accumulator = 0;
  private hudClock = 0;
  private contacts = new Set<number>();
  private boostDirection = { x: 0, y: 0, z: -1 };
  private moved = 0;
  private braked = false;
  private boosted = false;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(event: GameEvent) => void>();
  private snapshot!: Snapshot;

  constructor() {
    this.reset('title');
  }
  get cargo() {
    return this.cells.filter((c) => c.state === 'carried').length;
  }
  get docking() {
    return (
      Math.hypot(this.player.x, this.player.z) <= C.docking.radius &&
      Math.abs(this.player.y) < 1.4
    );
  }
  get sheltered() {
    return (
      Math.hypot(this.player.x, this.player.z, this.player.y) <
      C.threats.shelter
    );
  }
  get boundary() {
    return (
      Math.abs(this.player.x) > C.arena.halfWidth - C.arena.softMargin ||
      Math.abs(this.player.z) > C.arena.halfDepth - C.arena.softMargin
    );
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  onEvent(listener: (event: GameEvent) => void) {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }
  private emit(type: GameEvent['type'], count?: number) {
    for (const cb of this.eventListeners)
      cb({ type, x: this.player.x, y: this.player.y, z: this.player.z, count });
  }

  publish() {
    this.snapshot = {
      phase: this.phase,
      time: this.time,
      power: this.power,
      cargo: this.cargo,
      bumps: this.bumps,
      cooldown: this.player.cooldown,
      boost: this.player.boosting,
      docking: this.docking,
      speed: Math.hypot(this.player.vx, this.player.vy, this.player.vz),
      notice: this.time < this.noticeUntil ? this.notice : '',
      tutorial: this.tutorial,
      boundary: this.boundary,
      round: this.round,
      altitude: this.player.y,
      incoming: this.meteors.filter((m) => m.active).length,
      dodges: this.dodges,
      sheltered: this.sheltered,
    };
    for (const listener of this.listeners) listener();
  }

  reset(phase: 'title' | 'playing' = 'playing') {
    this.phase = phase;
    this.previousPhase = 'playing';
    this.round++;
    this.time = 0;
    this.launchTime = 0;
    this.power = 0;
    this.bumps = 0;
    this.accumulator = 0;
    this.hudClock = 0;
    this.contacts.clear();
    this.nextWave = C.threats.firstWave;
    this.wave = 0;
    this.dodges = 0;
    this.meteors.forEach((m) => {
      m.active = false;
      m.age = 0;
    });
    Object.assign(this.player, {
      x: 0,
      y: 0,
      vy: 0,
      z: 5.8,
      vx: 0,
      vz: 0,
      facing: Math.PI,
      immunity: 0,
      boosting: 0,
      cooldown: 0,
      thrust: 0,
      braking: false,
    });
    this.cells = CELL_LAYOUT.map((p, id) => ({
      id,
      x: p.x,
      y: p.y,
      z: p.z,
      state: 'floating',
      availableAt: 0,
    }));
    this.moved = 0;
    this.braked = false;
    this.boosted = false;
    this.tutorial = 0;
    this.notice = '';
    this.noticeUntil = 0;
    this.updateAsteroids();
    this.emit('reset');
    this.publish();
  }

  pause() {
    if (this.phase !== 'playing' && this.phase !== 'winning') return;
    this.previousPhase = this.phase;
    this.phase = 'paused';
    this.player.thrust = 0;
    this.player.braking = false;
    this.accumulator = 0;
    this.publish();
  }
  resume() {
    if (this.phase === 'paused') {
      this.phase = this.previousPhase;
      this.accumulator = 0;
      this.publish();
    }
  }

  step(delta: number, input: Input) {
    if (!Number.isFinite(delta) || delta <= 0) return;
    if (this.phase === 'winning') {
      this.launchTime += Math.min(delta, C.timing.maxDelta);
      this.player.x *= Math.exp(-delta * 3);
      this.player.y *= Math.exp(-delta * 3);
      this.player.z *= Math.exp(-delta * 3);
      if (this.launchTime >= C.timing.launch) {
        this.phase = 'results';
        this.publish();
      }
      return;
    }
    if (this.phase !== 'playing') return;
    if (input.boost) this.activateBoost(input);
    if (input.deposit) this.deposit();
    if (this.phase !== 'playing') return;
    this.accumulator += Math.min(delta, C.timing.maxDelta);
    while (
      this.accumulator + 1e-10 >= C.timing.fixedStep &&
      this.phase === 'playing'
    ) {
      this.tick(C.timing.fixedStep, input);
      this.accumulator -= C.timing.fixedStep;
    }
    this.hudClock += delta;
    if (this.hudClock >= C.timing.hudInterval) {
      this.hudClock = 0;
      this.publish();
    }
  }

  private activateBoost(input: Input) {
    if (this.player.cooldown > 0) return;
    let x = Number.isFinite(input.x) ? input.x : 0,
      y = Number.isFinite(input.y) ? input.y! : 0,
      z = Number.isFinite(input.z) ? input.z : 0;
    if (Math.hypot(x, y, z) < 0.1) {
      x = this.player.vx;
      y = this.player.vy;
      z = this.player.vz;
    }
    if (Math.hypot(x, y, z) < 0.1) {
      x = Math.sin(this.player.facing);
      y = 0;
      z = Math.cos(this.player.facing);
    }
    const length = Math.hypot(x, y, z);
    this.boostDirection = { x: x / length, y: y / length, z: z / length };
    this.player.boosting = C.movement.boostDuration;
    this.player.cooldown = C.movement.boostCooldown;
    this.boosted = true;
    this.emit('boost');
    this.publish();
  }

  deposit() {
    if (this.phase !== 'playing' || !this.docking || this.cargo === 0) return;
    const count = this.cargo;
    for (const cell of this.cells)
      if (cell.state === 'carried') cell.state = 'deposited';
    this.power += count;
    this.emit('deposit', count);
    this.message(
      this.power === 5
        ? 'All systems online. Let’s go home.'
        : `${count === 1 ? 'Cell' : 'Cells'} secured. A little closer to home.`,
    );
    this.tutorial = Math.max(this.tutorial, 4);
    if (this.power === C.cargo.total) {
      this.phase = 'winning';
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.vz = 0;
      this.player.thrust = 0;
      this.launchTime = 0;
      this.emit('win');
    }
    this.publish();
  }

  private message(text: string, duration = 3) {
    this.notice = text;
    this.noticeUntil = this.time + duration;
  }
  private updateAsteroids() {
    this.asteroids.forEach((a, i) => {
      const base = ASTEROID_LAYOUT[i];
      const t = this.time * base.speed + base.phase;
      a.x = base.x + Math.sin(t) * base.rx;
      a.z = base.z + Math.cos(t) * base.rz;
      a.y = i % 3 === 0 ? 0 : i % 3 === 1 ? 3.5 + Math.sin(t * 0.7) : -2;
    });
  }

  private tick(dt: number, input: Input) {
    this.time += dt;
    const p = this.player;
    const m = C.movement;
    p.immunity = Math.max(0, p.immunity - dt);
    const oldCooldown = p.cooldown;
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (oldCooldown > 0 && p.cooldown === 0) this.emit('recharge');
    let ix = Number.isFinite(input.x) ? input.x : 0,
      iz = Number.isFinite(input.z) ? input.z : 0;
    let iy = Number.isFinite(input.y) ? input.y! : 0;
    const len = Math.hypot(ix, iy, iz);
    if (len > 1) {
      ix /= len;
      iz /= len;
      iy /= len;
    }
    p.thrust = Math.min(1, len);
    p.braking = input.brake;
    if (Math.hypot(ix, iz) > 0.08) {
      const target = Math.atan2(ix, iz);
      const angle = Math.atan2(
        Math.sin(target - p.facing),
        Math.cos(target - p.facing),
      );
      p.facing += angle * (1 - Math.exp(-dt * 10));
      this.moved += dt;
    }
    if (p.boosting > 0 && !input.brake) {
      p.vx += this.boostDirection.x * m.boostAcceleration * dt;
      p.vz += this.boostDirection.z * m.boostAcceleration * dt;
      p.thrust = 1;
    } else {
      p.vx += ix * m.acceleration * dt;
      p.vz += iz * m.acceleration * dt;
    }
    const drag = input.brake ? m.brake : this.docking ? C.docking.drag : m.drag;
    p.vy +=
      (p.boosting > 0 && !input.brake
        ? this.boostDirection.y * m.boostAcceleration
        : iy * C.altitude.acceleration) * dt;
    p.vy *= Math.exp(-drag * dt);
    const verticalCap = p.boosting > 0 ? 10 : C.altitude.speed;
    p.vy = clamp(p.vy, -verticalCap, verticalCap);
    p.y += p.vy * dt;
    if (p.y < C.altitude.min || p.y > C.altitude.max) {
      p.y = clamp(p.y, C.altitude.min, C.altitude.max);
      p.vy = 0;
    }
    p.vx *= Math.exp(-drag * dt);
    p.vz *= Math.exp(-drag * dt);
    const maxSpeed = p.boosting > 0 ? m.boostSpeed : m.speed;
    const speed = Math.hypot(p.vx, p.vz);
    // Excess boost speed eases away instead of snapping at the end of a boost.
    const cap =
      p.boosting > 0 ? maxSpeed : Math.max(maxSpeed, speed * Math.exp(-dt * 5));
    if (speed > cap) {
      p.vx *= cap / speed;
      p.vz *= cap / speed;
    }
    p.boosting = Math.max(0, p.boosting - dt);
    for (const axis of ['x', 'z'] as const) {
      const limit = axis === 'x' ? C.arena.halfWidth : C.arena.halfDepth;
      const v = axis === 'x' ? 'vx' : 'vz';
      const excess = Math.abs(p[axis]) - (limit - C.arena.softMargin);
      if (excess > 0)
        p[v] -= Math.sign(p[axis]) * excess * C.arena.boundaryForce * dt;
      p[axis] += p[v] * dt;
      if (Math.abs(p[axis]) > limit - m.radius) {
        p[axis] = clamp(p[axis], -limit + m.radius, limit - m.radius);
        p[v] = -Math.sign(p[axis]) * Math.min(Math.abs(p[v]), 2);
      }
    }
    // The ship hull is solid, but its surrounding docking ring remains generous.
    const shipDistance = Math.hypot(p.x, p.z);
    if (Math.abs(p.y) < 2.8 && shipDistance < C.docking.hullRadius + m.radius) {
      const nx = shipDistance > 0.001 ? p.x / shipDistance : 0;
      const nz = shipDistance > 0.001 ? p.z / shipDistance : 1;
      p.x = nx * (C.docking.hullRadius + m.radius);
      p.z = nz * (C.docking.hullRadius + m.radius);
      const inward = p.vx * nx + p.vz * nz;
      if (inward < 0) {
        p.vx -= inward * nx;
        p.vz -= inward * nz;
      }
    }
    this.updateAsteroids();
    this.updateMeteors(dt);
    const contacts = new Set<number>();
    this.asteroids.forEach((a, i) => {
      const dist = distance(p, a),
        radius = a.radius + m.radius;
      if (dist > radius + 0.04) return;
      contacts.add(i);
      const nx = dist > 0.0001 ? (p.x - a.x) / dist : 1;
      const nz = dist > 0.0001 ? (p.z - a.z) / dist : 0;
      const ny = dist > 0.0001 ? (p.y - a.y) / dist : 0;
      p.x = a.x + nx * (radius + 0.025);
      p.y = clamp(a.y + ny * (radius + 0.025), C.altitude.min, C.altitude.max);
      p.z = a.z + nz * (radius + 0.025);
      if (p.immunity <= 0 && !this.contacts.has(i)) {
        this.impact(nx, ny, nz);
      } else {
        const inward = p.vx * nx + p.vy * ny + p.vz * nz;
        if (inward < 0) {
          p.vx -= inward * nx;
          p.vy -= inward * ny;
          p.vz -= inward * nz;
        }
      }
    });
    this.contacts = contacts;
    for (const cell of this.cells) {
      if (cell.state === 'dropped' && this.time >= cell.availableAt)
        cell.state = 'floating';
      if (cell.state !== 'floating' || distance(p, cell) > C.cargo.pickupRadius)
        continue;
      if (this.cargo >= C.cargo.capacity) {
        if (this.time >= this.noticeUntil)
          this.message('Cargo full — return to ship');
        continue;
      }
      cell.state = 'carried';
      this.emit('pickup');
      this.tutorial = Math.max(this.tutorial, 3);
      this.message(
        this.cargo === 2
          ? 'Two little sparks. Bring them home.'
          : 'One little spark. Bring it back to your ship.',
      );
      this.publish();
    }
    if (input.brake && this.moved > 0.4) this.braked = true;
    if (this.tutorial === 0 && this.moved > 1) this.tutorial = 1;
    if (this.tutorial === 1 && this.braked) this.tutorial = 2;
    if (this.tutorial === 4 && this.boosted) this.tutorial = 5;
  }

  private impact(nx: number, ny: number, nz: number) {
    const p = this.player;
    if (p.immunity > 0) return;
    this.bumps++;
    p.immunity = C.collision.immunity;
    p.boosting = 0;
    p.vx = nx * C.collision.knockback;
    p.vy = ny * C.collision.knockback;
    p.vz = nz * C.collision.knockback;
    const cargo = this.cells.find((cell) => cell.state === 'carried');
    if (cargo) {
      Object.assign(cargo, this.safeDropPosition(p));
      cargo.state = 'dropped';
      cargo.availableAt = this.time + C.cargo.dropDelay;
      this.message('Suit shield absorbed the hit. Recover your nearby cell!');
    } else this.message('Shield absorbed the hit. Keep flying!');
    this.emit('impact');
    this.publish();
  }

  private updateMeteors(dt: number) {
    const c = C.threats,
      p = this.player;
    if (this.time >= this.nextWave) {
      this.nextWave = this.time + Math.max(3.8, c.interval - this.power * 0.25);
      // Each pass locks onto a predicted position ONCE. It never follows a dodge.
      const count = this.power >= 2 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const rock = this.meteors.find((m) => !m.active);
        if (!rock) break;
        const angle = this.wave * 2.399 + i * 0.28 + 0.6;
        const dx = Math.sin(angle),
          dz = Math.cos(angle);
        const target = {
          x: clamp(p.x + p.vx * 1.1 + i * dz * 3.7, -36, 36),
          y: clamp(p.y + p.vy * 0.6, C.altitude.min, C.altitude.max),
          z: clamp(p.z + p.vz * 1.1 - i * dx * 3.7, -26, 26),
        };
        Object.assign(rock, {
          active: true,
          age: 0,
          counted: false,
          closest: Infinity,
          target,
          x: target.x + dx * c.spawnDistance,
          y: target.y + 5,
          z: target.z + dz * c.spawnDistance,
          vx: -dx * c.speed,
          vy: (-5 * c.speed) / c.spawnDistance,
          vz: -dz * c.speed,
        });
      }
      this.wave++;
      this.emit('warning');
      this.publish();
    }
    for (const rock of this.meteors) {
      if (!rock.active) continue;
      rock.age += dt;
      if (rock.age < c.warning) continue;
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.z += rock.vz * dt;
      // The ship's visible shield vaporizes incoming rocks; docking stays forgiving.
      if (
        Math.hypot(rock.x, rock.y, rock.z) < c.shelter ||
        rock.age > c.lifetime
      ) {
        rock.active = false;
        continue;
      }
      const d = distance(p, rock);
      rock.closest = Math.min(rock.closest, d);
      if (!this.sheltered && d < rock.radius + C.movement.radius) {
        const length = Math.max(d, 0.001);
        this.impact(
          (p.x - rock.x) / length,
          (p.y - rock.y) / length,
          (p.z - rock.z) / length,
        );
        rock.active = false;
      } else if (!rock.counted && rock.closest < 4 && d > rock.closest + 0.5) {
        rock.counted = true;
        this.dodges++;
        // A close dodge gives a useful boost recharge, not just a cosmetic score.
        p.cooldown = 0;
        this.message('Close call! Boost recharged.', 2);
        this.emit('dodge');
        this.publish();
      }
    }
  }

  safeDropPosition(origin: Vec2): Vec2 {
    const safe = (p: Vec2) =>
      Math.abs(p.x) < C.arena.halfWidth - 2 &&
      Math.abs(p.z) < C.arena.halfDepth - 2 &&
      Math.hypot(p.x, p.z) > C.docking.radius + 1 &&
      this.asteroids.every((a) => distance(p, a) > a.radius + 1.5) &&
      this.cells.every((c) => c.state !== 'floating' || distance(p, c) > 1.5);
    for (let radius = 2.4; radius <= 12; radius += 1.2) {
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI) / 12;
        const p = {
          x: origin.x + Math.cos(angle) * radius,
          y: clamp(origin.y ?? 0, C.altitude.min + 1, C.altitude.max - 1),
          z: origin.z + Math.sin(angle) * radius,
        };
        if (safe(p)) return p;
      }
    }
    // Exhaustive deterministic fallback; never discard a cell when a local ring is crowded.
    for (let x = -36; x <= 36; x += 2)
      for (let z = -26; z <= 26; z += 2)
        if (safe({ x, y: 0, z })) return { x, y: 0, z };
    return { x: 0, y: 0, z: 6 }; // The authored layout reserves this asteroid-free launch corridor.
  }
}
