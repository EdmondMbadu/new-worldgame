# Last Light — the night journey upgrade

**Status: approved design baseline.** The user subsequently authorized implementation. See [night-journey implementation and verification](night-journey-verification.md) for the delivered changes and checks. This document preserves the design rationale and proposed validation targets; its proposals are not themselves verification results.

**Direction:** every chapter takes place at night. The headlights reveal a road the player must read, the truck responds to the choices they make, and each dark clinic becomes a distinct, living destination when power returns.

## 1. What needs to change next

The game already uses real 3D rendering and vehicle physics. The next improvement should make space, light and consequences more convincing. A higher polygon count alone will not create that experience.

The current source explains several limitations:

| Finding in the implemented game | Effect on play | Next change |
| --- | --- | --- |
| Most small rocks are about 3.7 m from the road centre; many other obstacles also sit toward the edges. | Following the centre avoids much of the danger. | Author road sections whose usable line changes: a washout, a staggered obstruction, a narrow crossing. |
| The oncoming vehicle advances at 3.2 m/s for at most 28 m, then stops. | An apparently moving encounter becomes another stationary object to pass. | Give traffic approach, yielding, waiting, crossing and departure states. |
| Rockfalls settle near the side of the road. | The movement is visible, but often demands little response. | Make debris change the usable corridor, with an advance warning and a safe stopping area. |
| The bridge surface retains the same propulsion target as gravel. | A warning to slow down is not consistently reinforced by the road. | Let alignment, deck geometry and uneven approaches make excessive speed consequential. |
| Only some chapters use the strong night-lighting settings. Headlights have no shadow casting enabled. | The headlights are a supporting effect rather than the main way the player reads depth. | Design every chapter around an authored night profile and useful headlight illumination/occlusion. |
| Every clinic uses the same constructor, with a larger version for the finale. | Arrivals have little architectural surprise. | Build a modular clinic kit with five recognizably different layouts and activities. |
| Clean encounters currently mean crossing the event without increasing the impact counter. | Passing safely, bypassing, yielding and avoiding a minor brush are not distinguished as meaningful decisions. | Define what successful handling means for each encounter and each valid route. |
| The documented night QA run retained 2:10 of its initial 3:35 reserve. | That particular automated run suggests substantial timing slack. | Recalibrate deadlines after new encounters are built, using human runs as well as automation. |

These are source findings and an interpretation of the previous verification report, not a new player study. Reference files: [encounters](../../../games/last-light/src/encounters.ts), [missions and terrain](../../../games/last-light/src/missions.ts), [engine](../../../games/last-light/src/engine.ts), [lighting](../../../games/last-light/src/world.ts), [clinic geometry](../../../games/last-light/src/art.ts), [previous verification](upgrade-verification.md).

## 2. The experience and story

A storm has interrupted power across the region. Clinic teams have prepared their connections and are maintaining care using their remaining reserves and portable task lights. Amani brings the charged battery and solar kit; local staff receive and commission it.

The five deliveries form a chain of cooperation. A team helped earlier radios information about the next road. Reflective markers, a repaired sign or a guide with a torch show their contribution. By the finale, distant powered clinics make the player's progress visible in the landscape.

The repeated play rhythm becomes:

**Open road → early warning → read the situation → brake, position or choose a route → feel the consequence → regain speed → reach people waiting for you.**

Keep sustained fast stretches between demanding sections. Two or three strong encounters in an early chapter are preferable to a continuous scatter of objects. Later chapters can combine four encounters with weather and terrain, spaced so each remains understandable.

Keep the existing driving controls and contextual delivery/recovery action. The player learns to make better decisions with familiar controls. Automatic lighting is the default; a manual beam override can be optional.

### Five different nights

| Chapter | Night identity | Signature challenge | Distinct clinic and restored activity |
| --- | --- | --- | --- |
| The First Light | Clear moonlit valley; distant homes and dark tree silhouettes | A marked washout teaches braking and changing line | A compact village dispensary with a deep veranda; the examination room and reception illuminate |
| Before the Rain | Cloudy forest night that develops into heavy rain | A stranded minibus and muddy bypass offer a real tradeoff | A clinic around a sheltered courtyard; staff move supplies under cover as the corridor lights return |
| Across the River | Moon reflected in water, local river mist, wet bridge timbers | Negotiate a single-lane bridge and passing bay with another vehicle | A raised riverside building with ramps and drainage; the treatment wing and exterior walkway regain light |
| Night Watch | Quiet highland fog, reflective posts, sparse visibility between trees | A descending bend and announced fallen branch require controlled entry | A maternity clinic with a separate ward wing, curtains and a covered family waiting area; the ward returns to activity |
| The Last Connection | Deep storm night with restrained distant lightning and views of earlier clinics | A sequence of the learned skills, ending with a signed passage through a slide | A regional clinic with two connected wings, a covered receiving bay and a larger electrical room; power spreads across the compound |

