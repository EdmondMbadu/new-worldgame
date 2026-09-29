import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  auth: { currentUser: null as any },
  watch: null as any,
  call: vi.fn(),
}));
vi.mock('../src/community-api', () => ({
  auth: mock.auth,
  ready: Promise.resolve(),
  watchAuth: (fn: any) => {
    mock.watch = fn;
    void fn(mock.auth.currentUser);
    return () => {};
  },
  call: mock.call,
}));
const result = {
  mission: 0,
  mode: 'standard' as const,
  variant: 0,
  revision: 6,
  score: 1800,
  stars: 3,
  integrity: 100,
  remaining: 117.5,
  clean: 5,
  encounters: 5,
  lives: 3,
};
const user = (uid: string, verified = true) => ({
  uid,
  emailVerified: verified,
  providerData: [{ providerId: 'password' }],
});
beforeEach(() => {
  vi.resetModules();
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
  vi.stubGlobal('window', new EventTarget());
  mock.auth.currentUser = user('alice');
  mock.watch = null;
  mock.call.mockReset();
  mock.call.mockImplementation(async (name: string, raw: any) => {
    if (name === 'getLastLightAccount')
      return {
        name: 'Bright Heron 42',
        publicId: 'a'.repeat(24),
        best: {},
        hidden: false,
        rankingEnabled: mock.auth.currentUser.emailVerified,
        bestJourneys: {},
        active: null,
      };
    if (name === 'claimLastLightGuest') return { claimed: 0, more: false };
    if (name === 'getLastLightDrives') return { drives: [], nextCursor: null };
    if (name === 'syncLastLightProgress') return { best: {} };
    if (name === 'beginLastLightRun')
      return {
        id: raw.clientRunId,
        secret: 'a'.repeat(48),
        owner: mock.auth.currentUser?.uid || null,
        journeyId: raw.journeyId,
      };
    if (name === 'submitLastLightRun')
      return {
        saved: true,
        eligible: mock.auth.currentUser.emailVerified,
        published: false,
        best: { '0:standard:r6:v0': result },
      };
    return {};
  });
});
afterEach(() => vi.unstubAllGlobals());
async function initialized() {
  const c = await import('../src/community');
  c.initializeCommunity();
  await vi.waitFor(() =>
    expect(c.currentPlayer()?.name).toBe('Bright Heron 42'),
  );
  await c.publishPending();
  return c;
}
describe('account-first synchronization', () => {
  it('never sends signed-in or unverified completions to a device player and honors published:false', async () => {
    mock.auth.currentUser = user('alice', false);
    const c = await initialized();
    c.beginRun(0, 'standard', 0);
    const j = await import('../src/journey');
    await vi.waitFor(() => expect(j.pendingRuns()[0]?.ticket).toBeTruthy());
    c.finishRun(result);
    await vi.waitFor(() =>
      expect(
        mock.call.mock.calls.some(([n]) => n === 'submitLastLightRun'),
      ).toBe(true),
    );
    await vi.waitFor(() => expect(j.pendingRuns()[0]?.saved).toBe(true));
    expect(j.pendingRuns()[0]?.published).toBe(false);
    expect(
      mock.call.mock.calls.some(([n]) => n === 'publishLastLightDrive'),
    ).toBe(false);
    const r = await import('../src/records');
    expect(r.driveHistory('alice')).toHaveLength(1);
    expect(r.driveHistory(null)).toHaveLength(0);
  });
  it('shows a failed visibility change as pending, without claiming public rows were removed', async () => {
    const c = await initialized();
    mock.call.mockImplementationOnce(async () => {
      throw new Error('offline');
    });
    await expect(c.setLeaderboardVisibility(true)).rejects.toThrow();
    expect(c.pendingVisibility()).toBe(true);
    expect(c.leaderboardHidden()).toBe(false);
    await c.setLeaderboardVisibility(true);
    expect(c.pendingVisibility()).toBeNull();
    // The actual server preference is reloaded after submission; mock it on subsequent refreshes.
    expect(
      mock.call.mock.calls.some(
        ([n, p]) =>
          n === 'setLastLightVisibility' &&
          p.accountUid === 'alice' &&
          p.hidden,
      ),
    ).toBe(true);
  });
  it('an account switch does not upload another owner’s pending run', async () => {
    const c = await initialized(),
      j = await import('../src/journey');
    j.updatePending({
      id: crypto.randomUUID(),
      owner: 'alice',
      result,
      ticket: { id: crypto.randomUUID(), secret: 'b'.repeat(48) },
    });
    mock.call.mockClear();
    mock.auth.currentUser = user('bob');
    await mock.watch(mock.auth.currentUser);
    await c.publishPending();
    expect(c.currentPlayer()?.uid).toBe('bob');
    expect(
      mock.call.mock.calls.filter(([n]) => n === 'submitLastLightRun'),
    ).toHaveLength(0);
  });
  it('bounds an unresolved auth/network operation', async () => {
    const c = await import('../src/community');
    await expect(c.deadline(new Promise(() => {}), 5)).rejects.toThrow(
      'timed out',
    );
  });
  it('retains a practice attempt privately without reusing a ranked run or advancing its journey', async () => {
    const c = await initialized(),
      r = await import('../src/records'),
      j = await import('../src/journey');
    c.beginRun(0, 'standard', 0);
    await vi.waitFor(() => expect(j.pendingRuns()[0]?.ticket).toBeTruthy());
    const rankedId = j.pendingRuns()[0].id;
    c.beginPractice();
    c.finishRun({ ...result, practice: true });
    await c.publishPending();
    expect(r.driveHistory('alice')).toHaveLength(1);
    expect(r.driveHistory('alice')[0].id).not.toBe(rankedId);
    expect(r.driveHistory('alice')[0].result.practice).toBe(true);
    expect(r.readActive('alice')?.status).not.toBe('between');
    expect(
      mock.call.mock.calls.some(([name]) => name === 'submitLastLightRun'),
    ).toBe(false);
    expect(r.personalBest('alice', 'standard', 0, 6, 'all').score).toBe(0);
  });
  it('automatically submits a completion that arrives during an earlier sync', async () => {
    const c = await initialized(),
      j = await import('../src/journey');
    c.beginRun(0, 'standard', 0);
    await vi.waitFor(() => expect(j.pendingRuns()[0]?.ticket).toBeTruthy());
    const original = mock.call.getMockImplementation()!;
    let release: (() => void) | undefined;
    let hold = true;
    mock.call.mockImplementation(async (name: string, raw: any) => {
      if (name === 'getLastLightAccount' && hold) {
        hold = false;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return original(name, raw);
    });
    const earlier = c.publishPending();
    await vi.waitFor(() => expect(release).toBeTruthy());
    c.finishRun(result);
    release!();
    await earlier;
    await vi.waitFor(() => expect(j.pendingRuns()[0].saved).toBe(true));
    expect(
      mock.call.mock.calls.filter(([name]) => name === 'submitLastLightRun'),
    ).toHaveLength(1);
  });
  it('persists confirmed nickname choices and can reset to the server account name', async () => {
    const c = await initialized();
    const original = mock.call.getMockImplementation()!;
    mock.call.mockImplementation(async (name, raw) => name === 'saveLastLightName'
      ? { name: raw.useAccountName ? 'Alice Account' : raw.name, nameSource: raw.useAccountName ? 'account' : 'custom', accountName: 'Alice Account' }
      : original(name, raw));
    await c.renamePlayer('Road Driver');
    expect(c.currentPlayer()).toMatchObject({ name:'Road Driver', nameSource:'custom', accountName:'Alice Account' });
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement } = await import('react');
    const { PlayerControls } = await import('../src/CommunityPanel');
    expect(renderToStaticMarkup(createElement(PlayerControls))).toContain('Use account name');
    await c.resetLeaderboardName();
    expect(c.currentPlayer()).toMatchObject({ name:'Alice Account', nameSource:'account' });
    expect(JSON.parse(localStorage.getItem('last-light.profile.alice')!)).toMatchObject({ name:'Alice Account', nameSource:'account' });
    expect(renderToStaticMarkup(createElement(PlayerControls))).toContain('Using account name');
    expect(mock.call.mock.calls.some(([name, raw]) => name === 'saveLastLightName' && raw.accountUid === 'alice' && raw.useAccountName === true)).toBe(true);
    mock.call.mockImplementationOnce(async () => { throw new Error('offline'); });
    await expect(c.renamePlayer('Not Saved')).rejects.toThrow('offline');
    expect(c.currentPlayer()?.name).toBe('Alice Account');
  });
});
