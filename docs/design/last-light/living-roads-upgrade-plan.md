# Last Light: living roads and village journeys

**Status: approved design, implemented in road revision 4 on 13 September 2026.** See [implementation and verification](living-roads-verification.md) for the shipped scope and checks. This responds to the request for reactive moving obstacles, richer roads, deeper village scenery and engaging difficulty. The assessment below records the starting point before this upgrade; the preceding release is described in [night-journey verification](night-journey-verification.md).

## 1. The direction

Make the journey feel like travelling through a place where other people have destinations, work and intentions. The player reads their movement, judges the road and decides when to continue, slow down, give way or choose another route. Keep the existing driving controls and the clinic's darkness-to-light payoff.

The strongest first improvement is **a moving minibus that signals, slows, pulls into a bay and yields appropriately**, placed on a carefully composed village approach. Add a guided livestock crossing and one encounter with an approaching road user after that interaction feels good. Preserve stretches where the player can accelerate and enjoy the scenery.

The desired rhythm is:

**See a place → notice someone's intention → choose a line or pace → feel their response → regain momentum → arrive at the clinic.**

## 2. Why the present version can still feel static

The source already contains some motion, but much of it does not depend on the player:

| Current source finding | Likely effect on the experience | Proposed response |
| --- | --- | --- |
| The minibus has a fixed position. | It remains an object to drive around. | Give it a destination, signals, following/yielding rules and a real pull-in manoeuvre. |
| The tree activates within 145 m and finishes falling after 2.2 seconds. | At the configured 80 km/h target, a driver starting 145 m away needs roughly 6.5 seconds to reach its centre. The tree will usually have settled before arrival. | Treat trees as occasional announced environmental events; put sustained interaction into road users. Do not fix this by dropping a tree directly onto the truck. |
| Bridge traffic advances at a fixed 7 m/s once triggered, then parks. | Waiting is a scripted interval; the vehicle has little awareness of the player's position. | Introduce occupancy, stopping distance, commitment and a passing bay that both vehicles respect. |
| Village figures mainly sway, turn and wave beside two roadside building placements. | Movement supplies atmosphere but few visible activities or relationships. | Compose actual village stretches with paths, courtyards, work and small journeys. |
| Roads use `roadX(m,z)`, `roadY(m,z)` and sinusoidal side branches; progress is tied to world Z. | Broadly similar forward corridors constrain bends, switchbacks, village streets and route identity. | Migrate to authored 3D routes with distance along each branch and explicit junctions. |

These are source observations and design interpretations, not findings from a new player study. Relevant implementation: [encounters](../../../games/last-light/src/encounters.ts), [engine](../../../games/last-light/src/engine.ts), [missions](../../../games/last-light/src/missions.ts), [road sections](../../../games/last-light/src/road-sections.ts), [village scenes](../../../games/last-light/src/living-world.ts).

## 3. Dynamic encounters grounded in ordinary life

### A. A village minibus with a destination — build first

The player catches a minibus returning through the village. Its brake lights illuminate before a stop; its indicator announces a pull-in. At a narrow stretch, it continues slowly until a marked bay allows the delivery truck to pass. If the player has already committed to passing, the minibus stays in the bay until the truck clears.

This offers continuous small decisions: adjust following distance, read an indicator, take an available passing place and accelerate when the road opens. It can also lead the eye around a dark bend with its taillights.

Prototype two authored scenarios: following a bus into a pull-in, and meeting a bus at a single-lane pinch point. The latter has clear priority: whoever has already committed to the narrow section proceeds; the other waits outside it. Keep priority stable once assigned.

The bus must react to the player's occupied space and closing speed. It must never slide through the truck, push it indefinitely, or start pulling out because a timer expired. Normal passenger dwell can be brief; legitimate following or yielding must fit the deadline. If the player deliberately blocks the bay, the bus waits safely and the ordinary recovery/route options remain available.

### B. A small herd being guided across — build second

A herder's lantern and movement at the roadside reveal a few goats crossing between an enclosure and a path. Bells and hoof sounds give an additional cue. The herder holds animals that have not entered if the truck is too close; animals already crossing continue to the visible exit.

The player eases off, lets the crossing finish, and receives a small acknowledgement before driving on. The herd clears as a group rather than releasing an endless succession of animals. Aim for a short, readable interaction; roughly 3–6 seconds of yielding is an initial tuning target, not a fixed duration for every arrival speed.

