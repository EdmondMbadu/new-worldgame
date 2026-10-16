const { test } = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('./fixtures/policy-brief.json');
const { parsePolicyBrief, policyBriefToText, policyBriefPublicUrl } = require('../lib/shared/policy-brief');
const { extractPolicyResearch, generatePolicyBrief } = require('../lib/policy-brief-generation');
const clone = () => JSON.parse(JSON.stringify(fixture));
const researchResponse = () => ({ candidates: [{ groundingMetadata: {
  groundingChunks: fixture.references.map((r) => ({ web: { uri: r.url, title: r.title } })),
  groundingSupports: [
    { segment: { text: fixture.evidence[0].finding }, groundingChunkIndices: [0] },
    { segment: { text: fixture.evidence[1].finding }, groundingChunkIndices: [1] },
  ],
} }] });
const request = { source: 'Current edited strategy: assess clinic electricity and develop a conditional pilot.', authors: 'Clinic team', context: { audience: 'Health planning team', jurisdiction: 'Example jurisdiction', decision: '' }, instruction: 'Write a practical brief.' };

test('accepts a complete brief and retains a readable bibliography', () => {
  const brief = parsePolicyBrief(fixture);
  const text = policyBriefToText(brief);
  assert.equal(brief.options.length, 3);
  assert.ok(text.includes('Decision requested:'));
  assert.ok(text.includes(fixture.references[0].url));
});

test('rejects incomplete documents, missing comparisons and invented citation IDs', () => {
  for (const mutate of [
    (b) => b.keyMessages.pop(),
    (b) => b.options.splice(0, 1),
    (b) => b.options[0].kind = 'preferred',
    (b) => b.recommendations[0].measure = '',
    (b) => b.evidence[0].sourceIds = ['R999'],
    (b) => b.context += ' Unsupported claim [R999].',
    (b) => b.references[0].url = 'javascript:alert(1)',
  ]) {
    const brief = clone(); mutate(brief);
    assert.throws(() => parsePolicyBrief(brief));
  }
});

test('rejects unsafe reference schemes and local addresses', () => {
  for (const url of ['http://who.int/', 'https://localhost/', 'https://127.0.0.1/', 'https://[::1]/', 'https://a:b@who.int/', 'https://google.com/search?q=policy']) {
    assert.equal(policyBriefPublicUrl(url), '');
  }
  assert.equal(policyBriefPublicUrl(fixture.references[0].url), fixture.references[0].url);
});

test('keeps only references actually cited in the document', () => {
  const brief = clone();
  brief.references.push({ id: 'R3', title: 'Unused', url: 'https://www.who.int/' });
  assert.equal(parsePolicyBrief(brief).references.length, 2);
});

test('recovers the author byline from older saved briefs without splitting names at initials', () => {
  const brief = clone();
  delete brief.authors;
  brief.aboutAuthors = 'Prepared by Dr. A. Rivera, Sam Lee. Based on a strategy developed through Global Solutions Lab; the recommendations represent the team\'s proposal.';
  assert.equal(parsePolicyBrief(brief).authors, 'Dr. A. Rivera, Sam Lee');
  assert.match(policyBriefToText(parsePolicyBrief(brief)), /Prepared by: Dr\. A\. Rivera, Sam Lee/);
});

test('binds claim segments to grounding metadata, including both SDK segment shapes', () => {
  const response = researchResponse();
  response.candidates[0].groundingMetadata.groundingSupports[1].segment = 'A second supported finding.';
  const result = extractPolicyResearch(response);
  assert.equal(result.findings[1].text, 'A second supported finding.');
  assert.deepEqual(result.findings[0].sourceIds, ['R1']);
  assert.equal(result.references.length, 2);
});

test('deduplicates grounding URLs and excludes unsupported metadata-only links', () => {
  const response = researchResponse();
  response.candidates[0].groundingMetadata.groundingChunks.push(
    { web: { uri: fixture.references[0].url, title: 'Duplicate' } },
    { web: { uri: 'https://www.who.int/', title: 'Uncited' } }
  );
  assert.equal(extractPolicyResearch(response).references.length, 2);
});

