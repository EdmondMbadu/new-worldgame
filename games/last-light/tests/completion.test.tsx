import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClinicStoryView, type ClinicStoryProps } from '../src/ClinicStory';
import { CompletionAccount } from '../src/CommunityPanel';
import { CLINICS } from '../src/clinic-stories';
import { MISSIONS } from '../src/missions';
import { defaultSettings } from '../src/save';
import type { CommunityState } from '../src/community';

const community = vi.hoisted(() => ({ value: { status: 'guest', player: null, message: '', checkpointMessage: '', synced: false } as CommunityState }));
vi.mock('../src/community', async importOriginal => ({
  ...await importOriginal<typeof import('../src/community')>(),
  useCommunity: () => community.value,
}));

function props(chapter = 1): ClinicStoryProps {
  return {
    clinic: CLINICS[chapter], chapter, scene: 'closing', settings: defaultSettings(),
    narration: { scene: 'closing', status: 'ended', progress: 1, currentTime: 12, duration: 12 },
    onVoice() {}, onContinue() {}, onHome() {}, onSettings() {}, onReplay() {}, onAuth() {},
    touch: false, ready: true, loading: '', completed: Array.from({ length: chapter + 1 }, (_, i) => i),
    result: { mission: chapter, mode: 'standard', score: 1510, stars: 1, integrity: 33, remaining: 152, lives: 1, clean: 10, encounters: 14 },
  };
}
const render = (p: ClinicStoryProps) => renderToStaticMarkup(<ClinicStoryView {...p} />);

describe('compact delivery completion', () => {
  it.each([0, 1, 2, 3])('leads chapter %i to the correct next clinic without burying the real team', chapter => {
    const html = render(props(chapter));
    expect(html).toContain(CLINICS[chapter].shortName);
    expect(html).toContain(`UP NEXT · CHAPTER ${chapter + 2}`);
    expect(html).toContain(MISSIONS[chapter + 1].title);
    expect(html).toContain(CLINICS[chapter + 1].shortName);
    expect(html).toContain('Next clinic');
    expect(html).toContain('/assets/campaigns/drc-clinics/team/team-portrait.jpg');
    expect(html).toContain('/campaigns/power-drc-clinics?source=last-light&amp;amount=10&amp;lang=en#team');
    expect(html).toContain('/campaigns/power-drc-clinics?source=last-light&amp;amount=10&amp;lang=en#donate');
    expect(html).toContain('1,510');
    expect(html).toContain('Drive details');
    expect(html).toContain('Invite 10 friends');
    expect(html).toContain('Leaderboard');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Find a player');
    expect(html).not.toContain('Public player name');
  });
  it.each([0, 1, 2, 3, 4])('keeps chapter %i’s real-world fact and a way to help beside the result', chapter => {
    const html = render(props(chapter));
    expect(html).toContain('WHY IT MATTERS');
    expect(html).toContain(CLINICS[chapter].fact.title);
    expect(html).toContain(CLINICS[chapter].fact.href.replace(/&/g, '&amp;'));
    expect(html).toContain(chapter === 4 ? 'Here’s how you can help our real-world team' : 'Contribute $10');
  });
  it('returns to the map after the final chapter without inventing a sixth destination', () => {
    const html = render(props(4));
    expect(html).toContain('ALL FIVE CLINICS COMPLETE');
    expect(html).toContain('Every clinic reached.');
    expect(html).toContain('Chapter map');
    expect(html).not.toContain('Next clinic');
    expect(html).not.toContain('UP NEXT');
  });
  it('keeps practice on the current route and does not imply a published score', () => {
    const p = props(3);
    p.result!.practice = true;
    p.completed = [0, 1, 2];
    const html = render(p);
    expect(html).toContain('PRACTICE COMPLETE');
    expect(html).toContain('Practice · no record saved');
    expect(html).toContain('Start a full delivery');
    expect(html).toContain(MISSIONS[3].title);
    expect(html).not.toContain('UP NEXT');
    expect(html).not.toContain('4 of five chapters complete');
  });
  it('honors the transcript setting while voice plays, with a readable fallback for unavailable audio', () => {
    const p = props();
    p.narration = { scene: 'closing', status: 'playing', progress: .5, currentTime: 6, duration: 12 };
    let html = render(p);
    expect(html).toContain(CLINICS[1].closing);
    expect(html).toContain('Pause message');
    expect(html).toContain('0:06 / 0:12');
    p.settings.subtitles = false;
    html = render(p);
    expect(html).not.toContain(CLINICS[1].closing);
    expect(html).toContain('Transcript');
    p.narration.status = 'error';
    html = render(p);
    expect(html).toContain('Retry message');
    expect(html).toContain('Transcript');
    expect(html).toContain('Next clinic');
    p.settings.sound = false;
    p.narration.status = 'paused';
    expect(render(p)).toContain('Enable story voice');
  });
});

describe('account controls inside drive details', () => {
  beforeEach(() => { community.value = { status: 'guest', player: null, message: '', checkpointMessage: '', synced: false }; });
  const account = () => renderToStaticMarkup(<CompletionAccount result={props().result!} onAuth={() => {}} />);
  it('keeps guest continuation and account handoff available without duplicate panels', () => {
    const html = account();
    expect(html).toContain('Create an account');
    expect(html).toContain('Log in');
    expect(html).toContain('saved on this device');
    expect(html).not.toContain('THE REAL PROJECT');
    expect(html).not.toContain('Challenge link');
  });
  it('retains verification without requiring a public-name form', () => {
    community.value = { status: 'signed-in', player: { uid: 'test', verified: false, name: '', publicId: '', best: {}, hidden: false, rankingEnabled: false, bestJourneys: {}, active: null }, message: '', checkpointMessage: '', synced: false };
    expect(account()).toContain('Verify email');
    expect(account()).not.toContain('Public player name');
    community.value.player!.verified = true;
    expect(account()).not.toContain('Public player name');
    community.value.player!.name = 'Driver';
    expect(account()).toContain('Your delivery, Driver');
    expect(account()).not.toContain('Public player name');
  });
  it('keeps offline results honest and makes online saving retryable', () => {
    community.value = { status: 'signed-in', player: { uid: 'test', verified: true, name: 'Driver', publicId: 'test', best: {}, hidden: false, rankingEnabled: false, bestJourneys: {}, active: null }, message: 'Online records are unavailable. Your progress stays on this device.', checkpointMessage: '', synced: false };
    const html = account();
    expect(html).toContain('Retry online saving');
    expect(html).toContain('saved on this device');
    expect(html).not.toContain('Your best eligible delivery is on the leaderboard');
  });
});
