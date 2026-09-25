import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from './engine';

export function DriveCoach({ engine: e, touch, controller }: { engine: GameEngine; touch: boolean; controller: boolean }) {
  const [steered, setSteered] = useState(false), [braked, setBraked] = useState(false), [dismissed, setDismissed] = useState(false);
  const observed = useRef({ elapsed: e.elapsed, steering: 0, braking: 0 });
  const rough = e.mission.sections.find(s => s.kind === 'washout');
  const nearRough = !!rough && e.progress >= rough.z - 105 && e.progress < rough.z + rough.length;
  useEffect(() => {
    const state = observed.current, dt = Math.max(0, Math.min(.25, e.elapsed - state.elapsed));
    state.elapsed = e.elapsed;
    if (e.phase !== 'driving') return;
    if (Math.abs(e.steering) > .08) state.steering += dt;
    if (nearRough && e.braking > .1) state.braking += dt;
    if (state.steering > .4) setSteered(true);
    if (state.braking > .3) setBraked(true);
  }, [e, e.elapsed, e.phase, e.steering, e.braking, nearRough]);
  if (!['ready', 'driving'].includes(e.phase) || dismissed) return null;
  const ready = e.phase === 'ready';
  const brake = nearRough && !braked;
  if (!ready && !brake && (steered || e.progress > 180)) return null;
  const drive = touch ? 'Drive' : controller ? 'the right trigger' : '↑';
  const title = ready ? `Hold ${drive} to drive toward ${e.mission.place}.`
    : brake ? `Hold ${touch ? 'Brake' : controller ? 'the left trigger' : '↓'} to slow before rough ground.`
    : touch ? 'Keep holding Drive. Slide the pad to steer.'
    : controller ? 'Keep driving. Use the left stick to steer.' : 'Keep holding ↑. Use ← → to steer.';
  return <div className={`drive-coach ${ready ? 'drive-coach--ready' : ''}`}>
    <span className="eyebrow">{ready ? 'YOUR DELIVERY STARTS HERE' : brake ? 'ROUGH GROUND AHEAD' : 'FOLLOW THE ROAD'}</span>
    <p role="status">{title}</p>
    {ready ? <small>The reserve clock starts when you drive.</small> : <button className="text-button" onClick={() => setDismissed(true)} aria-label="Hide driving tips">Got it</button>}
  </div>;
}
