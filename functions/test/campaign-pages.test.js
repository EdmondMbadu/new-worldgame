const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeCampaignSlug,
  sanitizeCampaignHtml,
} = require('../lib/campaign-pages');

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
