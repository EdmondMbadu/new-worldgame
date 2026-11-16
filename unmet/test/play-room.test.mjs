// A whole live game, played by a host and several players in memory.
// When the `targaryen` package is installed (npm i --no-save targaryen), the
// same game is replayed with every read and write checked against
// database.rules.json, and the things the rules must refuse are tried.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MockHub, mockStore, TS } from '../src/play/store.js';
import { Host, Player, createRoom, findRoom, path, validCode, normalCode, cleanCfg, makeIdentity, validIdentity, token, present, GRACE_MS, REVEAL_MS } from '../src/play/room.js';
import { playRules } from '../scripts/play-rules.mjs';
import * as E from '../src/play/engine.js';

const at = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const real = at('data/unmet.json');
const data = JSON.parse(readFileSync(existsSync(real) ? real : at('data/sample.json'), 'utf8'));
const geo = JSON.parse(readFileSync(at('data/geo/map.json'), 'utf8'));
const known = new Set(geo.countries.map((c) => c.id));
const rules = JSON.parse(readFileSync(at('../database.rules.json'), 'utf8'));
let targaryen = null;
try { targaryen = (await import('targaryen')).default; } catch { /* optional */ }

const settle = () => new Promise((r) => setTimeout(r, 0));

// ---------- a hub that enforces the security rules (nobody is signed in) ----------
class RulesHub extends MockHub {
  db() { return targaryen.database(rules, this.tree, this.now()).as(null); }
}
function rulesStore(hub) {
  const base = mockStore(hub);
  const no = (what, p, info) => Object.assign(new Error(`PERMISSION_DENIED ${what} ${p}`), { code: 'PERMISSION_DENIED', info });
  const stamp = (v) => hub.stamp(JSON.parse(JSON.stringify(v ?? null)));
  const checked = (p, patch) => {
    const r = hub.db().update(p, Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, stamp(v)])), { now: hub.now() });
    if (!r.allowed) throw no('update', p, r.info);
  };
  let onDrop = null;
  return {
    ...base,
    get: async (p) => { if (!hub.db().read(p).allowed) throw no('read', p); return base.get(p); },
    set: async (p, v) => { const r = hub.db().write(p, stamp(v), { now: hub.now() }); if (!r.allowed) throw no('write', p, r.info); return base.set(p, v); },
    update: async (p, patch) => { checked(p, patch); return base.update(p, patch); },
    on: (p, cb, onError) => { if (!hub.db().read(p).allowed) { onError?.(no('listen', p)); return () => {}; } return base.on(p, cb); },
    onDisconnectUpdate: (p, patch) => { onDrop = [p, patch]; },
    // The server applies a disconnect write under the same rules as any other.
    drop: async () => { if (!onDrop) return; const [p, patch] = onDrop; onDrop = null; checked(p, patch); return base.update(p, patch); },
  };
}

