import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { Controls } from '../src/input';
import { defaultSettings } from '../src/save';
let events: EventTarget;
let pad: unknown = null;
let controls: Controls;
const key = (type: string, code: string, repeat = false) => {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, { code, repeat });
  events.dispatchEvent(e);
};
beforeEach(() => {
  events = new EventTarget();
  vi.stubGlobal('window', events);
  vi.stubGlobal('HTMLInputElement', class {});
  vi.stubGlobal('HTMLSelectElement', class {});
  vi.stubGlobal('navigator', { getGamepads: () => [pad] });
  pad = null;
  controls = new Controls(defaultSettings(), vi.fn());
});
afterEach(() => {
  controls.dispose();
  vi.unstubAllGlobals();
});
describe('input adapters', () => {
  it('combines steering with accelerator and clears released keys', () => {
    key('keydown', 'KeyW');
    key('keydown', 'KeyD');
    expect(controls.sample()).toMatchObject({ throttle: 1, steer: 1 });
    key('keyup', 'KeyD');
    expect(controls.sample().steer).toBe(0);
    key('keyup', 'KeyW');
    expect(controls.sample().throttle).toBe(0);
  });
  it('supports remapping and arrow-key alternatives', () => {
    controls.settings.keys.throttle = 'KeyI';
    key('keydown', 'KeyW');
    expect(controls.sample().throttle).toBe(0);
    key('keydown', 'KeyI');
    expect(controls.sample().throttle).toBe(1);
    key('keyup', 'KeyI');
    key('keydown', 'ArrowUp');
    expect(controls.sample().throttle).toBe(1);
  });
  it('clears touch and keyboard inputs together on blur', () => {
    key('keydown', 'KeyW');
    controls.touch.steer = -0.7;
    controls.touch.action = true;
    events.dispatchEvent(new Event('blur'));
    expect(controls.sample()).toEqual({
      steer: 0,
      throttle: 0,
      brake: 0,
      action: false,
    });
  });
  it('supports simultaneous touch steering, acceleration and braking', () => {
    controls.touch = { steer: 0.55, throttle: 1, brake: 0.5, action: false };
    expect(controls.sample()).toEqual(controls.touch);
  });
  it('applies gamepad dead zone, triggers and one menu event per press', () => {
    const pause = vi.fn();
    controls.dispose();
    controls = new Controls(defaultSettings(), pause);
    const buttons = Array.from({ length: 10 }, () => ({
      value: 0,
      pressed: false,
    }));
    buttons[7] = { value: 0.8, pressed: true };
    buttons[9] = { value: 1, pressed: true };
    pad = { connected: true, axes: [0.05], buttons };
    expect(controls.sample()).toMatchObject({ steer: 0, throttle: 0.8 });
    controls.sample();
    expect(pause).toHaveBeenCalledTimes(1);
    events.dispatchEvent(new Event('gamepaddisconnected'));
    expect(pause).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenLastCalledWith(true);
  });
});
