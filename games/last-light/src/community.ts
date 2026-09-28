import { useEffect, useState } from 'react';
import type { Result } from './engine';
import {
  claimGuestRuns,
  pendingRuns,
  updatePending,
  type Pending,
  type Ticket,
} from './journey';
import { ROAD_REVISION } from './vehicle';
import { load, persist } from './journey';

/**
 * Every player is on the leaderboard automatically under a friendly generated
 * name, unless they hide themselves. The private key never leaves this device
 * except to the game's own server, which stores only its hash.
 */
export type Identity = { key: string; name: string; hidden: boolean; chosen?: boolean };
const IDENTITY_KEY = 'last-light.player.v1';
const ADJECTIVES = ['Steady', 'Bright', 'Careful', 'Swift', 'Quiet', 'Brave', 'Patient', 'Golden', 'Kind', 'Evening', 'Gentle', 'Keen'];
const NOUNS = ['Baobab', 'Kingfisher', 'Lantern', 'Acacia', 'Heron', 'Sunbird', 'Firefly', 'Palm', 'River', 'Ridge', 'Weaver', 'Hornbill'];
const pick = <T,>(list: T[], n: number) => list[n % list.length];
export function autoName(random = crypto.getRandomValues(new Uint32Array(3))) {
  return `${pick(ADJECTIVES, random[0])} ${pick(NOUNS, random[1])} ${10 + (random[2] % 90)}`;
}
let identityCache: Identity | null = null;
export function identity(): Identity {
  if (identityCache) return identityCache;
  const saved = load<Identity | null>(IDENTITY_KEY, null);
  if (saved && /^[a-f0-9]{64}$/.test(saved.key) && typeof saved.name === 'string' && saved.name) {
    identityCache = { key: saved.key, name: saved.name, hidden: saved.hidden === true, chosen: saved.chosen === true };
    return identityCache;
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  identityCache = { key: [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''), name: autoName(), hidden: false, chosen: false };
  persist(IDENTITY_KEY, identityCache);
  return identityCache;
}
function saveIdentity(next: Identity) {
  identityCache = next;
  persist(IDENTITY_KEY, next);
  update({});
}
export type Player = {
  uid: string;
  verified: boolean;
  name: string;
  publicId: string;
  best: Record<string, Result>;
};
export type CommunityState = {
  status: 'loading' | 'guest' | 'signed-in' | 'unavailable';
  player: Player | null;
  message: string;
};
let state: CommunityState = { status: 'loading', player: null, message: '' };
let apiPromise: Promise<typeof import('./community-api')> | undefined;
const listeners = new Set<() => void>();
const update = (patch: Partial<CommunityState>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};
export const api = () => (apiPromise ??= import('./community-api'));
export const currentPlayer = () => state.player;
let initialized = false,
  generation = 0;
export function initializeCommunity() {
  if (initialized) return;
  initialized = true;
  void api()
    .then((a) =>
      a.watchAuth(async (user) => {
        const request = ++generation;
        if (!user) {
          update({ status: 'guest', player: null, message: '' });
          void publishPending();
          return;
        }
        const player: Player = {
          uid: user.uid,
          verified:
            user.emailVerified ||
            user.providerData.some((p) => p.providerId !== 'password'),
          name: '',
          publicId: '',
          best: {},
        };
        update({
          status: 'signed-in',
          player,
          message: 'Connecting your player record…',
        });
        try {
          const record = await a.call<Omit<Player, 'uid' | 'verified'>>(
            'getLastLightAccount',
            { accountUid: user.uid },
          );
          if (request !== generation) return;
          update({ player: { ...player, ...record }, message: '' });
          void publishPending();
        } catch {
          if (request === generation)
            update({
              message:
                'Online records are unavailable. Your progress stays on this device.',
            });
        }
      }),
    )
    .catch(() =>
      update({
        status: 'unavailable',
        message: 'Accounts are unavailable right now. You can keep playing.',
      }),
    );
}
export function useCommunity() {
  const [value, setValue] = useState(state);
  useEffect(() => {
    const fn = () => setValue(state);
    listeners.add(fn);
    initializeCommunity();
    setValue(state);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return value;
}
let activeRun: Pending | null = null;
export function beginRun(mission: number, mode: string, variant: number) {
  const run: Pending = {
    id: crypto.randomUUID(),
    owner: state.player?.uid || null,
  };
  activeRun = run;
  updatePending(run);
  void api()
    .then(async (a) => {
      await a.ready;
      run.owner = run.owner || a.auth.currentUser?.uid || null;
      run.ticket = await a.call<Ticket>('beginLastLightRun', {
        accountUid: run.owner,
        mission,
        mode,
        variant,
        revision: ROAD_REVISION,
      });
      run.owner = run.ticket.owner ?? null;
      updatePending(run);
      if (run.result) void publishPending();
    })
    .catch(() => {
      run.offline = true;
      updatePending(run);
    });
}
export function finishRun(result: Result) {
  if (result.practice || !activeRun) return undefined;
  activeRun.result = result;
  updatePending(activeRun);
  void publishPending();
  return activeRun.owner;
}
let publishing = false;
/** Accounts with a public name publish as themselves; everyone else as this device's player. */
const accountReady = (p: Player | null): p is Player => !!p?.name && p.verified;
export async function publishPending() {
  const player = state.player;
  const me = identity();
  if (publishing || me.hidden) return;
  publishing = true;
  try {
    const a = await api();
    await a.ready;
    const account = accountReady(player) ? player : null;
    const uid = a.auth.currentUser?.uid || null;
    const runs = pendingRuns().filter(
      (p) =>
        p.result &&
        p.ticket &&
        !p.published &&
        !p.rejected &&
        (account ? p.owner === account.uid : p.owner === null || p.owner === uid),
    );
    let saved = 0;
    for (const p of runs) {
      if (state.player?.uid !== player?.uid) break;
      try {
        if (account)
          await a.call('submitLastLightRun', { ...p.ticket, result: p.result, accountUid: account.uid });
        else
          await a.call('publishLastLightDrive', { ...p.ticket, result: p.result, deviceKey: me.key, name: me.name });
        updatePending({ ...p, published: true });
        saved++;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (
          [
            'functions/invalid-argument',
            'functions/already-exists',
            'functions/permission-denied',
          ].includes(code || '')
        ) {
          updatePending({ ...p, rejected: true });
          if (state.player?.uid === player?.uid)
            update({
              message:
                'An older drive could not be verified for rankings. Your chapter progress is kept; new full deliveries can still qualify.',
            });
          continue;
        }
        throw e;
      }
    }
    if (saved && state.player?.uid === player?.uid) {
      update({ message: `Your score is on the leaderboard as ${account?.name || me.name}.` });
      window.dispatchEvent(new Event('last-light:board'));
    }
  } catch (e) {
    if (state.player?.uid === player?.uid) update({ message: errorMessage(e) });
  } finally {
    publishing = false;
  }
}
/** Opt out of (or back into) the public leaderboard. Scores are kept either way. */
export async function setLeaderboardVisibility(hidden: boolean) {
  const me = identity();
  saveIdentity({ ...me, hidden });
  const a = await api();
  await a.ready;
  await a.call('setLastLightVisibility', { hidden, deviceKey: me.key, accountUid: a.auth.currentUser?.uid || undefined });
  window.dispatchEvent(new Event('last-light:board'));
  if (!hidden) await publishPending();
}
/** Choose a different public name for this device's player. */
export async function renamePlayer(raw: string) {
  const name = raw.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} ._'-]{2,28}$/u.test(name)) throw new Error('Use 2–28 letters, numbers, spaces, dots, hyphens or underscores.');
  const me = identity();
  saveIdentity({ ...me, name, chosen: true });
  const a = await api();
  await a.ready;
  await a.call('setLastLightVisibility', { hidden: me.hidden, deviceKey: me.key, name });
  window.dispatchEvent(new Event('last-light:board'));
}
export async function joinLeaderboard(name: string) {
  const p = state.player;
  if (!p) throw new Error('Please sign in first.');
  const a = await api(),
    record = await a.call<{ name: string }>('saveLastLightName', {
      name,
      accountUid: p.uid,
    });
  if (state.player?.uid !== p.uid) return;
  claimGuestRuns(p.uid);
  update({
    player: { ...state.player, name: record.name },
    message: 'Player name saved.',
  });
  await publishPending();
}
export async function syncProgress(results: Result[]) {
  const uid = state.player?.uid;
  if (!uid) return;
  const a = await api(),
    data = await a.call<{ best: Record<string, Result> }>(
      'syncLastLightProgress',
      {
        accountUid: uid,
        results: results.filter(
          (r) => r.revision === ROAD_REVISION && !r.practice,
        ),
      },
    );
  if (state.player?.uid === uid)
    update({ player: { ...state.player, best: data.best } });
}
export function errorMessage(e: unknown) {
  const message = e instanceof Error ? e.message : '';
  return /^(Use |Choose |Verify |This drive|This device|Your existing|Too many)/.test(
    message,
  )
    ? message
    : 'Online saving is unavailable. Your drive is saved on this device; use Retry online when connected.';
}

export async function refreshAccount() {
  const player = state.player;
  if (!player) return;
  try {
    const record = await (
      await api()
    ).call<Omit<Player, 'uid' | 'verified'>>('getLastLightAccount', {
      accountUid: player.uid,
    });
    if (state.player?.uid !== player.uid) return;
    update({ player: { ...player, ...record }, message: '' });
    await publishPending();
  } catch (e) {
    if (state.player?.uid === player.uid) update({ message: errorMessage(e) });
  }
}
