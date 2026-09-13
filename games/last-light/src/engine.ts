import {
  engineRpm,
  impactDamage,
  ROAD_REVISION,
  RESTORE_DURATION,
  surfaceAt,
  TUNING,
} from './vehicle';
import {
  encounterPose,
  makeEncounters,
  warningDistance,
  windForce,
  type Encounter,
} from './encounters';
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
  revision?: number;
  variant?: number;
  clean?: number;
  encounters?: number;
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
  stalledFor = 0;
  safeZ = 8;
  isAlt = false;
  wheelSpin = 0;
  throttle = 0;
  braking = 0;
  rpm = 850;
  gear = 1;
  shiftPulse = 0;
  roadPulse = 0;
  cleanEncounters = 0;
  rewardUntil = 0;
  encounters: Encounter[];
  wheelSurfaces: ReturnType<typeof surfaceAt>[] = [];
  previousPosition = { x: 0, y: 0, z: 0 };
  previousRotation = { x: 0, y: 0, z: 0, w: 1 };
  private eventBodies = new Map<string, RAPIER.RigidBody>();
  private contactQueue = new RAPIER.EventQueue(true);
  private previousSprings = [0.45, 0.45, 0.45, 0.45];
  private gearCooldown = 0;
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
        .setLinearDamping(0.09)
        .setAngularDamping(3.3)
        .setCcdEnabled(true),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.83, 0.28, 1.82)
        .setMass(780)
        .setFriction(0.15)
        .setRestitution(0.02)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(14000),
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
        this.vehicle.setWheelSuspensionStiffness(i, 37);
        this.vehicle.setWheelSuspensionCompression(i, 5.2);
        this.vehicle.setWheelSuspensionRelaxation(i, 5.9);
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
    this.encounters = makeEncounters(mission);
    for (const event of this.encounters) {
      if (event.kind === 'gust') continue;
      const p = encounterPose(mission, event);
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased()
          .setTranslation(
            p.x,
            p.y + (event.kind === 'rockfall' ? 0.55 : 1),
            p.z,
          )
          .setRotation({
            x: 0,
            y: Math.sin(p.heading / 2),
            z: 0,
            w: Math.cos(p.heading / 2),
          }),
      );
      this.world.createCollider(
        (event.kind === 'rockfall'
          ? RAPIER.ColliderDesc.ball(0.65)
          : RAPIER.ColliderDesc.cuboid(
              1.02,
              0.83,
              event.kind === 'minibus' ? 2.5 : 2.15,
            )
        ).setFriction(0.45),
        body,
      );
      this.eventBodies.set(event.id, body);
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
    this.previousPosition = { ...this.position };
    this.previousRotation = { ...this.rotation };
  }
  get interpolation() {
    return clamp(this.accumulator * 60, 0, 1);
  }
  get upcomingEncounter() {
    return this.encounters.find((e) => e.warned && !e.resolved) || null;
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
      this.stalledFor > 2.5 ||
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
    this.previousPosition = { ...this.position };
    this.previousRotation = { ...this.rotation };
    this.previousSprings.fill(TUNING.suspension);
  }
  recover() {
    if (this.phase !== 'driving') return;
    this.time = Math.max(0, this.time - 8);
    this.recoveries++;
    this.stalledFor = 0;
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
      this.restoreTime = RESTORE_DURATION;
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
      if (this.restoreTime >= RESTORE_DURATION) {
        this.restoreTime = RESTORE_DURATION;
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
    this.previousPosition = { ...this.position };
    this.previousRotation = { ...this.rotation };
    this.elapsed += dt;
    this.throttle = input.throttle;
    this.braking = input.brake;
    this.stalledFor =
      input.throttle > 0.25 && Math.abs(this.speed) < 0.6
        ? this.stalledFor + dt
        : 0;
    this.roadPulse *= Math.exp(-dt * 8);
    this.shiftPulse = Math.max(0, this.shiftPulse - dt * 3);
    this.gearCooldown -= dt;
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
      (0.49 - clamp(Math.abs(this.speed) / 52, 0, 0.28));
    this.steering += (target - this.steering) * Math.min(1, dt * 12);
    this.wheelSurfaces = Array.from({ length: 4 }, (_, i) => {
      const contact = this.vehicle.wheelContactPoint(i);
      const point = contact && this.vehicle.wheelIsInContact(i) ? contact : p;
      return surfaceAt(m, point.x, point.z);
    });
    const maxSpeed = this.wheelSurfaces.reduce((n, s) => n + s.speed, 0) / 4;
    const gearEdges = [0, 6, 10, 15, 20, 99];
    if (this.gearCooldown <= 0) {
      const old = this.gear;
      if (this.speed > gearEdges[this.gear] && this.gear < 5) this.gear++;
      else if (this.gear > 1 && this.speed < gearEdges[this.gear - 1] - 1.5)
        this.gear--;
      if (old !== this.gear) {
        this.shiftPulse = 1;
        this.gearCooldown = 0.6;
      }
    }
    this.rpm +=
      (engineRpm(this.speed, this.gear, input.throttle) - this.rpm) *
      Math.min(1, dt * 9);
    this.updateEncounters(dt);
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
        : input.throttle *
          TUNING.force *
          clamp((maxSpeed - this.speed) / 4.5, 0, 1) *
          (1 - this.shiftPulse * 0.14);
    for (let i = 0; i < 4; i++) {
      this.vehicle.setWheelSteering(i, i < 2 ? this.steering : 0);
      this.vehicle.setWheelEngineForce(i, force);
      this.vehicle.setWheelBrake(
        i,
        parking
          ? 240
          : !reverse
            ? input.brake * TUNING.brake + (input.throttle < 0.01 ? 3 : 0)
            : 0,
      );
      this.vehicle.setWheelFrictionSlip(i, this.wheelSurfaces[i].grip);
      this.vehicle.setWheelSideFrictionStiffness(
        i,
        this.wheelSurfaces[i].sideGrip,
      );
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
    this.world.step(this.contactQueue);
    let contactForce = 0;
    this.contactQueue.drainContactForceEvents((event) => {
      contactForce = Math.max(contactForce, event.totalForceMagnitude());
    });
    this.sync();
    this.wheelSpin += (this.speed * dt) / 0.43;
    const speedLost = Math.max(
      0,
      Math.abs(v.x * forward.x + v.z * forward.z) - Math.abs(this.speed),
    );
    let compression = 0;
    let grounded = false;
    for (let i = 0; i < 4; i++) {
      const spring = this.vehicle.wheelSuspensionLength(i) ?? TUNING.suspension;
      if (this.vehicle.wheelIsInContact(i)) {
        compression = Math.max(
          compression,
          (this.previousSprings[i] - spring) / dt,
        );
        grounded = true;
      }
      this.previousSprings[i] = spring;
    }
    this.roadPulse = Math.max(this.roadPulse, clamp(compression / 7, 0, 1));
    const damage = impactDamage(
      contactForce > 14000 ? speedLost : 0,
      grounded && this.body.linvel().y > v.y + 2 ? -v.y : 0,
      compression,
      Math.abs(this.speed),
    );
    if (damage > 0) this.hurt(damage);
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
    if (cue && this.progress >= cue.at && !this.upcomingEncounter) {
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
  private updateEncounters(dt: number) {
    for (const event of this.encounters) {
      const distance = event.z - this.position.z;
      if (
        !event.warned &&
        distance < warningDistance(this.speed, this.mission.rain) &&
        distance > -25
      ) {
        event.warned = true;
        this.say(event.title, event.instruction, 5);
      }
      if (
        !event.entered &&
        distance < (event.kind === 'gust' ? 30 : 95) &&
        distance > -25
      ) {
        event.entered = true;
        event.impactAtEntry = this.impacts;
      }
      if (event.entered) event.elapsed += dt;
      const body = this.eventBodies.get(event.id);
      if (body && event.entered && !event.resolved) {
        const pose = encounterPose(this.mission, event);
        body.setNextKinematicTranslation({
          x: pose.x,
          y: pose.y + (event.kind === 'rockfall' ? 0.55 : 1),
          z: pose.z,
        });
        body.setNextKinematicRotation({
          x: 0,
          y: Math.sin(pose.heading / 2),
          z: 0,
          w: Math.cos(pose.heading / 2),
        });
      }
      if (event.kind === 'gust' && Math.abs(distance) < 30)
        this.body.applyImpulse({ x: windForce(event) * dt, y: 0, z: 0 }, true);
      if (!event.resolved && distance < -30) {
        event.resolved = true;
        event.clean = event.entered && event.impactAtEntry === this.impacts;
        if (event.clean) {
          this.cleanEncounters++;
          this.rewardUntil = this.elapsed + 3;
        }
      }
    }
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
      revision: ROAD_REVISION,
      variant: this.mission.variant || 0,
      clean: this.cleanEncounters,
      encounters: this.encounters.length,
      score:
        1000 +
        Math.floor(400 * ratio) +
        Math.floor(4 * this.integrity) +
        Math.floor((200 * this.cleanEncounters) / this.encounters.length),
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
    this.contactQueue.free();
  }
}
