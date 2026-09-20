const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BRIEF_MAX_RESEARCH_PACKS,
  BRIEF_PACK_RESERVATION_USD,
  BRIEF_WEEKLY_AI_BUDGET_USD,
  buildBriefSolutionProfile,
  buildBriefEditionPlan,
  personalizeBriefContent,
  mergeBriefHistory,
} = require('../lib/brief-personalization');

const now = Date.now();
const date = new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
function recipient(overrides = {}) {
  return {
    userEmail: 'maker@example.org',
    solutionId: 'solar-cold-storage',
    solutionTitle: 'Solar Cold Storage for Ghanaian Farmers',
    solutionDescription: 'Solar-powered cold rooms reduce post-harvest food loss for smallholder farmers in Ghana.',
    solutionArea: '',
    sdgs: ['SDG2 Zero Hunger', 'SDG7 Affordable and Clean Energy'],
    location: 'Accra, Ghana',
    briefSelectionSource: 'fallback',
    ...overrides,
  };
}
function source(i, kind = 'news', overrides = {}) {
  const funding = kind === 'funding';
  return {
    kind,
    title: funding ? `African agriculture innovation grant ${i}` : `Solar cold-chain research ${i}`,
    url: `https://source${i}.example.org/item`,
    publisher: `Publisher ${i}`,
    relevance: funding ? 'Supports agriculture innovation and smallholder farmers in Ghana and Sub-Saharan Africa.' : 'Research on solar cold storage and food loss for farmers.',
    evidence: funding ? 'Eligible organizations in Ghana and Sub-Saharan Africa may apply to the agriculture innovation program.' : `Published on ${date}. The study evaluates solar cold storage for smallholder farmers.`,
    date: funding ? '' : date,
    deadline: funding ? 'Rolling' : '',
    eligibility: funding ? 'Organizations in Ghana and Sub-Saharan Africa may apply.' : '',
    nextAction: funding ? 'Check eligibility' : 'Read the study',
    score: 90,
    status: 'verified',
    reason: '',
    checkedAt: now,
    ...overrides,
  };
}

test('profiles use descriptions and SDGs when legacy solution areas are missing', () => {
  const profile = buildBriefSolutionProfile(recipient());
  assert.equal(profile.primaryTopic, 'food_agriculture');
  assert.equal(profile.regionId, 'sub_saharan_africa');
  assert.ok(profile.keywords.includes('solar'));
  assert.ok(profile.confidence >= 0.75);
});

test('profiling handles legacy language without substring geography mistakes', () => {
  assert.equal(buildBriefSolutionProfile(recipient({ solutionTitle: 'Aging with Dignity', solutionDescription: 'Healthcare for older adults', sdgs: [] })).primaryTopic, 'health_wellbeing');
  assert.equal(buildBriefSolutionProfile(recipient({ solutionTitle: 'Sustainable Alternative Protein', solutionDescription: 'Plant based nutrition', sdgs: [] })).primaryTopic, 'food_agriculture');
  assert.equal(buildBriefSolutionProfile(recipient({ solutionTitle: 'Community Tree Inventory', solutionDescription: 'Mapping trees and urban forestry', sdgs: [] })).primaryTopic, 'biodiversity_land');
  const noFalseIndia = buildBriefSolutionProfile(recipient({ solutionTitle: 'Vacant Lots', solutionDescription: 'Environmental decline in neglected urban spaces', sdgs: [], location: '' }));
  assert.equal(noFalseIndia.regionId, 'global');
  assert.equal(buildBriefSolutionProfile(recipient({ solutionDescription: 'A clean-water initiative in India', sdgs: [], location: '' })).regionId, 'south_asia');
});

