import { expect, it } from 'vitest';
import { GameEngine, emptyInput } from '../src/engine';
import { FlightPilot } from '../qa/pilot';

it('flies every cell home through real movement, then completes another fresh round', () => {
  const engine = new GameEngine();
  for (let round = 0; round < 2; round++) {
    engine.reset();
    const pilot = new FlightPilot(engine);
    let maxCargo = 0,
      steps = 0;
    while (engine.phase === 'playing' && steps++ < 60 * 300) {
      engine.step(1 / 60, pilot.read());
      maxCargo = Math.max(maxCargo, engine.cargo);
      expect(engine.cells.filter((c) => c.state === 'deposited').length).toBe(
        engine.power,
      );
      expect(engine.cells.length).toBe(5);
    }
    expect(
      engine.phase,
      `round ${round}, time ${engine.time}, power ${engine.power}, position ${JSON.stringify(engine.player)}`,
    ).toBe('winning');
    expect(engine.power).toBe(5);
    expect(maxCargo).toBe(2);
    expect(engine.cargo).toBe(0);
    for (let i = 0; i < 300; i++) engine.step(1 / 60, emptyInput());
    expect(engine.phase).toBe('results');
  }
}, 15000);
