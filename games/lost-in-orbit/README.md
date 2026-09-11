# Lost in Orbit

A complete, forgiving space rescue adventure. Fly a small astronaut through a
three-dimensional asteroid field, climb and dive between cells at different heights,
dodge incoming meteor passes, carry up to two energy cells, and deposit all five
to power the ship and launch home. There is no death, fuel limit, account, or
backend. Experienced players can complete it quickly; the 3–5 minute description
is a first-play estimate, not a time limit.

## Run and build

Requires Node 22.12+ (verified with 22.20.0).

From the repository root:

```sh
npm ci
npm run setup:games
npm start
```

Open `http://localhost:4200/games`. The development launcher runs Angular and
Vite, proxying `/games/lost-in-orbit/` to the game. Both stop with Ctrl-C.
`npm run start:app` builds the game first, then runs Angular alone with the game's
static files. Plain `ng serve` also serves the most recent game build after
`npm run build:game`. Restart an already-running Angular server once after pulling
the new `angular.json` asset mapping. No second server is needed for this mode. `npm run start:game` runs the game alone
at `http://127.0.0.1:5174/games/lost-in-orbit/` (the catalog requires Angular).

```sh
npm run test:game
npm run build
npm run preview:site
```

The assembled production preview is `http://127.0.0.1:4175/games`.
`npm run build` builds the isolated game first, then Angular copies the game
as static files into `dist`. It also creates the catalog entry and verifies Hosting
assets. Firebase Hosting's predeploy hook runs this complete build automatically
for both `firebase deploy` and `firebase deploy --only hosting`, so a previous
Angular-only build cannot leave the deployment missing its catalog entry or
verification metadata. The final `Build succeeded` message confirms completion;
the existing bundle-size and CommonJS warnings are non-blocking.

## Isolation

- Angular owns the lazy `/games` catalog and its static SVG cover. Games are
  unlisted: no sidebar, desktop, or mobile navigation links; game pages request
  no search indexing. Direct URLs remain accessible (this is not authentication).
- An ordinary link opens `/games/lost-in-orbit/` as a separate document. A tiny
  lazy Angular fallback loads the exact static entry in an iframe if a client-side
  navigation reaches the route; game links leave that frame at the top level.
- This package owns React, React Three Fiber, Three.js, Vite, CSS, audio and state.
- No game imports, prefetches, canvases, or game assets are added to other routes.
- The Angular catalog entry is also copied to `dist/games/index.html`, because
  Firebase prioritizes real directories over SPA rewrites. Both `/games` and
  `/games/` work. Firebase handles the game directory's trailing slash itself.
- Leaving or hiding gameplay clears inputs and pauses simulation/audio. Browser
  history restoration requires a deliberate resume. Disposal releases graphics,
  audio nodes and event handlers; replay reuses the existing scene resources.

For another game, add a sibling package, its build/copy/verification step, and a
metadata entry in `src/app/games/games-catalog.component.ts`. Do not import a game
into Angular's shared modules or application entry.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Thrust | WASD / arrow keys | Left joystick |
| Climb / dive | Hold Q / C | Hold ↑ / ↓ |
| Brake | Hold Space | Hold Brake |
| Boost | Tap Shift (including while climbing/diving) | Tap Boost |
| Deposit | E inside the docking ring | Deposit cargo button |
| Pause / resume | Escape | Pause / Resume Rescue |

Touch is detected automatically; the title also has a manual touch toggle for
hybrid devices. Landscape offers more visibility, and portrait remains playable.
Audio starts only after a gesture. Mute and personal best are stored under
`lio.v1.*`; unavailable storage or audio does not block play.

## Incoming asteroids and 3D flight

Cells sit at five authored heights from -1m to 7m. Q/C (or touch arrows) changes
actual simulation altitude, including collision and collection distances. The
camera follows from a lower perspective; thrust banks the astronaut, and boost
widens the lens slightly unless reduced motion is enabled. The altimeter and
energy marker show the target height; docking requires an approach near 0m.

Meteor passes begin after 3 seconds and recur every 4.5–5.5 seconds. Each rock
warns for 1.5 seconds, then flies toward one predicted position. It never tracks
a dodge. Orange reticles, dashed trajectories, trails, an offscreen marker, radar,
and a sound cue communicate the threat. After two deposits, paired passes add
pressure. A close dodge recharges boost. The visible ship shield protects docking;
impacts drop at most one recoverable cell. A fixed pool of six rocks is recycled.

## Code map

- `src/config.ts`: movement tuning, arena, asteroid paths, palette and quality caps.
- `src/engine.ts`: fixed-step simulation, cell ownership, collision/drop recovery,
  docking, state transitions, timer and replay. Independent of React and Three.
- `src/input.ts`: keyboard, simultaneous touch inputs, focus and page lifecycle.
- `src/models.ts`: original procedural models, reusable materials, stars, planet,
  particles and explicit resource ownership.
- `src/Scene.tsx`: renderer, following camera, projected indicators, restrained
  effects and adaptive pixel density. Mesh positions update without React state.
- `src/App.tsx`: accessible HTML menus, HUD, tutorial, touch controls and results.
- `src/audio.ts`: soft synthesized feedback and failure-tolerant preferences.
- `tests/`: physics/input invariants and two complete rescues through normal inputs.
- `qa/`: development-only automated flight tools, excluded from production.

## Verification

The automated suite covers actual vertical flight/pickup/docking, incoming hits,
telegraphed dodges, close-call rewards, shield protection, bounded hazard pools,
paused hazards and reset, normalized input, consistent trajectories at 30/60/144
FPS, braking, boost expiry/recharge, frame stalls, boundaries, cargo limits,
idempotent deposits, safe/recoverable drops, collision immunity, boosted collision
detection, pause/history behavior, storage failure, victory and complete resets.
The flight pilot navigates the authored layout through ordinary movement inputs;
it does not teleport, alter cargo, or force a win.

For browser checks, run the game dev server and open
`http://127.0.0.1:5174/games/lost-in-orbit/?qa=1`. Start Rescue, then Run automated
rescue. The small development panel reports progress and observed FPS, and offers
keyboard/pause and simultaneous-input checks. It is absent from production even
if the query parameter is present. The touch adapter check is not a substitute
for testing physical multi-touch hardware.

Verified during implementation:

- 36 automated tests, including two complete simulated rounds.
- Two full rendered rounds and replay in the Codex desktop browser, with no
  captured game console errors. Automated flight samples were approximately
  60 FPS at 1280 × 800 on this machine.
- Keyboard movement, pause/resume and cleared inputs; joystick drag and touch
  adapter simultaneity/cancellation; portrait and landscape layout inspection.
- Production TypeScript/Vite/Angular builds and Firebase Hosting entry routes.

Physical iOS/Android multi-touch, Safari, Firefox, and mid-range mobile GPU
performance have not been verified on hardware. Rendering caps pixel density,
reduces it after sustained slow frames, and avoids postprocessing and shadow maps.
Reduced-motion preferences disable camera shake and reduce decorative motion.

Global CSS is unchanged. The complete game JS/CSS is about 312 KiB gzip,
loaded only on the game page. The Hosting verifier rejects game dependencies in
Angular and enforces a 450 KiB compressed game-asset budget.

Existing Angular size/CommonJS warnings are unrelated to this game and remain
visible; its existing build budgets have not been raised.
