import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { validateSnapshot, type DriveSnapshot } from './last-light-snapshot';
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import {
  bracket,
  validateDrive,
  mergeBest,
  boardKey,
  driveKey,
  publicName,
  eligibleOwner,
  elapsedDrive,
  guestKey,
  boardsFor,
  Drive,
} from './last-light-core';
const db = () => admin.firestore();
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const fail = (
  code: functions.https.FunctionsErrorCode,
  text: string,
): never => {
  throw new functions.https.HttpsError(code, text);
};
const user = (c: functions.https.CallableContext, raw?: any) => {
  const uid =
    c.auth?.uid ||
    fail('unauthenticated', 'Sign in to save your player record.');
  if (raw?.accountUid && raw.accountUid !== uid)
    fail(
      'permission-denied',
      'The signed-in account changed. Return to your own player record.',
    );
  return uid;
};
const isVerified = (c: functions.https.CallableContext) =>
  !!c.auth &&
  (!!c.auth.token.email_verified ||
    !['password', 'anonymous', 'custom', undefined].includes(
      c.auth.token.firebase?.sign_in_provider,
    ));
const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const playerRef = (uid: string) => db().collection('lastLightPlayers').doc(uid);
function generatedName(uid: string) {
  const h = hash(uid);
  return `${['Steady', 'Bright', 'Careful', 'Kind'][parseInt(h.slice(0, 2), 16) % 4]} ${['Heron', 'Lantern', 'Baobab', 'Sunbird'][parseInt(h.slice(2, 4), 16) % 4]} ${10 + (parseInt(h.slice(4, 8), 16) % 90)}`;
}
function accountDisplayName(profile: admin.firestore.DocumentData = {}) {
  // Use the same fields as the site's account page. Never derive a name from email.
  const name = [profile.firstName, profile.lastName]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .trim()
    .replace(/\s+/g, ' ');
  return name && !/[<>@]/.test(name) ? [...name].slice(0, 160).join('') : '';
}
async function playerName(
  tx: admin.firestore.Transaction,
  uid: string,
  player: admin.firestore.DocumentData,
  useAccountName = false,
) {
  const accountName = accountDisplayName(
    (await tx.get(db().collection('users').doc(uid))).data(),
  );
  // Before nameSource existed, only the deterministic default can safely be
  // recognized as generated. Preserve every other existing player name.
  const custom =
    !useAccountName &&
    (player.nameSource === 'custom' ||
      (!player.nameSource &&
        player.name &&
        player.name !== generatedName(uid)));
  return {
    name:
      custom && player.name ? player.name : accountName || generatedName(uid),
    nameSource:
      custom && player.name ? 'custom' : accountName ? 'account' : 'generated',
    accountName,
  };
}
function checkTicket(raw: any, run: any, uid: string | null) {
  if (
    !run ||
    !/^[a-f0-9]{48}$/.test(raw?.secret || '') ||
    !timingSafeEqual(
      Buffer.from(run.secretHash, 'hex'),
      Buffer.from(hash(raw.secret), 'hex'),
    )
  )
    fail(
      'permission-denied',
      'This drive was continued elsewhere or cannot be claimed.',
    );
  if (run.owner && run.owner !== uid)
    fail('permission-denied', 'This drive belongs to another player.');
}
const sortKey = (at: number, id: string) =>
  `${String(9999999999999 - at).padStart(13, '0')}:${id}`;
function checked<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    return fail(
      'invalid-argument',
      e instanceof Error ? e.message : 'Invalid request.',
    );
  }
}
function collectionBoard(b: string) {
  return db().collection('lastLightBoards').doc(b).collection('players');
}
const rankKey = (score: number, id: string) =>
  `${String(10000 - score).padStart(5, '0')}:${id}`;
