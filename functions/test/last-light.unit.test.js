const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const admin = require('firebase-admin');
const fake = require('./last-light-fake-firestore');
fake.install(admin);
const ll = require('../lib/last-light.js');
const ctx = (uid, verified = true) => ({ rawRequest: { ip: '10.0.0.' + Math.floor(Math.random() * 200) }, ...(uid ? { auth: { uid, token: { email_verified: verified, firebase: { sign_in_provider: 'password' } } } } : {}) });
const call = async (name, data, uid) => {
  try { return await ll[name].run(data, ctx(uid)); }
  catch (e) { const err = new Error(e.message); err.code = e.code; throw err; }
};
const base = { mission: 0, mode: 'standard', variant: 1, revision: 6 };
const drive = { ...base, score: 1800, stars: 3, integrity: 100, remaining: 117.5, clean: 5, encounters: 5, lives: 3 };
const d1 = { ...drive, mission: 1, lives: 5, remaining: 127.5 };
async function matured(uid, b = base) {
  const t = await call('beginLastLightRun', b, uid);
  const path = `lastLightRuns/${t.id}`;
  fake.store.set(path, { ...fake.store.get(path), issuedAt: Date.now() - 600000 });
  return t;
}
const key = () => randomUUID().replace(/-/g, '').repeat(2);
test('device players publish automatically, see themselves, rename and opt out', async () => {
  const deviceKey = key(), other = key(), name = 'Steady Heron 42';
  await assert.rejects(async () => call('publishLastLightDrive', { deviceKey: 'bad', name, result: drive, id: randomUUID(), secret: 'a'.repeat(48) }), { code: 'invalid-argument' });
  const t0 = await matured();
  const first = await call('publishLastLightDrive', { ...t0, result: drive, deviceKey, name });
  assert.deepEqual(first.published, true);
  assert.equal((await call('publishLastLightDrive', { ...t0, result: drive, deviceKey, name })).published, true);
  await assert.rejects(async () => call('publishLastLightDrive', { ...t0, result: drive, deviceKey: other, name: 'Someone Else' }), { code: 'already-exists' });
  await assert.rejects(async () => call('publishLastLightDrive', { ...(await matured()), result: { ...drive, score: 1999 }, deviceKey, name }), { code: 'invalid-argument' });
  let board = await call('getLastLightLeaderboard', { ...base, deviceKey });
  assert.equal(board.own.name, name);
  assert.equal(board.own.score, 1800);
  assert.equal(board.own.rank, 1);
  assert.equal(board.total, 1);
  assert.equal((await call('getLastLightLeaderboard', { ...base, mission: 'all', deviceKey })).own.chapters, 1);
  assert.equal((await call('getLastLightLeaderboard', base)).own, null);
  // Signed-in drives stay with the account session; unmatured tickets are refused.
  await assert.rejects(async () => call('publishLastLightDrive', { ...(await matured('alice')), result: drive, deviceKey, name }), { code: 'permission-denied' });
  assert.equal((await call('publishLastLightDrive', { ...(await matured('carol')), result: drive, deviceKey: other, name: 'Carol Unverified' }, 'carol')).published, true);
  await assert.rejects(async () => call('publishLastLightDrive', { ...(await call('beginLastLightRun', base)), result: drive, deviceKey, name }), { code: 'invalid-argument' });
  // Rename, then hide, then publish privately, then return.
  await call('setLastLightVisibility', { deviceKey, hidden: false, name: 'Night Lantern 7' });
  board = await call('getLastLightLeaderboard', { ...base, deviceKey });
  assert.equal(board.own.name, 'Night Lantern 7');
  assert.equal(board.total, 2);
  await call('setLastLightVisibility', { deviceKey, hidden: true });
  board = await call('getLastLightLeaderboard', { ...base, deviceKey });
  assert.equal(board.own, null);
  assert.equal(board.total, 1);
  assert.equal((await call('getLastLightLeaderboard', { ...base, mission: 'all', deviceKey })).own, null);
  assert.equal((await call('publishLastLightDrive', { ...(await matured(undefined, { ...base, mission: 1 })), result: d1, deviceKey, name: 'Night Lantern 7' })).published, false);
  assert.equal((await call('getLastLightLeaderboard', { ...base, mission: 1, deviceKey })).own, null);
  await call('setLastLightVisibility', { deviceKey, hidden: false });
  const overall = await call('getLastLightLeaderboard', { ...base, mission: 'all', deviceKey });
  assert.equal(overall.own.chapters, 2);
  assert.equal(overall.own.score, 3600);
  assert.equal(overall.own.name, 'Night Lantern 7');
  assert.equal((await call('getLastLightLeaderboard', { ...base, mission: 1, deviceKey })).own.score, 1800);
  assert.ok(overall.entries.every((r) => Object.keys(r).sort().join(',') === 'chapters,id,name,rank,score'));
  // Nothing private leaks into player records on the board.
  for (const [path, data] of fake.store) if (path.startsWith('lastLightBoards/')) assert.ok(!JSON.stringify(data).includes(deviceKey));
});
test('account players keep their flow and can opt out too', async () => {
  await call('saveLastLightName', { name: 'Alice Account' }, 'alice');
  const t = await matured('alice', { ...base, variant: 0 });
  assert.deepEqual(await call('submitLastLightRun', { ...t, result: { ...drive, variant: 0 } }, 'alice'), { published: true });
  let board = await call('getLastLightLeaderboard', { ...base, variant: 0 }, 'alice');
  assert.equal(board.own.name, 'Alice Account');
  await call('setLastLightVisibility', { hidden: true }, 'alice');
  board = await call('getLastLightLeaderboard', { ...base, variant: 0 }, 'alice');
  assert.equal(board.own, null);
  const t2 = await matured('alice', { ...base, variant: 0, mission: 1 });
  assert.deepEqual(await call('submitLastLightRun', { ...t2, result: { ...d1, variant: 0 } }, 'alice'), { published: false });
  await call('setLastLightVisibility', { hidden: false }, 'alice');
  board = await call('getLastLightLeaderboard', { ...base, variant: 0, mission: 'all' }, 'alice');
  assert.equal(board.own.chapters, 2);
});
