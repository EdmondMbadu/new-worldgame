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
          if (record.name) void publishPending();
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
      if (run.result && state.player?.name) void publishPending();
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
  if (state.player?.name) void publishPending();
  return activeRun.owner;
}
let publishing = false;
export async function publishPending() {
  const player = state.player;
  if (publishing || !player?.name || !player.verified) return;
  publishing = true;
  try {
    const a = await api();
    const runs = pendingRuns().filter(
      (p) => p.owner === player.uid && p.result && !p.published && !p.rejected,
    );
    let saved = 0;
    for (const p of runs) {
      if (state.player?.uid !== player.uid) break;
      if (!p.ticket) continue;
      try {
        await a.call('submitLastLightRun', {
          ...p.ticket,
          result: p.result,
          accountUid: player.uid,
        });
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
          if (state.player?.uid === player.uid)
            update({
              message:
                'An older drive could not be verified for rankings. Your chapter progress is kept; new full deliveries can still qualify.',
            });
          continue;
        }
        throw e;
      }
    }
    if (saved && state.player?.uid === player.uid) {
      update({ message: 'Your score is on the leaderboard.' });
      window.dispatchEvent(new Event('last-light:board'));
    }
  } catch (e) {
    if (state.player?.uid === player.uid) update({ message: errorMessage(e) });
  } finally {
    publishing = false;
  }
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
  return /^(Use |Choose |Verify |This drive|Your existing|Too many)/.test(
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
