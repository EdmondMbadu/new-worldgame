import type { GameEngine, Input } from './engine';
import { clamp, routeX, roadX, isMud, onBridge } from './missions';

/** Test driver uses the same controls as a player; it never edits simulation state. */
export function driveInput(
  e: GameEngine,
  alternate = false,
  fast = false,
): Input {
  const p = e.position,
    m = e.mission;
  const z = Math.min(m.length, p.z + 8 + Math.abs(e.speed) * 0.7);
  let x = routeX(m, z, alternate);
  const event = e.encounters.find(
    (event) =>
      event.kind !== 'gust' && event.z - p.z < 70 && event.z - p.z > -12,
  );
  if (event && Math.abs(x - roadX(m, z)) < 6) x -= event.side * 1.2;
  const obstruction = e.obstacles.find(
    (o) =>
      o.kind !== 'rut' &&
      o.z - p.z < 40 &&
      o.z - p.z > -6 &&
      Math.abs(o.x - routeX(m, o.z, alternate)) < 5,
  );
  if (obstruction && !event)
    x -= Math.sign(obstruction.x - routeX(m, obstruction.z, alternate)) * 1.1;
  let error = Math.atan2(x - p.x, z - p.z) - e.heading;
  while (error > Math.PI) error -= Math.PI * 2;
  while (error < -Math.PI) error += Math.PI * 2;
  const preview = Math.min(m.length, p.z + 30);
  const mud =
    isMud(m, routeX(m, preview, alternate), preview) || e.surface === 'Mud';
  const bridge =
    onBridge(m, preview) &&
    Math.abs(routeX(m, preview, alternate) - roadX(m, preview)) < 5;
  const remaining = m.length - p.z;
  const target = Math.min(
    Math.sqrt(Math.max(0, remaining - 3) * 2 * 3.6),
    bridge || e.surface === 'Bridge' ? 5 : mud ? 8.5 : fast ? 19 : 11.5,
    Math.abs(error) > 0.45 ? 9 : 24,
  );
  return {
    steer: clamp(error * 2.3, -1, 1),
    throttle: e.speed < target ? 0.85 : 0,
    brake: e.speed > target + 0.3 ? 0.55 : 0,
    action: e.canDeliver || (e.needsRecovery && Math.abs(e.speed) < 1),
  };
}
