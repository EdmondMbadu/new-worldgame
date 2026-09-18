import { useEffect, useRef } from 'react';
import { CAMPAIGN_HREF, CLINICS, STORY_DISCLOSURE, type ClinicStory, type StoryScene } from './clinic-stories';
import type { NarrationState } from './narration';
import type { Settings } from './save';
import type { Result } from './engine';
import './clinic-story.css';

type Props = {
  clinic: ClinicStory;
  chapter: number;
  scene: StoryScene;
  settings: Settings;
  narration: NarrationState;
  onVoice: () => void;
  onContinue: () => void;
  onHome: () => void;
  onSettings: () => void;
  onReplay?: () => void;
  onTouch?: () => void;
  touch: boolean;
  ready: boolean;
  loading: string;
  completed: number[];
  result?: Result;
};

export function ClinicStoryView(p: Props) {
  const { clinic, scene, settings, narration, result } = p;
  const opening = scene === 'opening';
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [clinic.id, scene]);
  const voiceOff = !settings.sound || !settings.voice || settings.volume === 0;
  const voiceLabel = voiceOff ? 'Enable story voice' : narration.status === 'playing' || narration.status === 'loading'
    ? 'Pause message' : narration.status === 'ended' ? 'Replay message' : 'Play message';
  const key = (name: string) => settings.keys[name].replace('Key', '').replace('Digit', '');
  const finished = p.completed.length === CLINICS.length;
  const sceneCaption = opening ? 'ILLUSTRATIVE CLINIC & CHARACTER' : 'LATER · THE TEAM COMMISSIONS THE SOLAR ARRAY';
  return (
    <section className={`clinic-story clinic-story--${scene} ${settings.reducedMotion ? 'story-still' : ''}`} aria-labelledby="clinic-story-heading" data-story-scene={scene}>
      {opening && <div className="story-art" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}story/clinic-evening.webp)` }} aria-hidden="true" />}
      <div className="story-shade" aria-hidden="true" />
      <header className="story-header">
        <button className="story-back" onClick={p.onHome} aria-label="Back to chapter map">← <span>LAST LIGHT</span></button>
        <span className="eyebrow">{opening ? `CHAPTER ${String(p.chapter + 1).padStart(2, '0')} / 05` : result?.practice ? 'PRACTICE COMPLETE' : 'CHAPTER COMPLETE'}</span>
        <button className="text-button" onClick={p.onSettings}>Settings</button>
      </header>
      <div className="story-scroll">
        <div className="story-content">
          <span className="story-scene-caption story-scene-caption--mobile">{sceneCaption}</span>
          <p className="story-clinic-name">{clinic.name}</p>
          <h1 id="clinic-story-heading" ref={heading} tabIndex={-1}>{opening ? clinic.headline : result?.practice ? 'A journey well practised.' : finished ? 'A chain of light.' : 'The team can keep caring.'}</h1>
          <p className="story-location">{clinic.location}</p>
          <p className="story-context">{opening ? clinic.context : result?.practice ? 'The kit has reached the team. Start a full delivery when you are ready to record your journey.' : 'The kit has reached the clinic team. Take a breath. Your delivery is complete.'}</p>

          <div className="story-facts" aria-label="Documented clinic project">
            {clinic.capacityKw !== null ? <>
              <div><strong>{clinic.capacityKw.toFixed(1)} <small>kW</small></strong><span>Documented solar project</span></div>
              <div><strong>{clinic.careAreas.length} <small>care areas</small></strong><span>Supported by the real project</span></div>
            </> : <div><strong className="story-stage">Preparing for solar</strong><span>Clinic visited and documented</span></div>}
          </div>

          <div className="story-message" data-narration-status={voiceOff ? 'muted' : narration.status}>
            <div className="story-message-heading"><span className="eyebrow">A MESSAGE FROM THE CLINIC</span><span className="story-voice-credit">{STORY_DISCLOSURE}</span></div>
            {settings.subtitles && <p className="story-transcript">{clinic[scene]}</p>}
            <div className="story-player">
              <button className="story-play" onClick={p.onVoice} disabled={narration.status === 'error'} aria-label={voiceLabel}>
                <span aria-hidden="true">{!voiceOff && narration.status === 'playing' ? 'Ⅱ' : '▶'}</span>
                {narration.status === 'error' ? 'Message unavailable' : voiceLabel}
              </button>
              <div className="story-audio-track" aria-hidden="true"><i style={{ width: `${narration.progress * 100}%` }} /></div>
              {!voiceOff && narration.status === 'loading' && <small>Loading…</small>}
            </div>
            {!settings.subtitles && <details className="story-transcript-toggle"><summary>Read the message</summary><p>{clinic[scene]}</p></details>}
            {narration.status === 'error' && <small className="story-audio-error">You can read the message and continue your journey.</small>}
          </div>

          {!opening && <>
            <div className="story-progress"><span>{p.completed.length} / 5 chapters complete</span><div aria-label={`${p.completed.length} of five chapters complete`}>{CLINICS.map((c, i) => <i key={c.id} className={p.completed.includes(i) ? 'is-complete' : ''} />)}</div></div>
            {result && <details className="story-details"><summary>Your drive <span>{'★'.repeat(result.stars)} · {result.score.toLocaleString()} pts</span></summary><div className="story-score"><span><strong>{Math.round(result.integrity)}%</strong> kit integrity</span><span><strong>{Math.ceil(result.remaining)}s</strong> to spare</span><span><strong>{result.clean || 0}/{result.encounters || 0}</strong> clean passes</span></div><p>{result.mode === 'relaxed' ? 'Relaxed' : 'Standard'} · {result.practice ? 'Practice · no record saved' : 'Delivery recorded'}</p></details>}
          </>}

          <button className="primary story-primary" onClick={p.onContinue} disabled={opening && !p.ready}>
            <span>{opening ? p.ready ? 'Start delivery' : `${p.loading || 'Preparing the road'}…` : result?.practice ? 'Start a full delivery' : p.chapter < 4 ? 'Next clinic' : 'Return to chapter map'}</span><span aria-hidden="true">→</span>
          </button>
          {opening ? <>
            <div className="story-controls" aria-label="Driving controls">
              {p.touch ? <span>Use the steering pad and Drive / Brake pedals.</span> : <><span><kbd>{key('throttle')}</kbd> Drive</span><span><kbd>{key('left')}</kbd><kbd>{key('right')}</kbd> Steer</span><span><kbd>{key('brake')}</kbd> Brake</span><span><kbd>{key('action')}</kbd> Deliver</span></>}
            </div>
            <details className="story-details"><summary>Route & controls <span>Know the road ↗</span></summary><p>{clinic.routeNote}</p><p>Park in the marked courtyard, stop and {settings.singlePress ? 'press' : 'hold'} {key('action')} to deliver. Hold the brake to reverse; use Recover if you get stuck. The clock starts with your first driving input.</p><p>Controller: left stick to steer, right trigger to drive, left trigger to brake, A / × to deliver, Menu to pause. Keyboard arrows also work; Escape pauses.</p><button className="text-button" onClick={p.onTouch}>{p.touch ? 'Hide' : 'Show'} touch controls</button></details>
          </> : <div className="story-links"><button className="text-button" onClick={p.onReplay}>↺ Replay arrival</button><button className="text-button" onClick={p.onHome}>Chapter map ↗</button></div>}
          <details className="story-details story-project"><summary>About the real project</summary><p>{clinic.projectNote}</p>{clinic.careAreas.length > 0 && <p>{clinic.careAreas.join(' · ')}</p>}<a href={CAMPAIGN_HREF} target="_blank" rel="noreferrer">Explore the clinic campaign ↗</a></details>
          <p className="story-footnote">{clinic.stage === 'online' ? 'Re-created journey inspired by a completed project.' : 'A fictional delivery inspired by a real clinic project.'} Game deliveries and real-world outcomes are tracked separately.</p>
        </div>
      </div>
      <span className="story-scene-caption story-scene-caption--desktop">{sceneCaption}</span>
    </section>
  );
}
