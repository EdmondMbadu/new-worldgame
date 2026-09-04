#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || 'new-worldgame',
});

const db = admin.firestore();
const applyChanges = process.argv.includes('--apply');

async function run() {
  const [approvedSolutions, approvedProjections] = await Promise.all([
    db
      .collection('solutions')
      .where('statusForPublication', '==', 'approved')
      .get(),
    db
      .collection('publicCommunitySolutions')
      .where('statusForPublication', '==', 'approved')
      .get(),
  ]);

  const approvedSourceIds = new Set(
    approvedSolutions.docs.map((document) => document.id)
  );
  const projectionReferences = approvedSolutions.docs.map((document) =>
    db.doc(`publicCommunitySolutions/${document.id}`)
  );
  const projectionSnapshots = projectionReferences.length
    ? await db.getAll(...projectionReferences)
    : [];
  const sourceById = new Map(
    approvedSolutions.docs.map((document) => [document.id, document.data()])
  );

  const repairs = [];
  const missingProjections = [];
  projectionSnapshots.forEach((projection) => {
    const source = sourceById.get(projection.id) || {};
    if (!projection.exists) {
      missingProjections.push({
        id: projection.id,
        title: String(source.title || '').trim(),
      });
      return;
    }
    const desired = {
      statusForPublication: 'approved',
      numLike: String(Math.max(0, Number(source.numLike || 0))),
    };
    if (
      projection.data()?.statusForPublication !== desired.statusForPublication ||
      projection.data()?.numLike !== desired.numLike
    ) {
      repairs.push({
        reference: projection.ref,
        update: desired,
        title: String(source.title || projection.data()?.title || '').trim(),
      });
    }
  });

  approvedProjections.docs.forEach((projection) => {
    if (!approvedSourceIds.has(projection.id)) {
      repairs.push({
        reference: projection.ref,
        update: { statusForPublication: 'pending' },
        title: String(projection.data()?.title || '').trim(),
      });
    }
  });

  console.log(
    JSON.stringify(
      {
        mode: applyChanges ? 'APPLY' : 'DRY RUN',
        approvedSourceCount: approvedSolutions.size,
        approvedProjectionCount: approvedProjections.size,
        repairs: repairs.map(({ reference, update, title }) => ({
          id: reference.id,
          title,
          update,
        })),
        missingProjections,
      },
      null,
      2
    )
  );

  if (applyChanges && repairs.length) {
    const batch = db.batch();
    repairs.forEach(({ reference, update }) => {
      batch.set(reference, update, { merge: true });
    });
    await batch.commit();
    console.log(`Synchronized ${repairs.length} featured projection records.`);
  }

  if (missingProjections.length) {
    console.warn(
      `${missingProjections.length} approved solutions have no public projection; ` +
        'they require a full sanitized projection rebuild.'
    );
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
