import { getLanguage, setLanguage, t, type GameLanguage } from './locale';
import { cleanAccountName, hasCustomPlayerName } from '../../../functions/src/last-light-names';
import { useEffect, useState } from 'react';
import type { Result } from './engine';
import type { DriveSnapshot } from '../../../functions/src/last-light-snapshot';
import {
  claimGuestRuns,
  pendingRuns,
  updatePending,
  discardPending,
  load,
  persist,
  type Pending,
  type Ticket,
} from './journey';
import {
  driveHistory,
  rememberDrive,
  rememberRun,
  hydrateLocalHistory,
  claimLocalHistory,
  clearGuestHistory,
  readActive,
  storeActive,
  removeActive,
  type ActiveJourney,
  type DriveRecord,
} from './records';
import { ROAD_REVISION } from './vehicle';
import { requireClinicAccess } from './account-access';
export type Identity = {
  key: string;
  name: string;
  hidden: boolean;
  chosen?: boolean;
  namePending?: boolean;
  claimedBy?: string;
};
const IDENTITY_KEY = 'last-light.player.v1';
const ADJECTIVES = [
  'Steady',
  'Bright',
  'Careful',
  'Swift',
  'Quiet',
  'Brave',
  'Patient',
  'Golden',
  'Kind',
  'Evening',
  'Gentle',
  'Keen',
];
const NOUNS = [
  'Baobab',
  'Kingfisher',
  'Lantern',
  'Acacia',
  'Heron',
  'Sunbird',
  'Firefly',
  'Palm',
  'River',
  'Ridge',
  'Weaver',
  'Hornbill',
];
export function autoName(random = crypto.getRandomValues(new Uint32Array(3))) {
  return `${ADJECTIVES[random[0] % ADJECTIVES.length]} ${NOUNS[random[1] % NOUNS.length]} ${10 + (random[2] % 90)}`;
}
let identityCache: Identity | null = null;
export function identity(): Identity {
  if (identityCache) return identityCache;
  const saved = load<Identity | null>(IDENTITY_KEY, null);
  if (
    saved &&
    /^[a-f0-9]{64}$/.test(saved.key) &&
    typeof saved.name === 'string' &&
    saved.name
  )
    return (identityCache = saved);
  identityCache = {
    key: [...crypto.getRandomValues(new Uint8Array(32))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
    name: autoName(),
    hidden: false,
  };
  persist(IDENTITY_KEY, identityCache);
  return identityCache;
}
function saveIdentity(value: Identity) {
  identityCache = value;
  persist(IDENTITY_KEY, value);
  update({});
}
export type Player = {
  language?: GameLanguage | null;
  uid: string;
  verified: boolean;
  name: string;
  publicId: string;
  nameSource?: 'account' | 'custom' | 'generated';
  accountName?: string;
  best: Record<string, Result>;
  hidden: boolean;
  rankingEnabled: boolean;
  bestJourneys: Record<
    string,
    { id: string; score: number; completedAt: number }
  >;
  active: ActiveJourney | null;
};
export type CommunityState = {
  status: 'loading' | 'guest' | 'signed-in' | 'unavailable';
  player: Player | null;
  message: string;
  checkpointMessage: string;
  synced: boolean;
};
let state: CommunityState = {
  status: 'loading',
  player: null,
  message: '',
  checkpointMessage: '',
  synced: false,
};
let apiPromise: Promise<typeof import('./community-api')> | undefined;
const listeners = new Set<() => void>();
const update = (patch: Partial<CommunityState>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};
export const api = () => (apiPromise ??= import('./community-api'));
export const currentPlayer = () => state.player;
export const playerDisplayName = (player: Player | null = state.player) =>
  player ? player.name || t('Your account') : identity().name;
export const leaderboardHidden = () =>
  state.player ? state.player.hidden : identity().hidden;
const visibilityKey = (uid: string | null) =>
  `last-light.visibility-pending.${uid || 'guest'}`;
export const pendingVisibility = () =>
  load<boolean | null>(visibilityKey(state.player?.uid || null), null);
export function deadline<T>(promise: Promise<T>, ms = 14000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Online request timed out.')),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
/** Bound module loading, auth readiness and the callable as one operation. */
export function online<T>(name: string, data: unknown = {}): Promise<T> {
  return deadline(
    (async () => {
      const a = await api();
      await a.ready;
      return a.call<T>(name, data);
    })(),
  );
}
const boardChanged = () => window.dispatchEvent(new Event('last-light:board'));
let initialized = false,
  generation = 0;
function acceptAccount(
  player: Player,
  record: Omit<Player, 'uid' | 'verified'>,
) {
  if (state.player?.uid !== player.uid) return;
  const merged = { ...player, ...record };
  const pendingLanguage = load<GameLanguage | null>(`last-light.language-pending.${player.uid}`, null) || load<GameLanguage | null>('last-light.language-pending.guest', null);
  if (pendingLanguage) persist('last-light.language-pending.guest', null);
  if (pendingLanguage) void saveLanguagePreference(pendingLanguage);
  else if (record.language === 'en' || record.language === 'fr') setLanguage(record.language);
  else void saveLanguagePreference(getLanguage());
  persist(`last-light.profile.${player.uid}`, record);
  const local = readActive(player.uid),
    cloud = record.active;
  if (cloud) {
    const server = { ...cloud, owner: player.uid, dirty: false };
    if (
      !local ||
      (!local.dirty && cloud.version >= local.version) ||
      (local.runId === cloud.runId &&
        local.status === cloud.status &&
        cloud.status !== 'driving' &&
        cloud.version >= local.version)
    )
      storeActive(server);
    else if (cloud.version > local.version)
      update({
        checkpointMessage:
          'Another device has a newer journey. Reload it from the chapter map.',
      });
  }
  update({ player: merged, synced: true, message: '' });
}
const migrating = new Map<string, Promise<void>>();
const migrated = new Set<string>();
async function migrateGuestProgress(uid: string): Promise<void> {
  const existing = migrating.get(uid);
  if (existing) return existing;
  if (identity().claimedBy && identity().claimedBy !== uid) return;
  const work = (async () => {
    const me = identity();
    // Device proof is used only to claim guest-owned runs. The server checks
    // their original owners and refuses a second account's claim.
    if (!me.claimedBy || me.claimedBy === uid) {
      hydrateLocalHistory(null);
      let more = true;
      while (more && state.player?.uid === uid) {
        const reply = await online<{ more: boolean; ownerMismatch?: boolean }>(
          'claimLastLightGuest',
          {
            accountUid: uid,
            deviceKey: me.key,
            hidden:
              !me.claimedBy &&
              (me.hidden ||
                load<boolean | null>(visibilityKey(null), null) === true),
          },
        );
        if (reply.ownerMismatch) throw new Error('This device record already belongs to another account.');
        more = reply.more;
      }
      if (state.player?.uid !== uid) return;
      claimGuestRuns(uid);
      if (!claimLocalHistory(uid, false)) throw new Error('Guest progress could not be copied. Enable browser storage and retry.');
      saveIdentity({ ...me, claimedBy: uid });
    }
    const record = await online<Omit<Player, 'uid' | 'verified'>>(
      'getLastLightAccount',
      { accountUid: uid },
    );
    if (state.player?.uid !== uid) return;
    const guestJourney = readActive(null);
    const accountJourney = readActive(uid);
    const unfinished = (journey: ActiveJourney | null) => !!journey && ['driving', 'between'].includes(journey.status);
    if (
      (!me.claimedBy || me.claimedBy === uid) &&
      !unfinished(record.active) &&
      !unfinished(accountJourney) &&
      guestJourney
    ) {
      if (storeActive({ ...guestJourney, owner: uid, version: Math.max(record.active?.version || 0, accountJourney?.version || 0), dirty: true }))
        removeActive(null);
    }
    if (state.player?.uid !== uid) return;
    acceptAccount(state.player, record);
    await syncHistory();
    await syncProgress(
      driveHistory(uid)
        .filter((d) => !d.result.practice)
        .map((d) => d.result)
        .filter((r) => r.revision === ROAD_REVISION)
        .reduce<Result[]>((all, r) => {
          const at = all.findIndex(
            (x) =>
              x.mission === r.mission &&
              x.mode === r.mode &&
              x.variant === r.variant,
          );
          if (at < 0) all.push(r);
          else if (all[at].score < r.score) all[at] = r;
          return all;
        }, []),
    );
    if (state.player?.uid === uid) { clearGuestHistory(); migrated.add(uid); update({}); }
  })().finally(() => { migrating.delete(uid); });
  migrating.set(uid, work);
  return work;
}

/** Offer this only after the device's progress has been claimed by this owner. */
export function guestJourneyConflict(): ActiveJourney | null {
  const uid = state.player?.uid;
  if (!uid || !state.synced || !migrated.has(uid) || identity().claimedBy !== uid) return null;
  const guest = readActive(null), account = readActive(uid);
  return guest && ['driving', 'between'].includes(guest.status) && account && ['driving', 'between'].includes(account.status) && guest.journeyId !== account.journeyId ? guest : null;
}
export function adoptGuestJourney(): boolean {
  const guest = guestJourneyConflict(), uid = state.player?.uid;
  if (!guest || !uid) return false;
  const account = readActive(uid);
  if (!storeActive({ ...guest, owner: uid, version: account?.version || 0, dirty: true })) return false;
  removeActive(null);
  return true;
}

export function initializeCommunity() {
  if (initialized) return;
  initialized = true;
  const authTimer = setTimeout(() => {
    if (state.status === 'loading')
      update({
        status: 'unavailable',
        message: 'Account connection timed out. Your local records are safe.',
      });
  }, 14000);
  void api()
    .then((a) =>
      a.watchAuth(async (user) => {
        clearTimeout(authTimer);
        const request = ++generation;
        if (!user) {
          // A shared browser gets a fresh guest identity after an account claim.
          if (identity().claimedBy) {
            identityCache = null;
            try {
              localStorage.removeItem(IDENTITY_KEY);
            } catch {}
            identity();
          }
          hydrateLocalHistory(null);
          update({
            status: 'guest',
            player: null,
            message: '',
            checkpointMessage: '',
            synced: false,
          });
          void publishPending();
          return;
        }
        const cached = load<Partial<Player>>(
          `last-light.profile.${user.uid}`,
          {},
        );
        const player: Player = {
          name: '',
          publicId: '',
          best: {},
          hidden: false,
          rankingEnabled: false,
          bestJourneys: {},
          active: null,
          ...cached,
          uid: user.uid,
          verified:
            user.emailVerified ||
            user.providerData.some((p) => p.providerId !== 'password'),
        };
        const accountName = cleanAccountName(cached.accountName) || cleanAccountName(user.displayName);
        if (!hasCustomPlayerName(player) && accountName) {
          player.name = accountName;
          player.accountName = accountName;
          player.nameSource = 'account';
        }
        update({
          status: 'signed-in',
          player,
          message: 'Connecting your player record…',
          checkpointMessage: '',
          synced: false,
        });
        hydrateLocalHistory(user.uid);
        // Account identity must not wait for, or depend on, importing guest runs.
        try {
          const record = await online<Omit<Player, 'uid' | 'verified'>>(
            'getLastLightAccount', { accountUid: user.uid },
          );
          if (request !== generation) return;
          acceptAccount(player, record);
          boardChanged();
        } catch (e) {
          if (request !== generation) return;
          update({ message: errorMessage(e) });
        }
        try {
          await migrateGuestProgress(user.uid);
          void publishPending();
        } catch (e) {
          if (request === generation) update({ message: errorMessage(e) });
        }
      }),
    )
    .catch(() =>
      update({
        status: 'unavailable',
        message: 'Accounts are unavailable right now. Local progress is kept.',
      }),
    );
  window.addEventListener('online', () => {
    void refreshAccount();
    void publishPending();
    void flushCheckpoint();
  });
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
export function beginRun(
  mission: number,
  mode: string,
  variant: number,
  journeyId: string = crypto.randomUUID(),
) {
  requireClinicAccess(state.status, mission);
  const run: Pending = {
    id: crypto.randomUUID(),
    owner: state.player?.uid || null,
    journeyId,
  };
  activeRun = run;
  updatePending(run);
  const previous = readActive(run.owner);
  storeActive({
    owner: run.owner,
    runId: run.id,
    journeyId,
    version: previous?.version || state.player?.active?.version || 0,
    savedAt: Date.now(),
    status: 'driving',
    mission,
    mode: mode as 'standard' | 'relaxed',
    variant,
    revision: ROAD_REVISION,
    dirty: true,
    localOnly: true,
  });
  void deadline(
    (async () => {
      const a = await api();
      await a.ready;
      const uid = a.auth.currentUser?.uid || null;
      if (run.owner && uid !== run.owner) throw new Error('Account changed.');
      run.owner = uid;
      run.ticket = await a.call<Ticket>('beginLastLightRun', {
        accountUid: uid,
        clientRunId: run.id,
        journeyId,
        mission,
        mode,
        variant,
        revision: ROAD_REVISION,
      });
      updatePending(run);
      rememberRun(run);
      const local = readActive(uid);
      if (local?.runId === run.id)
        storeActive({ ...local, ticket: run.ticket, localOnly: false });
      if (run.result) void publishPending();
      else void flushCheckpoint();
    })(),
  ).catch((error) => {
    // Authentication failures are policy decisions, never an offline ticket.
    if (['functions/unauthenticated', 'functions/permission-denied'].includes(error?.code)) {
      if (activeRun?.id === run.id) activeRun = null;
      if (readActive(run.owner)?.runId === run.id) removeActive(run.owner);
      discardPending(run.id);
      window.dispatchEvent(new CustomEvent('last-light:account-required', { detail: errorMessage(error) }));
      return;
    }
    run.offline = true;
    updatePending(run);
    rememberRun(run);
  });
}
export function beginPractice(mission = readActive(state.player?.uid || null)?.mission || 0) {
  requireClinicAccess(state.status, mission);
  abandonDrive();
  // A practice attempt gets its own private record, never the ranked ticket or
  // journey of the delivery from which the player entered practice.
  activeRun = {
    id: crypto.randomUUID(),
    owner: state.player?.uid || null,
    offline: true,
  };
}
export function finishRun(result: Result) {
  if (!activeRun) return undefined;
  activeRun.result = result;
  activeRun.completedAt = Date.now();
  // Practice is retained in private history, never in published bests.
  if (!result.practice) updatePending(activeRun);
  rememberRun(activeRun);
  const local = readActive(activeRun.owner);
  if (local?.runId === activeRun.id)
    storeActive({
      ...local,
      snapshot: undefined,
      status: result.practice
        ? 'abandoned'
        : result.mission === 4
          ? 'finished'
          : 'between',
      mission: result.mission + 1,
      savedAt: Date.now(),
      dirty: true,
    });
  void publishPending();
  return activeRun.owner;
}
let publishing = false;
let publishAgain = false;
export async function publishPending() {
  if (['loading', 'unavailable'].includes(state.status)) return;
  if (publishing) {
    publishAgain = true;
    return;
  }
  publishing = true;
  const uid = state.player?.uid || null;
  try {
    if (uid) await syncHistory();
    // A pending opt-out blocks public submissions until acknowledged. Private
    // history has already been saved independently above.
    const pending = load<boolean | null>(visibilityKey(uid), null);
    if (pending !== null) await applyVisibility(pending, uid);
    if (!uid && identity().hidden)
      await online('setLastLightVisibility', {
        hidden: true,
        deviceKey: identity().key,
      });
    if (!uid && identity().namePending) await syncGuestName();
    const runs = pendingRuns().filter(
      (p) =>
        p.owner === uid &&
        p.result &&
        !p.result.practice &&
        p.ticket &&
        !p.saved &&
        !p.rejected,
    );
    for (const p of runs) {
      if ((state.player?.uid || null) !== uid) break;
      try {
        const reply = await online<{
          saved?: boolean;
          eligible?: boolean;
          published: boolean;
          best?: Record<string, Result>;
          bestJourneys?: Player['bestJourneys'];
        }>(uid ? 'submitLastLightRun' : 'publishLastLightDrive', {
          ...p.ticket,
          result: p.result,
          ...(uid
            ? { accountUid: uid }
            : { deviceKey: identity().key, name: identity().name }),
        });
        const next = {
          ...p,
          saved: true,
          eligible: reply.eligible ?? true,
          published: reply.published,
        };
        updatePending(next);
        rememberRun(next);
        if (uid && state.player?.uid === uid && reply.best)
          update({
            player: {
              ...state.player,
              best: reply.best,
              bestJourneys: reply.bestJourneys || state.player.bestJourneys,
            },
          });
        if ((state.player?.uid || null) === uid)
          update({
            message: reply.published
              ? 'Your best score is on the leaderboard.'
              : 'Your drive is saved privately.',
            synced: true,
          });
        boardChanged();
      } catch (e) {
        const code = (e as { code?: string }).code || '';
        if (
          [
            'functions/invalid-argument',
            'functions/already-exists',
            'functions/permission-denied',
          ].includes(code)
        ) {
          updatePending({ ...p, rejected: true });
          rememberRun({ ...p, rejected: true, eligible: false });
          update({
            message:
              'This drive is kept in your history but could not be verified for rankings.',
          });
        } else throw e;
      }
    }
    if (uid && (state.player?.uid || null) === uid) await refreshAccount(false);
  } catch (e) {
    if ((state.player?.uid || null) === uid)
      update({ message: errorMessage(e) });
  } finally {
    publishing = false;
    if (publishAgain) {
      publishAgain = false;
      void publishPending();
    }
  }
}
const historySyncing = new Map<string, Promise<void>>();
export function syncHistory(): Promise<void> {
  const uid = state.player?.uid;
  if (!uid) return Promise.resolve();
  const pending = historySyncing.get(uid);
  if (pending) return pending;
  const syncing = (async () => {
    const waiting = driveHistory(uid).filter((d) => !d.saved);
    for (let i = 0; i < waiting.length; i += 20) {
      if (state.player?.uid !== uid) return;
      const batch = waiting.slice(i, i + 20).map((d) => ({
        ...d,
        result: {
          ...d.result,
          revision: d.result.revision || 1,
          variant: d.result.variant || 0,
        },
      }));
      await online('saveLastLightHistory', { accountUid: uid, drives: batch });
      for (const d of batch) rememberDrive({ ...d, saved: true });
    }
    const page = await online<{ drives: DriveRecord[] }>('getLastLightDrives', {
      accountUid: uid,
    });
    if (state.player?.uid === uid)
      for (const d of page.drives)
        rememberDrive({ ...d, owner: uid, saved: true });
  })().finally(() => {
    historySyncing.delete(uid);
  });
  historySyncing.set(uid, syncing);
  return syncing;
}
async function applyVisibility(hidden: boolean, uid: string | null) {
  await online('setLastLightVisibility', {
    hidden,
    ...(uid ? { accountUid: uid } : { deviceKey: identity().key }),
  });
  persist(visibilityKey(uid), null);
  if ((state.player?.uid || null) !== uid) return;
  if (state.player) {
    const player = { ...state.player, hidden };
    persist(`last-light.profile.${uid}`, player);
    update({ player });
  } else saveIdentity({ ...identity(), hidden });
  boardChanged();
}
export async function setLeaderboardVisibility(hidden: boolean) {
  const uid = state.player?.uid || null;
  persist(visibilityKey(uid), hidden);
  update({});
  await applyVisibility(hidden, uid);
  await publishPending();
}
export async function renamePlayer(raw: string) {
  const name = raw.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} ._'-]{2,28}$/u.test(name))
    throw new Error(
      'Use 2–28 letters, numbers, spaces, dots, hyphens or underscores.',
    );
  const uid = state.player?.uid;
  if (!uid) {
    saveIdentity({ ...identity(), name, chosen: true, namePending: true });
    boardChanged();
    try { await syncGuestName(); }
    catch {
      update({ message: 'Your name is saved on this device. Online updating will retry when connected.' });
    }
    return;
  }
  const naming = await online<{
    name: string;
    nameSource?: Player['nameSource'];
    accountName?: string;
  }>(
    'saveLastLightName', { name, accountUid: uid },
  );
  if (uid && state.player?.uid === uid) {
    const player = {
      ...state.player,
      ...naming,
      name: naming.name || name,
      nameSource: 'custom' as const,
    };
    persist(`last-light.profile.${uid}`, player);
    update({ player });
  }
  boardChanged();
}
async function syncGuestName() {
  const me = identity();
  await online('setLastLightVisibility', {
    name: me.name, hidden: load<boolean | null>(visibilityKey(null), null) ?? me.hidden, deviceKey: me.key,
  });
  if (!state.player && identity().key === me.key && identity().name === me.name) {
    saveIdentity({ ...identity(), namePending: false });
    boardChanged();
  }
}
export async function resetLeaderboardName() {
  const uid = state.player?.uid;
  if (!uid) throw new Error('Sign in to use your account name.');
  const naming = await online<
    Pick<Player, 'name' | 'nameSource' | 'accountName'>
  >('saveLastLightName', { accountUid: uid, useAccountName: true });
  if (state.player?.uid !== uid) return;
  const player = { ...state.player, ...naming };
  persist(`last-light.profile.${uid}`, player);
  update({ player });
  boardChanged();
}
const languageSaves = new Map<string, Promise<void>>();
export async function saveLanguagePreference(language: GameLanguage) {
  const uid = state.player?.uid;
  if (!uid) { persist('last-light.language-pending.guest', language); return; }
  const key = `last-light.language-pending.${uid}`;
  persist(key, language);
  const saving = (languageSaves.get(uid) || Promise.resolve()).then(async () => {
    const wanted = load<GameLanguage | null>(key, null);
    if (!wanted || state.player?.uid !== uid) return;
    try {
      await online('saveLastLightLanguage', { accountUid: uid, language: wanted });
      if (state.player?.uid !== uid || load(key, null) !== wanted) return;
      persist(key, null);
      update({ player: { ...state.player, language: wanted } });
    } catch { /* Retry on account refresh; play stays available. */ }
  });
  languageSaves.set(uid, saving);
  await saving;
  if (languageSaves.get(uid) === saving) languageSaves.delete(uid);
}
export const joinLeaderboard = renamePlayer;
export async function syncProgress(results: Result[]) {
  const uid = state.player?.uid;
  if (!uid) return;
  const data = await online<{ best: Record<string, Result> }>(
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
  return /^(Use |Choose |Verify |This drive|This device|A newer|This saved|Your existing|Too many)/.test(
    message,
  )
    ? message
    : 'Online saving is unavailable. Local records are kept. Retry when connected.';
}
export async function refreshAccount(publish = true) {
  const player = state.player;
  if (!player) {
    if (publish) await publishPending();
    return;
  }
  try {
    const record = await online<Omit<Player, 'uid' | 'verified'>>(
      'getLastLightAccount',
      { accountUid: player.uid },
    );
    acceptAccount(player, record);
    boardChanged();
    if (!identity().claimedBy || driveHistory(null).length) await migrateGuestProgress(player.uid);
    if (publish) await publishPending();
  } catch (e) {
    if (state.player?.uid === player.uid) update({ message: errorMessage(e) });
  }
}
let checkpointSaving: Promise<void> | null = null;
let lastCloudSave = 0;
export function saveDriveCheckpoint(
  snapshot: DriveSnapshot,
  force = false,
): boolean {
  if (!activeRun || activeRun.result || snapshot.practice) return true;
  const owner = activeRun.owner,
    old = readActive(owner);
  const value: ActiveJourney = {
    owner,
    runId: activeRun.id,
    journeyId: activeRun.journeyId || activeRun.id,
    version: old?.version ?? state.player?.active?.version ?? 0,
    savedAt: Date.now(),
    status: 'driving',
    mission: snapshot.mission,
    mode: snapshot.mode,
    variant: snapshot.variant,
    revision: snapshot.revision,
    snapshot,
    ticket: activeRun.ticket,
    dirty: true,
    localOnly: !activeRun.ticket,
  };
  const ok = storeActive(value);
  if (!ok)
    update({
      checkpointMessage:
        'Browser storage is full. Keep this tab open until online saving succeeds.',
    });
  else if (!owner)
    update({ checkpointMessage: 'Checkpoint saved on this device.' });
  if (force || Date.now() - lastCloudSave > 15000) void flushCheckpoint();
  return ok;
}
export function flushCheckpoint(): Promise<void> {
  if (checkpointSaving) return checkpointSaving;
  const uid = state.player?.uid,
    local = uid ? readActive(uid) : null;
  if (
    !uid ||
    !local?.snapshot ||
    !local.ticket ||
    !local.dirty ||
    local.status !== 'driving'
  )
    return Promise.resolve();
  checkpointSaving = (async () => {
    try {
      const reply = await online<{ version: number; savedAt: number }>(
        'saveLastLightJourney',
        {
          accountUid: uid,
          ...local.ticket,
          version: local.version,
          snapshot: local.snapshot,
        },
      );
      lastCloudSave = Date.now();
      const latest = readActive(uid);
      if (
        latest &&
        latest.runId !== local.runId &&
        latest.version === local.version
      )
        storeActive({ ...latest, version: reply.version });
      if (latest?.runId === local.runId) {
        storeActive({
          ...latest,
          version: reply.version,
          dirty: latest.savedAt !== local.savedAt,
        });
        if (state.player?.uid === uid)
          update({
            checkpointMessage:
              latest.savedAt === local.savedAt
                ? 'Checkpoint synced to your account.'
                : 'Newer checkpoint saved on this device.',
          });
      }
    } catch (e) {
      if (state.player?.uid === uid)
        update({ checkpointMessage: errorMessage(e) });
      // Keep the local checkpoint. Never retry an old version as a new one.
    }
  })().finally(() => {
    checkpointSaving = null;
  });
  return checkpointSaving;
}
export async function continueJourney(): Promise<ActiveJourney> {
  const uid = state.player?.uid || null;
  if (uid) await refreshAccount(false);
  let local = readActive(uid);
  const head = state.player?.active;
  if (uid && head && head.version > (local?.version || 0)) {
    local = { ...head, owner: uid, dirty: false };
    storeActive(local);
  }
  if (!local || !['driving', 'between'].includes(local.status))
    throw new Error('No unfinished journey is saved.');
  requireClinicAccess(state.status, local.mission);
  if (local.status === 'between') return local;
  if (uid && !local.localOnly) {
    await flushCheckpoint();
    local = readActive(uid)!;
    try {
      const cloud = await online<ActiveJourney>('resumeLastLightJourney', {
        accountUid: uid,
        version: local.version,
      });
      local = { ...cloud, owner: uid, dirty: false };
      storeActive(local);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (
        code &&
        ![
          'functions/unavailable',
          'functions/deadline-exceeded',
          'functions/internal',
        ].includes(code)
      )
        throw e;
      if (!local.snapshot || !local.ticket) throw e;
      update({
        checkpointMessage:
          'Continuing your local checkpoint. Online sync will retry when connected.',
      });
    }
  }
  activeRun = {
    id: local.runId,
    owner: uid,
    journeyId: local.journeyId,
    ticket: local.ticket,
    offline: !local.ticket,
  };
  updatePending(activeRun);
  return local;
}
export function currentJourneyId() {
  return activeRun?.journeyId;
}
export function abandonDrive() {
  if (!activeRun) return;
  const local = readActive(activeRun.owner),
    uid = activeRun.owner;
  activeRun = null;
  if (!local) return;
  storeActive({
    ...local,
    status: 'abandoned',
    snapshot: undefined,
    dirty: true,
  });
  if (uid)
    void (async () => {
      await checkpointSaving;
      const latest = readActive(uid);
      if (latest?.runId !== local.runId || latest.status !== 'abandoned')
        return;
      try {
        const result = await online<{ version: number }>(
          'discardLastLightJourney',
          { accountUid: uid, version: latest.version },
        );
        if (readActive(uid)?.runId === local.runId)
          storeActive({ ...latest, version: result.version, dirty: false });
      } catch (e) {
        if (state.player?.uid === uid)
          update({ checkpointMessage: errorMessage(e) });
      }
    })();
}
