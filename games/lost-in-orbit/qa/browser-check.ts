import { FlightPilot } from './pilot';
import type { GameEngine } from '../src/engine';
import type { InputController } from '../src/input';

export function attachFlightCheck(engine: GameEngine, input: InputController) {
  const panel = document.createElement('aside');
  panel.style.cssText =
    'position:fixed;z-index:50;right:12px;top:155px;max-width:260px;padding:12px;background:#0b1425ee;border:1px solid #849ab7;color:white;font:11px monospace;border-radius:8px';
  panel.setAttribute('aria-label', 'Development flight check');
  const button = document.createElement('button');
  button.textContent = 'Run automated rescue';
  button.style.cssText =
    'padding:12px;background:#ffd166;color:#112033;border-radius:6px';
  const output = document.createElement('output');
  output.style.cssText = 'display:block;margin-top:10px;line-height:1.7';
  output.textContent = 'Development only. Flies using normal inputs.';
  const touchButton = document.createElement('button');
  touchButton.textContent = 'Check simultaneous touch input';
  touchButton.style.cssText =
    'display:block;padding:10px;margin-top:8px;background:#21384b;border-radius:6px';
  const keyboardButton = document.createElement('button');
  keyboardButton.textContent = 'Check keyboard and pause';
  keyboardButton.style.cssText = touchButton.style.cssText;
  panel.append(button, touchButton, keyboardButton, output);
  document.body.append(panel);
  let pilot: FlightPilot | null = null,
    timer: ReturnType<typeof setInterval> | undefined;
  let frame = 0,
    measured = 0,
    elapsed = 0,
    lastTime = 0;
  const fpsSamples: number[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const later = (callback: () => void, delay: number) =>
    timeouts.push(setTimeout(callback, delay));
  const measure = (now: number) => {
    if (engine.phase === 'playing') {
      if (lastTime && now - lastTime < 200) {
        elapsed += now - lastTime;
        measured++;
      }
      if (measured >= 60) {
        fpsSamples.push(Math.round((measured * 1000) / elapsed));
        measured = 0;
        elapsed = 0;
      }
    }
    lastTime = now;
    frame = requestAnimationFrame(measure);
  };
  frame = requestAnimationFrame(measure);
  button.onclick = () => {
    if (pilot) {
      pilot = null;
      clearInterval(timer);
      input.clear();
      button.textContent = 'Run automated rescue';
      return;
    }
    if (engine.phase !== 'playing') {
      output.textContent = 'Start or resume a rescue first.';
      return;
    }
    pilot = new FlightPilot(engine);
    button.textContent = 'Stop automated rescue';
    timer = setInterval(() => {
      if (!pilot) return;
      if (engine.phase === 'playing') {
        const intent = pilot.read();
        input.joystick.x = intent.x;
        input.joystick.z = intent.z;
        input.vertical = intent.y ?? 0;
        input.brake(-99, intent.brake);
        if (intent.boost) input.boost();
        if (intent.deposit) input.deposit();
      }
      output.textContent = `${engine.phase} · power ${engine.power}/5 · cargo ${engine.cargo}/2 · ${engine.time.toFixed(1)}s · ${engine.bumps} bumps · FPS ${fpsSamples.slice(-5).join(', ')}`;
      if (engine.phase === 'results') {
        clearInterval(timer);
        pilot = null;
        input.clear();
        button.textContent = 'Run automated rescue';
      }
    }, 50);
  };
  keyboardButton.onclick = () => {
    if (engine.phase !== 'playing') {
      output.textContent = 'Start a rescue first.';
      return;
    }
    const x = engine.player.x,
      y = engine.player.y;
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'KeyD',
        bubbles: true,
        cancelable: true,
      }),
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'KeyQ',
        bubbles: true,
        cancelable: true,
      }),
    );
    later(() => {
      window.dispatchEvent(
        new KeyboardEvent('keyup', { code: 'KeyQ', bubbles: true }),
      );
      const climbed = engine.player.y > y + 0.2;
      window.dispatchEvent(
        new KeyboardEvent('keyup', { code: 'KeyD', bubbles: true }),
      );
      const moved = engine.player.x > x + 0.2;
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }),
      );
      const time = engine.time;
      later(() => {
        output.textContent = `Keyboard moved right: ${moved}. Climbed: ${climbed}. Pause stopped timer: ${engine.time === time}. Held keys cleared: ${input.read().x === 0}.`;
      }, 400);
    }, 650);
  };
  touchButton.onclick = () => {
    const joystick = document.querySelector<HTMLElement>('.joystick'),
      brake = document.querySelector<HTMLElement>('.brake-button');
    if (!joystick || !brake) {
      output.textContent = 'Enable touch controls from the title first.';
      return;
    }
    // Pointer capture requires a native active pointer. Use normal touch adapter inputs for
    // simultaneity/cancellation checks; physical pointer capture is verified separately in browser.
    input.joystick.x = 1;
    input.brake(21, true);
    input.altitude(22, 1);
    const read = input.read();
    input.brake(21, false);
    input.clear();
    const cleared = input.read();
    output.textContent = `Move + climb + brake simultaneous: ${read.x === 1 && read.y === 1 && read.brake}. Cancel clears all: ${cleared.x === 0 && cleared.y === 0 && !cleared.brake}.`;
  };
  return () => {
    pilot = null;
    clearInterval(timer);
    cancelAnimationFrame(frame);
    input.clear();
    timeouts.forEach(clearTimeout);
    panel.remove();
  };
}
