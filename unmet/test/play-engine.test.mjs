// The game's rules: what gets asked, what counts as right, who wins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { needById } from '../src/needs.js';
import * as E from '../src/play/engine.js';

const at = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const real = at('data/unmet.json');
const data = JSON.parse(readFileSync(existsSync(real) ? real : at('data/sample.json'), 'utf8'));
const geo = JSON.parse(readFileSync(at('data/geo/map.json'), 'utf8'));
const known = new Set(geo.countries.map((c) => c.id));

test('the same seed deals the same game, a different seed a different one', () => {
  const a = E.makeGame(data, known, { seed: 'KXPT:1', rounds: 6 });
  const b = E.makeGame(data, known, { seed: 'KXPT:1', rounds: 6 });
  const c = E.makeGame(data, known, { seed: 'KXPT:2', rounds: 6 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('a game has the planned shape: a head-to-head every third round, the last round worth double', () => {
  assert.deepEqual(E.plan(6).map((s) => s.t), ['pct', 'pct', 'duel', 'pct', 'pct', 'pct']);
  assert.deepEqual(E.plan(8).map((s) => s.t), ['pct', 'pct', 'duel', 'pct', 'pct', 'duel', 'pct', 'pct']);
  assert.deepEqual(E.plan(5).map((s) => s.x2), [false, false, false, false, true]);
  assert.equal(E.totalMax(E.plan(5)), 600);
});

test('every dealt question has a true answer, never repeats a country, and is one the map can draw', () => {
  for (let i = 0; i < 300; i++) {
    const game = E.makeGame(data, known, { seed: `seed-${i}`, rounds: 8 });
    assert.equal(game.length, 8);
    const places = game.flatMap((q) => (q.t === 'duel' ? [q.a, q.b] : [q.a]));
    assert.equal(new Set(places).size, places.length, `seed-${i} repeats a country`);
    for (const q of game) {
      const t = E.truth(data, q);
      assert.ok(t, `no answer for ${JSON.stringify(q)}`);
      assert.ok(known.has(q.a) && (q.t !== 'duel' || known.has(q.b)));
      if (q.t === 'pct') {
        assert.ok(t.v >= 1 && t.v <= 100, `answer out of range: ${t.v}`);
        assert.notEqual(needById[q.need].kind, 'rate');
      } else {
        const fa = E.duelFigure(q.need, t.a.v), fb = E.duelFigure(q.need, t.b.v);
        assert.notEqual(fa.n, fb.n, `a head-to-head needs a visible difference: ${JSON.stringify(q)}`);
        assert.equal(t.right, fa.n > fb.n ? 'a' : 'b');
      }
    }
  }
});

test('answers are spread across the scale, so always guessing high or low loses', () => {
  let low = 0, mid = 0, high = 0;
  for (let i = 0; i < 200; i++) {
    for (const q of E.makeGame(data, known, { seed: `spread-${i}`, rounds: 6 })) {
      if (q.t !== 'pct') continue;
      const { v } = E.truth(data, q);
      if (v < 35) low++; else if (v < 65) mid++; else high++;
    }
  }
  const total = low + mid + high;
  for (const share of [low / total, mid / total, high / total]) assert.ok(share > 0.15, `lopsided: ${low}/${mid}/${high}`);
});

test('a region keeps the game inside that region', () => {
  for (let i = 0; i < 40; i++) {
    for (const q of E.makeGame(data, known, { seed: `af-${i}`, rounds: 6, region: 'africa' })) {
      for (const id of q.t === 'duel' ? [q.a, q.b] : [q.a]) assert.ok(E.REGIONS.africa(data.countries[id], id), `${id} is not in Africa`);
    }
  }
});

test('topics limit which needs are asked about, and a filter too narrow to play falls back', () => {
  const game = E.makeGame(data, known, { seed: 'energy', rounds: 6, topics: ['electricity', 'cooking'] });
  assert.ok(game.every((q) => ['electricity', 'cooking'].includes(q.need)));
  assert.equal(E.makeGame(data, known, { seed: 'x', rounds: 5, topics: ['survival'] }).length, 5);
});

test('scoring: three points lost per point of error, doubled in the last round', () => {
  assert.equal(E.scorePct(62, 62), 100);
  assert.equal(E.scorePct(52, 62), 70);
  assert.equal(E.scorePct(72, 62), 70);
  assert.equal(E.scorePct(0, 62), 0);
  assert.equal(E.score({ t: 'pct', need: 'electricity', x2: true }, 60, { v: 62 }), 188);
  assert.equal(E.score({ t: 'duel', need: 'electricity' }, 'a', { right: 'a' }), 100);
  assert.equal(E.score({ t: 'duel', need: 'electricity' }, 'b', { right: 'a' }), 0);
  assert.equal(E.score({ t: 'pct', need: 'electricity' }, null, { v: 62 }), 0);
});

test('"rosy" knows which direction is good news', () => {
  // Guessing more people have electricity than really do is optimistic...
  assert.equal(E.rosy({ t: 'pct', need: 'electricity' }, 80, { v: 60 }), 20);
  // ...guessing more people are hungry than really are is pessimistic.
  assert.equal(E.rosy({ t: 'pct', need: 'food' }, 40, { v: 10 }), -30);
  assert.equal(E.rosy({ t: 'duel', need: 'food' }, 'a', { right: 'a' }), null);
  assert.equal(E.worldview(-40, 4).kind, 'pessimist');
  assert.equal(E.worldview(40, 4).kind, 'optimist');
  assert.equal(E.worldview(8, 4).kind, 'realist');
  assert.equal(E.worldview(0, 0), null);
});

test('tally keeps a running total, ranks with ties, and remembers the previous rank', () => {
  const q1 = { t: 'pct', need: 'electricity' }, t1 = { v: 50 };
  let scores = E.tally({}, ['ana', 'ben', 'cy'], q1, { ana: { v: 50 }, ben: { v: 40 } }, t1);
  assert.deepEqual([scores.ana.s, scores.ben.s, scores.cy.s], [100, 70, 0]);
  assert.deepEqual([scores.ana.r, scores.ben.r, scores.cy.r], [1, 2, 3]);
  assert.equal(scores.cy.n, 0);
  scores = E.tally(scores, ['ana', 'ben', 'cy'], { t: 'duel', need: 'water' }, { ana: { v: 'b' }, ben: { v: 'a' }, cy: { v: 'a' } }, { right: 'a' });
  assert.deepEqual([scores.ana.s, scores.ben.s, scores.cy.s], [100, 170, 100]);
  assert.deepEqual([scores.ana.r, scores.ben.r, scores.cy.r], [2, 1, 2]);
  assert.equal(scores.ben.p, 2);
  assert.equal(scores.ana.b, 0);
  assert.equal(scores.cy.b, undefined);
});

test('awards go to the sharpest guess and the rosiest and gloomiest players', () => {
  const players = { a: { name: 'Ana' }, b: { name: 'Ben' }, c: { name: 'Cy' } };
  const scores = { a: { s: 300, o: 60, c: 3, b: 0 }, b: { s: 200, o: -45, c: 3, b: 4 }, c: { s: 100, o: 3, c: 3, b: 9 } };
  const won = E.awards(scores, players);
  assert.equal(won.sharp.name, 'Ana');
  assert.equal(won.optimist.name, 'Ana');
  assert.equal(won.pessimist.name, 'Ben');
  assert.equal(won.room.kind, 'realist');
  assert.deepEqual(E.board(scores, players).map((r) => r.name), ['Ana', 'Ben', 'Cy']);
});

test('the room summary reports the average guess and who was closest', () => {
  const s = E.roundSummary({ t: 'pct' }, { a: { v: 20 }, b: { v: 60 }, c: { v: 41 } }, { v: 40 }, ['a', 'b', 'c', 'd']);
  assert.deepEqual(s, { n: 3, avg: 40, top: ['c', 'a', 'b'] });
  assert.deepEqual(E.roundSummary({ t: 'duel' }, { a: { v: 'a' }, b: { v: 'b' } }, { right: 'a' }, ['a', 'b']), { n: 2, ok: 1 });
});

test('the daily game is the same for everyone on the same UTC day', () => {
  const noon = Date.UTC(2026, 10, 20, 12), late = Date.UTC(2026, 10, 20, 23, 59), next = Date.UTC(2026, 10, 21, 0, 1);
  assert.deepEqual(E.dailyGame(data, known, noon), E.dailyGame(data, known, late));
  assert.notDeepEqual(E.dailyGame(data, known, noon), E.dailyGame(data, known, next));
  assert.equal(E.dayNumber(Date.UTC(2026, 10, 16, 5)), 1);
  assert.equal(E.dayNumber(next), 6);
  assert.equal(E.squares([{ got: 100, max: 100 }, { got: 61, max: 100 }, { got: 70, max: 200 }, { got: 0, max: 100 }]), '🟩🟨🟧🟥');
});

test('names are tidied, kept unique, and the obvious ones are refused', () => {
  assert.equal(E.cleanName('   Ana    Maria  <b> '), 'Ana Maria b');
  assert.equal(E.cleanName('x'.repeat(40)).length, 16);
  assert.equal(E.uniqueName('Sam', ['sam', 'Sam 2']), 'Sam 3');
  assert.equal(E.uniqueName('Sam', ['Ana']), 'Sam');
  assert.ok(E.nameBlocked('sh1t happens'));
  assert.ok(E.nameBlocked('  '));
  assert.ok(E.nameBlocked('Mr Teacher', ['teacher']));
  assert.ok(!E.nameBlocked('Amélie'));
  assert.ok(!E.nameBlocked('李雷')); // names in other scripts are welcome
  assert.match(E.friendlyName(), /^\w+ \w+$/);
});
