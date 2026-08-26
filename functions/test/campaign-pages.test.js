const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeCampaignSlug,
  sanitizeCampaignHtml,
} = require('../lib/campaign-pages');
const {
  findUnsupportedNumericClaims,
  normalizeCampaignPlan,
  renderGeneratedCampaignHtml,
} = require('../lib/campaign-generation');
const { renderCampaignPublicShell } = require('../lib/campaign-public-shell');

test('normalizes campaign slugs to lowercase kebab case', () => {
  assert.equal(
    normalizeCampaignSlug('  Clean Water: Philadelphia!  '),
    'clean-water-philadelphia'
  );
  assert.equal(normalizeCampaignSlug('Already---Clean'), 'already-clean');
});

test('removes executable and embedded content from campaign HTML', () => {
  const result = sanitizeCampaignHtml(
    `<!doctype html><html><head><title>Unsafe</title></head><body>
      <h1 onclick="alert(1)">A safer campaign</h1>
      <script>alert('xss')</script>
      <iframe src="https://example.com"></iframe>
      <a href="javascript:alert(2)">bad link</a>
      <img src="https://example.com/photo.jpg" onerror="alert(3)">
      <img src="data:image/png;base64,iVBORw0KGgo=" alt="Embedded image">
      <video poster="javascript:alert(4)" controls></video>
    </body></html>`,
    'Safe title',
    'Safe description'
  );

  assert.match(result, /<title>Safe title<\/title>/);
  assert.match(result, /A safer campaign/);
  assert.doesNotMatch(result, /<script/i);
  assert.doesNotMatch(result, /<iframe/i);
  assert.doesNotMatch(result, /onclick|onerror|javascript:/i);
  assert.match(result, /loading="lazy"/);
  assert.match(result, /src="data:image\/png;base64,iVBORw0KGgo="/);
});

test('wraps an HTML fragment in a complete document with metadata', () => {
  const result = sanitizeCampaignHtml(
    '<main><h1>Hello</h1></main>',
    'Hello site',
    'A description'
  );
  assert.match(result, /^<!doctype html>/i);
  assert.match(result, /<html lang="en">/i);
  assert.match(result, /<meta name="description" content="A description">/i);
  assert.match(result, /<main><h1>Hello<\/h1><\/main>/i);
});

test('normalizes and renders a grounded generated campaign', () => {
  const plan = normalizeCampaignPlan(
    {
      metaDescription: 'A campaign for cleaner neighborhood water.',
      hero: {
        eyebrow: 'Clean water initiative',
        headline: 'Safe water starts locally.',
        summary: 'A practical strategy led by the community.',
        ctaLabel: 'Share this solution',
      },
      problem: { title: 'Why it matters', body: 'Families need safer water.', bullets: [] },
      solution: {
        title: 'How it works',
        body: 'The plan combines testing and local delivery.',
        bullets: ['Test water', 'Train local teams'],
      },
    },
    'Clean Water',
    'A solution for safer water.',
    'awareness'
  );
  const html = renderGeneratedCampaignHtml(plan, {
    title: 'Clean Water',
    slug: 'clean-water',
    goal: 'awareness',
    sdgs: ['SDG 6'],
  });
  assert.match(html, /Safe water starts locally/);
  assert.match(html, /\/campaigns\/clean-water#share/);
  assert.match(html, /Train local teams/);
  assert.doesNotMatch(html, /undefined|null/);
});

test('detects numeric claims that are not present in source material', () => {
  const plan = normalizeCampaignPlan(
    {
      hero: { headline: 'A stronger plan', summary: 'Reach 450 communities.' },
      impact: { title: 'Impact', body: 'Improve outcomes by 36%.', bullets: [] },
    },
    'A plan',
    'A plan for 12 communities.',
    'awareness'
  );
  assert.deepEqual(
    findUnsupportedNumericClaims(plan, 'The source covers 12 communities.'),
    ['450', '36%']
  );
});

test('renders the public engagement shell around sandboxed campaign content', () => {
  const html = renderCampaignPublicShell({
    slug: 'clean-water',
    publicUrl: 'https://new-world-game.org/campaigns/clean-water',
    title: 'Clean Water',
    description: 'A safer-water campaign.',
    supportCount: 7,
    nonce: 'testnonce',
  });
  assert.match(html, /src="\/campaigns\/clean-water\/content"/);
  assert.match(html, /https:\/\/new-world-game\.org\/campaigns\/clean-water/);
  assert.match(html, /allow-top-navigation-by-user-activation/);
  assert.match(html, /id="support-button"/);
  assert.match(html, /Email a friend/);
  assert.match(html, /Connect with the team/);
  assert.match(html, /nonce="testnonce"/);
});