// ---------- one scripted game, on whichever kind of store ----------
async function playGame(makeHub, makeStore) {
  const hub = makeHub();
  const hostStore = makeStore(hub), hostMe = makeIdentity();
  const code = await createRoom(hostStore, hostMe, { rounds: 4, secs: 20 });
  assert.ok(validCode(code));
  assert.equal(await findRoom(hostStore, code), hostMe.pid);

  const errors = [];
  const host = new Host(hostStore, code, hostMe, { data, known, onError: (e) => errors.push(e) });
  const ids = { ana: makeIdentity(), ben: makeIdentity(), cy: makeIdentity() };
  const stores = {}, players = {};
  for (const name of Object.keys(ids)) {
    stores[name] = makeStore(hub);
    players[name] = new Player(stores[name], code, ids[name]);
    await players[name].join(name === 'cy' ? 'Ana' : name[0].toUpperCase() + name.slice(1));
  }
  await settle();
  // Two people typed "Ana": the second becomes "Ana 2".
  assert.deepEqual(Object.values(host.room.players).map((p) => p.name).sort(), ['Ana', 'Ana 2', 'Ben']);
  assert.equal(host.room.state.phase, 'lobby');
  assert.equal(hub.read(path(code, 'pub', 'live')), true);

  await host.start();
  await settle();
  const totals = { ana: 0, ben: 0, cy: 0 };
  for (let i = 0; i < 4; i++) {
    const s = host.room.state;
    assert.equal(s.phase, 'guess');
    assert.equal(s.i, i);
    assert.deepEqual(s.q, host.questions[i]);
    const t = E.truth(data, s.q);
    // Ana always knows the answer, Ben is always 10 off (or wrong), Cy does not answer round 2.
    const answers = s.q.t === 'duel' ? { ana: t.right, ben: t.right === 'a' ? 'b' : 'a', cy: t.right } : { ana: t.v, ben: Math.max(0, t.v - 10), cy: Math.min(100, t.v + 20) };
    if (i === 1) delete answers.cy;
    for (const [name, v] of Object.entries(answers)) assert.equal(await players[name].submit(v), true);
    assert.equal(await players.ana.submit(0), false, 'a second answer is not accepted');
    await settle();
    assert.equal(Object.keys(host.guesses).length, Object.keys(answers).length);
    assert.equal(players.ben.all, null, 'a player screen does not show the other answers before the reveal');

    // Everyone here has answered (or the clock runs out): the host reveals.
    host.tick();
    await settle();
    if (i === 1) { assert.equal(host.room.state.phase, 'guess'); hub.advance(20000 + GRACE_MS + 10); host.tick(); await settle(); }
    else { hub.advance(1000); host.tick(); await settle(); }
    const r = host.room.state;
    assert.equal(r.phase, 'reveal');
    for (const name of Object.keys(totals)) totals[name] += E.score(s.q, answers[name] ?? null, t);
    for (const name of Object.keys(totals)) assert.equal(host.room.scores[ids[name].pid].s, totals[name]);
    assert.equal(r.ans.n, Object.keys(answers).length);
    assert.equal(Object.keys(players.ben.all).length, Object.keys(answers).length);

    // The game moves on by itself after the reveal has been up for a while.
    host.tick(); await settle();
    assert.equal(host.room.state.phase, 'reveal');
    hub.advance(REVEAL_MS + 10); host.tick(); await settle();
  }
  assert.equal(host.room.state.phase, 'final');
  assert.equal(host.room.scores[ids.ana.pid].r, 1);
  assert.equal(host.room.scores[ids.ana.pid].s, E.totalMax(host.questions));
  assert.equal(host.room.final.players, 3);
  assert.equal(host.room.final.awards.sharp.name, 'Ana');
  assert.equal(players.cy.room.final.awards.sharp.name, 'Ana');

  // Another game with the same people deals different questions.
  const first = host.questions;
  await host.again(); await settle();
  assert.equal(host.room.state.phase, 'lobby');
  assert.deepEqual(host.room.scores, {});
  await host.start(); await settle();
  assert.equal(host.room.state.key, 'g2r0');
  assert.notDeepEqual(host.questions, first);
  assert.deepEqual(errors, []);
  return { hub, host, hostStore, hostMe, players, stores, ids, code };
}

test('codes are four consonants, typed codes are tidied, identities are well-formed', () => {
  assert.equal(normalCode(' kx-pt9z '), 'KXPT');
  assert.ok(!validCode('KXP'));
  assert.deepEqual(cleanCfg({ rounds: 99, secs: 1, region: 'mars', topics: 'water,nonsense,food' }), { rounds: 12, secs: 10, region: 'world', topics: 'water,food', auto: true, hostPlays: false, email: true, locked: false, max: 60 });
  assert.ok(validIdentity(makeIdentity()));
  assert.ok(!validIdentity({ pid: 'short', key: 'x' }));
  assert.match(token(20), /^[A-Za-z0-9]{20}$/);
  assert.notEqual(token(20), token(20));
});

test('database.rules.json holds the rules that scripts/play-rules.mjs generates', () => {
  assert.deepEqual(rules.rules.play, JSON.parse(JSON.stringify(playRules)), 'run: node unmet/scripts/play-rules.mjs');
});

test('a full game runs from lobby to final and on to a second game', async () => {
  await playGame(() => new MockHub(), mockStore);
});

