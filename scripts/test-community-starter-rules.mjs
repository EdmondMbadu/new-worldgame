import { mkdtempSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = mkdtempSync(path.join(tmpdir(), 'community-starter-rules-'));
copyFileSync(path.join(root, 'firestore.rules'), path.join(directory, 'firestore.rules'));
writeFileSync(path.join(directory, 'firebase.json'), JSON.stringify({
  firestore: { rules: 'firestore.rules' }, emulators: {
    firestore: { host: '127.0.0.1', port: 8198 }, hub: { port: 4428 }, logging: { port: 4528 }, ui: { enabled: false },
  },
}));
const environment = { ...process.env };
if (process.platform === 'darwin') {
  try {
    const runtime = execFileSync('/usr/libexec/java_home', ['-v', '21+'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    environment.JAVA_HOME = runtime;
    environment.PATH = `${runtime}/bin:${environment.PATH}`;
  } catch { /* Use the available Java runtime. */ }
}
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const result = spawnSync('firebase', ['emulators:exec', '--config', path.join(directory, 'firebase.json'), '--project', 'demo-community-starter', '--only', 'firestore',
  `${quote(process.execPath)} --test ${quote(path.join(root, 'functions/test/community-starter.rules.test.js'))}`,
], { cwd: directory, stdio: 'inherit', env: environment });
if (result.error) throw result.error;
process.exitCode = result.status || (result.signal ? 1 : 0);
