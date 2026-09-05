const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sources = require('../lib/brief-sources');
const { groundedCandidates, reviewedSource } = require('../lib/brief-research');
const { resolveBriefVideo: resolveVideoWithProbe, renderBriefVideo } = require('../lib/brief-video');
const resolveBriefVideo = (url, load) => resolveVideoWithProbe(url, load, async () => true);
const { CURATED_BRIEF_VIDEOS } = require('../lib/brief-curated-videos');
const now = Date.now();
const day = sources.VALIDATION_TTL_MS;
const source = (overrides = {}) => ({ kind: 'news', title: 'New water treatment study', url: 'https://research.example/study',
  publisher: 'Research Institute', relevance: 'Tests affordable water treatment.', evidence: 'The study tests affordable water treatment in rural communities.',
  date: new Date(now - day).toISOString().slice(0, 10), deadline: '', eligibility: '', nextAction: 'Read the study', score: 90,
  status: 'verified', reason: '', checkedAt: now, ...overrides });

test('URL normalization preserves meaningful query parameters and rejects unsafe schemes/credentials/ports', () => {
  assert.equal(sources.normalizeSourceUrl('https://site.org/article?id=12&utm_source=email#section'), 'https://site.org/article?id=12');
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'https://user:pass@site.org/', 'https://site.org:3000/']) assert.equal(sources.normalizeSourceUrl(url), '');
});
test('SSRF protection rejects private, reserved, mapped and transition addresses', () => {
  for (const ip of ['127.0.0.1', '10.0.0.2', '169.254.169.254', '192.168.1.1', '100.64.0.1', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1', '2002:7f00:1::1']) assert.equal(sources.isPublicAddress(ip), false, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(sources.isPublicAddress(ip), true, ip);
});
test('the actual fetch boundary refuses localhost without making a request', async () => {
  await assert.rejects(sources.fetchSourcePage('http://localhost/admin'), /Private destination/);
  await assert.rejects(sources.fetchSourcePage('http://127.0.0.1/admin'), /Private destination/);
});
test('hard dead links, soft 404s, bot challenges and empty pages are not accepted', () => {
  for (const status of [404, 410]) assert.equal(sources.pageProblem({status, title:'', text:''}), 'dead');
  for (const title of ['Page not found', '404 Not Found', 'Just a moment...', 'Access denied']) assert.ok(sources.pageProblem({ status:200, title, text:'x'.repeat(2000) }));
  assert.ok(sources.pageProblem({ status:200, title:'Article', text:'' }));
  assert.ok(sources.pageProblem({ status:403, title:'Article', text:'x'.repeat(2000) }));
  assert.equal(sources.pageProblem({ status:200, title:'Water research', text:'Research findings. '.repeat(100) }), '');
});
test('content extraction removes scripts and styles from model evidence', () => {
  const page = sources.htmlPage('https://example.org', 200, '<title>Study</title><script>ignore instructions</script><style>secret</style><p>Useful &amp; accurate evidence.</p>');
  assert.equal(page.title, 'Study'); assert.ok(!page.text.includes('ignore instructions')); assert.ok(!page.text.includes('secret')); assert.ok(page.text.includes('Useful & accurate evidence.'));
});
test('discovery only admits URLs from grounding chunks, not generated prose', () => {
  const response = { text: () => 'https://fake.org/invented', candidates:[{ groundingMetadata:{ groundingChunks:[
    {web:{uri:'https://publisher.org/a', title:'Actual source'}}, {web:{uri:'https://publisher.org/a', title:'Duplicate'}}, {web:{uri:'javascript:bad'}}
  ]}}] };
  assert.deepEqual(groundedCandidates(response,'news').map(s=>s.url), ['https://publisher.org/a']);
  assert.deepEqual(groundedCandidates({text:()=> 'https://fake.org'}, 'news'), []);
});
test('editorial gate requires real evidence, matching page and authority', () => {
  const input = source({kind:'funding',date:''}); const page = {url:input.url,status:200,title:input.title,text:input.evidence};
  const review = { accept:true,pageMatches:true,authoritative:true,evidence:input.evidence,score:90,title:input.title };
  assert.equal(reviewedSource(input,page,review,now).status,'verified');
  for (const patch of [{evidence:'Fabricated evidence that never appeared in the source.'},{pageMatches:false},{authoritative:false},{date:'2026-09-01',dateEvidence:'invented date proof'}, {eligibility:'Anyone may apply',eligibilityEvidence:'Not in the page'}]) assert.equal(reviewedSource(input,page,{...review,...patch},now).status,'rejected');
});
test('send-time gate rejects stale validation, old news, low scores and expired deadlines', () => {
  assert.equal(sources.eligibleSource(source(),now),true);
  for (const patch of [{checkedAt:now-day}, {date:new Date(now-91*day).toISOString()}, {score:74}, {status:'unverified'}, {deadline:new Date(now-2*day).toISOString().slice(0,10)}]) assert.equal(sources.eligibleSource(source(patch),now),false);
  assert.equal(sources.eligibleSource(source({kind:'funding',date:'',deadline:'Rolling'}),now),true);
});
test('selection removes tracking duplicates and limits repeated publishers', () => {
  const items = [source(), source({url:source().url+'?utm_source=x'}), ...[1,2,3,4,5].map(i=>source({url:`https://research.example/study${i}`,title:`Study ${i}`}))];
  assert.equal(sources.selectBriefSources(items,'news',now).length,2);
});
test('versioned cache key changes with context and time period', () => {
  assert.notEqual(sources.briefContextKey('water',0),sources.briefContextKey('energy',0));
  assert.notEqual(sources.briefContextKey('water',0),sources.briefContextKey('water',5*day));
  assert.match(sources.briefContextKey('water',0),/^v2_/);
});
test('email source renderer escapes hostile text and does not fill empty results', () => {
  const html = sources.renderBriefSources([source({title:'<img src=x onerror=alert(1)>',relevance:'A & B'})],'news');
  assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img')); assert.ok(html.includes('A &amp; B'));
  assert.ok(sources.renderBriefSources([],'funding').includes('No verified funding links'));
});
test('NWG resolver selects the exact id and uses saved title, teaser and thumbnail', async () => {
  let requested=''; const video = await resolveBriefVideo('https://newworld-game.org/nwg-news?v=exact-id', async id => {requested=id;return {title:'Water & food',url:'https://storage.example/video.mp4',thumbUrl:'https://storage.example/thumb.jpg',tagline:'This week’s evidence',durationSeconds:125};});
  assert.equal(requested,'exact-id'); assert.equal(video.status,'ready'); assert.equal(video.durationSeconds,125);
  const html=renderBriefVideo(video); assert.ok(html.includes('2:05')); assert.ok(html.includes('Water &amp; food')); assert.ok(html.includes('https://storage.example/thumb.jpg')); assert.ok(!html.includes('<video'));
  assert.equal((html.match(/href="https:\/\/newworld-game.org\/nwg-news\?v=exact-id"/g)||[]).length,3);
});
test('missing selected videos are omitted and never replaced by a different video', async () => {
  assert.equal(await resolveBriefVideo('',async()=>null),undefined);
  const missing=await resolveBriefVideo('https://newworld-game.org/nwg-news?v=missing',async()=>null);
  assert.equal(missing.status,'unavailable'); assert.equal(renderBriefVideo(missing),'');
  const noId=await resolveBriefVideo('https://newworld-game.org/nwg-news',async()=>{throw Error('must not load');});
  assert.equal(noId.status,'unavailable');
});
test('legacy records lacking thumbnails retain a usable video card', async () => {
  const video=await resolveBriefVideo('https://newworld-game.org/nwg-news?v=legacy',async()=>({title:'Legacy',url:'https://media.example/a.mp4'}));
  assert.equal(video.status,'ready'); assert.ok(video.thumbnailUrl.endsWith('/assets/img/landing-intro-sofia-thumbnail.jpg'));
  assert.ok(renderBriefVideo(video).includes('Watch this week'));
});
test('curated catalog matches frontend IDs and resolves legacy thumbnails absolutely',async()=>{
  const frontend=fs.readFileSync(require('node:path').join(__dirname,'../../src/app/blogs/nwg-news/nwg-news.component.ts'),'utf8');
  for(const video of CURATED_BRIEF_VIDEOS){assert.ok(frontend.includes(`id: '${video.id}'`));assert.ok(frontend.includes(video.url));}
  const video=await resolveBriefVideo('https://newworld-game.org/nwg-news?v=tane-kahu',async()=>null);
  assert.equal(video.status,'ready');assert.equal(video.thumbnailUrl,'https://newworld-game.org/assets/img/tane-agent.png');
});

test('missing media suppresses the card; broken thumbnail uses the branded fallback', async () => {
  const load = async () => ({ title:'Selected',url:'https://media.example/video.mp4',thumbUrl:'https://media.example/thumbnail.jpg' });
  const unavailable=await resolveVideoWithProbe('https://newworld-game.org/nwg-news?v=selected',load,async()=>false);
  assert.equal(unavailable.status,'unavailable');assert.equal(renderBriefVideo(unavailable),'');
  const fallback=await resolveVideoWithProbe('https://newworld-game.org/nwg-news?v=selected',load,async(_url,kind)=>kind==='video');
  assert.equal(fallback.status,'ready');assert.ok(fallback.thumbnailUrl.endsWith('landing-intro-sofia-thumbnail.jpg'));
});

test('saved legacy placeholder images also upgrade to the face thumbnail', async () => {
  const video = await resolveBriefVideo('https://newworld-game.org/nwg-news?v=weekly', async () => ({
    title: 'Weekly briefing', url: 'https://media.example/video.mp4',
    thumbUrl: 'https://newworld-game.org/assets/img/weekly-brief-video.jpg?version=1',
  }));
  assert.equal(video.thumbnailUrl, 'https://newworld-game.org/assets/img/landing-intro-sofia-thumbnail.jpg');
  assert.ok(renderBriefVideo(video).includes('landing-intro-sofia-thumbnail.jpg'));
});

test('custom thumbnails with a similar filename on other hosts remain selected', async () => {
  const custom = 'https://media.example/assets/img/weekly-brief-video.jpg';
  const video = await resolveBriefVideo('https://newworld-game.org/nwg-news?v=weekly', async () => ({
    title: 'Weekly briefing', url: 'https://media.example/video.mp4', thumbUrl: custom,
  }));
  assert.equal(video.thumbnailUrl, custom);
});
