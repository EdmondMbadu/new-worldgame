import type { GameEngine, Input } from './engine';
import { clamp, routeX, roadX, isMud, onBridge, smooth } from './missions';

/** Ordinary-input test driver. Reads road signs/encounters; never edits simulation state. */
export function driveInput(
  e: GameEngine,
  alternate = false,
  fast = false,
): Input {
  const p = e.position,
    m = e.mission;
  const z = Math.min(m.length, p.z + 7 + Math.abs(e.speed) * 0.6);
  let x = routeX(m, z, alternate);
  let encounterLimit = 24;
  const event = e.encounters.find(
    (event) =>
      event.kind !== 'gust' &&
      event.z - p.z < 125 &&
      event.z - p.z > -event.length / 2 - 25,
  );
  if (event && Math.abs(x - roadX(m, z)) < 8) {
    const distance = event.z - p.z;
    if (event.kind === 'bridge') {
      const stop = event.z - event.length / 2 - 27;
      if (event.state !== 'clear')
        encounterLimit = Math.sqrt(Math.max(0, stop - p.z) * 6);
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
  let error = Math.atan2(x - p.x, z - p.z) - e.heading;
  while (error > Math.PI) error -= Math.PI * 2;
  while (error < -Math.PI) error += Math.PI * 2;
  const preview = Math.min(m.length, p.z + 30);
  const mud =
    isMud(m, routeX(m, preview, alternate), preview) || e.surface === 'Mud';
  const bridge =
    onBridge(m, preview) &&
    Math.abs(routeX(m, preview, alternate) - roadX(m, preview)) < 5;
  const rough = e.obstacles.some(
    (o) =>
      o.z > p.z - 5 &&
      o.z < p.z + 55 &&
      Math.abs(o.x - routeX(m, o.z, alternate)) < 5,
  );
  const target = Math.min(
    Math.sqrt(Math.max(0, m.length - p.z - 3) * 7.2),
    bridge || e.surface === 'Bridge' ? 5.5 : mud ? 8.5 : fast ? 19 : 11.5,
    Math.abs(error) > 0.45 ? 8 : 24,
    encounterLimit,
    rough ? 9.5 : 24,
  );
  return {
    steer: clamp(-error * 2.5, -1, 1),
    throttle: e.speed < target - 0.1 ? 0.8 : 0,
    brake: e.speed > target + 0.2 ? 0.55 : 0,
    action: e.canDeliver || (e.needsRecovery && Math.abs(e.speed) < 1),
  };
}
