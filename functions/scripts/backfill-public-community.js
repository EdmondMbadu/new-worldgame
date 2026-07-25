'use strict';

const admin = require('firebase-admin');

const projectId = String(process.argv[2] || '').trim();
if (!projectId) {
  throw new Error(
    'Usage: node scripts/backfill-public-community.js <firebase-project-id>'
  );
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
});

// Require this after Firebase Admin is initialized. The same sanitizer powers
// both this repair script and the live Firestore trigger.
const {
  isCommunityVisible,
  publicFeedSolution,
} = require('../lib/public-community');

const db = admin.firestore();
const BATCH_LIMIT = 400;

async function commitOperations(operations) {
  for (let index = 0; index < operations.length; index += BATCH_LIMIT) {
    const batch = db.batch();
    operations.slice(index, index + BATCH_LIMIT).forEach((operation) => {
      if (operation.kind === 'set') {
        batch.set(operation.reference, operation.value);
      } else {
        batch.delete(operation.reference);
      }
    });
    await batch.commit();
  }
}

async function main() {
  const [solutionsSnapshot, projectionSnapshot] = await Promise.all([
    db.collection('solutions').get(),
    db.collection('publicCommunitySolutions').get(),
  ]);
  const visibleIds = new Set();
  const operations = [];

  solutionsSnapshot.docs.forEach((document) => {
    const solution = document.data();
    if (!isCommunityVisible(solution)) return;

    visibleIds.add(document.id);
    operations.push({
      kind: 'set',
      reference: db.doc(`publicCommunitySolutions/${document.id}`),
      value: publicFeedSolution(document),
    });
  });

  projectionSnapshot.docs.forEach((document) => {
    if (!visibleIds.has(document.id)) {
      operations.push({ kind: 'delete', reference: document.ref });
    }
  });

  await commitOperations(operations);
  console.log(
    `Public community feed synchronized: ${visibleIds.size} visible solution(s), ` +
      `${projectionSnapshot.size - [...visibleIds].filter((id) =>
        projectionSnapshot.docs.some((document) => document.id === id)
      ).length} stale projection(s) removed.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Public community feed backfill failed:', error.message);
    process.exit(1);
  });
