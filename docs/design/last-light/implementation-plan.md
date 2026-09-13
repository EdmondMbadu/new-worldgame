**LAST LIGHT — implementation blueprint for Game 02**

**Planning status.** This plan is based on the current local repository and official engine documentation checked during this design pass. No game source, dependency, application route, catalog entry, build script, or hosting configuration has been changed. Performance numbers below are proposed acceptance targets, not measurements of an implemented Last Light game.

**Build strategy.** Produce one complete mission at the intended visual and interaction quality, profile it on the selected devices, and then extend the proven systems across five chapters. The first milestone must include the full unloading and clinic illumination sequence. A driveable scene without that conclusion is not a complete milestone.

The production order is: define and acquire the essential art → prove vehicle handling on representative terrain → integrate the complete first mission → finish its visual and sound pass → validate real devices → author the remaining chapters → release Game 02 alongside Game 01. Rough geometry is useful during handling development, but the first public playable needs finished representative assets.

**What exists today.** The host application is Angular 20.3. Lost in Orbit is an independent React 19 / React Three Fiber 9 / Three.js r180 / Vite 7 package. Angular hosts the lightweight catalog and static routing; the game engine lives in a separate document. Root development, build, and hosting verification scripts currently name Lost in Orbit explicitly. These are manifest declarations inspected locally, not a claim that all installed packages have been upgraded to the newest versions.

Maintain the standalone-game boundary. Create a sibling package at the proposed `games/last-light/`, use `/games/last-light/` as its Vite base, and serve the production game as its own static document. Keep game renderers, physics, and mission media out of Angular's application bundles. Use the existing first game's major versions as a starting compatibility reference and commit exact dependency resolutions for the new package after a tested installation.

**Proposed technology decisions.** Use TypeScript, React, React Three Fiber, and Three.js for scene composition and UI. Use WebGL 2 as the initial rendering baseline; the Three.js renderer requires it. Detect support before mission loading and provide a usable explanation and return-to-catalog action if it is unavailable. A later WebGPU rendering path can be evaluated independently. [Three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html).