All playable drives remain at night. Their distinction comes from weather, terrain, light sources, sound and architecture. Chapter titles and radio copy should be revised where necessary to match the new conditions.

## 3. Make the headlights central to play

### What the player should see

- Two convincing pools of light with a broad near field and a more focused forward reach. Ruts, road crown, wet stones and broken edges should have readable depth.
- The beams follow the truck's pitch and steering direction with limited stabilization. A compression moves the light across the road without making essential cues disappear.
- Reflective posts and signs catch the beams as the vehicle approaches. They indicate the route; a white outline or magical glow around every obstacle would weaken the scene.
- Nearby logs, vehicles and bridge posts interrupt the light. Their shadows move as the player changes position.
- Rain and mist become visible locally in the beams. Wet surfaces show restrained highlights; the road must retain texture and contrast.
- Moonlight provides terrain silhouettes and a readable horizon. The world outside the beams has depth without revealing every hazard equally.

Prototype low-beam near-road readability around 45–65 m and clear-road high-beam readability around 110–150 m. These are game-design starting ranges, not measured real headlamp specifications. Automatic mode selects a suitable beam for fog, nearby traffic and open stretches. Manual control must not become a mandatory extra task.

### Darkness must still permit a decision

For each encounter, establish where the warning becomes visible, where the safe choice can be understood, and where braking must begin. A configured spotlight range is not evidence that the player can recognize an obstacle at that distance.

Use measured stopping distance on that surface plus reaction time and a margin. As an illustrative calculation, at 70 km/h, three seconds of reaction travel is about 58 m. At an assumed 4.5 m/s² deceleration, braking adds about 42 m. Adding 15 m clearance gives approximately 115 m. Actual game braking must be measured before using those values for placement.

Where fog makes the detailed obstacle visible only much closer, advance reflectors, signs and road shape must cue a slower approach. Deadlines must allow it. Do not place a mandatory high-speed decision beyond usable sight distance.

Provide brightness calibration, enhanced route visibility, reduced camera movement and reduced lightning flashes. Important instructions also have subtitles. Quality settings may simplify effects but must preserve the geometry and cues needed to play.

### Rendering approach

Start with a tightly bounded headlight shadow pass and a limited set of nearby shadow casters. On a higher tier, evaluate two individually shadowed beams; on a lower tier, use one shared approximation with the same usable visibility. Avoid paying for full-scene moon shadows and multiple full-scene headlight shadows at once.

