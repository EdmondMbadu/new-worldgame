#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || 'new-worldgame',
});
const db = admin.firestore();
const applyChanges = process.argv.includes('--apply');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const meaningful = (solution) => {
  const title = text(solution.title);
  const bodyLength = [
    solution.description,
    solution.content,
    solution.strategyReview,
    ...Object.values(solution.status || {}),
  ].reduce((total, value) => total + text(value).length, 0);
  const looksLikeTest = /^(test|testing|untitled|sample)(\s|$)/i.test(title);
  return title.length >= 3 && bodyLength >= 40 && !looksLikeTest;
};

const solutionEmails = (solution) => {
  const emails = new Set();
  const add = (value) => {
    const email = normalizeEmail(
      typeof value === 'string'
        ? value
        : value?.email || value?.name || value?.authorEmail || value?.address
    );
    if (emailPattern.test(email)) emails.add(email);
  };
  add(solution.authorEmail);
  [solution.participants, solution.participantsHolder].forEach((value) => {
    if (Array.isArray(value)) value.forEach(add);
    else if (value && typeof value === 'object') Object.values(value).forEach(add);
  });
  if (Array.isArray(solution.chosenAdmins)) solution.chosenAdmins.forEach(add);
  return Array.from(emails);
};

const adminEmails = (solution) =>
  Array.from(
    new Set(
      [
        normalizeEmail(solution.authorEmail),
        ...(Array.isArray(solution.chosenAdmins)
          ? solution.chosenAdmins.map((entry) =>
              normalizeEmail(entry?.authorEmail)
            )
          : []),
      ].filter((email) => emailPattern.test(email))
    )
  );

const timestampFor = (solution) => {
  const candidates = [
    solution.feedUpdatedAt,
    solution.lastSubstantiveEditAt,
    solution.updatedAt,
    solution.submissionDate,
    solution.createdAt,
    solution.creationDate,
  ];
  for (const candidate of candidates) {
    if (candidate?.toMillis) return candidate;
    const milliseconds =
      typeof candidate === 'number'
        ? candidate
        : candidate
        ? Date.parse(String(candidate))
        : Number.NaN;
    if (Number.isFinite(milliseconds)) {
      return admin.firestore.Timestamp.fromMillis(milliseconds);
    }
  }
  return admin.firestore.Timestamp.fromMillis(0);
};

async function run() {
  const snapshot = await db.collection('solutions').get();
  const stats = {
    scanned: snapshot.size,
    communityVisible: 0,
    private: 0,
    feedEligible: 0,
    excludedEmpty: 0,
    inDevelopment: 0,
    submitted: 0,
    changed: 0,
  };
  const updates = [];
  const excludedSamples = [];

  snapshot.forEach((document) => {
    const solution = document.data() || {};
    const isPrivate = solution.isPrivate === true;
    const hasContent = meaningful(solution);
    const feedEligible = !isPrivate && hasContent;
    const feedStatus =
      solution.finished === 'true' ? 'submitted' : 'in-development';
    const teamMemberEmails = solutionEmails(solution);
    const solutionAdminEmails = adminEmails(solution);
    const commentCount = Math.max(
      Number(solution.commentCount || 0),
      Array.isArray(solution.comments) ? solution.comments.length : 0
    );
    const update = {
      solutionId: solution.solutionId || document.id,
      isPrivate,
      communityVisibility: isPrivate ? 'private' : 'community',
      feedEligible,
      feedStatus,
      feedUpdatedAt: timestampFor(solution),
      teamMemberEmails,
      solutionAdminEmails,
      commentCount,
    };

    stats[isPrivate ? 'private' : 'communityVisible'] += 1;
    stats[feedStatus === 'submitted' ? 'submitted' : 'inDevelopment'] += 1;
    if (feedEligible) stats.feedEligible += 1;
    if (!hasContent) {
      stats.excludedEmpty += 1;
      if (excludedSamples.length < 12) {
        excludedSamples.push({
          id: document.id,
          title: text(solution.title) || '(untitled)',
        });
      }
    }

    const changed = Object.entries(update).some(([key, value]) => {
      const existing = solution[key];
      if (value?.toMillis) return existing?.toMillis?.() !== value.toMillis();
      return JSON.stringify(existing) !== JSON.stringify(value);
    });
    if (changed) {
      stats.changed += 1;
      updates.push({ ref: document.ref, update });
    }
  });

  console.log(
    JSON.stringify(
      {
        mode: applyChanges ? 'APPLY' : 'DRY RUN',
        stats,
        excludedSamples,
      },
      null,
      2
    )
  );

  if (applyChanges && updates.length) {
    for (let index = 0; index < updates.length; index += 400) {
      const batch = db.batch();
      updates.slice(index, index + 400).forEach(({ ref, update }) => {
        batch.set(ref, update, { merge: true });
      });
      await batch.commit();
    }
    console.log(`Applied metadata to ${updates.length} solutions.`);
  }

  const firstPage = await db
    .collection('solutions')
    .where('feedEligible', '==', true)
    .where('isPrivate', '==', false)
    .orderBy('feedUpdatedAt', 'desc')
    .limit(20)
    .get();
  console.log(
    JSON.stringify(
      {
        verification: {
          firstPageCount: firstPage.size,
          firstPageIds: firstPage.docs.map((document) => document.id),
        },
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
