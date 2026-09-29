# Last Light opening calls — 28 September 2026

Fictional clinician calls, disclosed as AI narration. Ndingi’s solar installation is complete; the other four clinic projects are still being prepared. The urgency concerns reliable electricity and continuity of care, not a claim about a live medical emergency.

## Ndingi

**English**

Ndingi calling. Care cannot stop when the sun goes down. This journey recalls why our solar project mattered: patients waiting, and a team needing light to keep working. Bring the charged battery safely to the courtyard. Other clinics are still waiting for reliable electricity. That work cannot wait.

**Français**

Ici Ndingi. Les soins ne peuvent pas s’arrêter au coucher du soleil. Ce voyage rappelle pourquoi notre projet solaire était essentiel : des patients attendaient, et l’équipe avait besoin de lumière pour les soigner. Apportez la batterie chargée dans la cour, en sécurité. D’autres centres attendent encore une électricité fiable. Ce travail est urgent.

## CEAC Nganga–Tsanga

**English**

Nganga Tsanga calling. Patients need eye care, whatever the weather. Reliable electricity means light for examinations and care that can continue. Our clinic is preparing for solar power. In this story, you bring the kit through the rain. Slow down on muddy bends. Help us turn waiting into care.

**Français**

Ici Nganga Tsanga. Les patients ont besoin de soins oculaires, quel que soit le temps. Une électricité fiable, c’est de la lumière pour examiner et continuer à soigner. Notre centre prépare son projet solaire. Dans cette histoire, vous apportez le matériel sous la pluie. Ralentissez dans les virages boueux. Aidons les soins à avancer.

## CEAC Nsioni

**English**

Nsioni calling. Waiting for electricity means waiting for care that should not have to wait. Our eye clinic is preparing its solar project. In this story, the team awaits your kit across the river. Check the crossing, let traffic pass, and take the ridge if needed. Bring the light safely.

**Français**

Ici Nsioni. Attendre l’électricité, c’est attendre des soins qui ne devraient pas attendre. Notre centre ophtalmologique prépare son projet solaire. Dans cette histoire, l’équipe attend votre matériel de l’autre côté de la rivière. Vérifiez le passage, laissez passer les véhicules et prenez la crête si nécessaire. Apportez la lumière en sécurité.

## CEAC Kiobo–Kwimba

**English**

Kiobo Kwimba calling. Night has fallen, but the need for care has not ended. Families need clinics they can count on after dark. Reliable electricity makes that possible. Our solar project is still ahead. Tonight, in this story, follow the reflectors and bring the battery safely. Help keep care within reach.

**Français**

Ici Kiobo Kwimba. La nuit est tombée, mais les besoins de soins demeurent. Les familles ont besoin de centres qui restent disponibles après le coucher du soleil. Une électricité fiable le permet. Notre projet solaire reste à réaliser. Ce soir, dans cette histoire, suivez les réflecteurs et apportez la batterie en sécurité. Chaque soin compte.

## Mont Sinaï

**English**

Mont Sinai calling, from Boma. This is your last delivery, but the real work continues. People are still waiting for reliable electricity. Hospital care cannot depend on daylight or luck. Bring this story’s final kit safely through the storm. Then help our real team move the solar project forward.

**Français**

Ici Mont Sinaï, à Boma. C’est votre dernière livraison, mais le travail réel continue. Des personnes attendent encore une électricité fiable. Les soins hospitaliers ne peuvent dépendre du jour ou de la chance. Dans cette histoire, apportez le dernier kit à travers l’orage, en sécurité. Puis aidez notre équipe à faire avancer le projet solaire.


## Verification and release

- `npm --prefix games/last-light test`: 265 passing tests.
- `npm --prefix functions run test:last-light`: 14 passing backend tests.
- Full `npm run build`: passed, including both game isolation checks and Hosting validation. Last Light: 449.1 KiB compressed code, 17.82 MiB total assets. Existing Angular CommonJS optimization warnings remain non-blocking.
- Chrome QA fixture decoded all 20 English/French opening and closing recordings, with nonzero audio. New openings are 18.6–20.8 seconds and each stays below the existing 150 KiB limit. French opening visually verified at 1280 × 720; the start button remains visible.
- The existing signed-in browser leaderboard was observed showing “Steady Sunbird 72” with synced records. No scores, names or progress in that live account were manually changed during verification.
- Deploy Hosting plus the updated `getLastLightAccount`, `saveLastLightName`, `syncLastLightAccountName`, `submitLastLightRun`, `setLastLightVisibility`, and `claimLastLightGuest` Functions. The account’s next refresh resolves its real name and updates existing eligible leaderboard rows without changing points, rank or visibility. Production deployment completed on 2026-09-29 UTC (28 September Pacific time). The interrupted `backfillSolutionModeration` deployment was retried successfully; it and all six updated game functions were independently confirmed `ACTIVE`. Hosting confirmed release completion. All 27 checked public files—including the site entry, game bundles, service worker and ten revised narration clips—matched the local build byte for byte.
