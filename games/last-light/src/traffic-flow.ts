import { clamp, random, routeX, smooth, type Mission } from './missions';
import { ridgeAt, routePoint, toRoute, worldHeight } from './routes';
import { encounterPose, type Encounter } from './encounters';
import { roadSections } from './road-sections';

export type TrafficPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};
export type TrafficCar = {
  id: number;
  kind: 'compact' | 'pickup';
  direction: number;
  cruise: number;
  path: LanePath;
  distance: number;
  station: number;
  speed: number;
  acceleration: number;
  pose: TrafficPose;
  previous: TrafficPose;
  wheelSpin: number;
  braking: boolean;
  hold: number;
  contactHeld: boolean;
  observed: boolean;
  clean: boolean;
  credited: boolean;
  followTime: number;
  laps: number;
  state: 'cruising' | 'following' | 'yielding' | 'impact';
};
export const trafficLaneOffset = (
  m: Mission,
  station: number,
  direction: number,
) => {
  let lane = -direction * (2.35 - ridgeAt(m, station) * 0.2);
  for (const section of roadSections(m))
    if (section.kind === 'tree') {
      const blend =
        smooth(section.z - 55, section.z - 24, station) *
        (1 - smooth(section.z + 24, section.z + 55, station));
      lane += (section.safeSide * 3.25 - lane) * blend;
    }
  return lane;
};

/** Two cached, metre-parameterized lanes. Vehicles take the signed firm bypasses,
 * keeping routine traffic out of damaged decks and flooded/washed-out lines. */
export class LanePath {
  private points: ReturnType<typeof routePoint>[] = [];
  private lengths: number[] = [0];
  total = 0;
  readonly start = -150;
  constructor(
    public mission: Mission,
    public direction: number,
  ) {
    for (let s = this.start; s <= mission.length + 250; s += 2) {
      const centre = routePoint(mission, s, true);
      const a = routePoint(mission, s - 0.5, true),
        b = routePoint(mission, s + 0.5, true);
      const span = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const lane = trafficLaneOffset(mission, s, direction);
      // Offset in world metres perpendicular to the lane tangent. A logical X
      // offset shears across the switchback and jumps where its widening ends.
      const x = centre.x + (lane * (b.z - a.z)) / span;
      const z = centre.z - (lane * (b.x - a.x)) / span;
      const point = { x, z, y: worldHeight(mission, x, z) };
      const old = this.points.at(-1);
      this.points.push(point);
      if (old) {
        this.total += Math.hypot(
          point.x - old.x,
          point.y - old.y,
          point.z - old.z,
        );
        this.lengths.push(this.total);
      }
    }
  }
  atStation(station: number) {
    const n = clamp((station - this.start) / 2, 0, this.points.length - 1);
    const i = Math.min(Math.floor(n), this.points.length - 2);
    return this.lengths[i] + (this.lengths[i + 1] - this.lengths[i]) * (n - i);
  }
  sample(distance: number): { pose: TrafficPose; station: number } {
    let lo = 0,
      hi = this.points.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.lengths[mid] > distance) hi = mid;
      else lo = mid;
    }
    const a = this.points[lo],
      b = this.points[hi];
    const t = clamp(
      (distance - this.lengths[lo]) / (this.lengths[hi] - this.lengths[lo]),
      0,
      1,
    );
    const before = this.points[Math.max(0, lo - 1)],
      after = this.points[Math.min(this.points.length - 1, hi + 1)];
    const yawA = Math.atan2(b.x - before.x, b.z - before.z);
    const yawB = Math.atan2(after.x - a.x, after.z - a.z);
    let turn = yawB - yawA;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    const pitchA = -Math.atan2(
      b.y - before.y,
      Math.hypot(b.x - before.x, b.z - before.z),
    );
    const pitchB = -Math.atan2(
      after.y - a.y,
      Math.hypot(after.x - a.x, after.z - a.z),
    );
    return {
      station: this.start + (lo + t) * 2,
      pose: {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        yaw: yawA + turn * t + (this.direction < 0 ? Math.PI : 0),
        pitch: (pitchA + (pitchB - pitchA) * t) * this.direction,
      },
    };
  }
}

export type TrafficPlayer = {
  x: number;
  y: number;
  z: number;
  station: number;
  speed: number;
  heading: number;
};

/** Fixed roster: no mesh/body creation during a drive and no proximity spawning.
 * Exit recycling happens beyond both the view and the driveable route. */
