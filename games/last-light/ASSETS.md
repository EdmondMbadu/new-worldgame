# Last Light asset register

## Original runtime content

The truck, solar kit, clinic interiors, skinned people, minibuses, bridge, road furniture, terrain, hills, foliage and particles are authored in `src/`. The truck uses shaped body cross sections and separate steering/spin pivots. People use a bone hierarchy with skinned geometry and articulated elbows and knees. Canvas-generated material details, wind, tires, impacts, birds and music are original runtime content. Optional spoken radio uses the browser's installed English speech voice; voice availability varies by platform. Game assets are bundled locally.

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
