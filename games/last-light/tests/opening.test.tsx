import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PerspectiveCamera, Vector3 } from 'three';
import { CameraRig } from '../src/camera-rig';
import { ClinicStoryView } from '../src/ClinicStory';
import { CLINICS } from '../src/clinic-stories';
import { defaultSettings } from '../src/save';

describe('first delivery briefing', () => {
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
});
