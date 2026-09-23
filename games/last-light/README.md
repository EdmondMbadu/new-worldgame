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

### Journey soundtrack

“Morning on the Ridge” starts each drive as the main song. Near its end, a four-second equal-power crossfade brings in “Light at the Clearing”; the playlist then cycles back to Morning for longer drives and restoration/results scenes. Music fades in at a restrained level and lowers under spoken radio so road cues remain audible. There are no forced song changes during a hazard or handover.

The original user-supplied MP3s stream through two native audio elements and the existing Web Audio mix, without full-song decoding or blocking game startup. Start/Resume/Enable sound prime playback from a user gesture. The existing Sound & music toggle and Volume control apply to both music and effects. Pause, lost focus, hidden tabs, mute and zero volume preserve song positions; returning to chapters or restarting releases the streams. If one track fails, the other continues; if both fail, the original generated score remains available. Browser audio restrictions never prevent driving.

The total downloadable asset budget is now 21 MiB to include the two original MP3s; the compressed code budget is unchanged. This is a package size limit, not a startup download requirement. Hosting verification checks that both songs are packaged. Real-device Safari/iOS/Android audio checks remain recommended; desktop playback and mocked browser-policy tests cannot establish behavior on every physical device.

Every chapter now begins in golden light and ends at dusk: the sun is driven by route progress, so it sets as the clinic comes into view (savanna sunset, storm light, river dusk, highland nightfall, storm sunset). A scattering sky with moving clouds, sun-tinted height fog, layered mountain ranges, valley lakes and mist decks give each drive a horizon. Headlights, traffic lamps and fireflies take over as the light goes; the night profiles still govern the final stretch of every chapter. Automatic headlights follow steering and cast a bounded shadow once it is dark. Firm-road propulsion targets 80 km/h, with automatic gearing, progressive steering, per-wheel traction and speed-sensitive framing. Left/right input follows the driver's viewpoint consistently across keyboard, touch and controller adapters.

The centre of the road is no longer a universally safe line. Physical washouts require a marked firm strip or a bypass; moving minibuses indicate and pull into a stop, yielding to occupied space; single-lane bridge traffic must clear before crossing; announced trees fall into the road; deep floodwater slows progress more than the marked shallow route. Explicit branches share their geometry with vehicle collision and scoring. Incidental rocks and ruts stay out of the authored approach corridors. A clean pass requires the correct line, controlled speed where appropriate, traffic clearance, and no damage or recovery. Hard collisions, including fast CCD contacts, landings and severe suspension compression can damage cargo. Recovery costs eight seconds. From the second chapter on, climbs lead into genuine switchbacks along an exposed cliff (the highlands have two); leaving the edge causes a physical fall, then recovery to the last firm checkpoint. Reflectors, chevrons and a 25 km/h approach sign mark each hairpin. A lantern-led goat crossing reacts to approaching speed, and compact oncoming traffic gives room. Runoff rises before commitment and affects tire drag. Village compounds include homes, porches, corrugated roofs, pumps, footpaths, warm windows and residents walking between tasks.

Revision 5 adds a persistent roster of ten road vehicles in the first chapter and twelve in later chapters. Compact cars and loaded pickups travel in both directions, keep right, follow other vehicles and yield before the exposed hill and livestock crossings. They use firm bypasses around damaged sections and rejoin the shared road. Catch slower traffic, wait for a gap, and pass with room to spare. Minibuses signal, stop and depart once there is room; brake lamps, rotating wheels, ground-aligned bodies, surface spray and positional motor audio make their motion readable. Physical traffic contacts can damage the kit, and a struck driver waits until the truck has room to back away. Safe following can earn a clean traffic encounter too.

### Five places

Revision 6 gives every chapter its own road and a signature moment, so no two drives share a layout. Each chapter's shape, width, hills, overall climb, switchbacks, cliff depth and far vistas live with its mission data; hazards are authored per chapter with quiet stretches between them rather than a fixed rhythm.