const { parsePolicyStrategyPlan, normalizePolicyScope } = require('../lib/policy-brief-strategy');
const plan = {
  objective: 'Provide reliable electricity to underserved clinics.', audience: 'Health planning team', jurisdiction: 'Example jurisdiction',
  authorityNeedsConfirmation: true, focusMatchesSource: true,
  components: [{ id: 'C1', title: 'Clinic assessment and energy pilot', sourceQuote: 'assess clinic electricity and develop a conditional pilot', policyDirection: 'Assess facilities and fund a conditional pilot with maintenance.' }],
  conflicts: [],
};
const draft = (base = clone()) => ({ ...base, strategy: {
  components: plan.components.map(c => ({ id: c.id, treatment: 'included', policyResponse: c.policyDirection, rationale: '', actionIndices: [1, 2] })),
  dependencies: ['Confirm authority, budgets, maintenance responsibilities and local delivery capacity.'], conflicts: [],
}, evidence: base.evidence.map((e, i) => ({ ...e, supportingFindingIds: [`F${i + 1}`] })) });
const envelope = brief => JSON.stringify({ brief, checks: { scopePreserved: true, claimsSupported: true, optionsComparable: true, unresolvedIssues: [] } });
const aiFor = (overrides = {}) => ({
  plan: async () => JSON.stringify(plan), research: async () => researchResponse(),
  write: async () => JSON.stringify(draft()), review: async () => envelope(draft()), ...overrides,
});

test('fails clearly before writing when research lacks supported evidence', async () => {
  let written = false;
  await assert.rejects(() => generatePolicyBrief(request, aiFor({
    research: async () => ({ candidates: [] }), write: async () => { written = true; return '{}'; },
  })), /POLICY_EVIDENCE_UNAVAILABLE/);
  assert.equal(written, false);
});

test('binds metadata to the request, records provenance and preserves coverage in text', async () => {
  const output = draft();
  output.references = [{ id: 'R1', title: 'Invented', url: 'https://example.com/fake' }];
  output.aboutAuthors = 'Invented endorsement'; output.authors = 'Invented author';
  const progress = [];
  const result = await generatePolicyBrief(request, aiFor({ review: async () => envelope(output) }),
    new Date('2026-09-25T12:00:00Z'), async message => { progress.push(message); });
  assert.deepEqual(result.references, fixture.references);
  assert.equal(result.authors, 'Clinic team');
  assert.equal(result.audience, request.context.audience);
  assert.equal(result.jurisdiction, request.context.jurisdiction);
  assert.equal(result.generatedOn, '2026-09-25');
  assert.equal(result.version, 2);
  assert.match(result.sourceSnapshot.sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.sourceSnapshot.characters, request.source.length);
  assert.equal(result.researchFindings.length, 2);
  assert.deepEqual(parsePolicyBrief(result), result);
  assert.match(result.statusNote, /^Working draft/);
  assert.equal(result.strategy.components[0].sourceQuote, plan.components[0].sourceQuote);
  assert.match(policyBriefToText(result), /How the strategy is advanced/);
  assert.match(policyBriefToText(result), /Actions 1, 2/);
  assert.equal(progress.length, 4);
});

test('repairs malformed output once without losing the original source, inventory or research', async () => {
  let reviews = 0;
  const result = await generatePolicyBrief(request, aiFor({ write: async () => '{"title":"incomplete"}', review: async input => {
    reviews++;
    assert.ok(input.includes(request.source)); assert.ok(input.includes(plan.components[0].title));
    assert.ok(input.includes(fixture.references[0].url)); assert.match(input, /Validation error to repair/);
    return envelope(draft());
  } }));
  assert.equal(reviews, 1); assert.equal(result.title, fixture.title);
});