test('edition planning assigns every recipient while keeping research packs bounded', () => {
  const topicInputs = [
    ['solar energy', 'SDG7'], ['school literacy', 'SDG4'], ['maternal health', 'SDG3'],
    ['clean water', 'SDG6'], ['urban transit', 'SDG11'], ['wildlife conservation', 'SDG15'],
    ['peace justice', 'SDG16'], ['women equality', 'SDG5'], ['small business jobs', 'SDG8'],
    ['housing poverty', 'SDG1'], ['ocean fisheries', 'SDG14'], ['digital partnership', 'SDG17'],
  ];
  const recipients = Array.from({ length: 72 }, (_, index) => {
    const [description, sdg] = topicInputs[index % topicInputs.length];
    return recipient({
      userEmail: `person${index}@example.org`, solutionId: `solution-${index}`,
      solutionTitle: description, solutionDescription: `${description} in ${index % 3 ? 'Ghana' : 'Canada'}`,
      sdgs: [sdg], location: index % 3 ? 'Ghana' : 'Canada',
    });
  });
  const plan = buildBriefEditionPlan(recipients, '2026-09-27');
  assert.equal(plan.recipients.length, recipients.length);
  assert.ok(Object.keys(plan.packs).length <= BRIEF_MAX_RESEARCH_PACKS);
  for (const item of plan.recipients) {
    assert.ok(plan.packs[item.briefPackId]);
    assert.equal(item.briefEditionKey, '2026-09-27');
  }
  assert.ok(BRIEF_WEEKLY_AI_BUDGET_USD < 5);
  assert.ok(BRIEF_MAX_RESEARCH_PACKS * BRIEF_PACK_RESERVATION_USD <= BRIEF_WEEKLY_AI_BUDGET_USD);
});

test('personalization chooses verified topical sources, suppresses recent links and explains the concrete fit', () => {
  const profile = buildBriefSolutionProfile(recipient());
  const sources = [
    ...Array.from({ length: 7 }, (_, index) => source(index, 'news')),
    ...Array.from({ length: 7 }, (_, index) => source(index + 10, 'funding')),
    source(99, 'funding', { relevance: 'Only organizations in Germany may apply.', evidence: 'Only organizations in Germany may apply.', eligibility: 'Organizations in Germany only.' }),
  ];
  const history = [
    { url: sources[0].url, kind: 'news', sentAt: now - 1000 },
    { url: sources[7].url, kind: 'funding', sentAt: now - 1000 },
  ];
  const result = personalizeBriefContent(sources, profile, recipient().solutionTitle, 'food-ghana', 'maker:week', history, now);
  assert.ok(result.validNewsCount >= 3);
  assert.ok(result.validFundersCount >= 3);
  assert.ok(!result.selectedUrls.some(item => item.url === sources[0].url));
  assert.ok(!result.selectedUrls.some(item => item.url === sources[7].url));
  assert.ok(!result.selectedUrls.some(item => item.url === sources.at(-1).url));
  assert.ok(result.newsHtml.includes('Solar Cold Storage for Ghanaian Farmers'));
  assert.ok(result.fundersHtml.includes('confirm final applicant eligibility'));
  assert.equal(result.quality.newSourceRatio, 1);
});

test('recipient seed rotates equally relevant items without weakening verification', () => {
  const profile = buildBriefSolutionProfile(recipient());
  const sources = Array.from({ length: 9 }, (_, index) => source(index, 'news'));
  const first = personalizeBriefContent(sources, profile, recipient().solutionTitle, 'food-global', 'person-a:week', [], now);
  const second = personalizeBriefContent(sources, profile, recipient().solutionTitle, 'food-global', 'person-b:week', [], now);
  assert.notDeepEqual(first.selectedUrls.map(item => item.url), second.selectedUrls.map(item => item.url));
});

test('history keeps only recent normalized links and the latest send time', () => {
  const merged = mergeBriefHistory(
    [{ url: 'https://example.org/a?utm_source=old', kind: 'news', sentAt: now - 1000 }],
    [{ url: 'https://example.org/a', kind: 'news', sentAt: now }, { url: 'javascript:bad', kind: 'funding', sentAt: now }],
    now
  );
  assert.deepEqual(merged, [{ url: 'https://example.org/a', kind: 'news', sentAt: now }]);
});
