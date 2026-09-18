# Last Light soundtrack verification — 2026-09-18

## Implementation

- Main song: Morning on the Ridge. Follow-up: Light at the Clearing. Both supplied 192 kbps MP3s are bundled byte-for-byte, with source hashes in the asset register.
- Two native streaming players feed the existing Web Audio master mix. Four-second equal-power transitions repeat the playlist without forcing track changes during road hazards or delivery.
- Music is mixed at 0.23 before master volume, ducking to 0.07 while browser speech is speaking. Existing effects, volume and mute remain connected.
- Start/Resume/Enable sound attempt both native players synchronously in the user gesture. Rejected autoplay does not create a per-frame retry storm or stop gameplay.
- Pause/mute/zero volume/context suspension preserve playback cursors and fade state. Menu exit and restart release elements, network loads and audio nodes. One missing track loops the survivor; both missing tracks retain the generated score.

## Automated checks

`npm run test:games` passed: Last Light **105/105**, including **15** audio/playlist tests; Lost in Orbit **36/36**. Existing complete-drive checks cover all chapters, route editions, physics, input, clocks, encounters and restoration. New checks cover original asset hashes, initial track/priming, both transition directions, buffering, missed end boundaries, pause during crossfade, finished-outgoing resume, context suspension, failed assets, blocked autoplay, teardown and game volume/speech/failure integration.

`npm run build` passed: TypeScript, both Vite games, Angular and Hosting/isolation verification. Last Light code is **1008.9 KiB gzip** against the unchanged 1200 KiB limit. The package is **19.86 MiB** against the explicit new 21 MiB limit, including approximately 7.91 MiB of supplied music. Existing Angular budget/CommonJS and Vite chunk warnings remain warnings, not failed checks. Both MP3s are checked by Hosting verification.

## Browser verification and limits

Local checks use the Codex in-app desktop browser, with the real MP3s and native AudioContext/media elements. The production game is served on port 4175. A development-only diagnostic at `/games/last-light/qa/music.html` lets a tester seek to the natural transition boundary through visible buttons; it imports the same playlist controller and changes no saves. It is not a production entry and is not copied into the production package.

Initial native playback was observed with Morning advancing, Clearing paused at zero, both tracks fully playable (`readyState = 4`) and no media errors. In the diagnostic, seeking Morning to its final 3.5 seconds started Clearing, then left Morning paused/reset with Clearing advancing. Seeking Clearing to its final 3.5 seconds returned to Morning with Clearing paused/reset. Releasing audio removed both native elements. No warning/error console entries were captured in this diagnostic.

The production game started Morning with Clearing ready at zero. Pausing froze Morning at 6.577052 seconds across observations, and resuming continued from that cursor. Mute froze playback at 10.510302 seconds; enabling sound resumed from there. Returning to the chapter map removed both audio elements, with no error console entries. A final guard prevents results-screen audio from resuming while unfocused/hidden or while settings are open, even though the mission engine does not pause its results phase; focus/visibility behavior is covered in the audio integration regression.

These are desktop playback and automated state checks, not a physical-device matrix, listening-quality evaluation or performance guarantee on all hardware. Physical Safari/iOS/Android playback checks remain recommended. No live deployment was performed as part of this verification.
