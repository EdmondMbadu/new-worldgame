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
- Settings include remappable letter/number keys, volume, radio voice/subtitles, reduced camera motion, one-press delivery, graphics quality and Relaxed difficulty. Difficulty and graphics changes apply to the next drive.

Firm-road propulsion now targets 80 km/h, with automatic gearing, progressive steering, per-wheel surface traction, and speed-sensitive camera framing. Roads have physical rut depressions, gravel and wetness materials, rocks, mud, narrow bridges, alternate routes and a fallen tree in the final chapter. Stopped minibuses, yielding oncoming vehicles, announced rockfalls and exposed wind sections add encounters. Hard collisions, landings and severe suspension compression can damage cargo; ordinary shallow roughness produces motion and sound. Recovery costs eight seconds. The clock stops when handover succeeds, before the 18-second restoration scene. Staff carry the kit, connect the battery, and restore the rooms and porch in sequence; a fan and equipment restart. Continue becomes available after the lights return. The installed roof array appears in the later completed-clinic view. A charged battery supplies immediate power; solar panels support the clinic beyond this delivery.

| Chapter | Place | New challenge |
| --- | --- | --- |
| The First Light | Kijani Valley Clinic | Ruts, cargo protection and a route choice |
| Before the Rain | Mawingu Forest Clinic | Rain and longer muddy sections |
| Across the River | Mto Riverside Clinic | A narrow bridge or a ridge detour |
| Night Watch | Nyota Maternity Clinic | Darkness, headlight visibility and tighter curves |
| The Last Connection | Umoja Regional Clinic | Storm, bridge, fallen tree and the final delivery |

On-time delivery earns 1,000 points plus up to 400 for reserve remaining, 400 for cargo condition, and 200 for clean encounters. A clean encounter is credited once; revisiting cannot multiply the award. Valley run and Fresh tracks use deterministic different hazard layouts. Stars reward a stronger delivery. Clinic completion unlocks the next chapter; new best scores are stored separately by Standard/Relaxed, road edition, and rules revision. Existing records remain in storage under their legacy keys and existing clinic unlocks carry over. Lives saved are authored fictional story outcomes, counted once per clinic, not multiplied by replaying. Progress and preferences are local to this browser and origin under `last-light.v1`.

## Structure

- `src/engine.ts`: fixed 60 Hz Rapier simulation, raycast vehicle suspension, collisions, traction, cargo, clock and mission state machine.
- `src/missions.ts`, `vehicle.ts`, `encounters.ts`: five chapters, deterministic road editions, shared road/collision surfaces, handling profiles, and moving encounter trajectories.
- `src/world.ts`, `art.ts`, `foliage.ts`, `surfaces.ts`, `living-world.ts`: Three.js renderer, chunked terrain, shaped truck meshes, skinned characters, wind animation, roadside villages, HDR lighting, rain, surface spray, headlights, clinic interiors, unloading and camera choreography.
- `src/App.tsx`, `input.ts`, `audio.ts`, `save.ts`: interface, input adapters, recorded engine and generated soundscape, optional browser speech and resilient local saves.

Game libraries are independent of the Angular application and Lost in Orbit. Heavy rendering and physics modules load when a drive starts. Texture fallbacks keep a missing material download from preventing play. Rendering supports automatic resolution adjustment, fewer shadows in Low mode, reduced camera motion and a restart path for WebGL context loss. Timers pause on lost focus or page visibility, and long frame gaps do not consume the mission clock.

## Verification

The regression suite checks complete ordinary-input deliveries on both routes; deadline ordering, pause, recovery, damage, delivery cancellation, frozen rewards, storage and keyboard/touch/controller adapters. Upgrade coverage adds faster deliveries in both road editions and on both routes, acceleration/braking, mud transitions, physical ruts, a real vehicle collision, deterministic encounters, duplicate-award prevention and legacy-record preservation. The existing Lost in Orbit suite is retained.

The development-only `?qa=1` control drives the actual vehicle through the ordinary input API at a faster pace, slowing for mud, bridges and the delivery bay. It does not teleport, bypass deadlines or manufacture successful deliveries. Production verification rejects the QA interface in built JavaScript. Frame diagnostics report actual frame intervals before simulation clamping, including a rolling 95th percentile.

Graphics use original code-authored geometry, skinned characters, and locally bundled photographic materials and environment lighting. Menu/concept artwork is separately generated art, not a gameplay screenshot. The desktop upgrade checks run at a 1280×720 viewport; performance must also be measured on target devices. Responsive layout checks do not substitute for physical iOS/Android/controller tests, and automated completion does not establish player enjoyment or retention. The game narrative is English; the catalog includes English and French copy.

See [upgrade verification](../../docs/design/last-light/upgrade-verification.md), [asset provenance](ASSETS.md) and the [original design package](../../docs/design/last-light/README.md).
