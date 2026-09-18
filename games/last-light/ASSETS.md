# Last Light asset register

## Original runtime content

The truck, solar kit, clinic interiors and compounds, fallback people, minibuses, bridge, road furniture, terrain, hills, foliage and particles are authored in `src/`. The truck uses shaped body cross sections and separate steering/spin pivots. Canvas-generated material details, wind, tires, impacts, birds and the fallback generated score are original runtime content. Optional spoken radio uses the browser's installed English speech voice; voice availability varies by platform. Game assets are bundled locally.

## User-supplied journey music

The user supplied these tracks on 2026-09-18 for use in Last Light. Both MP3s are bundled unmodified (stereo, 44.1 kHz, 192 kbps). This register records their source; it does not assert a third-party license or independently establish ownership.

| Local file | Supplied filename | Duration | SHA-256 |
| --- | --- | --- | --- |
| `public/audio/morning-on-the-ridge.mp3` | `Morning_On_The_Ridge.mp3` | 167.13 s | `3926e424fe6361323af61fd15dd788c9dfcffa622bae828316ff9825fbe468a8` |
| `public/audio/light-at-the-clearing.mp3` | `Light_at_the_Clearing.mp3` | 177.92 s | `2650fc9979aa7c69d3cfa5959da8295a17bc347bab44fc885e43f10bdc416be1` |

Morning is the main drive song; Clearing follows with a four-second crossfade, then the playlist repeats. Native media streaming avoids full-track PCM buffers; both route through the existing master mix and speech ducking. The two tracks add approximately 7.91 MiB to the downloadable package, changing its limit from 12 to 21 MiB without increasing the code limit or blocking scene loading. Earlier 12 MiB statements below describe their respective historical revisions.

## Clinic compounds and animated staff

`public/models/clinic-0.glb` through `clinic-4.glb` are original modular architecture authored in `src/clinic-architecture.ts` and exported by `scripts/build-clinic-assets.ts`. Each extends the main clinic with a distinct footprint, recessed windows, receiving shelter, drainage, electrical equipment and chapter-specific wings. They are authored game geometry, not scanned buildings. The selected chapter loads its own compound; an equivalent procedural fallback remains available.

