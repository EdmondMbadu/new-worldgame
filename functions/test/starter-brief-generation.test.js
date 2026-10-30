const {test}=require('node:test');
const assert=require('node:assert/strict');
const {generateValidStarterBrief}=require('../lib/starter-brief-generation');
const brief={version:1,title:'A neighborhood garden',summary:'Families want to explore better access to fresh food.',challenge:'An unused plot might offer space, but permission and soil safety are unknown.',success:'Families could grow fresh food close to home.',approaches:[{title:'A small shared garden',text:'Explore whether residents would like to grow together.'}],firstTest:'Ask about permission and safe growing conditions before planting.',questions:['Who controls the plot?'],invitation:'Bring your local knowledge and help test this idea.'};
const notes={problem:'Families want affordable fresh food and are exploring a community garden.'};
test('a valid first response requires only one request',async()=>{
  let calls=0;
  assert.deepEqual(await generateValidStarterBrief(notes,async()=>{calls++;return JSON.stringify(brief);}),brief);
  assert.equal(calls,1);
});
test('repairs an overlong invitation without truncating the author’s notes',async()=>{
  const requests=[];
  const result=await generateValidStarterBrief(notes,async(prompt,timeout)=>{
    requests.push({input:JSON.parse(prompt),timeout});
    return JSON.stringify(requests.length===1?{...brief,invitation:'Local knowledge matters. '.repeat(20)}:brief);
  });
  assert.deepEqual(result,brief);assert.equal(requests.length,2);
  assert.deepEqual(requests[1].input.notes,notes);
  assert.ok(requests[1].input.previousDraft.includes('Local knowledge matters.'));
  assert.ok(requests[1].timeout<=requests[0].timeout);
});
test('never returns an invalid or invented factual response after repair',async()=>{
  let calls=0;
  await assert.rejects(generateValidStarterBrief(notes,async()=>{calls++;return JSON.stringify({...brief,challenge:'This affects 5000 families.'});}),/unsupported numbers/);
  assert.equal(calls,2);
});
test('provider payment failures are surfaced without a second paid request',async()=>{
  let calls=0;
  await assert.rejects(generateValidStarterBrief(notes,async()=>{calls++;throw new Error('402 Payment Required');}),/402/);
  assert.equal(calls,1);
});
test('repair does not start after the shared generation deadline',async()=>{
  let elapsed=0,calls=0;
  await assert.rejects(generateValidStarterBrief(notes,async()=>{calls++;elapsed=19000;return JSON.stringify({...brief,invitation:'x'.repeat(351)});},()=>elapsed),/deadline/);
  assert.equal(calls,1);
});
