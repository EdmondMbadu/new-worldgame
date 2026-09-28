import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARRIVAL, ARRIVAL_CAPTIONS, arrivalShot, stillShot } from '../src/arrival';
import { ArrivalOverlay } from '../src/ArrivalOverlay';
import { CLINICS, HELP } from '../src/clinic-stories';
import { RESTORE_DURATION } from '../src/vehicle';
import { OPENING_BEATS } from '../src/opening-story';

const overlay = (time: number, chapter = 0, still = false) =>
  renderToStaticMarkup(<ArrivalOverlay time={time} clinic={CLINICS[chapter]} still={still} onSkip={() => {}} />);

describe('arrival cinematic', () => {
  it('runs arrival → handover → connection → panels → first light → the real-world fact, in order', () => {
    const shots = [0, 5, 11, 15, 19, 26].map(arrivalShot);
    expect(shots).toEqual(['arrive', 'unload', 'connect', 'panels', 'inside', 'pullback']);
    expect(RESTORE_DURATION).toBe(ARRIVAL.end);
    // Lights follow the connection, the devices follow the lights.
    expect(ARRIVAL.connected).toBeLessThan(ARRIVAL.panels);
    expect(ARRIVAL.lightsOn).toBeGreaterThan(ARRIVAL.firstLight);
    expect(ARRIVAL.devices).toBeGreaterThan(ARRIVAL.lightsOn);
    expect(ARRIVAL.panels + 9 * ARRIVAL.panelStep + 0.55).toBeLessThan(ARRIVAL.firstLight);
  });
  it('offers Skip from the very first frame', () => {
    expect(overlay(0)).toContain('Skip');
    expect(overlay(0)).toContain(ARRIVAL_CAPTIONS.arrive.title);
  });
  it('labels the panel installation as a time-lapse', () => {
    const html = overlay(15);
    expect(html).toContain('THE PANELS');
    expect(html).toContain('Time-lapse');
    expect(html).toContain('several days');
  });
  it.each(CLINICS.map((clinic, chapter) => ({ clinic, chapter })))('closes $clinic.id on its own sourced fact', ({ clinic, chapter }) => {
    const html = overlay(28, chapter);
    expect(html).toContain('real-world fact');
    expect(html).toContain(clinic.fact.title);
    expect(html).toContain('Source:');
    if (clinic.fact.figure) expect(html).toContain(clinic.fact.figure);
  });
  it('lets the camera leave the room before the fact appears', () => {
    const html = overlay(25);
    expect(html).toContain('The clinic is awake.');
    expect(html).not.toContain('real-world fact');
    expect(ARRIVAL.fact).toBeGreaterThan(ARRIVAL.pullBack);
  });
  it('keeps reduced motion to three still frames', () => {
    expect([0, 12, 17, 18, 24, 25].map(stillShot)).toEqual(['arrive', 'arrive', 'arrive', 'inside', 'inside', 'pullback']);
    expect(overlay(3, 0, true)).toContain('arrival--still');
  });
  it('gives the care room its beat before the road', () => {
    expect(OPENING_BEATS.care).toBeLessThan(OPENING_BEATS.road);
  });
});

describe('real-world facts', () => {
  it('gives every clinic one distinct, sourced fact', () => {
    const titles = new Set(CLINICS.map(c => c.fact.title));
    expect(titles.size).toBe(CLINICS.length);
    for (const clinic of CLINICS) {
      expect(clinic.fact.source).toMatch(/Energizing Health \(2023\)/);
      expect(clinic.fact.href).toMatch(/^https:\/\/www\.who\.int\//);
      expect(clinic.fact.body.length).toBeGreaterThan(40);
    }
  });
  it('matches the WHO figures: about half with reliable power, 25,000 with none, nearly a billion people', () => {
    const all = CLINICS.map(c => `${c.fact.figure} ${c.fact.body}`).join(' ');
    expect(all).toContain('25,000');
    expect(all).toContain('about half');
    expect(all).toContain('one billion');
    expect(all).not.toContain('40%');
  });
  it('ends the campaign with the way to help the real team', () => {
    expect(HELP.href).toBe('/campaigns/power-drc-clinics#donate');
    expect(CLINICS[4].fact.title).toContain('power grid');
  });
});
