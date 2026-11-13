import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, summarize, peers, lens, people, percent, needsIn } from '../src/model.js';

// A tiny hand-made snapshot. 2014..2023, index 0 = 2014.
const y0 = 2014;
const line = (from, step, n = 10) => Array.from({ length: n }, (_, i) => Math.round((from + step * i) * 10) / 10);
const data = {
  countries: { AAA: {}, BBB: {}, CCC: {}, DDD: {}, EEE: {}, FFF: {} },
  pop: { y0: 2014, y1: 2023, v: Object.fromEntries(['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF'].map((k) => [k, Array(10).fill(10_000)])) }, // 10 million each
  series: {
    electricity: {
      y0, y1: 2023,
      v: {
        AAA: line(99.2, 0.05),                 // met throughout
        BBB: line(50, 2),                      // 50 -> 68, +2 a year
        CCC: line(60, -1),                     // going backwards
        DDD: [70, null, null, null, null, null, null, null, null, 70.05], // flat
        FFF: [30, 40, 60, 80, 95, 99.5, 99.6, 99.7, 99.8, 99.9], // was low, reached the goal
      },
    },
    survival: { y0, y1: 2023, v: { BBB: line(80, -4), AAA: line(6, -0.1) } }, // deaths per 1,000
    poverty: { y0, y1: 2023, v: { BBB: [null, null, null, null, null, null, null, null, 30, 28] } }, // too few to read a pace
  },
};

test('a need above its goal is met, with the year it has held since', () => {
  const a = assess(data, 'electricity', 'FFF', 2026);
  assert.equal(a.state, 'met');
  assert.equal(a.since, 2019);
  assert.equal(a.people, null);
  assert.equal(assess(data, 'electricity', 'AAA', 2026).since, null); // met for as long as we have data
});

test('a closing gap gets a head-count and a straight-line arrival year', () => {
  const a = assess(data, 'electricity', 'BBB', 2026);
  assert.equal(a.state, 'closing');
  assert.equal(a.value, 68);
  assert.equal(a.people, 3_200_000); // 32% of 10 million
  assert.ok(Math.abs(a.pace - 2) < 1e-6);
  assert.equal(a.arrival, 2039); // 31 points left at 2 a year, from 2023 -> 2038.5, rounded up
});

test('backwards, flat and too-few-readings are all "not closing", each with its reason', () => {
  assert.deepEqual([assess(data, 'electricity', 'CCC').state, assess(data, 'electricity', 'CCC').reason], ['stuck', 'backwards']);
  assert.equal(assess(data, 'electricity', 'DDD').reason, 'flat');
  assert.equal(assess(data, 'poverty', 'BBB').reason, 'few');
});

test('a pace that arrives after 2100 is not counted as closing', () => {
  const slow = structuredClone(data);
  slow.series.electricity.v.BBB = line(20, 0.2);
  assert.equal(assess(slow, 'electricity', 'BBB').reason, 'century');
});

test('an arrival year already behind us is reported as due, never as a past year', () => {
  const near = structuredClone(data);
  near.series.electricity.v.BBB = line(89.9, 1); // 98.9 in 2023, one more year needed
  const a = assess(near, 'electricity', 'BBB', 2026);
  assert.equal(a.arrival, 2026);
  assert.equal(a.due, true);
});

test('old or missing readings are "not measured", never guessed', () => {
  const s = structuredClone(data);
  s.series.electricity.y0 = 2000; s.series.electricity.v.EEE = [40]; // a single reading from 2000
  assert.equal(assess(s, 'electricity', 'EEE').reason, 'stale');
  assert.equal(assess(data, 'survival', 'CCC').reason, 'never');
  assert.equal(assess(data, 'survival', 'CCC').state, 'none');
});

test('rates (deaths per 1,000) use their own goal and carry no head-count', () => {
  const a = assess(data, 'survival', 'BBB', 2026);
  assert.equal(a.state, 'closing');
  assert.equal(a.value, 44);
  assert.equal(a.people, null);
  assert.equal(a.arrival, 2028); // 19 to go at 4 a year
  assert.equal(assess(data, 'survival', 'AAA').state, 'met');
});

test('the summary counts add up to the needs in the snapshot', () => {
  const s = summarize(data, 'BBB', 2026);
  assert.equal(s.total, needsIn(data).length);
  assert.equal(s.met + s.closing + s.stuck + s.none, s.total);
  assert.deepEqual([s.closing, s.stuck, s.unmet], [2, 1, 3]);
});

test('peers: only countries that stood at this level or worse, fastest first', () => {
  const list = peers(data, 'electricity', 'BBB');
  assert.equal(list[0].id, 'FFF');
  assert.equal(list[0].reached, true);
  assert.deepEqual([list[0].fromYear, list[0].toYear, list[0].years], [2016, 2019, 3]); // last at <=68% in 2016 (60%), reached 99% in 2019
  assert.ok(!list.some((p) => p.id === 'AAA')); // never stood where BBB stands
  assert.deepEqual(peers(data, 'electricity', 'AAA'), []); // nothing to show for a met need
});

test('the map lens runs from 0 (met) towards 1, and is null where unmeasured', () => {
  const l = lens(data, 'electricity', 2026);
  assert.equal(l.AAA, 0);
  assert.ok(l.CCC > l.BBB && l.BBB > 0 && l.CCC <= 1);
  assert.equal(l.EEE, null); // no reading at all
  const all = lens(data, null, 2026);
  assert.equal(all.AAA, 0);
  assert.equal(all.BBB, 1);
});

test('numbers are rounded honestly in both languages', () => {
  assert.equal(people(83_214_000), '83 million');
  assert.equal(people(3_240_000), '3.2 million');
  assert.equal(people(3_240_000, 'fr'), '3,2 millions');
  assert.equal(people(1_420_000_000), '1.42 billion');
  assert.equal(people(48_300), '48,000');
  assert.equal(percent(68.24), '68%');
  assert.equal(percent(98.76), '98.8%');
  assert.equal(percent(2.5, 'fr'), '2,5 %');
});