/** Guests are keyed by a private device key; only its hash is stored. */
const guestId = (key: string) => `guest_${hash(`guest:${key}`).slice(0, 40)}`;
const publicIdOf = (playerId: string) => hash(playerId).slice(0, 24);
/** Writes (or rewrites) every leaderboard row for a player's published drives. */
function writeRows(
  tx: admin.firestore.Transaction,
  publicId: string,
  name: string,
  published: Record<string, Drive>,
) {
  const row = {
    id: publicId,
    name,
    searchName: name.toLocaleLowerCase('en'),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const boards = boardsFor(published);
  for (const { board, drive } of boards.chapters)
    tx.set(collectionBoard(board).doc(publicId), {
      ...row,
      score: drive.score,
      chapters: 1,
      rankKey: rankKey(drive.score, publicId),
    });
  for (const { board, score, chapters } of boards.overall)
    tx.set(collectionBoard(board).doc(publicId), {
      ...row,
      score,
      chapters,
      rankKey: rankKey(score, publicId),
    });
}
function deleteRows(
  tx: admin.firestore.Transaction,
  publicId: string,
  published: Record<string, Drive>,
) {
  const boards = boardsFor(published);
  for (const { board } of [...boards.chapters, ...boards.overall])
    tx.delete(collectionBoard(board).doc(publicId));
}
async function limit(
  c: functions.https.CallableContext,
  kind: string,
  maximum: number,
) {
  const hour = Math.floor(Date.now() / 3600000);
  const id = hash(
    `${kind}:${c.auth?.uid || c.rawRequest.ip || 'unknown'}:${hour}`,
  );
  const ref = db().collection('lastLightLimits').doc(id);
  await db().runTransaction(async (tx) => {
    const count = (await tx.get(ref)).data()?.count || 0;
    if (count >= maximum)
      fail(
        'resource-exhausted',
        'Too many requests. Please try again later; you can keep playing.',
      );
    tx.set(ref, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis((hour + 2) * 3600000),
    });
  });
}
export const beginLastLightRun = functions.https.onCall(async (raw, c) => {
  if (raw?.accountUid) user(c, raw);
  const b = checked(() => bracket(raw));
  await limit(c, 'runs', 120);
  const journeyId = uuid(raw?.journeyId) ? raw.journeyId : randomUUID();
  const id = uuid(raw?.clientRunId) ? raw.clientRunId : randomUUID(),
    secret = randomBytes(24).toString('hex');
  const ref = db().collection('lastLightRuns').doc(id);
  await db().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists)
      fail('already-exists', 'This drive already has a record.');
    tx.set(ref, {
      ...b,
      journeyId,
      secretHash: hash(secret),
      owner: c.auth?.uid || null,
      claimedBy: null,
      issuedAt: Date.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000),
    });
  });
  return { id, secret, owner: c.auth?.uid || null, journeyId };
});
export const getLastLightAccount = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw);
  await limit(c, 'account', 240);
  return db().runTransaction(async (tx) => {
    const ref = playerRef(uid),
      p = (await tx.get(ref)).data() || {};
    const active =
      (await tx.get(ref.collection('state').doc('current'))).data() || null;
    const naming = await playerName(tx, uid, p),
      { name } = naming,
      rankingEnabled = isVerified(c);
    tx.set(
      ref,
      { ...naming, hidden: !!p.hidden, rankingEnabled },
      { merge: true },
    );
    // Verification can arrive after a privately saved completion. Rebuild from
    // validated tickets only, never from imported/offline personal bests.
    if (rankingEnabled && !p.hidden)
      writeRows(tx, publicIdOf(uid), name, p.published || {});
    return {
      ...naming,
      best: p.best || {},
      publicId: publicIdOf(uid),
      hidden: !!p.hidden,
      bestJourneys: p.bestJourneys || {},
      active,
      rankingEnabled,
    };
  });
});
export const saveLastLightName = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw),
    useAccountName = raw?.useAccountName === true,
    nickname = useAccountName ? null : checked(() => publicName(raw?.name));
  await limit(c, 'profile', 20);
  return db().runTransaction(async (tx) => {
    const ref = playerRef(uid),
      p = (await tx.get(ref)).data() || {};
    const current = await playerName(tx, uid, p, useAccountName);
    const naming = nickname
      ? { ...current, name: nickname, nameSource: 'custom' }
      : current;
    tx.set(
      ref,
      { ...naming, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    if (!p?.hidden && isVerified(c))
      writeRows(tx, publicIdOf(uid), naming.name, p?.published || {});
    return naming;
  });
});
/** Profile edits update account-based names even when the game is closed. */
export const syncLastLightAccountName = functions.firestore
  .document('users/{uid}')
  .onWrite(async (change, context) => {
    if (
      accountDisplayName(change.before.data()) ===
      accountDisplayName(change.after.data())
    )
      return;
    const uid = context.params.uid;
    await db().runTransaction(async (tx) => {
      const ref = playerRef(uid),
        p = (await tx.get(ref)).data();
      if (!p || p.guest) return;
      // Read the current profile in the transaction, not the event payload: an
      // older or retried event must never roll back a more recent account name.
      const naming = await playerName(tx, uid, p);
      if (
        p.name === naming.name &&
        p.nameSource === naming.nameSource &&
        p.accountName === naming.accountName
      )
        return;
      tx.set(ref, naming, { merge: true });
      if (p.name !== naming.name && !p.hidden && p.rankingEnabled === true)
        writeRows(tx, publicIdOf(uid), naming.name, p.published || {});
    });
  });
