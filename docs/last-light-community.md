# Last Light community and real-project connection

The account-first leaderboard and mid-drive continuation behavior is specified in [last-light-leaderboard-and-resume.md](last-light-leaderboard-and-resume.md). It supersedes the earlier nickname-gated publication and end-of-chapter-only resume flow described below.

The game remains playable without an account or a working backend. Accounts are encouraged on each completed chapter; the next-chapter button explicitly allows guests to continue. Failed deliveries keep Retry first and offer a smaller login action. Practice never publishes scores.

## What ships

- Campaign team section with the two supplied documentary photographs, all nine collective credits, English/French copy, full project report and contribution links. The group photograph is not used to infer which person has which name or role.
- Original photos are preserved. Their display uses restrained contrast/saturation and responsive framing. An AI editing candidate was evaluated but not used, to preserve the real people exactly.
- Game map and completed results connect to the real team and donation section in a new tab, keeping the game open. Fictional deliveries remain separate from documented outcomes and donations.
- Top five, own rank, searchable paginated full-player dialog, chapter/overall selectors and separate standard/relaxed and original/alternate boards. The road revision also separates incompatible scores. Overall adds one best result for each chapter in that bracket.
- Signed-in players can choose a public nickname and share a chapter challenge by copy, native share, WhatsApp or email. Sharing is optional and nothing is sent automatically. Invited later chapters are playable without marking earlier chapters complete.

## Progress and authentication

`journey.ts` stores validated versioned end-of-chapter checkpoints (completed result or failure with practice checkpoint), up to 12 return points retained for 30 days. These include chapter, route, mode, settings and progress. Successful normal deliveries update the URL with a return checkpoint, so a refresh restores the result rather than restarting the drive. Auth handoff refuses to navigate if durable local storage fails.

The site and standalone game use the same Firebase application and browser auth persistence. Login, signup, verification and password reset preserve a safe local return destination. Returning from the account pages clears the stale redirect. Verification emails preserve the game return route on allowlisted site origins; a different device without the local checkpoint receives a clear message and can use synced account progress.

Progress is stored under separate browser keys per account. Guest progress is merged when a player explicitly returns through a guest checkpoint or joins the leaderboard. Best scores merge monotonically. Pending run records retain ownership after claims and late network replies. Cloud requests carry their expected account ID to prevent an asynchronous account switch from writing the previous player's progress into the new account.

## Server and ranking rules

The game dynamically imports `firebase/auth` and `firebase/functions` separately from the driving engine. Callable functions are in `functions/src/last-light.ts`; pure scoring rules are in `last-light-core.ts`.

- `beginLastLightRun` issues a random, secret-bearing run ticket before the drive, bound to its chapter, route, mode and signed-in owner (if any).
- `getLastLightAccount` and `syncLastLightProgress` store private progress. Imported/legacy/offline progress never becomes a public ranking just because it was synced.
- `saveLastLightName` requires a verified account and explicit public nickname. The initial name is stable across boards.
- `submitLastLightRun` validates ownership, the ticket, full-drive metrics, score arithmetic, stars, route/time plausibility and revision. Claiming is transactional and idempotent. A run cannot move between accounts. Replays improve a best score without adding duplicate player rows.
- `getLastLightLeaderboard` returns only public player ID, nickname, rank, score and chapter count. It limits page size, supports prefix name search and maintains each player's true rank outside the top five.

These are useful submission checks, not a replay-authoritative anti-cheat system. Browser simulation results can still be manufactured by a determined attacker; do not attach cash prizes to these rankings without stronger verification.

Run tickets expire after 30 days. Rate-limit documents and run tickets have TTL policies in `firestore.indexes.json`. The four game collections deny all direct client reads/writes, including exclusion from the existing permissive catch-all rule. Public reads go through bounded callable endpoints. No email addresses are included in leaderboard responses.

Offline full deliveries retain chapter progress. A drive that never received an online ticket needs a new online full delivery to enter rankings. Transient submission failures remain pending and retry on reconnect or with the visible retry action; permanently invalid records do not block newer runs.

## Verification

- `npm run test:last-light`: existing physics, input, all-chapter drives, story, animation and rendering checks plus account handoff, storage, ownership, score and invitation tests.
- `npm run build`: production Angular app, both isolated games, hosting routes and payload budgets.
- `node scripts/test-last-light-community.mjs`: isolated demo Auth, Firestore and Functions integration tests. Requires Firebase CLI and Java 21+. Uses ports 9106, 8186, 5006, 4406 and 4506; run with those ports free. It never targets production and shuts down its emulators afterward.
- `LAST_LIGHT_EMULATOR_TEST=1 node --test functions/test/last-light.integration.test.js`: same assertions against an already running isolated emulator suite.
- For manual UI checks, run `VITE_LAST_LIGHT_EMULATORS=1 npm run dev --prefix games/last-light -- --port 5176`, with the demo emulators running, then open `/games/last-light/qa/community.html`. The fixture is source-only and absent from production. Its optional demo login expects the disposable `ui-player@last-light.test` emulator account. Team images proxy to the main Angular dev server at localhost:4200.

Browser checks covered guest result restoration, cross-tab sign-in keeping the same score/chapter, nickname registration, next-chapter transition, leaderboard paging and search, modal focus/closing, phone layout, and the campaign team section. A complete second-chapter browser drive also saved 1,716 points, advanced progress to 2/5, published the result to the demo leaderboard, and restored the same result after a reload. The driving sample recorded 60 fps with no frames over 100 ms; this is a local test, not a hardware-wide guarantee. Backend emulator checks cover unauthenticated/unverified users, duplicate and stolen run tickets, impossible scores, account changes, progress versus public scores, overall totals, pagination/search, difficulty/route isolation and database rules.

## Deployment order

This code has been implemented and checked locally. Production activation needs the new server functions, Firestore indexes/rules and static site release together. Deploy the game-specific backend and verification-email update, rules and indexes first; wait for the name-search index to be ready, then publish hosting. The normal hosting predeploy hook builds and verifies both games. Do not deploy only the frontend and expect the new online features to work.

Relevant functions: `beginLastLightRun`, `getLastLightAccount`, `saveLastLightName`, `syncLastLightProgress`, `submitLastLightRun`, `getLastLightLeaderboard`, and the updated `sendBrandedVerificationEmail`. Keep existing authentication provider settings; no new providers are required.
