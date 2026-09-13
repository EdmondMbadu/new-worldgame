# Last Light: traffic flow and smoothness

Implemented as road revision 5 · 13 September 2026 · [Implementation and verification](traffic-flow-verification.md)

The request is interpreted as **cars along the road**. Build on the existing hills, villages, night driving and clinic restoration with frequent, believable traffic. The central decision becomes: **follow for a moment, judge the gap, pass cleanly, and bring the solar kit home.**

The sections below preserve the original source-reviewed proposal and its planning-time observations. Density, handling and performance figures below are design targets; the linked verification records the shipped scope, measurements and remaining device checks.

## 1. Fix the interruptions first

Inspection identifies specific mechanisms that could explain the reported sudden stops. It does not establish which one occurred in the user's run.

| Symptom | Current mechanism | Proposed treatment |
| --- | --- | --- |
| Pause screen appears after a hitch | `engine.ts`, `advance()`, calls `pause()` for any frame delay above 0.65 seconds. A rules test explicitly requires this behaviour. | Handle an isolated foreground hitch without opening a modal. Bound simulation catch-up and resume rendering automatically. |
| Truck suddenly brakes near goats | `engine.ts` treats a crossing within 15 route units as parking and applies wheel brake 240. Normal full braking is 34. The decision is proximity based, without checking the actual remaining animal path. | Admit crossings using stopping distance, warn earlier, and replace the parking brake with progressive assistance for an actual conflict. |
| Traffic visibly stops and starts | `traffic.ts` switches vehicle motion directly between its travel speed and zero when the corridor becomes occupied. Several actors stop permanently after their encounter clears. | Smooth acceleration, earlier following-distance decisions, and a route lifecycle that continues after the pass. |
| Performance display looks healthy despite interruptions | `world.ts` excludes frame intervals of 0.5 seconds or longer. A frame that pauses the engine also skips the render/QA sampling block in `App.tsx`. | Measure raw foreground frame intervals before simulation and render decisions. Retain long frames and report their counts and causes. |
| Pause follows a focus change | `App.tsx` pauses on window blur, page lifecycle events and hidden visibility; controller disconnection also pauses through `input.ts`. | Record the reason. Preserve deliberate pause and protection when focus/input is lost; avoid mistaking ordinary in-game UI interaction for interruption. |

The improvement has two parts: remove unnecessary interruption behaviour and profile the work that caused a hitch. A browser cannot draw frames while its main thread is blocked; changing the pause rule alone cannot eliminate stutter.

### Frame handling and diagnosis

- Keep the 60 Hz fixed physics step. Start with a maximum of six simulation steps per rendered frame, discard excess accumulated time, and measure discarded time explicitly. Avoid a large catch-up jump after a stall.
- Use simulated time consistently for the vehicle, traffic, crossings and clinic deadline. Discarded wall time must not drain the clinic reserve while the player cannot react. Keep cosmetic interpolation separate from gameplay time.
- Preserve inputs across an isolated foreground rendering hitch. Clear held input and require deliberate resume after real focus loss, hidden tabs or controller disconnection. Reset the frame timestamp and accumulator on resume.
- Add reason-coded pause events, raw frame p50/p95/p99/max, counts above 50/100/250/650 ms, physics and render CPU durations, and dropped simulation time. Exclude time spent deliberately paused or hidden, and identify that exclusion in the report. Use a fixed-size diagnostic buffer.
- Log effective brake demand, its source, and speed changes. This distinguishes a slow renderer, braking assistance, a collision, rough-surface resistance and a pause screen.
- Profile first encounter appearance, hill entry, village arrival, rain and clinic illumination. Investigate shader compilation, asset work, geometry changes, garbage collection and HUD updates where traces show a cost. Prepare pooled assets and initial rendering work before the drive begins.
- Adapt visual cost gradually during sustained overload. Preserve the same traffic simulation and collision rules across quality settings.

