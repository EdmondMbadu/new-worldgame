# Last Light — clinic story implementation

Implemented locally on 2026-09-18. No production deployment or campaign-page changes.

## Player flow

Chapter map → clinic opening → drive → existing 18-second handover/commissioning scene → clinic closing → next opening.

- Openings use a lightweight illustrative clinician/clinic artwork, real clinic facts, a short prerecorded message and optional route/control details. The road prepares in parallel. The timer and driving input are frozen until Start delivery; the first driving input starts the clock.
- Both story screens use real HTML controls, readable transcripts, Play/Pause/Replay, settings, project context and an always-available continuation action once loading finishes. Starting or changing chapters immediately stops the old voice. Narration never gates progress.
- Driving has no radio narration or conversational instruction panels. The two supplied songs continue; Morning on the Ridge leads, Light at the Clearing follows naturally and is requested at arrival. Four-second equal-power transitions preserve playback through pause/mute and reverse safely on rapid scene changes. Road/vehicle effects are off by default and available separately in settings.
- Closings retain the live 3D world. The camera eases into a desktop side composition or a portrait clinic view. Reduced motion uses a fixed composition. Actual delivery score/integrity/time appear behind Your drive. Replaying arrival does not re-award completion or automatically repeat the closing speech.
- One shared `ClinicStoryView` handles both story screens. The existing engine still owns driving, scoring, failure and restoration; App owns the opening boundary and audio lifecycle. Rendering behind the opening artwork is suspended after scene preparation.

## Content and provenance

`content/drc-clinic-stories.json` is the game's static story manifest. A regression test checks the first five clinic IDs and full names against the campaign component in source order. It does not import Angular into the game or require a live campaign request.

1. Ndingi Clinic — completed 2.0 kW solar project supporting five documented care areas; explicitly a re-created journey.
2. CEAC / Nganga–Tsanga — documented eye clinic, 17 km from Tsanga Nord; sizing/schedule pending.
3. CEAC Nsioni — documented eye clinic; exact location, sizing and schedule pending.
4. CEAC Kiobo–Kwimba — documented clinic; sizing/schedule pending.
5. Centre Hospitalier Mont Sinaï — Boma; rooms/equipment and final sizing still to be confirmed.

Population stays null for all five: the attached assessment forms describe a different cohort. No invented population, saved-life total, private contact information, doctor endorsement or claim of real installations caused by gameplay is published. The game's numeric reserve and legacy `lives` result field remain simulation/save compatibility data and are not presented as patient counts.

The artwork is fictional, shared across openings and labelled illustrative. Ten local recordings use ElevenLabs' Sarah preset and multilingual v2, labelled **Scripted clinician · AI voice**. No real person's voice was cloned. The preferred Amara library candidate required an unavailable subscription tier; no upgrade was made. Scripts and generation provenance are recorded in the manifest and `clinic-story-asset-provenance.json`. Human field-team recordings can replace these files later; pronunciation and clinic testimony still need field approval for documentary use.

All narration is local MP3; no player-time paid API, key, speech-service dependency or browser TTS fallback. Playback failure leaves text and continuation available. English is the implemented narration language.

## Compatibility and release checks

- Existing saves, settings, records and chapter unlocks remain. A separate `drc-clinics.v1` story record prevents old fictional deliveries being silently credited to the new clinic story. Practice is never recorded, and repeat completion is deduplicated.
- Automated coverage includes all five missions, both road editions and route choices, input gating, save migration, audio teardown, delayed play promises, muted/blocked/missing audio, focus/context interruptions, narration boundaries, track transitions and source identity.
- Browser checks: complete real delivery, opening skip, no voice during driving, arrival narration, decoded audio for all ten files, desktop layout, 390 × 844 portrait and 844 × 390 landscape layouts. Responsive checks are browser viewport tests, not physical-phone certification.
- Full site build and hosting isolation verification pass. Last Light: approximately 1,015.5 KiB compressed code against the unchanged 1,200 KiB code budget; 22.43 MiB total compressed/code plus media assets against a revised 24 MiB asset budget. The increase covers the bundled recordings and 124 KiB WebP background, not a larger initial JavaScript payload. Existing Angular budget/CommonJS warnings remain non-blocking.
- Production verification rejects browser TTS and developer driving controls; checks every story recording and artwork asset. The development-only `/games/last-light/qa/clinic-story.html` fixture previews all five opening/closing pairs and decodes every voice file without writing saves. It is not part of the production entry.

Before a public release, perform a physical iOS Safari/Android audio-unlock and touch smoke test, and obtain field review if replacing fictional narration with real testimony. Production deployment remains a separate action.

## Commands

```sh
npm run test:games
npm run build
```

Local standalone preview: `http://127.0.0.1:4175/games/last-light/`.
