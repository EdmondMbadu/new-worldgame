**LAST LIGHT — Global Solutions Lab / Play, Game 02**

**Creative design · September 12, 2026 · Proposed game, ready to guide production**

Last Light is a cinematic 3D driving adventure about bringing solar power to clinics before their emergency reserves run out. The player takes a practical delivery truck through damaged roads, protects the solar equipment, and delivers it to a waiting team. The defining reward is physical and emotional: a clinic that was dark becomes bright, busy, and joyful in the same continuous 3D world.

This document defines the proposed experience. Its companion implementation plan describes how to build and validate it. Concept art establishes the visual ambition; it is not evidence of rendered game performance. This design pass adds documents and concept material only.

**The promise to the player.** “You can bring the light.” The game should feel immediate, tactile, suspenseful, and hopeful. Players should understand their purpose before understanding the controls. The driving must be enjoyable even before scoring, story, or rewards are added.

The premium ambition comes from coherent art direction, convincing materials, vehicle movement, carefully composed landscapes, responsive input, excellent sound, and a memorable payoff. We concentrate that craft into short, authored missions. The first production milestone is one complete mission at the intended quality; the campaign expands from that proven foundation.

**Its place in the saga.** Lost in Orbit remains Game 01. Last Light appears immediately after it as Game 02, with its own cover, realistic world, driving identity, and mission progression. The games share the idea of using resourcefulness to restore power and help someone. Last Light is a standalone story that needs no knowledge of the first game.

Catalog copy: “Drive rough roads. Deliver solar power. Watch a dark clinic come alive.” Suggested genre: “3D driving adventure.” Duration: “3–5 minutes per mission.” Proposed address: `/games/last-light/`.

**The world and plot.** The setting is a fictional tropical river-and-highland region. Clinics have long faced unreliable power. Local crews have prepared several sites for solar systems, but an approaching storm interrupts the final deliveries. Existing backup reserves are running down while patients still need care.

The player is Amani, a local solar technician who knows the region and drives the team's off-road pickup. The truck carries protected solar panels, a charged battery unit, and the required connection equipment. Site crews have already prepared safe connections and mounting rails. The battery provides immediate evening power while the panels support ongoing operation when sunlight returns. This makes the delivery, the storm, and the night missions part of one coherent story.

Three recurring roles carry the story in short exchanges: Amani is calm and resourceful; nurse Mina coordinates the receiving clinic and communicates the human stakes; dispatcher Jo relays route conditions and practical help. Residents, technicians, nurses, and drivers actively contribute. Characters and place names are working fictional choices, to be refined with the final setting and voice direction.

The campaign follows a changing storm front across five deliveries over successive days. Each powered clinic remains lit on the regional map. Later radio calls come from places the player has helped. The final view reveals a connected chain of lights across the landscape.

**The core loop.** Receive a short call → start the truck → read the road → choose a route → manage speed and equipment condition → reach the clinic → deliver the solar kit → watch power return → see the result and unlock the next clinic.

Most of each mission is active driving. A target first play lasts 3–5 minutes; the finale may extend to six. Briefings take about 8–12 seconds and can be skipped. The first input starts the driving clock after the scene, collision, and audio resources are ready. Short calm sections let players appreciate the world between hazards.

**The signature arrival, fully specified.** The dark clinic becomes visible before the player reaches it. A torch near the entrance and a person guiding the truck make the destination readable. Its windows and courtyard must visibly lack power, including in daytime missions through shadowed interiors and unlit fixtures.

The player parks within a generous unloading area, slows to a stop, and holds “Deliver solar kit” for one second. An accessibility option uses a single press. The prompt appears only when the truck is correctly positioned and the kit is usable. Completing delivery before the reserve timer reaches zero locks the successful outcome and stops the clock. A player never loses during an unavoidable celebration animation.

The following approximately 14-second sequence runs in the existing scene:

| Moment after handover | Visible action | Sound and feeling |
| --- | --- | --- |
| 0–3 seconds | Amani exits; waiting crew members release the rack and receive the panels and battery trolley. | Engine drops to idle; footsteps, straps, and a brief “We have it.” |
| 3–6 seconds | The team positions the battery at the prepared connection. A technician activates it while others move the panels toward the prepared installation. | Connector latch, switch, then a clean rising electrical hum. |
| 6–9 seconds | Interior lights activate in a readable sequence. Treatment room, corridor, and porch become bright. | The score opens into a warm musical theme; Mina exhales, “The lights are back.” |
| 9–12 seconds | Warm light reaches wet ground and faces. Staff resume work. A family embraces; someone waves thanks. | Relief, a few cheers, voices, and purposeful activity. |
| 12–14 seconds | The camera settles on the illuminated clinic with the truck nearby. Completed panel placement is established in a brief time-compressed closing view. | The sound of the functioning clinic continues under the result. |

Critical rooms use believable clean white task lighting. The porch and waiting area supply the warmer glow. The scene becomes bright through working fixtures and actual light on surfaces, rather than a full-screen exposure change. The exterior sky remains consistent. Panels never glow and do not appear to generate power at night; the battery connection is visible.

The camera moves only after driving control ends. Players can skip the cinematic to its completed, powered state. Replaying or skipping cannot award the delivery twice. Reduced motion uses a steady wide view. Subtitles carry the emotion if sound is muted.

**Driving that feels substantial and responds quickly.** Use a third-person chase camera behind and slightly above the truck, with the road and the solar rack visible. Real elevation changes, cambered turns, slopes, bridges, and wheel contact make it a genuinely 3D journey. Steering should react immediately, while suspension, body lean, and camera settling communicate vehicle weight.

Automatic gears and assisted low-speed steering keep the controls approachable. Speed-sensitive steering, forgiving recovery from a slide, and restrained anti-roll assistance support the intended feel. The camera looks ahead into turns without hiding the near road. Headlight beams, tyre noise, cargo movement, dust, and water spray respond to driving conditions.

There is one vehicle in the initial campaign, with one consistent handling model. Cosmetic differences can follow after the experience works. Fuel management, manual gear changes, inventory menus, and vehicle shopping are outside the initial design.

| Action | Keyboard | Touch | Controller |
| --- | --- | --- | --- |
| Steer | A/D or left/right | Large left-side steering control | Left stick |
| Accelerate | W or up | Right-side accelerator | Right trigger |
| Brake; reverse once stopped | S or down | Separate brake/reverse button | Left trigger |
| Deliver or recover, when prompted | E | One contextual button | South face button |
| Pause | Escape | Pause button | Menu |

Controls are remappable. Touch steering, acceleration, and braking work simultaneously. Landscape is the primary mobile presentation; portrait retains usable controls, a higher camera, and an optional rotate suggestion without blocking play.

**The pressure system.** Three essential readouts remain visible: clinic reserve time, distance along the current route, and solar-kit integrity. A compact speed readout helps judge handling. The road and clinic dominate the image. Radio subtitles sit above the controls and never cover an upcoming turn.

The central choice is how much speed to carry over difficult ground. Impacts damage the kit only above a tuned threshold, with a short immunity interval to prevent one collision counting repeatedly. Everyday suspension movement produces sound and motion without constant punishment. Readable warning states distinguish secure, stressed, and at-risk cargo. A kit above zero integrity remains usable under the game's simplified rules; at zero, the mission requires a retry.

The time remaining is a fictional gameplay reserve, not a medical prediction. A damaged truck can be recovered to the last safe road point through the contextual action. Recovery uses the existing timer and deducts a clearly stated eight seconds; it does not reset the route, integrity, or hazards. Pausing or hiding the game freezes simulation and sound together. No mission begins before loading completes.

**The obstacle vocabulary.** Begin with ruts, mud, one route fork, and changing visibility. Introduce bridge and flood set pieces after the handling has been learned.