The livestock redesign retains the herder's control over admission. Use actual distance and relative motion to decide whether there is enough time to stop and cross. Progressively reduce the approach speed when assistance is needed; show brake lights and a short “Crossing ahead” cue. Release assistance once the truck's swept path is clear. Keep strong parking hold confined to the stationary clinic handover. An emergency stop can remain for a genuinely imminent conflict, with tests separating that case from ordinary approach braking.

**Gate:** reproduce and classify interruption cases, then pass foreground-hitch, focus-loss and crossing-brake tests before increasing traffic density.

## 2. Give the road a regular traffic rhythm

Cars should be present throughout the journey, with natural gaps between decisions. Their headlights, tail lights and destinations make the village feel inhabited even when the player is not overtaking.

| Road user | Behaviour | Player decision |
| --- | --- | --- |
| Compact car | Travels steadily, follows a consistent side of the road and slows for bends. | Judge closing speed; follow or make a clean pass. |
| Loaded pickup | Climbs more slowly, carries visible sacks or crates and accelerates gently after a hill. | Time the pass on the next wide, visible stretch. |
| Community minibus | Signals before a village stop, pulls into a real bay and checks before rejoining. | Pass after it clears the lane, or use a safe gap earlier. |
| Oncoming car | Appears through visible headlights; keeps its lane and yields at designated narrow-road passing places. | Finish a pass with space to spare, or stay behind the slower vehicle. |

Start with roughly **5–7 traffic encounters in the first chapter and 8–12 in later chapters**, counting existing vehicle encounters in that total. Aim for a decision about every 15–25 seconds on suitable stretches, with more open driving between difficult sections. These are tuning ranges, not spawn quotas: road capacity and visibility take precedence.

Typically show two to four nearby vehicles; initially cap all nearby collidable traffic at six, including authored buses and bridge vehicles. Count distant lights separately only when they represent a real vehicle with a safe eventual activation path. The same simulation cap applies on Low quality.

Initial cruising ranges: compact cars around 30–45 km/h, loaded pickups 22–35 km/h and buses 20–30 km/h. Bends, grade, surface, following distance and visibility reduce those targets. Use world metres per second rather than raw route-station speed, especially through the switchback.

Traffic density grows through chapters and existing road variants. Keep schedules seeded and reproducible for debugging and comparable attempts. Additional variety comes from vehicle choice, stop location and spacing. Cars must not secretly accelerate to defeat an overtake or materialize beside the truck.

## 3. Make overtaking readable and fair

Keep the existing steer, drive and brake controls. Overtaking uses those same controls. Teach the first pass with one slower pickup, a straight stretch and a short dispatch cue. Let lights and road shape carry most later information.

- Choose one traffic-side convention for the campaign and apply it consistently to lanes, bays and rejoining. Existing encounter side values describe safe space and must not randomly choose a country's driving convention.
- Author road sections as suitable for two-way travel, overtaking, a village stop or single-lane priority. Check usable physical width, grade, surface and sight distance before admitting traffic.
- Space following cars by speed-dependent stopping distance. For a potential pass, account for both vehicle lengths, speed difference, return-to-lane clearance, oncoming closing speed and a reaction margin. A fixed distance check alone is insufficient.
- Give the player an available safe decision: brake and follow, complete a visible pass, or wait at a passing place. Waiting must remain a viable way to finish the mission.
- Reserve narrow bridges and exposed sections before admitting opposing traffic. The vehicle with priority proceeds; the other waits in a physical bay. Place bays on firm, protected ground before the pinch point, with reflectors visible in headlights.
- Avoid adding a traffic squeeze during an active herd, washout, flood or falling-tree decision. Defer admissions into that section and leave space for a short queue to clear afterward.
- Never initiate a merge through the player. Signal first, check the entire swept corridor, and allow an abort or wait. Define priority and a timeout-to-yield strategy so two courteous vehicles cannot deadlock indefinitely.
- Activate actors outside the visible play area and beyond the required reaction horizon. Visibility checks must account for curves, the chase camera, headlights and both legs of a hairpin. Hidden does not automatically mean safe to spawn.