test('retries incomplete search grounding once without narrowing the strategy', async () => {
  let attempts = 0;
  const result = await generatePolicyBrief(request, aiFor({ research: async (input, retry) => {
    attempts++;
    if (attempts === 1) return { candidates: [] };
    assert.equal(retry, true);
    assert.ok(input.includes(plan.components[0].title)); assert.match(input, /Do not invent sources or reduce the scope/);
    return researchResponse();
  } }));
  assert.equal(attempts, 2); assert.equal(result.strategy.components.length, 1);
});

test('does not retry unrelated research failures or invent an ungrounded fallback', async () => {
  let attempts = 0;
  await assert.rejects(() => generatePolicyBrief(request, aiFor({ research: async () => {
    attempts++; throw new Error('Provider unavailable');
  } })), /Provider unavailable/);
  assert.equal(attempts, 1);
});

test('repairs final format errors once with all overlong fields identified together', async () => {
  let reviews = 0;
  const overlong = draft(); overlong.decision = 'x'.repeat(1201); overlong.recommendations[0].resources = 'y'.repeat(501);
  const result = await generatePolicyBrief(request, aiFor({ review: async input => {
    reviews++;
    if (reviews === 1) return envelope(overlong);
    assert.match(input, /decision: 1201 characters, maximum 1200/);
    assert.match(input, /resources: 501 characters, maximum 500/);
    assert.ok(input.includes(plan.components[0].title));
    return envelope(draft());
  } }));
  assert.equal(reviews, 2); assert.equal(result.strategy.components.length, 1);
});

test('bounds final format repairs and never returns an invalid document', async () => {
  let reviews = 0;
  const overlong = draft(); overlong.decision = 'x'.repeat(1201);
  await assert.rejects(() => generatePolicyBrief(request, aiFor({ review: async () => { reviews++; return envelope(overlong); } })), /decision: 1201/);
  assert.equal(reviews, 2);
});

test('does not return malformed or unreviewed final output', async () => {
  for (const reviewed of ['{}', envelope({}), JSON.stringify({ brief: draft(), checks: { scopePreserved: true, claimsSupported: false, optionsComparable: true, unresolvedIssues: [] } })]) {
    await assert.rejects(() => generatePolicyBrief(request, aiFor({ review: async () => reviewed })));
  }
});

test('rejects failed semantic review even when JSON and citations are valid', async () => {
  await assert.rejects(() => generatePolicyBrief(request, aiFor({ review: async () => JSON.stringify({ brief: draft(), checks: {
    scopePreserved: false, claimsSupported: true, optionsComparable: true, unresolvedIssues: ['The main decision omits economic and institutional reforms.'],
  } }) })), /POLICY_REVIEW_FAILED/);
});

test('requires exact source provenance for the strategy inventory', () => {
  assert.equal(parsePolicyStrategyPlan(JSON.stringify(plan), request.source).components.length, 1);
  assert.throws(() => parsePolicyStrategyPlan(JSON.stringify({ ...plan, components: [{ ...plan.components[0], sourceQuote: 'An invented intervention that does not exist in the strategy.' }] }), request.source), /traced to the source/);
});

test('repairs an invalid inventory once before researching the complete strategy', async () => {
  let attempts = 0;
  const result = await generatePolicyBrief(request, aiFor({ plan: async input => {
    attempts++;
    if (attempts === 1) return '{}';
    assert.ok(input.includes(request.source)); assert.match(input, /Copy short original section headings/);
    return JSON.stringify(plan);
  } }));
  assert.equal(attempts, 2); assert.equal(result.strategy.components.length, 1);
});

test('rejects an inventory still invalid after its bounded repair', async () => {
  let attempts = 0;
  await assert.rejects(() => generatePolicyBrief(request, aiFor({ plan: async () => { attempts++; return '{}'; } })), /inventory/);
  assert.equal(attempts, 2);
});

test('defaults to whole strategy and requires explicit focus for a component brief', () => {
  assert.deepEqual(normalizePolicyScope(undefined), { mode: 'whole-strategy', focus: '' });
  assert.throws(() => normalizePolicyScope({ mode: 'selected-component', focus: '' }), /Enter the component/);
  assert.throws(() => normalizePolicyScope({ mode: 'something-else', focus: '' }));
});

