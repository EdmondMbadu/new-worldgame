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

test('fails clearly when search returns insufficient supported evidence', async () => {
  let written = false;
  await assert.rejects(() => generatePolicyBrief(request, {
    research: async () => ({ candidates: [] }),
    write: async () => { written = true; return JSON.stringify(fixture); },
  }), /POLICY_EVIDENCE_UNAVAILABLE/);
  assert.equal(written, false);
});

test('replaces model-supplied bibliography and authors with source-bound metadata', async () => {
  const output = clone();
  output.references = [{ id: 'R1', title: 'Invented', url: 'https://example.com/fake' }];
  output.aboutAuthors = 'An invented government endorsement';
  const progress = [];
  const result = await generatePolicyBrief(request, {
    research: async () => researchResponse(),
    write: async (prompt) => {
      assert.ok(prompt.includes('Current edited strategy'));
      assert.ok(prompt.includes('sourceIds'));
      return JSON.stringify(output);
    },
  }, new Date('2026-09-25T12:00:00Z'), async (message) => { progress.push(message); });
  assert.deepEqual(result.references, fixture.references);
  assert.ok(result.aboutAuthors.startsWith('Prepared by Clinic team.'));
  assert.equal(result.audience, request.context.audience);
  assert.equal(result.jurisdiction, request.context.jurisdiction);
  assert.equal(result.generatedOn, '2026-09-25');
  assert.equal(progress.length, 3);
  assert.match(progress[2], /Reviewing evidence/);
});

test('repairs malformed output once, with the original evidence still present', async () => {
  let calls = 0;
  const result = await generatePolicyBrief(request, {
    research: async () => researchResponse(),
    write: async (prompt) => {
      calls++;
      if (calls === 1) return '{"title":"incomplete"}';
      assert.ok(prompt.includes(fixture.references[0].url));
      return JSON.stringify(fixture);
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.title, fixture.title);
});

test('does not return an invalid brief after the bounded repair attempt', async () => {
  let calls = 0;
  await assert.rejects(() => generatePolicyBrief(request, {
    research: async () => researchResponse(), write: async () => { calls++; return '{}'; },
  }));
  assert.equal(calls, 2);
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
