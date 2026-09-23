import { ridgeAt, routePoint, stationAhead } from './routes';
import type { GameEngine, Input } from './engine';
import type { Encounter } from './encounters';
import { clamp, routeX, roadX, isMud, onBridge, smooth } from './missions';

/** Lateral line (m toward the safe side) and speed (m/s) for passing a hazard. */
const PASSING_LINE: Partial<Record<Encounter['kind'], [number, number]>> = {
  washout: [3.35, 6.5],
  flood: [3.35, 5.5],
  lorry: [2.6, 6],
  breakdown: [2.2, 8],
  landslide: [2.9, 5],
};
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
  // Only hazards on the driver's own route matter; a signed bypass goes around them.
  const onRoute =
    !!event &&
    Math.abs(routeX(m, event.z, alternate) - roadX(m, event.z)) < 2;
  if (event && onRoute && Math.abs(x - roadX(m, z)) < 8) {
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
    } else if (event.kind === 'market' || event.kind === 'planks') {
      // Crawl through at a steady walking pace; the planks need the centre line.
      const crawl = event.kind === 'market' ? 4.2 : 2.9;
      const entry = event.z - event.length / 2 - 4;
      if (e.progress < event.z + event.length / 2 + 2)
        encounterLimit = Math.sqrt(
          crawl * crawl + 5 * Math.max(0, entry - e.progress),
        );
    } else {
      const blend =
        smooth(event.z - 90, event.z - 35, z) *
        (1 -
          smooth(
            event.z + event.length / 2 + 8,
            event.z + event.length / 2 + 35,
            z,
          ));
      const line = PASSING_LINE[event.kind] ?? [3.15, 6.5];
      x += event.side * line[0] * blend;
      if (distance < 65) encounterLimit = line[1];
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
    onRoute &&
    !['minibus', 'traffic'].includes(event.kind) &&
    event.z - e.progress < 85 &&
    Math.abs(routeX(m, z, alternate) - roadX(m, z)) < 8;
  const onRidge = ridgeAt(m, e.progress) > 0 || ridgeAt(m, z) > 0;
  if (!hazard && !onRidge) {
    if (lead) {
      const gap = lead.station - e.progress;
      // Never overtake where the signed bypass splits from or rejoins the road.
      const split = [0, 30, 60].some(
        (ahead) =>
          Math.abs(
            routeX(m, e.progress + ahead, true) - roadX(m, e.progress + ahead),
          ) > 0.3 &&
          Math.abs(
            routeX(m, e.progress + ahead, true) - roadX(m, e.progress + ahead),
          ) < 12,
      );
      const pass =
        !conservative &&
        !split &&
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
      // An abandoned overtake never cuts in beside the car: hold the outside
      // line and drop back behind it first.
      const beside = e.roadPosition.x - routeX(m, e.progress, alternate) > 0.6;
      if (!pass && beside && gap > -9 && gap < 11)
        x = routeX(m, z, alternate) + 2.15;
    } else if (incoming.some((car) => car.station - e.progress < 85)) {
      x = routeX(m, z, alternate) - 2.35;
    }
  }
  if (
    (hazard || onRidge) &&
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
