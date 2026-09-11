import {
  GameEngine,
  distance,
  emptyInput,
  type Input,
  type Vec2,
} from '../src/engine';

// Test pilot: issues movement/brake/boost/deposit inputs only. It never edits game state.
export class FlightPilot {
  private path: Vec2[] = [];
  private nextPlan = 0;
  private targetId = -2;
  private goal: Vec2 = { x: 0, z: 3.8 };
  constructor(private engine: GameEngine) {}
  read(): Input {
    const g = this.engine,
      p = g.player;
    if (g.phase !== 'playing') return emptyInput();
    const cells = g.cells
      .filter((c) => c.state === 'floating' || c.state === 'dropped')
      .sort((a, b) => distance(p, a) - distance(p, b));
    const target =
      g.cargo === 2 || (!cells.length && g.cargo) ? undefined : cells[0];
    const id = target?.id ?? -1;
    this.goal = target
      ? { x: target.x, y: target.y, z: target.z }
      : { x: 0, y: 0, z: 3.8 };
    if (id !== this.targetId || g.time >= this.nextPlan) {
      this.path = this.plan(this.goal);
      this.targetId = id;
      this.nextPlan = g.time + 0.35;
    }
    while (this.path.length > 1 && distance(p, this.path[0]) < 1.4)
      this.path.shift();
    let waypoint = this.path[0] ?? this.goal;
    for (const candidate of this.path) {
      if (this.clearLine(p, candidate)) waypoint = candidate;
      else break;
    }
    const dx = waypoint.x - p.x,
      dz = waypoint.z - p.z,
      length = Math.hypot(dx, dz);
    const goalDistance = Math.hypot(p.x - this.goal.x, p.z - this.goal.z);
    const speed = Math.min(5.5, goalDistance * 2.4);
    const vx = (dx / Math.max(length, 0.01)) * speed,
      vz = (dz / Math.max(length, 0.01)) * speed;
    let x = ((vx - p.vx) * 4 + p.vx * 1.4) / 16;
    let z = ((vz - p.vz) * 4 + p.vz * 1.4) / 16;
    const inputLength = Math.max(1, Math.hypot(x, z));
    x /= inputLength;
    z /= inputLength;
    const dy = (this.goal.y ?? 0) - p.y;
    const desiredVy = Math.max(-4, Math.min(4, dy * 2.5));
    const y = Math.max(
      -1,
      Math.min(1, ((desiredVy - p.vy) * 4 + p.vy * 1.4) / 14),
    );
    return {
      y,
      x,
      z,
      brake: goalDistance < 2.2 && Math.hypot(p.vx, p.vz) > speed + 0.5,
      boost: length > 10 && goalDistance > 11 && p.cooldown === 0,
      deposit: g.cargo > 0 && g.docking && id === -1,
    };
  }
  private safe(p: Vec2, margin = 1.5) {
    return (
      Math.abs(p.x) < 38 &&
      Math.abs(p.z) < 28 &&
      Math.hypot(p.x, p.z) > 3.25 &&
      this.engine.asteroids.every(
        (a) =>
          distance({ ...p, y: this.engine.player.y }, a) > a.radius + margin,
      )
    );
  }
  private clearLine(a: Vec2, b: Vec2) {
    const steps = Math.ceil(distance(a, b) / 0.6);
    for (let i = 1; i <= steps; i++)
      if (
        !this.safe({
          x: a.x + ((b.x - a.x) * i) / steps,
          z: a.z + ((b.z - a.z) * i) / steps,
        })
      )
        return false;
    return true;
  }
  private plan(goal: Vec2): Vec2[] {
    const start = this.engine.player;
    if (this.clearLine(start, goal)) return [goal];
    const key = (x: number, z: number) => `${x},${z}`;
    const pos = (s: string): Vec2 => {
      const [x, z] = s.split(',').map(Number);
      return { x, z };
    };
    const startKey = key(
      Math.round(start.x / 2) * 2,
      Math.round(start.z / 2) * 2,
    );
    const endKey = key(Math.round(goal.x / 2) * 2, Math.round(goal.z / 2) * 2);
    const open = new Set([startKey]),
      closed = new Set<string>();
    const cost = new Map([[startKey, 0]]),
      from = new Map<string, string>();
    const score = new Map([[startKey, distance(start, goal)]]);
    for (let tries = 0; open.size && tries < 1300; tries++) {
      let current = '';
      let best = Infinity;
      for (const node of open)
        if ((score.get(node) ?? Infinity) < best) {
          best = score.get(node)!;
          current = node;
        }
      if (current === endKey) {
        const route = [goal];
        let trace: string | undefined = current;
        while (trace && trace !== startKey) {
          route.unshift(pos(trace));
          trace = from.get(trace);
        }
        return route;
      }
      open.delete(current);
      closed.add(current);
      const p = pos(current);
      for (const dx of [-2, 0, 2])
        for (const dz of [-2, 0, 2]) {
          if (!dx && !dz) continue;
          const next = { x: p.x + dx, z: p.z + dz },
            nextKey = key(next.x, next.z);
          if (
            closed.has(nextKey) ||
            !this.safe(next) ||
            (dx &&
              dz &&
              (!this.safe({ x: p.x + dx, z: p.z }) ||
                !this.safe({ x: p.x, z: p.z + dz })))
          )
            continue;
          const tentative = cost.get(current)! + Math.hypot(dx, dz);
          if (tentative >= (cost.get(nextKey) ?? Infinity)) continue;
          from.set(nextKey, current);
          cost.set(nextKey, tentative);
          score.set(nextKey, tentative + distance(next, goal));
          open.add(nextKey);
        }
    }
    return [];
  }
}
