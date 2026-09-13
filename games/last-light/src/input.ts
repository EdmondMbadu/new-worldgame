import { emptyInput, type Input } from './engine';
import type { Settings } from './save';
export class Controls {
  held = new Set<string>();
  touch = emptyInput();
  private previousMenu = false;
  private controllerActive = false;
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
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement
    )
      return;
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
    }
  };
  clear = () => {
    this.held.clear();
    this.touch = emptyInput();
  };
  sample(): Input {
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
      this.controllerActive = true;
      const axis = pad.axes[0] || 0;
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