Give this encounter enough visibility for an ordinary stop. Do not spawn an animal inside the headlight braking distance or reward close passes. Avoid graphic animal harm; a contact should produce a brief stop/recovery response without an injury spectacle. Begin with one herd and one crossing controller, rather than independent wandering agents entering the road unpredictably.

### C. A motorcycle or small delivery vehicle approaching a bend — build third

A headlamp moves along the opposite approach, briefly disappears behind a building, then reappears. A restrained horn can announce its presence at a constrained bend. Both road users keep their line and use the visible passing pocket when necessary.

The other driver has defensive behaviour: it slows for the player, yields before committing, and continues after clearance. The player judges relative movement and available space. Its timing can vary between approved scenarios, but its intentions remain understandable.

A motorcycle needs convincing rider posture, steering and lean. If suitable assets and animation cannot be produced within the budget, first reuse a compact vehicle to prove the same driving interaction; retain the motorcycle as an art milestone rather than calling a placeholder finished.

### D. Changing storm runoff — later, and less frequent

Water moves through roadside drains and across a marked ford. Debris and ripples communicate current direction; deeper water imposes more drag and modest lateral force. A depth marker and a visible raised route provide a choice before entry.

The road condition can evolve while the player approaches, but preserve a feasible crossing or clearly signed bypass once the decision is made. Never rapidly close the only exit after commitment. Keep cosmetic water motion separate from the bounded physical hazard. This is an environmental encounter for later chapters, not a mandatory wait in every delivery.

### Additional variation after the first three work

An evening repair crew can wave the truck through a temporary narrow passage, or a farm vehicle can finish turning into a courtyard. These reuse signalling and occupancy rules. Pedestrians should have sensible paths and defensive behaviour; initially keep their everyday activity outside the truck's corridor.

## 4. Fairness and encounter pacing

- Keep one primary moving conflict active at a time. Ambient movement can continue, but it must not introduce an unrelated surprise into the chosen escape line.
- Give every major encounter a visible cause, a readable intention and at least one ordinary-control solution. Waiting, following and taking an approved bypass can all earn full handling credit.
- Place warnings from measured braking performance plus reaction room, adjusted for fog and occlusion. A configured spotlight range alone does not prove a cue can be seen.
- Choose an encounter before the driver enters its decision area. Avoid repositioning or accelerating an actor to force a near miss after the player has chosen correctly.
- Start with two or three major interactions in early chapters and three or four later, alongside the road's bends and surface changes. Use approximately 15–25 seconds of uncomplicated driving after a demanding interaction as a starting point for playtests.
- Ordinary errors should usually cost momentum, a modest amount of cargo or a recoverable detour. Catastrophic outcomes should require a clearly serious mistake or repeated poor decisions.
- Calibrate deadlines against competent runs that include the longest legitimate NPC wait, the safer route and an ordinary recovery. Do not make safe yielding the reason an otherwise good run becomes impossible.
- Retain Relaxed mode and immediate full-run retry. Add clearly labelled checkpoint practice for learning a difficult section; practice runs do not compete with uninterrupted campaign records.
- Replays can select from compatible authored scenarios. Lock the scenario seed at start, keep records comparable, and prevent reversing/backtracking from triggering duplicate events or rewards.

Avoid adding fuel, hunger, manual gears, crafting or compulsory horn/headlight controls in this pass. The engagement should come from using the existing controls thoughtfully.

## 5. Roads with a physical and visual identity

Build each route as a sequence of recognisable places. Changes in width, grade, road edge and visibility should explain why the player changes speed.

| Road space | Driving decision | Visual and spatial treatment |
| --- | --- | --- |
| Village entrance | Brake for a narrowing lane and moving traffic | A gateway tree, shop verandas, drains and buildings set at different angles |
| Village bend | Follow the road around walls and fences | Courtyards behind openings, side paths, varied roof heights and a visible exit cue |
| Hillside cutting | Control entry speed and keep clear of the outer edge | A bank close on one side, a valley below the other, retaining stone, reflectors and passing pockets |
| Uneven climb | Manage throttle and align the wheels | Exposed stone, broken surfacing, drainage channels, crest markers and changing suspension pitch |
| Ridge switchback | Brake before the turn, turn deliberately, then accelerate out | A recognisable landmark, readable edge protection and a glimpse of the lower road |
| Low ford | Choose the marked shallow line or the raised route | A culvert, banks, flowing water and grounded depth cues |
| Clinic approach | Slow naturally into a receiving space | A gate, staff movement, a final view of the dark building and clear parking geometry |

