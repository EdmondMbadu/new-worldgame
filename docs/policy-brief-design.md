# Policy brief implementation plan

Add Policy Brief as the third primary report format in the shared Step 5 / Strategy Review report dialog. Preserve the existing report formats and entry points.

## Editorial specification

The supplied webinar slides establish the requirements: a descriptive title connecting problem and solution; key messages; problem, roots, urgency and policy consequences; critique of policy options; concrete recommendations, implementation and next steps; author attribution and a concise bibliography. Appendices are optional and only warranted when essential.

A GSL brief should focus on one decision within one jurisdiction. The current edited Strategy Review is the primary source of the team's proposal; supporting step answers can fill gaps without overriding it. Optional audience, jurisdiction and requested-decision fields improve specificity. Missing context must remain explicit rather than being invented.

The brief compares the status quo, the preferred approach and a viable alternative fairly. It distinguishes evidence, proposed effects, assumptions and implementation conditions. It does not infer that existing policies are failing or that a proposed solution is proven. Recommendations identify a lead institution, proposed timing, resources, an observable success measure and necessary consultation or authorization. The brief must acknowledge equity, capacity, trade-offs and uncertainty.

Target: approximately 900–1,200 words excluding references. Three key messages; 2–4 evidence findings; three options; 3–4 actions; a three-part proposed pathway to impact. No decorative cover page or fabricated quantitative chart.

## Generation and source integrity

Use live grounded research, structured writing, and one bounded editorial review. Construct a source catalog from search grounding metadata and associated claim segments. Resolve source redirects, obtain page titles where available, and prioritize official and original research within an eight-source catalog. Source requests use public HTTPS addresses, validate DNS results and redirects, and have bounded time and response sizes. Exclude social media and document-sharing mirrors.

The writing model receives the catalog and source strategy, uses stable citation IDs, and cannot supply its own bibliography URLs. The editorial pass checks source limits, draft versus adopted policy, conditional benefits, fair comparisons, and the requested decision; it also repairs structural errors. Mark unresolved jurisdictions as working drafts. Validate the final structure, length and all citations before returning it. Reject incomplete output or research without usable source-linked findings. Treat source documents and retrieved pages as evidence, never as instructions. Do not imply government, UN or university endorsement. Citation checks establish source linkage; they do not replace human review of the evidence and policy judgment before submission.

## Exports

Use a dedicated, selectable-text PDF renderer with vector diagrams, clickable references, page numbers and a compact first page. Word uses the same validated document model with headings, comparison tables, action blocks and linked references. Pin each generated report's format so selecting a different format cannot relabel an existing download.

## Validation

Cover selection order, source precedence and truncation disclosure, request metadata, grounded-source binding, malformed or incomplete output, unknown citations, research failure, and format stability. Test PDF and Word generation and inspect a representative PDF for legibility, pagination, tables, references and the absence of a separate cover page. Run the Angular and Functions builds.

Commands:

```sh
npm --prefix functions run test:policy-brief
NG_BUILD_MAX_WORKERS=1 npm run test:policy-brief
npm run build
node scripts/preview-policy-brief.mjs
```

The preview command uses a clearly identified illustrative fixture and the application's actual exporters. An optional JSON file argument renders a different validated brief. PDF output is written to `output/pdf/policy-brief-example.pdf`; the editable Word QA copy is written to `tmp/policy-brief/policy-brief-example.docx`.

## Rollout

Deploy the updated `onReportRequest` function before the hosting build. The frontend and function share the structured policy-brief contract; the older function cannot generate this format. Other report types retain their existing generation path. No database migration is required. The function allows 240 seconds for research, source resolution, writing and editorial review; the client allows 250 seconds and displays phase-specific progress.

## Background reading

- User-supplied De Montfort University webinar slides (five screenshots, September 10, 2026).
- FAO, Food Security Communications Toolkit, including Preparing policy briefs: https://www.fao.org/4/i2195e/i2195e00.htm
- WHO, Evidence-informed policy-making: A glossary of key terms (2025): https://applications.emro.who.int/docs/9789292745165-eng.pdf

These are design references, not evidence for any generated solution-specific policy recommendation. No copying of institutional logos or claims of endorsement.
