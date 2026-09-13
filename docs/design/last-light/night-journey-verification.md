# Last Light: night journey implementation and verification

Implemented locally on 12 September 2026, following the [approved night-journey design](night-journey-upgrade-plan.md). The production build includes Angular, Lost in Orbit and Last Light. This work does not deploy the site.

## What changed

- **Steering:** corrected the physics sign at the input-to-vehicle boundary. The vehicle travels along +Z, so the driver's right is −X. Keyboard, touch and controller adapters retain their consistent input conventions; front-wheel and headlight steering follow the corrected simulation. Route signs and the minimap now use the same viewpoint.
- **Five nights:** moonlit valley, forest rain, river mist, highland fog and storm profiles. Automatic beams change with speed/weather, one headlight casts a bounded shadow, and terrain silhouettes remain readable. Brightness, enhanced night visibility and reduced-lightning preferences are saved. Tire spray uses a soft particle texture instead of bright square streaks.
- **Consequential roads:** a depressed washout with a marked firm strip; a minibus blocking the centre; occupied single-lane bridges with a stop line, moving traffic and a clearing bay; announced falling trees; and floodwater with different shallow/deep traction and propulsion. Bypasses share their geometry with rendering, collision and route scoring. Signs and reflectors announce the choices before the obstacle. Incidental roughness stays outside the authored warning/exit corridors.
- **Reliable impacts:** fast CCD collisions can report contact before the measured speed loss, without producing a contact-force event. Damage now recognizes that short contact window as well as force events. A collision regression exposed and verified this correction.
- **Distinct clinics:** five locally bundled, original GLB compound extensions add different footprints, wings, receiving shelters, recessed windows, ramps, drainage and electrical equipment. Their terrain is level beneath the buildings. CC0 Quaternius rigged staff use civilian animation clips, uniform variants and hand targets during carrying. The tailgate opens, the kit is handed over, and rooms and exterior lights return in sequence. The charged battery supplies immediate nighttime power; panels appear installed in the later completed-clinic view. See the [asset register](../../../games/last-light/ASSETS.md) for licenses and preparation scripts.
- **Progression:** revised fixed deadlines are 160, 180, 190, 185 and 215 seconds in Standard mode. Relaxed retains 35% additional time. Clean passes require the applicable line, speed and traffic rules, without damage or recovery; bonuses resolve once. Three stars require at least 90% cargo, 12% reserve and 75% clean encounters. Revision 3 records are separate from retained revision 2/legacy scores, clinic unlocks and story lives.

## Automated verification

`npm run test:games` passes **101 tests**: 36 for Lost in Orbit and 65 for Last Light.

The 20 faster campaign checks cover five chapters × two editions × main/bypass routes. Each completes through ordinary driving inputs, reaches over 60 km/h on open road, earns every clean-pass bonus, retains at least 90% cargo, and reaches handover before the deadline. Another ten delivery checks cover both routes at the ordinary pace. The test driver reads the road, brakes, steers and uses the normal handover action; it cannot teleport or manufacture success.

New regression cases verify both steering directions, damaging fast washout/tree/occupied-bridge approaches, a damage-free marked washout crossing, bridge clearance while waiting, greater loss of progress in deep floodwater, and preservation of revision 2 records. Existing input-adapter, varied frame-schedule, pause, recovery, frozen-clock, scoring and storage checks remain passing. The collision fixture positions and settles a truck before applying a measured collision velocity; it is distinct from the ordinary-input campaign checks.

The final ordinary-pace runs retained approximately **32–62 seconds** of reserve, depending on chapter and route. These establish mechanical feasibility, not a human difficulty or retention study.

## Build and asset checks

The full `npm run build` passes, including TypeScript, Angular, both game builds, entry verification, bundle isolation and hosting budgets. Last Light uses **996.7 KiB compressed code** against the 1,200 KiB limit and **11.94 MiB total assets** against the 12 MiB limit. Existing Angular dependency warnings and Vite's large physics-chunk warning remain non-blocking.

The six GLB files have valid headers, buffer/accessor ranges and animation input/output counts. Only the chosen chapter's compound loads on entry; shared staff geometry and source assets are cached, while scene-owned materials, mixers and skeletons are disposed. `git diff --check` passes.

## Browser verification and limits

Actual local browser checks cover night driving, the washout markers, bridge traffic, clinic arrival/restoration/replay, animated staff, settings toggles, and portrait/landscape touch layouts (390×844 and 844×390). Desktop diagnostics were also checked at 1280×720. The river scene sustained approximately 60 FPS with p95 frame intervals around 17–18 ms during the observed drive and handover. The forest scene compiled its water material without browser shader errors. Temporary viewport overrides and visibility preferences were restored after checking.

The final forest browser run completed with **100% cargo, 4/4 clean passes, 52 seconds remaining and 1,715 points**. Its handover replay ran around 60 FPS with p95 near 17.5 ms and no game errors in the browser log. The production catalog launched Last Light from its second compact card, and the first night scene loaded without the development QA controls. The catalog emitted an existing translation-option deprecation warning; it did not prevent launch.

These are measurements on the available desktop browser. Physical iOS/Android performance, physical controller behavior and sustained multi-device resource profiling have not been established. Automated clean routes do not establish that new players understand every cue or choose to replay. The source plan's proposed player comparison remains a separate validation activity. Models and animation improve the shipped game but do not constitute photorealistic or AAA production art; close-up animation and art direction can still be refined through player review.
