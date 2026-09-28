import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
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
  totalBest,
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
const verified = (c: functions.https.CallableContext, raw?: any) => {
  const uid = user(c, raw),
    provider = c.auth!.token.firebase?.sign_in_provider;
  if (
    !c.auth!.token.email_verified &&
    (!provider || ['password', 'anonymous', 'custom'].includes(provider))
  )
    fail('failed-precondition', 'Verify your email before publishing a score.');
  return uid;
};
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
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      expiresAt: admin.firestore.Timestamp.fromMillis((hour + 2) * 3600000),
    });
  });
}
export const beginLastLightRun = functions.https.onCall(async (raw, c) => {
  if (raw?.accountUid) user(c,raw);
  const b = checked(() => bracket(raw));
  await limit(c, 'runs', 120);
  const id = randomUUID(),
    secret = randomBytes(24).toString('hex');
  await db()
    .collection('lastLightRuns')
    .doc(id)
    .set({
      ...b,
      secretHash: hash(secret),
      owner: c.auth?.uid || null,
      claimedBy: null,
      issuedAt: Date.now(),
      expiresAt: admin.firestore.Timestamp.fromMillis(
        Date.now() + 30 * 86400000,
      ),
    });
  return { id, secret, owner: c.auth?.uid || null };
});
export const getLastLightAccount = functions.https.onCall(async (raw, c) => {
  const uid = user(c, raw);
  await limit(c, 'account', 120);
  const p = (await db().collection('lastLightPlayers').doc(uid).get()).data();
  return {
    name: p?.name || '',
    best: p?.best || {},
    publicId: hash(uid).slice(0, 24),
  };
});
export const saveLastLightName = functions.https.onCall(async (raw, c) => {
  const uid = verified(c, raw),
    name = checked(() => publicName(raw?.name));
  await limit(c, 'profile', 20);
  const ref = db().collection('lastLightPlayers').doc(uid);
  await db().runTransaction(async (tx) => {
    const p = (await tx.get(ref)).data();
    // The first public name is stable so all chapter boards stay consistent.
    if (p?.name && p.name !== name)
      fail(
        'failed-precondition',
        'Your existing player name is already linked to your scores.',
      );
    tx.set(
      ref,
      { name, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
  });
  return { name };
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
      { best, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { best };
  });
});
export const submitLastLightRun = functions.https.onCall(async (raw, c) => {
  const uid = verified(c, raw),
    r = checked(() => validateDrive(raw?.result));
  if (
    !/^[a-f0-9-]{36}$/.test(raw?.id || '') ||
    !/^[a-f0-9]{48}$/.test(raw?.secret || '')
  )
    fail('invalid-argument', 'This drive has no online record.');
  await limit(c, 'submit', 120);
  const ref = db().collection('lastLightRuns').doc(raw.id),
    player = db().collection('lastLightPlayers').doc(uid);
  return db().runTransaction(async (tx) => {
    const [runSnap, pSnap] = await Promise.all([tx.get(ref), tx.get(player)]),
      run = runSnap.data(),
      p = pSnap.data();
    if (
      !run ||
      !timingSafeEqual(
        Buffer.from(run.secretHash, 'hex'),
        Buffer.from(hash(raw.secret), 'hex'),
      )
    )
      fail('permission-denied', 'This drive cannot be claimed.');
    if (!eligibleOwner(run!.owner, run!.claimedBy, uid))
      fail('permission-denied', 'This drive belongs to another player.');
    if (run!.claimedBy) {
      if (JSON.stringify(validateDrive(run!.result)) !== JSON.stringify(r))
        fail('already-exists', 'This drive has already been recorded.');
      return { published: true };
    }
    if (!p?.name)
      fail('failed-precondition', 'Choose your public player name first.');
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
    const best = mergeBest(p?.best || {}, [r]);
    const published = mergeBest(p?.published || {}, [r]);
    const publicId = hash(uid).slice(0, 24),
      chapter = published[driveKey(r)],
      total = totalBest(published, r);
    tx.set(
      player,
      {
        best,
        published,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.update(ref, { claimedBy: uid, result: r });
    // Players who hid themselves keep their records privately.
    if (p?.hidden) return { published: false };
    const row = {
      id: publicId,
      name: p!.name,
      searchName: p!.name.toLocaleLowerCase('en'),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    tx.set(collectionBoard(boardKey(r, r.mission)).doc(publicId), {
      ...row,
      score: chapter.score,
      chapters: 1,
      rankKey: rankKey(chapter.score, publicId),
    });
    tx.set(collectionBoard(boardKey(r, 'all')).doc(publicId), {
      ...row,
      ...total,
      rankKey: rankKey(total.score, publicId),
    });
    return { published: true };
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
    if (!own?.exists && typeof raw?.deviceKey === 'string' && /^[a-f0-9]{64}$/.test(raw.deviceKey))
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
    return {
      entries,
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
    const best = mergeBest(p?.best || {}, [r]),
      published = mergeBest(p?.published || {}, [r]);
    tx.set(
      player,
      {
        guest: true,
        name,
        best,
        published,
        hidden: !!p?.hidden,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.update(ref, { claimedBy: playerId, result: r });
    if (!p?.hidden) writeRows(tx, publicId, name, published);
    return { published: !p?.hidden, publicId, name };
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
  if (!key && !uid) fail('invalid-argument', 'This device has no player key yet.');
  await limit(c, 'visibility', 30);
  const refs = [
    ...(key ? [{ ref: db().collection('lastLightPlayers').doc(guestId(key)), id: guestId(key), guest: true }] : []),
    ...(uid ? [{ ref: db().collection('lastLightPlayers').doc(uid), id: uid, guest: false }] : []),
  ];
  return db().runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((r) => tx.get(r.ref)));
    let name = rename || '';
    snaps.forEach((snap, i) => {
      const { ref, id, guest } = refs[i],
        p = snap.data(),
        publicId = guest ? publicIdOf(id) : hash(id).slice(0, 24);
      // Account names stay stable; device players may rename freely.
      const nextName = guest && rename ? rename : p?.name;
      if (!p && !guest) return;
      if (!p) {
        tx.set(ref, {
          guest: true,
          name: rename || null,
          hidden: raw.hidden,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }
      if (guest && nextName) name = nextName;
      tx.set(
        ref,
        {
          hidden: raw.hidden,
          ...(guest && rename ? { name: rename } : {}),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      if (raw.hidden) deleteRows(tx, publicId, p.published || {});
      else if (nextName) writeRows(tx, publicId, nextName, p.published || {});
    });
    return { hidden: raw.hidden, name };
  });
});
