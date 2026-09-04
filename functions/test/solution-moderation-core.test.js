'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSolutionModerationContentHash,
  decideModeration,
  DEFAULT_MODERATION_POLICY,
  hasApprovedCurrentModerationVersion,
  isLegacyApprovedMetadataOnlyUpdate,
  hasMeaningfulModerationContent,
  MODERATION_CATEGORIES,
  MODERATION_ENFORCEMENT_EPOCH_MS,
  parseModerationAssessmentResponse,
} = require('../lib/solution-moderation-core');

const assessment = (overrides = {}, imageAssessed = true) => ({
  scores: Object.fromEntries(
    MODERATION_CATEGORIES.map((category) => [category, overrides[category] || 0])
  ),
  evidence: [],
  summary: '',
  imageAssessed,
});

test('approves ordinary public-policy problem solving', () => {
  const decision = decideModeration(
    assessment({ political_persuasion: 0.08 }),
    DEFAULT_MODERATION_POLICY,
    { imageRequired: false, textTruncated: false }
  );
  assert.equal(decision.status, 'approved');
});

test('automatically hides high-confidence severe content', () => {
  const decision = decideModeration(
    assessment({ explicit_sexual: 0.97 }),
    DEFAULT_MODERATION_POLICY,
    { imageRequired: false, textTruncated: false }
  );
  assert.equal(decision.status, 'blocked');
  assert.ok(decision.reasonCodes.includes('explicit_sexual'));
});

test('routes partisan persuasion to human review by default', () => {
  const decision = decideModeration(
    assessment({ political_persuasion: 0.72 }),
    DEFAULT_MODERATION_POLICY,
    { imageRequired: false, textTruncated: false }
  );
  assert.equal(decision.status, 'needs_review');
  assert.ok(decision.reasonCodes.includes('political_persuasion'));
});

test('keeps an unscanned user image hidden', () => {
  const decision = decideModeration(
    assessment({}, false),
    DEFAULT_MODERATION_POLICY,
    { imageRequired: true, textTruncated: false }
  );
  assert.equal(decision.status, 'needs_review');
  assert.ok(decision.reasonCodes.includes('image_not_scanned'));
});

test('content hash changes only for publicly relevant solution content', () => {
  const base = {
    title: 'Clean water access',
    description: 'A community filtration and maintenance program.',
    image: 'https://firebasestorage.googleapis.com/example.png',
  };
  const initialHash = buildSolutionModerationContentHash(base);
  assert.equal(
    buildSolutionModerationContentHash({
      ...base,
      commentCount: 42,
      updatedAt: Date.now(),
    }),
    initialHash
  );
  assert.notEqual(
    buildSolutionModerationContentHash({ ...base, description: 'Changed public text' }),
    initialHash
  );
  assert.notEqual(
    buildSolutionModerationContentHash({ ...base, image: 'https://example.com/new.png' }),
    initialHash
  );
});

test('approval is valid only for the exact current content hash', () => {
  const solution = {
    title: 'Safe streets',
    description: 'Designing safer crossings with residents and traffic engineers.',
    createdAt: MODERATION_ENFORCEMENT_EPOCH_MS + 1_000,
  };
  const hash = buildSolutionModerationContentHash(solution);
  solution.moderation = {
    status: 'approved',
    contentHash: hash,
    approvedContentHash: hash,
  };
  assert.equal(hasApprovedCurrentModerationVersion(solution), true);
  assert.equal(
    hasApprovedCurrentModerationVersion({ ...solution, title: 'Edited after approval' }),
    false
  );
});

test('new unreviewed content is not treated as a legacy exemption', () => {
  const solution = {
    title: 'Food recovery',
    description: 'Recovering safe surplus food and delivering it to local shelters.',
    createdAt: MODERATION_ENFORCEMENT_EPOCH_MS + 1_000,
  };
  assert.equal(hasMeaningfulModerationContent(solution), true);
  assert.equal(hasApprovedCurrentModerationVersion(solution), false);
});

test('only a server-marked pre-enforcement solution receives rollout grace', () => {
  const legacy = {
    title: 'Legacy clean-energy plan',
    description: 'An existing community solution awaiting the rolling backfill.',
    createdAt: MODERATION_ENFORCEMENT_EPOCH_MS - 1_000,
  };
  assert.equal(hasApprovedCurrentModerationVersion(legacy), false);
  assert.equal(
    hasApprovedCurrentModerationVersion({
      ...legacy,
      moderationLegacyExempt: true,
    }),
    true
  );
});

test('legacy approved cards survive metadata-only updates but not content edits', () => {
  const before = {
    title: 'Legacy clinic electrification plan',
    description: 'An approved plan to provide reliable electricity to clinics.',
    statusForPublication: 'approved',
    feedEligible: true,
    isPrivate: false,
    communityVisibility: 'community',
    numLike: '17',
  };

  assert.equal(
    isLegacyApprovedMetadataOnlyUpdate(before, {
      ...before,
      numLike: '18',
    }),
    true
  );
  assert.equal(
    isLegacyApprovedMetadataOnlyUpdate(before, {
      ...before,
      title: 'Edited clinic electrification plan',
    }),
    false
  );
  assert.equal(
    isLegacyApprovedMetadataOnlyUpdate(before, {
      ...before,
      isPrivate: true,
    }),
    false
  );
});

test('parses fenced moderation JSON with trailing commas', () => {
  const scores = Object.fromEntries(
    MODERATION_CATEGORIES.map((category) => [category, 0.01])
  );
  const json = JSON.stringify({ scores, evidence: [], summary: 'Low risk.' })
    .replace(/}$/, ',}');
  const parsed = parseModerationAssessmentResponse(
    '```json\n' + json + '\n```'
  );
  assert.equal(parsed.scores.explicit_sexual, 0.01);
});

test('recovers complete scores when later JSON output is truncated', () => {
  const scoreLines = MODERATION_CATEGORIES.map(
    (category) => `"${category}": 0.02`
  ).join(',');
  const parsed = parseModerationAssessmentResponse(
    `{"scores":{${scoreLines}},"evidence":[`
  );
  assert.equal(parsed.scores.violence_promotion, 0.02);
  assert.match(parsed.summary, /recovered/i);
});

test('rejects incomplete score maps instead of assuming missing risks are safe', () => {
  assert.throws(
    () =>
      parseModerationAssessmentResponse(
        '{"scores":{"explicit_sexual":0.01}}'
      ),
    /unreadable response/i
  );
});
