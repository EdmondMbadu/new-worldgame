import type { Settings } from './save';

export const keyLabel = (settings: Settings, name: string) =>
  settings.keys[name].replace('Key', '').replace('Digit', '');

export function DrivingGuide({ settings, touch }: { settings: Settings; touch: boolean }) {
  const standard = settings.keys.throttle === 'KeyW' && settings.keys.brake === 'KeyS' &&
    settings.keys.left === 'KeyA' && settings.keys.right === 'KeyD';
  return <div className="driving-guide" aria-label="Driving controls">
    {touch ? <>
      <div className="guide-touch" aria-hidden="true">← ↑ →</div>
      <div><strong>Hold Drive to go.</strong><p>Slide the steering pad left or right. Hold Brake to stop.</p></div>
    </> : <>
      <div className="arrow-pad" aria-hidden="true"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></div>
      <div className="guide-legend">
        <span><b>↑</b> Hold to drive</span><span><b>← →</b> Steer left / right</span><span><b>↓</b> Slow down / stop</span>
        <small>{standard ? 'WASD also works.' : `${keyLabel(settings, 'throttle')} / ${keyLabel(settings, 'left')} / ${keyLabel(settings, 'brake')} / ${keyLabel(settings, 'right')} also work.`}</small>
      </div>
    </>}
  </div>;
}