test('the host can hold a reveal, skip ahead, rename and remove players, and lock the room', async () => {
  const hub = new MockHub();
  const hostMe = makeIdentity(), a = makeIdentity(), b = makeIdentity(), c = makeIdentity(), d = makeIdentity();
  const code = await createRoom(mockStore(hub), hostMe, { rounds: 3, auto: false });
  const host = new Host(mockStore(hub), code, hostMe, { data, known });
  const ana = new Player(mockStore(hub), code, a), ben = new Player(mockStore(hub), code, b);
  await ana.join('Ana'); await ben.join('Ben'); await settle();
  await host.rename(b.pid, 'Benedict'); await settle();
  assert.equal(ana.room.players[b.pid].name, 'Benedict');
  await host.start(); await settle();
  await host.skip(); await settle();
  assert.equal(host.room.state.phase, 'reveal');
  assert.equal(host.room.state.next, undefined, 'with auto off the game waits for the host');
  hub.advance(REVEAL_MS * 3); host.tick(); await settle();
  assert.equal(host.room.state.phase, 'reveal');
  await host.skip(); await settle();
  assert.equal(host.room.state.i, 1);

  await host.kick(b.pid); await settle();
  assert.equal(ben.room.kicked[b.pid], true);
  assert.equal(host.room.players[b.pid], undefined);
  await assert.rejects(new Player(mockStore(hub), code, b).join('Ben again'), { code: 'kicked' });
  await host.setCfg({ locked: true }); await settle();
  await assert.rejects(new Player(mockStore(hub), code, c).join('Cy'), { code: 'locked' });
  await assert.rejects(new Player(mockStore(hub), 'ZZZZ', c).join('Cy'), { code: 'not-found' });
  await host.setCfg({ locked: false }); await settle();
  await assert.rejects(new Player(mockStore(hub), code, c).join('   '), { code: 'name' });

  // A player whose phone drops, or who leaves, is not waited for.
  const dee = new Player(mockStore(hub), code, d);
  await dee.join('Dee'); await settle();
  dee.store.drop(); await settle();
  assert.equal(host.room.players[d.pid].on, false);
  await ana.submit(host.room.state.q.t === 'duel' ? 'a' : 50); await settle();
  host.tick(); hub.advance(1000); host.tick(); await settle();
  assert.equal(host.room.state.phase, 'reveal');
  await ana.leave(); await settle();
  assert.deepEqual(present(host.room).map(([, p]) => p.name), ['Dee']);
});

test('a host who reloads carries on with the same questions', async () => {
  const hub = new MockHub(), hostMe = makeIdentity();
  const code = await createRoom(mockStore(hub), hostMe, { rounds: 5 });
  const one = new Host(mockStore(hub), code, hostMe, { data, known });
  const ana = new Player(mockStore(hub), code, makeIdentity());
  await ana.join('Ana'); await settle();
  await one.start(); await settle();
  await one.skip(); await settle(); await one.skip(); await settle();
  const before = one.questions;
  one.dispose();
  const two = new Host(mockStore(hub), code, hostMe, { data, known });
  await settle();
  assert.deepEqual(two.questions, before);
  assert.equal(two.room.state.i, 1);
  assert.deepEqual(two.room.state.q, before[1]);
});

