# Last Light — realism and gameplay upgrade

**Status:** original upgrade proposal, retained as the design baseline. The implemented scope, checks, and remaining production work are recorded in [upgrade verification](upgrade-verification.md). The “current implementation” comparisons below describe the pre-upgrade game.

**Creative direction:** a fast, physical, hopeful driving adventure. The truck feels heavy, the road demands attention, the landscape responds, and every successful delivery brings a place and its people back to life.

## 1. Assessment of the current game

Last Light has a working foundation: five deliveries, physical suspension, rain and night driving, alternative routes, deadlines, cargo condition, progression, accessibility options, and the transition from a dark clinic to a powered clinic. The next release should improve the quality of each minute of play before expanding the campaign.

The central problem is the relationship between **speed, readable danger, physical response, and reward**. Increasing only speed would make the existing damage rules more punishing. Adding only texture detail would leave the drive predictable.

This assessment comes from the current source, the game's documented prior browser verification, and inspection of its current presentation. It is not a new controlled performance benchmark or a player-retention study. The existing delivery tests establish reachability and correctness; they do not establish how enjoyable the drive is.

| Area | Current implementation | Proposed improvement |
| --- | --- | --- |
| Speed and risk | Engine propulsion targets approximately 49 km/h on gravel, 31 in mud, and 18 on the verge. Rut damage starts above 27 km/h. These are soft propulsion targets, not absolute speed clamps. | Faster safe sections, stronger acceleration, progressive grip loss, and damage tied to meaningful impacts. Give the player useful opportunities to accelerate. |
| Road feel | Rolling terrain and suspension exist, but ruts are rendered as flat dark circles and cause proximity-based damage. Surface grip is chosen at the chassis for all four wheels. | Model rut depth and road camber; sample each wheel's contact surface. Make the wheel, suspension, sound, and cargo react to the same event. |
| Obstacles | The obstacle system has three kinds: rut, rock, log. Placement is seeded and fixed; most obstacles sit near the sides of the road. | Authored encounters with several safe variations, moving road users, visible warning cues, and meaningful route choices. |
| Visual realism | The truck and people are constructed from primitive meshes. Terrain has textures, but scenery repeats; water and vegetation have little environmental motion. | Prioritize a modeled truck, convincing close road surfaces, animated people, varied roadside composition, wind, spray, and flowing water. |
| Driving feedback | Chase camera field of view is fixed apart from portrait/landscape layout. Engine sound is a synthesized oscillator driven by speed. | Speed-sensitive framing, suspension response, automatic gear changes, recorded engine layers, tire sounds, and restrained cargo movement. |
| Delivery payoff | Cargo moves toward the clinic; simple people walk and wave. Windows become emissive and lights brighten. | Show a believable handover, battery connection, rooms illuminating in sequence, equipment restarting, and specific human reactions. |
| Web performance | Instancing, quality settings, lazy engine loading, and adaptive resolution already exist. The whole mission's environment is built upfront. | Add an asset pipeline, scene chunks, model detail levels, texture compression, and measured device budgets before increasing scene complexity. |

Source entry points: [driving and damage](../../../games/last-light/src/engine.ts), [roads and obstacles](../../../games/last-light/src/missions.ts), [rendering and delivery sequence](../../../games/last-light/src/world.ts), [mesh assets](../../../games/last-light/src/art.ts), [sound](../../../games/last-light/src/audio.ts), and [documented verification](../../../games/last-light/README.md).

## 2. The experience to build

The player should feel **capable, under pressure, and connected to the people waiting**. Difficulty should come from choosing and executing a good line through visible trouble. Recovery should be quick enough to encourage another attempt.

The repeated rhythm is:

**Accelerate → notice a cue → choose a line or route → feel the truck respond → recover speed → see progress toward the clinic.**

Alternate demanding moments with short, satisfying stretches of fast driving. Constant obstacles flatten the experience: the player needs enough space to enjoy having handled the previous challenge.

