#!/usr/bin/env node
// Live evaluation only: writes local artifacts, never Firestore or deployed resources.
// node functions/scripts/evaluate-policy-brief.js request.json output-directory [runs]
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generatePolicyBrief } = require('../lib/policy-brief-generation');
const { createPolicyBriefModels } = require('../lib/policy-brief-models');
const { policyBriefToText } = require('../lib/shared/policy-brief');

async function main() {
  const [, , requestFile, outputDir, runCount = '1'] = process.argv;
  if (!requestFile || !outputDir || !/^[1-3]$/.test(runCount)) throw new Error('Usage: node functions/scripts/evaluate-policy-brief.js request.json output-directory [1–3 runs]');
  const request = JSON.parse(readFileSync(requestFile, 'utf8'));
  // Use the existing project's scoped runtime configuration without printing or saving credentials.
  let key = process.env.GEMINI_API_KEY;
  if (!key) {
    let config;
    try {
      config = JSON.parse(execFileSync('firebase', ['functions:config:get', 'gemini', '--project', 'new-worldgame', '--json'], { timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] }).toString());
    } catch { throw new Error('Live evaluation needs GEMINI_API_KEY or access to the existing project Gemini runtime configuration.'); }
    key = config.result?.key || config.result?.gemini?.key || config.key || config.gemini?.key;
  }
  if (!key) throw new Error('No Gemini credential is available for live evaluation.');
  mkdirSync(outputDir, { recursive: true });
  for (let run = 1; run <= Number(runCount); run++) {
    const models = createPolicyBriefModels(new GoogleGenerativeAI(key));
    const attempts = {};
    const traced = Object.fromEntries(Object.entries(models).map(([stage, call]) => [stage, async (...args) => {
      const result = await call(...args);
      // Local evaluation traces preserve inventory, source-linked findings and editorial checks.
      attempts[stage] = (attempts[stage] || 0) + 1;
      const suffix = attempts[stage] > 1 ? `-${attempts[stage]}` : '';
      writeFileSync(path.join(outputDir, `run-${run}-${stage}${suffix}.json`), typeof result === 'string' ? result : JSON.stringify(result, null, 2));
      return result;
    }]));
    const started = Date.now();
    const brief = await generatePolicyBrief(request, traced, new Date(), async message => console.log(`Run ${run}: ${message}`));
    writeFileSync(path.join(outputDir, `run-${run}-brief.json`), JSON.stringify(brief, null, 2));
    writeFileSync(path.join(outputDir, `run-${run}-brief.txt`), policyBriefToText(brief));
    console.log(JSON.stringify({ run, seconds: Math.round((Date.now() - started) / 1000), title: brief.title,
      components: brief.strategy.components.map(c => ({ title: c.title, treatment: c.treatment })), references: brief.references.length }));
  }
}
main().catch(error => {
  // SDK errors can contain a credential-bearing request URL. Never log those URLs.
  const message = String(error.message || error).replace(/https?:\/\/\S+/g, '[request URL]').replace(/AIza[\w-]+/g, '[credential]');
  console.error(message); process.exitCode = 1;
});
