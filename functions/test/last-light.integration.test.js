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
    await call("saveLastLightName", { name: "New Player" }, unverified);
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
    assert.equal((await call("submitLastLightRun", { ...guest, result: drive }, alice)).published, true);
    assert.equal((await call("submitLastLightRun", { ...guest, result: drive }, alice)).published, true);
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
  "Last Light device players: automatic publishing, own row, rename and opt-out",
  { skip: !enabled },
  async () => {
    const deviceKey = randomUUID().replace(/-/g, "").repeat(2);
    const other = randomUUID().replace(/-/g, "").repeat(2);
    const v1 = { ...base, variant: 1 };
    const d0 = { ...drive, variant: 1 };
    const d1 = { ...d0, mission: 1, lives: 5, remaining: 127.5 };
    const name = `Steady Heron ${prefix}`;
    await assert.rejects(
      async () => call("publishLastLightDrive", { ...(await maturedTicket(undefined, v1)), result: d0, deviceKey: "nope", name }),
      { code: "INVALID_ARGUMENT" },
    );
    const t0 = await maturedTicket(undefined, v1);
    const first = await call("publishLastLightDrive", { ...t0, result: d0, deviceKey, name });
    assert.equal(first.published, true);
    assert.equal(first.name, name);
    // Retrying the same drive is harmless; another device cannot take it.
    assert.equal((await call("publishLastLightDrive", { ...t0, result: d0, deviceKey, name })).published, true);
    await assert.rejects(
      () => call("publishLastLightDrive", { ...t0, result: d0, deviceKey: other, name: "Someone Else" }),
      { code: "ALREADY_EXISTS" },
    );
    let board = await call("getLastLightLeaderboard", { ...v1, deviceKey });
    assert.equal(board.own.name, name);
    assert.equal(board.own.score, 1800);
    assert.ok(board.entries.some((e) => e.id === board.own.id));
    assert.equal((await call("getLastLightLeaderboard", { ...v1, mission: "all", deviceKey })).own.chapters, 1);
    // Without the device key, the same row is simply another player.
    assert.equal((await call("getLastLightLeaderboard", v1)).own, null);
    // A drive begun while signed in stays with that account.
    const owned = await maturedTicket(alice, v1);
    await assert.rejects(
      () => call("publishLastLightDrive", { ...owned, result: d0, deviceKey, name }),
      { code: "PERMISSION_DENIED" },
    );
    const quick = await call("beginLastLightRun", v1);
    await assert.rejects(
      () => call("publishLastLightDrive", { ...quick, result: d0, deviceKey, name }),
      { code: "INVALID_ARGUMENT" },
    );
    // Rename updates every row at once.
    await call("setLastLightVisibility", { deviceKey, hidden: false, name: `Night Lantern ${prefix}` });
    board = await call("getLastLightLeaderboard", { ...v1, deviceKey });
    assert.equal(board.own.name, `Night Lantern ${prefix}`);
    // Opting out removes the rows; new drives stay private.
    const before = board.total;
    await call("setLastLightVisibility", { deviceKey, hidden: true });
    board = await call("getLastLightLeaderboard", { ...v1, deviceKey });
    assert.equal(board.own, null);
    assert.equal(board.total, before - 1);
    const t1 = await maturedTicket(undefined, { ...v1, mission: 1 });
    assert.equal((await call("publishLastLightDrive", { ...t1, result: d1, deviceKey, name })).published, false);
    assert.equal((await call("getLastLightLeaderboard", { ...v1, mission: 1, deviceKey })).own, null);
    // Opting back in restores both chapters and the overall total.
    await call("setLastLightVisibility", { deviceKey, hidden: false });
    const overall = await call("getLastLightLeaderboard", { ...v1, mission: "all", deviceKey });
    assert.equal(overall.own.chapters, 2);
    assert.equal(overall.own.score, 3600);
    assert.equal(overall.own.name, `Night Lantern ${prefix}`);
    assert.ok(overall.entries.every((r) => Object.keys(r).sort().join(",") === "chapters,id,name,rank,score"));
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

test('account history, default alias, opt-out and concurrent checkpoint ownership', {skip:!enabled},async()=>{
  const owner=await player('continuation'),other=await player('unrelated');
  const profile=await call('getLastLightAccount',{},owner);
  assert.ok(profile.name);assert.equal(profile.hidden,false);
  const journeyId=randomUUID();
  const ticket=await maturedTicket(owner,{...base,journeyId});
  const snapshot={version:1,...base,stage:'driving',safeZ:120,safeAlt:false,remaining:190,integrity:84,elapsed:45,furthest:128,impacts:1,recoveries:0,cleanEncounters:1,radioIndex:1,damageCooldown:0,practice:false,events:[],cars:[],knocked:[]};
  await call('saveLastLightJourney',{...ticket,version:0,snapshot},owner);
  const race=await Promise.allSettled([call('resumeLastLightJourney',{version:1},owner),call('resumeLastLightJourney',{version:1},owner)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1,'only one device acquires continuation');
  const resumed=race.find(r=>r.status==='fulfilled').value;
  await assert.rejects(()=>call('saveLastLightJourney',{...ticket,version:2,snapshot},owner),{code:'PERMISSION_DENIED'});
  await assert.rejects(()=>call('saveLastLightJourney',{...resumed.ticket,version:2,snapshot},other),{code:'PERMISSION_DENIED'});
  await call('setLastLightVisibility',{hidden:true},owner);
  const result={...drive,integrity:80,stars:2,score:1720};
  const replies=await Promise.all([call('submitLastLightRun',{...resumed.ticket,result},owner),call('submitLastLightRun',{...resumed.ticket,result},owner)]);
  assert.ok(replies.every(r=>r.saved&&!r.published));
  let history=await call('getLastLightDrives',{},owner);
  assert.equal(history.drives.length,1);
  const lower={...drive,integrity:70,stars:2,score:1680};
  await call('submitLastLightRun',{...(await maturedTicket(owner)),result:lower},owner);
  history=await call('getLastLightDrives',{},owner);assert.equal(history.drives.length,2);
  const latest=await call('getLastLightAccount',{},owner);
  assert.equal(latest.best['0:standard:r6:v0'].score,1720);assert.equal(latest.hidden,true);
  assert.equal(latest.active.status,'between');assert.equal(latest.active.version,3);
  assert.equal((await call('getLastLightLeaderboard',base,owner)).own,null);
  await call('setLastLightVisibility',{hidden:false},owner);
  const visible=await call('getLastLightLeaderboard',base,owner);assert.equal(visible.own.score,1720);
  const shared=await call('getLastLightLeaderboard',{...base,focus:visible.own.id});assert.equal(shared.featured.name,profile.name);
  await call('setLastLightVisibility',{hidden:true},owner);
  assert.equal((await call('getLastLightLeaderboard',{...base,focus:visible.own.id})).featured,null);
  await assert.rejects(()=>call('getLastLightDrives',{accountUid:owner.uid},other),{code:'PERMISSION_DENIED'});
  const paths=[`lastLightPlayers/${owner.uid}/drives/${resumed.ticket.id}`,`lastLightPlayers/${owner.uid}/state/current`,`lastLightPlayers/${owner.uid}/journeys/${journeyId}`];
  for(const path of paths){
    const url=`http://127.0.0.1:8186/v1/projects/demo-last-light/databases/(default)/documents/${path}`;
    assert.equal((await fetch(url,{headers:{Authorization:`Bearer ${owner.token}`}})).status,403,'private nested records stay callable-only');
  }
});