Keep the controls familiar: accelerate, brake/reverse, steer, and one contextual action. Automatic gearing, driving assistance, and a forgiving recovery system support the faster handling. Depth comes from decisions and timing.

### First production target: one excellent short mission

Upgrade **Before the Rain** into a representative slice: approximately 90–110 seconds of driving followed by a 14–18 second restoration scene. This chapter can demonstrate wet roads, changing light, moving scenery, and a warm clinic reveal in one coherent place.

An illustrative drive, with timing adjusted through playtesting:

| Approximate time | Player experience |
| --- | --- |
| 0–12 seconds | Pull away immediately. The truck settles under acceleration; the kit rattles gently. A brief radio line establishes who is waiting. |
| 12–28 seconds | A fast stretch with nearby vegetation, dust giving way to spray, and enough road visibility to feel confident. |
| 28–43 seconds | A washed-out section is visible ahead. Choose a narrow firm line or a slower shallow muddy line. Feel the consequence through individual wheels. |
| 43–55 seconds | Regain speed beside a village. Clothes move in the wind; people turn toward the truck; a radio update gives the journey purpose. |
| 55–78 seconds | A stalled minibus creates the signature decision: take the clear shoulder carefully or use a signed short detour. Vehicle lights and a person signaling provide the warning. |
| 78–100 seconds | The clinic appears across the valley. The last approach is readable and fast before a clearly marked braking and delivery zone. |
| After acceptance | The deadline freezes. The team unloads, connects the battery, restores power, and shares a brief moment of relief. |

These are pacing targets, not a script that forces events regardless of the player's position. Encounter triggers must depend on route progress, speed, visibility, and whether the previous encounter has cleared.

## 3. Faster driving with believable weight

### Proposed handling targets

Treat these as initial tuning ranges for an accessible game, not claims about real vehicles or roads:

| Situation | Target player speed |
| --- | --- |
| Firm road with room to drive | 45–65 km/h |
| Short, clearly visible straight | 70–80 km/h |
| Manageable uneven section | 25–40 km/h, depending on depth and line |
| Deep mud or a difficult ford | 15–30 km/h |
| Narrow bridge or delivery approach | 15–25 km/h, then stop to deliver |

Prototype 0–50 km/h in roughly 4–6 seconds. Tune acceleration, braking distance, steering assistance, suspension, grip, and damage together. Preserve the possibility of downhill overspeed while keeping recovery controllable.

**Physical response:** use per-wheel surface samples with blended transitions. One wheel entering mud should pull and slow the truck before the entire vehicle loses grip. Make shallow ruts produce movement and sound; reserve substantial cargo damage for severe compression, hard landings, and collisions. Replace flat-circle damage with wheel-contact severity and collision measurements, using filtering and a cooldown to avoid charging repeatedly for one impact.

**Visible response:** animate steering and wheel spin on separate pivots, wheel travel from physics, body pitch under braking, slight body roll, tire contact dust, and restrained movement of secured cargo. Cargo should feel heavy and strapped down. Represent wear through a few controlled dirt and scuff states.

**Camera response:** prototype a gradual field-of-view change from roughly 56° at low speed to 64–66° on fast stretches. Add look-ahead into the road and subtle lag under acceleration. Keep the horizon stable; reserve small jolts for specific impacts. Reduced-motion mode removes impact shake and dynamic field of view while retaining clear steering visibility.

Rebalance route lengths and deadlines after handling settles. An existing 1.1–1.4 km route may become too short at the new pace. Target approximately 3–5 minutes for full campaign deliveries, with length, encounter density, and deadline derived from measured completion times on both routes.

## 4. Obstacles that create decisions

Each encounter needs a visible cue, a controllable response, and feedback that explains the result.

