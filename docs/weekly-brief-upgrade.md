# Weekly brief video and source quality upgrade

## Behavior

Single, bulk, and scheduled briefs use the same source preparation and email renderer. Recipient selection, unsubscribe handling, subject format, and team/join sections are unchanged. The video card is immediately after the masthead, before the solution image.

In NWG News, edit an uploaded video and select **Find frames**, choose a timestamp, or upload a custom JPG/PNG/WebP. A manually selected 1200×675 JPEG includes a play button. The existing title and description become the email headline and teaser. New uploads automatically offer three candidate frames; replacements clear old thumbnail and duration metadata. Existing uploads missing a thumbnail now attempt server-side extraction during brief preview or preparation, saving the result for reuse. Curated video links remain supported. Keep `brief-curated-videos.ts` in sync with the legacy frontend curated catalog; a regression test checks IDs and URLs.

Automatic extraction checks 2 seconds, then 5 seconds, then 12%, 35%, and 65% of the duration, stopping at the first nonblank frame. This favors presenter introductions but is not face detection; an administrator can still choose another frame. It creates a 1200×675 JPEG from the actual uploaded file. A Firestore lease and an instance-local queue prevent duplicate work. Concurrent custom selections and video replacements take precedence. Only recognized uploaded-video storage paths are downloaded, pinned to a storage generation, with a 256 MiB size cap, 15-second download timeout, bounded decoding, and temporary-file cleanup. Failures retain the existing fallback and retry after one hour. Runtime FFmpeg is supplied by the [Google Cloud Node 20 system image](https://docs.cloud.google.com/functions/docs/reference/system-packages); local verification can set `NWG_FFMPEG_PATH` to an installed FFmpeg binary. No new production dependency is required.

In User Management, paste a specific `nwg-news?v=...` share link and preview/save. Select a solution in Single mode to preview its full email and review sources without sending. The preview uses the actual renderer in a sandboxed iframe. **Find fresh sources** bypasses the content cache. Source exclusions persist for that solution; **Restore and recheck** removes an exclusion and prepares fresh evidence. The selected video configuration remains shared across single, bulk and scheduled sends.

The email's default thumbnail uses the existing Sofia face artwork at `src/assets/img/landing-intro-sofia-thumbnail.jpg`. This is a branded fallback, not an extracted frame of the selected video. Explicit references to the old faceless `weekly-brief-video.jpg` placeholder also resolve to the face artwork; other custom thumbnails remain selected. This uses an existing hosting asset, so the email resolver update requires a backend deployment. Previously delivered emails retain their original image URL.

## Source pipeline

- Candidate URLs come from Gemini Google Search grounding metadata, never generated prose. Each category considers at most 15 retrieved sources and one replacement pass of at most 6.
- Public GETs pin DNS-validated addresses, validate every redirect, have bounded time and response size, and reject private/reserved destinations. 429/502/503/504 receive one short retry. PDFs are limited to 2 MB and eight pages.
- An editorial pass reads actual page text, checks authority, page match, relevance, freshness, eligibility and dates. Supporting quotations must occur in the fetched text. Model review is a quality gate, not a guarantee of editorial infallibility.
- News needs a supported date within 90 days. Funding deadlines and eligibility need evidence; unknown cycles are labeled. Scores below 75, expired deadlines, known dead links and unverified pages are excluded. Select up to five per category and at most two per host; send fewer if necessary.
- Cache keys include pipeline version, solution-context hash, and five-day period. Verification is fresh for less than 24 hours; selection rechecks expiry at rendering. Empty caches retry after 15 minutes. Old HTML-only caches are never reused.
- Cold research has a 400-second budget. Bulk continuation batches contain three recipients with at most three solutions preparing concurrently. Single calls and the admin preview allow 540 seconds; delivery never retries a failed preparation synchronously within the same batch.
- Structured cache documents retain statuses, supporting evidence, final URLs, and rejection reasons. Immutable `ai_insights_content_snapshots` preserve the records behind each preparation. Send quality metadata references the cache and snapshot. Server-only rules protect these collections from client-authored verification data.
- Additional manually entered links are checked for reachable substantive pages. A failed optional video or additional link is omitted; resource sections explicitly state when no verified sources are available. There is no fallback to unchecked legacy recommendations.

## Verification commands

```sh
npm run test:weekly-brief --prefix functions
npm run test:weekly-brief
CI=1 NG_BUILD_MAX_WORKERS=1 npx ng build --configuration production
```

The focused frontend test configuration avoids unrelated pre-existing errors in `app.component.spec.ts`, `src-object.directive.spec.ts`, and `no-auth.guard.spec.ts`. Chrome and permission to bind Karma's local test port are needed.

A read-only baseline audit is available with application-default credentials:

```sh
npm run build --prefix functions
cd functions
node scripts/audit-weekly-brief-links.js --project PROJECT_ID --limit 100 --output /tmp/weekly-brief-link-audit.json
```

This checks cached destinations, not links rewritten by an email provider. Review actual delivered HTML separately to diagnose tracking redirects. It does not send email or change Firestore.

## Release sequence

1. Deploy the Firestore and Storage rules with the backend. The new thumbnail path needs the Storage rule; verification caches and snapshots must be server-managed before using the new pipeline.
2. Deploy the updated single-send, bulk-worker and bulk-job-start functions, weekly automation function, and `previewAIInsightsBrief`. Deploy the frontend after the preview function is available. Use the repository's normal Firebase release process.
3. Before a production campaign, select the current weekly video, create its thumbnail, and inspect the preview. Test an uploaded video and a curated video, then verify that replacements show their new frame and preserve the same `v` ID.
4. Review several representative solutions in preview. Confirm source evidence, final destinations, dates, eligibility, and fewer-results behavior. No live-provider quality benchmark is implied by fixture tests.
5. Send an authorized internal test separately and inspect Gmail, Outlook, Apple Mail, narrow screens, dark mode and images disabled. Confirm the exact selected video opens when signed out. Check provider-rewritten links too.
6. Start with a small authorized batch. Inspect failures, preparation time, omitted sections and costs before the full weekly run. The more thorough verification uses more model calls than the previous pipeline.

No existing bulk job is migrated or replayed by this change. Already queued jobs use their saved recipients and video URL when the new worker runs. Rolling back code can reuse the old five-day caches; do not label those legacy results as verified under the new pipeline. Previously sent emails and versioned thumbnail files remain untouched.
