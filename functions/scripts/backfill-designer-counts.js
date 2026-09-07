#!/usr/bin/env node
// Run after building functions. Dry run by default; only updates existing counts.
const admin = require('firebase-admin');
const { solutionDesignerCount } = require('../lib/solution-designers');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'new-worldgame' });
const db = admin.firestore();
const apply = process.argv.includes('--apply');
async function run() {
  const projections = await db.collection('publicCommunitySolutions').get();
  let changed = 0;
  for (let offset = 0; offset < projections.size; offset += 200) {
    const page = projections.docs.slice(offset, offset + 200);
    const sources = await db.getAll(...page.map(doc => db.doc(`solutions/${doc.id}`)));
    const batch = db.batch();
    let writes = 0;
    sources.forEach((source, index) => {
      if (!source.exists) return;
      const count = solutionDesignerCount(source.data());
      const projection = page[index];
      if (projection.data().publicDesignerCount === count && projection.data().publicMemberCount === count) return;
      changed++;
      writes++;
      // Avoid overwriting a projection changed since the audit read.
      batch.update(projection.ref, {publicDesignerCount: count, publicMemberCount: count}, {lastUpdateTime: projection.updateTime});
    });
    if (apply && writes) await batch.commit();
  }
  console.log(JSON.stringify({mode: apply ? 'APPLY' : 'DRY RUN', scanned: projections.size, changed}));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
