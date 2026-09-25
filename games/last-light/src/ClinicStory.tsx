import { useEffect, useRef } from 'react';
import { CAMPAIGN_HREF, CLINICS, STORY_DISCLOSURE, type ClinicStory, type StoryScene } from './clinic-stories';
import type { NarrationState } from './narration';
import type { Settings } from './save';
import type { Result } from './engine';
import { MISSIONS, type Mission } from './missions';
import { DrivingGuide, keyLabel } from './DrivingGuide';
import { OpeningBriefing, openingBeat } from './OpeningBriefing';
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
  mission?: Mission;
  previewTime?: number;
  previewPaused?: boolean;
  onPreviewPause?: () => void;
};

export function ClinicStoryView(p: Props) {
  const { clinic, scene, settings, narration, result } = p;
  const opening = scene === 'opening';
  const urgent = opening && clinic.id === 'ndingi';
  const beat = settings.reducedMotion ? 0 : openingBeat(p.previewTime || 0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [clinic.id, scene]);
  const voiceOff = !settings.sound || !settings.voice || settings.volume === 0;
  const voiceLabel = voiceOff ? 'Enable story voice' : narration.status === 'playing' || narration.status === 'loading'
    ? 'Pause message' : narration.status === 'ended' ? 'Replay message' : 'Play message';
  const key = (name: string) => keyLabel(settings, name);
  const finished = p.completed.length === CLINICS.length;
  const sceneCaption = opening ? 'ILLUSTRATIVE CLINIC & CHARACTER' : 'LATER · THE TEAM COMMISSIONS THE SOLAR ARRAY';
  return (
    <section className={`clinic-story clinic-story--${scene} ${urgent ? 'clinic-story--urgent' : ''} ${settings.reducedMotion ? 'story-still' : ''} ${p.previewPaused ? 'story-preview-paused' : ''}`} aria-labelledby="clinic-story-heading" data-story-scene={scene} data-opening-beat={beat}>
      {opening && <div className="story-art" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}story/clinic-evening.webp)` }} aria-hidden="true" />}
      <div className="story-shade" aria-hidden="true" />
      <header className="story-header">
        <button className="story-back" onClick={p.onHome} aria-label="Back to chapter map">← <span>LAST LIGHT</span></button>
        <span className="eyebrow">{opening ? `CHAPTER ${String(p.chapter + 1).padStart(2, '0')} / 05` : result?.practice ? 'PRACTICE COMPLETE' : 'CHAPTER COMPLETE'}</span>
        <button className="text-button" onClick={p.onSettings}>Settings</button>
      </header>
      {urgent && <OpeningBriefing mission={p.mission || MISSIONS[p.chapter]} seconds={p.previewTime || 0} still={settings.reducedMotion} paused={!!p.previewPaused} onPause={p.onPreviewPause || (() => {})} />}
      <div className="story-scroll">
        <div className="story-content">
          <span className="story-scene-caption story-scene-caption--mobile">{sceneCaption}</span>
          <p className="story-clinic-name">{urgent ? <><span className="incoming-signal" aria-hidden="true" /> Ndingi calling <span className="story-call-tag">{narration.status === 'ended' ? 'MESSAGE RECEIVED' : 'INCOMING MESSAGE'}</span></> : clinic.name}</p>
          {urgent && <p className="story-fiction">A dramatized delivery · inspired by a completed solar project</p>}
          <h1 id="clinic-story-heading" ref={heading} tabIndex={-1}>{urgent ? <>The clinic is on its <em>last reserve.</em></> : opening ? clinic.headline : result?.practice ? 'A journey well practised.' : finished ? 'A chain of light.' : 'The team can keep caring.'}</h1>
          <p className="story-location">{clinic.location}</p>
          <p className="story-context">{urgent ? 'Bring a charged battery and solar panels to Ndingi. Reach the courtyard before the backup power runs out—and keep the kit safe.' : opening ? clinic.context : result?.practice ? 'The kit has reached the team. Start a full delivery when you are ready to record your journey.' : 'The kit has reached the clinic team. Take a breath. Your delivery is complete.'}</p>

          {!opening && <div className="story-facts" aria-label="Documented clinic project">
            {clinic.capacityKw !== null ? <>
              <div><strong>{clinic.capacityKw.toFixed(1)} <small>kW</small></strong><span>Documented solar project</span></div>
              <div><strong>{clinic.careAreas.length} <small>care areas</small></strong><span>Supported by the real project</span></div>
            </> : <div><strong className="story-stage">Preparing for solar</strong><span>Clinic visited and documented</span></div>}
          </div>}

          <div className="story-message" data-narration-status={voiceOff ? 'muted' : narration.status}>
            <div className="story-message-heading"><span className="eyebrow">{urgent ? 'THE CLINIC TEAM' : 'A MESSAGE FROM THE CLINIC'}</span><span className="story-voice-credit">{STORY_DISCLOSURE}</span></div>
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
          {opening && <p className="story-clock-note">The clock starts when you {p.touch ? 'hold Drive' : 'begin to drive'}. Take a moment to get ready.</p>}
          {opening ? <>
            <DrivingGuide settings={settings} touch={p.touch} />
            <details className="story-details"><summary>Route & controls <span>Know the road ↗</span></summary><p>{clinic.routeNote}</p><p>Keep holding ↑ while steering with ← →. Hold ↓ to slow down; keep holding after stopping to reverse. Park in the marked courtyard, stop, then use the Deliver kit button or {settings.singlePress ? 'press' : 'hold'} {key('action')}. Use Recover if you get stuck.</p><p>Controller: left stick to steer, right trigger to drive, left trigger to brake, A / × to deliver, Menu to pause. Escape pauses on a keyboard.</p><button className="text-button" onClick={p.onTouch}>{p.touch ? 'Hide' : 'Show'} touch controls</button></details>
          </> : <div className="story-links"><button className="text-button" onClick={p.onReplay}>↺ Replay arrival</button><button className="text-button" onClick={p.onHome}>Chapter map ↗</button></div>}
          <details className="story-details story-project"><summary>About the real project</summary><p>{clinic.projectNote}</p>{opening && clinic.capacityKw !== null && <div className="story-facts"><div><strong>{clinic.capacityKw.toFixed(1)} <small>kW</small></strong><span>Documented solar project</span></div><div><strong>{clinic.careAreas.length} <small>care areas</small></strong><span>Supported by the real project</span></div></div>}{clinic.careAreas.length > 0 && <p>{clinic.careAreas.join(' · ')}</p>}<a href={CAMPAIGN_HREF} target="_blank" rel="noreferrer">Explore the clinic campaign ↗</a></details>
          <p className="story-footnote">{clinic.stage === 'online' ? 'Re-created journey inspired by a completed project.' : 'A fictional delivery inspired by a real clinic project.'} Game deliveries and real-world outcomes are tracked separately.</p>
        </div>
      </div>
      <span className="story-scene-caption story-scene-caption--desktop">{sceneCaption}</span>
    </section>
  );
}