test('rejects invented findings and citations unrelated to the supporting findings', async () => {
  for (const mutate of [
    b => b.evidence[0].supportingFindingIds = ['F999'],
    b => { b.evidence[0].supportingFindingIds = ['F1']; b.evidence[0].sourceIds = ['R2']; },
  ]) {
    const output = draft(); mutate(output);
    await assert.rejects(() => generatePolicyBrief(request, aiFor({ review: async () => envelope(output) })), /finding|citations/);
  }
});

test('rejects missing components, unexplained deferrals and invalid action links', async () => {
  for (const mutate of [
    b => b.strategy.components.pop(),
    b => b.strategy.components[0].actionIndices = [99],
    b => b.strategy.components[0].actionIndices = [],
    b => b.strategy.components[0].treatment = 'outside-scope',
    b => { b.strategy.components[0].treatment = 'deferred'; b.strategy.components[0].rationale = ''; },
  ]) {
    const output = draft(); mutate(output);
    await assert.rejects(() => generatePolicyBrief(request, aiFor({ review: async () => envelope(output) })));
  }
});

test('rejects empty and oversized sources before invoking any model', async () => {
  for (const source of ['', 'x'.repeat(120001)]) {
    await assert.rejects(() => generatePolicyBrief({ ...request, source }, aiFor({ plan: async () => { throw new Error('should not run'); } })), /120,000/);
  }
});

const democracyRequest = require('./fixtures/democracy-policy-request.json');
const democracyPlan = {
  objective: 'Improve democratic participation and accountability through a coordinated programme.',
  audience: 'To confirm', jurisdiction: 'To confirm', authorityNeedsConfirmation: true, focusMatchesSource: true, conflicts: [],
  components: democracyRequest.source.split('\n').slice(2, 8).map((line, i) => ({
    id: `C${i + 1}`, title: line.split(':')[0], sourceQuote: line,
    policyDirection: line.split(':').slice(1).join(':').trim(),
  })),
};
const democracyDraft = () => {
  const brief = draft();
  brief.title = 'Coordinate Economic, Institutional, Civic and Digital Measures for Democratic Participation';
  brief.decision = 'Develop a phased democracy programme covering economic participation, independent information, institutional safeguards, civic engagement and responsible technology, with separate approvals where required.';
  brief.recommendations = democracyPlan.components.map(c => ({ action: c.policyDirection,
    lead: 'Proposed relevant public authority and civil society delivery partners; roles to confirm.',
    timing: 'Proposed initial assessment, followed by a review before adoption.',
    resources: 'Cost design, delivery, oversight and recurring operation before requesting funding.',
    measure: 'Publish an agreed baseline, accountable owner and review criteria for this component.',
  }));
  brief.strategy.components = democracyPlan.components.map((c, i) => ({ id: c.id, treatment: 'included',
    policyResponse: c.policyDirection, rationale: '', actionIndices: [i + 1] }));
  return brief;
};

test('carries every major democracy pillar through research, generation, review and readable output', async () => {
  const stages = [];
  const result = await generatePolicyBrief(democracyRequest, aiFor({
    plan: async () => { stages.push('plan'); return JSON.stringify(democracyPlan); },
    research: async input => {
      stages.push('research'); assert.equal(JSON.parse(input).plan.components.length, 6); return researchResponse();
    },
    write: async input => { stages.push('write'); assert.equal(JSON.parse(input).scope.mode, 'whole-strategy'); return JSON.stringify(democracyDraft()); },
    review: async () => { stages.push('review'); return envelope(democracyDraft()); },
  }));
  assert.deepEqual(stages, ['plan', 'research', 'write', 'review']);
  assert.equal(result.strategy.components.length, 6);
  for (const component of democracyPlan.components) assert.ok(policyBriefToText(result).includes(component.title));
  assert.equal(result.audience, 'To confirm'); assert.match(result.statusNote, /^Working draft/);
});

