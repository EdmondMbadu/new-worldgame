# Last Light: traffic and smoothness implementation

Road revision 5 · 13 September 2026. Implements the [traffic and smoothness plan](traffic-flow-and-smoothness-plan.md).

## Driving changes

- Ten persistent compact cars/pickups populate chapter one; later chapters have twelve. Seeded positions, vehicle types and speeds remain reproducible. Cars travel in both directions, use a consistent keep-right convention, follow slower road users and continue after the player passes. Routine traffic takes firm bypasses around damaged decks and washouts, then returns to the shared road.
- Opposing traffic waits beyond the exposed hill's exit, with spaced queues on firm ground. Traffic yields at livestock crossings; the fallen-tree passage also checks opposing occupancy. Existing minibuses now accelerate progressively, signal, pull into a stop and depart when the player and other traffic leave room. Existing approaching vehicles can continue after their encounter is cleared.
- Lane paths are sampled in physical metres. Their offset is perpendicular to the world-space centreline, with interpolated heading and pitch. This avoids a sharp sideways movement caused by applying a logical lateral offset across the switchback's sheared coordinates. Initial roster spacing is checked before bodies are created, and following movement is bounded by remaining clearance.
- The player collides with real traffic bodies. Relative closing motion contributes to cargo damage; contact is debounced. A struck car holds until there is space, and the HUD explains how to reverse clear. Wheel suspension rays exclude kinematic vehicle bodies so they cannot acquire traction on a car roof. A speed guard bounds exceptional horizontal solver impulses above normal driving speeds.
- Vehicle art includes distinct compact and pickup silhouettes, cargo, windows, mirrors, bumpers, wheel hubs, working brake lamps, ground light pools and tire spray. Body orientation follows the lane's slope. Nearby traffic has two reusable positional motor voices. Low quality uses the same simulation with reduced visual effects and one supplementary light instead of two.
- Safe following and yielding can qualify as clean traffic encounters. Each roster identity is credited at most once; a later collision invalidates that car's clean credit. Clinic delivery remains the main reward. Revision 5 records coexist with revisions 2–4 and legacy campaign progress; practice remains unscored.
- Standard reserves are 235, 255, 265, 265 and 290 seconds. Incidental rocks now use the road position at their own station and sit on the shoulder, preventing an older placement error from leaving rocks in a curved traffic lane. Authored washouts, floods, bridges, trees and cliff consequences remain.

## Smoothness and lifecycle

A foreground frame longer than 650 ms no longer calls `pause()`. The simulation processes at most six 60 Hz steps per animation frame; excess wall time is recorded and discarded. Vehicles, traffic, encounters and the clinic reserve share simulated time. Returning from a deliberate pause resets the timestamp and accumulator; focus loss, hidden pages, controller disconnection and graphics-context loss retain explicit interruption handling.

The livestock crossing no longer applies the clinic's wheel-brake value of 240 by proximity. Assistance uses remaining stopping distance and animal progress, ramps toward normal braking strength, and releases when the truck's path is clear. Effective braking drives the truck's brake lights and diagnostic indicator.

Raw foreground frame intervals are retained in a bounded diagnostic buffer, including long frames. The development panel reports average fps, p95/p99, lifetime maximum, intervals above 100/250 ms, physics/render CPU averages, discarded time, pause count/reason and traffic/braking state. Paused/hidden time is excluded deliberately. The previous growing/shifted QA frame array was removed.

The fleet and its meshes/collision bodies are allocated during scene preparation. Three templates share geometry; the extra light count is fixed, with no per-car shadow maps. Vehicles recycle only at route exits when both exit and entry are over 300 metres from the player. Their bodies are repositioned without sweeping a collider across the valley. Recovery checks all traffic before choosing a clear point on the saved branch.

The implementation uses a fixed total roster of 10/12 preallocated bodies, rather than the proposal's six nearby-body cap. This avoids activation/deactivation work during driving and preserves the same world when the player reverses. Distant art is culled; cars outside the rendered road extent and during the clinic restoration shot are hidden so they cannot float over the distant valley. These are kinematic traffic bodies with visual suspension motion, not additional full four-wheel vehicle simulations. Narrow sections use existing firm road width and waiting positions; this release does not add a general traffic editor or simulated village side-street network.

## Automated and production verification

