import { t, getLocale, campaignHref } from './locale';
import { useEffect, useRef, useState } from 'react';
import type { ClinicStoryProps } from './ClinicStory';
import { CLINICS, STORY_DISCLOSURE, CAMPAIGN_HREF, HELP } from './clinic-stories';
import { MISSIONS } from './missions';
import { CompletionAccount, InviteFriends, LeaderboardDialog, RealProjectCard, YourRank } from './CommunityPanel';
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
  const accountRequired = p.accountStatus === 'guest' && !practice && !!nextClinic;
  const muted = !settings.sound || !settings.voice || settings.volume === 0;
  const playing = !muted && narration.status === 'playing';
  const loading = !muted && narration.status === 'loading';
  const voiceLabel = narration.status === 'error' ? 'Retry message' : muted ? 'Enable story voice'
    : playing || loading ? 'Pause message' : narration.status === 'ended' ? 'Replay message' : 'Play message';
  const voiceStatus = narration.status === 'error' ? 'Retry message' : muted ? 'Clinic message muted'
    : playing ? 'Clinic message playing' : loading ? 'Loading clinic message…'
    : narration.status === 'ended' ? 'Message complete' : 'Clinic message';
  const progress = Math.min(1, Math.max(0, narration.progress));
  return (
    <section className={`completion-screen${settings.reducedMotion ? ' completion-still' : ''}`}
      aria-labelledby="clinic-story-heading" data-story-scene="closing">
      <div className="completion-shade" aria-hidden="true" />
      <header className="completion-header">
        <button className="completion-back" onClick={p.onHome} aria-label={t("Back to chapter map")}>← <span>{t("LET THERE BE LIGHT")}</span></button>
        <div className="completion-progress" aria-label={t(`${p.completed.length} of five chapters complete`)}>
          <span>{p.completed.length} / 5 <span className="completion-chapters-label">{t("chapters")}</span></span>
          <div aria-hidden="true">{CLINICS.map((c, index) => <i key={c.id} className={p.completed.includes(index) ? 'is-complete' : ''} />)}</div>
        </div>
        <button className="completion-settings" onClick={p.onSettings}><span aria-hidden="true">⚙</span>{t(" Settings")}</button>
      </header>

      <div className="completion-intro">
        <p className="eyebrow">{t(practice ? 'PRACTICE COMPLETE' : p.completed.length === CLINICS.length ? 'ALL FIVE CLINICS COMPLETE' : 'DELIVERY COMPLETE')}</p>
        <h1 id="clinic-story-heading" ref={heading} tabIndex={-1}>{t(clinic.shortName)}</h1>
        <p>{t(practice ? 'The kit is safely with the team. Ready for a full delivery?' : 'The kit is safely with the team.')}</p>
        <span className="completion-fiction">{t("In-game clinic · ")}{t(clinic.stage === 'online' ? 'Inspired by a completed project' : 'Real project preparing for solar')}</span>
        <aside className="completion-fact" aria-label={t("Real-world fact")}>
          <span className="eyebrow">{t("WHY IT MATTERS")}</span>
          <p>{t(clinic.fact.figure && <strong>{t(clinic.fact.figure)}</strong>)}<span>{t(clinic.fact.title)}</span></p>
          <p className="completion-fact-links">
            <a href={clinic.fact.href} target="_blank" rel="noopener noreferrer" title={t(clinic.fact.source)}>{t("Source ")}<span aria-hidden="true">↗</span></a>
            <a href={campaignHref()} target="_blank" rel="noopener noreferrer">{t(p.chapter === CLINICS.length - 1 ? HELP.title : 'Contribute $10')} <span aria-hidden="true">↗</span></a>
          </p>
        </aside>
      </div>

      <div className="completion-bottom">
        <div className="completion-audio" data-narration-status={muted ? 'muted' : narration.status}>
          {settings.subtitles && !muted && (playing || narration.status === 'paused' && progress > 0 && progress < 1) && <p className="completion-caption">{t(clinic.closing)}</p>}
          <button className="completion-audio-toggle" onClick={p.onVoice} aria-label={t(voiceLabel)} >
            <span aria-hidden="true">{t(playing ? 'Ⅱ' : '▶')}</span>
          </button>
          <div className="completion-audio-copy"><span>{t(voiceStatus)}</span><small>{t(STORY_DISCLOSURE)}</small></div>
          <div className="completion-audio-track" role="progressbar" aria-label={t("Clinic message progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          {narration.duration !== undefined && narration.duration > 0 && <small className="completion-audio-time">{t(timeLabel(narration.currentTime || 0))} / {t(timeLabel(narration.duration))}</small>}
          <button className="completion-link" onClick={event => openPanel('transcript', event.currentTarget)}>{t("Transcript")}</button>
        </div>

        <div className="completion-dock" aria-label={t("Delivery actions")}>
          <RealProjectCard compact />
          <div className="completion-drive">
            <div className="completion-score-line">
              {result && <span className="completion-points"><span className="completion-star" aria-label={t(`${result.stars} of 3 stars`)}>★</span> <strong>{t(result.score.toLocaleString(getLocale()))}</strong> <span>{t("pts")}</span></span>}
              {result && <YourRank mission={p.chapter} mode={result.mode || settings.mode} variant={result.variant || 0} practice={practice} />}
              <button className="completion-link" onClick={event => openPanel('drive', event.currentTarget)}>{t("Drive details ")}<span aria-hidden="true">↗</span></button>
            </div>
            {practice && <small className="completion-practice">{t("Practice · no record saved")}</small>}
            <div className="completion-social">
              <button onClick={event => openPanel('share', event.currentTarget)}>{t("Invite 10 friends ")}<span aria-hidden="true">↗</span></button>
              <button onClick={event => openPanel('leaderboard', event.currentTarget)}>{t("Leaderboard ")}<span aria-hidden="true">↗</span></button>
            </div>
          </div>
          <div className="completion-next">
            <div className="completion-destination">
              <span className="eyebrow">{t(practice ? 'READY FOR THE FULL ROUTE?' : nextClinic ? `UP NEXT · CHAPTER ${nextChapter + 1}` : 'A CHAIN OF LIGHT')}</span>
              <h2>{t(nextClinic ? MISSIONS[nextChapter].title : 'Every clinic reached.')}</h2>
              <p>{t(nextClinic ? nextClinic.shortName : 'Five journeys. One reason to keep going.')}</p>
            </div>
            <div className="completion-next-actions">
              {accountRequired && <p className="completion-account-note">{t('Your delivery is complete. Create a free account to save your score and continue to the other four clinics.')}</p>}
              <button className="completion-primary" disabled={p.accountStatus === 'loading'} onClick={accountRequired && p.onAuth ? () => p.onAuth!('signup') : p.onContinue}>{t(accountRequired ? 'Create account and continue' : practice ? 'Start a full delivery' : nextClinic ? 'Next clinic' : 'Chapter map')} <span aria-hidden="true">→</span></button>
              {accountRequired && <div className="completion-account-links"><button className="completion-link" onClick={() => p.onAuth?.('login')}>{t('Already have an account? Log in')}</button><button className="completion-link" onClick={p.onGuestReplay}>{t('Replay the first delivery')}</button></div>}
              {p.accountStatus === 'signed-in' && !p.emailVerified && <p className="completion-account-note">{t('Keep playing. Verify your email to join the leaderboard.')} <button className="completion-link" onClick={() => p.onAuth?.('verify-email')}>{t('Verify email')}</button></p>}
              {nextClinic ? <button className="completion-link" onClick={p.onHome}>{t("Chapter map")}</button> : <button className="completion-link" onClick={p.onReplay}>{t("Replay arrival")}</button>}
            </div>
          </div>
        </div>
      </div>

      {panel === 'drive' && <GameDialog title={t("Your drive")} eyebrow={clinic.shortName} onClose={closePanel}>
        {result && <>
          <p className="completion-detail-score"><span aria-label={t(`${result.stars} of 3 stars`)}>{t('★'.repeat(result.stars))}{t('☆'.repeat(Math.max(0, 3 - result.stars)))}</span> {t(result.score.toLocaleString(getLocale()))}{t(" pts")}</p>
          <dl className="completion-stats">
            <div><dt>{t("Kit integrity")}</dt><dd>{Math.round(result.integrity)}%</dd></div>
            <div><dt>{t("Time to spare")}</dt><dd>{Math.ceil(result.remaining)}{t("s")}</dd></div>
            <div><dt>{t("Clean passes")}</dt><dd>{result.clean || 0}/{result.encounters || 0}</dd></div>
          </dl>
          <p>{t(result.mode === 'relaxed' ? 'Relaxed' : 'Standard')} · {t(practice ? 'Practice · no record saved' : 'Delivery complete')}</p>
          {!practice && p.onAuth && <CompletionAccount result={result} onAuth={p.onAuth} />}
          {t(p.handoffError && <p role="alert">{t(p.handoffError)}</p>)}
        </>}
        <button className="completion-secondary" onClick={p.onReplay}>{t("↺ Replay arrival")}</button>
        <details className="completion-project-details"><summary>{t("About this clinic")}</summary>
          <p>{clinic.name} · {t(clinic.location)}</p><p>{t(clinic.projectNote)}</p>
          {clinic.capacityKw !== null ? <p>{t(clinic.capacityKw.toFixed(1))}{t(" kW · ")}{clinic.careAreas.length}{t(" care areas supported by the documented project.")}</p> : <p>{t("Preparing for solar · Clinic visited and documented.")}</p>}
          <p>{t("Game deliveries and real-world outcomes are tracked separately.")}</p>
          <a href={campaignHref("clinics")} target="_blank" rel="noopener noreferrer">{t("Explore the clinic campaign ↗")}</a>
        </details>
      </GameDialog>}
      {panel === 'share' && <GameDialog title={t("Invite 10 friends")} eyebrow="A FRIENDLY CHALLENGE" onClose={closePanel}>
        <InviteFriends mission={p.chapter} mode={result?.mode || settings.mode} variant={result?.variant || 0} score={practice ? undefined : result?.score} compact />
      </GameDialog>}
      {panel === 'leaderboard' && <LeaderboardDialog initial={{ mission: p.chapter, mode: result?.mode || settings.mode, variant: result?.variant || 0 }} onClose={closePanel} onPublish={!practice && p.onAuth ? () => setPanel('drive') : undefined} />}
      {panel === 'transcript' && <GameDialog title={t("A message from the clinic")} eyebrow={clinic.shortName} onClose={closePanel}>
        <p className="completion-transcript">{t(clinic.closing)}</p>
        <small>{t(STORY_DISCLOSURE)}</small>
        <button className="completion-secondary" onClick={p.onVoice} >{t(voiceLabel)}</button>
      </GameDialog>}
    </section>
  );
}
