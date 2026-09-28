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
  await assert.rejects(() => call('publishLastLightDrive', { ...t0, result: drive, deviceKey: other, name }, 'carol'), { code: 'failed-precondition' });
  assert.equal((await call('submitLastLightRun', { ...(await matured('carol')), result: drive }, 'carol')).published, true);
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
  assert.equal((await call('submitLastLightRun', { ...t, result: { ...drive, variant: 0 } }, 'alice')).published, true);
  let board = await call('getLastLightLeaderboard', { ...base, variant: 0 }, 'alice');
  assert.equal(board.own.name, 'Alice Account');
  await call('setLastLightVisibility', { hidden: true }, 'alice');
  board = await call('getLastLightLeaderboard', { ...base, variant: 0 }, 'alice');
  assert.equal(board.own, null);
  const t2 = await matured('alice', { ...base, variant: 0, mission: 1 });
  assert.equal((await call('submitLastLightRun', { ...t2, result: { ...d1, variant: 0 } }, 'alice')).published, false);
  await call('setLastLightVisibility', { hidden: false }, 'alice');
  board = await call('getLastLightLeaderboard', { ...base, variant: 0, mission: 'all' }, 'alice');
  assert.equal(board.own.chapters, 2);
});

test('account alias is automatic; all attempts survive lower and higher replays and opt-out', async () => {
  const uid = 'repeat-player';
  const account = await call('getLastLightAccount', {}, uid);
  assert.match(account.name, /^[A-Za-z ]+ \d+$/);
  assert.equal(account.hidden, false);
  const results = [drive, { ...drive, integrity: 70, stars: 2, score: 1680 }, { ...drive, remaining: 176.25, score: 1900 }];
  for (const result of results) {
    const ticket = await matured(uid);
    await call('submitLastLightRun', { ...ticket, result }, uid);
    await call('submitLastLightRun', { ...ticket, result }, uid);
  }
  const history = await call('getLastLightDrives', {}, uid);
  assert.equal(history.drives.length, 3, 'each run exactly once, even with retries');
  assert.deepEqual(history.drives.map(d=>d.result.score).sort(), [1680,1800,1900]);
  assert.equal((await call('getLastLightLeaderboard', {...base,mission:'all'},uid)).own.score,1900);
  await call('setLastLightVisibility', {hidden:true},uid);
  const privateTicket=await matured(uid);
  assert.equal((await call('submitLastLightRun',{...privateTicket,result:drive},uid)).published,false);
  assert.equal((await call('submitLastLightRun',{...privateTicket,result:drive},uid)).published,false, 'retry respects hidden preference');
  assert.equal((await call('getLastLightAccount',{},uid)).hidden,true);
  assert.equal((await call('getLastLightDrives',{},uid)).drives.length,4);
  assert.equal((await call('getLastLightLeaderboard',base,uid)).own,null);
  assert.equal((await call('getLastLightAccount',{},'unrelated-player')).best['0:standard:r6:v1'],undefined);
});

test('unverified account saves privately and verification later activates only validated scores', async()=>{
  const uid='needs-verification', ticket=await matured(uid);
  const reply=await ll.submitLastLightRun.run({...ticket,result:drive},ctx(uid,false));
  assert.equal(reply.saved,true);assert.equal(reply.published,false);
  await ll.setLastLightVisibility.run({hidden:false},ctx(uid,false));
  assert.equal((await call('getLastLightLeaderboard',base,uid)).own,null);
  await call('getLastLightAccount',{},uid);
  assert.equal((await call('getLastLightLeaderboard',base,uid)).own.score,1800);
});

test('owned guest migration removes duplicates, is idempotent and retains opt-out',async()=>{
  const deviceKey=key(), uid='guest-claimant', ticket=await matured();
  const guest=await call('publishLastLightDrive',{...ticket,result:drive,deviceKey,name:'Kind Guest 21'});
  await call('setLastLightVisibility',{deviceKey,hidden:true});
  const claim=await call('claimLastLightGuest',{deviceKey},uid);
  assert.equal(claim.claimed,1);
  assert.equal((await call('claimLastLightGuest',{deviceKey},uid)).claimed,0);
  assert.equal((await call('getLastLightAccount',{},uid)).hidden,true);
  assert.equal((await call('getLastLightDrives',{},uid)).drives.length,1);
  assert.equal((await call('claimLastLightGuest',{deviceKey},'thief')).claimed,0);
  await call('setLastLightVisibility',{hidden:false},uid);
  const board=await call('getLastLightLeaderboard',base,uid);
  assert.equal(board.own.score,1800);
  assert.ok(!board.entries.some(e=>e.id===guest.publicId));
  assert.equal((await call('getLastLightLeaderboard',{...base,deviceKey},'thief')).own,null,'no guest fallback for signed-in users');
});