| Encounter | Warning and decision | Response and payoff |
| --- | --- | --- |
| Deep ruts and broken road edge | Shadows, exposed soil, water accumulation, and roadside markers reveal the shape. Choose a firm line or brake before crossing. | Individual wheels compress; sound and cargo motion reflect severity. A clean crossing preserves speed and condition. |
| Stalled vehicle | Hazard lights and a person signaling are visible well before the obstruction. Choose a clear shoulder or detour. | Pass carefully and regain speed. Placement always leaves a viable route. |
| Occasional oncoming vehicle | Headlights, horn, and an adequately visible road section establish the approach. Hold a usable passing line or yield. | The other vehicle slows or waits when needed. Avoid behavior that traps the player against a road edge. |
| Shallow flooded crossing | Depth markers, the visible bank, and current direction distinguish the safer line. | Water drag, controlled lateral influence, and wheel spray make the crossing physical. The safe route remains readable. |
| Loose bridge section | A sign, contrasting boards, and creaking announce the surface. Center the truck and control entry speed. | Wheel vibration and limited visual board movement sell the crossing; stable collision geometry keeps it predictable. |
| Falling branch or small rockfall | Movement, cracking sound, and debris ahead announce an event before the player commits. Brake or take the clear side. | One bounded event with a recovery gap. No obstacle appears underneath the vehicle. |
| Exposed wind gust | Trees and cloth move before the gust reaches the truck. Make a small steering correction. | A brief, limited lateral force; the effect eases predictably. |

Village residents and animals make the place feel inhabited. Keep them safely off the main driving line for the first upgrade. Any later crossing encounter must be announced early, allow yielding, and reward careful driving.

### Encounter scheduling and fairness

- Author safe encounter locations, then choose compatible seeded variations. Keep campaign chapter identity and offer a small set of clearly labeled replay route variants.
- Aim initially for a small decision every 12–20 seconds and a major encounter every 35–50 seconds. Allow 6–10 seconds of recovery after a major event. Adjust through playtesting.
- Run at most one major encounter plus one compatible surface challenge at a time. Rain, darkness, traffic, and a damaged bridge should not all peak together by accident.
- Compute warning distance from measured braking performance: **reaction distance + braking distance on that surface + visibility margin**. At 70 km/h, three seconds of reaction time alone consumes about 58 meters; braking requires additional distance.
- Reject placements behind blind crests or curves when a safe response cannot be seen in time. Establish an irreversible choice only after both options have been legible.
- Freeze encounter clocks with the game. Use stable event IDs so recovery, reverse driving, or re-entering an area cannot duplicate rewards or reset a hazard unfairly.

## 5. A world that looks and feels alive

### Spend art effort where players look

The most valuable assets are the truck, the road immediately ahead, and the clinic at arrival. A detailed truck against a visibly flat road will still feel artificial; upgrade these together.

1. **Hero truck:** a professionally modeled, optimized glTF vehicle with believable proportions, wheel wells, suspension details, layered glass, mirrors, lights, interior silhouette, roof rack, cargo restraints, and wear. Separate wheels and suspension pivots must match the physics dimensions. Include lower-detail models and simple collision shapes.
2. **Road:** modeled road crown, eroded edges, graded ruts, embedded stones, compacted tire lanes, and puddles in actual depressions. Blend gravel, soil, and mud with masks. Physics uses the meaningful surface shapes; tiny cosmetic stones need not become colliders.
3. **Clinic:** a distinct facade and a small visible interior with rooms, equipment silhouettes, practical lights, furniture, and people. Windows should reveal a place with depth when illuminated.
4. **People:** a small set of rigged characters with grounded walking, carrying, receiving, connecting, looking, and waving animations. Prioritize body language and believable contact with objects over close facial cinematics.

Asset delivery must include usable UVs, physically based materials, scale, pivots, collision proxies, animation clips, licensing, and texture budgets. Generated concept art can guide mood; it does not supply these production requirements. Schedule actual 3D art and animation work or suitable licensed game assets.

### Environment and lighting

Give each chapter recognizable landmarks, vegetation patterns, roadside buildings, weather, and sound. Use wind-driven foliage and cloth, moving cloud shadows, localized mist, flowing water, brief tire tracks, surface-specific dust and spray, and a few purposeful roadside activities.

