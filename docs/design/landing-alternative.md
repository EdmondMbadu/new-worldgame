# Alternative Global Solutions Lab landing page

Route: `/landing-alternative`. The existing `/` homepage and its component are unchanged. This experiment is lazy-loaded and marked `noindex, follow`.

The layout follows the supplied GSL Homepage reference: warm cream, forest green, serif display type, three starting paths, selectable SDGs, and a semester Lab. Navigation and calls to action use existing site destinations. SDG customization and syllabus requests open addressed email drafts; they do not send email. June 2027 is retained from the supplied design.

The hero retains the original homepage's typing/deleting effect and timing, cycling through Envision, Build, Share, Develop, and Design. The word slot reserves space for the longest word to prevent layout shifts. Screen readers receive a stable headline, and reduced-motion preferences keep the original static Envision headline, including when that preference changes during a visit.

The hero typography is scaled to 48–64 px on desktop and 38–54 px on smaller screens. The animated verb uses a muted green accent; the closing sentence is smaller, italic, and sage gray. Explicit headline lines, narrower paragraph measure, smaller buttons, and adjusted spacing balance the copy with the carousel.

The film is the existing `assets/videos/global-solutions-lab-film-v3.mp4`, with its existing poster. Its 2:39 duration is read from video metadata. The native modal supports Escape, focus restoration, and playback pause when closed.

Four AI-generated illustrative scenes form the photo carousel: a small team, an individual, an intergenerational community workshop, and a university group. These are illustrative imagery, not photographs of actual participants. Photos are saved in `src/assets/img/landing-alternative/` as JPEGs with 768 px responsive variants. The carousel has manual previous/next and direct selection, a pause control, pauses on hover and keyboard focus, and defaults to paused for reduced motion.

## Image generation

Created using the built-in imagegen tool. Each prompt below generated a separate image. Original generated PNGs are retained in the Codex generated images folder; project-consumed JPEGs are in the repository.

### small-team.jpg

Use case: photorealistic-natural. Asset type: widescreen 3:2 website hero photograph for Global Solutions Lab. Premium natural editorial photography, candid and believable, warm daylight, soft cream and forest-green surroundings, real skin texture, optimistic thoughtful people actively working on ideas for local environmental and social challenges, practical notebooks, laptop, plants, subtle world map and sticky notes in background. Eye-level medium wide composition. No text, typography, logos, watermarks, UI or graphics. Hands anatomically correct. Subject: four collaborators in their twenties and thirties: a Black woman with curly hair in a rust cardigan, a South Asian man with glasses in an olive shirt, an East Asian woman in denim, and a white man in a cream sweater. They share a spontaneous smile while considering a sketch on the table, light-filled community studio. Frame faces in upper middle, laptop and notebooks below.

### individual.jpg

Use case: photorealistic-natural. Asset type: widescreen 3:2 website hero photograph for Global Solutions Lab. Premium natural editorial photography, candid and believable, warm daylight, soft cream and forest-green surroundings, real skin texture, optimistic thoughtful people actively working on ideas for local environmental and social challenges, practical notebooks, laptop, plants, subtle world map and sticky notes in background. Eye-level medium wide composition. No text, typography, logos, watermarks, UI or graphics. Hands anatomically correct. Subject: one young Black woman with short natural curls, wearing a soft sage shirt, thoughtfully developing a community garden plan at a sunny home desk by a window. A laptop, notebook and small plant nearby. Gentle candid smile while looking down at her work. A person with an idea and a sense of possibility. Wider environmental portrait, not a headshot.

### community.jpg

Use case: photorealistic-natural. Asset type: widescreen 3:2 website hero photograph for Global Solutions Lab. Premium natural editorial photography, candid and believable, warm daylight, soft cream and forest-green surroundings, real skin texture, optimistic thoughtful people actively working on ideas for local environmental and social challenges, practical notebooks, laptop, plants, subtle world map and sticky notes in background. Eye-level medium wide composition. No text, typography, logos, watermarks, UI or graphics. Hands anatomically correct. Subject: a lively intergenerational group of seven neighbors, ages approximately 20 to 70, Black, East Asian, Latino and white adults, including an older woman with gray hair and a wheelchair user seated at the accessible table. They exchange sketches and ideas in a welcoming neighborhood library workshop, warm wood furnishings, sunlit windows, genuine attentive interaction, no posed camera smiles.

### classroom.jpg

Use case: photorealistic-natural. Asset type: widescreen 3:2 website hero photograph for Global Solutions Lab. Premium natural editorial photography, candid and believable, warm daylight, soft cream and forest-green surroundings, real skin texture, optimistic thoughtful people actively working on ideas for local environmental and social challenges, practical notebooks, laptop, plants, subtle world map and sticky notes in background. Eye-level medium wide composition. No text, typography, logos, watermarks, UI or graphics. Hands anatomically correct. Subject: three university students and their professor in her fifties working together around a round table in a bright campus design studio: a Middle Eastern woman in a neutral hijab, a Black male student, an East Asian student and a Latina professor with silver streaks in her hair. Sketches, laptop and a small cardboard model on the table. Natural warm collaborative moment.

## Verification

Production Angular compilation, desktop and phone browser review, all photo variations, video playback and Escape dismissal, in-page navigation, mobile navigation, SDG selection and inquiry link, overflow checks, and unchanged original homepage source.
