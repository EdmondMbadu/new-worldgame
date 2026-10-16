import { mkdtempSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = mkdtempSync(path.join(tmpdir(), 'solution-feedback-rules-'));
copyFileSync(path.join(root, 'firestore.rules'), path.join(directory, 'firestore.rules'));
writeFileSync(path.join(directory, 'firebase.json'), JSON.stringify({
  firestore: { rules: 'firestore.rules' }, emulators: {
    firestore: { host: '127.0.0.1', port: 8197 }, hub: { port: 4427 }, logging: { port: 4527 }, ui: { enabled: false },
  },
}));
const environment = { ...process.env };
if (process.platform === 'darwin') {
  // The current emulator requires Java 21+, even when the shell defaults to 17.
  try {
    const runtime = execFileSync('/usr/libexec/java_home', ['-v', '21+'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    environment.JAVA_HOME = runtime;
    environment.PATH = `${runtime}/bin:${environment.PATH}`;
  } catch { /* Use the caller's Java configuration on other installations. */ }
}
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const result = spawnSync('firebase', ['emulators:exec', '--config', path.join(directory, 'firebase.json'), '--project', 'demo-solution-feedback', '--only', 'firestore',
  `${quote(process.execPath)} --test ${quote(path.join(root, 'functions/test/solution-feedback.rules.test.js'))}`,
], { cwd: directory, stdio: 'inherit', env: environment });
if (result.error) throw result.error;
process.exitCode = result.status || (result.signal ? 1 : 0);