Keep the existing physically based rendering setup and improve its inputs: a suitable environment map for reflections, coherent sun and sky lighting, material roughness variation, contact shadows, and controlled exposure. Use wetness masks so puddles and damp soil reflect differently. Clinic lighting should cast warm light onto the ground and people while preserving detail inside windows.

Profile modest bloom and ambient occlusion as quality-tier options. Budget shadow-casting lights carefully; a convincing arrangement of a few lights is the first target. Large reflection and post-processing costs require measured benefit before inclusion.

### Sound as part of driving

Replace the single motor tone with licensed or recorded idle, acceleration, load, and lift-off layers, driven by estimated engine speed, throttle, and automatic gearing. Blend tire gravel, mud, water, bridge boards, wind, rain on metal, suspension knocks, and cargo restraint sounds.

Use sparse, authored radio performances with subtitles. Let village ambience, insects, distant activity, and clinic sounds locate the player. Duck other audio during important callouts and avoid overlapping speech. Urgency should rise through pacing, engine load, weather, and selective music changes; repeated alarms quickly lose their effect.

## 6. Make the delivery the scene players remember

Keep the charged battery explanation: it provides immediate power, including at night. The solar panels support sustained operation after installation. Preserve the rule that successful handover stops the deadline before the celebration.

Proposed 14–18 second sequence:

1. **0–3 seconds:** Amani stops; a staff member approaches and opens the receiving area. A brief line acknowledges the arrival.
2. **3–7 seconds:** The team visibly carries the kit using synchronized handholds and places the battery at the prepared connection point. Cargo follows the carriers' hands and remains grounded.
3. **7–10 seconds:** A staff member connects the prepared system. One critical room illuminates first, followed by the corridor and porch. Warm light reaches the courtyard.
4. **10–14 seconds:** A fan starts, equipment status lights return, staff resume work, and a family responds with relief. Music resolves as the scene becomes active.
5. **14–18 seconds:** Hold a clear view of the restored clinic and the people outside. Show the result and offer the next delivery or a replay.

Show panel unloading during the arrival; show completed roof installation in a clearly communicated later montage or the campaign's restored-clinic view. Preserve the connection between action and result instead of making a full roof installation happen invisibly in seconds.

Allow players to skip repeat cinematics after power restoration without losing rewards. Local staff remain skilled participants in the achievement. Hope and renewed activity carry the emotion.

## 7. Reasons to replay

The design hypothesis is that clear improvement, satisfying control, varied decisions, and an emotional finish will make players want another run. Validate that hypothesis with people playing the actual game.

- Retain chapter unlocks, stars, and separate Standard/Relaxed records.
- Add a **clean-driving bonus** for completing distinct encounters with appropriate control and intact cargo. Safe yielding and good braking can earn it. Resolve each encounter's award once; do not reward repeated passes or narrowly missing people.
- Prototype a completed-delivery score of 1,000 base + up to 400 time reserve + 400 cargo condition + 200 clean driving. Completion remains necessary for the delivery score. Tune the weights and star thresholds against real runs so one scoring strategy does not dominate every route.
- Show a short, actionable result: time reserve, kit condition, encounters handled, and the player's best for that mission/route variant/difficulty.
- Start with a small number of curated route variants. Include route revision in records; scores from materially different courses should remain distinct.
- Preserve completed clinics and the existing once-per-clinic story lives count. Keep old best scores as legacy records when handling, routes, or scoring change; do not compare them directly with the new rules.

## 8. Implementation architecture

Keep the existing isolated React, Three.js, and Rapier game. The upgrade does not require a rendering-engine migration or changes to Lost in Orbit and the compact games catalog.