test('rejects a narrow information-utility brief even if its citations and original structure are valid', async () => {
  const narrowed = democracyDraft(); narrowed.strategy.components = [narrowed.strategy.components.at(-1)];
  await assert.rejects(() => generatePolicyBrief(democracyRequest, aiFor({
    plan: async () => JSON.stringify(democracyPlan), review: async () => envelope(narrowed),
  })), /EVERY strategy inventory component/);
});

test('allows component scope only as an explicit request and discloses every excluded component', async () => {
  const focused = democracyDraft();
  for (const component of focused.strategy.components.slice(0, -1)) {
    component.treatment = 'outside-scope'; component.rationale = 'This brief explicitly focuses on the information technology component; retain this measure in the wider programme.'; component.actionIndices = [];
  }
  const result = await generatePolicyBrief({ ...democracyRequest, scope: { mode: 'selected-component', focus: 'Information technology' } }, aiFor({
    plan: async () => JSON.stringify(democracyPlan), review: async () => envelope(focused),
  }));
  assert.equal(result.strategy.scope.focus, 'Information technology');
  assert.equal(result.strategy.components.filter(c => c.treatment === 'outside-scope').length, 5);
  assert.match(policyBriefToText(result), /Outside the selected scope/);
});

test('accepts distinct interventions originating in the same source sentence', () => {
  const sharedQuote = democracyPlan.components[0].sourceQuote;
  const inventory = { ...democracyPlan, components: [
    { ...democracyPlan.components[0], title: 'Progressive revenue measures', sourceQuote: sharedQuote },
    { ...democracyPlan.components[0], id: 'C2', title: 'Labour protection measures', sourceQuote: sharedQuote },
  ] };
  assert.equal(parsePolicyStrategyPlan(JSON.stringify(inventory), democracyRequest.source).components.length, 2);
});

test('rejects a selected focus absent from the strategy before research', async () => {
  await assert.rejects(() => generatePolicyBrief({ ...request, scope: { mode: 'selected-component', focus: 'Unrelated project' } }, aiFor({
    plan: async () => JSON.stringify({ ...plan, focusMatchesSource: false }),
    research: async () => { throw new Error('Research must not run for an absent focus'); },
  })), /POLICY_FOCUS_NOT_FOUND/);
});

test('keeps v1 readable while rejecting incomplete v2 documents and unknown versions', () => {
  assert.equal(parsePolicyBrief(clone()).version, 1);
  assert.throws(() => parsePolicyBrief({ ...clone(), version: 2 }));
  assert.throws(() => parsePolicyBrief({ ...clone(), version: 99 }), /Unsupported/);
});

test('normalizes omitted optional option citations while keeping evidence citations mandatory', async () => {
  const output = draft(); delete output.options[0].sourceIds;
  const result = await generatePolicyBrief(request, aiFor({ review: async () => envelope(output) }));
  assert.deepEqual(result.options[0].sourceIds, []);
  delete output.evidence[0].sourceIds;
  await assert.rejects(() => generatePolicyBrief(request, aiFor({ review: async () => envelope(output) })), /evidence sourceIds/);
});

test('requires a proposed action even when the decision-maker is unconfirmed', async () => {
  const output = draft(); output.decision = 'To confirm';
  await assert.rejects(() => generatePolicyBrief(request, aiFor({ review: async () => envelope(output) })), /proposed decision or coordinated next actions/);
});

test('normalizes grouped citations and rejects unknown or malformed IDs in groups', () => {
  const brief = clone();
  brief.context += ' Supported finding [R1, R2].';
  assert.match(parsePolicyBrief(brief).context, /\[R1\] \[R2\]/);
  brief.context += ' Invented source [R1, R999].';
  assert.throws(() => parsePolicyBrief(brief), /unknown source/);
  brief.context = 'Ambiguous source [R1, unknown].';
  assert.throws(() => parsePolicyBrief(brief), /Malformed/);
});

