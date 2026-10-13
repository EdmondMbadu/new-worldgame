import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { canReadClassSpace, parseClassSetup } from './class-spaces-core';

export const createClassSpace = functions.https.onCall(async (input: unknown, context) => {
  if (!context.auth?.uid) throw new functions.https.HttpsError('unauthenticated', 'Sign in to create your class space.');
  const user = await admin.auth().getUser(context.auth.uid);
  const trustedProviders = ['google.com', 'microsoft.com', 'apple.com', 'facebook.com', 'twitter.com'];
  if (!user.email || (!user.emailVerified && !user.providerData.some(p => trustedProviders.includes(p.providerId)))) {
    throw new functions.https.HttpsError('failed-precondition', 'Verify your email before creating your class space.');
  }
  let setup;
  try { setup = parseClassSetup(input); }
  catch (error) { throw new functions.https.HttpsError('invalid-argument', (error as Error).message); }
  const db = admin.firestore();
  const ref = db.doc(`challengePages/${setup.classId}`);
  const email = user.email.toLowerCase();
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(ref);
    if (existing.exists) {
      if (existing.get('authorId') !== user.uid || existing.get('classSetupVersion') !== 1) {
        throw new functions.https.HttpsError('already-exists', 'Please restart class setup.');
      }
      return; // A timed-out request can be retried without creating another class.
    }
    if (setup.schoolId) {
      const school = await transaction.get(db.doc(`schools/${setup.schoolId}`));
      if (!school.exists || (school.get('ownerUid') !== user.uid && !(school.get('adminUids') || []).includes(user.uid))) {
        throw new functions.https.HttpsError('permission-denied', 'You do not manage this school.');
      }
    }
    const subtitle = [setup.independentEducator ? 'Independent educator' : setup.institutionName, setup.courseCode, setup.term].filter(Boolean).join(' · ');
    const createdAt = new Date().toISOString();
    const page = {
      challengePageId: setup.classId, name: setup.name, heading: setup.name,
      subHeading: subtitle, description: setup.description,
      institutionName: setup.institutionName, independentEducator: setup.independentEducator,
      courseCode: setup.courseCode, term: setup.term,
      type: 'class', classSetupVersion: 1, authorId: user.uid, createdByUid: user.uid,
      participants: [email], adminUids: [user.uid], adminEmails: [email],
      restricted: 'true', isPrivate: true, participantsHidden: true,
      logoImage: '/assets/img/gsl-logo.png', imageChallenge: '/assets/img/class-cover.svg',
      createdAt, creationDate: createdAt, ...(setup.schoolId ? { schoolId: setup.schoolId } : {}),
    };
    transaction.create(ref, page);
    if (setup.schoolId) transaction.set(db.doc(`schools/${setup.schoolId}/classes/${setup.classId}`), page);
  });
  return { classId: setup.classId };
});

async function viewer(context: functions.https.CallableContext) {
  const uid = context.auth?.uid || '';
  const profile = uid ? (await admin.firestore().doc(`users/${uid}`).get()).data() : null;
  return { uid, email: String(context.auth?.token.email || '').toLowerCase(), platformAdmin: profile?.admin === 'true' || profile?.role === 'admin' };
}

// Keep legacy spaces discoverable while withholding private class documents.
export const listAccessibleChallengeSpaces = functions.https.onCall(async (_input, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in to view spaces.');
  const current = await viewer(context);
  const snapshot = await admin.firestore().collection('challengePages').get();
  return { pages: snapshot.docs.filter(doc => canReadClassSpace(doc.data(), current.uid, current.email, current.platformAdmin)).map(doc => ({ ...doc.data(), challengePageId: doc.id })) };
});

export const resolveAccessibleChallengeSpace = functions.https.onCall(async (input, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in to view this space.');
  const value = String(input?.idOrSlug || '').trim();
  if (!value || value.length > 200 || value.includes('/')) throw new functions.https.HttpsError('invalid-argument', 'Invalid space address.');
  const current = await viewer(context);
  const db = admin.firestore();
  const byId = await db.doc(`challengePages/${value}`).get();
  const doc = byId.exists ? byId : (await db.collection('challengePages').where('customUrl', '==', value).limit(1).get()).docs[0];
  if (!doc || !canReadClassSpace(doc.data()!, current.uid, current.email, current.platformAdmin)) return null;
  return { id: doc.id, data: doc.data(), loadedByCustomUrl: !byId.exists };
});

export const checkChallengeSpaceSlug = functions.https.onCall(async (input, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in to edit your space.');
  const slug = String(input?.slug || '');
  if (!/^[a-z0-9-]{1,150}$/.test(slug)) throw new functions.https.HttpsError('invalid-argument', 'Invalid space address.');
  const snapshot = await admin.firestore().collection('challengePages').where('customUrl', '==', slug).get();
  return { exists: snapshot.docs.some(doc => doc.id !== input?.excludePageId) };
});