`public/models/clinic-staff.glb` is adapted from **Casual_2.gltf**, by **Quaternius**, from the [Ultimate Modular Characters / Ultimate Modular Men Pack](https://quaternius.com/packs/ultimatemodularcharacters.html), released under **CC0**. The source was obtained through the creator's linked public Google Drive distribution (file ID `1Jn7kULNmrtqP8BUUL19h8MhbdOnwPFhv`). `scripts/prepare-staff.py` retains only the civilian Idle_Neutral, Walk, Wave and Interact clips, removes unused buffers, deduplicates accessors and collapses constant animation channels. Runtime material variants provide clinic uniforms; two-bone arm targeting keeps hands on the carried kit. No combat animations are bundled.

- Source SHA-256: `55c654d09a2a5ff6e3bd6158d4a1b462f181cd6f1e12a0f5e9d959f9c3abc438`.
- Bundled GLB SHA-256: `53c9242c3ea2bd02660d43fd8a2b96c986a4e05dfe886b8ee2983f6e1c585f37`.
- Bundled size: 825,664 bytes. Source geometry is cached; each actor owns its skeleton, animation mixer and material clones.

## Terrain materials

The locally bundled 1K JPG materials and 1K HDR sky are from Poly Haven under [CC0](https://polyhaven.com/license). The upgrade replaces the previous leaf-covered road with **Gravel Road**, adds its packed ambient-occlusion/roughness/metalness map (the roughness channel is used), and uses **Cloud Layers** for sky and prefiltered environment reflections. Forest Ground 04 remains the landscape material. Source downloads are unmodified.

| Local file | Source asset / original filename | MD5 |
| --- | --- | --- |
| `public/textures/road-color.jpg` | [Gravel Road](https://polyhaven.com/a/gravel_road) / `gravel_road_diff_1k.jpg` | `d259491a6cb5ca0e96d3941758f8bb47` |
| `public/textures/road-normal.jpg` | Gravel Road / `gravel_road_nor_gl_1k.jpg` | `6be4a6d4c869c9714c0224619d587837` |
| `public/textures/road-arm.jpg` | Gravel Road / `gravel_road_arm_1k.jpg` | `a318d3934405e9b33e9808edd1e31016` |
| `public/textures/ground-color.jpg` | [Forest Ground 04](https://polyhaven.com/a/forest_ground_04) / `forest_ground_04_diff_1k.jpg` | `6ad9df4d731a238299806f739a26af83` |
| `public/textures/ground-normal.jpg` | Forest Ground 04 / `forest_ground_04_nor_gl_1k.jpg` | `a010a0802c2d9a930c6f00d3b1f196d2` |
| `public/textures/sky.hdr` | [Cloud Layers](https://polyhaven.com/a/cloud_layers), Greg Zaal / `cloud_layers_1k.hdr` | `fcff84024e4cc92692620d3c77440d52` |

The five source image textures and HDR source are retained across chapter changes. Each scene owns and disposes its texture clones and prefiltered environment render target. Source loading failures retain procedural material and sky fallbacks.

## Recorded engine

`public/audio/engine.wav` is `loop_0.wav` from [racing car engine sound loops](https://opengameart.org/content/racing-car-engine-sound-loops), by **domasx2**, released as **CC0**. The author identifies the source as a public-domain car recording and notes that the files were remade from that source. The bundled WAV is unchanged; playback normalizes amplitude, varies pitch with simulated engine speed/gearing, and filters/blends it with original surface and weather layers. A synthesized motor remains available if the optional recording cannot be loaded or decoded.

## Menu and catalog art

`public/key-art.png` and the catalog copy at `../../src/assets/games/last-light.png` were created in generation mode with the built-in image-generation tool. They are illustrative key art, not captures of the implemented renderer.

Exact generation prompt:

> Use case: stylized-concept. Create a single cinematic landscape 16:9 key art image for LAST LIGHT, a realistic 3D driving game about a local solar technician delivering solar panels and charged battery kits to rural clinics. A beautifully detailed unbranded off-white rugged pickup with dark blue framed solar panels secured in the bed occupies the right half of the frame, seen from rear three-quarter angle on a winding wet red-earth road. The road leads toward a small distant clinic on the right, with warm illuminated windows, set in lush tropical highland vegetation, layers of misty mountains and a dramatic teal-blue storm sky with late-afternoon golden sunlight on cloud edges. Premium realistic 3D game art, PBR materials, textured mud and realistic puddle highlights, specific foliage, believable scale. Compose the left 45% as quieter dark misty landscape and sky with low detail for a title overlay. Entire image must be a single coherent scene, no panels or dividers. Hopeful atmospheric adventure, grounded human scale. No text, no logos, no typography, no weapons, no sci-fi, no watermark. This is artwork for a game menu and catalog.

The earlier aspirational concept board and its separate prompt are in `../../docs/design/last-light/`. They are not downloaded by the game.

## Fonts

The stylesheet requests DM Sans and Barlow Condensed through Google Fonts, with system font fallbacks. Serif titles use Georgia. The game remains playable when the optional font request is unavailable.

## Living roads additions (revision 4)

The switchback and cliff, goat models and articulated gait, minibus light geometry, village architecture, water pumps, footpaths and corrugated roofs are original geometry authored in this repository. No new third-party asset downloads or dependencies were introduced. Village residents reuse the existing locally bundled rigged staff; road/ground surfaces reuse the existing texture sources above. Goat bells and directional traffic tones are synthesized locally with Web Audio. The complete production package remains within the existing 12 MiB limit.


## Traffic additions (revision 5)

Compact cars, loaded pickups, sacks, wheel/hub shapes, lamp meshes, light-pool gradients and tire spray are original code-generated geometry/materials in `src/traffic-art.ts`. Three vehicle templates share geometry across the fixed roster. Nearby traffic motors use two reusable, synthesized and spatially panned Web Audio voices. No additional downloaded models, textures, audio files or runtime dependencies were added. The production package is 11.95 MiB against the unchanged 12 MiB limit.
