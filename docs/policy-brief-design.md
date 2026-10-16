# Policy briefs that preserve the whole strategy

Policy Brief remains the third primary report format in the shared Step 5 / Strategy Review dialog. The existing step questions and question schema are unchanged. The default report translates the whole strategy into a coordinated policy package. A team may explicitly select a component for a focused brief; entering a decision or custom writing instructions does not silently change that scope.

## Scope and source integrity

The edited strategy is primary. Supporting answers retain their stable question IDs, actual question wording and paragraph breaks; they fill gaps without overriding the edited proposal. Policy needs (S3-B), implementation partners and location (S4-D), funding, costs and success measures remain available without another step question. The duplicate S5 answer is excluded from supporting answers because the edited strategy is already supplied separately.

Source material is preserved in full up to 500,000 characters, with a separate 750,000-byte UTF-8 ceiling to leave room for metadata and the generated brief in the Firestore request document. Both browser and server use the same validator. The old head-and-tail excerpts have been removed. Oversized input produces an actionable error before creating a report request; nothing is silently omitted. Each new brief records a SHA-256 source fingerprint, character count and generator version. The existing request document retains the actual submitted source, scope, context and editorial preferences.

The original 120,000-character ceiling incorrectly rejected a saved democracy solution whose edited strategy alone was about 170,000 characters; its complete source with supporting answers is about 342,000 characters. Regression tests preserve comparable input through request construction and server review, and separately reject excessive UTF-8 payloads. The request is built once inside the error handler before starting the loading state or Firestore subscription.

Saved evaluator feedback is independent of report generation. Its explicit `solutions/{solutionId}/aiFeedback/latest` rule requires authentication and the parent solution's read permission, validates creates/updates, and denies arbitrary feedback IDs, collection listing and deletion. Anonymous visitors skip this optional read. Run `node scripts/test-solution-feedback-rules.mjs` to verify member access, private-solution isolation and malformed writes against a disposable local emulator.

The report dialog defaults to Whole strategy and offers Selected component with a required focus description. Unknown audience, jurisdiction, authority, partners, costs and commitments remain explicit. Global scope does not imply a UN mandate or a single government's authority. A selected focus absent from the strategy is rejected before research.

## Generation and quality review

The deployed function and local live evaluation use the same model factory and prompts:

1. Interpret the entire strategy before research. Inventory major workstreams, naming their constituent measures, with stable component IDs, exact source quotes and tentative policy directions. Validate source provenance and retain substantive contradictions between the edited proposal and supporting material. Repair an invalid inventory at most once. The repair provides numbered, server-extracted passages across the entire source and asks the model to select passage IDs instead of reproducing quotations. The server inserts the exact original passage and still validates its provenance, all component IDs and uniqueness. Unknown/forged passages remain invalid; nothing is fuzzy-matched or invented. Successful inventories retain their original path and call count. Incomplete sources can have a single workstream and unconfirmed implementation details; no extra interventions are invented to reach a suggested count.
2. Research across the entire policy package, using primary official publications and original research. Keep the findings concise and distribute attention across policy families instead of exhausting the budget on early measures. Resolve and inspect up to 96 search candidates without shifting grounding indices; retain an eight-source catalog with claim-linked findings. Retry once with Gemini 3.8 Flash if the initial Flash call returns insufficient usable grounded evidence. Never substitute ungrounded generation.
3. Write a coordinated decision brief. Compare the status quo, preferred package and a credible alternative at the same decision stage. Identify proposed policy instruments, authorizing and delivery roles, recurring resources, equity, dependencies and observable success measures. Cover each inventory component through a substantive policy response and relevant recommendation links, or explain its deferral. Whole-strategy scope cannot mark a component outside scope.
4. Use an independent Gemini 3.8 Flash editor to critically revise against the original source, inventory and grounded findings. Review title, decision, options and recommendations for substantive breadth, not merely token mentions. Check the inventory itself for missing major components. Review citations, factual claims, evidence limits and institutional authority; distinguish proposed bills and informational pages from impact evaluations. Return a revised brief and explicit coverage, evidence and option-comparability checks with a separate unresolved-issues list. Completed corrections are not unresolved failures. Reject a failed substantive audit. Permit one bounded format repair with all detected field-length errors reported together; repeat the substantive checks and reject any still-invalid final document.

