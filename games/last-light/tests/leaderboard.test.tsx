import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const calls = vi.hoisted(() => [] as { name: string; data: any }[]);
vi.mock('../src/community-api', () => ({
  ready: Promise.resolve(),
  auth: { currentUser: null },
  watchAuth: (fn: any) => { fn(null); return () => {}; },
  call: async (name: string, data: any) => {
    calls.push({ name, data });
    if (name === 'beginLastLightRun') return { id: data.clientRunId, secret: 'a'.repeat(48), owner: null };
    if (name === 'publishLastLightDrive') return { published: false };
    return { published: true };
  },
}));

const result = { mission: 0, mode: 'standard', variant: 0, revision: 6, score: 1684, stars: 2, integrity: 80, remaining: 60, clean: 4, encounters: 5, lives: 3 } as any;
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  const data: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
  });
  vi.stubGlobal('window', { dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} });
  calls.length = 0;
  vi.resetModules();
});

describe('automatic leaderboard', () => {
  it('gives every device a private key and a friendly public name, kept across visits', async () => {
    const { identity } = await import('../src/community');
    const me = identity();
    expect(me.key).toMatch(/^[a-f0-9]{64}$/);
    expect(me.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
    expect(me.hidden).toBe(false);
    vi.resetModules();
    const again = (await import('../src/community')).identity();
    expect(again).toEqual(me);
  });
  it('publishes a finished delivery with no sign-in and nothing to type', async () => {
    const c = await import('../src/community');
    c.initializeCommunity(); await tick();
    c.beginRun(0, 'standard', 0);
    await tick(); await tick();
    c.finishRun(result);
    for (let i = 0; i < 5; i++) await tick();
    const publish = calls.find((x) => x.name === 'publishLastLightDrive');
    expect(publish).toBeTruthy();
    expect(publish!.data.deviceKey).toBe(c.identity().key);
    expect(publish!.data.name).toBe(c.identity().name);
    expect(publish!.data.result.score).toBe(1684);
    expect(calls.some((x) => x.name === 'submitLastLightRun')).toBe(false);
  });
  it('keeps local personal bests available without assigning an unconfirmed rank', async () => {
    const c = await import('../src/community');
    const { localBest } = await import('../src/CommunityPanel');
    const { updatePending } = await import('../src/journey');
    updatePending({ id: 'r1', owner: null, result });
    updatePending({ id: 'r2', owner: null, result: { ...result, mission: 1, lives: 5, score: 1500 } });
    const { hydrateLocalHistory } = await import('../src/records'); hydrateLocalHistory(null);
    expect(localBest({ mission: 0, mode: 'standard', variant: 0 })).toMatchObject({ name: c.identity().name, score: 1684, chapters: 1 });
    expect(localBest({ mission: 0, mode: 'standard', variant: 0 })).not.toHaveProperty('rank');
    expect(localBest({ mission: 'all', mode: 'standard', variant: 0 })).toMatchObject({ name: c.identity().name, score: 3184, chapters: 2 });
    expect(localBest({ mission: 0, mode: 'relaxed', variant: 0 })).toBeNull();
    updatePending({ id: 'p', owner: null, result: { ...result, mission: 2, practice: true } });
    expect(localBest({ mission: 2, mode: 'standard', variant: 0 })).toBeNull();
  });
  it('retains private records while opting out and tells the server before submitting', async () => {
    const c = await import('../src/community');
    const { localBest, PlayerControls } = await import('../src/CommunityPanel');
    c.initializeCommunity(); await tick();
    await c.setLeaderboardVisibility(true);
    const hide = calls.find((x) => x.name === 'setLastLightVisibility');
    expect(hide!.data).toMatchObject({ hidden: true, deviceKey: c.identity().key });
    const { updatePending } = await import('../src/journey');
    updatePending({ id: 'r1', owner: null, result, ticket: { id: '00000000-0000-4000-8000-000000000001', secret: 'b'.repeat(48) } });
    calls.length = 0;
    await c.publishPending();
    expect(calls[0].name).toBe('setLastLightVisibility');
    const { hydrateLocalHistory } = await import('../src/records'); hydrateLocalHistory(null);
    expect(localBest({ mission: 0, mode: 'standard', variant: 0 })?.score).toBe(1684);
    expect(renderToStaticMarkup(<PlayerControls />)).toContain('Hidden. Your private scores stay saved.');
  });
  it('lets you rename, and rejects names that could hold an email', async () => {
    const c = await import('../src/community');
    await c.renamePlayer('  Mama   Kinshasa ');
    expect(c.identity().name).toBe('Mama Kinshasa');
    expect(calls.find((x) => x.name === 'setLastLightVisibility')!.data.name).toBe('Mama Kinshasa');
    await expect(c.renamePlayer('me@example.com')).rejects.toThrow(/Use 2–28/);
    const { PlayerControls } = await import('../src/CommunityPanel');
    const html = renderToStaticMarkup(<PlayerControls />);
    expect(html).toContain('Edit public name');
    expect(html).toContain('Show me on the leaderboard');
  });
});
