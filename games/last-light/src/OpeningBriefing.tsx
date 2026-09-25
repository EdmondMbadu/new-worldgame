import { useMemo } from 'react';
import type { Mission } from './missions';
import { routePoint } from './routes';
import { branchSections } from './road-sections';
import { CLINICS } from './clinic-stories';
import { OPENING_DURATION, OPENING_STORIES, openingBeat } from './opening-story';
export { OPENING_DURATION, openingBeat } from './opening-story';

/** Uses the selected drive's actual route, including Fresh tracks and its bypasses. */
export function BriefingRoute({ mission }: { mission: Mission }) {
  const paths = useMemo(() => {
    const samples = Array.from({ length: 90 }, (_, i) => routePoint(mission, i * mission.length / 89));
    const minX = Math.min(...samples.map(p => p.x)), maxX = Math.max(...samples.map(p => p.x));
    const point = (station: number, alt = false) => {
      const p = routePoint(mission, station, alt);
      return { x: 18 + station / mission.length * 304, y: 36 + (p.x - minX) / Math.max(1, maxX - minX) * 36 };
    };
    const path = (from: number, to: number, alt = false) => Array.from({ length: 90 }, (_, i) => {
      const p = point(from + (to - from) * i / 89, alt);
      return `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');
    return { main: path(0, mission.length), alternatives: branchSections(mission).map(([a, b]) => path(a, b, true)), start: point(0), end: point(mission.length) };
  }, [mission]);
  return <svg className="briefing-route" viewBox="0 0 340 106" role="img" aria-label={`Your route to ${CLINICS[mission.id].shortName}, with marked bypasses`}>
    {paths.alternatives.map((d, i) => <path key={i} d={d} className="briefing-bypass" />)}
    <path d={paths.main} className="briefing-road-base" />
    <path d={paths.main} pathLength="1" className="briefing-road-trace" />
    <circle cx={paths.start.x} cy={paths.start.y} r="4" className="briefing-start" />
    <circle cx={paths.end.x} cy={paths.end.y} r="7" className="briefing-destination" />
    <path d={`M${paths.end.x - 3},${paths.end.y}h6m-3,-3v6`} stroke="#102a2b" strokeWidth="1.5" />
    <text x="18" y="99">YOUR TRUCK</text><text x="322" y="99" textAnchor="end">{CLINICS[mission.id].shortName.toUpperCase()}</text>
  </svg>;
}

export function OpeningBriefing({ mission, seconds, still, onPause, paused }: {
  mission: Mission; seconds: number; still: boolean; onPause: () => void; paused: boolean;
}) {
  const beat = still ? 0 : openingBeat(seconds);
  const story = OPENING_STORIES[mission.id], clinic = CLINICS[mission.id];
  const beats = [
    { label: 'THE CALL', title: `${story.lead} ${story.emphasis}`, detail: 'A charged battery for tonight. Solar panels for the days ahead.' },
    { label: 'THE CARE', title: story.careTitle, detail: story.careDetail },
    { label: 'THE ROAD', title: story.roadTitle, detail: story.roadDetail },
    { label: 'THE KIT', title: 'Tonight’s power is on your truck.', detail: 'Keep the battery and panels secure. A safe arrival matters more than a fast corner.' },
    { label: 'YOUR TURN', title: `Bring the power to ${clinic.shortName}.`, detail: 'Reach the marked courtyard. Stop safely. Hand over the kit.' },
  ];
  return <aside className="opening-visual" aria-label="Delivery briefing">
    <div className="opening-sequence-top"><span>YOUR DELIVERY · CHAPTER {String(mission.id + 1).padStart(2, '0')}</span>
      {!still && seconds < OPENING_DURATION && <button className="text-button" onClick={onPause}>{paused ? 'Resume animation' : 'Pause animation'}</button>}
    </div>
    <div className="opening-beats" aria-hidden="true">{beats.map((b, i) => <span key={b.label} className={i <= beat ? 'is-active' : ''}><i />{b.label}</span>)}</div>
    <div className="opening-shot-copy" key={beat}>
      <span className="eyebrow">{beats[beat].label}</span><h2>{beats[beat].title}</h2><p>{beats[beat].detail}</p>
    </div>
    <BriefingRoute mission={mission} />
    <p className="opening-visual-caption">{beat < 2 ? 'Dramatized care scene · illustrative people' : 'Your in-game route · fictional delivery'}</p>
  </aside>;
}
