# Last Light asset register

## Original runtime content

The truck, solar kit, clinic, people, bridge, road furniture, terrain, hills, foliage and particles are generated from original code in `src/`. Canvas-generated material details and the synthesized motor, wind, impact and music are original runtime content. Optional spoken radio uses the browser's installed English speech voice; voice availability varies by platform. No recorded music, paid model packs or remote game assets are required at runtime.

## Terrain materials

These four locally bundled 1K JPGs are from Poly Haven, distributed under [CC0](https://polyhaven.com/license). Source assets: [Brown Mud Leaves 01](https://polyhaven.com/a/brown_mud_leaves_01) and [Forest Ground 04](https://polyhaven.com/a/forest_ground_04). Only the diffuse and OpenGL normal maps are used. Original files are unchanged.

| Local file | Original filename | MD5 |
| --- | --- | --- |
| `public/textures/road-color.jpg` | `brown_mud_leaves_01_diff_1k.jpg` | `5340848384f9bb19bfa6e7ac459683d7` |
| `public/textures/road-normal.jpg` | `brown_mud_leaves_01_nor_gl_1k.jpg` | `3698df51ef8262ddf2248ffca1e73196` |
| `public/textures/ground-color.jpg` | `forest_ground_04_diff_1k.jpg` | `6ad9df4d731a238299806f739a26af83` |
| `public/textures/ground-normal.jpg` | `forest_ground_04_nor_gl_1k.jpg` | `a010a0802c2d9a930c6f00d3b1f196d2` |

Source download pattern: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<asset>/<original-filename>`.

## Menu and catalog art

`public/key-art.png` and the catalog copy at `../../src/assets/games/last-light.png` were created in generation mode with the built-in image-generation tool. They are illustrative key art, not captures of the implemented renderer.

Exact generation prompt:

> Use case: stylized-concept. Create a single cinematic landscape 16:9 key art image for LAST LIGHT, a realistic 3D driving game about a local solar technician delivering solar panels and charged battery kits to rural clinics. A beautifully detailed unbranded off-white rugged pickup with dark blue framed solar panels secured in the bed occupies the right half of the frame, seen from rear three-quarter angle on a winding wet red-earth road. The road leads toward a small distant clinic on the right, with warm illuminated windows, set in lush tropical highland vegetation, layers of misty mountains and a dramatic teal-blue storm sky with late-afternoon golden sunlight on cloud edges. Premium realistic 3D game art, PBR materials, textured mud and realistic puddle highlights, specific foliage, believable scale. Compose the left 45% as quieter dark misty landscape and sky with low detail for a title overlay. Entire image must be a single coherent scene, no panels or dividers. Hopeful atmospheric adventure, grounded human scale. No text, no logos, no typography, no weapons, no sci-fi, no watermark. This is artwork for a game menu and catalog.

The earlier aspirational concept board and its separate prompt are in `../../docs/design/last-light/`. They are not downloaded by the game.

## Fonts

The stylesheet requests DM Sans and Barlow Condensed through Google Fonts, with system font fallbacks. Serif titles use Georgia. The game remains playable when the optional font request is unavailable.
