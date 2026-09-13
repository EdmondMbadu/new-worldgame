# Last Light: living roads implementation

Road revision 4, 13 September 2026. Implements the approved [living roads plan](living-roads-upgrade-plan.md) and the additional request for dangerous hills and an abyss.

## Playable changes

- Every chapter includes a climb, a genuine switchback with a backwards-facing leg, an exposed road edge and a descent back toward village lights. Cliff depth grows from 54 to 82 metres. Headlights illuminate edge reflectors and turn chevrons; approach signs advise 25 km/h.
- The cliff is shared render/collision terrain. Driving off it produces an actual fall. After the initial drop, the truck returns to a firm checkpoint with an eight-second recovery charge and modest cargo damage. Checkpoints avoid the exposed ridge, preserve the selected branch and step back if traffic now occupies the saved location.
- The community minibus moves into view, signals, slows and pulls aside. It holds its position when the player occupies its swept corridor. After it settles, a careful central pass earns the same clean reward as a careful side pass.
- Compact oncoming vehicles use lane and clearance checks, give additional room when needed, and stop for a blocked path. Bridge traffic retains priority but now brakes for an occupied path rather than driving into the player.
- A visible herder and lantern accompany three articulated goats. The herder admits a sufficiently slow, distant approach; the animals cross to a visible verge over a bounded interval. A fast approach keeps them safely on the verge and loses the clean-pass bonus. Close-range braking assistance prevents the crossing from becoming a graphic animal collision. Bells are directional and movement follows simulation time.
- On rainy chapters, runoff rises during the approach and holds its level after the player commits. The visible water level and per-wheel drag use the same encounter value. The marked shallow line and bypass remain usable.
- Three village stretches combine varied house positions, stone foundations, porches, corrugated roofs, window frames, steps, pumps, barrels, fences, footpaths, distant courtyards and warm windows. Residents walk short off-road routes using the existing rigged character assets. Terrain, foliage and the camera follow the new route coordinates.
- Standard deadlines allow the extra distance, careful hill driving and legitimate waits. Five night profiles, 80 km/h firm-road propulsion, the clinic handover and its lights-on transformation remain part of the complete journey.
- Pause and failure screens offer checkpoint practice. Practice refreshes the kit and reserve but never writes scores or unlocks. The HUD and results identify practice. Scored deliveries retain revision-specific records; revisions 2 and 3 and legacy campaign completion remain readable.

## Route and rendering choices

`routes.ts` separates stable route stations from world position through a smooth, radius-preserving planar bend with an exact inverse. This supports the authored switchback without nearest-segment projection jumping to an adjacent leg. The map is used by physical terrain, visible road surfaces, fixtures, traffic, truck recovery, tire sampling, the minimap and camera look-ahead. Arc distances are cached and interpolate in constant time; look-ahead advances by physical distance.

The renderer compensates for lateral shear so the ridge keeps a useful driving corridor. The same terrain vertices feed Rapier and Three.js. Vegetation keeps its original instanced geometry; owned static geometry is bent during scene construction. Dynamic characters are placed independently, avoiding deformation of shared skeletal assets. This release implements one authored switchback per chapter, not a general editor for arbitrary road graphs or stacked overpasses.

The approaching vehicle is the compact-vehicle option allowed by the plan, rather than a new motorcycle asset. Goats, village parts and the road additions are original repository geometry. The update reuses the existing photographic surfaces and rigged residents; it adds no external asset downloads or dependencies. Rendering retains bounded headlight shadows, batching, instancing, terrain chunks, Low quality and adaptive resolution.

## Automated and build verification

**114 tests passed: 78 Last Light tests and 36 Lost in Orbit tests.** The complete game regression run covers Lost in Orbit and Last Light, including ordinary-input delivery on every chapter and both routes, plus both road editions at faster pace. No simulation teleportation is used by the completion driver. Additional focused checks cover:

- Exact route inversion and real negative-world-Z motion through every chapter's switchback.
- Monotonic progress and remaining distance, and stable checkpoints through the reversed leg.
- Raycasts against the physical deck and valley matching the shared height surface.
- A real cliff fall followed by one recovery with time/cargo consequences.
- Bus indicators, movement, an occupied pull-in lane, resuming after clearance and fair centre-line scoring once parked.
- Approaching traffic waiting for a stopped player, then clearing the road.
- Herd admission, crossing duration, every animal reaching the verge, and unsafe approaches.
- Runoff level commitment and its tire-response effect.
- Checkpoint branch preservation, occupied spawn avoidance, pause and practice exclusion from saves.
- Revision 3 record preservation alongside revision 4.

The combined Angular/game production build passed, including standalone-document isolation and production QA-control exclusion. After the final game-only scoring adjustment, the rebuilt Last Light output was copied into the previously built site and the hosting verification rerun. Final package: **1001.6 KiB compressed code; 11.95 MiB total**, within the unchanged **1200 KiB / 12 MiB** limits. Existing Angular/CommonJS and large-chunk advisories remain warnings; no budget was raised.

## Browser verification and limits

The isolated development origin was used for driving checks so the user's localhost campaign save was not modified. Initial, ridge and village-crossing samples ran at approximately 58–60 fps, with rolling frame-time p95 around 16.8–17.7 ms and no reported browser errors. The complete first-chapter browser drive ended with 100% integrity, 4/4 clean passes, 1,715 points, three stars and 58 seconds remaining. Its restoration replay showed the dark clinic receiving power at a 390×844 viewport. A Low-quality storm drive also loaded correctly with touch controls contained within the viewport (390 px document width, no horizontal overflow), and the checkpoint-practice UI displayed its non-scoring status. The storm drive reached the exposed switchback and its exit with 100% integrity; the narrow-view ridge sample showed 60 fps and 17.6 ms p95, with no browser errors. Temporary playtest tabs were closed after restoring the graphics setting and issuing the viewport reset. The existing two-card catalog at `http://localhost:4200/games` opened the rebuilt game with the new 03:20 reserve and 1,212 m remaining route. These are local desktop observations, not a promise for every device.

Responsive viewport checks do not replace physical iOS/Android testing, controller hardware testing, or repeated-player feedback on difficulty and enjoyment. Those remain the next validation step before making broad performance or retention claims.
