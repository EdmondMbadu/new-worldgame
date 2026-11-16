// npm run build && node --test test/play.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildLeadEmail, signupLink, playLink, safeName, validLead } = require('../lib/play-core');

const lead = { pid: 'Ab12Cd34Ef56', room: 'KXPT', email: 'ana@example.com', name: 'Ana', lang: 'en', score: 412, max: 600, rank: 2, of: 14, view: 'pessimist', by: 12 };

test('a lead must have a real-looking email, a player id and a room', () => {
  assert.ok(validLead(lead));
  assert.ok(validLead({ ...lead, room: 'SOLO20261116' }));
  assert.ok(!validLead({ ...lead, email: 'not an email' }));
  assert.ok(!validLead({ ...lead, email: 'a@b' }));
  assert.ok(!validLead({ ...lead, room: 'kxpt' }));
  assert.ok(!validLead({ ...lead, pid: '../../x' }));
  assert.ok(!validLead(undefined));
});

test('names cannot carry markup or links into the message', () => {
  assert.equal(safeName('  Ana   María  '), 'Ana María');
  assert.equal(safeName('<a href="http://evil.example">x</a>'), 'a hrefhttpevilexampl');
  assert.equal(safeName('visit evil.example/now'), 'visit evilexamplenow');
  assert.equal(safeName('Jean-Luc O’Neil'), 'Jean-Luc O’Neil');
  assert.equal(safeName(null), '');
  const mail = buildLeadEmail({ ...lead, name: '<script>alert(1)</script>' });
  assert.ok(!mail.html.includes('<script>'));
});

test('the sign-up link carries the name and email, and never leaves our own site', () => {
  const url = new URL(signupLink(lead, {}));
  assert.equal(url.origin, 'https://globalsolutionlab.com');
  assert.equal(url.pathname, '/signup');
  assert.equal(url.searchParams.get('name'), 'Ana');
  assert.equal(url.searchParams.get('email'), 'ana@example.com');
  assert.equal(new URL(signupLink(lead, { joinHost: 'newworld-game.org', signupUrl: '/signup?plan=free' })).href, 'https://newworld-game.org/signup?plan=free&name=Ana&email=ana%40example.com&from=play');
  assert.equal(new URL(signupLink(lead, { signupUrl: 'https://evil.example/phish' })).origin, 'https://globalsolutionlab.com');
  assert.equal(new URL(signupLink(lead, { joinHost: 'javascript:alert(1)' })).origin, 'https://globalsolutionlab.com');
  assert.equal(playLink({}), 'https://globalsolutionlab.com/play');
  assert.equal(playLink({ shortLinks: false, joinHost: 'newworld-game.org' }), 'https://newworld-game.org/unmet/play/');
});

test('the message reports the result in the player’s language', () => {
  const en = buildLeadEmail(lead, { name: 'Out of 100' });
  assert.equal(en.subject, 'Your Out of 100 result: 412/600');
  assert.match(en.text, /Hi Ana,/);
  assert.match(en.text, /You scored 412 out of 600\. You finished 2nd of 14\. Your guesses pictured the world 12 points worse than it is\./);
  assert.match(en.html, /Create your free account/);
  const fr = buildLeadEmail({ ...lead, lang: 'fr', rank: 1 }, { name: 'Out of 100', nameFr: 'Sur 100' });
  assert.equal(fr.subject, 'Votre résultat à Sur 100 : 412/600');
  assert.match(fr.text, /Vous terminez 1er sur 14\./);
  const solo = buildLeadEmail({ ...lead, room: 'SOLO20261116', rank: 0, of: 0, name: '' });
  assert.match(solo.text, /^Hi,/);
  assert.ok(!/finished/.test(solo.text));
  assert.match(buildLeadEmail({ ...lead, rank: 11 }).text, /11th of 14/);
  assert.match(buildLeadEmail({ ...lead, rank: 3 }).text, /3rd of 14/);
});