A memorable sequence: red tail lights emerge ahead of a laden pickup. You catch it on the climb, follow through the exposed bend, see a wide illuminated stretch and begin passing. Distant headlights give you a reason to judge the gap. You return with clear space, the engine settles, and the village lights appear below. If the gap is poor, following to the next bay is still a successful choice.

## 4. Collisions should matter without ending every run

Use the existing physical chassis contacts as the foundation. Damage should depend on impact severity and direction, with feedback that explains the consequence.

- A light scrape produces a scrape sound, a small jolt and modest kit damage when warranted.
- A substantial impact costs momentum and more integrity. Tail lights flare, cargo shifts, and a brief message explains the damage. Preserve steering and the opportunity to continue.
- An immobilizing crash or cliff departure uses the existing checkpoint recovery, time cost and damage rules. Recovery placement checks every active vehicle and reserves space before restoring the truck.
- Do not pause the game for a collision or add cinematic hit-stop. Cap camera shake, respect reduced-motion settings and avoid repeatedly charging damage every frame of one sustained contact.
- Account for relative contact motion so a fast approaching car is not judged solely by the player's speed loss. Prevent a scripted traffic body from continuing to push the truck after contact. Prototype this before committing to larger traffic groups; NPCs need not each run a full four-wheel simulation.

Keep the score centred on delivery time, protected equipment and responsible driving. A safe follow or yield should satisfy a clean traffic encounter just as a clean overtake does. Use stable encounter identities to prevent bonus farming by reversing and passing the same car again. Avoid a close-shave multiplier that rewards dangerous weaving.

Recalibrate deadlines around tested safe runs, including legitimate waits. Do not require overtaking every vehicle to win. A traffic/scoring revision should retain older campaign progress while keeping changed score records distinct; practice remains unscored.

## 5. Improve realism where the player feels it

Prioritize traffic motion and light before adding environmental density.

1. **Vehicles belong on the terrain.** Align bodies with the road grade, add restrained suspension movement, rotate tires from actual distance travelled, and lean subtly during a turn. Distinguish a compact car, pickup and minibus through silhouette, proportions and cargo.
2. **Lights explain intent.** Red brake lamps follow effective braking, including assistance; amber indicators precede turns and stops. Headlights appear around bends and briefly illuminate road edges. Keep exposure controlled so oncoming lamps remain readable without whitening the screen.
3. **Surfaces react.** Use pooled rain spray, dust and restrained wet-road light streaks. Tie intensity to speed and surface. Reuse shared materials and existing textures before adding new downloads.
4. **Sound reveals movement.** Blend approaching and receding engines by position and speed; soften them naturally behind the player. Limit simultaneous voices and reuse audio nodes where practical.
5. **The destination releases tension.** Traffic slows and clears the clinic entrance. Preserve the dark-to-bright restoration as the emotional payoff: light spreads through the building, people respond, and the journey's urgency resolves.

## 6. Implementation boundaries and performance budget

| Area | Planned work |
| --- | --- |
| `engine.ts`, `App.tsx`, `input.ts`, `world.ts` | Frame policy, reason-coded pauses, honest diagnostics, effective braking, render interpolation and targeted profiling fixes. |
| `traffic.ts`; new traffic director module | Persistent traffic identities, seeded admission schedules, acceleration/following/merging states, lane reservations, bounded queues and lifecycle. |
| `routes.ts`, `road-sections.ts`, `missions.ts` | Physical-distance lane sampling, visibility/width metadata, passing bays, route/branch identity and chapter tuning. |
| `encounters.ts`, `engine.ts` | Integrate authored and flowing traffic, collision ownership, recovery clearance and clean-encounter scoring. |
| `living-world.ts`, `world.ts`, `audio.ts` | Shared vehicle art, terrain alignment, light states, pooled effects, audio and distance-based detail. |
| `save.ts`, `vehicle.ts`, tests and QA driver | Revision handling, calibrated rules and completion/regression coverage. |

