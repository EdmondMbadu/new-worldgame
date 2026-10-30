const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {CommunityStarterBackend,starterOrigin}=require('../lib/community-starter');
const {parseStarterBrief,assertBriefClaims,briefPageHtml}=require('../lib/shared/starter-brief');
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8198')throw new Error('Use scripts/test-community-starter-rules.mjs.');
const app=admin.initializeApp({projectId:'demo-community-starter'},'starter-integration');
const db=app.firestore();
const owner={uid:'starter-owner',email:'starter-owner@example.test',verified:true};
const friend={uid:'starter-friend',email:'starter-friend@example.test',verified:true};
const other={uid:'starter-other',email:'starter-other@example.test',verified:true};
const guest={uid:'',email:'',verified:false};
const fixture={version:1,title:'Fresh food, closer to home',summary:'A community idea to improve fresh food access.',challenge:'Residents describe a long journey to get fresh food.',success:'Fresh food could be easier to reach.',approaches:[{title:'A pickup partnership',text:'Explore a shared pickup with willing volunteers.'}],firstTest:'Ask residents about barriers before choosing a test.',questions:['Who could help us test an approach?'],invitation:'Bring your local knowledge and help explore this idea.'};
let generations=0;const sent=[];let failMail=false;
const backend=new CommunityStarterBackend(db,async()=>{generations++;return fixture;},async(...message)=>{if(failMail)throw new Error('mail unavailable');sent.push(message);});
const tokenOf=result=>result.url.split('/').pop();
before(async()=>{await db.doc('solutions/starter-v2-test').set({ownerAccountId:owner.uid,authorAccountId:owner.uid,starterOrigin:{draftId:'draft-one'},isPrivate:true,communityVisibility:'private',participants:[{name:owner.email}],teamMemberEmails:[owner.email],status:{'S1-A':'Original owner content'}});});
after(async()=>{await app.delete();});

test('generation is bounded, input validated, cached per session, and does not write a solution',async()=>{
  const input={answers:{problem:'Fresh food access',context:'Older residents'},sessionId:'a-valid-guest-session-id'};
  const first=await backend.generate(input,guest,'ip-one');
  const second=await backend.generate(input,guest,'ip-one');
  assert.equal(first.cached,false);assert.equal(second.cached,true);assert.equal(generations,1);
  assert.deepEqual(second.brief,fixture);
  await backend.generate({...input,sessionId:'a-different-guest-session-id'},guest,'ip-one');assert.equal(generations,2);
  await assert.rejects(backend.generate({answers:{context:'missing problem'},sessionId:'a-valid-guest-session-id'},guest,'ip-one'));
  assert.equal((await db.doc('solutions/starter-v2-test').get()).get('status.S1-A'),'Original owner content');
});
test('generation quota cannot be bypassed by new note revisions within a session',async()=>{
  for(let i=0;i<8;i++)await backend.generate({answers:{problem:`A local issue ${i}`},sessionId:'quota-test-session-id'},guest,'ip-two');
  await assert.rejects(backend.generate({answers:{problem:'One more issue'},sessionId:'quota-test-session-id'},guest,'ip-two'),error=>error.code==='resource-exhausted');
});
test('structured output rejects markup and unsupported factual numbers',()=>{
  assert.throws(()=>parseStarterBrief({...fixture,title:'<script>no</script>'}));
  assert.throws(()=>assertBriefClaims({...fixture,challenge:'This affects 900 people.'},{problem:'Food access'}));
  assert.ok(!briefPageHtml({...fixture,title:'Food & community'},'https://example.test/join').includes('Food & community</h1>'));
  assert.equal(starterOrigin('https://attacker.test'),'https://newworld-game.org');
});
test('only a verified owner can share a reviewed brief; the private workspace stays private',async()=>{
  await assert.rejects(backend.manage({action:'publish',solutionId:'starter-v2-test',brief:fixture},other));
  await assert.rejects(backend.manage({action:'publish',solutionId:'starter-v2-test',brief:fixture},{...owner,verified:false}));
  const shared=await backend.manage({action:'publish',solutionId:'starter-v2-test',brief:fixture,appOrigin:'https://attacker.test'},owner);
  const read=await backend.publicBrief(tokenOf(shared));assert.deepEqual(Object.keys(read).sort(),['brief','kind']);
  assert.deepEqual(read.brief,fixture);assert.equal(read.kind,'share');
  assert.equal((await db.doc('solutions/starter-v2-test').get()).get('isPrivate'),true);
  await backend.manage({action:'revoke',solutionId:'starter-v2-test'},owner);
  await assert.rejects(backend.publicBrief(tokenOf(shared)));
});
test('a generic share link requests approval and never grants workspace access by itself',async()=>{
  const shared=await backend.manage({action:'publish',solutionId:'starter-v2-test',brief:fixture},owner);
  const token=tokenOf(shared);
  assert.equal((await backend.team({action:'join',token},friend)).state,'pending');
  assert.ok(!(await db.doc('solutions/starter-v2-test').get()).get('teamMemberEmails').includes(friend.email));
  const listing=await backend.team({action:'list',solutionId:'starter-v2-test'},owner);
  assert.equal(listing.requests.length,1);
  await assert.rejects(backend.team({action:'approve',solutionId:'starter-v2-test',requestId:listing.requests[0].id},other));
  await backend.team({action:'approve',solutionId:'starter-v2-test',requestId:listing.requests[0].id},owner);
  const result=await backend.team({action:'join',token},friend);assert.equal(result.state,'joined');assert.equal(result.solutionId,'starter-v2-test');
  assert.equal((await db.doc('solutions/starter-v2-test').get()).get('status.S1-A'),'Original owner content');
});
test('email invitations send once, preserve pending membership, and accept only the intended verified email',async()=>{
  const input={action:'invite',solutionId:'starter-v2-test',brief:fixture,emails:[other.email]};
  const first=await backend.team(input,owner);assert.equal(first.invites[0].state,'sent');
  await backend.team(input,owner);assert.equal(sent.length,1);
  assert.ok(!(await db.doc('solutions/starter-v2-test').get()).get('teamMemberEmails').includes(other.email));
  const url=sent[0][2].match(/https:\/\/[^\s]+\/serveStarterBrief\/[a-f0-9]{64}/)[0];const token=url.split('/').pop();
  await assert.rejects(backend.team({action:'join',token},friend),error=>error.code==='permission-denied');
  await assert.rejects(backend.team({action:'join',token},{...other,verified:false}));
  assert.equal((await backend.team({action:'join',token},other)).state,'joined');
  await backend.team({action:'join',token},other);
  const emails=(await db.doc('solutions/starter-v2-test').get()).get('teamMemberEmails');assert.equal(emails.filter(email=>email===other.email).length,1);
});
test('failed mail remains retryable and is never reported as sent',async()=>{
  const input={action:'invite',solutionId:'starter-v2-test',brief:fixture,emails:['retry@example.test']};
  failMail=true;const failure=await backend.team(input,owner);assert.equal(failure.invites[0].state,'failed');
  failMail=false;const retry=await backend.team(input,owner);assert.equal(retry.invites[0].state,'sent');
});
