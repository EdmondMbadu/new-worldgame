import { clamp, heightAt, roadX, smooth, type Mission } from './missions';
import type { Encounter } from './encounters';
import { remainingDistance, toWorld } from './routes';

export type RoadUser = {
  x: number;
  z: number;
  speed: number;
  occupied?: boolean;
};
export function updateTraffic(
  e: Encounter,
  m: Mission,
  player: RoadUser,
  dt: number,
) {
  const offset = player.x - roadX(m, player.z);
  const gap = player.z - e.actorZ;
  const oldZ = e.actorZ;
  e.phaseTime += dt;
  e.brakeLights = false;
  if (
    ['minibus', 'traffic', 'bridge'].includes(e.kind) &&
    e.state === 'clear'
  ) {
    e.stopTime += dt;
    const outgoing = e.kind === 'minibus';
    const targetOffset = outgoing ? -2.35 : 2.35;
    const closingGap = (player.z - e.actorZ) * (outgoing ? 1 : -1);
    const occupiedAhead =
      closingGap > -2 &&
      closingGap < 17 &&
      Math.abs(offset - e.actorOffset) < 2.8;
    const safe =
      !player.occupied &&
      !occupiedAhead &&
      (outgoing ? player.z > e.z + 16 : player.z - e.actorZ > 16);
    e.indicator =
      outgoing && e.stopTime > 7 && Math.abs(e.actorOffset - targetOffset) > 0.1
        ? 1
        : 0;
    if (safe && (!outgoing || e.stopTime > 8)) {
      const speed = Math.min(7, Math.abs(e.actorSpeed) + dt * 1.6);
      if (e.kind === 'bridge' && e.actorOffset === 0)
        e.actorOffset = -e.side * 4.3;
      e.actorOffset += clamp(
        targetOffset - e.actorOffset,
        -dt * 0.55,
        dt * 0.55,
      );
      e.actorZ = clamp(
        e.actorZ + (outgoing ? 1 : -1) * speed * dt,
        -150,
        m.length + 200,
      );
    } else e.brakeLights = true;
  } else if (e.kind === 'minibus' && e.state !== 'clear') {
    e.indicator = -e.side;
    const approaching = e.actorZ < e.z - 11;
    const targetOffset = approaching ? 0 : -e.side * 3.25;
    // The whole body and its swept pull-in corridor must be free of the player.
    const occupied =
      Math.abs(gap) < 10 &&
      (Math.abs(offset - targetOffset) < 2.8 ||
        Math.abs(offset - e.actorOffset) < 2.8);
    const ahead = gap > 0 && gap < 15 && Math.abs(offset - e.actorOffset) < 2.8;
    const speed = approaching
      ? 5.2
      : Math.min(2.5, Math.max(0, e.z - e.actorZ) * 0.9);
    e.brakeLights = !approaching || occupied || ahead;
    if (!occupied && !ahead) {
      e.actorZ = Math.min(
        e.z,
        e.actorZ + Math.min(speed, Math.abs(e.actorSpeed) + dt * 1.8) * dt,
      );
      e.actorOffset += clamp(
        targetOffset - e.actorOffset,
        -dt * 0.85,
        dt * 0.85,
      );
    }
    e.blockedFor = occupied || ahead ? e.blockedFor + dt : 0;
    e.state = approaching ? 'approaching' : 'clearing';
    if (
      e.actorZ > e.z - 0.12 &&
      Math.abs(e.actorOffset - targetOffset) < 0.05
    ) {
      e.state = 'clear';
      e.indicator = 0;
    }
  } else if (e.kind === 'traffic' && e.state !== 'clear') {
    const conflict =
      gap < 6 && gap > -30 && Math.abs(offset - e.actorOffset) < 3;
    const target = -e.side * (conflict ? 4.1 : 2.7);
    e.indicator = conflict ? -e.side : 0;
    e.brakeLights = conflict;
    // Never sweep through an occupied shoulder to reach the yielding position.
    if (Math.abs(gap) > 10 || Math.abs(offset - target) > 3)
      e.actorOffset += clamp(target - e.actorOffset, -dt * 0.7, dt * 0.7);
    if (!conflict)
      e.actorZ -= dt * Math.min(7, Math.abs(e.actorSpeed) + dt * 2);
    e.blockedFor = conflict ? e.blockedFor + dt : 0;
    e.state = conflict ? 'waiting' : 'approaching';
    if (e.actorZ < e.z - 42) {
      e.state = 'clear';
      e.indicator = 0;
    }
  } else if (e.kind === 'bridge' && e.state !== 'clear') {
    const entry = e.z - e.length / 2;
    const bay = -e.side * 4.3 * smooth(0, 16, entry - e.actorZ);
    const conflict = gap > -13 && gap < 4 && Math.abs(offset - bay) < 2.8;
    e.brakeLights = conflict;
    if (!conflict)
      e.actorZ -= dt * Math.min(7, Math.abs(e.actorSpeed) + dt * 2);
    e.blockedFor = conflict ? e.blockedFor + dt : 0;
    e.state =
      e.actorZ > e.z + e.length / 2
        ? 'approaching'
        : e.actorZ > entry
          ? 'crossing'
          : 'clearing';
    if (e.actorZ < entry - 20) e.state = 'clear';
  } else if (e.kind === 'herd') {
    const distance = e.z - player.z;
    if (
      e.state === 'waiting' &&
      distance < 62 &&
      distance > 23 &&
      Math.abs(player.speed) < 8
    ) {
      e.state = 'crossing';
      e.yieldAmount = 1;
      e.phaseTime = 0;
    } else if (e.state === 'waiting' && distance < 23) {
      // The herder holds the animals on the verge when a driver does not slow.
      e.passedSafely = false;
      if (distance < -20) e.state = 'clear';
    }
    if (e.state === 'crossing' && e.phaseTime > 9.6) e.state = 'clear';
  } else if (e.kind === 'market') {
    // People cross between the stalls unless a vehicle is hurrying through;
    // then they wait at the verge. Nobody steps out in front of a moving truck.
    const distance = e.z - player.z;
    const hurried =
      distance < 80 &&
      distance > -e.length / 2 - 6 &&
      Math.abs(player.speed) > 5.5;
    e.state = hurried || player.occupied ? 'waiting' : 'crossing';
  } else if (e.kind === 'flood') {
    // The runoff rises during the approach, then holds for the committed crossing.
    if (e.z - player.z > 65) e.waterLevel = smooth(0, 8, e.elapsed) * 0.16;
  }
  e.actorSpeed = (e.actorZ - oldZ) / dt;
}

