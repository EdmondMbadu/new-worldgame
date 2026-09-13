# Last Light — Adventure 02

A standalone 3D driving game for the Global Solutions Lab games collection. Play as Amani, carrying solar panels and a charged battery to five clinics before their emergency reserve expires. Reach the courtyard, stop safely, hand over the kit, and watch the clinic become bright and active.

## Run

From the repository root, with Node 22.12 or later:

```sh
npm run setup:games
npm start
```

Open http://localhost:4200/games and choose Last Light. `npm start` runs Angular and both isolated game servers. For Last Light alone, run `npm run start:last-light` and visit http://127.0.0.1:5175/games/last-light/.

The combined development command uses Angular's `games` configuration to let requests reach the live game servers. `npm run start:app` retains the static, prebuilt game assets for an Angular-only preview.

```sh
npm run test:games
npm run build
npm run preview:site
```

The combined production build creates Angular and both game documents in `dist/`, then checks their entry assets, bundle isolation and compressed size budgets. Deployment uses the repository's existing Firebase workflow; this implementation does not deploy automatically.

## Play

- W / up: accelerate. S / down / space: brake; holding brake at a standstill reverses.
- A / D or left / right: steer. E: deliver in the marked courtyard or recover when stuck. Escape: pause.
- Touch controls can be enabled in the driving HUD and appear automatically on touch-oriented devices. Hold DRIVE and a steering button together.
- Standard gamepads use the left stick, triggers, A / cross for the contextual action and the menu button to pause.
- Settings include remappable letter/number keys, volume, radio voice/subtitles, night brightness, enhanced night visibility, reduced lightning/camera motion, one-press delivery, graphics quality and Relaxed difficulty. Difficulty and graphics changes apply to the next drive.

Every chapter now takes place at night. Automatic headlights follow steering and cast a bounded shadow, with distinct moonlight, forest rain, river mist, highland fog and storm profiles. Firm-road propulsion targets 80 km/h, with automatic gearing, progressive steering, per-wheel traction and speed-sensitive framing. Left/right input follows the driver's viewpoint consistently across keyboard, touch and controller adapters.

The centre of the road is no longer a universally safe line. Physical washouts require a marked firm strip or a bypass; moving minibuses indicate and pull into a stop, yielding to occupied space; single-lane bridge traffic must clear before crossing; announced trees fall into the road; deep floodwater slows progress more than the marked shallow route. Explicit branches share their geometry with vehicle collision and scoring. Incidental rocks and ruts stay out of the authored approach corridors. A clean pass requires the correct line, controlled speed where appropriate, traffic clearance, and no damage or recovery. Hard collisions, including fast CCD contacts, landings and severe suspension compression can damage cargo. Recovery costs eight seconds. A climb and genuine switchback lead along an exposed cliff in every chapter; leaving the edge causes a physical fall, then recovery to the last firm checkpoint. Reflectors, chevrons and a 25 km/h approach sign mark the ridge. A lantern-led goat crossing reacts to approaching speed, and compact oncoming traffic gives room. Runoff rises before commitment and affects tire drag. Village compounds include homes, porches, corrugated roofs, pumps, footpaths, warm windows and residents walking between tasks.

Pause or failure screens offer checkpoint practice. Practice uses a refreshed reserve and kit, and is explicitly excluded from records and unlocks. Scored recovery retains its time penalty. Revision 4 scores stay separate from previous road revisions while preserving campaign completion.

Each clinic has its own compound, including recessed windows, wings, shelters, drainage and electrical equipment. The clock stops at accepted handover. During the 18-second restoration, the tailgate opens, rigged staff carry the kit with hand targeting, a staff member connects the battery, and room, corridor and porch lighting returns in sequence. Equipment and community activity resume. Continue becomes available after power returns; the installed roof array appears in the later completed-clinic view. A charged battery supplies immediate power at night.

| Chapter | Place | New challenge |
| --- | --- | --- |
| The First Light | Kijani Valley Clinic | Moonlit washout, blocked road and village dispensary |
| Before the Rain | Mawingu Forest Clinic | Forest rain, floodwater and a sheltered courtyard |
| Across the River | Mto Riverside Clinic | Occupied single-lane bridge, bypass and raised receiving walkway |
| Night Watch | Nyota Maternity Clinic | Fog, fallen tree, exposed descent and a separate ward |
| The Last Connection | Umoja Regional Clinic | Storm, bridge, flood and a larger compound with connected wings |