test('the same game passes the security rules, and the rules refuse what they should', { skip: !targaryen && 'install targaryen to check database.rules.json' }, async () => {
  const { hub, host, hostMe, stores, players, ids, code } = await playGame(() => new RulesHub(), rulesStore);
  const s = hub.read(path(code, 'pub', 'state'));
  assert.equal(s.phase, 'guess');
  const eve = rulesStore(hub), evil = makeIdentity();
  const room = path(code);
  const refused = (p) => assert.rejects(p, /PERMISSION_DENIED/);
  const proof = (key, w = token(20)) => ({ w, px: { [`sec/px/${w}`]: key } });

  // The secret half of a room cannot be read: not the host key, not player keys, not used proofs.
  await refused(eve.get(path(code, 'sec')));
  await refused(eve.get(path(code, 'sec', 'hk')));
  await refused(eve.get(path(code, 'sec', 'pk', ids.ana.pid)));
  await refused(eve.get(path(code)));
  await refused(eve.get('play/rooms'));
  assert.equal((await eve.get(path(code, 'pub'))).host, hostMe.pid);

  // A stranger cannot run the game, even copying the host's last proof number or inventing one.
  const hw = hub.read(path(code, 'pub', 'hw'));
  await refused(eve.update(room, { 'pub/state/phase': 'final' }));
  await refused(eve.update(room, { 'pub/state/phase': 'final', 'pub/hw': hw }));
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { 'pub/state/phase': 'final', 'pub/hw': w, ...px })); }
  { const { w } = proof(evil.key); await refused(eve.update(room, { 'pub/state/phase': 'final', 'pub/hw': w })); }
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { 'pub/cfg/rounds': 3, 'pub/hw': w, ...px })); }
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`pub/scores/${evil.pid}`]: { s: 9999 }, 'pub/hw': w, ...px })); }
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`pub/kicked/${ids.ana.pid}`]: true, 'pub/hw': w, ...px })); }
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { 'pub/live': false, 'pub/hw': w, ...px })); }
  // Nor replace the host's key, nor overwrite or delete a proof, nor take over a room that is in use.
  await refused(eve.set(path(code, 'sec', 'hk'), evil.key));
  await refused(eve.set(path(code, 'sec', 'px', hw), evil.key));
  await refused(eve.set(path(code, 'sec', 'px', hw), null));
  await refused(eve.set(path(code, 'sec', 'pk', ids.ana.pid), evil.key));
  await refused(eve.set(path(code, 'pub', 'host'), evil.pid));
  await refused(eve.set(room, { pub: { host: evil.pid, created: TS, live: true, cfg: cleanCfg(), state: { phase: 'lobby' } }, sec: { hk: evil.key } }));
  await refused(eve.update(room, { 'pub/created': TS, 'sec/hk': evil.key }));

  // A player's entry can be changed only by someone who knows that player's key.
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`pub/players/${ids.ana.pid}/name`]: 'Hacked', [`pub/players/${ids.ana.pid}/w`]: w, ...px })); }
  await refused(eve.update(room, { [`pub/players/${ids.ana.pid}/name`]: 'Hacked' }));
  await refused(eve.update(room, { [`pub/players/${ids.ana.pid}/name`]: 'Hacked', [`pub/players/${ids.ana.pid}/w`]: hub.read(path(code, 'pub', 'players', ids.ana.pid, 'w')) }));
  await refused(eve.set(path(code, 'pub', 'players', ids.ana.pid), null));
  await refused(eve.set(path(code, 'pub', 'players'), null));
  await refused(eve.set(path(code, 'pub'), null));
  // Joining needs a well-formed entry and a claimed key.
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`pub/players/${evil.pid}`]: { name: 'Eve', at: TS, w }, ...px })); } // key not claimed
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`sec/pk/${evil.pid}`]: evil.key, [`pub/players/${evil.pid}`]: { name: 'x'.repeat(21), at: TS, w }, ...px })); }
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`sec/pk/${evil.pid}`]: evil.key, [`pub/players/${evil.pid}`]: { name: 'Eve', at: TS, w, admin: true }, ...px })); }
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`sec/pk/${evil.pid}`]: evil.key, [`pub/players/${evil.pid}`]: { name: 'Eve', at: hub.now() + 99999, w }, ...px })); }
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`sec/pk/bad pid!`]: evil.key, [`pub/players/bad pid!`]: { name: 'Eve', at: TS, w }, ...px })); }

  // Answers: your own, once, in range, only while the round is open, only if you are in the room.
  const guess = (who, v, key = s.key, extra = {}) => { const { w, px } = proof(who.key); return { [`pub/guesses/${key}/${who.pid}`]: { v, at: TS, w, ...extra }, ...px }; };
  await refused(eve.update(room, guess(evil, 50))); // not in the room
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`pub/guesses/${s.key}/${ids.ben.pid}`]: { v: 50, at: TS, w }, ...px })); } // someone else's
  await refused(stores.ana.update(room, guess(ids.ana, 101)));
  await refused(stores.ana.update(room, guess(ids.ana, 'c')));
  await refused(stores.ana.update(room, guess(ids.ana, 50, 'g2r3')));
  await refused(stores.ana.update(room, guess(ids.ana, 50, s.key, { cheat: 1 })));
  await refused(stores.ana.update(room, { [`pub/guesses/${s.key}/${ids.ana.pid}`]: { v: 50, at: hub.now() - 60000, w: token(20) } })); // no proof
  assert.equal(await players.ana.submit(50), true);
  await refused(stores.ana.update(room, guess(ids.ana, 51)));
  await refused(stores.ana.set(path(code, 'pub', 'guesses', s.key, ids.ana.pid), null));
  // A proof number works once: replaying one is refused.
  { const used = hub.read(path(code, 'pub', 'guesses', s.key, ids.ana.pid, 'w')); await refused(stores.ana.update(room, { [`pub/players/${ids.ana.pid}/name`]: 'Again', [`pub/players/${ids.ana.pid}/w`]: used, [`sec/px/${used}`]: ids.ana.key })); }

  // Rooms cannot be invented under odd names, or half-made, and nothing else can be written under play/.
  const fresh = (me) => ({ pub: { host: me.pid, created: TS, live: true, cfg: cleanCfg(), state: { phase: 'lobby', game: 1 } }, sec: { hk: me.key } });
  await refused(eve.set('play/rooms/toolong', fresh(evil)));
  await refused(eve.set('play/rooms/qqqq', fresh(evil)));
  await refused(eve.set('play/rooms/QQQQ', { pub: fresh(evil).pub }));
  await refused(eve.set('play/rooms/QQQQ', { ...fresh(evil), pub: { ...fresh(evil).pub, created: hub.now() - 5 } }));
  await refused(eve.set('play/rooms/QQQQ/pub/players/x', { name: 'Eve', at: TS, w: token(20) }));
  await refused(eve.set('play/rooms/QQQQ/sec/px/' + token(20), evil.key));
  await refused(eve.set('play/junk', true));
  await refused(eve.set(path(code, 'junk'), true));
  await refused(eve.set(path(code, 'sec', 'junk'), true));

  // The host's own controls pass, and a removed player is locked out for good.
  await host.rename(ids.cy.pid, 'Cyrus'); await host.kick(ids.ben.pid); await settle();
  assert.equal(hub.read(path(code, 'pub', 'players', ids.cy.pid, 'name')), 'Cyrus');
  assert.equal(hub.read(path(code, 'pub', 'players', ids.ben.pid)), null);
  await assert.rejects(new Player(stores.ben, code, ids.ben).join('Ben'), { code: 'kicked' });
  { const { w, px } = proof(ids.ben.key); await refused(stores.ben.update(room, { [`pub/players/${ids.ben.pid}`]: { name: 'Ben', at: TS, w }, ...px })); }
  await refused(stores.ben.update(room, guess(ids.ben, 40)));
  // A locked room takes no new players, but someone already in can still reconnect and leave.
  await host.setCfg({ locked: true }); await settle();
  { const { w, px } = proof(evil.key); await refused(eve.update(room, { [`sec/pk/${evil.pid}`]: evil.key, [`pub/players/${evil.pid}`]: { name: 'Eve', at: TS, w }, ...px })); }
  await players.cy.write({ on: true });
  // A dropped connection marks the player away (the server runs that write under the same rules).
  await stores.cy.drop(); await settle();
  assert.equal(host.room.players[ids.cy.pid].on, false);
  await players.cy.leave(); await settle();
  assert.equal(host.room.players[ids.cy.pid].left, true);
  await host.setCfg({ locked: false }); await settle();
  await new Player(eve, code, evil).join('Eve'); await settle();
  assert.equal(host.room.players[evil.pid].name, 'Eve');

  // A room idle for more than a day can be claimed by a new host, and is wiped when it is.
  hub.advance(25 * 3600 * 1000);
  const w = token(20);
  await eve.set(room, { pub: { ...fresh(evil).pub, hw: w }, sec: { hk: evil.key, px: { [w]: evil.key } } });
  assert.equal(hub.read(path(code, 'pub', 'host')), evil.pid);
  assert.equal(hub.read(path(code, 'pub', 'players')), null);
});