| Work area | Implementation responsibility |
| --- | --- |
| `engine.ts` and a vehicle-tuning module | Centralize handling profiles; per-wheel surfaces; contact-based impact severity; reliable collision reporting; automatic gear/RPM signals for animation and audio. |
| `missions.ts` and road/encounter modules | Define route segments, surface regions, authored encounter slots, seeded variants, visibility constraints, and route revisions. |
| `world.ts` and scene modules | Model loading, road chunks, vegetation/weather animation, camera response, effect pooling, model detail levels, and render interpolation. |
| `art.ts` and an asset manifest | Load modeled assets with scale/pivot contracts, material configuration, fallbacks, ownership, and disposal. Retain useful procedural background assets. |
| `audio.ts` | Layered vehicle/surface sound, ambience, authored radio, positional sound, and volume ducking. |
| A clinic-sequence module | Explicit timed states for carrying, connection, light activation, reactions, completion, and skipping. |
| `App.tsx` and `save.ts` | Existing input/settings UI, readable contextual feedback, versioned records, and safe progress migration. |
| A performance monitor | Record actual frame intervals, physics/render timings, scene resource counts, and quality changes during development. |

Preserve fixed 60 Hz physics and pause behavior. Interpolate rendered transforms between simulation snapshots rather than increasing physics frequency to match display refresh. Sample UI updates at a modest rate; avoid rebuilding the React interface on every frame.

