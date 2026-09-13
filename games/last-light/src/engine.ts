import RAPIER from '@dimforge/rapier3d-compat';
import {
  clamp,
  heightAt,
  isMud,
  makeTerrain,
  obstacles,
  onBridge,
  pathLength,
  roadDistance,
  roadX,
  roadY,
  routeX,
  type Mission,
  type Obstacle,
} from './missions';
export type Phase =
  | 'ready'
  | 'driving'
  | 'paused'
  | 'restoring'
  | 'results'
  | 'failed';
export type Input = {
  steer: number;
  throttle: number;
  brake: number;
  action: boolean;
};
export const emptyInput = (): Input => ({
  steer: 0,
  throttle: 0,
  brake: 0,
  action: false,
});
export type Result = {
  score: number;
  stars: number;
  integrity: number;
  remaining: number;
  lives: number;
  mission: number;
  mode: 'standard' | 'relaxed';
};
export type Notice = { who: string; text: string; until: number };
let initialization: Promise<void> | undefined;
export const initPhysics = () =>
  (initialization ??= RAPIER.init() as Promise<void>);
export class GameEngine {
  world: RAPIER.World;
  body: RAPIER.RigidBody;
  vehicle: RAPIER.DynamicRayCastVehicleController;
  terrain: ReturnType<typeof makeTerrain>;
  phase: Phase = 'ready';
  previous: Phase = 'driving';
  time: number;
  initial: number;
  elapsed = 0;
  integrity = 100;
  progress = 0;
  furthest = 0;
  distance: number;
  speed = 0;
  steering = 0;
  surface = 'Gravel';
  delivery = 0;
  restoreTime = 0;
  result: Result | null = null;
  failure = '';
  notice: Notice;
  impacts = 0;
  impactPulse = 0;
  recoveries = 0;
  safeZ = 8;
  isAlt = false;
  wheelSpin = 0;
  position = { x: 0, y: 0, z: 0 };
  rotation = { x: 0, y: 0, z: 0, w: 1 };
  obstacles: Obstacle[];
  serial = 0;
  private radioIndex = 0;
  private damageCooldown = 0;
  private lastAction = false;
  private accumulator = 0;
  private pauseRevision = 0;
  private disposed = false;
  constructor(
    public mission: Mission,
    public mode: 'standard' | 'relaxed' = 'standard',
  ) {
    this.initial = mission.seconds * (mode === 'relaxed' ? 1.35 : 1);
    this.time = this.initial;
    this.distance = pathLength(mission);
    this.notice = { who: 'MINA · CLINIC', text: mission.briefing, until: 11 };
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
    this.terrain = makeTerrain(mission);
    this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(
        this.terrain.vertices,
        this.terrain.indices,
      ).setFriction(0.8),
    );
    this.body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(roadX(mission, 8), roadY(mission, 8) + 1.1, 8)
        .setLinearDamping(0.12)
        .setAngularDamping(4)
        .setCcdEnabled(true),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.83, 0.28, 1.82)
        .setMass(780)
        .setFriction(0.15)
        .setRestitution(0.04),
      this.body,
    );
    this.vehicle = this.world.createVehicleController(this.body);
    this.vehicle.indexUpAxis = 1;
    this.vehicle.setIndexForwardAxis = 2;
    for (const z of [1.25, -1.3])
      for (const x of [-0.86, 0.86]) {
        this.vehicle.addWheel(
          { x, y: 0, z },
          { x: 0, y: -1, z: 0 },
          { x: -1, y: 0, z: 0 },
          0.45,
          0.43,
        );
        const i = this.vehicle.numWheels() - 1;
        this.vehicle.setWheelSuspensionStiffness(i, 32);
        this.vehicle.setWheelSuspensionCompression(i, 4.4);
        this.vehicle.setWheelSuspensionRelaxation(i, 5.5);
        this.vehicle.setWheelMaxSuspensionTravel(i, 0.4);
        this.vehicle.setWheelFrictionSlip(i, 4.8);
        this.vehicle.setWheelSideFrictionStiffness(i, 1.1);
        this.vehicle.setWheelMaxSuspensionForce(i, 11000);
      }
    this.obstacles = obstacles(mission);
    for (const o of this.obstacles.filter((o) => o.kind !== 'rut')) {
      this.world.createCollider(
        RAPIER.ColliderDesc.ball(o.radius)
          .setTranslation(
            o.x,
            heightAt(mission, o.x, o.z) + o.radius * 0.25,
            o.z,
          )
          .setFriction(0.4),
      );
    }
    this.setPose(8);
    for (let i = 0; i < 80; i++) {
      this.vehicle.updateVehicle(
        1 / 60,
        undefined,
        undefined,
        (c) => c.parent()?.handle !== this.body.handle,
      );
      this.world.step();
    }
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.sync();
  }
  private sync() {
    const p = this.body.translation(),
      q = this.body.rotation(),
      v = this.body.linvel();
    this.position = { ...p };
    this.rotation = { ...q };
    const f = {
      x: 2 * (q.x * q.z + q.w * q.y),
      z: 1 - 2 * (q.x * q.x + q.y * q.y),
    };
    this.speed = v.x * f.x + v.z * f.z;
    this.progress = clamp(p.z, 0, this.mission.length);
  }
  get heading() {
    const q = this.rotation;
    return Math.atan2(
      2 * (q.w * q.y + q.x * q.z),
      1 - 2 * (q.y * q.y + q.x * q.x),
    );
  }
  get canDeliver() {
    const p = this.position;
    return (
      p.z > this.mission.length - 12 &&
      p.z < this.mission.length + 13 &&
      Math.abs(p.x - roadX(this.mission, this.mission.length)) < 9 &&
      Math.abs(this.speed) < 1.1 &&
      this.integrity > 0
    );
  }
  get needsRecovery() {
    return (
      roadDistance(this.mission, this.position.x, this.position.z) > 12 ||
      this.rotation.x * this.rotation.x + this.rotation.z * this.rotation.z >
        0.3 ||
      this.position.y <
        heightAt(this.mission, this.position.x, this.position.z) - 2
    );
  }
  private setPose(z: number) {
    const x = routeX(this.mission, z, this.isAlt),
      a = Math.atan2(routeX(this.mission, z + 2, this.isAlt) - x, 2);
    this.body.setTranslation(
      { x, y: heightAt(this.mission, x, z) + 1.05, z },
      true,
    );
    this.body.setRotation(
      { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) },
      true,
    );
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.world.updateSceneQueries();
    this.sync();
  }
  recover() {
    if (this.phase !== 'driving') return;
    this.time = Math.max(0, this.time - 8);
    this.recoveries++;
    this.setPose(this.safeZ);
    this.say('JO · DISPATCH', 'Back on firm ground. Recovery used 8 seconds.');
    if (this.time <= 0)
      this.fail('The clinic reserve ran out. Try the route again.');
  }
  say(who: string, text: string, seconds = 7) {
    this.notice = { who, text, until: this.elapsed + seconds };
    this.serial++;
  }
  pause() {
    if (!['ready', 'driving', 'restoring'].includes(this.phase)) return;
    this.previous = this.phase;
    this.phase = 'paused';
    this.accumulator = 0;
    this.delivery = 0;
    this.pauseRevision++;
  }
  resume() {
    if (this.phase === 'paused') {
      this.phase = this.previous;
      this.lastAction = false;
      this.accumulator = 0;
    }
  }
  skip() {
    if (this.phase === 'restoring') {
      this.restoreTime = 14;
      this.phase = 'results';
    }
  }
  fail(reason: string) {
    this.phase = 'failed';
    this.failure = reason;
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.delivery = 0;
  }
  hurt(amount: number) {
    if (this.damageCooldown > 0 || this.phase !== 'driving') return;
    this.damageCooldown = 0.85;
    this.integrity = clamp(
      this.integrity - amount * (this.mode === 'relaxed' ? 0.75 : 1),
      0,
      100,
    );
    this.impacts++;
    this.impactPulse = 1;
    this.say(
      'CARGO CHECK',
      'Hard impact. Brake before rough ground to protect the solar kit.',
      3,
    );
    if (this.integrity <= 0)
      this.fail(
        'The solar kit needs repairs. A gentler line will get it there.',
      );
  }
  advance(delta: number, input: Input, singlePress = false) {
    if (!Number.isFinite(delta) || delta < 0) return;
    if (delta > 0.65) {
      this.pause();
      return;
    }
    if (this.phase === 'paused') return;
    this.accumulator += Math.min(delta, 0.12);
    const revision = this.pauseRevision;
    while (this.accumulator >= 1 / 60) {
      this.step(1 / 60, input, singlePress);
      this.accumulator -= 1 / 60;
      if (this.pauseRevision !== revision) {
        this.accumulator = 0;
        break;
      }
    }
  }
  step(dt: number, input: Input, singlePress = false) {
    if (
      this.phase === 'paused' ||
      this.phase === 'failed' ||
      this.phase === 'results'
    )
      return;
    if (this.phase === 'restoring') {
      this.restoreTime += dt;
      if (this.restoreTime >= 14) {
        this.restoreTime = 14;
        this.phase = 'results';
      }
      return;
    }
    if (this.phase === 'ready') {
      if (
        input.throttle > 0.05 ||
        input.brake > 0.05 ||
        Math.abs(input.steer) > 0.1
      )
        this.phase = 'driving';
      else return;
    }
    this.elapsed += dt;
    this.time = Math.max(0, this.time - dt);
    this.damageCooldown -= dt;
    this.impactPulse = Math.max(0, this.impactPulse - dt * 3);
    if (this.time <= 0) {
      this.fail('The clinic reserve ran out. Try the route again.');
      return;
    }
    this.sync();
    const p = this.position,
      m = this.mission;
    const mud = isMud(m, p.x, p.z),
      off = roadDistance(m, p.x, p.z) > 6;
    this.surface =
      onBridge(m, p.z) && Math.abs(p.x - roadX(m, p.z)) < 5
        ? 'Bridge'
        : mud
          ? 'Mud'
          : off
            ? 'Verge'
            : 'Gravel';
    const target =
      clamp(input.steer, -1, 1) *
      (0.47 - clamp(Math.abs(this.speed) / 35, 0, 0.22));
    this.steering += (target - this.steering) * Math.min(1, dt * 10);
    const maxSpeed = off ? 5 : mud ? 8.5 : 13.5;
    const v = this.body.linvel();
    const q = this.rotation;
    const forward = {
      x: 2 * (q.x * q.z + q.w * q.y),
      y: 2 * (q.y * q.z - q.w * q.x),
      z: 1 - 2 * (q.x * q.x + q.y * q.y),
    };
    const parking = this.canDeliver && input.action;
    const reverse =
      !parking &&
      input.brake > 0.1 &&
      this.speed < 0.35 &&
      input.throttle < 0.1;
    const force = parking
      ? 0
      : reverse
        ? -900 * input.brake
        : input.throttle * 1900 * clamp((maxSpeed - this.speed) / 3, 0, 1);
    for (let i = 0; i < 4; i++) {
      this.vehicle.setWheelSteering(i, i < 2 ? this.steering : 0);
      this.vehicle.setWheelEngineForce(i, force);
      this.vehicle.setWheelBrake(
        i,
        parking
          ? 240
          : !reverse
            ? input.brake * 190 + (input.throttle < 0.01 ? 5 : 0)
            : 0,
      );
      this.vehicle.setWheelFrictionSlip(i, mud ? 2.4 : 4.8);
      this.vehicle.setWheelSideFrictionStiffness(i, mud ? 0.65 : 1.1);
    }
    this.vehicle.updateVehicle(
      dt,
      undefined,
      undefined,
      (c) => c.parent()?.handle !== this.body.handle,
    );
    // Gentle stability assistance preserves suspension pitch while discouraging rollovers.
    const av = this.body.angvel();
    this.body.setAngvel({ x: av.x * 0.98, y: av.y, z: av.z * 0.94 }, true);
    if (Math.abs(this.speed) > maxSpeed + 1) {
      const factor = 0.992;
      this.body.setLinvel({ x: v.x * factor, y: v.y, z: v.z * factor }, true);
    }
    this.world.step();
    this.sync();
    this.wheelSpin += (this.speed * dt) / 0.43;
    const deceleration =
      (v.x - forward.x * this.speed) * forward.x +
      (v.z - forward.z * this.speed) * forward.z;
    if (deceleration > 2.6 && input.brake < 0.2)
      this.hurt(8 + deceleration * 2);
    for (const o of this.obstacles) {
      if (
        o.kind === 'rut' &&
        Math.hypot(p.x - o.x, p.z - o.z) < o.radius + 1 &&
        Math.abs(this.speed) > 7.5
      ) {
        this.hurt((Math.abs(this.speed) - 6) * 2.8);
      }
    }
    if (off && Math.abs(this.speed) > 6) this.hurt(3);
    if (
      p.z > m.length + 22 ||
      p.z < -20 ||
      roadDistance(m, p.x, p.z) > 60 ||
      p.y < -45
    )
      this.recover();
    this.furthest = Math.max(this.furthest, this.progress);
    if (
      roadDistance(m, p.x, p.z) < 4 &&
      Math.abs(q.x) < 0.25 &&
      Math.abs(q.z) < 0.25 &&
      p.z < this.mission.length - 18
    ) {
      this.safeZ = Math.floor(Math.max(8, p.z - 4) / 5) * 5;
    }
    const offset = routeX(m, p.z, true) - roadX(m, p.z);
    if (offset > 5)
      this.isAlt =
        Math.abs(p.x - routeX(m, p.z, true)) < Math.abs(p.x - roadX(m, p.z));
    if (Math.floor(this.elapsed * 4) !== Math.floor((this.elapsed - dt) * 4))
      this.distance = pathLength(m, this.progress, this.isAlt);
    const cue = m.radio[this.radioIndex];
    if (cue && this.progress >= cue.at) {
      this.say(cue.who, cue.text);
      this.radioIndex++;
    }
    if (this.canDeliver) {
      if (input.action) {
        this.delivery += singlePress ? 1 : dt;
        if (this.delivery >= 1) this.accept();
      } else this.delivery = 0;
    } else {
      this.delivery = 0;
      if (input.action && !this.lastAction && this.needsRecovery)
        this.recover();
    }
    this.lastAction = input.action;
  }
  private accept() {
    if (this.phase !== 'driving' || !this.canDeliver || this.time <= 0) return;
    const ratio = this.time / this.initial;
    this.result = {
      mission: this.mission.id,
      mode: this.mode,
      remaining: this.time,
      integrity: this.integrity,
      lives: this.mission.lives,
      score: 1000 + Math.floor(600 * ratio) + Math.floor(4 * this.integrity),
      stars:
        this.integrity >= 90 && ratio >= 0.15
          ? 3
          : this.integrity >= 70
            ? 2
            : 1,
    };
    this.phase = 'restoring';
    this.restoreTime = 0;
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.say(
      'MINA · CLINIC',
      'We have the solar kit. You made it, Amani. Let us bring the lights back.',
      30,
    );
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.world.removeVehicleController(this.vehicle);
    this.world.free();
  }
}
