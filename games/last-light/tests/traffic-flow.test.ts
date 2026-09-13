import { beforeAll, describe, expect, it } from 'vitest';
import {
  GameEngine,
  emptyInput,
  initPhysics,
  type Result,
} from '../src/engine';
import { MISSIONS, roadX } from '../src/missions';
import { makeEncounters } from '../src/encounters';
import { FrameHealth } from '../src/frame-health';
import { LanePath, TrafficFlow, type TrafficPlayer } from '../src/traffic-flow';
import { crossingBrake } from '../src/traffic';
import { routePoint } from '../src/routes';
import { bestKey, freshSave, parseSave, recordResult } from '../src/save';
import { ROAD_REVISION } from '../src/vehicle';
import { driveInput } from '../src/qa-driver';

beforeAll(initPhysics);
const flat = { ...MISSIONS[0], bend: 0, mud: [] };
const away: TrafficPlayer = {
  x: 1000,
  y: 5,
  z: 0,
  station: 510,
  speed: 0,
  heading: 0,
};
function move(flow: TrafficFlow, id: number, station: number, speed = 0) {
  const car = flow.cars[id];
  car.distance = car.path.atStation(station);
  const sample = car.path.sample(car.distance);
  car.station = sample.station;
  car.pose = sample.pose;
  car.previous = { ...sample.pose };
  car.speed = speed;
  return car;
}

describe('frame continuity and honest diagnostics', () => {
  it('reports long frames in percentiles, maxima and counters without unbounded storage', () => {
    const frames = new FrameHealth();
    for (let i = 0; i < 60; i++) frames.record(1 / 60, 2, 4);
    frames.record(0.7, 3, 5);
    frames.record(0.3, 3, 5);
    expect(frames.stats.max).toBe(700);
    expect(frames.stats.over100).toBe(2);
    expect(frames.stats.over650).toBe(1);
    expect(frames.stats.p99).toBe(700);
    expect(frames.stats.fps).toBeLessThan(40);
    for (let i = 0; i < 5000; i++) frames.record(1 / 60);
    expect(frames.stats.max).toBe(700);
    expect(frames.stats.p95).toBeCloseTo(1000 / 60);
  });
  it('bounds short, long and repeated foreground delays and preserves deliberate pauses', () => {
    const e = new GameEngine(flat);
    try {
      e.phase = 'driving';
      for (const dt of [0.1, 0.3, 0.7, 3, 0.05, 0.05, 0.3]) {
        const elapsed = e.elapsed,
          traffic = e.traffic.elapsed,
          time = e.time;
        e.advance(dt, emptyInput());
        expect(e.phase).toBe('driving');
        expect(e.lastSubsteps).toBeLessThanOrEqual(6);
        expect(e.elapsed - elapsed).toBeCloseTo(Math.min(dt, 0.1), 6);
        expect(e.traffic.elapsed - traffic).toBeCloseTo(e.elapsed - elapsed, 6);
        expect(time - e.time).toBeCloseTo(e.elapsed - elapsed, 6);
      }
      e.pause('visibilitychange');
      const positions = e.traffic.cars.map((c) => c.distance);
      e.advance(3, emptyInput());
      expect(e.traffic.cars.map((c) => c.distance)).toEqual(positions);
      expect(e.pauseEvents).toBe(1);
    } finally {
      e.dispose();
    }
  });
  it('brakes progressively only while animals still occupy the approaching truck path', () => {
    const event = makeEncounters(flat).find((e) => e.kind === 'herd')!;
    event.state = 'crossing';
    event.yieldAmount = 1;
    event.phaseTime = 3;
    const far = crossingBrake([event], flat, { x: 0, z: event.z - 55 }, 8);
    const close = crossingBrake([event], flat, { x: 0, z: event.z - 12 }, 8);
    expect(far).toBe(0);
    expect(close).toBeGreaterThan(0.5);
    expect(crossingBrake([event], flat, { x: 20, z: event.z - 12 }, 8)).toBe(0);
    expect(crossingBrake([event], flat, { x: 0, z: event.z + 10 }, 8)).toBe(0);
    event.phaseTime = 9.5;
    expect(crossingBrake([event], flat, { x: 0, z: event.z - 12 }, 8)).toBe(0);
  });
});