| Obstacle | Warning and player response | Consequence and recovery |
| --- | --- | --- |
| Potholes, ruts, and washouts | Read wheel tracks and changes in road shape; choose a line or brake before impact. | Hard impacts cost kit integrity and momentum. A clean line retains speed. |
| Mud on a slope | Surface sheen, muddy tracks, wheel noise, and a short radio cue establish low grip. Use steady throttle and measured steering. | Sliding loses time. Regain traction on firmer ground; use recovery if fully stuck. |
| Narrow damaged bridge | Visible broken boards, approach markers, and a guide establish the safe lane well in advance. | Slow precision crossing offers a shorter route; the known detour trades time for easier driving. The authored crossing remains physically traversable. |
| Rising shallow flood | Depth markers and a route warning show whether the crossing is open. | Choose the marked route or uphill bypass. Closure is announced before the fork; the game never closes all routes. |
| Fallen tree or rocks | Dust, visible debris, and roadside directions reveal an obstruction. | Steer through an authored bypass. Larger clearance interactions are reserved for a later expansion. |
| Darkness, fog, and rain | Road markers, headlights, lightning without required strobing, and readable silhouettes guide the player. | Reduced visibility encourages braking. Important hazards remain visible early enough to respond. |
| A stalled vehicle near a settlement | Hazard lights and a resident directing traffic identify the passage. | Precise low-speed navigation replaces high-speed evasion. People stay outside the drivable collision corridor. |

One major challenge at a time. Minor terrain may overlap, but new hazards do not spawn inside unavoidable stopping distance. Each fork rejoins the authored route, with no dead ends. The alternate route must remain viable within the mission budget for a competent first-time driver. Random variation changes small event details only within tested safe envelopes.

**The five-mission campaign.** Each mission adds one major skill and a distinct human payoff. Countdown values are tuned after playtesting, not treated as fixed narrative facts.

| Mission | Journey and new challenge | Story development | Arrival identity |
| --- | --- | --- | --- |
| 01 — The First Light | Late-afternoon red-earth valley road; ruts and a gentle muddy bend. Approximately 3 minutes. | Amani's first delivery with Mina on the radio. Learn that careful driving can save more time than a collision. | A small clinic's dim interior becomes bright; the waiting veranda fills with relieved activity. |
| 02 — Before the Rain | Rain advances across a forest road; the first short rough route versus longer firmer route. 3–5 minutes. | Residents relay conditions; a crew member from the first clinic assists the delivery network. | Lights reflect in rainwater while people carry chairs into the dry, illuminated waiting area. |
| 03 — Across the River | River approach with the bridge as the central precision set piece and a clearly signed bypass. 4–5 minutes. | A local guide helps Amani cross. The clinic supplies information that will matter in the highlands. | Courtyard lights extend toward the river landing as the crew returns to work. |
| 04 — Night Watch | Night climb with fog, tight curves, and intermittent rain. 4–5 minutes. | Mina coordinates a maternity ward under pressure. Dialogue stays short and practical. | Bright treatment lighting returns; the porch becomes a warm gathering point for families. |
| 05 — The Last Connection | The storm reaches its peak along a highland route. Combine known challenges with one announced reroute. 5–6 minutes. | Earlier clinics relay road information and send help; the last delivery serves the regional clinic. | Several connected buildings light in sequence, followed by the campaign's chain-of-lights view. |

The powered map records real chapter completion. Past clinics appear as illuminated landmarks or short radio callbacks. This first campaign uses those connections as narrative support; a separate supply-management system is unnecessary.

**The first playable mission in detail.** A roughly 1.2-kilometre authored route uses terrain shape to hide its compact footprint. Target clean traversal is about three minutes. An initial reserve near four minutes is a tuning hypothesis, allowing a learner to brake, make a mistake, and recover.

The opening view already contains the loaded truck, a readable road, and a glimpse of the clinic across the valley. Mina says, “The connection is ready. We just need the equipment.” The player moves within seconds of pressing Start.

The first 30 seconds establish steering and braking on generous road width. The next section introduces visible ruts and cargo feedback. A quiet ridge then reveals the destination and gives the player breathing room. A signed fork offers a firmer longer route or a muddy shorter bend. Both rejoin before the settlement. The final approach becomes calmer and more precise, ending with a generous parking area, a guiding crew member, and the full light-restoration sequence.

This mission is the production quality reference: vehicle, foliage, terrain, water, weather, people, sound, interface, full failure and retry, and the finished arrival all appear in one complete experience.

