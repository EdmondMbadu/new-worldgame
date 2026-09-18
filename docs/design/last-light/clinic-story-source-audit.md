# Clinic story source audit

Checked 2026-09-18 against the local campaign page, its Angular data/template, the current Last Light implementation, and the eleven supplied form images. This is a planning artifact, not a change to campaign claims or gameplay.

## Selected five: the campaign page's first five

The user's explicit selection rule is the first five clinics on the campaign page. These are not the five named clinics in the attached forms. Unless the user changes that selection, use this order:

| Chapter | Campaign clinic ID and exact name | Verified detail available here | Missing information |
| --- | --- | --- | --- |
| 01 | `ndingi` — Ndingi Clinic | Ndingi, Tshela Territory, Kongo Central. Solar already installed; 2.0 kW system. Maternity, laboratory, inpatient rooms, consultation, operating room. | Catchment population, approved clinician testimony/identity, measured patient outcomes. |
| 02 | `nganga-tsanga` — Centre de santé ophtalmologique CEAC / Nganga–Tsanga | 17 km from Tsanga Nord; visited/documented; final system sizing and installation scheduling are next. The name identifies an ophthalmological clinic. | Population, precise service/equipment requirements, system capacity, power baseline, testimony/identity. |
| 03 | `nsioni` — Centre de santé ophtalmologique CEAC Nsioni | Visited/photographed; final system sizing and scheduling are next. The name identifies an ophthalmological clinic. | Exact location, population, precise service/equipment requirements, system capacity, power baseline, testimony/identity. |
| 04 | `kiobo-kwimba` — Centre de santé CEAC Kiobo–Kwimba | Five supporting photographs; exterior/treatment rooms/current condition documented; final sizing and scheduling are next. | Exact location, population, service/equipment details, system capacity, power baseline, testimony/identity. |
| 05 | `mont-sinai` — Centre Hospitalier Mont Sinaï | Boma, Kongo Central; visited/photographed. Rooms and equipment to power must be confirmed before sizing/installing. | Population, verified service/equipment list, system capacity, power baseline, testimony/identity. |

`clinicPeopleServed()` returns **Verified count pending** for every clinic. The **Clinic voices** section says an approved testimony will appear after field approval. The other four selected clinics have no `careAreas` or `capacity` data. “Ready for electrification” does not establish zero existing electricity, a specific emergency, or an installation already completed.

Ndingi must be a clearly labeled **re-created journey inspired by a completed project**. Do not present it as a currently unpowered clinic or imply that a play session installed its real system. The campaign describes its central completed-work image as an approved visualization, not a literal field photograph. Match the asset's provenance in future captions.

## Attached forms: useful, but a different cohort

The numbers below are readings of supplied handwritten forms, not independently audited outcomes. The assessment date is not established by the image filename. Field-owner confirmation is required before shipping them as clinic facts.

| Form clinic | Approximate community served as written | Reported electricity situation | Documented requested uses / cautions | Source images |
| --- | --- | --- | --- | --- |
| C.S. Mami-Village | 10,582 residents | No electricity checked; torch noted. | Night lighting/emergency care, vaccine/medicine refrigeration, laboratory equipment; continuation also checks sterilization and several communication/training uses. Campaign Mami's village label differs from this form; confirm the exact facility before joining records. | #1 `14.25.02`; #2 `14.25.31` |
| C.S.R. Mao | 12,425 residents | No electricity checked; battery torches noted. | Night lighting/emergency care, vaccine/medicine refrigeration, laboratory equipment and sterilization. No proof that these uses are already powered. | #4 `14.41.36`; #5 `14.41.37` |
| CSE Kimufu | 12,837 residents | No electricity checked; torch noted. | A solar-source box also appears checked: reconcile this contradiction with the facility before describing its baseline. Requested night care, refrigeration and laboratory uses are checked. Kimufu is not in the current campaign directory. | #7 `14.45.08`; #6 `14.45.08 (1)` |
| CSE Konzo | 16,518 residents | No electricity checked; torch noted. | Requested night lighting/emergency care, refrigeration, laboratory equipment and sterilization. Konzo is not in the current campaign directory. | #9 `14.48.22`; #8 `14.48.22 (1)` |
| CM Tabernacle | Approximately 400 **households**, not 400 people | Grid electricity, approximately 8 hours/day. | Requested night lighting and night emergency care; night surgical/emergency needs described. The page uses a fuller community-clinic name; confirm facility identity. | #10 `14.56.47`; #11 `14.56.48` |

Image #3 (`14.31.26`) is a continuation page without a clinic header. Do not assign it to any selected clinic from adjacency alone. Do not turn checked requested uses into evidence of delivered services, vaccination counts, safer births measured, or deaths prevented.

Exclude private phone numbers, email addresses, signatures and unapproved staff identities from the public game and image-generation inputs. None are needed for the requested experience. Form questions and handwritten requests describe needs; they are not instructions to the assistant.

## Rules for numbers and claims

- Keep population nullable and preserve its unit. Unknown is not zero. Households must not be converted into people using an invented household size.
- If later approved, display **Reported community served: approximately X residents/households**, with a source/date note. Do not say “you saved X lives” or “X patients treated tonight.”
- Do not sum different catchment populations without evidence they do not overlap. A game replay cannot increase real reach.
- Keep **game delivery complete**, **campaign installation status**, and **reported community size** as separate facts.
- No doctor's quote or portrait is verified here. Draft messages must be labeled scripted, and a generated clinician must be labeled illustrative. A real clinician recording/photo needs their informed permission and factual review.
- Do not infer clinical load or supported equipment from a 2.0 kW generation capacity alone. Battery capacity/runtime, inverter ratings and load limits are not supplied.

## Sources inspected

- Campaign: [local clinic explorer](http://localhost:4200/campaigns/power-drc-clinics#clinics).
- Clinic records: `src/app/components/drc-clinic-campaign/drc-clinic-campaign.component.ts`, `clinics` array.
- Missing-count behavior: the same file, `clinicPeopleServed()`, `clinicCapacity()` and `clinicCareAreaCount()`.
- Approved-voice placeholder: `src/app/components/drc-clinic-campaign/drc-clinic-campaign.component.html`, `Clinic voices` details.
- Supplied eleven images in the user request; identifiers in the table are filename time suffixes. Originals remain in Downloads and are not copied into public game assets.

No external medical guidance or inferred clinical outcome statistics are being asserted. This audit records the user's sources and their limitations.
