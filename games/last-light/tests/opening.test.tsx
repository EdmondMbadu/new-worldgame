import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PerspectiveCamera, Vector3 } from 'three';
import { CameraRig } from '../src/camera-rig';
import { ClinicStoryView } from '../src/ClinicStory';
import { CLINICS } from '../src/clinic-stories';
import { defaultSettings } from '../src/save';
import { OPENING_STORIES, openingBeat, OPENING_DURATION } from '../src/opening-story';
import { MISSIONS } from '../src/missions';
import { DriveCoach } from '../src/DriveCoach';
import type { GameEngine } from '../src/engine';

describe('delivery briefings', () => {
  it.each(CLINICS.map((clinic, chapter) => ({ clinic, chapter })))('gives $clinic.id its own story, map and arrow guidance', ({clinic, chapter}) => {
    const html = renderToStaticMarkup(<ClinicStoryView clinic={clinic} chapter={chapter} scene="opening" settings={defaultSettings()}
      narration={{ scene: 'opening', status: 'idle', progress: 0 }} onVoice={() => {}} onContinue={() => {}}
      onHome={() => {}} onSettings={() => {}} touch={false} ready loading="" completed={[]} previewTime={5} />);
    expect(html).toContain(OPENING_STORIES[chapter].careTitle);
    expect(html).toContain(OPENING_STORIES[chapter].emphasis);
    expect(html).toContain(`CHAPTER 0${chapter + 1}`);
    expect(html).toContain(`Your route to ${clinic.shortName}`);
    expect(html).toContain('Hold to drive');
    expect(html).toContain('data-opening-beat="1"');
    expect(html).toContain('Pause animation');
    expect(html).toContain(clinic.stage === 'online' ? 'inspired by a completed solar project' : 'inspired by a real clinic preparing for solar');
    const coach = renderToStaticMarkup(<DriveCoach engine={{ mission: MISSIONS[chapter], phase: 'ready', elapsed: 0, progress: 0 } as GameEngine} touch={false} controller={false} />);
    expect(coach).toContain('Hold ↑ to drive');
    expect(coach).toContain(MISSIONS[chapter].place);
  });
  it('gives the care scene six seconds and ends at the truck', () => {
    expect([0, 2, 8, 12, 16, OPENING_DURATION].map(openingBeat)).toEqual([0, 1, 2, 3, 4, 4]);
  });
  it('keeps the mission, fiction label and controls visible without voice or motion', () => {
    const settings = { ...defaultSettings(), sound: false, subtitles: false, reducedMotion: true };
    settings.keys.throttle = 'KeyI'; settings.keys.left = 'KeyJ'; settings.keys.brake = 'KeyK'; settings.keys.right = 'KeyL';
    const html = renderToStaticMarkup(<ClinicStoryView clinic={CLINICS[0]} chapter={0} scene="opening" settings={settings}
      narration={{ scene: 'opening', status: 'error', progress: 0 }} onVoice={() => {}} onContinue={() => {}}
      onHome={() => {}} onSettings={() => {}} touch={false} ready loading="" completed={[]} previewTime={12} />);
    expect(html).toContain('A dramatized delivery');
    expect(html).toContain('charged battery and solar panels');
    expect(html).toContain('Start delivery');
    expect(html).toContain('Hold to drive');
    expect(html).toContain('I / J / K / L also work.');
    expect(html).not.toContain('WASD also works.');
    expect(html).toContain('data-opening-beat="0"');
    expect(html).not.toContain('Pause animation');
  });
  it('hands a skipped preview straight to the truck without restarting the crane shot', () => {
    const rig = new CameraRig(), camera = new PerspectiveCamera();
    rig.place(new Vector3(100, 70, -200), new Vector3(0, 1, 0), 1, camera);
    rig.finishIntro();
    const position = new Vector3(12, 1, 0);
    rig.update({ dt: 1 / 60, position, heading: 0, speed01: 0, lookAhead: new Vector3(12, 1.7, 10), portrait: false,
      reducedMotion: false, roadPulse: 0, impact: 0, phase: 'ready', groundAt: () => 0 }, camera);
    expect(camera.position.distanceTo(position)).toBeLessThan(10);
    expect(camera.position.z).toBeCloseTo(-8.1);
    expect(camera.position.y).toBeCloseTo(3.8);
  });
  it('cuts between distant story locations without crossing the terrain', () => {
    const rig = new CameraRig(), camera = new PerspectiveCamera();
    rig.place(new Vector3(0, 50, 1200), new Vector3(0, 40, 1210), 1, camera);
    const truckShot = new Vector3(4, 5, -8);
    rig.place(truckShot, new Vector3(0, 1, 0), 1 / 60, camera, true);
    expect(camera.position.distanceTo(truckShot)).toBe(0);
  });
  it('keeps the actual smoothed driving camera above an intervening bank', () => {
    const rig = new CameraRig(), camera = new PerspectiveCamera();
    rig.finishIntro();
    rig.eye.set(-5, 2, -8.1);
    const groundAt = (x: number) => x < -3 ? 9 : 0;
    rig.update({ dt: 1 / 60, position: new Vector3(5, 1, 0), heading: 0, speed01: 0,
      lookAhead: new Vector3(5, 2, 10), portrait: false, reducedMotion: false, roadPulse: 0,
      impact: 0, phase: 'driving', groundAt }, camera);
    expect(camera.position.x).toBeLessThan(-3);
    expect(camera.position.y).toBeGreaterThanOrEqual(groundAt(camera.position.x) + 1.6);
  });
});