**Points, lives saved, and progression.** Successful delivery unlocks the next chapter immediately. A completion award is the largest part of the score; time and intact equipment provide mastery incentives. Lives saved is a fixed, authored fictional outcome of each successful mission, credited jointly to the delivery and clinic teams. It appears in the result story rather than decreasing every second over patients' heads.

Proposed score: 1,000 completion points, up to 600 for the remaining share of the reserve, and up to 400 for kit integrity. For a successful mission, the calculation is `1000 + floor(600 × remainingSeconds / initialSeconds) + floor(400 × integrity / 100)`, with inputs clamped to their valid ranges. Unsuccessful attempts do not receive the completion award. These values are design defaults for playtesting.

One star means a successful delivery. Two stars require success with at least 70% integrity. Three stars require success with at least 90% integrity and at least 15% of the initial reserve remaining. Replay improves a chapter's best score and stars; it never increments the campaign's unique lives-saved total again. No score rewards pedestrian near-misses or reckless driving through the clinic grounds.

If time or kit integrity reaches zero before delivery completes, the game offers a fast retry with cached assets. There is no graphic death sequence or moralising failure message. “The delivery window closed. Try the route again.” Standard and Relaxed modes share the campaign; Relaxed starts with 35% more time and applies 25% less impact damage. Best results are labelled by mode. Settings offer reduced motion, subtitles, volume controls, contrast, remapping, and single-press interactions.

**Visual direction.** Aim for cinematic realism with strong readability. Use a consistent visual language: rust-red earth, deep green vegetation, cool storm-blue air, off-white vehicle paint, dark panel glass, clean clinic whites, and warm arrival light. Weathering is specific: dirt gathers in the tyre treads and lower doors, water darkens porous plaster, the road has compressed wheel tracks, and roofing has believable seams.

The truck is the primary close-up asset, with independent wheels, suspension movement, working lights, a recognisable solar rack, readable straps, and a visible driver. Clinics share a coherent architectural kit but have different silhouettes, entrances, surroundings, and celebration staging. Foreground vegetation has convincing silhouettes; distant hills supply depth and scale. Road edges, road furniture, and guide characters should direct attention naturally.

Lighting earns the visual budget. Driving scenes use layered atmosphere, believable contact shadows, directional weather light, and restrained wet highlights. Bloom is reserved for light sources; it never washes out the road. Use reflections selectively where they reinforce rain and the arrival. Motion blur and depth of field are optional cinematic treatments, not default effects during steering.

The low-quality tier retains the same truck proportions, readable road, important people, headlight guidance, and full clinic transformation. It reduces distant density, resolution, shadow cost, and decorative effects. Visual quality settings never change the gameplay terrain or obscure a hazard.

**Sound and reactivity.** Engine pitch follows load and speed; road sound follows surface and wheel contact. Gravel, mud, and shallow water sound different. Impacts have weight without excessive camera shaking. Cargo rattles before a serious damage warning. Weather surrounds the player while radio speech remains understandable through automatic mixing. Warning audio always has a visual equivalent.

Music moves through three emotional states: quiet purpose, controlled pressure, and relief. It responds to authored road sections and reserve thresholds without repeating an alarm constantly. Arrival sounds continue beneath results so the clinic feels alive after scoring. Human voices and ambient recordings require a coherent final production pass alongside the 3D art.

**What production must prove.** A new player understands the objective within ten seconds, can drive without opening a controls page, sees and hears why the truck slipped or the kit took damage, and identifies both the danger and the useful route before a fork. In silent playtests, people should still recognise the dark-to-bright transformation as the mission's success. In motion, the truck must feel heavier than its input latency.

The first milestone includes one complete replayable mission, one polished truck, one finished clinic, ruts and mud, one meaningful route choice, weather progression, voice/subtitles, the full restoration sequence, results, saving, and touch/keyboard/controller support. Campaign expansion follows once driving, visual quality, and loading performance pass their acceptance gates.

The full initial release contains five authored missions. Larger worlds, vehicle collections, additional resource systems, multiplayer, and further hazard families remain potential expansions after that release. The signature of this game stays clear: the player carries power across a difficult landscape and sees the place they reached come alive.