Target 900–1,500 words, allowing up to 2,200 for a complex package. A separate supporting coverage section follows the main brief and is bounded to 1,200 words, preserving necessary workstreams without forcing the decision narrative to list every detail. Explicit combined section budgets prevent repetition. Version 2 allows 2–8 evidence findings and 3–8 recommendations. Included components use an empty rationale; phased/deferred or outside-scope components require a reason. Source quotes and research provenance are audit metadata, not extra prose in the exported brief.

## Shared contract and exports

New briefs use version 2. Server-owned metadata binds the scope, objective and complete component inventory to the original interpretation. Validation rejects missing, duplicate or unknown components, outside-scope treatment in whole-strategy mode, unsupported finding IDs, mismatched finding/source associations, invalid action links, unsupported versions and excessive length. Supporting research findings are retained with their source IDs so evidence provenance remains inspectable after generation. Citation linkage and model editorial review do not establish that every claim is true; human evidence and policy judgment remain necessary before submission.

PDF, Word and text share the same document model and visibly include scope, how every strategy component is advanced, related action numbers, implementation dependencies and substantive source differences. Existing version 1 briefs retain their legacy reading and export path; no database migration is required. Each generated report's format and scope remain attached to that result when a different report type or scope is later selected.

## Verification

Deterministic tests cover source preservation and oversize errors, stable question IDs, missing or invalid scope, absent focus, whole-strategy coverage, explicit component selection, exact source provenance, malformed model output, failed editorial audits, source/finding associations, grounded-research retry, later grounding indices, legacy compatibility and format stability. Browser tests exercise the actual PDF and Word exporters for both versions. Mocked model tests check orchestration and rejection behavior; live model evaluation is needed separately to assess actual writing and semantic fidelity.

Commands:

```sh
npm --prefix functions run test:policy-brief
NG_BUILD_MAX_WORKERS=1 npm run test:policy-brief
npm run build
node scripts/preview-policy-brief.mjs
# Optional validated fixture and separate output directory:
node scripts/preview-policy-brief.mjs path/to/brief.json /private/tmp/policy-brief-preview
```

Live evaluation never writes to Firestore or deploys resources. It uses GEMINI_API_KEY or the existing project's scoped Gemini runtime configuration without printing or saving credentials:

```sh
npm --prefix functions run build
node functions/scripts/evaluate-policy-brief.js request.json /private/tmp/policy-brief-evaluation 2
```

The request JSON contains source, authors, context, scope and instruction. The run count is bounded to 1–3. Local traces record interpretation, grounded research, writing, editorial review and the validated final brief. Use synthetic examples by default; sending a supplied private document requires the applicable authorization.

Inspect actual generated outputs for breadth, evidence limits and usable next steps. Render representative PDFs and Word exports and inspect pagination, links, comparison tables and component coverage. Do not treat passing mocked responses as proof of actual model quality.

Production failures for the Socratic Lens solution stopped during inventory validation: the model's quotation could not be matched verbatim even after repair. The source-anchor repair addresses this transcription failure without relaxing evidence or final editorial review. Public errors now distinguish inventory mapping, service timeouts and quota exhaustion; provider URLs and private source passages remain excluded from those messages.

Copied workshop schedules, platform tutorials and unrelated examples remain background material unless the team actually proposes them as solution measures. The planner and independent editor use the solution title, overview and substantive proposal passages to establish relevance; ambiguity remains a confirmation gap. This preserves genuine training and curriculum interventions without treating every pasted lab activity as another policy workstream.

## Rollout and limits

Deploy the updated onReportRequest function and feedback Firestore rules before the hosting build. The function has a 540-second deadline and the policy-brief client allows 550 seconds. Planning is bounded to 45 seconds; initial research and writing to 65 seconds (90 seconds for the alternate-model research retry). Review allows 100 seconds for prompts above 120,000 characters and 65 seconds otherwise: the full saved democracy solution exceeded the previous review deadline. There is at most one additional planning call, one research retry, and one final format-repair call (seven calls maximum). Public-source inspection remains bounded by request time, response size and redirect count, with HTTPS and public DNS validation. Other report types retain their generation path and client deadline. The shared server deadline accommodates the bounded policy path.

## Editorial references

FAO, Food Security Communications Toolkit, section Preparing policy briefs: https://www.fao.org/4/i2195e/i2195e.pdf

WHO, Evidence-informed policy-making glossary: https://applications.emro.who.int/docs/9789292745165-eng.pdf

These explain editorial practice; they are not evidence for solution-specific recommendations or institutional endorsement.
