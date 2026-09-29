import { t, getLocale } from './locale';
import { useEffect } from 'react';
import { ARRIVAL, ARRIVAL_CAPTIONS, arrivalShot, stillShot } from './arrival';
import type { ClinicStory } from './clinic-stories';

/**
 * Letterboxed captions for the arrival cinematic. Skip is available from the
 * first frame (button, Enter or Escape); the last shot carries the real-world fact.
 */
export function ArrivalOverlay({ time, clinic, still, onSkip }: {
  time: number; clinic: ClinicStory; still: boolean; onSkip: () => void;
}) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onSkip]);
  const shot = still ? stillShot(time) : arrivalShot(time);
  const caption = ARRIVAL_CAPTIONS[shot];
  const fact = clinic.fact;
  const progress = Math.min(1, time / ARRIVAL.end);
  return (
    <div className={`arrival${still ? ' arrival--still' : ''}`} data-arrival-shot={shot}>
      <div className="arrival-bar arrival-bar--top">
        <span className="arrival-chapter">{t(clinic.shortName)}</span>
        <button className="arrival-skip" onClick={onSkip}>{t("Skip ")}<span aria-hidden="true">›</span></button>
      </div>
      <div className="arrival-bar arrival-bar--bottom">
        {shot === 'pullback' && time >= ARRIVAL.fact ? (
          <div className="arrival-caption arrival-fact" key="fact" aria-live="polite">
            <span className="arrival-eyebrow">{t("Why it matters · real-world fact")}</span>
            <div className="arrival-fact-body">
              {t(fact.figure && <strong className="arrival-figure">{t(fact.figure)}</strong>)}
              <div>
                <h2>{t(fact.title)}</h2>
                <p>{t(fact.body)}</p>
              </div>
            </div>
            <small className="arrival-source">{t("Source: ")}{t(fact.source)}</small>
          </div>
        ) : (
          <div className="arrival-caption" key={shot} aria-live="polite">
            <span className="arrival-eyebrow">{t(caption.eyebrow)}</span>
            <h2>{t(caption.title)}</h2>
            <p>{t(caption.detail)}</p>
            {t(caption.note && <small className="arrival-note">{t(caption.note)}</small>)}
          </div>
        )}
        <div className="arrival-progress" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
      </div>
    </div>
  );
}
