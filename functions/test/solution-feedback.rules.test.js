// Run with: node scripts/test-solution-feedback-rules.mjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const project = 'demo-solution-feedback';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8197') throw new Error('Use the disposable solution-feedback emulator.');
const base = `http://127.0.0.1:8197/v1/projects/${project}/databases/(default)/documents`;
const fields = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
  typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value }
    : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(v => ({ stringValue: v })) } }
      : { mapValue: { fields: fields(value) } },
]));
const token = uid => `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({
  aud: project, iss: `https://securetoken.google.com/${project}`, sub: uid, user_id: uid,
  email: `${uid}@example.test`, email_verified: true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
  firebase: { sign_in_provider: 'password' },
})).toString('base64url')}.`;
const request = (path, uid, method = 'GET', data) => fetch(base + path, {
  method, headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${uid === 'seed' ? 'owner' : token(uid)}` } : {}) },
  ...(data ? { body: JSON.stringify({ fields: fields(data) }) } : {}),
});
const feedback = { evaluatorName: 'Evaluator', evaluatorKey: 'evaluator', evaluatorAvatar: '/assets/evaluator.png',
  feedbackText: 'Clarify implementation roles.', feedbackParsed: { scores: [], improvements: [] }, timestamp: Date.now() };

test('saved feedback follows parent solution privacy and validates both creates and updates', async () => {
  for (const uid of ['member', 'outsider', 'admin']) {
    assert.equal((await request(`/users/${uid}`, 'seed', 'PATCH', { email: `${uid}@example.test`, role: uid === 'admin' ? 'admin' : 'individual' })).status, 200);
  }
  for (const [id, isPrivate] of [['community', false], ['private', true], ['invalid', false]]) {
    assert.equal((await request(`/solutions/${id}`, 'seed', 'PATCH', { isPrivate, teamMemberEmails: ['member@example.test'] })).status, 200);
  }
  const path = '/solutions/private/aiFeedback/latest';
  assert.equal((await request('/solutions/invalid/aiFeedback/latest', 'member', 'PATCH', { ...feedback, feedbackText: '' })).status, 403);
  assert.equal((await request('/solutions/invalid/aiFeedback/latest', 'member', 'PATCH', { ...feedback, timestamp: 'invalid' })).status, 403);
  // A missing optional feedback document is a legitimate 404, not permission denied.
  assert.equal((await request(path, 'member')).status, 404);
  assert.equal((await request(path, 'outsider')).status, 403);
  assert.equal((await request(path, 'member', 'PATCH', feedback)).status, 200);
  assert.equal((await request(path, 'member')).status, 200);
  assert.equal((await request(path, 'admin')).status, 200);
  assert.equal((await request(path, 'outsider')).status, 403);
  assert.equal((await request(path)).status, 403);
  assert.equal((await request(path, 'outsider', 'PATCH', feedback)).status, 403);
  assert.equal((await request(path, 'member', 'PATCH', { ...feedback, feedbackText: '' })).status, 403);
  assert.equal((await request(path, 'member', 'PATCH', { ...feedback, unexpectedField: 'invalid' })).status, 403);
  assert.equal((await request(path, 'member', 'PATCH', { ...feedback, feedbackParsed: 'invalid' })).status, 403);
  assert.equal((await request(path, 'member', 'PATCH', { ...feedback, feedbackText: 'Updated feedback.' })).status, 200);
  assert.equal((await request(path, 'member', 'DELETE')).status, 403);
  assert.equal((await request('/solutions/private/aiFeedback/arbitrary', 'member', 'PATCH', feedback)).status, 403);
  assert.equal((await request('/solutions/missing/aiFeedback/latest', 'member', 'PATCH', feedback)).status, 403);
  assert.equal((await request('/solutions/community/aiFeedback/latest', 'outsider', 'PATCH', feedback)).status, 200);
  assert.equal((await request('/solutions/community/aiFeedback/latest', 'outsider')).status, 200);
  assert.equal((await request('/solutions/community/aiFeedback/latest')).status, 403);
  assert.equal((await request('/solutions/community/aiFeedback/invalid', 'outsider', 'PATCH', { ...feedback, timestamp: 'invalid' })).status, 403);
});
