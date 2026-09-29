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
  it('loads the account name even when importing guest scores fails', async () => {
    const original = mock.call.getMockImplementation()!;
    mock.call.mockImplementation(async (name, raw) => {
      if (name === 'claimLastLightGuest') throw new Error('guest import offline');
      const reply = await original(name, raw);
      return name === 'getLastLightAccount'
        ? { ...reply, name: 'Edmond Mbadu', nameSource: 'account', accountName: 'Edmond Mbadu' }
        : reply;
    });
    const c = await import('../src/community');
    c.initializeCommunity();
    await vi.waitFor(() => expect(c.currentPlayer()?.name).toBe('Edmond Mbadu'));
    await vi.waitFor(() => expect(mock.call.mock.calls.some(([name]) => name === 'claimLastLightGuest')).toBe(true));
    expect(c.playerDisplayName()).toBe('Edmond Mbadu');
    expect(mock.call.mock.calls.findIndex(([n]) => n === 'getLastLightAccount')).toBeLessThan(
      mock.call.mock.calls.findIndex(([n]) => n === 'claimLastLightGuest'));
  });
  it('uses the authenticated name while offline without replacing an explicit nickname', async () => {
    mock.auth.currentUser = { ...user('alice'), displayName: 'Alice Account' };
    mock.call.mockRejectedValue(new Error('offline'));
    const c = await import('../src/community');
    c.initializeCommunity();
    await vi.waitFor(() => expect(c.currentPlayer()?.name).toBe('Alice Account'));
    expect(c.playerDisplayName()).not.toBe(c.identity().name);
    localStorage.setItem('last-light.profile.bob', JSON.stringify({ name:'Road Friend', nameSource:'custom' }));
    mock.auth.currentUser = { ...user('bob'), displayName:'Bob Account' };
    await mock.watch(mock.auth.currentUser);
    expect(c.playerDisplayName()).toBe('Road Friend');
  });
  it('never substitutes a guest alias for a signed-in account waiting for its name', async () => {
    mock.call.mockRejectedValue(new Error('offline'));
    const c = await import('../src/community');
    c.initializeCommunity();
    await vi.waitFor(() => expect(c.currentPlayer()?.uid).toBe('alice'));
    expect(c.playerDisplayName()).toBe('Your account');
  });
  it('retains a guest nickname offline and retries it after reloading', async () => {
    mock.auth.currentUser = null;
    mock.call.mockRejectedValue(new Error('offline'));
    let c = await import('../src/community');
    c.initializeCommunity();
    await vi.waitFor(() => expect(mock.watch).toBeTypeOf('function'));
    await c.renamePlayer('Ami de la route');
    expect(c.identity()).toMatchObject({ name:'Ami de la route', chosen:true, namePending:true });
    vi.resetModules();
    mock.call.mockResolvedValue({});
    c = await import('../src/community');
    expect(c.identity().name).toBe('Ami de la route');
    c.initializeCommunity();
    await vi.waitFor(() => expect(c.identity().namePending).toBe(false));
    expect(mock.call.mock.calls.some(([n, raw]) => n === 'setLastLightVisibility' && raw.name === 'Ami de la route')).toBe(true);
  });
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

describe('language belongs to the current account',()=>{
  it('keeps the latest rapid switch when an earlier request is still in flight',async()=>{
    const c=await initialized();
    let release!:()=>void;
    mock.call.mockImplementation(async (name:string)=>{
      if(name==='saveLastLightLanguage')await new Promise<void>(resolve=>{release=resolve;});
      return {};
    });
    const first=c.saveLanguagePreference('fr');
    await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
    const second=c.saveLanguagePreference('en');release();await first;
    await vi.waitFor(()=>expect(mock.call.mock.calls.filter(([n])=>n==='saveLastLightLanguage').at(-1)?.[1].language).toBe('en'));
    release();await second;expect(c.currentPlayer()?.language).toBe('en');
    expect(localStorage.getItem('last-light.language-pending.alice')).toBe('null');
  });
  it('retains an offline language choice for retry',async()=>{
    const c=await initialized();mock.call.mockRejectedValue(new Error('offline'));
    await c.saveLanguagePreference('fr');
    expect(localStorage.getItem('last-light.language-pending.alice')).toBe('"fr"');
    mock.call.mockResolvedValue({language:'fr'});await c.saveLanguagePreference('fr');
    expect(c.currentPlayer()?.language).toBe('fr');
  });
});
