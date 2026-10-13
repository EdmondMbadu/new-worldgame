// Run against a disposable local emulator only:
// FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 node --test functions/test/class-spaces.emulator.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const admin = require('firebase-admin');
const fs = require('node:fs');
const path = require('node:path');
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') throw new Error('Use the local demo-gsl-class emulator for this test.');
admin.initializeApp({ projectId: 'demo-gsl-class' });
const accounts = new Map([
  ['teacher', { uid: 'teacher', email: 'teacher@example.test', emailVerified: true, providerData: [{ providerId: 'password' }] }],
  ['unverified', { uid: 'unverified', email: 'unverified@example.test', emailVerified: false, providerData: [{ providerId: 'password' }] }],
  ['other', { uid: 'other', email: 'other@example.test', emailVerified: true, providerData: [{ providerId: 'password' }] }],
]);
Object.defineProperty(admin, 'auth', { value: () => ({ getUser: async uid => accounts.get(uid) }), configurable: true });
const api = require('../lib/class-spaces');
const db = admin.firestore();
const id = 'abcdefghijklmnopqrst';
const ctx = uid => uid ? { auth: { uid, token: { email: `${uid}@example.test`, email_verified: uid !== 'unverified' } } } : {};
const input = { classId: id, name: 'Climate design', institutionName: 'University', term: 'Fall 2026' };
const base = 'http://127.0.0.1:8180/v1/projects/demo-gsl-class/databases/(default)/documents';
const token = uid => {
  const payload = { aud: 'demo-gsl-class', iss: 'https://securetoken.google.com/demo-gsl-class', sub: uid, user_id: uid, email: `${uid}@example.test`, email_verified: true, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600, firebase: { sign_in_provider: 'password' } };
  return `${Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`;
};
const request = (path, uid, method = 'GET', body) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const patch = (field, value, uid) => request(`/challengePages/${id}?updateMask.fieldPaths=${field}`, uid, 'PATCH', { fields: { [field]: value } });
test('class creation, discovery, retries, ownership, and actual Firestore rules', async () => {
  const loaded = await fetch('http://127.0.0.1:8180/emulator/v1/projects/demo-gsl-class:securityRules', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({rules:{files:[{name:'firestore.rules',content:fs.readFileSync(path.resolve(__dirname,'../../firestore.rules'),'utf8')}]}}) });
  assert.equal(loaded.status, 200);
  await fetch('http://127.0.0.1:8180/emulator/v1/projects/demo-gsl-class/databases/(default)/documents', { method: 'DELETE' });
  await db.doc('users/teacher').set({ role: 'individual', email: 'teacher@example.test' });
  await assert.rejects(() => api.createClassSpace.run(input, ctx()), { code: 'unauthenticated' });
  await assert.rejects(() => api.createClassSpace.run(input, ctx('unverified')), { code: 'failed-precondition' });
  await api.createClassSpace.run(input, ctx('teacher'));
  const first = (await db.doc(`challengePages/${id}`).get()).data();
  assert.equal(first.isPrivate, true); assert.equal(first.type, 'class'); assert.equal(first.authorId, 'teacher');
  assert.equal((await db.doc('users/teacher').get()).get('role'), 'individual');
  assert.equal((await db.collection('schools').get()).size, 0);
  await api.createClassSpace.run({ ...input, name: 'Retry must not overwrite edits' }, ctx('teacher'));
  assert.deepEqual((await db.doc(`challengePages/${id}`).get()).data(), first);
  await assert.rejects(() => api.createClassSpace.run(input, ctx('other')), { code: 'already-exists' });
  await assert.rejects(() => api.createClassSpace.run({ ...input, classId: 'bcdefghijklmnopqrstu', schoolId: 'not-my-school' }, ctx('teacher')), { code: 'permission-denied' });
  assert.equal((await db.doc('challengePages/bcdefghijklmnopqrstu').get()).exists, false);
  await db.doc('challengePages/legacy').set({ name: 'Legacy community', customUrl: 'legacy-space' });
  await db.doc(`challengePages/${id}`).update({ participants: ['teacher@example.test', 'student@example.test'], adminUids: ['teacher', 'assistant'], customUrl: 'climate-class' });
  assert.equal((await api.listAccessibleChallengeSpaces.run({}, ctx('other'))).pages.some(p => p.challengePageId === id), false);
  assert.equal((await api.listAccessibleChallengeSpaces.run({}, ctx('teacher'))).pages.some(p => p.challengePageId === id), true);
  assert.equal(await api.resolveAccessibleChallengeSpace.run({idOrSlug:'climate-class'}, ctx('other')), null);
  assert.equal((await api.resolveAccessibleChallengeSpace.run({idOrSlug:'climate-class'}, ctx('teacher'))).id, id);
  assert.equal((await api.resolveAccessibleChallengeSpace.run({idOrSlug:'legacy-space'}, ctx('other'))).id, 'legacy');
  assert.equal((await api.checkChallengeSpaceSlug.run({slug:'climate-class'}, ctx('teacher'))).exists, true);
  assert.equal((await request(`/challengePages/${id}`, 'teacher')).status, 200);
  assert.equal((await request(`/challengePages/${id}`, 'assistant')).status, 200);
  assert.equal((await request(`/challengePages/${id}`, 'student')).status, 200);
  assert.equal((await request(`/challengePages/${id}`, 'other')).status, 403);
  assert.equal((await request(`/challengePages/${id}`)).status, 403);
  assert.equal((await request('/challengePages/legacy', 'other')).status, 200);
  assert.equal((await patch('name', {stringValue:'Updated class'}, 'teacher')).status, 200);
  assert.equal((await patch('name', {stringValue:'Hijacked'}, 'student')).status, 403);
  assert.equal((await patch('authorId', {stringValue:'other'}, 'teacher')).status, 403);
  assert.equal((await patch('classSetupVersion', {integerValue:'0'}, 'teacher')).status, 403);
  assert.equal((await patch('discussion', {arrayValue:{values:[]}}, 'student')).status, 200);
  assert.equal((await patch('isPrivate', {booleanValue:false}, 'other')).status, 403);
  const ownQuery = { structuredQuery: { from: [{ collectionId: 'challengePages' }], where: { fieldFilter: { field: {fieldPath:'authorId'}, op:'EQUAL', value:{stringValue:'teacher'} } } } };
  assert.equal((await request(':runQuery', 'teacher', 'POST', ownQuery)).status, 200);
  const memberQuery = { structuredQuery: { from: [{ collectionId: 'challengePages' }], where: { fieldFilter: { field: {fieldPath:'participants'}, op:'ARRAY_CONTAINS', value:{stringValue:'student@example.test'} } } } };
  assert.equal((await request(':runQuery', 'student', 'POST', memberQuery)).status, 200);
  assert.equal((await patch('isPrivate', {booleanValue:false}, 'teacher')).status, 200);
  assert.equal((await request(`/challengePages/${id}`, 'other')).status, 200);
  await db.doc('schools/owned-school').set({ ownerUid: 'teacher', name: 'University' });
  await api.createClassSpace.run({ ...input, classId:'cdefghijklmnopqrstuv', schoolId:'owned-school' }, ctx('teacher'));
  assert.equal((await db.doc('schools/owned-school/classes/cdefghijklmnopqrstuv').get()).exists, true);
  assert.equal((await request('/schools/owned-school/classes/cdefghijklmnopqrstuv', 'other')).status, 403);
  assert.equal((await request('/schools/owned-school/classes/cdefghijklmnopqrstuv', 'teacher')).status, 200);
  await db.terminate();
});
