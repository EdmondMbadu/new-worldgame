const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { buildBriefEditionPlan } = require('../lib/brief-personalization');
const { withWeeklyBriefFallback } = require('../lib/brief-personalization');

const filename = path.join(__dirname, '../src/index.ts');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);

function loadQueue() {
  const docs = new Map();
  const automationPath = 'admin_settings/weekly_email_automation';
  let id = 0;
  let failCommit = false;
  let worker;
  const messages = [];
  let transaction = Promise.resolve();
  const ref = (key) => ({
    id: key.split('/').at(-1),
    key,
    collection: (name) => collection(`${key}/${name}`),
    get: async () => ({ exists: docs.has(key), data: () => docs.get(key) }),
    update: async data => docs.set(key, { ...docs.get(key), ...data }),
    set: async data => docs.set(key, data),
  });
  const collection = (name) => ({ doc: (docId = String(++id)) => ref(`${name}/${docId}`) });
  const db = {
    collection,
    doc: ref,
    batch: () => ({
      set() {},
      update() {},
      create() {},
      commit: async () => {},
    }),
    runTransaction(callback) {
      const run = transaction.then(async () => {
        const pending = new Map();
        const result = await callback({
          get: (target) => target.get(),
          create: (target, data) => {
            assert.ok(Buffer.byteLength(JSON.stringify(data)) < 1024 * 1024);
            pending.set(target.key, data);
          },
          set: (target, data) => {
            const existing = docs.get(target.key);
            pending.set(target.key, { ...existing, aiInsightsBrief: { ...existing?.aiInsightsBrief, ...data.aiInsightsBrief } });
          },
          update: (target, data) => pending.set(target.key, { ...docs.get(target.key), ...data }),
        });
        if (failCommit) throw new Error('commit failed');
        pending.forEach((data, key) => docs.set(key, data));
        return result;
      });
      transaction = run.catch(() => {});
      return run;
    },
  };
  const names = ['enqueueAIInsightsBulkJob', 'recordBriefQueueFailure', 'processAIInsightsBulkJob'];
  const statements = names.map((name) => source.statements.find((statement) =>
    (ts.isFunctionDeclaration(statement) && statement.name?.text === name) ||
    (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => declaration.name.getText(source) === name))
  ).getText(source));
  const code = ts.transpileModule(`${statements.join('\n')}\nglobalThis.enqueue = enqueueAIInsightsBulkJob;\nglobalThis.recordFailure = recordBriefQueueFailure;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const firestore = Object.assign(() => db, { FieldValue: {
    serverTimestamp: () => 123, increment: n => n, arrayUnion: (...values) => values,
  } });
  const runKey = '2026-11-15@13:00';
  const sandbox = {
    admin: { firestore },
    functions: { runWith: () => ({ firestore: { document: () => ({ onCreate: (handler) => { worker = handler; } }) } }) },
    exports: {},
    WEEKLY_EMAIL_AUTOMATION_DOC_PATH: automationPath,
    AI_INSIGHTS_BATCH_SIZE: 3,
    BRIEF_WEEKLY_AI_BUDGET_USD: 4.25,
    BRIEF_PACK_RESERVATION_USD: 0.22,
    briefEditionKeyForRun: () => '2026-11-15',
    briefInternalDocId: (prefix, id) => `${prefix}_${id}`,
    getAutomationTimezone: () => 'America/Los_Angeles',
    getDueAutomationRun: (schedule) => ({ due: schedule?.enabled && schedule.lastAttemptKey !== runKey, runKey }),
    buildBriefEditionPlan,
    loadWeeklyBriefFallback: async () => [{ kind: 'funding' }, { kind: 'news' }],
    hasWeeklyBriefFallback: (sources) => sources.length === 2,
    console: { log() {}, error() {} },
    runWithConcurrency: (items, _, callback) => Promise.all(items.map(callback)),
    prepareSharedBriefPack: async () => { throw new Error('Test provider outage'); },
    briefContentFromStoredSources: () => ({ fundersHtml: '', newsHtml: '', validFundersCount: 0, validNewsCount: 0 }),
    hydrateAIInsightsTeamMembers: async () => [],
    loadAIInsightsJoinOpportunityPool: async () => [],
    selectAIInsightsJoinOpportunities: () => [],
    hydrateBriefExtras: async payload => payload,
    withWeeklyBriefFallback,
    buildAIInsightsEmailFromCache: (_, content) => ({ html: `${content.fundersHtml}${content.newsHtml}`, subject: 'Brief' }),
    sgMail: { send: async message => messages.push(message) },
  };
  docs.set(automationPath, { aiInsightsBrief: { enabled: true } });
  vm.runInNewContext(code, sandbox);
  return {
    docs, ref, messages, automationPath, runKey, enqueue: sandbox.enqueue, recordFailure: sandbox.recordFailure, worker,
    setFailCommit: (value) => { failCommit = value; },
  };
}

test('a 287-recipient edition queues small batches and claims the scheduled slot atomically', async () => {
  const queue = loadQueue();
  const recipients = Array.from({ length: 287 }, (_, index) => ({
    userEmail: `member${index}@example.org`,
    userFirstName: 'Member',
    solutionId: `water-${index}`,
    solutionTitle: 'Clean water',
    solutionDescription: 'Clean water and sanitation. '.repeat(170),
  }));
  assert.ok(Buffer.byteLength(JSON.stringify(recipients)) > 1024 * 1024);
  const data = { recipients, createdBy: 'weekly-ai-insights-automation' };
  const automation = { runKey: queue.runKey, summary: 'Queued 287 recipients.' };

  queue.setFailCommit(true);
  await assert.rejects(queue.enqueue(data, automation), /commit failed/);
  assert.equal(queue.docs.size, 1);
  queue.setFailCommit(false);
  await queue.recordFailure(queue.runKey, 'commit failed');
  assert.equal(queue.docs.get(queue.automationPath).aiInsightsBrief.lastAttemptKey, undefined);

  const results = await Promise.all([queue.enqueue(data, automation), queue.enqueue(data, automation)]);
  const [job] = results.filter(Boolean);
  assert.equal(results.filter(Boolean).length, 1);
  const firstJob = queue.docs.get(`ai_insights_bulk_jobs/${job.jobId}`);
  assert.equal(firstJob.totalBatches, 96);
  assert.equal(firstJob.recipients, undefined);
  const batches = [...queue.docs].filter(([key]) => key.includes('/recipient_batches/'));
  assert.equal(batches.length, 96);
  assert.equal(batches.flatMap(([, batch]) => batch.recipients).length, recipients.length);
  assert.equal(batches[0][1].recipients[0].solutionDescription, recipients[0].solutionDescription);
  assert.equal(queue.docs.get(queue.automationPath).aiInsightsBrief.lastJobId, job.jobId);

  // The worker can load the new payload before it attempts to claim or deliver the job.
  await queue.worker({ data: () => firstJob, ref: { key: 'unused', get: async () => ({ data: () => ({ status: 'processing' }) }) } });
});

test('the bulk worker delivers both backup sections during a research provider outage', async () => {
  const queue = loadQueue();
  const job = await queue.enqueue({
    recipients: [{ userEmail: 'maker@example.org', userFirstName: 'Maker', solutionId: 'water', solutionTitle: 'Clean Water' }],
    createdBy: 'admin',
  });
  const edition = queue.docs.get(`ai_insights_content_cache/${job.editionDocId}`);
  const now = Date.now();
  edition.backupSources = [
    { kind: 'funding', title: 'Public grant', url: 'https://funding.example.org/apply', date: '', eligibility: 'Community projects', checkedAt: now, score: 90, status: 'verified' },
    { kind: 'news', title: 'Public article', url: 'https://news.example.org/article', date: new Date(now).toISOString().slice(0, 10), checkedAt: now, score: 90, status: 'verified' },
  ];
  const ref = queue.ref(`ai_insights_bulk_jobs/${job.jobId}`);
  await queue.worker({ data: () => queue.docs.get(ref.key), ref });
  assert.equal(queue.messages.length, 1);
  assert.match(queue.messages[0].html, /Public grant/);
  assert.match(queue.messages[0].html, /Public article/);
});