Use varying widths, tapered shoulders, shallow camber, partial repairs, erosion and terrain that rises above and falls below the road. Small surface details can be shading; a rut, ledge or ditch that changes the truck's behaviour must also exist in collision geometry. Avoid steep decorative banks cutting through the drivable lane or a safe shoulder with an invisible collider.

Keep risk legible. Put a bend cue before the crest, a reflector before an exposed edge, and a usable bay before a single-lane section. Narrowing a road should make accurate driving matter without requiring pixel-perfect steering. Verify clearances against the actual truck and its swept turning path.

For the first revised route, use:

**Open valley → village street and minibus → courtyard bend → hillside climb → guided herd crossing → open ridge view → clinic gate.**

A later variant can use the approaching vehicle in place of the herd. Introduce one switchback after the route foundation is proven. Keep the complete delivery around 2–4 minutes initially.

## 6. Make the village feel inhabited

Develop a coherent fictional region consistent with the existing chapter names and landscape. Use a reference board for building methods, vegetation, drainage, vehicles and daily activity before producing more assets. Give the community functioning homes, maintained places and ordinary routines alongside storm damage.

Use depth in three layers:

- **Near the truck:** textured road edges, drain mouths, low walls, steps, fence posts, plants and convincing wheel contact.
- **Across the street or hillside:** houses with courtyards, connected footpaths, crops, workshops, people finishing tasks and occasional local vehicles.
- **Across the valley:** layered ridges, a few household lights and, where geographically appropriate, a clinic powered earlier in the campaign.

Arrange buildings into small neighbourhoods rather than isolated identical roadside props. Let the road curve around them. Reuse a modular architecture kit with varied footprints, orientation, roof treatments and material wear; avoid copying the same façade along a straight line.

Give characters short purposeful activities: carry a container along a footpath, close a stall, receive a parcel, move under shelter or guide an animal. Match walking speed to stride and keep feet on their path. During the clinic handover, inspect body direction, carrying pace and hand contact together; a correct wrist target alone does not make the animation convincing.

Retain night driving. Use window and lantern light selectively, weather moving through headlight beams, wet-road highlights, tree silhouettes and occasional sheltered areas. The clinic can be dark while a household has an independent lamp. Power restoration should still change the scene noticeably.

Sound should communicate position and intention: a bus slowing ahead, a motorcycle around a bend, goats beside the road, water beneath a crossing, crickets and conversation from a courtyard. Duck radio/music around an important cue and show an equivalent visual cue. Avoid filling every quiet moment with speech.

## 7. What could make more people want another run

1. **Readable mastery:** a short result explains whether time went into careful yielding, recovery or rough driving. Recognise clean handling and thoughtful route choices. Do not score near misses with people or animals.
2. **Small discoveries:** a shortcut with an honest tradeoff, a different view from the ridge, or a landmark that makes the next turn memorable. A detour should lead somewhere worth seeing.
3. **Community continuity:** the team helped previously radios a useful road update; villagers recognise the delivery vehicle; later routes reveal lights restored earlier. Make these brief and connected to play.
4. **Personal improvement:** show reserve/cargo differences from a comparable personal best. Optional split-time feedback can encourage a better run without putting a confusing ghost vehicle among real night traffic.
5. **Low-friction replay:** quick restart, checkpoint practice, saved visibility preferences, large touch targets and optional reduced motion. Keep the first successful delivery achievable before demanding mastery.
6. **A satisfying arrival:** improve grounded movement, unloading weight, spatial sound and the clinic's return to activity. Preserve time to look at the result before the scoreboard takes over.

These are engagement hypotheses. Automated successful runs and more assets cannot establish broad appeal; observe people choosing to replay and ask what they noticed, enjoyed or found unfair.

## 8. Implementation architecture

### Reactive actors and traffic

Extract encounter behaviour from the large engine update into small controllers. Keep encounter identity, rewards and persistence separate from movement state.

A road user should track its route, speed, target, stopping distance, nearby occupied space and intention. A practical state sequence is **cruise → signal → approach → yield/commit → pass → clear**, with a safe blocked state. Feed the same simulation state to its body, lamps, wheel/rider animation and audio.

Use explicit corridor reservations for narrow roads. Establish priority before entry and retain it through commitment. Account for the player's truck length and a clearance margin before releasing a bay. Distinguish a normal short dwell, a driver deliberately blocking the lane and a genuine AI deadlock; do not solve all three by expiring a timer and driving forward.

