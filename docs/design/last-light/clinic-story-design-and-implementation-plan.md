# Last Light: clinic stories at the beginning and end

Design and implementation plan, 2026-09-18. This document records the original design-stage proposal. The subsequently approved implementation is documented in [the implementation handoff](clinic-story-implementation.md); its decisions supersede proposed details below. No production deployment has been performed. The prior two-song implementation is retained. “Flight” is interpreted as the driving/travel portion of Last Light, not the separate Lost in Orbit game.

## Outcome

A human-sounding clinic message gives the drive meaning before it begins. The player then travels without spoken coaching, radio dialogue or large instructional interruptions. Arrival has room to breathe: the team receives the kit, power returns in the simulated scene, and a concise closing message acknowledges the delivery. Success belongs to the clinic team and player together, not an invented lives-saved counter.

Use the campaign page's first five clinics, in order: Ndingi; CEAC Nganga–Tsanga; CEAC Nsioni; CEAC Kiobo–Kwimba; Mont Sinaï. The attached forms describe a different cohort; [source audit](clinic-story-source-audit.md) records their figures and the unresolved joins. Do not import those figures into these five chapters.

The first playable slice should be Ndingi, marked as a re-created journey inspired by its completed project. Missing populations and testimonies do not block the UI prototype: omit unsupported counters and use clearly scripted messages. They do block publishing factual population-based narration or real-clinician testimony.

## Experience flow

`Chapter map → Clinic opening → Drive → Kit handover/restoration → Clinic closing → Next opening`

### Opening: meet the clinic before touching the wheel

- One full-screen composition, not a stack of dashboard cards. A dignified clinic scene or approved photograph establishes place; a readable teal gradient carries cream type and a gold primary button.
- Clinic name/location, one emotional sentence, and at most two verified facts. Ndingi may show **2.0 kW documented solar project** and **five care areas supported by the real project**. Other clinics show verified stage/location or omit unknown facts, rather than invent population/capacity cards.
- A small, illustrated clinician message area creates human presence. Default label: **Scripted clinician · illustrative portrait**. Do not invent a named doctor, imply an AI face is staff, or present this as an approved testimony.
- A roughly 20–30 second voice message explains the story and task. Use a small Play/Pause/Replay control and transcript. Start delivery is available without waiting for the message to end; pressing it explicitly stops narration before driving inputs become active.
- Controls and route choices belong here: drive/steer/brake/deliver/recover, traffic/right-side driving, the main road versus firm bypass, and the next chapter's hazard icons. An optional accessible Route & controls drawer offers fuller instructions.
- Keyboard instructions must reflect the player's saved bindings; touch and controller versions must reflect the active adapter. Do not hard-code W/A/S/D when remapped.
- The mission clock is frozen during narration/loading. Heavy scene preparation can occur behind this HTML/CSS screen, without postponing the first readable content or forcing voice playback.
- Ndingi's heading and story explicitly distinguish a historical/simulated delivery from its already-installed real solar system. Other routes, weather, reserve timers and emergencies are game fiction, not clinic assessment facts.

### Drive: concentration, rhythm, atmosphere

No human voice, regardless of a returning player's existing `voice: true` preference. No long radio subtitle boxes, repeated encouragement or spoken recovery/cargo/traffic messages. Remove conversational instruction panels, not the vehicle simulation.

Requested music-only mix: Morning on the Ridge remains the main track and Light at the Clearing follows using the existing crossfade behavior. Separate optional road/vehicle effects let a player choose Music + road sounds, but the true music-only mode must mute those effects without muting the music. Master mute/volume still work.

Keep essential instruments and contextual actions: reserve, kit integrity, speed, destination direction, brake/reverse/delivery/recovery affordances. Move hazard communication into road signs, reflectors, bridge clearance, vehicle lights, water markings and compact condition icons. No narrated tutorials. Keep concise accessible labels/optional hazard text for players who cannot rely on color or scenery alone; assistive screen-reader output is not fictional radio speech.

Before removing spoken warnings, verify that a first-time player can read the bridge, washout, cliff, goats, tree and flood in time using the scene. The existing warning-distance logic remains intact. If a warning is unreadable, strengthen the visual marker or overview, not a new voice interruption.

### Closing: let the player's delivery land