export class TrafficFlow {
  cars: TrafficCar[];
  elapsed = 0;
  constructor(public mission: Mission) {
    const rand = random(mission.seed + 917);
    const paths = [new LanePath(mission, 1), new LanePath(mission, -1)];
    const count = mission.id === 0 ? 10 : 12;
    this.cars = Array.from({ length: count }, (_, i) => {
      const direction = i % 2 === 0 ? 1 : -1;
      const path = paths[direction > 0 ? 0 : 1];
      let station =
        i === 0 ? 62 : 145 + ((i - 1) * (mission.length - 210)) / (count - 1);
      // Start with an empty exposed bend. Its approaching lights gather at the far end.
      if (station > 275 && station < 452)
        station = direction > 0 ? 260 - i * 12 : 470 + i * 12;
      const kind = i % 3 === 0 ? 'pickup' : 'compact';
      const distance = path.atStation(station),
        sample = path.sample(distance);
      return {
        id: i,
        kind,
        direction,
        path,
        distance,
        station,
        cruise: kind === 'pickup' ? 6.4 + rand() * 1.6 : 8.3 + rand() * 2.3,
        speed: 0,
        acceleration: 0,
        pose: sample.pose,
        previous: { ...sample.pose },
        wheelSpin: rand() * 6,
        braking: false,
        hold: 0,
        contactHeld: false,
        observed: false,
        clean: true,
        credited: false,
        followTime: 0,
        laps: 0,
        state: 'cruising',
      };
    });
    // Hill staging can bring two seeded starts together. Space each lane in
    // actual metres before creating any visible meshes or collision bodies.
    for (const direction of [-1, 1]) {
      const lane = this.cars
        .filter((car) => car.direction === direction)
        .sort((a, b) => a.distance - b.distance);
      for (let i = 1; i < lane.length; i++) {
        const car = lane[i];
        car.distance = Math.max(car.distance, lane[i - 1].distance + 18);
        const sample = car.path.sample(car.distance);
        car.station = sample.station;
        car.pose = sample.pose;
        car.previous = { ...sample.pose };
      }
    }
  }
  get observed() {
    return this.cars.filter((c) => c.observed).length;
  }
  get clean() {
    return this.cars.filter((c) => c.observed && c.credited && c.clean).length;
  }
  occupied(x: number, z: number, radius = 10) {
    return this.cars.some(
      (c) => Math.hypot(c.pose.x - x, c.pose.z - z) < radius,
    );
  }
  hit(id: number) {
    const car = this.cars[id];
    car.clean = false;
    car.hold = 1.4;
    car.contactHeld = true;
    car.speed = 0;
    car.acceleration = 0;
    car.state = 'impact';
    car.braking = true;
  }
  update(dt: number, player: TrafficPlayer, events: Encounter[]) {
    this.elapsed += dt;
    const m = this.mission;
    const logical = toRoute(m, player.x, player.z);
    const onBranch = Math.abs(logical.x - routeX(m, logical.z, true)) < 6;
    for (const car of this.cars) {
      car.previous = { ...car.pose };
      car.hold = Math.max(0, car.hold - dt);
      const playerAlong =
        (car.path.atStation(player.station) - car.distance) * car.direction;
      const physical = Math.hypot(player.x - car.pose.x, player.z - car.pose.z);
      const sameRoad =
        onBranch &&
        Math.abs(playerAlong) < 70 &&
        Math.abs(player.y - car.pose.y) < 12;
      const dx = player.x - car.pose.x,
        dz = player.z - car.pose.z;
      const lateral = Math.abs(
        dx * Math.cos(car.pose.yaw) - dz * Math.sin(car.pose.yaw),
      );
      if (car.contactHeld) {
        if (physical < 7.5 && lateral < 3) car.hold = 1;
        else car.contactHeld = false;
      }
      let target = car.cruise;
      let moveLimit = Infinity;
      car.state = 'cruising';
      const curve = ridgeAt(m, car.station + car.direction * 18);
      if (curve > 0.01 || ridgeAt(m, car.station) > 0.01)
        target = Math.min(target, 5.8);
      // Give the player priority on the exposed ascent. Opposing cars wait on
      // firm ground beyond its exit; their following cars form a spaced queue.
      if (car.direction < 0 && car.station > 478 && player.station < 492) {
        const gap = car.distance - car.path.atStation(482);
        target = Math.min(target, Math.sqrt(Math.max(0, gap) * 5));
        if (gap < 45) car.state = 'yielding';
      }
      // Road users also yield to the lantern crossing, including its admission window.
      for (const event of events) {
        if (
          event.kind === 'tree' &&
          car.direction < 0 &&
          car.station > event.z + 40 &&
          (player.station < event.z + 55 ||
            this.cars.some(
              (other) =>
                other.direction > 0 && Math.abs(other.station - event.z) < 55,
            ))
        ) {
          const gap = car.distance - car.path.atStation(event.z + 45);
          target = Math.min(target, Math.sqrt(Math.max(0, gap) * 5));
          if (gap < 45) car.state = 'yielding';
        }
        if (
          ['minibus', 'bridge', 'traffic'].includes(event.kind) &&
          car.direction === (event.kind === 'minibus' ? 1 : -1)
        ) {
          const p = encounterPose(m, event);
          const gap =
            (car.path.atStation(event.actorZ) - car.distance) * car.direction -
            6;
          const lateralGap = Math.abs(
            (p.x - car.pose.x) * Math.cos(car.pose.yaw) -
              (p.z - car.pose.z) * Math.sin(car.pose.yaw),
          );
          if (
            gap >= 0 &&
            gap < 55 &&
            lateralGap < 2.5 &&
            Math.hypot(p.x - car.pose.x, p.z - car.pose.z) < 60
          ) {
            target = Math.min(
              target,
              Math.max(
                0,
                Math.abs(event.actorSpeed) + (gap - 8 - car.speed) * 0.65,
              ),
            );
            moveLimit = Math.min(moveLimit, Math.max(0, gap));
            car.state = 'following';
          }
        }
        if (
          event.kind === 'tree' &&
          car.direction > 0 &&
          car.station < event.z - 50 &&
          this.cars.some(
            (other) =>
              other.direction < 0 && Math.abs(other.station - event.z) < 30,
          )
        ) {
          const gap = car.path.atStation(event.z - 55) - car.distance;
          target = Math.min(target, Math.sqrt(Math.max(0, gap) * 5));
          car.state = 'yielding';
        }
        if (event.kind !== 'herd' || event.state === 'clear') continue;
        if (
          event.state !== 'crossing' &&
          Math.abs(player.station - event.z) > 90
        )
          continue;
        if (Math.abs(routeX(m, event.z, true) - routeX(m, event.z)) > 9)
          continue;
        const gap =
          (car.path.atStation(event.z - car.direction * 17) - car.distance) *
          car.direction;
        if (gap >= -2 && gap < 80) {
          target = Math.min(target, Math.sqrt(Math.max(0, gap) * 5));
          car.state = 'yielding';
        }
      }
      for (const other of this.cars) {
        if (other === car || other.direction !== car.direction) continue;
        const gap = (other.distance - car.distance) * car.direction - 6;
        if (gap <= -5 || gap > 75) continue;
        moveLimit = Math.min(moveLimit, Math.max(0, gap + 0.5));
        target = Math.min(
          target,
          Math.max(0, other.speed + (gap - 7 - car.speed * 1.2) * 0.65),
        );
        if (target < car.cruise - 0.5) car.state = 'following';
      }
      // Local swept clearance remains independent of route-station ordering:
      // this also protects a player crossing lanes or facing backwards.
      const facing = Math.cos(player.heading - car.pose.yaw);
      if (
        playerAlong > -2 &&
        playerAlong < 75 &&
        physical < 75 &&
        lateral < 2.7
      ) {
        const aheadSpeed = Math.max(0, player.speed * facing);
        const gap = physical - 6;
        target = Math.min(
          target,
          Math.max(0, aheadSpeed + (gap - 6 - car.speed * 1.3) * 0.7),
        );
        car.state = 'following';
      }
      if (
        physical < 5.2 &&
        lateral < 2.2 &&
        dx * Math.sin(car.pose.yaw) + dz * Math.cos(car.pose.yaw) > 0 &&
        Math.abs(player.y - car.pose.y) < 3
      ) {
        target = 0;
        car.speed = 0;
      }
      if (car.hold > 0) {
        target = 0;
        car.state = 'impact';
      }
      const desired = clamp((target - car.speed) * 2, -4.2, 2.1);
      car.acceleration += clamp(desired - car.acceleration, -dt * 9, dt * 6);
      const oldDistance = car.distance;
      car.speed = clamp(car.speed + car.acceleration * dt, 0, car.cruise);
      if (target === 0 && car.speed < 0.08) car.speed = 0;
      car.braking =
        car.acceleration < -0.35 || (target < 0.3 && car.speed < 0.5);
      car.distance = clamp(
        car.distance + car.direction * Math.min(car.speed * dt, moveLimit),
        0,
        car.path.total,
      );
      const sample = car.path.sample(car.distance);
      car.pose = sample.pose;
      car.station = sample.station;
      car.wheelSpin += Math.abs(car.distance - oldDistance) / 0.36;
      if (moveLimit < car.speed * dt) {
        car.speed = moveLimit / dt;
        car.acceleration = Math.min(0, car.acceleration);
      }
      if (physical < 55 && sameRoad) car.observed = true;
      if (car.observed && !car.credited) {
        if (player.station > car.station + 10) car.credited = true;
        if (
          car.direction > 0 &&
          playerAlong < -7 &&
          playerAlong > -40 &&
          Math.abs(player.speed - car.speed) < 2.5
        )
          car.followTime += dt;
        if (car.followTime > 4) car.credited = true;
      }
      if (
        (car.distance === 0 || car.distance === car.path.total) &&
        physical > 300
      ) {
        const start = car.direction > 0 ? 0 : car.path.total;
        const entry = car.path.sample(start);
        if (
          Math.hypot(entry.pose.x - player.x, entry.pose.z - player.z) > 300 &&
          !this.occupied(entry.pose.x, entry.pose.z, 20)
        ) {
          car.distance = start;
          car.pose = entry.pose;
          car.previous = { ...entry.pose };
          car.station = entry.station;
          car.speed = 0;
          car.acceleration = 0;
          car.laps++;
        }
      }
    }
  }
}
