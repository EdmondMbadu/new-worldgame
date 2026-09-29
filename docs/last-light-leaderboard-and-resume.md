# Last Light: account records and journey continuation

## Behavior

- **Overall** ranks the sum of each player's highest verified score at each clinic, within the chosen difficulty, route and road edition. Replaying a clinic never adds its points twice. Lower scores remain in history; higher scores improve the best.
- **This clinic** ranks one best full delivery per player. The current player's server-confirmed rank stays pinned during search/pagination, including when outside the leaders. Pending local results never receive a made-up rank.
- **My drives** is private, paginated account history with an on-device cache, including lower replays, practice and older road editions. “Best complete journey” is five legs in one journey ID, separate from the combined personal-best total.
- A signed-in Firebase UID is always the account identity. The leaderboard defaults to the account's `users/{uid}` first and last name. A chosen leaderboard nickname overrides that name without changing the account profile; **Use account name** removes the override. Only accounts without a usable profile name receive a generated alias; email is never used as a name. A signed-in unverified account saves privately until email verification. It never falls back to a second device identity.
- `nameSource` distinguishes account names, custom nicknames and generated fallbacks. Profile-name changes update public rows through `syncLastLightAccountName`, even while the game is closed, and refresh during account synchronization. The trigger reads the latest profile transactionally so delayed events cannot restore stale names. Custom nicknames, private scores and visibility preferences survive those updates. Legacy deterministic aliases adopt the account name; other existing names are preserved as custom choices.
- Eligible scores are public by default unless the player opted out. Visibility changes are acknowledged by the server; failed changes remain pending and retry. Opt-out removes board rows but retains private scores. Only the alias, public ID and ranking statistics are returned publicly.
- Score sharing copies a public link containing the board context and public player ID. It does not expose a resume URL, UID, ticket, secret or device key. Nothing is messaged or posted automatically. Hidden profiles no longer resolve a public featured score.
- The site's own profile has a separate Last Light summary and links to the game's history and continuation. Game points are not added to solution/evaluation points.

## Resume contract

The chapter map offers **Continue journey** and **Start new journey**. Starting over confirms replacement of unfinished progress and preserves all previous scores and unlocks. The next-clinic button retains the journey ID; replaying starts another playthrough.

A versioned snapshot records the last safe road point plus the current remaining reserve, kit integrity, elapsed driving time, impacts, recoveries, encounter states, traffic roster/credits and other score-relevant counters. The truck resumes stationary and paused. Time away is not charged. This is a safe-checkpoint continuation, not a saved physics frame. Traffic geometry is reconstructed from the deterministic route rather than deserialized executable/path objects.

Local checkpoints save every five seconds and on pause, blur/page hide and return to the map. Account checkpoints sync about every fifteen seconds and on explicit pauses. A browser closing abruptly may keep only the latest successful local/cloud checkpoint; UI labels distinguish local-only from confirmed cloud saves. Storage failures are visible and do not stop the driving loop.

Cloud saves compare the expected version in a transaction. Explicit continuation rotates the run secret, invalidating a stale device's ability to save or submit that run. Run completion is idempotent, creates one history record, and advances the active journey once. Continuation tickets expire after thirty days. Scores without a valid online ticket remain in private history, unranked.

## Storage and ownership

Existing protected collections are reused; no new public collection or security-rule exception is introduced:

- `lastLightPlayers/{uid}`: private bests, validated public candidates, visibility, alias, best completed journeys.
- `lastLightPlayers/{uid}/drives/{runId}`: immutable completed-at/result, eligibility and journey ID; sorted/paginated by `sortKey`.
- `lastLightPlayers/{uid}/journeys/{journeyId}`: accepted legs from one playthrough.
- `lastLightPlayers/{uid}/state/current`: version, safe snapshot, next clinic or finished/abandoned status.
- `lastLightRuns/{runId}`: owner, hashed secret, bracket, issue time, snapshot and final claim.
- `lastLightBoards/{bracket}/players/{publicId}`: public projections only.

Account requests include the expected UID and check it against the callable's authenticated UID. Guest migration proves possession of the private device key, then transfers only runs whose original owner is absent or the current UID. It removes duplicate guest board rows, preserves opt-outs and is idempotent; another account cannot reclaim the same device profile. Local history and caches are partitioned by UID. A guest archive is cleared only after being copied into its claiming account's local history.

The public score validation checks tickets, ownership, plausible time, bracket, score arithmetic and snapshot resource monotonicity. It does not replay-authoritatively verify browser physics.

## Verification and local demo

- `npm --prefix games/last-light test`: driving regression suite and account/history/checkpoint tests.
- `npm --prefix functions run test:last-light`: offline callable tests, including replay monotonicity, retries, privacy, migration, history pagination and checkpoint ownership.
- `node scripts/test-last-light-community.mjs`: isolated demo Auth/Firestore/Functions integration suite, including concurrent continuation/submission and direct-access rules. Requires Firebase CLI and Java 21+.
- For manual UI verification, run the demo emulators on auth 9106, Firestore 8186 and Functions 5006, then `node scripts/seed-last-light-demo.mjs`. This script hardcodes `demo-last-light` and loopback emulator endpoints; all players are fictional. Start Vite with `VITE_LAST_LIGHT_EMULATORS=1 npm --prefix games/last-light run dev`, and open `/games/last-light/qa/community.html`. Use **Use demo player**. QA fixtures are absent from production.
- `/games/last-light/?qa=1` in development exposes the existing ordinary-input driving pilot for pause/reload/continue checks. It does not create ranked results by bypassing game completion.

## Release

This change is local until deployed. Deploy the Last Light callables and the `syncLastLightAccountName` Firestore trigger first, retain the existing protected rules and leaderboard name-search index, then build/deploy hosting. New callables are `getLastLightDrives`, `saveLastLightHistory`, `claimLastLightGuest`, `saveLastLightJourney`, `resumeLastLightJourney` and `discardLastLightJourney`; the existing Last Light callables are updated too. Name resolution reads existing user profiles through the Admin SDK and requires no client rule changes. No production player records are modified by the automated or demo tests.
