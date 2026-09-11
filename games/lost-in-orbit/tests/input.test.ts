import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../src/engine';
import { InputController } from '../src/input';
import { readSaved, save } from '../src/audio';

let win: EventTarget,
  doc: EventTarget & { hidden: boolean },
  engine: GameEngine,
  input: InputController,
  detach: () => void;
function key(type: string, code: string, repeat = false) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { code, repeat });
  win.dispatchEvent(event);
  return event;
}
beforeEach(() => {
  win = new EventTarget();
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  engine = new GameEngine();
  engine.reset();
  input = new InputController(engine, () => {});
  detach = input.attach();
});
afterEach(() => {
  detach();
  vi.unstubAllGlobals();
});

describe('keyboard and touch adapter', () => {
  it('supports WASD, arrows, braking, and one-shot actions', () => {
    expect(key('keydown', 'ArrowUp').defaultPrevented).toBe(true);
    key('keydown', 'KeyD');
    key('keydown', 'Space');
    key('keydown', 'ShiftLeft');
    key('keydown', 'KeyE');
    expect(input.read()).toEqual({
      y: 0,
      x: 1,
      z: -1,
      brake: true,
      boost: true,
      deposit: true,
    });
    expect(input.read()).toEqual({
      y: 0,
      x: 1,
      z: -1,
      brake: true,
      boost: false,
      deposit: false,
    });
    key('keydown', 'ShiftLeft', true);
    expect(input.read().boost).toBe(false);
    key('keyup', 'ArrowUp');
    key('keyup', 'KeyD');
    key('keyup', 'Space');
    expect(input.read().x).toBe(0);
    expect(input.read().z).toBe(0);
    expect(input.read().brake).toBe(false);
  });
  it('allows simultaneous joystick, brake pointers, and boost', () => {
    input.joystick.x = 0.8;
    input.joystick.z = -0.4;
    input.brake(11, true);
    input.brake(22, true);
    input.boost();
    expect(input.read()).toEqual({
      y: 0,
      x: 0.8,
      z: -0.4,
      brake: true,
      boost: true,
      deposit: false,
    });
    input.brake(11, false);
    expect(input.read().brake).toBe(true);
    input.brake(22, false);
    expect(input.read().brake).toBe(false);
    input.clear();
    expect(input.read().x).toBe(0);
  });
  it('clears held keys, joystick and queued actions on blur and requires explicit resume', () => {
    key('keydown', 'KeyW');
    input.joystick.x = 1;
    input.boost();
    win.dispatchEvent(new Event('blur'));
    expect(engine.phase).toBe('paused');
    engine.resume();
    expect(input.read()).toEqual({
      y: 0,
      x: 0,
      z: 0,
      brake: false,
      boost: false,
      deposit: false,
    });
  });
  it('combines keyboard climb, dive and touch altitude, and clears them on pause', () => {
    key('keydown', 'KeyQ');
    expect(input.read().y).toBe(1);
    key('keydown', 'KeyC');
    expect(input.read().y).toBe(0);
    key('keyup', 'KeyQ');
    expect(input.read().y).toBe(-1);
    key('keyup', 'KeyC');
    input.altitude(31, 1);
    input.joystick.x = 1;
    input.brake(32, true);
    expect(input.read()).toMatchObject({ x: 1, y: 1, brake: true });
    input.altitude(31, 0);
    expect(input.read().y).toBe(0);
    input.altitude(33, -1);
    engine.pause();
    engine.resume();
    expect(input.read()).toMatchObject({ x: 0, y: 0, brake: false });
  });
  it('stays paused after a hidden tab becomes visible', () => {
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(engine.phase).toBe('paused');
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(engine.phase).toBe('paused');
    key('keydown', 'Escape');
    expect(engine.phase).toBe('playing');
  });
  it('pauses on pagehide and stays paused on browser back restoration', () => {
    win.dispatchEvent(new Event('pagehide'));
    expect(engine.phase).toBe('paused');
    engine.resume();
    const event = new Event('pageshow');
    Object.assign(event, { persisted: true });
    win.dispatchEvent(event);
    expect(engine.phase).toBe('paused');
  });
  it('removes listeners on teardown and does not intercept menu space presses', () => {
    detach();
    key('keydown', 'KeyW');
    expect(input.read().z).toBe(0);
    detach = input.attach();
    engine.reset('title');
    expect(key('keydown', 'Space').defaultPrevented).toBe(false);
  });
});

it('continues when local storage is unavailable or throws', () => {
  vi.stubGlobal('localStorage', {
    getItem() {
      throw new Error('Storage denied');
    },
    setItem() {
      throw new Error('Storage denied');
    },
  });
  expect(readSaved('best')).toBeNull();
  expect(() => save('muted', 'true')).not.toThrow();
});
