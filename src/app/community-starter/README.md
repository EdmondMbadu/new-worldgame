# Community solution starter

Public, lazy-loaded route: `/start-a-solution`. The existing `/solution-a-thon`,
creation forms, question schema, route guards, and playground components are
unchanged. No Functions deployment or new API credentials are needed.

## Mapping heuristic

Use explicit semantic slots instead of an LLM or keyword extraction. The question
being answered determines the destination; the words inside the answer do not.
The guide asks a short sequence of core prompts and offers optional deeper prompts.
Every one of the 25 core playground questions has a slot, but none is mandatory
except the initial problem. Skipping is legitimate and never fills an answer.

| Guided slot | Playground destination |
| --- | --- |
| problem + context | S1-A: problem, importance, people/place |
| symptoms | S1-B: observations, barriers, possible causes |
| scope | S1-C: scale and sources; no inferred global figures |
| inaction | S1-D: consequences of inaction |
| future | S2-A: preferred state |
| measure | S2-B: measures of success |
| approach | S3-A: alternatives, selected approach, rationale |
| requirements | S3-B: technology, programs, policies |
| resources | S3-C: people, resources, community support |
| business | S3-D: possible business model |
| circular | S3-E: circular, regenerative, equitable design |
| pilotCost | S4-A: test costs |
| scaleCost | S4-B: costs at scale |
| funding | S4-C: resource/funding sources |
| delivery | S4-D: people, partners, test location |
| timeline | S4-E: 6–12 month action plan |
| operation | S4-F: implemented experience |
| localImpact | S4-G: expected local effects |
| globalImpact | S4-H: wider scenario effects |
| goalLink | S4-I: causal link to preferred state |
| environment | S4-J: environmental effects |
| fundingFit | S4-K: funding fit and rationale |
| equity | S4-L: equity and inclusion |
| tenThousand | S4-M: hypothetical $10,000 allocation |
| firstAction | S4-N: action possible with available resources |

Do not duplicate an immediate action into a 6–12 month plan, a pilot budget into
scale costs, a possible funder into a confirmed commitment, or a preferred outcome
into evidence of achieved impact. Whitespace and explicit unknowns (`TBD`, `I don't
know`, etc.) remain local notes but are omitted from exported answers. Other author
statements are not fact-checked automatically. Guidance explicitly separates
observations, hypotheses, estimates, and unconfirmed partners.

Counts say "starting notes", not "complete". A note may answer only part of a
multi-part legacy question. The original playground retains its existing answer
count behavior; the starter never writes completion flags, S5/Strategy Review,
finished/publication fields, or generated research. Each populated key carries
field-level provenance in `starterOrigin.evidence`; `unansweredKeys` records gaps.

## Performance and draft recovery

The guide is deterministic and local. Sofia is labeled "Your guide", not a live AI
conversation. No generated answers, typing delays, server requests, rich-text
editors, or AI processing are required to move between prompts. Existing AI research
tools remain available in the full workspace after saving.

The standalone route avoids loading the public-page module. Firestore workspace
creation is dynamically imported only when saving. Draft writes are debounced
180 ms, then flushed on navigation, pagehide, and authentication. Local storage
falls back to session storage and then an explicitly labeled memory-only draft.
Download works without an account. Storage events pause writes when another tab
changes the draft, until the visitor chooses a version. The current question,
step, notes, and skipped prompts survive a refresh.

## Create-only handoff

1. Save is always an explicit action. Sign-in alone does not create a solution.
2. Google and existing-account login return to `/start-a-solution?save=1`,
   reopen the save dialog, and require confirmation to save/open the workspace.
   Email registration stays inside the dialog using the existing registration
   service. Credentials are never written to draft storage.
3. The owner must have a verified profile. Email users open the verification
   message and return to this tab to check verification, preserving the draft
   even when the verification link opens a different tab or origin.
4. Read an owner-scoped marker at `users/<uid>/communityStarterHandoffs/<draft UUID>`
   in a transaction. If absent, allocate a fresh solution ID and atomically create
   the solution and marker. This avoids reading an absent private solution, which
   existing rules correctly deny. A retry validates the saved target and returns
   it without writing anything. A mismatching owner or draft is rejected.
5. Create a private solution, its mapped rich-text `status`, provenance, and owner
   participant atomically. Include `teamMemberEmails` and `solutionAdminEmails`
   immediately so existing private-read rules work before feed metadata triggers run. Escape all author text before constructing HTML. No
   meeting links, invitations, evaluator assignment, publication, or emails are
   triggered by the starter service.
6. Return to the corresponding existing playground step (zero-based `step=0..3`).
   The starter becomes a read-only snapshot; further editing happens there.
7. A 15-second UI deadline allows a safe retry. The transaction may commit after
   the deadline; the atomic handoff marker makes that retry recover rather than duplicate.

## Checks

`CI=1 npm run test:community-starter` runs mapping, sanitization, persistence,
skip/back navigation, storage failure/conflict, auth return, and create-only
handoff tests. `CI=1` disables the repository's native Angular cache if its local
LMDB database is unavailable. Use a normal Angular production build as well.

Manual: enter a problem as a guest; add/skip/edit notes across all four stages;
refresh; download; open and cancel saving; sign in; explicitly save; verify the
private workspace's mapped answers; retry saving; check the original playground
and hosted-event page still work. Test at desktop and mobile widths.

`node scripts/test-community-starter-rules.mjs` also verifies an atomic handoff
and immediate owner-only private reads against the unchanged Firestore rules in
a disposable local emulator. No production data is used.