export const syncLastLightProgress = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw);
  if (!Array.isArray(raw?.results) || raw.results.length > 20)
    fail('invalid-argument', 'Too many results.');
  const results = raw.results.map((r: unknown) =>
    checked(() => validateDrive(r)),
  );
  await limit(c, 'sync', 120);
  return db().runTransaction(async (tx) => {
    const ref = db().collection('lastLightPlayers').doc(uid),
      p = (await tx.get(ref)).data();
    const best = mergeBest(p?.best || {}, results);
    tx.set(
      ref,
      { best, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { best };
  });
});
export const submitLastLightRun = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw),
    r = checked(() => validateDrive(raw?.result));
  if (!uuid(raw?.id))
    fail('invalid-argument', 'This drive has no online record.');
  await limit(c, 'submit', 240);
  const ref = db().collection('lastLightRuns').doc(raw.id),
    player = playerRef(uid);
  return db().runTransaction(async (tx) => {
    const [runSnap, pSnap, activeSnap] = await Promise.all([
      tx.get(ref),
      tx.get(player),
      tx.get(player.collection('state').doc('current')),
    ]);
    const run = runSnap.data(),
      p = pSnap.data() || {};
    checkTicket(raw, run, uid);
    if (!eligibleOwner(run!.owner, run!.claimedBy, uid))
      fail('permission-denied', 'This drive belongs to another player.');
    if (
      run!.claimedBy &&
      JSON.stringify(validateDrive(run!.result)) !== JSON.stringify(r)
    )
      fail('already-exists', 'This drive has already been recorded.');
    const snap = run!.snapshot as DriveSnapshot | undefined;
    if (
      driveKey(run as Drive) !== driveKey(r) ||
      Date.now() - run!.issuedAt > 30 * 86400000 ||
      Date.now() - run!.issuedAt <
        Math.max(20000, (elapsedDrive(r) - 10) * 1000) ||
      (snap &&
        (snap.practice ||
          r.remaining > snap.remaining + 0.001 ||
          r.integrity > snap.integrity + 0.001))
    )
      fail(
        'invalid-argument',
        'This drive could not be verified. Your local progress is still saved.',
      );
    const historyRef = player.collection('drives').doc(raw.id),
      existing = (await tx.get(historyRef)).data();
    const journeyRef = player
      .collection('journeys')
      .doc(run!.journeyId || raw.id);
    const journey = (await tx.get(journeyRef)).data() || {
      id: journeyRef.id,
      mode: r.mode,
      variant: r.variant,
      revision: r.revision,
      drives: {},
    };
    const best = mergeBest(p.best || {}, [r]),
      published = mergeBest(p.published || {}, [r]);
    const naming = await playerName(tx, uid, p),
      { name } = naming,
      eligible = isVerified(c),
      completedAt = existing?.completedAt || Date.now();
    // A journey has exactly one accepted attempt for each of its five legs.
    if (
      !journey.drives[r.mission] &&
      r.mission > 0 &&
      !journey.drives[r.mission - 1]
    )
      journey.partial = true;
    if (
      !journey.drives[r.mission] &&
      journey.mode === r.mode &&
      journey.variant === r.variant &&
      journey.revision === r.revision
    )
      journey.drives[r.mission] = { id: raw.id, score: r.score };
    const full =
      !journey.partial && [0, 1, 2, 3, 4].every((i) => journey.drives[i]);
    const bestJourneys = { ...(p.bestJourneys || {}) },
      key = boardKey(r, 'all');
    if (full) {
      journey.score = Object.values(journey.drives).reduce(
        (sum: number, d: any) => sum + d.score,
        0,
      );
      journey.completedAt = journey.completedAt || completedAt;
      if (!bestJourneys[key] || bestJourneys[key].score < journey.score)
        bestJourneys[key] = {
          id: journey.id,
          score: journey.score,
          completedAt: journey.completedAt,
        };
    }
    tx.set(journeyRef, journey);
    tx.set(historyRef, {
      id: raw.id,
      result: r,
      completedAt,
      sortKey: sortKey(completedAt, raw.id),
      eligible: true,
      journeyId: journey.id,
    });
    tx.set(
      player,
      {
        ...naming,
        best,
        published,
        bestJourneys,
        rankingEnabled: eligible,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.update(ref, { owner: uid, claimedBy: uid, result: r });
    // Keep the next leg resumable even when the player closes the arrival screen.
    if (
      activeSnap.data()?.runId === raw.id &&
      activeSnap.data()?.status === 'driving'
    ) {
      const current = activeSnap.data()!;
      tx.set(player.collection('state').doc('current'), {
        version: current.version + 1,
        runId: raw.id,
        journeyId: journey.id,
        status: r.mission === 4 ? 'finished' : 'between',
        mission: r.mission + 1,
        mode: r.mode,
        variant: r.variant,
        revision: r.revision,
        savedAt: Date.now(),
      });
    }
    if (!p.hidden && eligible) writeRows(tx, publicIdOf(uid), name, published);
    return {
      saved: true,
      eligible,
      published: !p.hidden && eligible,
      best,
      bestJourneys,
    };
  });
});
export const getLastLightLeaderboard = functions.https.onCall(
  async (raw, c) => {
    const b = checked(() =>
      bracket({ ...raw, mission: raw?.mission === 'all' ? 0 : raw?.mission }),
    );
    const chapter = raw?.mission === 'all' ? 'all' : b.mission;
    await limit(c, 'board', 360);
    const col = collectionBoard(boardKey(b, chapter));
    const size = [5, 20].includes(raw?.limit) ? raw.limit : 20;
    const search =
      typeof raw?.search === 'string'
        ? raw.search.trim().toLocaleLowerCase('en').slice(0, 28)
        : '';
    let q: admin.firestore.Query = search
      ? col
          .orderBy('searchName')
          .orderBy('rankKey')
          .startAt(search)
          .endAt(search + '\uf8ff')
      : col.orderBy('rankKey');
    if (raw?.cursor) {
      if (!/^[a-f0-9]{24}$/.test(raw.cursor))
        fail('invalid-argument', 'Invalid page.');
      const cursor = await col.doc(raw.cursor).get();
      if (cursor.exists) q = q.startAfter(cursor);
    }
    const [rows, count, own] = await Promise.all([
      q.limit(size + 1).get(),
      col.count().get(),
      c.auth ? col.doc(hash(c.auth.uid).slice(0, 24)).get() : null,
    ]);
    // A device player sees their own row without signing in.
    let deviceOwn: admin.firestore.DocumentSnapshot | null = null;
    if (
      !c.auth &&
      !own?.exists &&
      typeof raw?.deviceKey === 'string' &&
      /^[a-f0-9]{64}$/.test(raw.deviceKey)
    )
      deviceOwn = await col.doc(publicIdOf(guestId(raw.deviceKey))).get();
    const mine = own?.exists ? own : deviceOwn?.exists ? deviceOwn : null;
    async function entry(
      d: admin.firestore.DocumentSnapshot,
      knownRank?: number,
    ) {
      const data = d.data()!;
      const rank =
        knownRank ??
        (await col.where('rankKey', '<', data.rankKey).count().get()).data()
          .count + 1;
      return {
        id: d.id,
        name: data.name,
        score: data.score,
        chapters: data.chapters,
        rank,
      };
    }
    const visible = rows.docs.slice(0, size);
    const firstRank =
      !search && visible.length
        ? (
            await col
              .where('rankKey', '<', visible[0].data().rankKey)
              .count()
              .get()
          ).data().count + 1
        : undefined;
    const entries = await Promise.all(
      visible.map((d, i) =>
        entry(d, firstRank === undefined ? undefined : firstRank + i),
      ),
    );
    const featured =
      typeof raw?.focus === 'string' && /^[a-f0-9]{24}$/.test(raw.focus)
        ? await col.doc(raw.focus).get()
        : null;
    return {
      entries,
      featured: featured?.exists ? await entry(featured) : null,
      total: count.data().count,
      own: mine
        ? entries.find((r) => r.id === mine.id) || (await entry(mine))
        : null,
      nextCursor: rows.size > size ? rows.docs[size - 1].id : null,
    };
  },
);