- Retain the existing team handover and 18-second restoration sequence, with no extra spoken instruction during the travel-to-arrival boundary. The clock stops at accepted delivery, as today.
- Show the receiving team and warm clinic light. A still or low-cost camera composition supports a concise ending panel; no confetti, distress imagery, excessive score animations or full-screen video requirement.
- Closing narration starts once on entering the closing view, after the restoration scene, not on every frame or every result-card render. Aim for 12–20 seconds. Replay message/arrival is explicit and optional.
- Foreground **delivery complete in this story**, the clinic name and the team message. Secondary expandable **Your drive** contains actual points, stars, kit integrity and time to spare; values come from the frozen accepted result, not mockup numbers.
- For Ndingi, a separate **Documented real project** block may list the five care areas and 2.0 kW system. Do not imply the player installed that real system or that every clinic has those five services.
- Remove **LIVES SAVED**, the fictional 34-life total and claims of patient treatments/deaths prevented from the new campaign UI. Where approved population data exists, use **Reported community served**, not an achievement score. For this selected cohort, hide the unsupported number.
- Show **1 / 5 chapters complete**, not **one real clinic powered by you**. The fifth ending says **Five journeys completed**; real campaign installation statuses remain unchanged.
- Primary Next clinic/Return to chapter map is usable while voice plays; it cancels the old clip before the next screen. No mandatory completion wait. The installation of roof panels is a later commissioning beat, never instantaneous magic caused by unloading a battery.
- Failure has no invented impact celebration. Offer clear retry/checkpoint practice actions; checkpoint practice stays unscored and does not award campaign/community progress.

## Visual system and responsive behavior

Concepts: [opening v1](clinic-story-concepts/opening-v1.png), [closing v1](clinic-story-concepts/closing-v1.png). Both were created with the built-in image-generation tool; [prompts and provenance](clinic-story-concepts/prompts-and-provenance.md) records the exact prompt set and limitations. The pictured clinician and clinic layout are illustrative, not approved evidence.

Preserve the established game identity: teal `#152e2d` / `#214c45`, cream `#f2eddb`, gold `#e8c276`, DM Sans/system body, condensed labels and editorial serif headings. Generated pictures are **design mockups**, not shipping flattened UI or real clinic evidence. Implement actual text and buttons as accessible HTML/CSS.

Desktop: approximately 45–48% editorial content and 52–55% scene; safe margins, one strong primary action and restrained voice controls. On a narrow portrait screen, move to a short scene/clinician image above the message with an accessible primary action; do not shrink the entire desktop image. No browser/device frame in the concept assets.

Minimum 44–48 px targets, visible keyboard focus, scrollable text at 200% zoom, readable contrast, subtitles independent of voice, and no information encoded by color alone. Do not announce each caption word through an `aria-live` region. Reduced motion uses a still composition and direct transitions, not an animated camera. French can require more line height/space; test long clinic names rather than truncating their identity.

## Human voice treatment

Preferred final production: an actual consenting clinic representative or a locally cast actor, recorded once and reviewed with the field team. Confirm names, pronunciation, title and the language each person actually uses. Do not assume a language or DRC accent from geography. No cloning or fabricated real-doctor quotes.

Fast prototype alternative: natural prerecorded AI speech for a **fictional clinician**, visibly disclosed as scripted/AI narration. This replaces browser-generated `speechSynthesis` in the shipped story, not runtime calls to a speech service. No API keys, paid speech generation or external voice dependency belong in the player's game session.

Use an intimate, warm, measured delivery—roughly 125–145 words/minute as an audition target, not a timing guarantee—with short natural pauses and no dispatch/radio filter or exaggerated “African” accent. Keep the same speaker across a clinic's opening and closing. Review rendered pronunciation and timing before setting captions.

Available library voices were inspected during planning. Amara (`fFAtoTPtP0TtMyhbR3L9`) is described as warm/reassuring African-British English; Kasalu (`4Dm0QBjyqFlh06Jvetyb`) as a calm documentary narrator; Keli (`hzuja6LJVafBxphAzQRB`) as French with a Togolese accent. These are **audition candidates, not chosen or generated voices**, and none establishes an authentic DRC-clinic identity. Field-approved local recordings remain preferred. No speech-generation credits were spent in this design task.

The [script pack](clinic-story-voice-scripts.md) contains draft messages for all five openings/closings plus safe population wording if matching figures are later approved. These are authored game scripts, not source quotations.

## Implementation work packages

### Current-code change map

