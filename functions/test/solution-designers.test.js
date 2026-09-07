const { test } = require('node:test');
const assert = require('node:assert/strict');
const { solutionDesignerCount, homeDesignerCount } = require('../lib/solution-designers');

test('featured cards preserve the count when private membership is omitted', () => {
  assert.equal(homeDesignerCount({ publicDesignerCount: 7 }), 7);
  assert.equal(homeDesignerCount({ publicDesignerCount: 0 }), 0);
});
test('counts authors and all team membership formats once, excluding evaluators', () => {
  assert.equal(solutionDesignerCount({
    authorEmail: ' Author@example.com ', ownerEmail: 'owner@example.com',
    participants: { uid: 'AUTHOR@example.com', 'person@example.com': true },
    participantsHolder: [{ name: 'person@example.com' }, { name: 'Display Name', email: 'second@example.com' }],
    chosenAdmins: [{ authorEmail: 'admin@example.com' }],
    teamMemberEmails: ['second@example.com', 'team@example.com'],
    evaluators: [{ email: 'evaluator@example.com' }],
  }), 6);
});
test('supports array participants and ignores malformed identities', () => {
  assert.equal(solutionDesignerCount({participants: ['a@example.com', {name: 'b@example.com'}, null, {}, '']}), 2);
  assert.equal(solutionDesignerCount({ authorEmail: 'a@example.com' }), 1);
  assert.equal(solutionDesignerCount({}), 0);
});
test('full-document fallback works when no public count is supplied', () => {
  assert.equal(homeDesignerCount({ authorEmail: 'a@example.com', publicDesignerCount: null }), 1);
});
