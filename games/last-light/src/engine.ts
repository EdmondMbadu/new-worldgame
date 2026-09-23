import {
  ridgeAt,
  roadWidth,
  routePoint,
  routeHeading,
  toRoute,
  toWorld,
  worldHeight,
} from './routes';
import { crossingBrake, updateTraffic } from './traffic';
import { TrafficFlow } from './traffic-flow';
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
import { bridgeRails, sceneryLayout, TRUNK_RADIUS, worldPose } from './scenery-layout';
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
  practice?: boolean;
};
export type Notice = { who: string; text: string; until: number };
let initialization: Promise<void> | undefined;
// Terrain is group 1. The truck's outline shells skip it (the chassis box and the
// wheel rays already own ground contact), which keeps them cheap to simulate.
const TERRAIN_GROUPS = (0x0001 << 16) | 0xffff;
const SHELL_GROUPS = (0x0002 << 16) | 0xfffe;
// Static scenery ignores terrain and other scenery: only moving bodies test against it.
const SCENERY_GROUPS = (0x0004 << 16) | 0xfffa;
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
  roadPosition = { x: 0, z: 0 };
  fallingFor = 0;
  practice = false;
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
  safeAlt = false;
  isAlt = false;
  wheelSpin = 0;
  throttle = 0;
  braking = 0;
  brakeSource: 'driver' | 'crossing' | 'delivery' = 'driver';
  crossingAssist = 0;
  droppedTime = 0;
  lastSubsteps = 0;
  resumeRevision = 0;
  pauseReason = 'manual';
  pauseEvents = 0;
  rpm = 850;
  gear = 1;
  shiftPulse = 0;
  roadPulse = 0;
  cleanEncounters = 0;
  rewardUntil = 0;
  encounters: Encounter[];
  traffic: TrafficFlow;
  /** Posts and signs the truck has knocked over (index into the scenery layout). */
  knocked: { index: number; vx: number; vz: number; at: number }[] = [];
  /** Increments on every physical contact, damaging or not; strength 0..1. */
  contactSerial = 0;
  contactStrength = 0;
  private chassisHandles = new Set<number>();
  private trafficBodies: RAPIER.RigidBody[] = [];
  private trafficColliders = new Map<number, number>();
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
  private collisionGrace = 0;
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
      )
        .setFriction(0.8)
        .setCollisionGroups(TERRAIN_GROUPS),
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
        .setActiveEvents(
          RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS |
            RAPIER.ActiveEvents.COLLISION_EVENTS,
        )
        .setContactForceEventThreshold(14000),
      this.body,
    );
    // The chassis box sets mass and handling. Massless shells give the rest of the
    // visible truck (nose, cab, bed, tail) a physical outline, so contact happens
    // where the paint is instead of half a metre inside it.
    this.chassisHandles.add(this.body.collider(0).handle);
    for (const [hx, hy, hz, x, y, z] of [
      [0.93, 0.28, 0.34, 0, 0.12, 2.1],
      [0.93, 0.28, 0.3, 0, 0.16, -2.12],
      [0.84, 0.34, 0.98, 0, 1.1, 0.04],
      [0.9, 0.24, 0.66, 0, 0.62, -1.6],
    ]) {
      const shell = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, hy, hz)
          .setTranslation(x, y, z)
          .setDensity(0)
          .setCollisionGroups(SHELL_GROUPS)
          .setFriction(0.3)
          .setRestitution(0.08)
          .setActiveEvents(
            RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS |
              RAPIER.ActiveEvents.COLLISION_EVENTS,
          )
          .setContactForceEventThreshold(14000),
        this.body,
      );
      this.chassisHandles.add(shell.handle);
    }
    this.buildScenery(mission);
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
      const w = toWorld(mission, o.x, o.z);
      this.world.createCollider(
        RAPIER.ColliderDesc.ball(o.radius)
          .setTranslation(
            w.x,
            heightAt(mission, o.x, o.z) + o.radius * 0.25,
            w.z,
          )
          .setFriction(0.4),
      );
    }
    this.encounters = makeEncounters(mission);
    for (const event of this.encounters) {
      if (!['minibus', 'bridge', 'tree', 'traffic'].includes(event.kind))
        continue;
      const p = encounterPose(mission, event);
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased()
          .setTranslation(p.x, p.y + (event.kind === 'tree' ? 0.4 : 1), p.z)
          .setRotation(p.rotation),
      );
      this.world.createCollider(
        (event.kind === 'tree'
          ? RAPIER.ColliderDesc.capsule(2.2, 0.35).setRotation({
              x: Math.SQRT1_2,
              y: 0,
              z: 0,
              w: Math.SQRT1_2,
            })
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
    this.traffic = new TrafficFlow(mission);
    for (const car of this.traffic.cars) {
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased(),
      );
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.9, 0.5, car.kind === 'pickup' ? 2.2 : 1.95)
          .setTranslation(0, 0.9, 0)
          .setFriction(0.2)
          .setRestitution(0.03),
        body,
      );
      this.trafficBodies.push(body);
      this.trafficColliders.set(collider.handle, car.id);
      body.setTranslation(car.pose, false);
      body.setRotation(this.trafficRotation(car.pose), false);
    }
    this.setPose(8);
    for (let i = 0; i < 80; i++) {
      this.vehicle.updateVehicle(
        1 / 60,
        undefined,
        undefined,
        (c) =>
          c.parent()?.handle !== this.body.handle && !c.parent()?.isKinematic(),
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
    this.roadPosition = toRoute(this.mission, p.x, p.z);
    this.progress = clamp(this.roadPosition.z, 0, this.mission.length);
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
      roadDistance(this.mission, this.roadPosition.x, this.progress) >
        roadWidth(this.mission, this.progress) + 7 ||
      this.rotation.x * this.rotation.x + this.rotation.z * this.rotation.z >
        0.3 ||
      this.position.y <
        worldHeight(this.mission, this.position.x, this.position.z) - 2
    );
  }
  private setPose(z: number) {
    this.collisionGrace = 0;
    const point = routePoint(this.mission, z, this.isAlt),
      a = routeHeading(this.mission, z, this.isAlt);
    this.body.setTranslation({ ...point, y: point.y + 1.05 }, true);
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
    this.fallingFor = 0;
    this.stalledFor = 0;
    this.restoreCheckpoint();
    this.say('JO · DISPATCH', 'Back on firm ground. Recovery used 8 seconds.');
    if (this.time <= 0)
      this.fail('The clinic reserve ran out. Try the route again.');
  }
  practiceFromCheckpoint() {
    if (this.phase !== 'failed' && this.phase !== 'paused') return;
    this.practice = true;
    this.result = null;
    this.phase = 'driving';
    this.time = this.initial;
    this.integrity = 100;
    this.fallingFor = 0;
    this.restoreCheckpoint();
    this.say(
      'PRACTICE DRIVE',
      'Continue from firm ground. Practice deliveries do not change records or unlocks.',
      6,
    );
  }
  private restoreCheckpoint() {
    this.isAlt = this.safeAlt;
    let station = this.safeZ;
    // Traffic may have reached a previously empty checkpoint. Step back to a
    // clear part of the same route instead of spawning inside a moving vehicle.
    while (station >= -24) {
      const point = routePoint(this.mission, station, this.safeAlt);
      const occupied = this.encounters.some((event) => {
        if (!['minibus', 'traffic', 'bridge', 'tree'].includes(event.kind))
          return false;
        const actor = encounterPose(this.mission, event);
        return Math.hypot(actor.x - point.x, actor.z - point.z) < 9;
      });
      if (
        !occupied &&
        !this.traffic.occupied(point.x, point.z, 12) &&
        ridgeAt(this.mission, station) < 0.05
      )
        break;
      station -= 12;
    }
    this.setPose(Math.max(-16, station));
  }
  say(who: string, text: string, seconds = 7) {
    this.notice = { who, text, until: this.elapsed + seconds };
    this.serial++;
  }
  pause(reason = 'manual') {
    if (!['ready', 'driving', 'restoring'].includes(this.phase)) return;
    this.previous = this.phase;
    this.pauseReason = reason;
    this.pauseEvents++;
    this.phase = 'paused';
    this.accumulator = 0;
    this.delivery = 0;
    this.pauseRevision++;
  }
  resume() {
    if (this.phase === 'paused') {
      this.phase = this.previous;
      this.resumeRevision++;
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
    this.lastSubsteps = 0;
    if (this.phase === 'paused') return;
    // Never turn a foreground rendering hitch into a modal pause or an unbounded
    // catch-up. Deadline and road users advance only with simulated time.
    this.droppedTime += Math.max(0, delta - 0.1);
    this.accumulator += Math.min(delta, 0.1);
    const revision = this.pauseRevision;
    while (this.accumulator + 1e-10 >= 1 / 60 && this.lastSubsteps < 6) {
      this.lastSubsteps++;
      this.step(1 / 60, input, singlePress);
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
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
    const road = this.roadPosition;
    const mud = isMud(m, road.x, road.z),
      off = roadDistance(m, road.x, road.z) > roadWidth(m, road.z) + 1.2;
    this.surface =
      onBridge(m, road.z) && Math.abs(road.x - roadX(m, road.z)) < 5
        ? 'Bridge'
        : mud
          ? 'Mud'
          : off
            ? 'Verge'
            : 'Gravel';
    if (surfaceAt(m, road.x, road.z).name === 'Water') this.surface = 'Water';
    const target =
      // Inputs use the driver's left/right. With +Z forward, screen-right is -X.
      -clamp(input.steer, -1, 1) *
      (0.49 - clamp(Math.abs(this.speed) / 52, 0, 0.28));
    this.steering += (target - this.steering) * Math.min(1, dt * 12);
    this.wheelSurfaces = Array.from({ length: 4 }, (_, i) => {
      const contact = this.vehicle.wheelContactPoint(i);
      const point = contact && this.vehicle.wheelIsInContact(i) ? contact : p;
      const r = toRoute(m, point.x, point.z);
      const water =
        this.encounters.find(
          (event) =>
            event.kind === 'flood' &&
            Math.abs(event.z - r.z) < event.length / 2 + 5,
        )?.waterLevel ?? 0;
      return surfaceAt(m, r.x, r.z, water);
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
    const previousTrafficClean = this.traffic.clean;
    this.traffic.update(
      dt,
      {
        ...this.position,
        station: this.progress,
        speed: this.speed,
        heading: this.heading,
      },
      this.encounters,
    );
    if (this.traffic.clean > previousTrafficClean)
      this.rewardUntil = this.elapsed + 2.5;
    for (const car of this.traffic.cars) {
      const body = this.trafficBodies[car.id];
      const delta = Math.hypot(
        car.pose.x - car.previous.x,
        car.pose.z - car.previous.z,
      );
      // Recycling at an invisible route exit must not create a swept collider
      // across the whole valley. Ordinary motion always uses a kinematic step.
      if (delta > 30) {
        body.setTranslation(car.pose, false);
        body.setRotation(this.trafficRotation(car.pose), false);
      }
      body.setNextKinematicTranslation(car.pose);
      body.setNextKinematicRotation(this.trafficRotation(car.pose));
    }
    const v = this.body.linvel();
    const q = this.rotation;
    const forward = {
      x: 2 * (q.x * q.z + q.w * q.y),
      y: 2 * (q.y * q.z - q.w * q.x),
      z: 1 - 2 * (q.x * q.x + q.y * q.y),
    };
    const desiredAssist = crossingBrake(this.encounters, m, road, this.speed);
    this.crossingAssist += clamp(
      desiredAssist - this.crossingAssist,
      -dt * 4,
      dt * 2.5,
    );
    const parking = this.canDeliver && input.action;
    const braking = Math.max(input.brake, this.crossingAssist);
    this.braking = parking ? 1 : braking;
    this.brakeSource = parking
      ? 'delivery'
      : this.crossingAssist > input.brake
        ? 'crossing'
        : 'driver';
    const reverse =
      !parking &&
      input.brake > 0.1 &&
      this.speed < 0.35 &&
      input.throttle < 0.1;
    const force =
      parking || (this.crossingAssist > 0.05 && !reverse)
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
            ? braking * TUNING.brake + (input.throttle < 0.01 ? 3 : 0)
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
      (c) =>
        c.parent()?.handle !== this.body.handle && !c.parent()?.isKinematic(),
    );
    // Gentle stability assistance preserves suspension pitch while discouraging rollovers.
    const av = this.body.angvel();
    this.body.setAngvel({ x: av.x * 0.98, y: av.y, z: av.z * 0.94 }, true);
    if (Math.abs(this.speed) > maxSpeed + 1) {
      const factor = 0.992;
      this.body.setLinvel({ x: v.x * factor, y: v.y, z: v.z * factor }, true);
    }
    this.world.step(this.contactQueue);
    // A vehicle trapped against a scripted body must never acquire solver-scale
    // horizontal speeds. This lies above all intended driving/collision speeds.
    const solvedVelocity = this.body.linvel();
    const horizontalSpeed = Math.hypot(solvedVelocity.x, solvedVelocity.z);
    if (horizontalSpeed > 32)
      this.body.setLinvel(
        {
          x: (solvedVelocity.x * 32) / horizontalSpeed,
          y: clamp(solvedVelocity.y, -40, 16),
          z: (solvedVelocity.z * 32) / horizontalSpeed,
        },
        true,
      );
    let contactForce = 0;
    this.contactQueue.drainContactForceEvents((event) => {
      contactForce = Math.max(contactForce, event.totalForceMagnitude());
    });
    let collisionStarted = false;
    let trafficDamage = 0;
    const chassis = this.chassisHandles;
    // CCD can stop a fast impact without emitting a contact-force event.
    // A new chassis contact plus measured speed loss still represents a real hit.
    this.contactQueue.drainCollisionEvents((a, b, start) => {
      if (!start || (!chassis.has(a) && !chassis.has(b))) return;
      const other = chassis.has(a) ? b : a;
      collisionStarted = true;
      const id = this.trafficColliders.get(other);
      if (id !== undefined) {
        const car = this.traffic.cars[id];
        const dx = car.pose.x - p.x,
          dz = car.pose.z - p.z,
          length = Math.hypot(dx, dz) || 1;
        const closing =
          ((v.x - Math.sin(car.pose.yaw) * car.speed) * dx +
            (v.z - Math.cos(car.pose.yaw) * car.speed) * dz) /
          length;
        trafficDamage = Math.max(
          trafficDamage,
          clamp((closing - 2) * 1.3, 0, 22),
        );
        // Momentum goes somewhere: the struck car is shoved and turns away.
        if (closing > 0.5) {
          const nx = dx / length,
            nz = dz / length;
          const lateral = nx * Math.cos(car.pose.yaw) - nz * Math.sin(car.pose.yaw);
          this.traffic.push(id, nx * closing * 0.55, nz * closing * 0.55, lateral * closing * 0.18);
        }
        this.traffic.hit(id);
      }
    });
    this.collisionGrace = collisionStarted
      ? 0.08
      : Math.max(0, this.collisionGrace - dt);
    this.sync();
    this.sweepPosts();
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
    if (collisionStarted) {
      this.contactSerial++;
      this.contactStrength = clamp(Math.max(speedLost / 9, contactForce / 60000), 0.06, 1);
    }
    const damage = impactDamage(
      contactForce > 14000 || this.collisionGrace > 0 ? speedLost : 0,
      grounded && this.body.linvel().y > v.y + 2 ? -v.y : 0,
      compression,
      Math.abs(this.speed),
    );
    if (Math.max(damage, trafficDamage) > 0) {
      const before = this.impacts;
      this.hurt(Math.max(damage, trafficDamage));
      if (trafficDamage > 0 && this.impacts > before)
        this.say(
          'CARGO CHECK',
          'Traffic impact. Give the next vehicle more room; the solar kit is still with you.',
          4,
        );
    }
    const current = this.roadPosition;
    const ridge = ridgeAt(m, this.progress);
    if (ridge > 0.2 && this.position.y < roadY(m, this.progress) - 3)
      this.fallingFor += dt;
    if (this.fallingFor > 0 && this.fallingFor < dt * 1.5)
      this.say(
        'HOLD ON',
        'Off the ridge. The recovery team is bringing you back to firm ground.',
        4,
      );
    if (this.fallingFor > 0.9) {
      this.hurt(8);
      this.recover();
    } else if (
      current.z > m.length + 22 ||
      current.z < -20 ||
      roadDistance(m, current.x, current.z) > 60 ||
      this.position.y < -65
    )
      this.recover();
    this.furthest = Math.max(this.furthest, this.progress);
    if (
      roadDistance(m, current.x, current.z) < 3 &&
      ridge < 0.05 &&
      Math.abs(q.x) < 0.25 &&
      Math.abs(q.z) < 0.25 &&
      this.progress < m.length - 18 &&
      !this.encounters.some(
        (event) => Math.abs(this.progress - event.z) < event.length / 2 + 22,
      )
    ) {
      this.safeZ = Math.floor(Math.max(8, this.progress - 4) / 5) * 5;
      this.safeAlt = this.isAlt;
    }
    const offset = routeX(m, this.progress, true) - roadX(m, this.progress);
    if (offset > 5)
      this.isAlt =
        Math.abs(current.x - routeX(m, this.progress, true)) <
        Math.abs(current.x - roadX(m, this.progress));
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
      const distance = event.z - this.progress;
      if (
        !event.warned &&
        !this.encounters.some(
          (other) => other !== event && other.warned && !other.resolved,
        ) &&
        distance < warningDistance(this.speed, this.mission.rain) &&
        distance > -25
      ) {
        event.warned = true;
        this.say(event.title, event.instruction, 7);
      }
      if (
        !event.entered &&
        distance <
          (event.kind === 'gust' ? 30 : event.kind === 'minibus' ? 80 : 145) &&
        (event.kind !== 'minibus' || this.progress > 445) &&
        distance > -25
      ) {
        event.entered = true;
        event.impactAtEntry = this.impacts;
        event.recoveryAtEntry = this.recoveries;
        event.passedSafely = true;
        if (event.kind === 'bridge') event.state = 'approaching';
      }
      if (event.entered && !event.resolved) {
        event.elapsed += dt;
        const oldState = event.state;
        updateTraffic(
          event,
          this.mission,
          {
            ...this.roadPosition,
            speed: this.speed,
            occupied: this.traffic.cars.some((car) => {
              const pose = encounterPose(this.mission, event);
              return (
                Math.hypot(car.pose.x - pose.x, car.pose.z - pose.z) < 18 &&
                (event.kind === 'minibus'
                  ? car.station >= event.actorZ - 6
                  : car.station <= event.actorZ + 6)
              );
            }),
          },
          dt,
        );
        if (
          event.kind === 'herd' &&
          oldState === 'waiting' &&
          event.state === 'crossing' &&
          this.traffic.occupied(
            routePoint(this.mission, event.z).x,
            routePoint(this.mission, event.z).z,
            13,
          )
        ) {
          event.state = 'waiting';
          event.phaseTime = 0;
          event.yieldAmount = 0;
        }
        if (
          event.state === 'clear' &&
          oldState !== 'clear' &&
          ['bridge', 'herd', 'minibus'].includes(event.kind)
        ) {
          const message =
            event.kind === 'herd'
              ? event.yieldAmount > 0
                ? 'The herd is home. Thank you for waiting — the road is yours.'
                : 'The herder kept the goats back. Slow for the next crossing.'
              : event.kind === 'bridge'
                ? 'Bridge clear. Stay centred and cross slowly.'
                : 'Minibus safely in its stop. Your passage is clear.';
          event.instruction = message;
          if (!this.upcomingEncounter || this.upcomingEncounter === event)
            this.say('ROAD CLEAR', message, 4);
        }
        const local = this.roadPosition.x - roadX(this.mission, this.progress);
        const bypass =
          Math.abs(local) > 8 &&
          Math.abs(
            this.roadPosition.x - routeX(this.mission, this.progress, true),
          ) < 5;
        if (Math.abs(distance) < event.length / 2 + 2 && !bypass) {
          if (Math.abs(local) > roadWidth(this.mission, this.progress) + 1.2)
            event.passedSafely = false;
          if (
            event.kind === 'bridge' &&
            (event.state !== 'clear' || Math.abs(this.speed) > 8)
          )
            event.passedSafely = false;
          if (
            (event.kind === 'washout' || event.kind === 'flood') &&
            local * event.side < 1.8
          )
            event.passedSafely = false;
          if (
            ['minibus', 'traffic'].includes(event.kind) &&
            (Math.abs(this.speed) > 12 ||
              (event.kind === 'minibus' &&
                event.state !== 'clear' &&
                Math.abs(local) < 1.65))
          )
            event.passedSafely = false;
          if (event.kind === 'herd' && event.state !== 'clear')
            event.passedSafely = false;
          if (
            event.kind === 'ridge' &&
            (Math.abs(this.speed) > 13 || this.fallingFor > 0)
          )
            event.passedSafely = false;
          if (
            event.kind === 'tree' &&
            (local * event.side < 1.8 || Math.abs(this.speed) > 10)
          )
            event.passedSafely = false;
        }
      }
      if (
        event.entered &&
        event.resolved &&
        ['minibus', 'traffic', 'bridge'].includes(event.kind)
      )
        updateTraffic(
          event,
          this.mission,
          {
            ...this.roadPosition,
            speed: this.speed,
            occupied: this.traffic.cars.some((car) => {
              const pose = encounterPose(this.mission, event);
              return (
                Math.hypot(car.pose.x - pose.x, car.pose.z - pose.z) < 18 &&
                (event.kind === 'minibus'
                  ? car.station >= event.actorZ - 6
                  : car.station <= event.actorZ + 6)
              );
            }),
          },
          dt,
        );
      const body = this.eventBodies.get(event.id);
      if (body && event.entered) {
        const pose = encounterPose(this.mission, event);
        body.setNextKinematicTranslation({
          x: pose.x,
          y: pose.y + (event.kind === 'tree' ? 0.4 : 1),
          z: pose.z,
        });
        body.setNextKinematicRotation(pose.rotation);
      }
      if (event.kind === 'gust' && Math.abs(distance) < 30)
        this.body.applyImpulse({ x: windForce(event) * dt, y: 0, z: 0 }, true);
      if (!event.resolved && distance < -event.length / 2 - 22) {
        event.resolved = true;
        event.clean =
          event.entered &&
          event.passedSafely &&
          event.impactAtEntry === this.impacts &&
          event.recoveryAtEntry === this.recoveries;
        if (event.clean) {
          this.cleanEncounters++;
          this.rewardUntil = this.elapsed + 3;
        }
      }
    }
  }
  /**
   * Solid roadside scenery shares the art's deterministic layout. All of it is
   * merged into one static trimesh of closed shapes: one collider instead of
   * hundreds keeps the per-step physics cost where it was.
   */
  private buildScenery(m: Mission) {
    const layout = sceneryLayout(m);
    const reach = (x: number, z: number) => roadDistance(m, x, z) < 45;
    const v: number[] = [],
      f: number[] = [];
    const prism = (x: number, y0: number, y1: number, z: number, r0: number, r1: number, sides = 8) => {
      const base = v.length / 3;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        v.push(x + Math.cos(a) * r0, y0, z + Math.sin(a) * r0);
        v.push(x + Math.cos(a) * r1, y1, z + Math.sin(a) * r1);
      }
      v.push(x, y0, z, x, y1, z);
      const bottom = base + sides * 2,
        top = bottom + 1;
      for (let i = 0; i < sides; i++) {
        const a = base + i * 2,
          b = base + ((i + 1) % sides) * 2;
        f.push(a, b, a + 1, a + 1, b, b + 1, bottom, b, a, top, a + 1, b + 1);
      }
    };
    const cuboid = (x: number, y: number, z: number, hx: number, hy: number, hz: number, yaw: number) => {
      const base = v.length / 3,
        c = Math.cos(yaw),
        s = Math.sin(yaw);
      for (const dy of [-hy, hy])
        for (const [dx, dz] of [
          [-hx, -hz],
          [hx, -hz],
          [hx, hz],
          [-hx, hz],
        ])
          v.push(x + dx * c + dz * s, y + dy, z - dx * s + dz * c);
      const quads = [
        [0, 1, 2, 3],
        [4, 7, 6, 5],
        [0, 4, 5, 1],
        [1, 5, 6, 2],
        [2, 6, 7, 3],
        [3, 7, 4, 0],
      ];
      for (const [a, b, cc, d] of quads) f.push(base + a, base + b, base + cc, base + a, base + cc, base + d);
    };
    const t = (1 + Math.sqrt(5)) / 2;
    const ico = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
      [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ].map(([a, b, c]) => {
      const l = Math.hypot(a, b, c);
      return [a / l, b / l, c / l];
    });
    const icoFaces = [
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
    ];
    for (const plant of layout.plants) {
      const radius = TRUNK_RADIUS[plant.kind] * plant.scale;
      if (!radius || !reach(plant.x, plant.z)) continue;
      const w = worldPose(m, plant.x, plant.z);
      const height = (plant.kind === 'baobab' ? 6.5 : 4.2) * plant.scale;
      prism(w.x, w.y - 0.5, w.y + height, w.z, radius * 1.05, radius * 0.8);
    }
    for (const b of layout.boulders) {
      if (!reach(b.x, b.z)) continue;
      const w = worldPose(m, b.x, b.z, b.yaw);
      const c = Math.cos(w.yaw),
        s = Math.sin(w.yaw),
        base = v.length / 3,
        cy = w.y - b.sy * 0.25;
      for (const [x0, y0, z0] of ico) {
        const x = x0 * b.sx * 0.95,
          y = Math.max(y0, -0.55) * b.sy * 0.95,
          z = z0 * b.sz * 0.95;
        v.push(w.x + x * c + z * s, cy + y, w.z - x * s + z * c);
      }
      for (const k of icoFaces) f.push(base + k);
    }
    for (const d of layout.mounds) {
      if (!reach(d.x, d.z)) continue;
      const w = worldPose(m, d.x, d.z);
      prism(w.x, w.y - 0.3, w.y + 2.6 * d.scale, w.z, 0.95 * d.scale, 0.12 * d.scale, 7);
    }
    for (const h of layout.homes) {
      const w = worldPose(m, h.x, h.z, h.yaw);
      cuboid(w.x, w.y + 1.2, w.z, h.width / 2 + 0.3, 1.6, h.depth / 2 + 0.3, w.yaw);
    }
    for (const well of layout.wells) {
      const w = worldPose(m, well.x, well.z);
      prism(w.x, w.y - 0.3, w.y + 1.3, w.z, 1.3, 1.2, 10);
    }
    for (const home of layout.farHomes) {
      const w = worldPose(m, home.x, home.z);
      cuboid(w.x, w.y + home.y, w.z, home.hx, home.hy, home.hz, w.yaw);
    }
    for (const r of bridgeRails(m)) {
      const w = toWorld(m, r.x, r.z);
      cuboid(w.x, roadY(m, r.z) + r.y, w.z, r.hx, r.hy, r.hz, r.yaw);
    }
    if (f.length)
      this.world.createCollider(
        RAPIER.ColliderDesc.trimesh(new Float32Array(v), new Uint32Array(f))
          .setCollisionGroups(SCENERY_GROUPS)
          .setFriction(0.6)
          .setRestitution(0.1),
      );
    // Posts and signs are knocked flying by a geometric sweep, not colliders.
    this.posts = layout.posts.map((post, index) => {
      const w = worldPose(m, post.x, post.z, Math.PI);
      const sign = post.kind === 'sign';
      const along = { x: Math.cos(w.yaw), z: -Math.sin(w.yaw) };
      const samples = sign
        ? [-1.8, -0.9, 0, 0.9, 1.8].map((o) => ({ x: w.x + along.x * o, z: w.z + along.z * o }))
        : [{ x: w.x, z: w.z }];
      return { index, station: post.z, radius: sign ? 0.3 : 0.12, samples };
    });
  }
  private posts: { index: number; station: number; radius: number; samples: { x: number; z: number }[] }[] = [];
  private sweepPosts() {
    const p = this.position,
      q = this.rotation;
    const fx = 2 * (q.x * q.z + q.w * q.y),
      fz = 1 - 2 * (q.x * q.x + q.y * q.y);
    const len = Math.hypot(fx, fz) || 1;
    const ax = fx / len,
      az = fz / len;
    const v = this.body.linvel();
    for (const post of this.posts) {
      if (Math.abs(post.station - this.progress) > 9) continue;
      if (this.knocked.some((k) => k.index === post.index)) continue;
      for (const s of post.samples) {
        const dx = s.x - p.x,
          dz = s.z - p.z;
        const forward = dx * ax + dz * az,
          lateral = dx * az - dz * ax;
        if (Math.abs(forward) < 2.45 + post.radius && Math.abs(lateral) < 0.95 + post.radius) {
          this.knock(post.index, v);
          break;
        }
      }
    }
  }
  private knock(index: number, v: { x: number; y: number; z: number }) {
    if (this.knocked.some((k) => k.index === index)) return;
    const sign = sceneryLayout(this.mission).posts[index]?.kind === 'sign';
    this.knocked.push({ index, vx: v.x, vz: v.z, at: this.elapsed });
    const drag = sign ? 0.955 : 0.985;
    const lv = this.body.linvel();
    this.body.setLinvel({ x: lv.x * drag, y: lv.y, z: lv.z * drag }, true);
    this.roadPulse = Math.max(this.roadPulse, sign ? 0.55 : 0.3);
    this.contactSerial++;
    this.contactStrength = sign ? 0.22 : 0.1;
  }
  private trafficRotation(p: { yaw: number; pitch: number }) {
    const sy = Math.sin(p.yaw / 2),
      cy = Math.cos(p.yaw / 2),
      sp = Math.sin(p.pitch / 2),
      cp = Math.cos(p.pitch / 2);
    return { x: cy * sp, y: sy * cp, z: -sy * sp, w: cy * cp };
  }
  get trafficHint() {
    if (this.brakeSource === 'crossing' && this.braking > 0.1)
      return 'CROSSING AHEAD · BRAKING ASSIST';
    const car = this.traffic.cars.find(
      (c) =>
        c.station > this.progress &&
        c.station < this.progress + 65 &&
        Math.hypot(c.pose.x - this.position.x, c.pose.z - this.position.z) < 70,
    );
    if (!car) return '';
    if (car.contactHeld) return 'GIVE ROOM · HOLD BRAKE TO REVERSE';
    return car.direction < 0
      ? 'ONCOMING TRAFFIC · KEEP RIGHT'
      : 'TRAFFIC AHEAD · PASS WHEN CLEAR';
  }
  get totalClean() {
    return this.cleanEncounters + this.traffic.clean;
  }
  get totalEncounters() {
    return this.encounters.length + this.traffic.observed;
  }
  private accept() {
    if (this.phase !== 'driving' || !this.canDeliver || this.time <= 0) return;
    const ratio = this.time / this.initial;
    this.result = {
      practice: this.practice,
      mission: this.mission.id,
      mode: this.mode,
      remaining: this.time,
      integrity: this.integrity,
      lives: this.mission.lives,
      revision: ROAD_REVISION,
      variant: this.mission.variant || 0,
      clean: this.totalClean,
      encounters: this.totalEncounters,
      score:
        1000 +
        Math.floor(400 * ratio) +
        Math.floor(4 * this.integrity) +
        Math.floor((200 * this.totalClean) / this.totalEncounters),
      stars:
        this.integrity >= 90 &&
        ratio >= 0.12 &&
        this.totalClean >= Math.ceil(this.totalEncounters * 0.75)
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
