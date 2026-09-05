const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { Readable } = require('node:stream');
const { frameScore } = require('../lib/video-frame');

test('frame scoring rejects blank frames and prefers visible detail', () => {
  assert.equal(frameScore(Buffer.alloc(96*54)),0);
  assert.equal(frameScore(Buffer.alloc(96*54,255)),0);
  const detailed=Buffer.from(Array.from({length:96*54},(_,i)=>i%2?80:180));
  assert.ok(frameScore(detailed)>frameScore(Buffer.alloc(96*54,100)));
});

test('real decoder skips a blank opening and extracts a reusable JPEG', {skip: !process.env.NWG_FFMPEG_PATH}, async () => {
  const {mkdtemp,rm}=require('node:fs/promises');
  const {join}=require('node:path');
  const {tmpdir}=require('node:os');
  const run=require('node:util').promisify(require('node:child_process').execFile);
  const directory=await mkdtemp(join(tmpdir(),'nwg-frame-test-'));
  try {
    const input=join(directory,'clip.mp4');
    await run(process.env.NWG_FFMPEG_PATH,['-hide_banner','-loglevel','error','-f','lavfi','-i',"testsrc2=size=320x180:rate=10:duration=10,drawbox=color=black:t=fill:enable='lt(t,3)'",'-c:v','mpeg4','-threads','1','-y',input]);
    const frame=await require('../lib/video-frame').extractSavedVideoFrame(input,directory);
    assert.equal(frame.seconds,5);
    assert.equal(frame.duration,10);
    assert.equal(frame.bytes.subarray(0,3).toString('hex'),'ffd8ff');
    assert.ok(frame.bytes.length>1000 && frame.bytes.length<1024*1024);
  } finally {await rm(directory,{recursive:true,force:true});}
});

test('legacy extraction saves once, protects custom thumbnails and replacements, and backs off after failure', async () => {
  const docs=new Map();let generated=0, uploaded=0, deleted=0;let intervene;
  const ref=id=>({id});
  const db={collection:()=>({doc:ref}),runTransaction:async fn=>fn({get:async r=>({data:()=>structuredClone(docs.get(r.id))}),update:(r,p)=>docs.set(r.id,{...docs.get(r.id),...structuredClone(p)})})};
  const bucket={name:'test.appspot.com',file:()=>({getMetadata:async()=>[{size:'20',generation:'1',contentType:'video/mp4'}],createReadStream:()=>Readable.from([Buffer.from('fake video')]),save:async()=>{uploaded++;},delete:async()=>{deleted++;}})};
  const load=Module._load;
  Module._load=function(id,parent,isMain){if(id==='firebase-admin')return {firestore:()=>db,storage:()=>({bucket:()=>bucket})};return load.call(this,id,parent,isMain);};
  const frames=require('../lib/video-frame');const original=frames.extractSavedVideoFrame;
  frames.extractSavedVideoFrame=async()=>{generated++;if(intervene)await intervene();return {bytes:Buffer.from('JPEG'),seconds:12,duration:100};};
  const {loadNewsVideoWithThumbnail,needsVideoThumbnail}=require('../lib/news-video-thumbnail');Module._load=load;
  const initial=id=>({title:id,url:`https://media.example/${id}.mp4`,storagePath:`nwgNewsVideos/videos/2026/${id}-video.mp4`,thumbUrl:''});
  try {
    docs.set('legacy',initial('legacy'));
    const [first,also]=await Promise.all([loadNewsVideoWithThumbnail('legacy'),loadNewsVideoWithThumbnail('legacy')]);
    assert.equal(generated,1);assert.equal(uploaded,1);assert.equal(first.thumbUrl,also.thumbUrl);
    assert.equal(first.thumbnailSeconds,12);assert.equal(first.durationSeconds,100);assert.equal(needsVideoThumbnail(first),false);
    await loadNewsVideoWithThumbnail('legacy');assert.equal(generated,1);
    docs.set('manual',{...initial('manual'),thumbUrl:'https://media.example/custom.jpg'});
    await loadNewsVideoWithThumbnail('manual');assert.equal(generated,1);
    docs.set('race',initial('race'));intervene=()=>{docs.get('race').thumbUrl='https://media.example/new-custom.jpg';};
    const race=await loadNewsVideoWithThumbnail('race');assert.equal(race.thumbUrl,'https://media.example/new-custom.jpg');assert.equal(deleted,1);
    docs.set('replace',initial('replace'));intervene=()=>{docs.get('replace').url='https://media.example/replaced.mp4';};
    const replace=await loadNewsVideoWithThumbnail('replace');assert.equal(replace.thumbUrl,'');assert.equal(deleted,2);
    docs.set('failure',initial('failure'));intervene=()=>{throw Error('Decoder unavailable');};
    const failed=await loadNewsVideoWithThumbnail('failure');assert.equal(failed.thumbUrl,'');
    const attempts=generated;await loadNewsVideoWithThumbnail('failure');assert.equal(generated,attempts);assert.equal(docs.get('failure').thumbnailGeneration.status,'failed');
    docs.set('lease',{...initial('lease'),thumbnailGeneration:{revision:`${initial('lease').storagePath}\n${initial('lease').url}`,retryAfterMs:Date.now()+60000}});
    await loadNewsVideoWithThumbnail('lease');assert.equal(generated,attempts);
  } finally {Module._load=load;frames.extractSavedVideoFrame=original;}
});
