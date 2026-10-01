import { t, getLocale, campaignHref } from './locale';
import { useEffect, useRef } from 'react';
import { CompletionScreen } from './CompletionScreen';
import { CAMPAIGN_HREF, STORY_DISCLOSURE, type ClinicStory, type StoryScene } from './clinic-stories';
import type { NarrationState } from './narration';
import type { Settings } from './save';
import type { Result } from './engine';
import { MISSIONS, type Mission } from './missions';
import { DrivingGuide, keyLabel } from './DrivingGuide';
import { OpeningBriefing, openingBeat } from './OpeningBriefing';
import { OPENING_STORIES } from './opening-story';
import './clinic-story.css';
import type { AccountStatus } from './account-access';

export type ClinicStoryProps = {
  onAuth?: (page: "login" | "signup" | "verify-email") => void;
  handoffError?: string;
  accountStatus?: AccountStatus;
  emailVerified?: boolean;
  onGuestReplay?: () => void;
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

export function ClinicStoryView(p: ClinicStoryProps) {
  return p.scene === 'closing' ? <CompletionScreen {...p} /> : <OpeningStoryView {...p} />;
}

function OpeningStoryView(p: ClinicStoryProps) {
  const { clinic, settings, narration } = p;
  const story = OPENING_STORIES[p.chapter];
  const beat = settings.reducedMotion ? 0 : openingBeat(p.previewTime || 0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [clinic.id]);
  const voiceOff = !settings.sound || !settings.voice || settings.volume === 0;
  const voiceLabel = voiceOff ? 'Enable story voice' : narration.status === 'playing' || narration.status === 'loading'
    ? 'Pause message' : narration.status === 'ended' ? 'Replay message' : 'Play message';
  const key = (name: string) => keyLabel(settings, name);
  const sceneCaption = 'ILLUSTRATIVE CLINIC & CHARACTER';
  return (
    <section className={`clinic-story clinic-story--opening clinic-story--urgent ${settings.reducedMotion ? 'story-still' : ''} ${p.previewPaused ? 'story-preview-paused' : ''}`} aria-labelledby="clinic-story-heading" data-story-scene="opening" data-opening-beat={beat}>
      <div className="story-art" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}story/clinic-evening.webp)` }} aria-hidden="true" />
      <div className="story-shade" aria-hidden="true" />
      <header className="story-header">
        <button className="story-back" onClick={p.onHome} aria-label={t("Back to chapter map")}>← <span>{t("LAST LIGHT")}</span></button>
        <span className="eyebrow">{t(`CHAPTER ${String(p.chapter + 1).padStart(2, '0')} / 05`)}</span>
        <button className="text-button" onClick={p.onSettings}>{t("Settings")}</button>
      </header>
      <OpeningBriefing mission={p.mission || MISSIONS[p.chapter]} seconds={p.previewTime || 0} still={settings.reducedMotion} paused={!!p.previewPaused} onPause={p.onPreviewPause || (() => {})} />
      <div className="story-scroll">
        <div className="story-content">
          <span className="story-scene-caption story-scene-caption--mobile">{t(sceneCaption)}</span>
          <p className="story-clinic-name"><span className="incoming-signal" aria-hidden="true" /> {t(clinic.shortName)}{t(" calling ")}<span className="story-call-tag">{t(narration.status === 'ended' ? 'MESSAGE RECEIVED' : 'INCOMING MESSAGE')}</span></p>
          <p className="story-fiction">{t("A dramatized delivery · ")}{t(clinic.stage === 'online' ? 'inspired by a completed solar project' : 'inspired by a real clinic preparing for solar')}</p>
          <h1 id="clinic-story-heading" ref={heading} tabIndex={-1}>{t(story.lead)} <em>{t(story.emphasis)}</em></h1>
          <p className="story-location">{t(clinic.location)}</p>
          <p className="story-context">{t(story.objective)}</p>

          <div className="story-message" data-narration-status={voiceOff ? 'muted' : narration.status}>
            <div className="story-message-heading"><span className="eyebrow">{t("THE CLINIC TEAM")}</span><span className="story-voice-credit">{t(STORY_DISCLOSURE)}</span></div>
            {settings.subtitles && <p className="story-transcript">{t(clinic.opening)}</p>}
            <div className="story-player">
              <button className="story-play" onClick={p.onVoice}  aria-label={t(voiceLabel)}>
                <span aria-hidden="true">{t(!voiceOff && narration.status === 'playing' ? 'Ⅱ' : '▶')}</span>
                {t(narration.status === 'error' ? 'Retry message' : voiceLabel)}
              </button>
              <div className="story-audio-track" aria-hidden="true"><i style={{ width: `${narration.progress * 100}%` }} /></div>
              {!voiceOff && narration.status === 'loading' && <small>{t("Loading…")}</small>}
            </div>
            {!settings.subtitles && <details className="story-transcript-toggle"><summary>{t("Read the message")}</summary><p>{t(clinic.opening)}</p></details>}
            {narration.status === 'error' && <small className="story-audio-error">{t("You can read the message and continue your journey.")}</small>}
          </div>

          <button className="primary story-primary" onClick={p.onContinue} disabled={!p.ready}>
            <span>{t(p.ready ? 'Start delivery' : `${t(p.loading || 'Preparing the road')}…`)}</span><span aria-hidden="true">→</span>
          </button>
          <p className="story-clock-note">{t("The clock starts when you ")}{t(p.touch ? 'hold Drive' : 'begin to drive')}{t(". Take a moment to get ready.")}</p>
          <DrivingGuide settings={settings} touch={p.touch} />
          <details className="story-details"><summary>{t("Route & controls ")}<span>{t("Know the road ↗")}</span></summary><p>{t(clinic.routeNote)}</p><p>{t("Keep holding ↑ while steering with ← →. Hold ↓ to slow down; keep holding after stopping to reverse. Park in the marked courtyard, stop, then use the Deliver kit button or ")}{t(settings.singlePress ? 'press' : 'hold')} {t(key('action'))}{t(". Use Recover if you get stuck.")}</p><p>{t("Controller: left stick to steer, right trigger to drive, left trigger to brake, A / × to deliver, Menu to pause. Escape pauses on a keyboard.")}</p><button className="text-button" onClick={p.onTouch}>{t(p.touch ? 'Hide' : 'Show')}{t(" touch controls")}</button></details>
          <details className="story-details story-project"><summary>{t("About the real project")}</summary><p>{t(clinic.projectNote)}</p>{clinic.capacityKw !== null && <div className="story-facts"><div><strong>{t(clinic.capacityKw.toLocaleString(getLocale(), { minimumFractionDigits: 1 }))} <small>{t("kW")}</small></strong><span>{t("Documented solar project")}</span></div><div><strong>{clinic.careAreas.length} <small>{t("care areas")}</small></strong><span>{t("Supported by the real project")}</span></div></div>}{clinic.careAreas.length > 0 && <p>{t(clinic.careAreas.map(t).join(' · '))}</p>}<a href={campaignHref("clinics")} target="_blank" rel="noreferrer">{t("Explore the clinic campaign ↗")}</a></details>
          <p className="story-footnote">{t(clinic.stage === 'online' ? 'Re-created journey inspired by a completed project.' : 'A fictional delivery inspired by a real clinic project.')}{t(" Game deliveries and real-world outcomes are tracked separately.")}</p>
        </div>
      </div>
      <span className="story-scene-caption story-scene-caption--desktop">{t(sceneCaption)}</span>
    </section>
  );
}
