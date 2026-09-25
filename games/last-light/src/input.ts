import { emptyInput, type Input } from './engine';
import type { Settings } from './save';
export class Controls {
  device: 'keyboard' | 'controller' = 'keyboard';
  held = new Set<string>();
  touch = emptyInput();
  private previousMenu = false;
  private controllerActive = false;
  private acceptsInput = true;
  private awaitPadRelease = false;
  get enabled() { return this.acceptsInput; }
  set enabled(value: boolean) {
    if (!value) {
      this.clear();
      this.awaitPadRelease = true;
    }
    this.acceptsInput = value;
  }
  constructor(
    public settings: Settings,
    private onPause: (force?: boolean) => void,
  ) {
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.clear);
    window.addEventListener('gamepaddisconnected', this.disconnect);
  }
  private down = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement
    )
      return;
    // A key held across a story/pause boundary must be released and pressed again.
    if (e.repeat && !this.held.has(e.code)) return;
    this.device = 'keyboard';
    if (e.code === 'Escape') {
      if (!e.repeat) this.onPause();
      e.preventDefault();
      return;
    }
    if (
      [
        ...Object.values(this.settings.keys),
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
      ].includes(e.code)
    ) {
      this.held.add(e.code);
      e.preventDefault();
    }
  };
  private up = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };
  private disconnect = () => {
    if (this.controllerActive) {
      this.clear();
      this.onPause(true);
      this.controllerActive = false;
      this.device = 'keyboard';
    }
  };
  clear = () => {
    this.held.clear();
    this.touch = emptyInput();
  };
  sample(): Input {
    if (!this.enabled) { this.clear(); return emptyInput(); }
    const k = this.settings.keys,
      h = this.held;
    const state = {
      steer:
        Number(h.has(k.right) || h.has('ArrowRight')) -
        Number(h.has(k.left) || h.has('ArrowLeft')),
      throttle: Number(h.has(k.throttle) || h.has('ArrowUp')),
      brake: Number(h.has(k.brake) || h.has('ArrowDown') || h.has('Space')),
      action: h.has(k.action),
    };
    state.steer = state.steer || this.touch.steer;
    state.throttle = Math.max(state.throttle, this.touch.throttle);
    state.brake = Math.max(state.brake, this.touch.brake);
    state.action = state.action || this.touch.action;
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    if (pad) {
      if (!this.controllerActive) this.device = 'controller';
      this.controllerActive = true;
      const axis = pad.axes[0] || 0;
      if (this.awaitPadRelease) {
        this.previousMenu = !!pad.buttons[9]?.pressed;
        if (Math.abs(axis) > .12 || (pad.buttons[7]?.value || 0) > .05 ||
          (pad.buttons[6]?.value || 0) > .05 || pad.buttons[0]?.pressed || this.previousMenu)
          return state;
        this.awaitPadRelease = false;
      }
      if (Math.abs(axis) > .12 || (pad.buttons[7]?.value || 0) > .05 || (pad.buttons[6]?.value || 0) > .05 || pad.buttons[0]?.pressed)
        this.device = 'controller';
      if (Math.abs(axis) > 0.12)
        state.steer = ((Math.abs(axis) - 0.12) / 0.88) * Math.sign(axis);
      state.throttle = Math.max(state.throttle, pad.buttons[7]?.value || 0);
      state.brake = Math.max(state.brake, pad.buttons[6]?.value || 0);
      state.action = state.action || !!pad.buttons[0]?.pressed;
      const menu = !!pad.buttons[9]?.pressed;
      if (menu && !this.previousMenu) this.onPause();
      this.previousMenu = menu;
    }
    return state;
  }
  dispose() {
    this.clear();
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
    window.removeEventListener('blur', this.clear);
    window.removeEventListener('gamepaddisconnected', this.disconnect);
  }
}