export function herdPose(m: Mission, e: Encounter, index: number) {
  const travel =
    e.yieldAmount === 0 ? 0 : clamp((e.phaseTime - index * 0.55) / 8.4, 0, 1);
  const offset = e.side * (-7.6 + travel * 15.2);
  const station = e.z + (index - 1) * 1.5;
  const x = roadX(m, station) + offset;
  const world = toWorld(m, x, station);
  return {
    ...world,
    y: heightAt(m, x, station),
    heading: (e.side * Math.PI) / 2,
    walking: travel > 0 && travel < 1,
    offset,
  };
}

/** Progressive, path-aware livestock assistance; the clinic parking hold is separate. */
export function crossingBrake(
  events: Encounter[],
  m: Mission,
  player: { x: number; z: number },
  speed: number,
) {
  if (speed < -0.1) return 0;
  let brake = 0;
  for (const e of events) {
    if (e.kind !== 'herd' || e.state !== 'crossing') continue;
    const along =
      remainingDistance(m, player.z, false) - remainingDistance(m, e.z, false);
    if (along < -5 || along > 65) continue;
    const offset = player.x - roadX(m, player.z);
    // The last goat must clear this truck's corridor; release before the whole
    // scripted sequence finishes when it is physically safe to move again.
    const conflict = [0, 1, 2].some((i) => {
      const goat = herdPose(m, e, i);
      return e.side * (goat.offset - offset) < 2.3 && Math.abs(offset) < 6;
    });
    if (!conflict) continue;
    const stopGap = Math.max(0, along - 9);
    const safeSpeed = Math.sqrt(stopGap * 4.5);
    brake = Math.max(brake, clamp((speed - safeSpeed) / 2.5, 0, 1));
    if (stopGap < 1 && speed >= 0) brake = Math.max(brake, 0.3);
  }
  return brake;
}
