const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { renderBriefVideo } = require('../lib/brief-video');
const { escapeBriefHtml } = require('../lib/brief-sources');
// Exercise the actual shared renderer without initializing Firebase triggers or email clients.
const path = require('node:path').join(__dirname, '../src/index.ts');
const sourceFile = ts.createSourceFile(path, fs.readFileSync(path,'utf8'), ts.ScriptTarget.Latest, true);
function extract(name) {
  const statement = sourceFile.statements.find(s => ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(sourceFile) === name));
  assert.ok(statement, `Missing shared function ${name}`); return statement.getText(sourceFile);
}
function loadRenderer(extra={}) {
  const code=ts.transpileModule(`${extract('buildAIInsightsEmailFromCache')}\n${extract('buildAIInsightsEmail')}\nglobalThis.render=buildAIInsightsEmailFromCache;globalThis.build=buildAIInsightsEmail;`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const sandbox={URL,Date,console,APP_BASE_URL:'https://newworld-game.org',escapeHtml:escapeBriefHtml,renderBriefVideo,...extra};
  vm.runInNewContext(code,sandbox);return sandbox;
}
const payload={userEmail:'Maker@Example.org',userFirstName:'Taylor',solutionId:'water-project',solutionTitle:'Clean Water',solutionImage:'https://media.example/solution.jpg',
  teamMembers:[{name:'Alex',email:'alex@example.org'}],joinOpportunities:[{solutionId:'food',title:'Food project',joinUrl:'https://newworld-game.org/dashboard/food'}],additionalLinks:[{label:'Explore the lab',url:'https://newworld-game.org/about'}]};
const content={fundersHtml:'<tr><td>Verified funder</td></tr>',newsHtml:'<tr><td>Verified article</td></tr>',validFundersCount:1,validNewsCount:1};
const video={url:'https://newworld-game.org/nwg-news?v=weekly',title:'The weekly video',teaser:'Latest work',thumbnailUrl:'https://media.example/thumbnail.jpg',durationSeconds:120,status:'ready',reason:''};

test('shared email renderer promotes the video while preserving personalization, team, join, preference and unsubscribe links',()=>{
  const result=loadRenderer().render({...payload,briefVideo:video},content);
  assert.equal(result.subject,'Weekly Global Solutions Lab Intelligence Brief: Clean Water');
  assert.ok(result.html.indexOf('The weekly video')<result.html.indexOf('https://media.example/solution.jpg'));
  for(const expected of ['Dear Taylor','alex@example.org','Food project','Verified funder','Verified article','Explore the lab','/problem-list-view?weeklyBrief=1','/unsubscribe?e=maker%40example.org']) assert.ok(result.html.includes(expected),expected);
  assert.equal(result.verifiedNews,1);assert.equal(result.verifiedFunders,1);
});
test('briefs without a video retain all existing content without an empty video card',()=>{
  const result=loadRenderer().render(payload,content);
  assert.ok(!result.html.includes('WEEKLY VIDEO BRIEFING'));assert.ok(result.html.includes('Verified funder'));assert.ok(result.html.includes('Clean Water'));
});
test('a brief with verified news leaves out the empty funding section', () => {
  const result = loadRenderer().render(payload, {
    ...content, fundersHtml: 'No verified funding links available today.', validFundersCount: 0,
  });
  assert.ok(result.html.includes('Verified article'));
  assert.ok(!result.html.includes('>Funding Opportunities</h3>'));
  assert.ok(!result.html.includes('No verified funding links'));
});
test('single-send preparation blocks delivery when both source sections are empty', async () => {
  class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  const renderer = loadRenderer({
    functions: { https: { HttpsError } },
    generateSolutionAIContent: async () => ({ ...content, validFundersCount: 0, validNewsCount: 0 }),
    hydrateBriefExtras: async data => data,
  });
  await assert.rejects(renderer.build(payload), error => error.code === 'failed-precondition');
});
test('single-send preparation passes verified content and resolved video through the shared renderer',async()=>{
  const calls=[];
  const renderer=loadRenderer({generateSolutionAIContent:async(...args)=>{calls.push(args);return {...content,quality:{snapshotId:'snapshot-1'}};},hydrateBriefExtras:async data=>({...data,briefVideo:video})});
  const result=await renderer.build(payload);
  assert.equal(calls[0][0],'water-project');assert.ok(result.html.includes('The weekly video'));assert.equal(result.quality.snapshotId,'snapshot-1');
});

test('the test-send callable sends one email to the authenticated admin', async () => {
  const adminCheck = sourceFile.statements.find(statement =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'requireBriefAdmin'
  );
  const code = ts.transpileModule(
    `${adminCheck.getText(sourceFile)}\n${extract('sendAIInsightsEmail').replace(/^export /, '')}\nglobalThis.send = sendAIInsightsEmail;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  const messages = [];
  const logs = [];
  const sandbox = {
    console: { log() {}, error() {} },
    functions: {
      https: { HttpsError },
      runWith: () => ({ https: { onCall: handler => handler } }),
    },
    admin: { firestore: () => ({
      doc: path => ({ get: async () => ({
        data: () => path === 'users/admin' ? { admin: true, firstName: 'Edmond' } : {},
      }) }),
    }) },
    hydrateAIInsightsTeamMembers: async () => [],
    hydrateAIInsightsJoinOpportunities: async () => [],
    buildAIInsightsEmail: async data => ({ html: data.videoSummaryUrl, subject: data.solutionTitle }),
    sgMail: { send: async message => { messages.push(message); } },
    writeAIInsightsLog: async log => { logs.push(log); },
  };
  vm.runInNewContext(code, sandbox);
  const request = { ...payload, testToSelf: true, videoSummaryUrl: 'https://youtu.be/vLIhfgoP7-s' };
  await assert.rejects(sandbox.send(request, { auth: { uid: 'other', token: { email: 'other@example.org' } } }),
    error => error.code === 'permission-denied');
  const result = await sandbox.send(request, { auth: { uid: 'admin', token: { email: 'admin@example.org' } } });

  assert.equal(result.recipientEmail, 'admin@example.org');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'admin@example.org');
  assert.equal(messages[0].subject, '[Test] Clean Water');
  assert.equal(messages[0].html, request.videoSummaryUrl);
  assert.equal(logs[0].recipients[0].email, 'admin@example.org');
});
