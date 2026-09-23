# Last Light — "Magnificent Africa" verification

Implements [the plan](magnificent-africa-plan.md): golden hour → dusk, delivered in one pass.

## What changed

**Light.** Each chapter has its own look (`LOOKS` in `src/night.ts`). The sun's elevation follows route progress, starting between 15° and 3.5° and ending between −4° and −13°. `src/atmosphere.ts` drives the sun, hemisphere, exposure, fog and the image-based lighting. The environment map is re-baked from the live sky whenever the sun moves 2.2°. The sky is a single shader with a warm horizon, sun disc and halo, moving clouds that leave a window around the sun, and stars at dusk. Every built-in material gets height fog with sun-tinted aerial perspective. The one exception is the valley water (see Known limits). Headlights, traffic lamps and the HUD beam label respond to darkness. The HUD reads DAYLIGHT until the light fades.

**Landscape.** `macroRelief` in `src/missions.ts` affects only ground more than 45 m from the road. Along the route, a valley falls away on one side while forested hills rise on the other. The terrain is wider (±330 m). Around it are three ridgeline rings, snow-tipped from chapter 3 on. Lakes form wherever the ground dips below the chapter's water level, and mist decks show in the valleys. Terrain is coloured by road distance, slope and value noise: laterite shoulders, dry or green grass, and rock on the cliffs. The photo textures now supply luminance detail only. The road is laterite with packed tyre tracks and a raised crown. Wet sections have puddles that mirror the sky. The broken `road-arm.jpg` roughness map is no longer used: its roughness channel is about 0, which made the road glossy.

**Vegetation and life.** `src/biome.ts` adds procedural acacia, baobab, oil palm, banana, candelabra euphorbia and broadleaf trees. It also adds forested hill canopies, elephant grass, termite mounds and granite kopjes. Each species is instanced and split into 180 m route chunks, so both camera and shadow culling work. Foliage has wind and backlit translucency. `src/landscape.ts` adds birds, fireflies at dusk and cooking-fire smoke in the villages. Village homes now use ochre, whitewash and blue trim.

**Post-processing.** `src/post.ts` runs the High path: MSAA HDR render → sun shafts → bloom → grade (split tone, vignette, grain, impact aberration) → ACES output. Low skips shafts and bloom and adds FXAA.

**Camera.** `src/camera-rig.ts` adds critically damped yaw lag, a slight bank into turns, noise-based road shake and trauma shake on contacts. Before the first input it plays a crane shot from high over the valley down to a low rear three-quarter view. Reduced motion turns off shake, bank and the crane shot.

**Collisions.** `src/scenery-layout.ts` is the one deterministic placement source, shared by art and physics. Trunks, boulders, termite mounds, homes, wells and bridge rails form a single static trimesh collider. Posts and signs are swept geometrically: they tumble away, cost the truck a little speed, and never cause damage. The truck has four massless outline shells for the nose, tail, cab and bed, and these skip terrain collisions. A struck car is shoved and spun, then recovers its lane. Every contact now triggers camera trauma, a dust burst, controller rumble and a force-scaled thud. The thud plays when road sounds are on, as all effects already did.

## Checks run

| Check | Result |
| --- | --- |
| `npm test` (games/last-light) | 125/125 pass: the 120 existing tests, including every ordinary-input and faster-pace delivery on both routes of all five chapters, plus 5 new ones |
| New tests (`tests/magnificent.test.ts`) | sun sets monotonically and each chapter ends dark; routes stay clear of trunks and homes; a trunk stops the truck; a post is knocked flying without damage; a struck car is shoved and recovers |
| `npm run build` (tsc + vite) | passes; 1,045 KiB code gzip (budget 1,200), 22.5 MiB total (budget 24) |
| QA strings in production JS | none; the debug handle `window.__lastLight` is dev-only |
| Physics cost (600 steps, chapter 1, Node) | 1.07 s before → 1.37 s after (≈1.8 → 2.3 ms per step) |
| Screenshots | chapters 1–5 at several stations, restoration scene, Low quality; headless Chromium with SwiftShader at 960×540 |

## Known limits

- **Scene weight.** On High, the headless renderer counts about 1.2–2.2 M triangles (shadow passes included) and 460–630 draw calls. Before, it was about 0.6 M and 260. This is well over the plan's +25% target. Low is about 1.2 M. Real frame rates were not measured: the only renderer available here was software WebGL. Check the QA panel (`?qa=1`) on the target Mac. If p95 is above 16 ms, the first levers are grass density, the hill-canopy count and MSAA samples.
- **Valley water fog.** Under SwiftShader, the valley water plane blanked the frame when it used the atmospheric fog shader. No GL error or program failure was reported. It now uses plain exponential fog. Whether the same fault occurs on a real GPU is unverified.
- **Unchanged art.** The truck, staff and clinic GLBs are unchanged. The truck is still the procedural model, now with red dust on its lower body.