Rapier's kinematic bodies follow their commanded motion and require explicit obstacle handling. The design therefore needs scene queries/occupancy and braking decisions; changing a kinematic body's position along a prettier path is insufficient. Verify APIs against the repository's pinned version when implementing. [Rapier rigid-body documentation](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/)

Keep simulation at the existing fixed step. Perception and high-level decisions can run less frequently, while motion and collision remain continuous. Start with a small bounded number of active actors; full village-wide traffic simulation is unnecessary for the first route.

### Route foundation

Introduce a route graph whose edges are authored 3D curves. Track **edge ID and distance along the edge**, with explicit junctions and merge points. A sampling interface returns position, forward/right/up directions, width, surface, shoulder and speed/readability cues.

Three.js has 3D Catmull–Rom curves that can supply a path representation. Constant travel speed still needs distance-based sampling, and safe road widths, intersections and terrain connections must be designed separately. This is a proposed application of the curve API, not automatic road generation. [Three.js curve documentation](https://threejs.org/docs/pages/CatmullRomCurve3.html)

Migrate all dependent systems together: progress, remaining distance, minimap, arrival tests, trigger zones, AI paths, clean-pass scoring and recovery. Keep an adapter for the old forward routes while validating the new representation. Use previous branch/segment and travel direction when projecting the truck onto a route; globally choosing the nearest curve can jump progress across neighbouring switchback legs.

Generate the visible road and collision surface from the same samples. Separate road/bridge surfaces from surrounding terrain where necessary; one terrain height per world X/Z cannot represent a bridge with ground below it. Do not introduce stacked junctions in the first route. Obtain surface response from actual wheel contact/road identity, with a terrain fallback off the road.

Recovery places the truck on a known safe part of the current route with the correct orientation, outside actor reservations and active hazards. A camera or scenery chunk becoming invisible must not remove collision still needed by a vehicle.

### Art, rendering and budget

The previous verified build is already at 11.94 MiB against a 12 MiB asset cap. Make room before adding a herd, motorcycle or additional buildings. Consolidate duplicated clinic/building parts into a reusable kit, share materials, evaluate mesh/texture compression and measure decoding cost. Keep asset ownership and source licenses documented.

Concentrate new detail at road decisions and destinations. Batch repeated props, instance foliage/building parts, simplify distant actors and limit dynamic shadow casters. Keep the existing 1,200 KiB compressed-code and 12 MiB total-asset gates initially; record measured costs for each new asset/effect.

## 9. Delivery sequence and evidence gates

| Stage | Deliverable | Evidence required before expanding |
| --- | --- | --- |
| 1. Reactive driving proof | A moving/yielding minibus on an existing road | Follow, wait, pass, reverse and blocked-bay cases work; the actor responds without pushing or teleporting; a new player understands its signal |
| 2. Road proof | Route-distance foundation and one village bend, grade change and switchback | Rendering/contact agree; progress, minimap, steering, branches, arrival and recovery remain correct in both directions |
| 3. Complete village delivery | A 2–4 minute route, improved scenery, herd crossing, spatial cues and richer arrival | A competent ordinary-input run can make all safe choices before the deadline; human playtests find the route understandable and enjoyable |
| 4. Controlled variety | Approaching vehicle and compatible scenario variants | Variation changes the decision without impossible combinations or last-second spawns; comparable scores remain meaningful |
| 5. Campaign expansion | Distinct geography and encounter mixes across five chapters | Every approved route/edition remains feasible; unlocks and older records survive the new rules revision |

Carry forward the **101-test baseline**, adding meaningful cases for NPC braking/priority, occupied passing pockets, crossing clearance, collision/animation agreement, reversed travel, switchback projection, route recovery, pause/resume, contact during actor removal, and duplicate rewards. Use ordinary-input good approaches and deliberately poor approaches; both must produce their intended outcomes.

Test cold/warm loading, repeated mission changes, resource growth, visibility in each night profile and physical mobile/controller inputs. Preserve the previous desktop target around 60 FPS and measure physical midrange phone performance separately. Include the busiest actor/lighting moment, not only empty road.

Run a small formative comparison with varied driving-game experience before expanding the route across the campaign. Observe cue recognition, unnecessary stops, collisions, confusion at forks, completion and voluntary replay. Treat an initial 8–12-person group as qualitative direction rather than proof of retention. Adjust traffic timing, visibility, road width and deadlines from those observations.

The recommended first milestone is a village delivery where a player can say: **“I understood what was happening, my driving changed it, and I want to try that road again.”**
