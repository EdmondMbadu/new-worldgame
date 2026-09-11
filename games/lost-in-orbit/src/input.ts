import { emptyInput, type GameEngine, type Input } from './engine';

const GAME_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'KeyE',
  'KeyQ',
  'KeyC',
]);

export class InputController {
  private keys = new Set<string>();
  private brakePointers = new Set<number>();
  private altitudePointers = new Map<number, number>();
  vertical = 0;
  private queuedBoost = false;
  private queuedDeposit = false;
  joystick = { x: 0, z: 0 };
  constructor(
    private engine: GameEngine,
    private gesture: () => void,
  ) {}
  clear = () => {
    this.keys.clear();
    this.brakePointers.clear();
    this.altitudePointers.clear();
    this.vertical = 0;
    this.joystick.x = 0;
    this.joystick.z = 0;
    this.queuedBoost = false;
    this.queuedDeposit = false;
  };
  boost = () => {
    this.queuedBoost = true;
    this.gesture();
  };
  deposit = () => {
    this.queuedDeposit = true;
    this.gesture();
  };
  brake(id: number, down: boolean) {
    if (down) this.brakePointers.add(id);
    else this.brakePointers.delete(id);
  }
  altitude(id: number, direction: number) {
    if (direction) this.altitudePointers.set(id, direction);
    else this.altitudePointers.delete(id);
  }
  read(): Input {
    if (this.engine.phase !== 'playing') {
      this.clear();
      return emptyInput();
    }
    const held = (a: string, b: string) =>
      this.keys.has(a) || this.keys.has(b) ? 1 : 0;
    const result = {
      y:
        (this.keys.has('KeyQ') ? 1 : 0) -
        (this.keys.has('KeyC') ? 1 : 0) +
        [...this.altitudePointers.values()].reduce((a, b) => a + b, 0) +
        this.vertical,
      x:
        held('KeyD', 'ArrowRight') -
        held('KeyA', 'ArrowLeft') +
        this.joystick.x,
      z: held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp') + this.joystick.z,
      brake: this.keys.has('Space') || this.brakePointers.size > 0,
      boost: this.queuedBoost,
      deposit: this.queuedDeposit,
    };
    this.queuedBoost = false;
    this.queuedDeposit = false;
    return result;
  }
  attach() {
    const keydown = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && !event.repeat) {
        this.clear();
        if (this.engine.phase === 'paused') {
          this.gesture();
          this.engine.resume();
        } else this.engine.pause();
      }
      if (
        this.engine.phase !== 'playing' ||
        !GAME_KEYS.has(event.code) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      this.keys.add(event.code);
      if (
        !event.repeat &&
        (event.code === 'ShiftLeft' || event.code === 'ShiftRight')
      )
        this.boost();
      if (!event.repeat && event.code === 'KeyE') this.deposit();
    };
    const keyup = (event: KeyboardEvent) => {
      this.keys.delete(event.code);
    };
    const suspend = () => {
      this.clear();
      this.engine.pause();
    };
    const visibility = () => {
      if (document.hidden) suspend();
    };
    const pageShow = (event: PageTransitionEvent) => {
      if (event.persisted) suspend();
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', suspend);
    window.addEventListener('pagehide', suspend);
    window.addEventListener('pageshow', pageShow);
    document.addEventListener('visibilitychange', visibility);
    const unsubscribe = this.engine.subscribe(() => {
      if (this.engine.phase !== 'playing') this.clear();
    });
    return () => {
      this.clear();
      unsubscribe();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', suspend);
      window.removeEventListener('pagehide', suspend);
      window.removeEventListener('pageshow', pageShow);
      document.removeEventListener('visibilitychange', visibility);
    };
  }
}