On-time delivery earns 1,000 points plus up to 400 for reserve remaining, 400 for cargo condition, and 200 for clean encounters. A clean encounter is credited once; revisiting cannot multiply the award. Valley run and Fresh tracks use deterministic different hazard layouts. Stars reward a stronger delivery. Clinic completion unlocks the next chapter; new best scores are stored separately by Standard/Relaxed, road edition, and rules revision. Existing records remain in storage under their legacy keys and existing clinic unlocks carry over. Lives saved are authored fictional story outcomes, counted once per clinic, not multiplied by replaying. Progress and preferences are local to this browser and origin under `last-light.v1`.

## Structure

- `src/engine.ts`: fixed 60 Hz Rapier simulation, raycast vehicle suspension, collisions, traction, cargo, clock and mission state machine.
- `src/missions.ts`, `road-sections.ts`, `vehicle.ts`, `encounters.ts`: five chapters, deterministic road editions, shared road/collision surfaces, safe corridors, handling profiles and moving encounter trajectories.
- `src/world.ts`, `art.ts`, `foliage.ts`, `surfaces.ts`, `living-world.ts`: Three.js renderer, chunked terrain, shaped truck meshes, skinned characters, wind animation, roadside villages, HDR lighting, rain, surface spray, headlights, clinic interiors, unloading and camera choreography.
- `src/routes.ts`, `route-art.ts`: invertible route coordinates, the real switchback, width compensation, cliff terrain, arc distance, and consistent static geometry placement.
- `src/traffic.ts`, `herd-art.ts`, `village.ts`: reactive vehicle movement, herd timing and animation, shared village architecture and daily activity.
- `src/App.tsx`, `input.ts`, `audio.ts`, `save.ts`: interface, input adapters, recorded engine and generated soundscape, optional browser speech and resilient local saves.
- `src/night.ts`, `road-art.ts`, `clinic-assets.ts`, `clinic-architecture.ts`, `staff.ts`: night profiles, hazard markers/water, chapter-specific GLB compounds and animated staff. Reproducible asset preparation scripts live in `scripts/`; provenance is in `ASSETS.md`.

Game libraries are independent of the Angular application and Lost in Orbit. Heavy rendering and physics modules load when a drive starts. Texture fallbacks keep a missing material download from preventing play. Rendering supports automatic resolution adjustment, fewer shadows in Low mode, reduced camera motion and a restart path for WebGL context loss. Timers pause on lost focus or page visibility, and long frame gaps do not consume the mission clock.

## Verification

The regression suite checks complete ordinary-input deliveries on both routes; deadline ordering, pause, recovery, damage, delivery cancellation, frozen rewards, storage and keyboard/touch/controller adapters. Upgrade coverage adds faster deliveries in both road editions and on both routes, acceleration/braking, mud transitions, physical ruts, a real vehicle collision, deterministic encounters, duplicate-award prevention and legacy-record preservation. The existing Lost in Orbit suite is retained.

The development-only `?qa=1` control drives the actual vehicle through the ordinary input API at a faster pace, slowing for mud, bridges and the delivery bay. It does not teleport, bypass deadlines or manufacture successful deliveries. Production verification rejects the QA interface in built JavaScript. Frame diagnostics report actual frame intervals before simulation clamping, including a rolling 95th percentile.

Graphics combine original authored geometry and clinic GLBs, CC0 rigged Quaternius staff, and locally bundled photographic materials/environment lighting. Menu/concept artwork is separately generated art, not a gameplay screenshot. Desktop checks use a 1280×720 viewport; performance must also be measured on target devices. Responsive layout checks do not substitute for physical iOS/Android/controller tests, and automated completion does not establish player enjoyment or retention. The game narrative is English; the catalog includes English and French copy.

See [living-roads verification](../../docs/design/last-light/living-roads-verification.md), [night-journey verification](../../docs/design/last-light/night-journey-verification.md), [previous upgrade verification](../../docs/design/last-light/upgrade-verification.md), [asset provenance](ASSETS.md) and the [original design package](../../docs/design/last-light/README.md).