**126 tests passed: 90 Last Light tests and 36 Lost in Orbit tests.** Validation includes:

- Complete ordinary-input deliveries on all five chapters and both routes, plus faster runs in both road editions and both routes.
- A conservative delivery that follows traffic, physical vehicle impacts, damage debounce, manual pause, checkpoint branch/traffic clearance and legacy saves.
- Bounded foreground hitches of 100/300/700 ms and three seconds, repeated shorter hitches, consistent traffic/deadline advancement and explicit pause behaviour.
- Frame percentiles and counters retaining long intervals, continuous physical lane offsets at hill/fork transitions, deterministic rosters and metre-based movement.
- Fleet separation through bends, queues and exit recycling, stopped-player following, hill yielding, clean-follow rewards, collision revocation and duplicate-credit prevention.
- Existing physical cliff, washout, flood, bridge, tree, herd, restoration, input and 30/60/144 Hz checks.

The complete production build and hosting/isolation verification passed. Last Light is **1007.9 KiB compressed code and 11.95 MiB total**, within the unchanged **1200 KiB / 12 MiB** limits. Lost in Orbit remains **311.5 KiB / 0.31 MiB**. No dependency, external asset or budget increase was introduced. Existing Angular/CommonJS and chunk advisories remain warnings. The production build excludes the driving QA control.

Full Last Light test log: `/tmp/last-light-traffic-final-tests.log`. Lost in Orbit log: `/tmp/last-light-traffic-orbit-tests.log`. Production build log: `/tmp/last-light-traffic-production-build.log`.


## Browser playtesting

A complete desktop drive in the in-app browser, using the development-only driver through ordinary controls, reached the first clinic with **100% cargo, 90 seconds remaining, six routine traffic encounters completed cleanly and zero automatic pauses**. The restoration sequence completed and offered the next chapter. Early driving measured 60 average fps with p95/p99 near 17.6 ms. At arrival the lifetime average was 56 fps, the rolling p95/p99 were 33.4/66.6 ms, maximum interval was 217 ms, with 12 intervals above 100 ms and none above 250 ms. Discarded simulation time was 0.47 seconds. The viewport changed from 1280 × 720 to 905 × 907 during that session; this observation does not establish the cause of the spikes.

An arrival-shot inspection found distant cars beyond the terrain. A final rendering-only visibility correction was rebuilt and copied into the packaged site. Hosting and isolation verification passed again with the final size reported above. Physics and scoring were unchanged after the 126-test run.

A second complete drive at **390 × 844**, Low graphics with touch controls visible, reached the clinic with **100% cargo, 90 seconds remaining, six of six observed cars handled cleanly and zero automatic pauses**. The page and viewport widths were both 390 px, and the brake/drive controls stayed inside the viewport. Arrival measured **59 average fps**, rolling **p95 18.1 ms / p99 18.6 ms**, CPU averages **0.5 ms physics / 3.2 ms render**, and **1.48 seconds** of discarded simulation time. Three intervals exceeded 100 ms, including one early **1532 ms** interval; those counts did not grow between the early washout approach and arrival. Console inspection returned no warnings or errors. The clinic cinematic was visually checked with the final visibility correction: no cars remained floating beyond the terrain.

An immediate Low-graphics replay through the opening 33 seconds reached station 290 with 100% cargo, 60 average fps, p95/p99 18.1/18.6 ms, no interval above 100 ms, no discarded time and no automatic pause. The earlier long interval did not reproduce in this repeat.

These measurements verify that a long foreground frame no longer triggers a modal pause, uncontrolled catch-up or lost reserve. They **do not establish hitch-free rendering**: the isolated long interval remains unexplained, and the earlier desktop rolling-percentile targets were not met throughout that run. Performance figures are observations from the local in-app browser, not results from a physical low-end phone. Physical-device thermal/memory testing and human overtaking/difficulty feedback remain follow-up work.


The packaged site at `127.0.0.1:4175/games` displayed both compact game cards. Launching Last Light loaded the 3D scene, traffic guidance and the revised 3:55 first-chapter reserve, without development QA controls. No console errors appeared; the Angular catalogue emitted its existing translation-options deprecation warning. The same updated scene and 3:55 reserve were verified at the user-facing `localhost:4200/games/last-light/`, with no console warnings or errors. The temporary responsive viewport override was reset and all temporary test tabs were closed after testing.
