import { clamp, heightAt, roadX, smooth, type Mission } from './missions';
import type { Encounter } from './encounters';
import { toWorld } from './routes';

export type RoadUser = { x: number; z: number; speed: number };
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
  if (e.kind === 'minibus' && e.state !== 'clear') {
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
      e.actorZ = Math.min(e.z, e.actorZ + speed * dt);
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
    if (!conflict) e.actorZ -= dt * 7;
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
    if (!conflict) e.actorZ -= dt * 7;
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