| Current source | Required story change | Preserve / regression risk |
| --- | --- | --- |
| `games/last-light/src/missions.ts` | Separate fictional mission narrative/life counts from source-backed clinic profiles. | Existing road geometry, deadlines, hazards and scoring remain the first-slice baseline. |
| `games/last-light/src/App.tsx` | Add opening/closing ownership; replace conversational driving radio and fictional lives-saved displays. | Frozen delivery result, practice rules, saved control bindings and ordinary-input driving. |
| `games/last-light/src/audio.ts` | Remove the per-frame browser speech route; use scene-gated prerecorded narration and separate music/effects mixing. | Existing streamed songs, crossfades, autoplay rejection handling, focus pause and cleanup. |
| `games/last-light/src/engine.ts` | Decouple notices from conversational UI/audio; provide scene access without changing engine encounter rules. | Hazard warning/resolution transitions, recovery cost, accepted-delivery clock stop and restoration. |
| `games/last-light/src/save.ts` plus result/settings types | Migrate an explicitly versioned story edition; retain legacy records and nullable, unit-aware factual data outside scoring. | Existing saves must not be rejected by the current mission-life validation or silently awarded new-cohort completion. |
| Campaign component/data and build checks | Extract a validated shared plain-data manifest at build time; add approved assets/captions later. | No Angular dependency in the standalone game, live campaign fetch during driving, private form contacts or unrelated donation/hosting changes. |

The source paths above identify planned work; they were inspected but are not modified by this design task.

### 1. Source-backed chapter content and edition-safe persistence

Add a plain clinic story manifest (proposed `content/drc-clinic-stories.json`) with stable `clinicId`, explicit chapter order, long/short names, known location, real campaign stage, nullable population with unit/estimate/source/assessment-date/approval, documented care areas/capacity, story framing, image provenance/consent, voice/caption assets and script revision. Separate factual fields from fiction. Missing values stay null; unsafe statements must fail validation.

Feed both Angular and the standalone game through build-time copies or a plain-data import. Never import the Angular component or its dependencies into the game, and never fetch the campaign route during a drive. Add validation for selected IDs, source/status consistency and asset paths.

Map these stories onto the five existing route geometries initially; preserve vehicle rules, route lengths, deadlines and scoring. Do not imply that the 17 km location reference or fictional road segments are a real navigation route.

Use a new story/campaign edition ID such as `drc-clinics.v1`. Preserve existing saves, settings, unlocked chapter access and old best scores in a legacy section. Keep new-edition completion separate so old fictional-clinic records do not silently become real-clinic-story achievements. Preserve prior unlock access without automatically awarding new chapter deliveries. Test the chosen migration before rollout; do not overwrite `last-light.v1` blindly.

The current parser checks `result.lives === MISSIONS[mission].lives`; replacing those values with population numbers would reject historical records. Do not do that. Keep legacy result validation separate from the new story result schema. Population is never a scoring input. Keep the current road rules revision unless actual driving rules change; use the story edition for narrative separation.

### 2. Opening/closing views and explicit scene ownership

Introduce proposed `ClinicOpening.tsx`, `ClinicClosing.tsx` and `scene-flow.ts` rather than more nested conditionals in the main HUD. App owns `opening → preparing → drive → restoration → closing`; the existing engine continues to own `ready/driving/paused/restoring/results/failed`.

No driving controls or countdown while the opening is active. Start delivery stops narration and clears held keyboard/touch/controller state before enabling ordinary input. Scene preloading has cancellation guards; an old promise cannot start voice or mount a chapter after the player leaves. Result acceptance/scoring remains unchanged and frozen; narration never owns mission time or modifies the result.

Mount the closing once using a delivery/run token. Re-rendering, save updates, entering settings, watching arrival again or resuming focus cannot unintentionally replay the thank-you message. Next clinic first disposes the prior narrative request. Keep chapter/checkpoint practice semantics intact.

### 3. Replace per-frame radio speech with a scene-gated narrator

Add proposed `narration.ts` with one native prerecorded audio player and explicit Play/Pause/Replay/Stop/Dispose, a scene/run generation token and event-driven playback state. It may play only in opening or closing; there is **no automatic text-to-speech fallback during a drive**. Failed/blocked audio leaves a readable transcript and an immediately usable Start/Next button.

Remove `SpeechSynthesisUtterance` construction and `speechSynthesis.speak()` from `Soundtrack.update()`. Gate by scene at the controller level as well, so legacy `voice: true`, engine notices, recovery, traffic collisions, hazards and React re-renders cannot sneak speech back into travel. Cancel any legacy queued speech at the scene boundary. Preserve `engine.say()` data while decoupling its UI/audio; do not remove encounter warning/resolution state transitions.

Remove the conversational `.radio` HUD panel during driving. Keep hazard markers and essential accessible condition cues independent of the new **Story captions** preference. Rename the existing voice preference to **Story voice**; add separate optional road-effects mixing without using the master mute to silence effects.

Keep the mix in one scene-owned audio bus/controller: master, music, optional effects, narration. The existing Soundtrack master envelope is written per frame, so a second competing volume writer would cause glitches; refactor that ownership explicitly. Reuse the existing streamed JourneyMusic behavior, with narration's actual audible state driving ducking instead of global browser-speech state.