const snapshot = () => ({version:1,revision:6,mission:0,mode:'standard',variant:1,stage:'driving',safeZ:120,safeAlt:false,remaining:190,integrity:84,elapsed:45,furthest:128,impacts:1,recoveries:0,cleanEncounters:1,radioIndex:1,damageCooldown:0,practice:false,events:[],cars:[],knocked:[]});
test('checkpoint CAS and rotating continuation tickets block stale devices without resetting resources',async()=>{
  const uid='resuming-player', ticket=await matured(uid);
  const one=await call('saveLastLightJourney',{...ticket,version:0,snapshot:snapshot()},uid);
  assert.equal(one.version,1);
  await assert.rejects(()=>call('saveLastLightJourney',{...ticket,version:0,snapshot:snapshot()},uid),{code:'aborted'});
  await assert.rejects(()=>call('saveLastLightJourney',{...ticket,version:1,snapshot:{...snapshot(),remaining:220}},uid),{code:'invalid-argument'});
  const resumed=await call('resumeLastLightJourney',{version:1},uid);
  assert.equal(resumed.snapshot.remaining,190);assert.equal(resumed.snapshot.integrity,84);assert.equal(resumed.version,2);
  assert.notEqual(resumed.ticket.secret,ticket.secret);
  await assert.rejects(()=>call('saveLastLightJourney',{...ticket,version:2,snapshot:snapshot()},uid),{code:'permission-denied'});
  await assert.rejects(()=>call('submitLastLightRun',{...ticket,result:drive},uid),{code:'permission-denied'});
  await assert.rejects(()=>call('saveLastLightJourney',{...resumed.ticket,version:2,snapshot:snapshot()},'intruder'),{code:'permission-denied'});
  const two=await call('saveLastLightJourney',{...resumed.ticket,version:2,snapshot:{...snapshot(),remaining:180,elapsed:55}},uid);
  assert.equal(two.version,3);
  const result={...drive,integrity:80,stars:2,score:1720};
  await call('submitLastLightRun',{...resumed.ticket,result},uid);
  const head=(await call('getLastLightAccount',{},uid)).active;
  assert.equal(head.status,'between');assert.equal(head.mission,1);assert.equal(head.version,4);
  await call('submitLastLightRun',{...resumed.ticket,result},uid);
  assert.equal((await call('getLastLightAccount',{},uid)).active.version,4,'retry does not advance the journey twice');
});

test('five legs from one journey stay distinct from combined clinic bests',async()=>{
  const uid='whole-journey', journeyId=randomUUID(), seconds=[235,255,270,285,300],lives=[3,5,6,8,12];
  for(let mission=0;mission<5;mission++){
    const ticket=await matured(uid,{...base,mission,journeyId});
    await call('submitLastLightRun',{...ticket,result:{...drive,mission,remaining:seconds[mission]/2,lives:lives[mission]}},uid);
  }
  let p=await call('getLastLightAccount',{},uid);
  assert.equal(p.bestJourneys['r6-v1-standard-all'].score,9000);
  await call('submitLastLightRun',{...(await matured(uid)),result:{...drive,remaining:176.25,score:1900}},uid);
  p=await call('getLastLightAccount',{},uid);
  assert.equal(p.bestJourneys['r6-v1-standard-all'].score,9000);
  assert.equal((await call('getLastLightLeaderboard',{...base,mission:'all'},uid)).own.score,9100);
});

test('private history is paginated and cannot manufacture public ranking eligibility',async()=>{
  const uid='offline-archive';
  for(let i=0;i<45;i++) await call('saveLastLightHistory',{drives:[{id:randomUUID(),result:drive,completedAt:Date.now()-i*1000}]},uid);
  const first=await call('getLastLightDrives',{},uid), second=await call('getLastLightDrives',{cursor:first.nextCursor},uid),third=await call('getLastLightDrives',{cursor:second.nextCursor},uid);
  assert.equal(first.drives.length,20);assert.equal(second.drives.length,20);assert.equal(third.drives.length,5);
  assert.ok(!first.drives.some(a=>second.drives.some(b=>a.id===b.id)));
  assert.ok(first.drives.every(d=>!d.eligible));
  assert.equal((await call('getLastLightLeaderboard',base,uid)).own,null);
  await assert.rejects(()=>call('getLastLightDrives',{accountUid:uid},'other'),{code:'permission-denied'});
});