test('gives the repair model an actionable section-length error', () => {
  const brief = clone(); brief.context = 'x'.repeat(2201);
  assert.throws(() => parsePolicyBrief(brief), /context; expected 1–2200 characters, received 2201/);
});

const { preparePolicyResearchSources, isPublicPolicySourceAddress } = require('../lib/policy-brief-sources');
test('resolves bibliography titles and URLs while retaining grounding indices', async () => {
  const original = researchResponse();
  original.candidates[0].groundingMetadata.groundingChunks.push({ web: { uri: 'https://facebook.com/example', title: 'Social post' } });
  const prepared = await preparePolicyResearchSources(original, async (url) => ({ url, title: 'Verified page title' }));
  assert.equal(prepared.candidates[0].groundingMetadata.groundingChunks[0].web.title, 'Verified page title');
  assert.deepEqual(prepared.candidates[0].groundingMetadata.groundingChunks[2], {});
  assert.deepEqual(prepared.candidates[0].groundingMetadata.groundingSupports, original.candidates[0].groundingMetadata.groundingSupports);
});

test('drops unresolved redirects and sources that failed resolution', async () => {
  const prepared = await preparePolicyResearchSources(researchResponse(), async () => ({ url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/unresolved', title: '' }));
  assert.throws(() => extractPolicyResearch(prepared), /POLICY_EVIDENCE_UNAVAILABLE/);
});

test('keeps a descriptive grounded publication title instead of an opaque filename', async () => {
  const response = researchResponse();
  response.candidates[0].groundingMetadata.groundingChunks[0].web.title = 'Official guidance on reliable electricity for health-care facilities';
  const result = await preparePolicyResearchSources(response, async url => ({ url, title: '' }));
  assert.equal(result.candidates[0].groundingMetadata.groundingChunks[0].web.title, 'Official guidance on reliable electricity for health-care facilities');
});

test('retains later policy families in large grounding catalogs without shifting source indices', async () => {
  const response = { candidates: [{ groundingMetadata: {
    groundingChunks: Array.from({ length: 42 }, (_, i) => ({ web: { uri: `https://www.example.org/source-${i}`, title: `Source ${i}` } })),
    groundingSupports: [
      { segment: { text: 'Evidence for the civic participation component.' }, groundingChunkIndices: [40] },
      { segment: { text: 'Evidence for information and media safeguards.' }, groundingChunkIndices: [41] },
    ],
  } }] };
  const prepared = await preparePolicyResearchSources(response, async url => ({ url, title: 'Primary source' }));
  assert.equal(prepared.candidates[0].groundingMetadata.groundingChunks.length, 42);
  assert.equal(extractPolicyResearch(prepared).findings.length, 2);
});

test('source requests reject private, loopback and mapped addresses', () => {
  for (const ip of ['127.0.0.1','10.1.1.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1']) assert.equal(isPublicPolicySourceAddress(ip),false,ip);
  assert.equal(isPublicPolicySourceAddress('8.8.8.8'),true);
  assert.equal(isPublicPolicySourceAddress('2606:4700:4700::1111'),true);
});

test('prioritizes official and original research and caps the source catalog at eight', () => {
  const domains = ['example.com','example.net','first.org','second.org','third.org','fourth.org','fifth.org','sixth.org','www.health.go.ke','www.who.int'];
  const result = extractPolicyResearch({ candidates: [{ groundingMetadata: {
    groundingChunks: domains.map(host=>({web:{uri:`https://${host}/research`,title:host}})),
    groundingSupports: domains.map((host,i)=>({segment:{text:`Supported finding at ${host}`},groundingChunkIndices:[i]})),
  } }] });
  assert.equal(result.references.length,8);
  assert.equal(new URL(result.references[0].url).hostname,'www.health.go.ke');
  assert.equal(new URL(result.references[1].url).hostname,'www.who.int');
  assert.ok(!result.references.some(r=>r.url.includes('example.com')));
});