During travel narration gain is forced to zero and its player is stopped, not merely waiting in a queue. Mute, zero volume, page hiding, blur, settings and menu exit pause/release the correct scene audio, including closing screens that the engine does not pause. Resume preserves cursors; user gestures prime native playback and rejected play promises are caught once, not retried every animation frame.

### 4. Music transitions and bounded assets

Keep Morning as the principal journey track. Light at the Clearing follows naturally, or is requested once at the silent restoration/closing boundary using a four-second crossfade. If it is already playing, do not restart it. Never switch music at every damage event or narration sentence. Starting the next drive requests Morning with the same guarded transition, rather than overlapping old chapter streams.

Existing music level/duck envelopes are a reasonable starting point (0.23 normal, 0.07 under voice before master volume), subject to listening tests and normalization of the final clips. Provide a true Music-only travel mix as requested; optional effects stay a separate bus. Avoid pumping the music with caption updates.

Ship prerecorded mono voice clips and captions locally; generate/record them only after script/voice approval. Preload the current opening and the current chapter's closing opportunistically, never await a remote voice generation at runtime. Caption files use measured timestamps, not guessed word timings.

The current package is approximately 19.86 MiB against a 21 MiB limit: narration and images will not fit automatically. Proposed explicit budget for the later story release: **24 MiB**, with the **1200 KiB compressed code limit unchanged**. Ten roughly 25-second/15-second mono 96 kbps clips add about 2.29 MiB; five compressed stills at 150 KiB each add about 0.73 MiB. These are planning estimates, not measured builds. Reuse a shared illustrative portrait and existing rendered arrival to avoid five video files. Keep full-resolution design mockups under docs, not public runtime assets. Verify actual weights before changing the budget; load one chapter, not every clip/image at startup.

### 5. Verification, rollout and evidence

Implement and review one Ndingi vertical slice first, then populate all five clinic stories. Source ownership and consent approval are release gates for factual narration; the prototype remains explicitly scripted/re-created where those gates are incomplete.

Automated acceptance:

- Zero human narrator / `speechSynthesis.speak` calls during the full ordinary-input drive on all five chapters, both road editions/routes, Standard/Relaxed, including damage, recovery, delivery approach and traffic notices.
- Exactly one closing playback attempt per accepted delivery; late clip loads and ended/error callbacks cannot restart voice after Start/Next/Home. Blocked autoplay, missing/undecodable clips and slow connections never block driving or continuation.
- Opening/loading do not drain reserve; handover still stops the clock; results/rewards remain frozen; practice does not award new-edition progress.
- Pause, mute, zero volume, blur/hidden tab, settings, context loss and closing-screen interruption have correct cursor/cleanup behavior. No duplicate audio, animation loops, listeners or stale sources after repeated restarts/chapter changes.
- Legacy progress/settings/records survive migration; new completion and reported reach never multiply on replay. Unknown values and household units render safely; no unsupported life-saving claims or private contact fields leak into assets/bundles.
- Existing game suites, combined production build and Hosting isolation/asset checks pass; no Angular/game dependency leakage or development QA controls in production.

Browser/device acceptance:

- Real-desktop audio transitions and readable 1280×720 UI; narrow portrait/landscape, zoom and long French names/captions; keyboard, touch and standard controller focus/controls.
- Physical iPhone Safari and Android Chrome: user-gesture start/resume, device mute/background return, audio interruptions, touch combinations and performance. Responsive emulation is not physical-device evidence.
- Compare before/after frame diagnostics on the same hardware/settings/route. Target stable 60 fps on the chosen desktop reference and a stable 30 fps fallback on agreed mobile hardware, not a universal promise. Record p95/p99/max/long-frame counts and audio transition timestamps; investigate any new >100 ms story/audio-caused hitch or material frame regression.
- Short first-time-player sessions: can the player understand the task, choose the bypass and negotiate every hazard with no voice? Measure confusion/recovery/abandonment and listen to the final mix on phone speakers and headphones. A passing automated drive is not proof of enjoyment.

Only publish after the slice, source approvals, full regression, measured package and live-hosting verification pass. Deployment is a separate authorized step; it must not change database rules, donation behavior or unrelated campaign content.

## Decisions before factual release

1. Keep the campaign's first five, or switch deliberately to the five named forms? Default for this plan is the campaign's first five.
2. Obtain matching approved populations, equipment needs, testimony/portrait permission and languages for the chosen cohort. Do not fill gaps using a similarly named clinic.
3. Review the recorded human voice or a disclosed fictional AI audition, then approve exact scripts/pronunciation.

The visual prototype and scene/audio engineering can proceed with known facts and null populations. Unknown clinical facts must stay unknown, not quietly become narrative claims.