- **The First Light, open savanna valley.** A wide road sweeps down into the valley with long views. Market day fills the village: wax-print awnings, parasols, vendors and people crossing between the stalls. People cross only while the market is calm; a hurrying truck makes them wait at the verge, and a clean pass means walking pace (under 18 km/h). Goats cross at dusk.
- **Before the Rain, rain forest.** A narrow, winding road under the trees, and the rain arrives during the drive: grip, spray, wipers, rain sound and headlight mode follow the weather where the truck is. A tree falls across the road, then an overloaded lorry sits bogged in the mud of the short route with its crew digging. Crawl past on the firm side or take the left detour. A forest switchback and a flooded crossing follow.
- **Across the River, river country.** The road follows a river that runs in its own channel, passes under the bridge and bends away before the climb out of the valley. A creek crosses the road on two timber runners: line up and crawl over, or take the detour. Off the runners, a wheel drops into the creek. Then the minibus stop, the damaged single-lane bridge and the climb.
- **Night Watch, highland escarpment.** A steady climb through twin switchbacks with deep drops. At night, leafy branches laid on the road mark a broken-down truck with its bonnet up and hazards flashing; the driver waits by the verge with a lantern. The exposed descent follows.
- **The Last Connection, storm country.** The storm thickens as you drive. A fresh landslide buries half the road in earth, rock and an uprooted tree; crawl through the marked passage. Then the switchback, bridge, flood, herd and falling tree, one last time.

Fresh tracks puts the damage on the other side of the road for washouts, floods, fallen trees, lorries, breakdowns, landslides and herds. Routine traffic shares the same rules: it slows through the market, goes single file right beside a blocker, and takes the signed bypasses.

Foreground frame delays no longer open an unexpected pause screen. Physics catch-up is bounded to six fixed steps; discarded wall time does not drain the reserve. Livestock braking assistance now builds progressively and releases when the truck's path clears. Lost focus, hidden tabs and deliberate pause still protect the delivery. Standard chapter reserves are 235/255/270/285/300 seconds, allowing careful driving and legitimate waits.

Pause or failure screens offer checkpoint practice. Practice uses a refreshed reserve and kit, and is explicitly excluded from records and unlocks. Scored recovery retains its time penalty. Revision 6 scores stay separate from previous road revisions (including revision 5) while preserving campaign completion.

Each clinic has its own compound, including recessed windows, wings, shelters, drainage and electrical equipment. The clock stops at accepted handover. During the 18-second restoration, the tailgate opens, rigged staff carry the kit with hand targeting, a staff member connects the battery, and room, corridor and porch lighting returns in sequence. Equipment and community activity resume. Continue becomes available after power returns; the installed roof array appears in the later completed-clinic view. A charged battery supplies immediate power at night.

| Chapter | Landscape | Signature moment | Also on the road |
| --- | --- | --- | --- |
| The First Light | Open savanna valley | Market day in the village | Washout, goats at dusk |
| Before the Rain | Rain forest | Rain arrives; a lorry bogged in the mud | Falling tree, switchback, flood |
| Across the River | River country | Timber plank crossing over a creek | Minibus stop, single-lane bridge, switchback, oncoming vehicle |
| Night Watch | Highland escarpment | Twin switchbacks; a breakdown marked with branches | Washout, exposed descent |
| The Last Connection | Storm country | A fresh landslide | Switchback, bridge, flood, herd, falling tree |

On-time delivery earns 1,000 points plus up to 400 for reserve remaining, 400 for cargo condition, and 200 for clean encounters. A clean encounter is credited once; revisiting cannot multiply the award. Valley run and Fresh tracks use deterministic different hazard layouts. Stars reward a stronger delivery. Clinic completion unlocks the next chapter; new best scores are stored separately by Standard/Relaxed, road edition, and rules revision. Existing records remain in storage under their legacy keys and existing clinic unlocks carry over. Lives saved are authored fictional story outcomes, counted once per clinic, not multiplied by replaying. Progress and preferences are local to this browser and origin under `last-light.v1`.

## Structure

