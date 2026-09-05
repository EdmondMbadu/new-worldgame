const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('research pipeline reuses fresh structured cache, revalidates stale pages, honors exclusions, and retains immutable snapshots', async () => {
  const docs = new Map(); let searches=0, reviews=0, fetches=0; let providerDown=false;
  const firestore = () => ({ doc: path => ref(path), collection: path => ({doc:id => ref(`${path}/${id}`)}) });
  firestore.FieldValue = {serverTimestamp:()=> 'server-time'};
  const ref = path => ({ get:async()=>({data:()=>docs.get(path)}), set:async value=>docs.set(path, structuredClone(value)), update:async value=>docs.set(path,{...docs.get(path),...structuredClone(value)}) });
  const evidence='This research studies affordable water treatment and practical implementation in rural communities.';
  class FakeAI {
    getGenerativeModel(params) {
      return { generateContent: async prompt => {
        if(providerDown) throw new Error('Provider unavailable');
        if(params.tools) {
          searches++; const kind=prompt.includes('official funding')?'funding':'news';
          return {response:{candidates:[{groundingMetadata:{groundingChunks:[0,1,2].map(i=>({web:{uri:`https://${kind}${i}.org/program`,title:`${kind} ${i}`}}))}}]}};
        }
        reviews++; const url=prompt.match(/Final URL: (https:\/\/[^ ]+)/)[1].replace(/\.$/,'');
        const news=prompt.includes('Category: news'); const date=new Date().toISOString().slice(0,10);
        return {response:{text:()=>JSON.stringify({accept:true,pageMatches:true,authoritative:true,title:url,publisher:'Institute',relevance:'Useful water treatment evidence',evidence,
          date:news?date:'',dateEvidence:news?`Published on ${date}. This is the publication date of the water treatment study.`:'',score:90})}};
      }};
    }
  }
  const original=Module._load;
  Module._load=function(id,parent,isMain){if(id==='firebase-admin')return {firestore};if(id==='@google/generative-ai')return {GoogleGenerativeAI:FakeAI};return original.call(this,id,parent,isMain);};
  const sourceModule=require('../lib/brief-sources'); const oldFetch=sourceModule.fetchSourcePage;
  sourceModule.fetchSourcePage=async url=>{fetches++;return {url,status:200,title:'Water treatment',text:`${evidence} Published on ${new Date().toISOString().slice(0,10)}. This is the publication date of the water treatment study.`};};
  const {prepareBriefContent}=require('../lib/brief-research'); Module._load=original;
  try {
    const first=await prepareBriefContent('test','solution','water');
    assert.equal(first.validNewsCount,3); assert.equal(first.validFundersCount,3); assert.equal(fetches,6);
    assert.equal(reviews,6); assert.ok(first.quality.snapshotId);
    const immutable=structuredClone(docs.get(`ai_insights_content_snapshots/${first.quality.snapshotId}`));
    const second=await prepareBriefContent('test','solution','water');
    assert.equal(second.quality.snapshotId,first.quality.snapshotId); assert.equal(fetches,6); assert.equal(searches,2);
    const cachePath=`ai_insights_content_cache/${first.quality.cacheId}`;
    docs.get(cachePath).checkedAt=Date.now()-25*60*60*1000;
    await prepareBriefContent('test','solution','water'); assert.equal(fetches,12); assert.equal(searches,2);
    assert.deepEqual(docs.get(`ai_insights_content_snapshots/${first.quality.snapshotId}`),immutable);
    docs.set('solutions/solution/weeklyBrief/settings',{excludedUrls:['https://news0.org/program']});
    const excluded=await prepareBriefContent('test','solution','water'); assert.equal(excluded.validNewsCount,2);
    assert.ok(!excluded.newsHtml.includes('https://news0.org/program'));
    providerDown=true;
    const failed=await prepareBriefContent('test','solution','new context');
    assert.equal(failed.validNewsCount,0); assert.equal(failed.validFundersCount,0); assert.ok(failed.newsHtml.includes('No verified'));
  } finally {Module._load=original; sourceModule.fetchSourcePage=oldFetch;}
});