/**
 * Automatic publishing for everyone: no sign-in or form. The device's private
 * key identifies the player; the run ticket and timing checks are the same as
 * for accounts, so only real full deliveries reach the boards.
 */
export const publishLastLightDrive = functions.https.onCall(async (raw, c) => {
  if (c.auth)
    fail(
      'failed-precondition',
      'Save this drive under your signed-in account.',
    );
  const key = checked(() => guestKey(raw?.deviceKey)),
    name = checked(() => publicName(raw?.name)),
    r = checked(() => validateDrive(raw?.result));
  if (
    !/^[a-f0-9-]{36}$/.test(raw?.id || '') ||
    !/^[a-f0-9]{48}$/.test(raw?.secret || '')
  )
    fail('invalid-argument', 'This drive has no online record.');
  await limit(c, 'guest-submit', 60);
  const playerId = guestId(key),
    publicId = publicIdOf(playerId);
  const ref = db().collection('lastLightRuns').doc(raw.id),
    player = db().collection('lastLightPlayers').doc(playerId);
  return db().runTransaction(async (tx) => {
    const [runSnap, pSnap] = await Promise.all([tx.get(ref), tx.get(player)]),
      run = runSnap.data(),
      p = pSnap.data();
    if (p?.migratedTo)
      fail(
        'permission-denied',
        'This device record already belongs to an account.',
      );
    if (
      !run ||
      !timingSafeEqual(
        Buffer.from(run.secretHash, 'hex'),
        Buffer.from(hash(raw.secret), 'hex'),
      )
    )
      fail('permission-denied', 'This drive cannot be claimed.');
    // A drive started while signed in can only be published from that session.
    if (run!.owner && run!.owner !== c.auth?.uid)
      fail('permission-denied', 'This drive belongs to another player.');
    if (run!.claimedBy) {
      if (
        run!.claimedBy === playerId &&
        JSON.stringify(validateDrive(run!.result)) === JSON.stringify(r)
      )
        return { published: !p?.hidden, publicId, name: p?.name || name };
      fail('already-exists', 'This drive has already been recorded.');
    }
    if (
      driveKey(run as Drive) !== driveKey(r) ||
      Date.now() - run!.issuedAt > 30 * 86400000 ||
      Date.now() - run!.issuedAt <
        Math.max(20000, (elapsedDrive(r) - 10) * 1000)
    )
      fail(
        'invalid-argument',
        'This drive could not be verified. Your local progress is still saved.',
      );
    const stableName = p?.name || name;
    const best = mergeBest(p?.best || {}, [r]),
      published = mergeBest(p?.published || {}, [r]);
    tx.set(
      player,
      {
        guest: true,
        name: stableName,
        best,
        published,
        hidden: !!p?.hidden,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.update(ref, { claimedBy: playerId, result: r });
    const completedAt = Date.now();
    tx.set(player.collection('drives').doc(raw.id), {
      id: raw.id,
      result: r,
      completedAt,
      sortKey: sortKey(completedAt, raw.id),
      eligible: true,
      journeyId: run!.journeyId || raw.id,
    });
    if (!p?.hidden) writeRows(tx, publicId, stableName, published);
    return { published: !p?.hidden, publicId, name: stableName };
  });
});
/** Opt out (or back in), and rename a device player; boards update at once. */
export const setLastLightVisibility = functions.https.onCall(async (raw, c) => {
  if (typeof raw?.hidden !== 'boolean')
    fail('invalid-argument', 'Choose whether to appear on the leaderboard.');
  const key = raw?.deviceKey ? checked(() => guestKey(raw.deviceKey)) : null,
    uid = c.auth?.uid ? user(c, raw) : null;
  const rename =
    raw?.name === undefined ? null : checked(() => publicName(raw.name));
  if (!key && !uid)
    fail('invalid-argument', 'This device has no player key yet.');
  await limit(c, 'visibility', 30);
  const refs = [
    ...(!uid && key
      ? [
          {
            ref: db().collection('lastLightPlayers').doc(guestId(key)),
            id: guestId(key),
            guest: true,
          },
        ]
      : []),
    ...(uid
      ? [
          {
            ref: db().collection('lastLightPlayers').doc(uid),
            id: uid,
            guest: false,
          },
        ]
      : []),
  ];
  return db().runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((r) => tx.get(r.ref)));
    const naming = uid
      ? await playerName(tx, uid, snaps[0].data() || {})
      : null;
    let name = rename || '';
    snaps.forEach((snap, i) => {
      const { ref, id, guest } = refs[i],
        p = snap.data(),
        publicId = guest ? publicIdOf(id) : hash(id).slice(0, 24);
      const nextName = guest ? rename || p?.name : naming!.name;
      if (!p && !guest) {
        tx.set(ref, {
          ...naming,
          hidden: raw.hidden,
          rankingEnabled: isVerified(c),
        });
        return;
      }
      if (p?.migratedTo && guest)
        fail(
          'permission-denied',
          'This device record already belongs to an account.',
        );
      if (!p) {
        tx.set(ref, {
          guest: true,
          name: rename || null,
          hidden: raw.hidden,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      if (nextName) name = nextName;
      tx.set(
        ref,
        {
          hidden: raw.hidden,
          ...(guest && rename ? { name: rename } : {}),
          ...(!guest ? naming : {}),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      if (raw.hidden) deleteRows(tx, publicId, p.published || {});
      else if (nextName && (guest || isVerified(c)))
        writeRows(tx, publicId, nextName, p.published || {});
    });
    return { hidden: raw.hidden, name };
  });
});

/** Private, paginated history; never served by a public profile link. */
export const getLastLightDrives = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw);
  await limit(c, 'history', 240);
  const col = playerRef(uid).collection('drives');
  let query: admin.firestore.Query = col.orderBy('sortKey');
  if (raw?.cursor) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(raw.cursor))
      fail('invalid-argument', 'Invalid history page.');
    const cursor = await col.doc(raw.cursor).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const page = await query.limit(21).get();
  return {
    drives: page.docs.slice(0, 20).map((d) => d.data()),
    nextCursor: page.size > 20 ? page.docs[19].id : null,
  };
});
/** Import private local history without ever turning it into ranked scores. */
export const saveLastLightHistory = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw);
  if (!Array.isArray(raw?.drives) || raw.drives.length > 20)
    fail('invalid-argument', 'Too many drives.');
  const records = raw.drives.map((d: any) => {
    const r = d?.result;
    if (
      !/^[a-zA-Z0-9_-]{1,100}$/.test(d?.id || '') ||
      !r ||
      !Number.isInteger(r.mission) ||
      r.mission < 0 ||
      r.mission > 4 ||
      !['standard', 'relaxed'].includes(r.mode) ||
      ![0, 1].includes(r.variant) ||
      !Number.isInteger(r.revision) ||
      r.revision < 1 ||
      r.revision > 6 ||
      !Number.isFinite(r.score) ||
      r.score < 0 ||
      r.score > 2000 ||
      !Number.isFinite(r.integrity) ||
      r.integrity < 0 ||
      r.integrity > 100 ||
      !Number.isFinite(r.remaining) ||
      r.remaining < 0 ||
      r.remaining > 500 ||
      !Number.isFinite(d.completedAt) ||
      d.completedAt > Date.now() + 60000 ||
      d.completedAt < 0
    )
      fail('invalid-argument', 'Invalid private drive.');
    // Allow old road editions in history; keep only documented result fields.
    const result = Object.fromEntries(
      [
        'mission',
        'mode',
        'variant',
        'revision',
        'score',
        'stars',
        'integrity',
        'remaining',
        'lives',
        'clean',
        'encounters',
        'practice',
      ]
        .filter(
          (k) =>
            r[k] !== undefined &&
            (typeof r[k] === 'number' ||
              typeof r[k] === 'boolean' ||
              k === 'mode'),
        )
        .map((k) => [k, r[k]]),
    );
    return {
      id: d.id,
      result,
      completedAt: d.completedAt,
      sortKey: sortKey(d.completedAt, d.id),
      eligible: false,
      imported: d.imported === true || d.id.startsWith('legacy-'),
      journeyId: uuid(d.journeyId) ? d.journeyId : null,
    };
  });
  await limit(c, 'history-save', 240);
  await db().runTransaction(async (tx) => {
    const refs = records.map((d: any) =>
      playerRef(uid).collection('drives').doc(d.id),
    );
    const existing = await Promise.all(
      refs.map((r: admin.firestore.DocumentReference) => tx.get(r)),
    );
    records.forEach((d: any, i: number) => {
      if (!existing[i].exists) tx.set(refs[i], d);
    });
  });
  return { saved: records.map((d: any) => d.id) };
});