- `src/engine.ts`: fixed 60 Hz Rapier simulation, raycast vehicle suspension, collisions, traction, cargo, clock and mission state machine.
- `src/missions.ts`, `road-sections.ts`, `vehicle.ts`, `encounters.ts`: five chapters (each with its own road shape, relief, weather, river, switchbacks and authored moments), deterministic road editions, shared road/collision surfaces, safe corridors, handling profiles and moving encounter trajectories.
- `src/set-pieces.ts`, `set-piece-art.ts`: deterministic placement shared by physics and art for the market stalls and crossing villagers, landslide rocks, plank runners and parked vehicles, and their art: stalls, crowds, the bogged lorry and its crew, the creek, the broken-down truck with warning branches and the landslide.
- `src/world.ts`, `art.ts`, `foliage.ts`, `surfaces.ts`, `living-world.ts`: Three.js renderer, chunked terrain, shaped truck meshes, skinned characters, wind animation, roadside villages, HDR lighting, rain, surface spray, headlights, clinic interiors, unloading and camera choreography.
- `src/atmosphere.ts`, `post.ts`, `camera-rig.ts`: golden-hour → dusk sky and lighting, height fog with aerial perspective, post-processing (sun shafts, bloom, filmic grade, SMAA/FXAA by quality) and the spring-damped chase camera with its opening crane shot.
- `src/biome.ts`, `landscape.ts`, `scenery-layout.ts`: procedural African vegetation (acacia, baobab, oil palm, banana, euphorbia, broadleaf, elephant grass, termite mounds, granite kopjes), ridgelines, valley water, mist, birds, fireflies and village smoke. The layout is deterministic and shared with physics, so trees, boulders, homes and bridge rails are solid (one merged static collider) and reflector posts and signs are knocked over by the truck.
- `src/routes.ts`, `route-art.ts`: invertible route coordinates, the real switchback, width compensation, cliff terrain, arc distance, and consistent static geometry placement.
- `src/traffic-flow.ts`, `traffic-art.ts`, `frame-health.ts`: persistent traffic, physical-distance lanes, pooled car art/lights/audio coordination, collision clearance and raw frame diagnostics.
- `src/traffic.ts`, `herd-art.ts`, `village.ts`: reactive vehicle movement, herd timing and animation, shared village architecture and daily activity.
- `src/App.tsx`, `input.ts`, `audio.ts`, `journey-music.ts`, `save.ts`: interface, input adapters, recorded engine, streamed music and generated soundscape, optional browser speech and resilient local saves.
- `src/night.ts`, `road-art.ts`, `clinic-assets.ts`, `clinic-architecture.ts`, `staff.ts`: night profiles, hazard markers/water, chapter-specific GLB compounds and animated staff. Reproducible asset preparation scripts live in `scripts/`; provenance is in `ASSETS.md`.

Game libraries are independent of the Angular application and Lost in Orbit. Heavy rendering and physics modules load when a drive starts. Texture fallbacks keep a missing material download from preventing play. Rendering supports automatic resolution adjustment, fewer shadows in Low mode, reduced camera motion and a restart path for WebGL context loss. Timers pause on lost focus or page visibility, and long frame gaps do not consume the mission clock.

## Verification

See [soundtrack verification](../../docs/design/last-light/soundtrack-verification.md) for music playback, lifecycle, packaging checks and device-testing limits. The development-only `/games/last-light/qa/music.html` diagnostic exercises real native playback and both crossfade boundaries without changing game saves.

The regression suite checks complete ordinary-input deliveries on both routes; deadline ordering, pause, recovery, damage, delivery cancellation, frozen rewards, storage and keyboard/touch/controller adapters. Upgrade coverage adds faster deliveries in both road editions and on both routes, acceleration/braking, mud transitions, physical ruts, a real vehicle collision, deterministic encounters, duplicate-award prevention and legacy-record preservation. The existing Lost in Orbit suite is retained.

The development-only `?qa=1` control drives the actual vehicle through the ordinary input API at a faster pace, slowing for mud, bridges and the delivery bay. It does not teleport, bypass deadlines or manufacture successful deliveries. Production verification rejects the QA interface in built JavaScript. Frame diagnostics report actual frame intervals before simulation clamping, including p50/p95/p99, lifetime maximum and long-frame counts. Pause reason, discarded simulation time and physics/render CPU averages are also visible; slow frames are retained.

Graphics combine original authored geometry and clinic GLBs, CC0 rigged Quaternius staff, and locally bundled photographic materials/environment lighting. Menu/concept artwork is separately generated art, not a gameplay screenshot. Desktop checks use a 1280×720 viewport; performance must also be measured on target devices. Responsive layout checks do not substitute for physical iOS/Android/controller tests, and automated completion does not establish player enjoyment or retention. The game narrative is English; the catalog includes English and French copy.

See [five places verification](../../docs/design/last-light/five-places-verification.md), [traffic and smoothness verification](../../docs/design/last-light/traffic-flow-verification.md), [living-roads verification](../../docs/design/last-light/living-roads-verification.md), [night-journey verification](../../docs/design/last-light/night-journey-verification.md), [previous upgrade verification](../../docs/design/last-light/upgrade-verification.md), [asset provenance](ASSETS.md) and the [original design package](../../docs/design/last-light/README.md).
