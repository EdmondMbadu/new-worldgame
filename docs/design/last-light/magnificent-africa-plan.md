# Last Light — "Magnificent Africa" visual and feel upgrade

**Status:** approved (golden hour → dusk, everything in one pass) and implemented. See [verification](magnificent-africa-verification.md). Scope is the look of the world, the camera, and how collisions feel. Mission rules, deadlines, scoring, saves and the soundtrack are unchanged.

**Target image:** the game's own key art (`public/key-art.png`). A red laterite road cutting along a green ridge, the sun breaking through a storm front, a misty river valley falling away below, layered mountains fading into warm haze, and a clinic glowing at the end of the road. Today's game looks nothing like it.

## 1. Deep dive: why it looks and feels "robotic" today

Screenshots were captured from the current build (chapter 1, 960×540) and the source was read end to end for rendering, physics and camera.

| Finding (source) | What the player sees | Fix |
| --- | --- | --- |
| Every chapter is night; `night.ts` sets moon 0.24–0.75, exposure 1.5, fog `#122538`. | A murky blue-black frame. The only readable area is the headlight cone. No vista is possible. | Golden hour → dusk time-of-day arc per chapter (see §2). The title "Last Light" becomes literal. |
| Sky is the HDR map multiplied by 0.1 (`makeSky`), plus 200 point stars. | A flat, dark dome with no sun, no clouds, no horizon glow. | Physical sky shader: Rayleigh/Mie scattering, sun disc and halo, fbm clouds lit from behind, horizon haze that matches fog. |
| Distant mountains are 18 deformed spheres (`buildNature`). | Lumpy blobs, read as "placeholder". | Three to four layered procedural ridgelines on rings 250–700 m out, with aerial perspective (each layer bluer and lighter). |
| Fog is uniform `FogExp2`, one colour. | Depth flattens into a grey wall. | Custom fog: height falloff (mist pools in valleys) and a sun-facing colour term (warm toward the sun, cool away). |
| No post-processing; `renderer.render()` direct, ACES. | Hard, clipped highlights; no glow around the sun, windows, headlights; aliasing on grass. | Composer: render → bloom → grade (warm/cool split, vignette, grain) → AgX output → SMAA. Tiered by quality. |
| Trees: cylinder trunk + 7 crossed alpha planes of a canvas texture, 800 instances, generic temperate shape. Grass: 5-blade tufts, flat colour. | Could be anywhere; the grass reads as sparkly white bristles at night. | African biome kit: flat-topped acacias, baobabs, oil palms, banana clumps, candelabra euphorbia, tall elephant grass, red termite mounds. Foliage uses spherical normals and translucency so backlit leaves glow at sunset. |
| Terrain is one tiled photo texture tinted by three vertex colours. | Visible tiling; no difference between slope, verge and field. | Terrain shader: red earth near the road and on steep slopes, grass on flats, rock on cliffs, macro noise to break tiling. |
| Road is a beige-tinted texture strip with a hard edge. | A "ribbon" laid on the ground. | Laterite red-ochre with darker tyre tracks, crown, wet puddles that mirror the sky, and a feathered, grassy edge. Red dust plume behind the truck, backlit by the sun. |
| Camera: eye placed rigidly behind `heading` each frame, lerped at 6/s; shake is `sin(clock*24)`. | Locked-on, metronomic motion. It moves like a machine, not an operator. | Spring-damped chase camera with yaw lag, look-into-the-turn, slight bank, noise-based (not sine) road shake, impact "trauma" shake, and a cinematic drone reveal at chapter start. |
| Chassis collider is `cuboid(0.83, 0.28, 1.82)`: 0.56 m tall, 3.6 m long. The visible truck is ~1.9 m tall and 4.9 m long. | The bumper and cab visibly sink into things before anything happens. | Compound collider shaped like the truck (chassis, cab, bed, bumper). |
| Only terrain, road obstacles, encounter actors and traffic have colliders. Trees, rocks, houses, sign posts, reflector posts and bridge rails have none. | You drive straight through 800 trees, whole villages and the signs. This is the main "collision is less effective" problem. | Deterministic scenery layout shared by physics and art: trunks, boulders, houses, rails become solid; posts and signs become breakable (they topple and bounce, and slow the truck slightly). |
| Traffic cars are kinematic, restitution 0.03. | Hitting a car is hitting an immovable wall; the car does not react. | Shove response: struck cars are pushed and yaw away with decaying offset; the truck receives the reaction impulse. |
| Impact audio fires only when damage is applied; there are no particles and no rumble. | Minor contacts are silent and weightless. | Contact feedback on every hit scaled by force: thud or scrape audio, dust/debris burst at the contact point, camera trauma, cargo jolt, gamepad rumble. |

