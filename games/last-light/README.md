# Last Light — Adventure 02

A complete, standalone 3D driving game for the Global Solutions Lab games collection. Play as Amani, carrying solar panels and a charged battery to five clinics before their emergency reserve expires. Reach the courtyard, stop safely, hand over the kit, and watch the clinic become bright and active.

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

The road has rolling terrain, ruts, rocks, mud, narrow bridges, alternate routes and a fallen tree in the final chapter. Speed can cost cargo integrity. Recovery costs eight seconds. The clock stops when handover succeeds, before the 14-second restoration scene. A charged battery supplies immediate power; solar panels support the clinic beyond this delivery.

| Chapter | Place | New challenge |
| --- | --- | --- |
| The First Light | Kijani Valley Clinic | Ruts, cargo protection and a route choice |
| Before the Rain | Mawingu Forest Clinic | Rain and longer muddy sections |
| Across the River | Mto Riverside Clinic | A narrow bridge or a ridge detour |
| Night Watch | Nyota Maternity Clinic | Darkness, headlight visibility and tighter curves |
| The Last Connection | Umoja Regional Clinic | Storm, bridge, fallen tree and the final delivery |

On-time delivery earns 1,000 points plus up to 600 for reserve remaining and 400 for cargo condition. Stars reward a stronger delivery. Clinic completion unlocks the next chapter; best scores are stored separately for Standard and Relaxed. Lives saved are authored fictional story outcomes, counted once per clinic, not multiplied by replaying. Progress and preferences are local to this browser and origin under `last-light.v1`.

## Structure

- `src/engine.ts`: fixed 60 Hz Rapier simulation, raycast vehicle suspension, collisions, traction, cargo, clock and mission state machine.
- `src/missions.ts`: five authored chapters, deterministic roads, obstacles, terrain and radio events.
- `src/world.ts`, `art.ts`, `foliage.ts`, `surfaces.ts`: Three.js renderer, terrain materials, original mesh assets, instanced foliage, rain, headlights, clinic lighting, unloading and camera choreography.
- `src/App.tsx`, `input.ts`, `audio.ts`, `save.ts`: interface, input adapters, generated soundscape, optional browser speech and resilient local saves.

Game libraries are independent of the Angular application and Lost in Orbit. Heavy rendering and physics modules load when a drive starts. Texture fallbacks keep a missing material download from preventing play. Rendering supports automatic resolution adjustment, fewer shadows in Low mode, reduced camera motion and a restart path for WebGL context loss. Timers pause on lost focus or page visibility, and long frame gaps do not consume the mission clock.

## Verification

Last Light has 28 automated tests: ten complete ordinary-input deliveries covering every chapter on both routes; thirteen rules/save/timing tests; and five keyboard/touch/controller adapter tests. The existing Lost in Orbit suite has 36 tests. Tests cover pause and timer behavior, delivery cancellation, exact deadline ordering, damage cooldown, recovery, relaxed mode, immutable rewards, corrupt saves, duplicate completion and equivalent simulation at 30/60/144 Hz render schedules.

Browser verification covers complete deliveries in all five chapters, catalog launch, loading the real 3D scene, arrival/restoration/results, chapter unlock and replay, pause/settings, saved progress, and production touch layouts at 390×844 and 844×390. The completed campaign showed five powered clinics and 34 story lives saved. Night Watch's dark and illuminated clinic states were visually checked. Both games launch through the main-site development proxy; the production catalog and Last Light scene also load without console errors. The development-only `?qa=1` control drives the actual vehicle using the normal input API; it does not teleport, bypass deadlines or manufacture a successful delivery. The production verifier rejects this QA UI in built JavaScript.

Graphics are real-time Three.js with original game meshes and textured terrain. Menu/concept artwork is separately generated art, not a gameplay screenshot. On the development host the driving scene ran around 60 FPS at a 1280×720 viewport; concurrent site builds reduced observed browser QA averages to roughly 30–45 FPS. These are observations on one device, not universal performance claims. Physical iOS/Android devices and physical controllers still need device testing. Controller behavior is covered by adapter tests. The game narrative is English; the surrounding catalog includes English and French copy.

See [asset provenance](ASSETS.md) and the [original design package](../../docs/design/last-light/README.md).