Normal vehicles continue toward an exit or a destination after the player passes. Recycle them only when outside both visibility and interaction range. Reversing, taking a fork and returning to a checkpoint must not duplicate vehicles or respawn one inside the truck.

Build an offset-lane arc-distance lookup for traffic. The route mapping bends station coordinates non-uniformly; lateral offsets and distances must resolve to the same physical corridor used by art and collision. Reservation checks distinguish adjacent switchback legs and alternate branches, while collision bodies still occupy their true world positions. Rejoining at a fork needs an explicit shared conflict zone.

Preallocate a small vehicle pool and reuse bodies, meshes, shared geometry and effects. Update driving and collision motion on the fixed timestep; less frequent planning may set targets, but immediate collision safety remains per-step. Use simplified distant art and bounded lighting. Do not give every traffic headlight a shadow map or add expensive reflections by default. Include adjacent hairpin legs when deciding what can collide or be seen.

The last verification recorded **11.95 MiB out of a 12 MiB total asset budget**, and **1001.6 KiB out of 1200 KiB compressed code**. There is very little asset headroom. Reuse and optimize existing assets; keep the existing limits during this upgrade. Measure any new geometry, shader and memory cost even when it adds little download size.

## 7. Delivery order and proof that it works

### Phase A — Uninterrupted driving

Capture stop reasons and raw hitches; change the foreground frame policy; refine crossing assistance; profile the current route. Update the existing test that requires long-frame auto-pause. Verify manual pause, hidden tabs, blur, input clearing, controller disconnection and graphics-context loss remain coherent.

Inject representative 100 ms, 300 ms, 700 ms and multi-second foreground delays into timing tests. Assert bounded stepping, no pause modal solely from the delay, consistent actor/deadline time and no runaway catch-up. Also inject repeated shorter delays to test sustained overload. Browser traces must still expose the actual interruption duration.

### Phase B — One excellent pass

Build one following pickup and one oncoming car on a suitable road section. Verify early braking, a safe pass, refusing a gap, contact response, a blocked bay and traffic resuming. Review the feel in the browser before multiplying actors.

### Phase C — A complete traffic journey

Add the pooled director, vehicle destinations and section reservations. Integrate all five missions, both routes and existing hazards. Test simultaneous arrivals, narrow-road priority, queue clearing, occupied recovery, branch merges and backtracking. Run full ordinary-input deliveries, including a conservative driver that follows rather than overtakes. Budget the deadline from those results.

### Phase D — Visual finish and measured release

Add body motion, readable lights, sound and surface effects within measured headroom. Check production builds as well as development. Drive the hill, rain, maximum traffic, village and clinic transition repeatedly, including first appearance and subsequent passes.

Proposed performance acceptance targets on named test devices:

- Desktop target: 60 fps, foreground p95 at or below 20 ms and p99 at or below 33 ms on a documented representative route.
- Low/mobile target: 30 fps, p95 at or below 35 ms and p99 at or below 50 ms, verified on physical phones before claiming support.
- Zero unintended pause-screen events in a full drive. Investigate every foreground frame above 100 ms; no reproducible game-caused stall above 250 ms is accepted. Report maxima and long-frame counts alongside percentiles.
- Compare equal simulated time under 30/60/144 Hz rendering and mixed frame schedules. For discarded wall time, explicitly expect bounded simulation advancement rather than identical wall-clock progress.
- No growing live-vehicle, collider, material or audio-node counts across repeated restarts. No visible traffic spawning, clipping through cars, unavoidable head-on admissions or duplicate clean rewards.
- Pass existing game regressions, new traffic/timing tests, the production build and unchanged hosting budgets. Manually check keyboard, touch and a physical controller; responsive emulation alone does not establish phone performance.

Automated delivery demonstrates reachability, not enjoyment. Include short observed sessions with new players: can they read the first car, understand a collision, choose to wait without failing, and explain why a pass felt successful? Use their actual points of confusion to tune spacing and cues before raising difficulty.

The desired result is a road that feels occupied and responsive: regular opportunities to make a satisfying driving decision, believable consequences, and a smooth journey toward the clinic's lights.