/** Migrate only runs provably owned by this private device key and this account. */
export const claimLastLightGuest = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw),
    key = checked(() => guestKey(raw?.deviceKey)),
    id = guestId(key);
  await limit(c, 'claim', 60);
  return db().runTransaction(async (tx) => {
    const guestRef = playerRef(id),
      account = playerRef(uid);
    const [guestSnap, accountSnap, runs] = await Promise.all([
      tx.get(guestRef),
      tx.get(account),
      tx.get(
        db()
          .collection('lastLightRuns')
          .where('claimedBy', '==', id)
          .limit(201),
      ),
    ]);
    const guest = guestSnap.data(),
      p = accountSnap.data() || {};
    if (guest?.migratedTo && guest.migratedTo !== uid)
      return { claimed: 0, more: false };
    const owned = runs.docs
      .slice(0, 200)
      .filter((d) => !d.data().owner || d.data().owner === uid);
    const results = owned.map((d) => validateDrive(d.data().result));
    const hidden =
      !!p.hidden ||
      (!guest?.migratedTo && !!guest?.hidden) ||
      raw?.hidden === true;
    const naming = await playerName(tx, uid, p),
      { name } = naming,
      published = mergeBest(p.published || {}, results);
    const histories = await Promise.all(
      owned.map((d) => tx.get(guestRef.collection('drives').doc(d.id))),
    );
    owned.forEach((d, i) => {
      const result = results[i],
        at = histories[i].data()?.completedAt || d.data().issuedAt;
      tx.update(db().collection('lastLightRuns').doc(d.id), {
        owner: uid,
        claimedBy: uid,
      });
      tx.set(account.collection('drives').doc(d.id), {
        id: d.id,
        result,
        completedAt: at,
        sortKey: sortKey(at, d.id),
        eligible: true,
        journeyId: d.data().journeyId || d.id,
      });
    });
    tx.set(
      account,
      {
        ...naming,
        hidden,
        published,
        best: mergeBest(p.best || {}, results),
        rankingEnabled: isVerified(c),
      },
      { merge: true },
    );
    if (guest) {
      deleteRows(tx, publicIdOf(id), guest.published || {});
      tx.set(guestRef, { migratedTo: uid, hidden: true }, { merge: true });
    }
    if (!hidden && isVerified(c))
      writeRows(tx, publicIdOf(uid), name, published);
    else deleteRows(tx, publicIdOf(uid), published);
    return { claimed: owned.length, more: runs.size > 200 && owned.length > 0 };
  });
});