The truck already has continuous collision detection enabled. Retain and test it at the increased speeds. Rapier documents CCD as protection against missing fast-moving contacts, with additional computation; it does not remove the need for suitable collision geometry. [Rapier CCD documentation](https://rapier.rs/docs/user_guides/javascript/rigid_body_ccd/)

The present road is parameterized by world Z. The first slice can retain that structure. Before introducing hairpins or more complex junctions, migrate to route distance along spline segments and a small route graph. Update recovery, minimap, distance, radio triggers, bays, and test-driving guidance together. Use one shared road description for visible surfaces and collision surfaces.

Use glTF models with one chosen mesh-compression path and compressed textures. Three.js provides glTF loading, animation data, and Meshopt/Draco integration; KTX2 supports GPU-compatible texture transcoding. Confirm support against the repository's pinned Three.js version before adopting exporter settings. The local loader already exposes the relevant decoder hooks. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html)

Apply model detail levels with distance hysteresis to avoid flickering between meshes. Manage scene chunks and shared textures explicitly; unloading one chunk must not dispose a resource still used by another. [Three.js LOD](https://threejs.org/docs/pages/LOD.html)

## 9. Web performance and loading gates

The existing build verifier caps Last Light at **1,200 KiB of compressed code and 12 MiB total build assets**. Richer models and audio must be planned against that constraint. See [the current budget checks](../../../scripts/games.mjs).

Begin with the existing budget. Measure a compressed, optimized hero-asset slice before deciding whether a larger campaign needs an explicit budget revision. If it does, propose separate limits for initial playable content and later chapter/optional high-quality downloads, with a manifest and automated checks. Do not silently increase the current total cap.

Initial targets to validate on named devices:

| Measure | Proposed acceptance target |
| --- | --- |
| Desktop rendering | Approximately 60 FPS at 1280×720; at least 95% of steady driving frames within 20 ms. |
| Mobile rendering | Approximately 30 FPS on selected physical midrange Android/iOS devices at an appropriate internal resolution; 95% of steady frames within 40 ms. |
| Stalls | No recurring frames over 100 ms during driving or the clinic transition. Preload arrival assets before the approach. |
| First play | Initial content within 12 MiB; target drive-ready within 8 seconds at a controlled 20 Mbps / 100 ms RTT cold-cache test, and within 2 seconds with warm assets. Measure decoding and shader compilation too. |
| Repeat play | Ten consecutive mission loads/retries without steadily increasing scene resources or a reproducible memory leak. |
| Readability | Obstacles remain identifiable on Low quality and small screens; quality reductions do not remove warning cues. |

These are proposed gates, not current measurements or guarantees. Choose the reference devices before treating a performance pass as meaningful.

Instance repeated scenery, compress textures, pool transient effects, and use distance-based models. Divide scenery into chunks with preload distance based on maximum travel speed and measured loading time. The next chunk must be ready before it becomes visible. Keep gameplay colliders available independently of decorative rendering detail.

Measure actual frame intervals before simulation delta clamping. Use sustained slow-frame evidence and hysteresis for quality changes; avoid quality oscillation. Collect development diagnostics locally for tuning.

## 10. Delivery order and definition of done

Effort estimates below are planning ranges for a developer familiar with this codebase. Art, animation, and sound are separate production work and can overlap engineering. Actual scope depends on asset availability and results from the first slice.

| Phase | Deliverable and dependency | Engineering estimate | Exit condition |
| --- | --- | --- | --- |
| 0. Establish the baseline | Capture the same current route on reference devices; measure handling, braking, damage, frame times, loads, and completion times. | 1–2 days | Reproducible old-version comparison and agreed target devices. |
| 1. Make the truck enjoyable | Tune acceleration/grip/braking, per-wheel surfaces, impact rules, camera, and temporary layered audio on a short test road. | 3–5 days | Faster driving feels controllable; collisions and deadlines remain reliable. |
| 2. Build the visual slice | Import the hero truck and clinic, improve physical roads, lighting, environment motion, and asset loading. Can overlap later Phase 1 tuning. | 4–8 days | One short mission looks coherent in actual gameplay and meets provisional performance budgets. |
| 3. Make the road active | Add ruts/washed edges, the stalled-vehicle encounter, scheduling, safe variation, and encounter feedback. | 3–5 days | Both options remain feasible; cues work at maximum speed and on touch. |
| 4. Complete the emotional payoff | Implement carrying/connection animations, staged clinic lighting, human reactions, final audio, scoring, and record migration. | 3–5 days | Delivery is believable, skippable on replay, and awards exactly once. |
| 5. Expand and verify | Carry proven systems into the other four chapters; tune identities/deadlines, add selected later encounters, and complete device testing. | 3–5 days | Every chapter and alternate route passes gameplay, performance, and regression gates. |

This is roughly **17–30 engineering days**, plus an initial allowance of **10–20 person-days of art/animation/audio work**. These are estimates rather than a promise of delivery time. Bespoke assets, extensive new routes, or failed device budgets increase the work. Decide the expanded campaign scope after the slice demonstrates the desired improvement.

### Validation that matters

**Mechanical regression:** preserve existing pause, clock, recovery, accessibility, save, progression, and deadline-boundary tests. Add focused tests for per-wheel surface transitions, severe-versus-shallow impacts, high-speed obstacle contacts, encounter determinism/fairness constraints, duplicate-award prevention, new records, and cinema skipping. Run every campaign route at varied render schedules. Update the ordinary-input QA driver only to use the same capabilities available to players.

**Visual and device review:** inspect actual driving, rain, night visibility, arrival, and restoration on desktop, physical iOS/Android, keyboard, touch, and a physical controller. Test repeated retries, scene changes, slow-network starts, missing optional assets, focus loss, and WebGL context recovery. Capture gameplay comparisons at the same route position and quality level; menu art is not a substitute for gameplay evidence.

**Player review:** run an initial 8–12-person formative comparison, varying which version is played first. Observe whether players understand hazards, can recover, feel speed without losing control, understand why damage happened, and want another delivery. Record completion, collisions, missed cues, replay choices, and brief feedback. A useful initial goal is a clear majority preferring the new driving and independently identifying the clinic reveal as a highlight. A small playtest guides iteration; it does not prove long-term retention.

## Recommendation

Build the faster vehicle, physical road, modeled truck, two strong encounters, reactive sound, and human clinic restoration as **one complete short mission**. Test that mission against the current game before spreading the upgrade across all five chapters.

The desired jump in quality comes from everything responding to the same action: a wheel meets a rut, the suspension compresses, the cargo settles, gravel sounds change, the camera gives a restrained response, and the player knows what to do next. That coherence, followed by a tangible restoration of light and life, should define Last Light's next release.
