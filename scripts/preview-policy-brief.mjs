import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Exercise the same PDF and Word renderers shipped in the application.
const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = path.join(root, 'tmp/policy-brief');
await mkdir(scratch, { recursive: true });
const modulePath = path.join(scratch, 'export.cjs');
await build({
  entryPoints: [path.join(root, 'src/app/utils/policy-brief-export.ts')],
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: modulePath,
});
const require = createRequire(import.meta.url);
const { createPolicyBriefPdf, buildPolicyBriefDocx } = require(modulePath);
const { parsePolicyBrief } = require('../functions/lib/shared/policy-brief.js');
const { Packer } = require('docx');
const source = process.argv[2] || path.join(root, 'functions/test/fixtures/policy-brief.json');
const brief = parsePolicyBrief(JSON.parse(await readFile(source, 'utf8')));
const output = path.join(root, 'output/pdf');
await mkdir(output, { recursive: true });
const pdf = createPolicyBriefPdf(brief);
await writeFile(path.join(output, 'policy-brief-example.pdf'), new Uint8Array(pdf.output('arraybuffer')));
await writeFile(path.join(scratch, 'policy-brief-example.docx'), await Packer.toBuffer(buildPolicyBriefDocx(brief)));
console.log(`Policy brief exported: ${pdf.getNumberOfPages()} PDF pages. Word QA copy written to tmp/policy-brief.`);