describe('persistent road traffic', () => {
  it('keeps both lanes at a continuous physical offset through hill and fork transitions', () => {
    for (const m of MISSIONS)
      for (const direction of [-1, 1]) {
        const path = new LanePath(m, direction);
        for (let station = 275; station < 470; station += 0.5) {
          const p = path.sample(path.atStation(station)).pose;
          const centre = routePoint(m, station, true);
          expect(Math.hypot(p.x - centre.x, p.z - centre.z)).toBeLessThan(2.65);
          expect(p.y - centre.y).toBeGreaterThan(-1.6);
        }
      }
  });
  it('keeps a bounded fleet separated through queues, bends and a complete traffic cycle', () => {
    for (const m of MISSIONS) {
      const flow = new TrafficFlow(m),
        events = makeEncounters(m);
      const count = flow.cars.length;
      for (let frame = 0; frame < 3600; frame++) {
        flow.update(1 / 30, { ...away, station: m.length }, events);
        if (frame % 10) continue;
        for (let i = 0; i < count; i++)
          for (let j = i + 1; j < count; j++) {
            const a = flow.cars[i],
              b = flow.cars[j];
            if (
              Math.abs(a.pose.y - b.pose.y) > 1.8 ||
              Math.hypot(a.pose.x - b.pose.x, a.pose.z - b.pose.z) > 7
            )
              continue;
            const axes = [a, b].flatMap((c) => [
              [Math.cos(c.pose.yaw), -Math.sin(c.pose.yaw)],
              [Math.sin(c.pose.yaw), Math.cos(c.pose.yaw)],
            ]);
            const radius = (c: typeof a, axis: number[]) =>
              0.9 *
                Math.abs(
                  Math.cos(c.pose.yaw) * axis[0] -
                    Math.sin(c.pose.yaw) * axis[1],
                ) +
              (c.kind === 'pickup' ? 2.2 : 1.95) *
                Math.abs(
                  Math.sin(c.pose.yaw) * axis[0] +
                    Math.cos(c.pose.yaw) * axis[1],
                );
            const overlap = axes.every(
              (axis) =>
                Math.abs(
                  (a.pose.x - b.pose.x) * axis[0] +
                    (a.pose.z - b.pose.z) * axis[1],
                ) <
                radius(a, axis) + radius(b, axis) - 0.08,
            );
            expect(
              overlap,
              `${m.id}: cars ${a.id}/${b.id} at ${a.station.toFixed(1)}/${b.station.toFixed(1)}`,
            ).toBe(false);
          }
      }
      expect(flow.cars.length).toBe(count);
    }
  });
  it('covers every chapter with reproducible cars, both directions and real metre-based travel', () => {
    for (const m of MISSIONS) {
      const a = new TrafficFlow(m),
        b = new TrafficFlow(m);
      expect(a.cars.length).toBeGreaterThanOrEqual(10);
      expect(a.cars.map((c) => [c.station, c.cruise, c.kind])).toEqual(
        b.cars.map((c) => [c.station, c.cruise, c.kind]),
      );
      const path = new LanePath(m, 1);
      const start = path.atStation(350);
      let measured = 0,
        previous = path.sample(start).pose;
      for (let s = 0.1; s <= 8; s += 0.1) {
        const pose = path.sample(start + s).pose;
        measured += Math.hypot(
          pose.x - previous.x,
          pose.y - previous.y,
          pose.z - previous.z,
        );
        previous = pose;
      }
      expect(measured).toBeGreaterThan(7.7);
      expect(measured).toBeLessThan(8.1);
    }
  });
  it('accelerates gradually, follows a stopped truck without contact, and resumes after clearance', () => {
    const flow = new TrafficFlow(flat),
      car = move(flow, 0, 25, 7);
    flow.cars = [car];
    const p = car.path.sample(car.path.atStation(65)).pose;
    const player = { ...p, station: 65, speed: 0, heading: 0 };
    let last = car.speed;
    for (let i = 0; i < 600; i++) {
      flow.update(1 / 60, player, []);
      expect(car.speed - last).toBeLessThanOrEqual(2.1 / 60 + 1e-6);
      last = car.speed;
    }
    expect(car.station).toBeLessThan(60);
    expect(car.speed).toBeLessThan(0.3);
    const stopped = car.distance;
    for (let i = 0; i < 180; i++) flow.update(1 / 60, away, []);
    expect(car.distance).toBeGreaterThan(stopped + 3);
  });
  it('queues oncoming cars on firm ground until the exposed hill clears', () => {
    const flow = new TrafficFlow(MISSIONS[0]);
    const car = move(flow, 1, 490, 8);
    flow.cars = [car];
    for (let i = 0; i < 900; i++)
      flow.update(1 / 60, { ...away, station: 365 }, []);
    expect(car.station).toBeGreaterThanOrEqual(478);
    expect(car.speed).toBeLessThan(0.3);
    for (let i = 0; i < 300; i++) flow.update(1 / 60, away, []);
    expect(car.station).toBeLessThan(478);
  });
  it('does not recycle into view or duplicate a safe-follow reward', () => {
    const flow = new TrafficFlow(flat),
      car = move(flow, 0, flat.length + 250);
    flow.cars = [car];
    flow.update(1 / 60, { ...away, x: car.pose.x, z: car.pose.z }, []);
    expect(car.laps).toBe(0);
    const second = new TrafficFlow(flat),
      lead = move(second, 0, 60, 7);
    second.cars = [lead];
    for (let i = 0; i < 360; i++) {
      const p = lead.path.sample(lead.distance - 20);
      second.update(
        1 / 60,
        { ...p.pose, station: p.station, speed: lead.speed, heading: 0 },
        [],
      );
    }
    expect(second.clean).toBe(1);
    second.hit(0);
    expect(second.clean).toBe(0);
    expect(second.observed).toBe(1);
  });
  it('uses physical traffic colliders, charges an impact once, and does not pause the drive', () => {
    const e = new GameEngine(flat);
    try {
      const car = e.traffic.cars[0];
      const p = car.pose;
      e.body.setTranslation({ x: p.x, y: p.y + 0.9, z: p.z - 7 }, true);
      e.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      e.body.setLinvel({ x: 0, y: 0, z: 16 }, true);
      e.phase = 'driving';
      for (let i = 0; i < 90; i++) e.step(1 / 60, emptyInput());
      expect(e.integrity).toBeLessThan(100);
      expect(car.clean).toBe(false);
      expect(e.phase).toBe('driving');
      expect(e.impacts).toBeLessThanOrEqual(2);
      expect(e.speed).toBeLessThan(10);
    } finally {
      e.dispose();
    }
  });
  it('keeps revision 4 records and a larger traffic score separate', () => {
    const old: Result = {
      mission: 0,
      mode: 'standard',
      revision: 4,
      variant: 0,
      remaining: 150,
      integrity: 100,
      lives: 3,
      score: 1700,
      stars: 3,
      clean: 4,
      encounters: 4,
    };
    const current = {
      ...old,
      revision: ROAD_REVISION,
      clean: 11,
      encounters: 14,
    };
    const parsed = parseSave(
      JSON.stringify(recordResult(recordResult(freshSave(), old), current)),
    );
    expect(parsed.best[bestKey(0, 'standard', 0, 4)]).toEqual(old);
    expect(parsed.best[bestKey(0, 'standard')]).toEqual(current);
  });
  it('a conservative first delivery can follow traffic and still reach the clinic', () => {
    const e = new GameEngine(MISSIONS[0]);
    try {
      for (
        let i = 0;
        i < e.initial * 60 && !e.result && e.phase !== 'failed';
        i++
      )
        e.step(1 / 60, driveInput(e, false, false, true));
      expect(e.phase).toBe('restoring');
      expect(e.traffic.observed).toBeGreaterThanOrEqual(5);
      expect(e.integrity).toBeGreaterThan(70);
    } finally {
      e.dispose();
    }
  });
});
