const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Mail = require('@sendgrid/helpers/classes/mail');

// Run the actual callable bodies without credentials, Firebase, or real email delivery.
const filename = path.join(__dirname, '../src/index.ts');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
function extract(name) {
  const statement = source.statements.find(s =>
    (ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(source) === name)) ||
    (ts.isFunctionDeclaration(s) && s.name?.text === name));
  assert.ok(statement, `Missing production implementation: ${name}`);
  return statement.getText(source);
}

function loadSender(name, { failSend = false } = {}) {
  const messages = [];
  const writes = [];
  class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }
  const runRef = { id: 'test-run', set: async data => writes.push(data) };
  const firestore = () => ({ collection: () => ({ doc: () => runRef }) });
  firestore.FieldValue = { serverTimestamp: () => 'timestamp' };
  const sandbox = {
    exports: {}, URL, console: { error() {} },
    functions: { https: { HttpsError }, runWith: () => ({ https: { onCall: handler => handler } }) },
    ensureAuthed: context => { if (!context.auth) throw new HttpsError('unauthenticated', 'Sign in'); },
    admin: { firestore },
    prepareBulkEmailAttachments: async attachments => attachments || [],
    getSendGridBulkAttachments: attachments => attachments.map(a => a.sendGrid).filter(Boolean),
    appendBulkAttachmentLinks: (html, attachments) => html + attachments.filter(a => a.linkOnly)
      .map(a => `<a href="${a.downloadUrl}">${a.filename}</a>`).join(''),
    setTimeout: callback => callback(),
    sgMail: { send: async message => {
      // Exercise the real SDK's camelCase -> API payload conversion, without its transport.
      messages.push(JSON.parse(JSON.stringify(Mail.create(message).toJSON())));
      if (failSend) throw new Error('Simulated provider failure');
      return [{ statusCode: 202, headers: { 'x-message-id': 'test-message' } }];
    } },
  };
  const code = ts.transpileModule([
    extract('injectHiddenPreheader'), extract('htmlToPlainText'), extract(name),
  ].join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, sandbox);
  return { send: sandbox.exports[name], messages, writes };
}

const videoUrl = 'https://globalsolutionlab.com/nwg-news?v=LtuwKETteayh0E2HM1LC#video';
const html = `<body><a href="${videoUrl}">Watch the Video</a><a href="https://newworld-game.org/home">Home</a><a href="mailto:hello@example.org">Contact</a><a href="{{unsubscribeUrl}}">Unsubscribe</a><p>Direct link: ${videoUrl}</p></body>`;
const attachments = [
  { filename: 'guide.pdf', sendGrid: { filename: 'guide.pdf', type: 'application/pdf', content: 'cGRm', disposition: 'attachment' } },
  { filename: 'film.mp4', linkOnly: true, downloadUrl: 'https://storage.example/film.mp4?alt=media&token=test' },
];
const context = { auth: { uid: 'test-admin' } };
const payload = { subject: 'Hello {{firstName}}', html, preheader: 'This week', attachments };

function assertDirectLinks(message) {
  assert.deepEqual(message.tracking_settings.click_tracking, { enable: false, enable_text: false });
  assert.deepEqual(message.tracking_settings.open_tracking, { enable: true });
  const content = message.content.find(c => c.type === 'text/html').value;
  for (const expected of [videoUrl, 'https://newworld-game.org/home', 'mailto:hello@example.org', '{{unsubscribeUrl}}', attachments[1].downloadUrl]) {
    assert.ok(content.includes(expected), `Preserve ${expected}`);
  }
  assert.ok(message.content.find(c => c.type === 'text/plain').value.includes(videoUrl));
  assert.ok(content.includes('This week'));
  assert.equal(message.attachments[0].content, 'cGRm');
  assert.ok(!content.includes('url6973.newworld-game.org'));
}

test('test campaign sends preserve direct links in HTML and text at the SendGrid API boundary', async () => {
  const harness = loadSender('sendBulkTestEmail');
  const result = await harness.send({ ...payload, to: 'recipient@example.org' }, context);
  assert.equal(result.ok, true);
  assert.equal(result.messageId, 'test-message');
  assert.equal(harness.messages.length, 1);
  assertDirectLinks(harness.messages[0]);
  assert.deepEqual(harness.messages[0].categories, ['bulk-mail-tester']);
});

test('every bulk batch disables rewriting and preserves merge fields, unsubscribe URLs, and attachments', async () => {
  const harness = loadSender('sendBulkHtml');
  const recipients = Array.from({ length: 501 }, (_, i) => ({ email: `reader${i}@example.org`, fields: { firstName: `Reader ${i}` } }));
  const result = await harness.send({ ...payload, recipients }, context);
  assert.equal(result.total, 501);
  assert.equal(result.summary.batches, 2);
  assert.deepEqual(harness.messages.map(m => m.personalizations.length), [500, 1]);
  for (const message of harness.messages) {
    assertDirectLinks(message);
    assert.deepEqual(message.categories, ['bulk-mail-html']);
    for (const recipient of message.personalizations) {
      assert.match(recipient.subject, /^Hello Reader \d+$/);
      assert.equal(recipient.substitutions['{{unsubscribeUrl}}'], `https://newworld-game.org/unsubscribe?e=${encodeURIComponent(recipient.to[0].email)}`);
    }
  }
  assert.equal(harness.writes.at(-1).status, 'completed');
});

test('callers cannot re-enable insecure tracking with extra payload fields', async () => {
  for (const name of ['sendBulkTestEmail', 'sendBulkHtml']) {
    const harness = loadSender(name);
    await harness.send({ ...payload, to: 'reader@example.org', recipients: ['reader@example.org'],
      trackingSettings: { clickTracking: { enable: true, enableText: true } },
      tracking_settings: { click_tracking: { enable: true, enable_text: true } },
    }, context);
    assertDirectLinks(harness.messages[0]);
  }
});

test('authentication and invalid-input rejections still prevent delivery', async () => {
  for (const name of ['sendBulkTestEmail', 'sendBulkHtml']) {
    const harness = loadSender(name);
    await assert.rejects(harness.send(payload, {}), { code: 'unauthenticated' });
    await assert.rejects(harness.send({ ...payload, to: 'invalid', recipients: [] }, context), { code: 'invalid-argument' });
    assert.equal(harness.messages.length, 0);
  }
});

test('test-send provider failures preserve the existing error contract', async () => {
  const harness = loadSender('sendBulkTestEmail', { failSend: true });
  await assert.rejects(harness.send({ ...payload, to: 'reader@example.org' }, context), { code: 'internal' });
});
