const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
// This suite is intentionally unable to connect to the production project.
const enabled = process.env.LAST_LIGHT_EMULATOR_TEST === "1";
let admin, db, alice, bob, unverified;
const prefix = randomUUID().slice(0, 8);
const endpoint = "http://127.0.0.1:5006/demo-last-light/us-central1/";
const base = { mission: 0, mode: "standard", variant: 0, revision: 6 };
const drive = {
  ...base,
  score: 1800,
  stars: 3,
  integrity: 100,
  remaining: 117.5,
  clean: 5,
  encounters: 5,
  lives: 3,
};
async function player(name, verified = true) {
  const email = `${prefix}-${name}@last-light.test`,
    password = "Emulator-only-pass-42";
  const u = await admin
    .auth()
    .createUser({ email, password, emailVerified: verified });
  const response = await fetch(
    "http://127.0.0.1:9106/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await response.json();
  assert.ok(data.idToken, "emulator authentication succeeded");
  return { uid: u.uid, token: data.idToken };
}
async function call(name, data = {}, user) {
  const response = await fetch(endpoint + name, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  const json = await response.json();
  if (json.error) {
    const error = new Error(json.error.message);
    error.code = json.error.status;
    throw error;
  }
  return json.result;
}
async function maturedTicket(user, b = base) {
  const t = await call("beginLastLightRun", b, user);
  await db
    .collection("lastLightRuns")
    .doc(t.id)
    .update({ issuedAt: Date.now() - 600000 });
  return t;
}
before(async () => {
  if (!enabled) return;
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8186";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9106";
  admin = require("firebase-admin");
  admin.initializeApp({ projectId: "demo-last-light" });
  db = admin.firestore();
  alice = await player("alice");
  bob = await player("bob");
  unverified = await player("unverified", false);
});
test(
  "Last Light callable integration: claims, rankings, privacy and retries",
  { skip: !enabled },
  async () => {
    await assert.rejects(() => call("getLastLightAccount"), {
      code: "UNAUTHENTICATED",
    });
    await assert.rejects(
      () => call("saveLastLightName", { name: "New Player" }, unverified),
      { code: "FAILED_PRECONDITION" },
    );
    await call("saveLastLightName", { name: `Alice ${prefix}` }, alice);
    await call("saveLastLightName", { name: `Bob ${prefix}` }, bob);
    await assert.rejects(
      () =>
        call(
          "syncLastLightProgress",
          { results: [drive], accountUid: alice.uid },
          bob,
        ),
      { code: "PERMISSION_DENIED" },
    );
    const guest = await maturedTicket();
    await assert.rejects(
      () =>
        call(
          "submitLastLightRun",
          { ...guest, result: { ...drive, score: 1999 } },
          alice,
        ),
      { code: "INVALID_ARGUMENT" },
    );
    await assert.rejects(
      () =>
        call(
          "submitLastLightRun",
          { ...guest, result: { ...drive, practice: true } },
          alice,
        ),
      { code: "INVALID_ARGUMENT" },
    );
    assert.deepEqual(
      await call("submitLastLightRun", { ...guest, result: drive }, alice),
      { published: true },
    );
    assert.deepEqual(
      await call("submitLastLightRun", { ...guest, result: drive }, alice),
      { published: true },
    );
    await assert.rejects(
      () => call("submitLastLightRun", { ...guest, result: drive }, bob),
      { code: "PERMISSION_DENIED" },
    );
    const signed = await maturedTicket(alice);
    await assert.rejects(
      () => call("submitLastLightRun", { ...signed, result: drive }, bob),
      { code: "PERMISSION_DENIED" },
    );
    const fast = await call("beginLastLightRun", base, alice);
    await assert.rejects(
      () => call("submitLastLightRun", { ...fast, result: drive }, alice),
      { code: "INVALID_ARGUMENT" },
    );
    await call(
      "syncLastLightProgress",
      { results: [{ ...drive, mission: 1, lives: 5, remaining: 127.5 }] },
      alice,
    );
    let overall = await call(
      "getLastLightLeaderboard",
      { ...base, mission: "all" },
      alice,
    );
    assert.equal(overall.own.score, 1800);
    assert.equal(overall.own.chapters, 1);
    let second = await maturedTicket(alice, { ...base, mission: 1 });
    await call(
      "submitLastLightRun",
      {
        ...second,
        result: { ...drive, mission: 1, lives: 5, remaining: 127.5 },
      },
      alice,
    );
    overall = await call(
      "getLastLightLeaderboard",
      { ...base, mission: "all" },
      alice,
    );
    assert.equal(overall.own.score, 3600);
    assert.equal(overall.own.chapters, 2);
    const privateRecord = await call("getLastLightAccount", {}, alice);
    assert.equal(Object.keys(privateRecord.best).length, 2);
    assert.equal(
      (await call("getLastLightAccount", {}, bob)).best["0:standard:r6:v0"],
      undefined,
    );
    const col = db
      .collection("lastLightBoards")
      .doc("r6-v0-standard-0")
      .collection("players");
    const batch = db.batch();
    for (let i = 0; i < 24; i++) {
      const id = (i + 1).toString(16).padStart(24, "0"),
        score = 1801 + i;
      batch.set(col.doc(id), {
        id,
        name: `Fixture Player ${String(i).padStart(2, "0")}`,
        searchName: `fixture player ${String(i).padStart(2, "0")}`,
        score,
        chapters: 1,
        rankKey: `${String(10000 - score).padStart(5, "0")}:${id}`,
      });
    }
    await batch.commit();
    const first = await call(
      "getLastLightLeaderboard",
      { ...base, limit: 20 },
      alice,
    );
    assert.equal(first.entries.length, 20);
    assert.ok(first.nextCursor);
    assert.ok(first.own.rank >= 25);
    const next = await call(
      "getLastLightLeaderboard",
      { ...base, limit: 20, cursor: first.nextCursor },
      alice,
    );
    assert.ok(
      !next.entries.some((row) => first.entries.some((r) => r.id === row.id)),
    );
    assert.equal(next.nextCursor, null);
    const search = await call("getLastLightLeaderboard", {
      ...base,
      search: "Fixture Player 23",
    });
    assert.equal(search.entries.length, 1);
    assert.equal(search.entries[0].rank, 1);
    const top = await call(
      "getLastLightLeaderboard",
      { ...base, limit: 5 },
      alice,
    );
    assert.equal(top.entries.length, 5);
    assert.equal(
      (await call("getLastLightLeaderboard", { ...base, mode: "relaxed" }))
        .total,
      0,
    );
    assert.equal(
      (await call("getLastLightLeaderboard", { ...base, variant: 1 })).total,
      0,
    );
    assert.ok(
      top.entries.every(
        (r) =>
          Object.keys(r).sort().join(",") === "chapters,id,name,rank,score",
      ),
    );
    await assert.rejects(
      () => call("saveLastLightName", { name: "private@example.com" }, bob),
      { code: "INVALID_ARGUMENT" },
    );
  },
);
test(
  "Firestore rules deny direct access to all game collections",
  { skip: !enabled },
  async () => {
    for (const collection of [
      "lastLightPlayers",
      "lastLightRuns",
      "lastLightBoards",
      "lastLightLimits",
    ]) {
      const path = `http://127.0.0.1:8186/v1/projects/demo-last-light/databases/(default)/documents/${collection}/security-probe`;
      const read = await fetch(path, {
        headers: { Authorization: `Bearer ${alice.token}` },
      });
      assert.equal(read.status, 403, `${collection}: direct reads denied`);
      const write = await fetch(path, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alice.token}`,
        },
        body: JSON.stringify({ fields: { score: { integerValue: "9999" } } }),
      });
      assert.equal(write.status, 403, `${collection}: direct writes denied`);
    }
  },
);
