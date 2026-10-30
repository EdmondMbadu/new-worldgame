// Uses only a disposable demo project; never production Firebase credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const project = 'demo-community-starter';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8198') throw new Error('Run scripts/test-community-starter-rules.mjs.');
const prefix = `projects/${project}/databases/(default)/documents`;
const base = `http://127.0.0.1:8198/v1/${prefix}`;
const encode = value => typeof value === 'string' ? { stringValue: value }
  : typeof value === 'boolean' ? { booleanValue: value }
  : typeof value === 'number' ? { integerValue: String(value) }
  : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } }
  : { mapValue: { fields: fields(value) } };
const fields = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]));
const token = uid => `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({
  aud: project, iss: `https://securetoken.google.com/${project}`, sub: uid, user_id: uid,
  email: `${uid}@example.test`, email_verified: true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
  firebase: { sign_in_provider: 'password' },
})).toString('base64url')}.`;
const headers = uid => ({ 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) });
const get = (path, uid) => fetch(`${base}/${path}`, { headers: headers(uid), signal: AbortSignal.timeout(15000) });

test('the create-only handoff works under the unchanged production rules and is private immediately', async () => {
  const markerPath = 'users/owner/communityStarterHandoffs/draft-1';
  // Missing marker reads are permitted under the existing user-document rules.
  assert.equal((await get(markerPath, 'owner')).status, 404);
  // This is why the starter cannot read a nonexistent solution in its transaction.
  assert.equal((await get('solutions/never-created', 'owner')).status, 403);
  const solution = {
    solutionId: 'starter-smoke', ownerAccountId: 'owner', authorAccountId: 'owner',
    ownerEmail: 'owner@example.test', authorEmail: 'owner@example.test',
    title: 'A community problem', description: 'A test draft', isPrivate: true,
    communityVisibility: 'private', feedEligible: false, feedStatus: 'in-development',
    participants: [{ name: 'owner@example.test' }], teamMemberEmails: ['owner@example.test'],
    solutionAdminEmails: ['owner@example.test'], evaluators: [], sdgs: [],
    status: { 'S1-A': '<p>A problem reported by the author.</p>', 'S4-N': '<p>Speak with five residents.</p>' },
    starterOrigin: { draftId: 'draft-1', version: 1, isFirstPass: true, source: 'author-input' },
  };
  const commit = await fetch(`${base}:commit`, { method: 'POST', headers: headers('owner'), signal: AbortSignal.timeout(15000), body: JSON.stringify({ writes: [
    { update: { name: `${prefix}/solutions/starter-smoke`, fields: fields(solution) } },
    { update: { name: `${prefix}/${markerPath}`, fields: fields({ ownerUid: 'owner', draftId: 'draft-1', solutionId: 'starter-smoke' }) } },
  ] }) });
  assert.equal(commit.status, 200, await commit.text());
  assert.equal((await get('solutions/starter-smoke', 'owner')).status, 200);
  assert.equal((await get('solutions/starter-smoke', 'outsider')).status, 403);
  assert.equal((await get('solutions/starter-smoke')).status, 403);
  const saved = await (await get(markerPath, 'owner')).json();
  assert.equal(saved.fields.solutionId.stringValue, 'starter-smoke');
});
