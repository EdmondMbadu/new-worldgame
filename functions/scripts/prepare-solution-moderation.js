#!/usr/bin/env node
'use strict';

const admin = require('firebase-admin');

admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || 'new-worldgame',
});

const db = admin.firestore();
const applyChanges = process.argv.includes('--apply');
const enforcementEpochMs = Date.UTC(2026, 7, 7, 0, 0, 0);

const milliseconds = (value) => {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = value ? Date.parse(String(value)) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

async function main() {
  const snapshot = await db.collection('solutions').get();
  const eligible = snapshot.docs.filter((document) => {
    const solution = document.data() || {};
    if (solution.moderation?.status) return false;
    const newestKnownWrite = Math.max(
      milliseconds(solution.createdAt),
      milliseconds(solution.updatedAt),
      milliseconds(solution.lastSubstantiveEditAt),
      milliseconds(solution.stepsUpdatedAt),
      milliseconds(solution.draftUpdatedAt),
      milliseconds(solution.publishedContentUpdatedAt)
    );
    return newestKnownWrite === 0 || newestKnownWrite < enforcementEpochMs;
  });

  console.log(
    JSON.stringify(
      {
        mode: applyChanges ? 'APPLY' : 'DRY RUN',
        scanned: snapshot.size,
        legacySolutionsToPreserveDuringBackfill: eligible.length,
        enforcementEpoch: new Date(enforcementEpochMs).toISOString(),
      },
      null,
      2
    )
  );

  if (!applyChanges) {
    console.log('No writes made. Re-run with --apply after reviewing the count.');
    return;
  }

  for (let index = 0; index < eligible.length; index += 400) {
    const batch = db.batch();
    eligible.slice(index, index + 400).forEach((document) => {
      batch.set(document.ref, { moderationLegacyExempt: true }, { merge: true });
    });
    await batch.commit();
  }
  console.log(`Marked ${eligible.length} legacy solutions for safe rolling backfill.`);
}

main().catch((error) => {
  console.error('Unable to prepare legacy moderation:', error);
  process.exitCode = 1;
});
