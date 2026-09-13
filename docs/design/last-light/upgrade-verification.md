# Last Light upgrade: implementation and verification

Verified September 12, 2026 (America/Los_Angeles). The upgrade runs in the existing isolated game at `/games/last-light/` and applies to all five chapters. The compact catalog and Lost in Orbit remain available.

## Implemented

- **Faster driving:** 80 km/h firm-road propulsion target, automatic gears and engine RPM, stronger acceleration, progressive steering, per-wheel grip, render interpolation, and speed-sensitive camera framing. Mud, gravel, verge, and bridge surfaces produce different responses. The target is a propulsion limit, not a hard speed clamp.
- **Physical roads and damage:** smooth rut depressions appear in both visible terrain and collision geometry. Real contact forces, hard landings, and severe suspension compression affect the kit. Shallow roughness contributes motion and sound. A truck wedged upright against an obstacle can now request recovery for the existing eight-second penalty.
- **Active encounters:** stopped minibuses, yielding oncoming vehicles, announced rockfalls, and bounded wind gusts. Visuals and moving colliders share deterministic trajectories. Warnings account for speed and wet braking; encounters resolve once and pause with the mission.
- **World and vehicle detail:** shaped truck bodywork, glass, mirrors, interior silhouette, wheels with independent steering/spin, wipers, brake lights and secured cargo movement. Photographic gravel materials, HDR environment lighting, wetness, water motion, surface spray, wind-driven foliage and cloth, roadside buildings, and animated local residents.
- **Clinic restoration:** an 18-second handover with skinned carriers, battery placement, sequential room and porch lights, equipment and fan activation, and waving residents. The clock freezes when handover succeeds. The later result view explicitly identifies completed solar-array commissioning. The sequence can be replayed, or continued after the lights return, without duplicating rewards.
- **Sound:** a locally bundled CC0 engine recording driven by gears/RPM/load, with surface, weather, impact, ambience and power-restoration layers. Optional radio still uses installed browser speech, with subtitles and volume control.
- **Replay and saves:** Valley run and Fresh tracks provide two deterministic road editions. Clean encounters contribute up to 200 points to the 2,000-point delivery score. Revision/difficulty/edition keys separate new scores while preserving legacy records, clinic unlocks and once-per-clinic story lives.
- **Web rendering:** terrain chunks and distance culling, pooled effects, shared texture sources, owned-resource cleanup, Low quality, and adaptive internal resolution. Development diagnostics sample frame intervals before simulation clamping. Existing bundle limits are unchanged.

## Automated verification

`npm run test:games` passed **92 tests**: 56 Last Light and 36 Lost in Orbit.

The suite includes 30 complete deliveries using ordinary driving inputs: ten existing chapter/route combinations, plus twenty faster drives across five chapters, two road editions and two routes. It also checks acceleration and braking, per-wheel mud transitions, physical ruts, high-speed collision damage, recovery against a solid barrier, deterministic encounter placement, warning distance, pause, one-time encounter awards, legacy save preservation, deadline ordering, delivery cancellation, frozen results and keyboard/touch/controller input adapters.

One faster-route test initially exposed a truck stuck against an obstacle in the final chapter. Recovery recognition and the QA driver's obstacle approach were corrected; the complete matrix then passed. The QA driver uses the same input structure as a player and does not teleport or bypass delivery requirements. It is excluded from production builds.

## Build and asset verification

The full `npm run build` passed for Angular and both games, including the production entry, hosting and isolation checks. Angular needed execution outside the restricted build sandbox; sandboxed attempts aborted without a useful compiler diagnostic. After a final mobile CSS adjustment, Last Light was rebuilt, copied into the production site, and `npm run verify:hosting` passed again.

| Game | Compressed code | Total assets | Result |
| --- | ---: | ---: | --- |
| Last Light | 964.8 KiB | 9.34 MiB | Below unchanged 1,200 KiB / 12 MiB limits |
| Lost in Orbit | 311.5 KiB | 0.31 MiB | Passed existing limits |

The build retains warnings about large Three.js/Rapier chunks and existing Angular CommonJS dependencies. These are warnings, not failing checks. Six bundled texture/HDR hashes match the asset register. The recorded engine is 76,332 bytes. See [asset provenance](../../../games/last-light/ASSETS.md).

## Browser verification

Checked in the Codex in-app desktop browser using the development game and the actual production preview:

- Catalog cards expose both game links; the Last Light card launches the standalone production document.
- First Light, Before the Rain, and Night Watch completed through the normal-input development driver. The night run reached handover with 99% kit condition, three of four clean encounters and 2:10 reserve, scoring 1,784. Replaying restoration retained those values.
- Driving, rain, night headlights/markers, traffic, cargo, clinic interiors, staged lighting, restoration replay and result navigation were visually inspected. Production audio activation produced no game runtime errors; no independent listening study was performed.
- Portrait 390×844 and landscape 844×390 layouts were inspected. Touch steering and pedals remain visible. A radio/speed-display overlap found during review was corrected in the final stylesheet.
- Quiet desktop driving snapshots at 1280×720 reported around 59–60 FPS with rolling p95 frame intervals around 17–19 ms. These are local observations, not a cross-device performance guarantee. Build/test contention produced slower intervals in other samples.
- No game errors remained in the fresh production browser check. The catalog logged an existing translation-library deprecation warning. Earlier development geometry/loader errors found during this work were corrected.

## Limits and further production work

This release uses original code-authored shaped geometry and skinned characters with bundled photographic materials. It does not include the proposal's commissioned glTF hero assets, exported animation clips, KTX2/Meshopt pipeline, professional radio performances, additional flooded-crossing gameplay, or an expanded route graph. Those remain art/content and engineering work beyond this implemented release. The concept art remains an aspirational illustration, not a gameplay capture.

Physical iOS/Android/controller testing, controlled cold-network loading, extended device memory/performance trials, and the proposed human comparison playtest have not been completed. Responsive checks and automated successful drives establish layout and mechanical behavior; they do not establish real-device performance, enjoyment or retention. No deployment was performed.
