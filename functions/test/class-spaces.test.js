const test = require('node:test');
const assert = require('node:assert/strict');
const { parseClassSetup, canReadClassSpace } = require('../lib/class-spaces-core');
const setup = { classId: 'abcdefghijklmnopqrst', name: ' Climate design ', institutionName: ' University ', courseCode: 'ENV 101', term: 'Fall 2026', description: 'Build a better city.' };
test('normalizes a class without creating a school identity', () => {
  const parsed = parseClassSetup(setup);
  assert.equal(parsed.name, 'Climate design'); assert.equal(parsed.institutionName, 'University'); assert.equal(parsed.schoolId, '');
});
test('requires a class and institution, including rejecting whitespace and oversized fields', () => {
  for (const bad of [{ name: '  ' }, { institutionName: ' ' }, { name: 'x'.repeat(141) }, { description: 'x'.repeat(3001) }, { classId: '../someone-else' }]) {
    assert.throws(() => parseClassSetup({ ...setup, ...bad }));
  }
});
test('independent educators need no institutional identity', () => {
  const parsed = parseClassSetup({ ...setup, institutionName: '', independentEducator: true });
  assert.equal(parsed.independentEducator, true); assert.equal(parsed.institutionName, '');
});
const page = { classSetupVersion: 1, isPrivate: true, authorId: 'teacher', participants: ['student@example.test'], adminUids: ['assistant'], adminEmails: ['assistant2@example.test'] };
test('private classes are withheld from outsiders, even with only a matching email and no session', () => {
  assert.equal(canReadClassSpace(page), false);
  assert.equal(canReadClassSpace(page, 'outsider', 'other@example.test'), false);
  assert.equal(canReadClassSpace(page, '', 'student@example.test'), false);
});
test('private classes admit their owner, assistants, participants, and platform administrators', () => {
  for (const args of [['teacher'], ['assistant'], ['assistant2', 'ASSISTANT2@example.test'], ['student', 'STUDENT@example.test'], ['platform-admin', '', true]]) assert.equal(canReadClassSpace(page, ...args), true);
});
test('explicitly public classes and legacy challenge spaces remain discoverable', () => {
  assert.equal(canReadClassSpace({ ...page, isPrivate: false }), true);
  assert.equal(canReadClassSpace({ authorId: 'legacy-owner' }), true);
});