## 2. Time of day: the chapter arc

Each chapter starts in golden light and ends in dusk, when the clinic's restored lights matter most. Sun elevation is driven by route progress, not wall-clock, so a slow driver does not lose the view.

| Chapter | Start | End | Character |
| --- | --- | --- | --- |
| 1 · First Light | Low gold sun, clear | Amber sunset | Dry savanna, acacias, long shadows, red dust |
| 2 · Before the Rain | Sun under a storm shelf (the key art) | Rainy dusk | Forest, banana and palm, wet red mud, god-ray breaks |
| 3 · Across the River | Hazy gold | Violet dusk, river mist | Misty valley, reflective river |
| 4 · Night Watch | Late dusk, highland fog | Blue hour → night | The existing night mechanics carry this chapter |
| 5 · Last Connection | Storm with a burning sunset slit | Stormy night, lightning | Finale; distant clinics glow on the hills |

Headlights switch on automatically as the sun drops, so the existing beam system still matters. Night profiles remain for chapter 4 and 5 endings.

## 3. Work plan

**A. Light and atmosphere** — `sky.ts` (new): scattering sky dome with clouds, sun disc, and a `TimeOfDay` controller that sets sun direction and colour, hemisphere colours, fog colour and density, exposure and headlight state from progress. Sun shadow follows the truck. The environment map is regenerated from the sky at start and at dusk.

**B. Landscape** — replace sphere mountains with layered ridgeline rings; add a valley floor and mist sheets far below the ridge; terrain shader by slope and road distance; water shader for rivers with sky reflection.

**C. Road** — laterite palette, track darkening, wet reflective puddles, feathered edge, red dust plume.

**D. African vegetation** — `biome.ts` (new): procedural acacia, baobab, palm, banana, euphorbia, elephant grass, termite mound, all instanced; foliage lighting with spherical normals and backlit translucency; per-instance colour variation.

**E. Life in the frame** — bird flocks across the sunset, village cooking-fire smoke, fireflies at dusk.

**F. Post-processing** — `post.ts` (new): EffectComposer chain tiered by quality. Low: grade + FXAA. High: + bloom + SMAA. Adaptive resolution stays.

**G. Human camera** — spring-damper chase rig, bank into turns, noise shake, trauma on impacts, opening drone shot.

**H. Collisions** — `scenery-layout.ts` (new): one deterministic source for tree, rock, house and post placements used by both `engine.ts` (colliders) and `world.ts` (meshes). Compound truck collider. Breakable posts. Traffic shove. Force-scaled contact feedback.

**I. Verification** — the full existing suite (120 tests) must stay green, including every ordinary-input delivery on both routes of all five chapters. Add tests for the new colliders (trees block, posts break, traffic shove) and the time-of-day curve. Before/after screenshots of each chapter. Frame budget checked in the QA panel: draw calls and triangles must not grow more than about 25% on High.

## 4. Performance budget

A MacBook Air-class integrated GPU at 1280×720 should hold 60 fps on High. Vegetation stays instanced, with ridgelines merged into one draw per layer. Traffic and encounter spotlights only become real lights after the sun sets; before that their lamps are emissive. Bloom runs on a half-resolution mip chain. Low quality (touch devices) skips bloom and cuts vegetation density in half.

## 5. Risks

- Collider additions change physics. Trees sit at least `roadWidth + 5` m from the road and posts are sensors, so the autopilot deliveries should be unaffected. The drive tests will confirm.
- A time-of-day arc changes the "every chapter is night" direction set in the night-journey upgrade. That is a creative decision for the owner.
- Headless verification uses software WebGL, so real frame rates have to be confirmed on the target Mac.