Use Rapier 3D for the chassis, world collision, and its ray-cast vehicle controller. The documented controller exposes per-wheel steering, braking, engine force, friction, and suspension tuning, matching the proposed road-surface driving model. Prototype those interactions with the selected package version before authoring five routes. Add constrained driving assistance and tune it through playtests. [Rapier vehicle controller documentation](https://rapier.rs/javascript3d/classes/DynamicRayCastVehicleController.html).

Use glTF/GLB for models and animation. Select Meshopt or Draco based on measured transfer and decode results for the actual assets, and use KTX2/Basis textures where supported by the chosen export pipeline. Serve decoders and transcoders with the game's own versioned assets. Three.js provides loader integration for these formats. [GLTFLoader documentation](https://threejs.org/docs/pages/GLTFLoader.html), [KTX2Loader documentation](https://threejs.org/docs/pages/KTX2Loader.html).

Use instancing for repeated vegetation and props, distance-based detail levels, and adaptive rendering resolution with upper and lower thresholds. The quality controller should settle instead of repeatedly switching tiers. React Three Fiber documents these scaling approaches. [React Three Fiber performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

**System boundaries and ownership.** The following are proposed modules, not files already added to the application.

| System | Responsibility | Important boundary |
| --- | --- | --- |
| Mission configuration | Route graph, terrain surfaces, hazards, checkpoints, time allowance, clinic, dialogue, authored outcomes, and asset manifest. | Data describes a mission; it does not mutate the renderer. Validate it before play. |
| Simulation | Fixed-step time, vehicle control, collision, surface grip, kit integrity, delivery eligibility, and mission outcomes. | Gameplay owns the truth independently of camera, audio, or frame rate. |
| Input | Keyboard, touch, controller, rebinding, focus loss, and contextual actions. | Produce one normalised input snapshot; clear it on pause, blur, and navigation. |
| Scene | Terrain, vehicle presentation, people, vegetation, sky, weather, clinic, effects, and camera. | Consume simulation state; do not award points from visual animation callbacks. |
| Event layer | Impact, warning, route change, delivery accepted, power restored, result committed. | Events carry stable mission/run identifiers for one-time handling. |
| Audio and dialogue | Surface sound, engine layers, spatial ambience, music states, radio priorities, subtitles. | Failure or muting never blocks gameplay. |
| UI and accessibility | Menus, loading, HUD, help, settings, pause, results, and campaign map. | Semantic HTML overlays the canvas; per-frame vehicle updates stay out of React state. |
| Persistence | Settings, unlocked chapters, unique mission outcomes, and best results by mode. | Versioned local records; storage errors must not block a mission. |
| Asset lifecycle | Fetch/decode, progress, warm-up, activation, cache, disposal, and retry. | No timer begins until critical assets and colliders are ready. |
| Quality controller | Resolution, shadow tier, decorative density, texture tier, and optional post-effects. | Visual adaptation cannot modify collision, visibility of hazards, or deadline rules. |

**The simulation.** Run a 60 Hz fixed simulation step with interpolated rendering. Sample held input for each step and queue one-shot actions once. Limit catch-up steps after long stalls and enter a resumable pause for substantial interruptions; do not create a huge collision impulse or silently consume an entire deadline after the browser has stalled. Define time as active simulated mission time consistently across all supported render rates.

Use one dynamic chassis with simple compound colliders and four wheel rays. Model key road ruts, bridge edges, slopes, and verges in collision geometry. Decorative texture detail is separate from physical terrain. Each wheel contact identifies the surface type, controlling grip, rolling resistance, sound, and particles. Tune steering assistance, damping, traction response, anti-roll, and maximum speed together; the control reference track must include all launch surface types.

Cargo is visually secured to the truck. A tuned damage model derives kit-integrity loss from significant impacts and landing stress, with thresholds and a repeat-hit cooldown. Its presentation includes rack movement and audible strain; it does not require independently simulating each panel. Keep gameplay bounds generous around narrow structures, and test wheel rays against thin bridges and collider seams.

Route progress follows the authored road graph, including the currently selected branch. Distance is remaining path length, not a straight-line measurement to the clinic. Recovering restores the truck to a known safe road pose, preserving timer and integrity and applying the published recovery penalty. Tests ensure it cannot jump forward through the route or become a repeatable scoring shortcut.

**Mission state and deadline semantics.** Main progression: loading → briefing → ready → driving → delivery accepted → restoring power → results. Pause is an overlay with a saved prior state. Driving can also end in failed; failed offers retry back to ready using cached assets. Context loss and return from browser history lead to a deliberate resume flow.

Delivery eligibility requires the correct zone, speed below a small threshold, a functional kit, and an unexpired reserve. The one-second hold advances on simulation time and cancels if eligibility is lost. After the step decrements the reserve, accept handover only if the remaining reserve is strictly positive; this makes a deadline tie consistently a failed attempt. The same simulation transition freezes the result inputs, records success once, and disables driving. The subsequent animation never decides whether the player won.

Skipping the arrival sets the scene to its complete powered state and displays the same stored result. It must not re-run rewards. A successful delivery saves its outcome at acceptance, so a tab closed during celebration does not erase a completed mission. On reload, the campaign reflects that delivery even if no full cinematic was watched.

**Implementing the clinic transformation.** Author dark and powered lighting states for each clinic using identical geometry. Both states and all required character clips are available before driving begins. Interior lightmaps or precomputed light contributions, window emissive materials, selected real light sources, porch spill, and character lighting change from one timeline. Each room has a fixture activation cue, with one main restoration event coordinating animation, sound, and UI.

The timeline drives the unloading trolley, door/crew animations, battery connection, light sequence, crowd reactions, and camera. Use a small cast with deliberate staged paths around the parked vehicle. Reserve a clear delivery zone, snap the parked truck gently to a valid presentation pose after success if necessary, and keep people out of the approach lane. The final panel-installation view is a brief cinematic time compression; it is not a timed manual construction system.

Use one camera-relative or courtyard light for important human reactions, while most clinic lights are represented by baked contribution and emissive materials. The low tier can use a simpler blend and fewer dynamic lights, but still visibly lights the walls, ground, and people. Validate at fixed exposure as well as final exposure settings to ensure the transformation is more than a brightness filter.

**3D art production.** The close-up truck, clinic, terrain, solar kit, and people need actual game-ready assets. Generated concept images guide composition and materials; they do not supply a rigged vehicle, character animation, collision meshes, or a playable landscape.

| Asset group | Required first-mission delivery | Production validation |
| --- | --- | --- |
| Truck | One coherent pickup, separate wheels, suspension presentation, glass, lights, doors, driver seat, solar rack, and cargo attachment points. | Correct scale, pivots, steering axes, collider fit, material response, and lower-detail variants. |
| Solar kit | Recognisable panel faces and frames, protective rack, straps, battery trolley/case, and safe-looking prepared connection. | Secure travel arrangement; clean unload animation; consistent before/after inventory. |
| Clinic | Modular exterior, limited visible interior, windows, porch, mounting rails, battery connection, and two lighting states. | Dark and lit states share geometry; arrival reads at all quality tiers and aspect ratios. |
| Terrain and road | Authored route with meaningful elevation, ruts, muddy bend, branch, settlement approach, and collision surfaces. | Every route traversable, no seam traps, distant scenery hiding route boundaries. |
| Environment | Foliage families, rocks, verge details, fences, signs, water surface, and atmospheric background. | Instancing and detail levels; readable silhouettes; no repetitive near-camera patterns. |
| People | Amani, one nurse, two installation crew, and a small set of family/resident characters with reusable rigs. | Idle, guide, exit, carry, connect, wave, embrace, and return-to-work clips without foot sliding or intersections. |
| Sound | Engine and surface layers, rain, wind, impact, cargo, connection, clinic ambience, voice lines, and adaptive music. | Clear mixing, subtitles, meaningful muted play, and loop transitions without pops. |

Choose original authored assets or assets with suitable redistribution rights for a web game. Record origin, author, licence, modifications, source files, and export settings in an asset register. Purchased packs, if considered later, need a concrete selection and cost decision; this plan does not assume that assets have been acquired. Consistent art direction and final human animation work are production dependencies.

Export assets with a consistent metre scale, named animation clips, tested pivots, UVs, physically based materials, and separate collision geometry. Bake small surface detail into maps; spend geometry on silhouettes, road shape, wheels, and close interaction. Build a representative asset viewer and compare final exports under the actual game's day, storm, night, and restored-clinic lighting.

**Rendering and loading targets.** The targets below are initial budgets to validate in the first complete mission. Select and record actual desktop and mobile reference devices before declaring them met. Use the same captured route and arrival sequence for comparisons.

| Area | Proposed target | Measurement |
| --- | --- | --- |
| Standard desktop | Approximately 60 fps at 1920×1080 output with adaptive internal resolution. | Five-minute run; 95th-percentile frame interval at or below 20 ms after warm-up. |
| Mobile/low tier | Approximately 30 fps after thermal warm-up on the selected midrange reference phone. | Ten-minute repeated route and arrival; 95th-percentile frame interval at or below 38 ms. |
| First playable transfer | At most 12 MiB total critical transfer on Standard; at most 6 MiB on Low. | Cold cache, including engine, WASM, decoders, models, textures, required audio, and entry files. |
| First control | At most 10 seconds on a defined 20 Mbps / 80 ms RTT profile on the reference desktop. | Navigation to a ready-to-drive state, including decode, physics startup, and shader warm-up; exclude time the person spends reading or choosing Start. |
| Boot feedback | Lightweight loading shell and poster within a proposed 250 KiB compressed budget. | Network and loading-state checks before large mission assets arrive. |
| Visual workload | Begin near 250 draw calls on Standard and 120 on Low; approximately 500k / 200k visible triangles. | Instrument driving, worst weather, and powered arrival; revise only from measured evidence. |
| Session stability | No monotonic memory or resource growth after repeated missions settle. | Compare baseline resource counts after five retries, five chapter transitions, and navigation away/back. |

Start with mostly 1K–2K texture sets on Standard and smaller sets on Low. High-resolution hero textures are opt-in or deferred until play is ready. GPU allocation is profiled independently of compressed transfer size. Stream chapters separately; do not download all five before mission one. Reuse common assets and cap the number of simultaneously resident mission bundles.

Shader compilation, decoder startup, audio preparation, and both clinic states must be warmed before the timer starts. Driving needs continuous rendering. Menus, hidden pages, and completed scenes can render less frequently or on demand. Lower quality progressively with hysteresis, prioritising optional effects before reducing clarity. Avoid runtime surprises such as first-use shader stalls when the clinic lights turn on.

**Repository integration, when implementation begins.** The catalog already loops over metadata, but its HTML still hardcodes Lost in Orbit's genre, description, image alt text, kicker, and some shared tags. The launcher iframe and development/build scripts also name the first game. Adding one metadata row alone would produce an incomplete second-game integration.

| Existing location | Required future change |
| --- | --- |
| `src/app/games/games-catalog.component.ts` | Add Game 02 metadata after Game 01; include per-game translation keys, alt text, genre, duration, and route. Update catalog SEO description for the collection. |
| `src/app/games/games-catalog.component.html` | Read each entry's copy and metadata; remove first-game-specific bindings from the shared card template. |
| `src/assets/i18n/en.json` and `fr.json` | Add Last Light catalog copy and the necessary shared metadata keys. Plan game subtitle/UI localisation separately in its own package. |
| `src/app/app-routing.module.ts` and `src/app/games/game-launcher.component.ts` | Add the second fallback route. Resolve iframe source, title, and loading treatment from an explicit game allowlist. |
| `package.json` and `scripts/dev-site.mjs` | Add setup, build, test, and run coverage for both independent games. Reserve and verify a distinct local Vite port, initially proposed as 5175. Stop all spawned servers together. |
| `proxy.games.json` | Proxy the second game's base path to its own dev server, including assets and hot reload. |
| `angular.json` and `scripts/build-site.mjs` | Build both game packages before Angular's static copy, include both output directories, retain the real `/games/index.html` catalog entry, and fail if either game build fails. |
| `scripts/verify-hosting.mjs` | Verify both standalone entries and their assets; broaden the Angular dependency-leak check to every game directory and new physics dependencies. Add per-game code/media budgets. |
| `firebase.json` | Add the second entry's revalidation policy, immutable hashed asset caching, and any explicit route needed under the existing hosting convention. Retain the collection's noindex behaviour. |

Keep Lost in Orbit's existing 450 KiB compressed JS/CSS check intact. Last Light receives a distinct, explicit code/physics budget based on its measured release build and the total-transfer targets above. Media budgets must include files that the old JS/CSS-only verifier never counted. New model, audio, texture, WASM, and decoder URLs must be base-aware and work from both direct and fallback launches.

Share only catalog metadata or build descriptors where useful. Avoid moving game dependencies into Angular or coupling the first game's engine to the second game's new systems. An explicit build manifest can reduce repeated hardcoding as both games become first-class build targets.

**Persistence and replay.** Use a new versioned namespace such as `last-light.v1`. Save the completed chapter set, unique authored lives-saved outcomes, best score/stars per chapter and difficulty, and player settings. Commit results once per successful run; use first-clear membership to prevent repeated lives-saved totals. Handle malformed records and quota failures by recovering to safe defaults. No account or backend is required for the initial release. A future public leaderboard needs separate score-verification design.

**Verification that matters.** Automated simulation coverage must exercise deadline boundaries, damage thresholds/cooldowns, route-distance calculation, no-double-reward handover, recovery penalties, replay, corrupted saves, and equivalent outcomes under different render schedules. Seed scripted events so failures can be reproduced. Physics comparisons use sensible tolerances across platforms rather than promising bit-identical runs everywhere.

Browser acceptance covers complete ordinary-input missions, success and failure, the second route, repeated retries, controller disconnection, simultaneous touch inputs, focus loss, hidden tabs, history restoration, resize/orientation, disabled audio, storage failure, slow loading, and WebGL context loss. Simulated touch checks supplement actual multi-touch testing on iOS and Android hardware.

Visual acceptance captures the same checkpoint views in day, rain, fog, and night at each quality tier. Check shadow stability, texture repetition, vegetation shimmer, tyre contact, collision seams, legible road edges, people/vehicle intersections, subtitle contrast, and camera obstruction. Capture dark and powered clinic frames at a matched camera to verify the central transformation.

Profile the entire arrival as well as driving; extra people, lights, effects, and music must not create the worst hitch at the emotional climax. Test current Chrome/Edge, Firefox, Safari, mobile Safari, and Android Chrome on the selected release matrix. Record versions and hardware with the result. No measured-device or browser-coverage claims are made by this planning document.

**Production milestones and completion gates.**

| Milestone | Concrete output | Gate before expanding |
| --- | --- | --- |
| 1. Art and handling reference | One representative finished truck, road/material samples, clinic lighting study, asset register, and vehicle test track. | Braking, mud, slopes, ruts, camera, and surface feedback feel good; the dark-to-lit study reads clearly. |
| 2. Complete first mission | One authored route with a real branch, deadline, cargo, arrival, results, retry, saves, and all input modes. | Ordinary inputs can complete or fail the mission; no reward duplication or blocked route. |
| 3. First mission at release quality | Final representative terrain, weather, people, lighting, audio, accessibility, loading, and quality tiers. | Visual and performance targets pass on chosen devices; first-time players understand the mission and want a second run. |
| 4. Five-chapter campaign | Four additional routes, bridge/flood set pieces, chapter progression, distinct clinic arrivals, and finale. | Every chapter passes route fairness, repeated-run, outcome, and performance checks. |
| 5. Collection integration and release candidate | Game 02 card, direct routes, both-game builds, asset verification, localisation, and production preview. | Both games work from the catalog and direct URLs; no game dependencies load on unrelated pages; release QA is recorded. |

Milestones 1–3 define the first playable delivery. Milestones 4–5 complete the proposed initial release. Calendar estimates follow the asset inventory and measured first-mission work; this design does not substitute an untested schedule for production evidence.

**Primary production risks and responses.** Vehicle feel is resolved before building the campaign. Art quality depends on coherent models, materials, lighting, animation, and audio production; a generated concept image cannot close that dependency. Mobile thermal limits and decode time are checked during the first mission. Human animation is staged with a small cast and clear motion paths. Dynamic illumination is budgeted from the start. Loading and retry reuse are explicit systems, so improvements to scene detail do not quietly undermine immediate play.

The next implementation step is Milestone 1, followed immediately by the complete first mission. The acceptance standard is the experience defined in the game design: a truck that feels satisfying to drive, a road that rewards attention, and a clinic whose return to light makes the journey matter.