/** Compare-and-swap prevents an older tab/device from replacing a newer checkpoint. */
export const saveLastLightJourney = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw);
  if (!uuid(raw?.id) || !Number.isInteger(raw?.version) || raw.version < 0)
    fail('invalid-argument', 'Invalid checkpoint.');
  await limit(c, 'checkpoint', 600);
  return db().runTransaction(async (tx) => {
    const ref = playerRef(uid).collection('state').doc('current'),
      runRef = db().collection('lastLightRuns').doc(raw.id);
    const [head, runSnap] = await Promise.all([tx.get(ref), tx.get(runRef)]),
      run = runSnap.data();
    checkTicket(raw, run, uid);
    if (run!.claimedBy || Date.now() - run!.issuedAt > 30 * 86400000)
      fail('failed-precondition', 'This drive has ended.');
    if ((head.data()?.version || 0) !== raw.version)
      fail(
        'aborted',
        'A newer journey is saved. Continue it from the chapter map.',
      );
    const snapshot = checked(() =>
      validateSnapshot(raw?.snapshot, run!.snapshot),
    );
    if (driveKey(snapshot) !== driveKey(run as Drive))
      fail('invalid-argument', 'This checkpoint belongs to another road.');
    const version = raw.version + 1,
      savedAt = Date.now();
    tx.set(ref, {
      version,
      runId: raw.id,
      journeyId: run!.journeyId || raw.id,
      snapshot,
      status: 'driving',
      mission: snapshot.mission,
      mode: snapshot.mode,
      variant: snapshot.variant,
      revision: snapshot.revision,
      savedAt,
    });
    tx.update(runRef, { owner: uid, snapshot });
    return { version, savedAt };
  });
});
export const resumeLastLightJourney = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw);
  await limit(c, 'resume', 120);
  return db().runTransaction(async (tx) => {
    const ref = playerRef(uid).collection('state').doc('current'),
      head = (await tx.get(ref)).data();
    if (!head || head!.status !== 'driving' || head!.version !== raw?.version)
      fail('aborted', 'A newer journey is saved. Reload to continue it.');
    const runRef = db().collection('lastLightRuns').doc(head!.runId),
      run = (await tx.get(runRef)).data();
    if (
      !run ||
      run.owner !== uid ||
      run.claimedBy ||
      Date.now() - run.issuedAt > 30 * 86400000
    )
      fail('failed-precondition', 'This saved drive has ended or expired.');
    checked(() => validateSnapshot(head!.snapshot));
    const secret = randomBytes(24).toString('hex'),
      version = head!.version + 1;
    tx.update(runRef, { secretHash: hash(secret) });
    tx.update(ref, { version });
    return {
      ...head,
      version,
      ticket: {
        id: head!.runId,
        secret,
        owner: uid,
        journeyId: head!.journeyId,
      },
    };
  });
});
export const discardLastLightJourney = functions.https.onCall(
  async (raw, c) => {
    const uid = user(c, raw);
    await limit(c, 'discard', 60);
    return db().runTransaction(async (tx) => {
      const ref = playerRef(uid).collection('state').doc('current'),
        head = (await tx.get(ref)).data();
      if ((head?.version || 0) !== raw?.version)
        fail(
          'aborted',
          'A newer journey is saved. Reload before starting again.',
        );
      const version = (head?.version || 0) + 1;
      tx.set(ref, { version, status: 'abandoned', savedAt: Date.now() });
      return { version };
    });
  },
);
