import { ridgeAt, routePoint, stationAhead } from './routes';
import type { GameEngine, Input } from './engine';
import { clamp, routeX, roadX, isMud, onBridge, smooth } from './missions';

/** Ordinary-input test driver. Reads road signs/encounters; never edits simulation state. */
export function driveInput(
  e: GameEngine,
  alternate = false,
  fast = false,
  conservative = false,
): Input {
  const stoppedContact = e.traffic.cars.find(
    (car) =>
      car.contactHeld &&
      Math.hypot(car.pose.x - e.position.x, car.pose.z - e.position.z) < 8,
  );
  if (stoppedContact && Math.abs(e.speed) < 3)
    return { steer: 0, throttle: 0, brake: 0.5, action: false };
  const p = e.position,
    m = e.mission;
  const z = stationAhead(
    m,
    e.progress,
    5 + Math.abs(e.speed) * 0.55,
    alternate,
  );
  let x = routeX(m, z, alternate);
  let encounterLimit = 24;
  const event = e.encounters.find(
    (event) =>
      event.kind !== 'gust' &&
      event.kind !== 'ridge' &&
      event.z - e.progress < 125 &&
      event.z - e.progress > -event.length / 2 - 25,
  );
  if (event && Math.abs(x - roadX(m, z)) < 8) {
    const distance = event.z - e.progress;
    if (event.kind === 'herd') {
      if (event.state !== 'clear')
        encounterLimit = Math.min(
          6.8,
          Math.sqrt(Math.max(0, event.z - e.progress - 28) * 6),
        );
    } else if (event.kind === 'bridge') {
      const stop = event.z - event.length / 2 - 27;
      if (event.state !== 'clear')
        encounterLimit = Math.sqrt(Math.max(0, stop - e.progress) * 6);
      else encounterLimit = 5.5;
    } else {
      const blend =
        smooth(event.z - 90, event.z - 35, z) *
        (1 -
          smooth(
            event.z + event.length / 2 + 8,
            event.z + event.length / 2 + 35,
            z,
          ));
      x +=
        event.side *
        (event.kind === 'washout' || event.kind === 'flood' ? 3.35 : 3.15) *
        blend;
      if (distance < 65) encounterLimit = event.kind === 'flood' ? 5.5 : 6.5;
    }
  }
  // Read visible road users and use the same steer/pedals as a player. A
  // conservative run follows; an overtaking run waits for a clear return gap.
  const users = e.traffic.cars.filter(
    (car) =>
      Math.abs(
        routeX(m, car.station, true) - routeX(m, car.station, alternate),
      ) < 5,
  );
  const lead = users
    .filter(
      (car) =>
        car.direction > 0 &&
        car.station - e.progress > -14 &&
        car.station - e.progress < 75,
    )
    .sort(
      (a, b) =>
        Math.abs(a.station - e.progress) - Math.abs(b.station - e.progress),
    )[0];
  const incoming = users.filter(
    (car) =>
      car.direction < 0 &&
      car.station - e.progress > -12 &&
      car.station - e.progress < 180,
  );
  const hazard =
    event &&
    !['minibus', 'traffic'].includes(event.kind) &&
    event.z - e.progress < 85 &&
    Math.abs(routeX(m, z, alternate) - roadX(m, z)) < 8;
  const onRidge = ridgeAt(m, e.progress) > 0 || ridgeAt(m, z) > 0;
  if (!hazard && !onRidge) {
    if (lead) {
      const gap = lead.station - e.progress;
      const pass =
        !conservative &&
        incoming.length === 0 &&
        ridgeAt(m, e.progress + 25) < 0.01;
      x =
        routeX(m, z, alternate) +
        (pass ? 2.15 : -2.35) * (1 - smooth(55, 75, Math.abs(gap)));
      if (!pass && gap > -5)
        encounterLimit = Math.min(
          encounterLimit,
          Math.max(0, lead.speed + (gap - 17) * 0.5),
        );
    } else if (incoming.some((car) => car.station - e.progress < 85)) {
      x = routeX(m, z, alternate) - 2.35;
    }
  }
  if (
    hazard &&
    lead &&
    lead.station > e.progress &&
    lead.station - e.progress < 55
  )
    encounterLimit = Math.min(
      encounterLimit,
      Math.max(0, lead.speed + (lead.station - e.progress - 17) * 0.45),
    );
  const point = routePoint(m, z, alternate, x - routeX(m, z, alternate));
  let error = Math.atan2(point.x - p.x, point.z - p.z) - e.heading;
  while (error > Math.PI) error -= Math.PI * 2;
  while (error < -Math.PI) error += Math.PI * 2;
  const preview = Math.min(m.length, e.progress + 30);
  const mud =
    isMud(m, routeX(m, preview, alternate), preview) || e.surface === 'Mud';
  const bridge =
    onBridge(m, preview) &&
    Math.abs(routeX(m, preview, alternate) - roadX(m, preview)) < 5;
  const rough = e.obstacles.some(
    (o) =>
      o.z > e.progress - 5 &&
      o.z < e.progress + 55 &&
      Math.abs(o.x - routeX(m, o.z, alternate)) < 5,
  );
  const target = Math.min(
    Math.sqrt(Math.max(0, m.length - e.progress - 3) * 7.2),
    bridge || e.surface === 'Bridge' ? 5.5 : mud ? 8.5 : fast ? 19 : 11.5,
    Math.abs(error) > 0.45 ? 8 : 24,
    encounterLimit,
    ridgeAt(m, e.progress + 20) > 0.01 || ridgeAt(m, e.progress) > 0 ? 6.5 : 24,
    rough ? 9.5 : 24,
  );
  return {
    steer: clamp(-error * 2.5, -1, 1),
    throttle: e.speed < target - 0.1 ? 0.8 : 0,
    brake: e.speed > target + 0.2 ? 0.55 : 0,
    action: e.canDeliver || (e.needsRecovery && Math.abs(e.speed) < 1),
  };
}
