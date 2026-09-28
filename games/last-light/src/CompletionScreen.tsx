import { useEffect, useRef, useState } from 'react';
import type { ClinicStoryProps } from './ClinicStory';
import { CLINICS, STORY_DISCLOSURE, CAMPAIGN_HREF, HELP } from './clinic-stories';
import { MISSIONS } from './missions';
import { CompletionAccount, InviteFriends, LeaderboardDialog, RealProjectCard } from './CommunityPanel';
import { GameDialog } from './GameDialog';
import './completion.css';

type Panel = 'drive' | 'share' | 'leaderboard' | 'transcript' | null;
const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function CompletionScreen(p: ClinicStoryProps) {
  const { clinic, result, narration, settings } = p;
  const [panel, setPanel] = useState<Panel>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panelTrigger = useRef<HTMLButtonElement | null>(null);
  const openPanel = (next: Panel, trigger: HTMLButtonElement) => { panelTrigger.current = trigger; setPanel(next); };
  const closePanel = () => { setPanel(null); requestAnimationFrame(() => panelTrigger.current?.focus({ preventScroll: true })); };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [clinic.id]);
  const practice = !!result?.practice;
  const nextChapter = practice ? p.chapter : p.chapter + 1;
  const nextClinic = CLINICS[nextChapter];
  const muted = !settings.sound || !settings.voice || settings.volume === 0;
  const playing = !muted && narration.status === 'playing';
  const loading = !muted && narration.status === 'loading';
  const voiceLabel = narration.status === 'error' ? 'Message unavailable' : muted ? 'Enable story voice'
    : playing || loading ? 'Pause message' : narration.status === 'ended' ? 'Replay message' : 'Play message';
  const voiceStatus = narration.status === 'error' ? 'Message unavailable' : muted ? 'Clinic message muted'
    : playing ? 'Clinic message playing' : loading ? 'Loading clinic message…'
    : narration.status === 'ended' ? 'Message complete' : 'Clinic message';
  const progress = Math.min(1, Math.max(0, narration.progress));
  return (
    <section className={`completion-screen${settings.reducedMotion ? ' completion-still' : ''}`}
      aria-labelledby="clinic-story-heading" data-story-scene="closing">
      <div className="completion-shade" aria-hidden="true" />
      <header className="completion-header">
        <button className="completion-back" onClick={p.onHome} aria-label="Back to chapter map">← <span>LAST LIGHT</span></button>
        <div className="completion-progress" aria-label={`${p.completed.length} of five chapters complete`}>
          <span>{p.completed.length} / 5 <span className="completion-chapters-label">chapters</span></span>
          <div aria-hidden="true">{CLINICS.map((c, index) => <i key={c.id} className={p.completed.includes(index) ? 'is-complete' : ''} />)}</div>
        </div>
        <button className="completion-settings" onClick={p.onSettings}><span aria-hidden="true">⚙</span> Settings</button>
      </header>

      <div className="completion-intro">
        <p className="eyebrow">{practice ? 'PRACTICE COMPLETE' : p.completed.length === CLINICS.length ? 'ALL FIVE CLINICS COMPLETE' : 'DELIVERY COMPLETE'}</p>
        <h1 id="clinic-story-heading" ref={heading} tabIndex={-1}>{clinic.shortName}</h1>
        <p>{practice ? 'The kit is safely with the team. Ready for a full delivery?' : 'The kit is safely with the team.'}</p>
        <span className="completion-fiction">In-game clinic · {clinic.stage === 'online' ? 'Inspired by a completed project' : 'Real project preparing for solar'}</span>
        <aside className="completion-fact" aria-label="Real-world fact">
          <span className="eyebrow">WHY IT MATTERS</span>
          <p>{clinic.fact.figure && <strong>{clinic.fact.figure}</strong>}<span>{clinic.fact.title}</span></p>
          <p className="completion-fact-links">
            <a href={clinic.fact.href} target="_blank" rel="noopener noreferrer" title={clinic.fact.source}>Source <span aria-hidden="true">↗</span></a>
            <a href={HELP.href} target="_blank" rel="noopener noreferrer">{p.chapter === CLINICS.length - 1 ? HELP.title : 'How you can help'} <span aria-hidden="true">↗</span></a>
          </p>
        </aside>
      </div>

      <div className="completion-bottom">
        <div className="completion-audio" data-narration-status={muted ? 'muted' : narration.status}>
          {settings.subtitles && !muted && (playing || narration.status === 'paused' && progress > 0 && progress < 1) && <p className="completion-caption">{clinic.closing}</p>}
          <button className="completion-audio-toggle" onClick={p.onVoice} aria-label={voiceLabel} disabled={narration.status === 'error'}>
            <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>
          </button>
          <div className="completion-audio-copy"><span>{voiceStatus}</span><small>{STORY_DISCLOSURE}</small></div>
          <div className="completion-audio-track" role="progressbar" aria-label="Clinic message progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          {narration.duration !== undefined && narration.duration > 0 && <small className="completion-audio-time">{timeLabel(narration.currentTime || 0)} / {timeLabel(narration.duration)}</small>}
          <button className="completion-link" onClick={event => openPanel('transcript', event.currentTarget)}>Transcript</button>
        </div>

        <div className="completion-dock" aria-label="Delivery actions">
          <RealProjectCard compact />
          <div className="completion-drive">
            <div className="completion-score-line">
              {result && <span className="completion-points"><span className="completion-star" aria-label={`${result.stars} of 3 stars`}>★</span> <strong>{result.score.toLocaleString()}</strong> <span>pts</span></span>}
              <button className="completion-link" onClick={event => openPanel('drive', event.currentTarget)}>Drive details <span aria-hidden="true">↗</span></button>
            </div>
            {practice && <small className="completion-practice">Practice · no record saved</small>}
            <div className="completion-social">
              <button onClick={event => openPanel('share', event.currentTarget)}>Share drive <span aria-hidden="true">↗</span></button>
              <button onClick={event => openPanel('leaderboard', event.currentTarget)}>Leaderboard <span aria-hidden="true">↗</span></button>
            </div>
          </div>
          <div className="completion-next">
            <div className="completion-destination">
              <span className="eyebrow">{practice ? 'READY FOR THE FULL ROUTE?' : nextClinic ? `UP NEXT · CHAPTER ${nextChapter + 1}` : 'A CHAIN OF LIGHT'}</span>
              <h2>{nextClinic ? MISSIONS[nextChapter].title : 'Every clinic reached.'}</h2>
              <p>{nextClinic ? nextClinic.shortName : 'Five journeys. One reason to keep going.'}</p>
            </div>
            <div className="completion-next-actions">
              <button className="completion-primary" onClick={p.onContinue}>{practice ? 'Start a full delivery' : nextClinic ? 'Next clinic' : 'Chapter map'} <span aria-hidden="true">→</span></button>
              {nextClinic ? <button className="completion-link" onClick={p.onHome}>Chapter map</button> : <button className="completion-link" onClick={p.onReplay}>Replay arrival</button>}
            </div>
          </div>
        </div>
      </div>

      {panel === 'drive' && <GameDialog title="Your drive" eyebrow={clinic.shortName} onClose={closePanel}>
        {result && <>
          <p className="completion-detail-score"><span aria-label={`${result.stars} of 3 stars`}>{'★'.repeat(result.stars)}{'☆'.repeat(Math.max(0, 3 - result.stars))}</span> {result.score.toLocaleString()} pts</p>
          <dl className="completion-stats">
            <div><dt>Kit integrity</dt><dd>{Math.round(result.integrity)}%</dd></div>
            <div><dt>Time to spare</dt><dd>{Math.ceil(result.remaining)}s</dd></div>
            <div><dt>Clean passes</dt><dd>{result.clean || 0}/{result.encounters || 0}</dd></div>
          </dl>
          <p>{result.mode === 'relaxed' ? 'Relaxed' : 'Standard'} · {practice ? 'Practice · no record saved' : 'Delivery complete'}</p>
          {!practice && p.onAuth && <CompletionAccount result={result} onAuth={p.onAuth} />}
          {p.handoffError && <p role="alert">{p.handoffError}</p>}
        </>}
        <button className="completion-secondary" onClick={p.onReplay}>↺ Replay arrival</button>
        <details className="completion-project-details"><summary>About this clinic</summary>
          <p>{clinic.name} · {clinic.location}</p><p>{clinic.projectNote}</p>
          {clinic.capacityKw !== null ? <p>{clinic.capacityKw.toFixed(1)} kW · {clinic.careAreas.length} care areas supported by the documented project.</p> : <p>Preparing for solar · Clinic visited and documented.</p>}
          <p>Game deliveries and real-world outcomes are tracked separately.</p>
          <a href={CAMPAIGN_HREF} target="_blank" rel="noopener noreferrer">Explore the clinic campaign ↗</a>
        </details>
      </GameDialog>}
      {panel === 'share' && <GameDialog title="Share this journey" eyebrow="A FRIENDLY CHALLENGE" onClose={closePanel}>
        <InviteFriends mission={p.chapter} mode={result?.mode || settings.mode} variant={result?.variant || 0} score={practice ? undefined : result?.score} compact />
      </GameDialog>}
      {panel === 'leaderboard' && <LeaderboardDialog initial={{ mission: p.chapter, mode: result?.mode || settings.mode, variant: result?.variant || 0 }} onClose={closePanel} onPublish={!practice && p.onAuth ? () => setPanel('drive') : undefined} />}
      {panel === 'transcript' && <GameDialog title="A message from the clinic" eyebrow={clinic.shortName} onClose={closePanel}>
        <p className="completion-transcript">{clinic.closing}</p>
        <small>{STORY_DISCLOSURE}</small>
        <button className="completion-secondary" onClick={p.onVoice} disabled={narration.status === 'error'}>{voiceLabel}</button>
      </GameDialog>}
    </section>
  );
}