Three.js supports spotlight targets, cone shaping and projected light textures. Its documented `map` behavior has a shadow-related constraint, so verify the chosen beam-texture approach against the pinned r180 renderer; implement an explicit fallback if necessary. [Three.js SpotLight documentation](https://threejs.org/docs/pages/SpotLight.html)

Use emissive fixtures and baked lighting for distant windows, with a few local dynamic lights at arrival. Shadow maps require extra rendering from each shadow-casting light; point-light shadows are particularly costly. This supports concentrating dynamic shadows around the truck and handover scene. [Three.js shadow manual](https://threejs.org/manual/en/shadows.html)

## 4. Obstacles with decisions and consequences

The road should occasionally require leaving the centre, slowing down, or waiting. Each major encounter needs a credible cause, an advance cue, an intelligible safe response and a visible result.

| Encounter | What the player notices | Decision and action | Consequence |
| --- | --- | --- | --- |
| **Washed-out road edge** | Reflectors lean toward an eroded section; water crosses the surface; the usable road narrows | Brake before the break, align with the firm strip, or take a signed longer bypass | Entering too fast can drop a wheel into the rut, jolt the kit or require recovery. A clean crossing preserves momentum |
| **Single-lane bridge with traffic** | Headlights approach across the bridge; a reflector marks a passing bay | Stop in the bay and let the vehicle clear, then cross; use the ridge route when available | A predictable short wait costs time. Rushing into an occupied lane causes a real collision or forces a retreat |
| **Stranded minibus and blocked centre** | Hazard lamps, a person signaling from the verge, visible wheel trouble | Take a narrow firm passage slowly or a wider muddy bypass | The narrow line rewards positioning; the bypass rewards smooth throttle and traction management |
| **Announced tree fall or small slide** | Branch movement, cracking audio, scattering debris and an early road warning | Stop behind the safe marker while movement settles, then choose the remaining passage | Driving into an active obstruction damages or stops the truck. Correct timing produces a clear release of tension |
| **Shallow flooded section** | Depth markers, water moving across the lane, a visible raised line | Align early and maintain steady input through the shallow route, or take a slower bypass | A poor line creates drag and wheelspin. A deep or invalid section requires recovery; ordinary water contact is not instant failure |
| **Descending bend with damaged verge** | Chevrons, visible camber and a gap in the guardrail | Reduce speed before turning; use the road width and progressive steering | Excess entry speed produces an understandable outward slide. Correct braking lets the player accelerate out cleanly |

Small rocks remain as supporting terrain detail. Their placement should reinforce the intended passage instead of providing the main challenge.

For the first implementation, build the washout, minibus passage and negotiated bridge. Add the bounded falling obstruction next. The flooded section is a later content phase because it needs distinct traction, drag, geometry and recovery validation.

### Fairness and encounter behavior

Each encounter follows explicit states: **dormant → warned → decision available → committed → active → cleared/recovery → resolved**. Static encounters may omit the active movement state, but still need entry and exit conditions.

- Place cues using the actual approach speed, local surface and sightline. Test both the primary route and bypass.
- Author safe corridors and stopping areas. A path must fit the truck body and swept turning envelope, not just a centre point.
- Allow one major encounter to demand attention at a time. Keep roughly 8–12 seconds of recovery after clearing it as an initial pacing target.
- Start a falling event only while a safe response remains possible. If a fast player has already crossed the commitment boundary, defer it or let them pass. Do not manufacture a collision beneath them.
- Give bridge traffic exclusive occupancy of the narrow section and explicit release rules. Include a deadlock escape for reversed or stuck vehicles.
- Keep dynamic colliders and visible actors on the same trajectory and simulation clock. Pause, reverse and recovery cannot reset a reward or respawn an obstruction around the truck.
- Seed compatible encounter variations at mission start. Do not silently shorten the deadline or increase hazards because a player is doing well.
- Keep residents outside vehicle collision corridors in this release. People can guide, observe and help without becoming surprise targets.

## 5. Make the landscape and vehicle feel substantial

Use visible elevation changes, cut banks, retaining walls, culverts, drainage channels and foreground vegetation to establish scale. Build settlements around purposeful places: a closed market, a bridge approach, a bus shelter and a clinic gate. Reduce repeated evenly spaced scenery.

Improve the road's shape before increasing decoration. Its shoulders, raised firm strips and missing sections must agree with collision geometry. A fallen trunk needs a capsule or compound collider that resembles its shape; a spherical collision proxy is inadequate for judging a narrow passage.

Make nearby vegetation and cloth move in different rhythms. Wind should affect loose leaves, rain direction and signs before a gust reaches the truck. Keep foliage outside critical sightlines. Flowing water, a moving torch, a guide turning toward the engine, and vehicle exhaust on a cool night provide purposeful movement.

The truck needs a consistent material pass: painted metal, worn rubber, glass, road grime, damp edges and intact cargo restraints. Add contact shadows at the tires, subtle dirt accumulation and physically connected suspension details. Preserve restraint in camera shake. Improve the existing follow camera with a slightly closer composition and useful forward visibility; consider a bonnet camera only after the primary view is proven.

Sound should locate hazards before they fill the screen: a bridge's boards, water below it, a minibus idling on the right, a falling branch ahead. Use positional sound with subdued music during an encounter and a brief musical release after it clears. Give spoken radio priority over incidental effects and keep hazard messages short.

## 6. Clinics that feel like places

### Architecture and asset production

Replace the single facade template with a modular clinic kit: walls with real depth, door and window openings, roof supports, gutters, steps, ramps, veranda posts, interior partitions, electrical fittings and receiving bays. Each chapter combines the kit into a different footprint and roof silhouette.

Use restrained, place-specific detail: worn plaster near the ground, rain stains beneath gutters, a water tank, drainage, a covered bench, signage, cables and an inverter enclosure. Interiors should include a reception area, a corridor and at least one visible treatment space, with useful occlusion between them.

Prioritize one genuinely improved clinic and a small set of well-rigged staff assets. Model scale, pivots, hand positions and door clearances must be validated in the actual arrival camera. Use authored walking, carrying, receiving and connection clips with planted feet and object contact. Simply increasing the segment count of the existing primitive people will not supply the desired animation quality.

The asset deliverable includes licensed glTF/GLB files, useful UVs, PBR textures, LODs, animation clips, collision proxies, named sockets and an ownership/disposal manifest. Three.js's glTF loader supports scene and animation loading and established compression integrations. Choose and test one compression path against the pinned dependencies. [Three.js GLTFLoader documentation](https://threejs.org/docs/pages/GLTFLoader.html)

This is explicit 3D art and animation work. Generated key art can inform it but does not count as a completed gameplay model. The existing models remain an integration fallback, not the visual acceptance target for this phase.

### The arrival before power

The clinic is dark but working. A staff member's torch moves toward the truck. People sit under the veranda; a door opens; a curtain shifts. Small task lamps show that the team has been maintaining care. The main room lights, fans and normal equipment remain off.

Let the player identify the gate and receiving bay from the road. The truck's headlights sweep across the building as it turns in. A staff member signals the stopping position. The contextual handover action becomes available after a safe stop; successful handover immediately freezes the deadline.

### The 18-second payoff

| Time after handover | Visible action | Sound and emotional beat |
| --- | --- | --- |
| 0–3 s | Tailgate opens; staff reach the marked kit handholds | Engine settles to idle; a short acknowledgment |
| 3–7 s | The team carries the battery and panels to the prepared receiving point | Footsteps and restrained equipment sounds; hands remain attached to the load |
| 7–10 s | A staff member connects the battery at the dock; a status indicator changes | A switch and relay, then a short pause |
| 10–13 s | One critical room lights, followed by the corridor and porch | Fan and room ambience return; music begins to resolve |
| 13–18 s | Staff resume their tasks; a waiting family responds; warm light reaches the courtyard | Calm conversation and relief; hold the building in view before the result |

Use soft clinical room light and a warmer porch, preserving furniture and faces instead of blowing the windows out to white. Avoid repeated flicker. The player should be able to see which room came on first and what activity resumed there.

Keep the charged battery as the immediate power source, including at night. Show completed panel installation only in a clearly identified later view. The game continues to credit local staff as participants. Replays can continue after power restoration without repeating the entire sequence or awarding again.

## 7. Urgency, mastery and replay

Recalibrate the clock after the encounters are functional. Measure complete runs that include sensible braking, the longest permitted traffic wait, the safer route and one ordinary recovery. Use a fixed authored deadline for each chapter/edition/difficulty that permits those actions while making repeated mistakes costly.

As an initial tuning exercise, compare a Standard deadline around 1.25 times a competent clean-run par against the safer-route and recovery requirements. If those requirements do not fit, change the route, wait or deadline; do not pressure players into outrunning visibility. Retain a more generous Relaxed mode. The first chapter teaches the loop with more room for error.

Preserve completion, reserve, cargo and clean handling as the score components. Define clean handling by encounter: a legal bridge crossing, controlled passage, correct shallow-water route, or approved bypass without a damaging impact or recovery. Crossing an event's Z coordinate is insufficient. Resolve the result once for every valid solution; an approved bypass can earn the same handling credit.

Make three stars depend on a genuinely strong delivery under the new encounter rules, and calibrate thresholds from runs. The current 90% cargo and 15% reserve rule alone is too weak a measure of the proposed mastery. Add concise result feedback such as “Two clean crossings; lost time recovering in the washout.”

Offer two curated editions with different compatible placements and passing arrangements. Keep scores separated by rules revision, edition and difficulty. Advance the rules revision for this all-night course change; preserve previous records, clinic unlocks and story lives.

The replay hypothesis is that players want to improve a line, negotiate a crossing better and see another clinic come alive. Test that with people. Successful automated drives and more visual effects do not prove replay appeal.

## 8. Implementation responsibilities

Retain the existing React, Three.js and Rapier separation and fixed physics step.

| Work area | Deliverable |
| --- | --- |
| `missions.ts` and new route-section definitions | Multiple explicit road sections with width, shoulder, elevation, surface, safe areas and branch IDs; chapter night profile and clinic variant |
| New night-lighting module; `world.ts` | Beam setup, shadow budget, reflectors, bounded mist, exposure and lightning settings, visibility diagnostics |
| `encounters.ts` and encounter controllers | State machines, safe corridors, commitment zones, traffic occupancy, branch-aware completion and replay-safe IDs |
| `engine.ts` and `vehicle.ts` | Geometry-matched contacts, surface response, water drag where applicable, recovery poses outside hazards and measurable stopping behavior |
| `living-world.ts` and audio | Coordinated traffic, signaling staff, wind cues, positional sound and speech priority |
| Asset loader and clinic scene module | Authored models, ownership manifest, LODs, animation clips, attachment sockets and timed restoration states |
| `App.tsx` and `save.ts` | Lighting preference, readable warnings, context actions, meaningful results and rules-revision migration |
| QA and performance diagnostics | Ordinary-input solutions plus deliberately poor approaches; sightline checks; scene/load/frame-time and resource measurements |

The current road representation permits one predefined fork and progresses along world Z. Extend it to explicit sections and branch identities before adding multiple bypasses. This release can keep every road branch monotonic in Z. Genuine hairpins or a freely connected road network would require a route-distance/graph migration and are outside the first implementation. Avoid rendering road shapes that the engine cannot correctly navigate, recover onto or score.

Replace colliders under a dynamic encounter only through its explicit simulation state. Treat render chunks, relevant collision sections and actor ownership separately so a culled visual chunk cannot remove a road or hazard still needed by physics.

## 9. Delivery sequence and acceptance gates

Build **Across the River at night** first. It demonstrates headlights, water, a threatening but fair bridge, traffic negotiation and a distinctive raised clinic in one complete delivery. Target roughly 2–3 minutes of active driving initially; extend route length only if encounter spacing requires it. The remaining chapters can target approximately 2–4 minutes after playtesting.

| Phase | Concrete deliverable | Gate before expanding |
| --- | --- | --- |
| 1. Night proof | Existing river route under the new night lighting, truck light response and one washout | A player can identify the road and choose a safe line on desktop and phone layouts; light adds depth and maintains visibility |
| 2. Encounter proof | Complete single-lane traffic negotiation and a signed bypass using shared visible/collision geometry | Both solutions work; continuous fast centre-line driving cannot cleanly clear the challenge; traffic cannot deadlock |
| 3. Destination proof | One remodeled riverside clinic, rigged receiving team and the complete restoration sequence | The building has visible interior depth; carrying/connection contacts hold; darkness-to-light reads clearly in actual gameplay |
| 4. Playable comparison | One complete delivery combining the first three phases, with tuned clock and score | Players understand consequences, experience suspense, and prefer the revised drive in a small comparison playtest |
| 5. Campaign expansion | Five night profiles, five clinic compositions, curated encounters and replay editions | Each chapter has a distinct landmark and decision; all approved routes remain feasible |
| 6. Release verification | Save migration, input/device testing, optimized assets and production build | Mechanical, visual, performance and accessibility gates pass; limitations are recorded accurately |

Effort depends especially on asset sourcing and animation quality. Estimate the full calendar after the first clinic/truck asset set and lighting proof are reviewed. Do not label fallback geometry as completion of the production-art phase.

### Mechanical checks

- Retain the existing 92-test regression baseline and expand it for the new encounter and night systems.
- Complete every chapter/edition/approved branch with ordinary keyboard, touch and controller input paths at varied render schedules.
- Add intentionally bad approaches: excessive bridge-entry speed, the wrong washout line, entry before traffic clearance, and stopping in the falling-object zone. They must produce the designed consequences without unexplained instant failure.
- Check stopping distance, safe corridor clearance, visibility/commitment placement, pause, reverse, replay, stuck recovery, traffic release and duplicate awards.
- Verify that the deadline stops at accepted handover, cinematics cannot consume reserve, skipping preserves rewards, and old progress survives the rules revision.

### Visual and performance checks

Preserve the existing 1,200 KiB compressed-code and 12 MiB total-asset limits initially. The previous verified build used 964.8 KiB and 9.34 MiB, leaving limited room. Optimize or replace assets deliberately; do not silently increase the limits to accommodate the art.

Target desktop steady driving around 60 FPS with p95 frame intervals below 20 ms at 1280×720. Target around 30 FPS and p95 below 40 ms on selected physical midrange Android and iOS devices. These are proposed gates, not existing measurements of this future build.

Measure headlight shadow and mist costs independently. Check shader warmup, cold and warm loads, ten mission/retry cycles, resource growth, sustained play and context recovery. Low quality must preserve obstacle cues and handover readability. Verify both portrait and landscape touch layouts, actual physical controls and reduced-motion/flash options.

Capture matched actual gameplay views: the same bend, washout approach, vehicle passing, dark clinic and restored clinic. Inspect light leaking through geometry, shadow popping, washed-out materials, visible model LOD changes, foot sliding, detached hands and objects moving through people. A menu image is not acceptance evidence.

### Player checks

Run an initial 8–12-person formative comparison with varied experience and counterbalanced version order. Observe whether players notice cues early, choose routes intentionally, understand damage, use the brakes, recover, and voluntarily replay. Ask what felt threatening, unfair or memorable. Use those findings to tune the next pass; this sample cannot establish long-term retention.

The first release candidate should demonstrate three things clearly: **the driver must make decisions; the headlights help make them; restoring the clinic feels worth the journey.**
