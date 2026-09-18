# Clinic story concept images — generation record

Created 2026-09-18 using the built-in image-generation tool (not CLI mode).

## Selected deliverables

- [Opening v1](opening-v1.png)
- [Closing v1](closing-v1.png)

Both are illustrative desktop UI mockups, not implemented game screens, approved clinic photographs, verified staff portraits or evidence of installations. The clinician and background lettering are fictional. The Ndingi scene is an artist's reconstruction; do not infer a real building layout or identity. The source-backed facts are the documented 2.0 kW project and five listed care areas. The scene must not be reused as a campaign evidence photograph.

Inspection: verified readable primary hierarchy, start/next actions, scene framing, scripted-message disclosure, 2.0 kW/five care-area labels and separation of simulated delivery from real-world outcomes. UI text, focus, captions and controls must be implemented as live accessible HTML/CSS, not rasterized runtime controls. Keyboard bindings shown are illustrative defaults and must reflect settings in implementation. Treat the roof array as later commissioning, not as an installation occurring immediately on handover. Full-resolution images stay under docs and are excluded from runtime asset-budget estimates.

## Opening prompt

```text
Use case: ui-mockup.
Asset type: high-fidelity desktop 16:9 opening story screen for the existing LAST LIGHT realistic 3D rural-clinic solar-kit driving game. A single polished full-bleed game screen, not a presentation slide or browser/device frame.
Primary request: emotionally engaging, calm premium opening with a fictional clinician message before driving. UI style follows existing game: deep teal #152e2d/#214c45, warm cream #f2eddb, muted gold #e8c276; restrained Georgia-like editorial title, DM Sans-like body, condensed small labels. Elegant spacing, high contrast, no futuristic neon, no clutter.
Scene: an artist's reconstruction of a modest Ndingi clinic in Kongo Central, DR Congo just after sunset, blue lower walls, cream upper walls, corrugated roof, stone veranda, blue shutters, dirt courtyard and lush greenery. No lit solar array yet because this is explicitly a re-created historical delivery, not the clinic's current condition. An off-white delivery pickup with secured solar panels and a battery is near the courtyard. Keep scene dignified and realistic, no distressed patients.
Layout: left 48% dark translucent gradient for readable editorial copy; right 52% cinematic clinic atmosphere with a tasteful fictional adult Congolese clinician portrait/message area. Clinician has a calm assured expression and simple unbranded clinical clothes; do not depict or name an identifiable real doctor. Actual practical UI, not poster typography.
Render these exact text strings clearly and only once, placed in hierarchy:
top small "LAST LIGHT / CHAPTER 01";
chapter small "NDINGI CLINIC";
large title "Bring them the light.";
location "Ndingi · Kongo Central · DR Congo";
body "Care continues after sunset. In this re-created journey, bring the solar kit to the clinic team.";
two restrained facts "2.0 kW" with "Documented solar project", and "5 care areas" with "Supported by the real project";
clinician message label "A MESSAGE FROM THE CLINIC", small "Scripted clinician · illustrative portrait";
message transcript in two easy lines "You bring the power. We will keep caring.";
voice button "Play message";
main gold button "Start delivery";
bottom compact controls "W Drive   A D Steer   S Brake   E Deliver";
small bottom provenance "Re-created journey · not a live aid delivery".
Constraints: all text comfortably legible, correct spelling, usable large buttons and generous safe margins. Do not invent population numbers, casualty counts, lives saved, named doctors, verified quotes or extra logos. This is a generated design concept, not evidence of this clinic's actual current appearance.
```

## Closing prompt

```text
Use case: ui-mockup.
Asset type: high-fidelity desktop 16:9 ending story/results screen matching the opening of the existing LAST LIGHT realistic 3D clinic-delivery game. Single polished full-bleed game interface; no browser frame, devices, slides or multiple panels.
Primary request: a dignified, moving end view focused on the clinic team and care after dark, with a brief closing message and clear Next clinic button. Same existing visual system: deep teal #152e2d/#214c45, warm cream #f2eddb, muted gold #e8c276, editorial Georgia-like heading, DM Sans-like body and condensed labels.
Scene: artist's reconstruction of Ndingi's modest blue-and-cream clinic, stone veranda, blue shutters and corrugated roof in Kongo Central, DR Congo, now warmly illuminated at blue hour. Clinic staff quietly continuing their work at the receiving courtyard beside an off-white parked pickup; roof solar panels in background indicate a later commissioned state, not instantaneous rooftop installation. No patients in distress, no crowd, no confetti, no savior pose.
Layout: premium asymmetric composition: a clean left editorial results panel over deep teal occupying about 45%, warm clinic scene occupying the remaining width. Small waveform/play-message control integrated unobtrusively. Community care facts take precedence over game scores. Practical UI with clear hierarchy and elegant margins.
Exact text to render clearly:
top small "LAST LIGHT / CHAPTER COMPLETE";
large title "The team can keep caring.";
subheading "Ndingi Clinic";
body "The kit has reached the clinic team. Your delivery is complete in this re-created journey.";
subtle divider label "DOCUMENTED REAL PROJECT";
two facts "5 care areas" and "2.0 kW solar system";
small service list "Maternity · Laboratory · Inpatient rooms" and next line "Consultation · Operating room";
closing message label "A MESSAGE FROM THE CLINIC";
short transcript "Thank you for bringing the kit safely. We will keep caring.";
small provenance "Scripted narration · not a verified testimony";
progress "1 / 5 chapters complete";
main gold button "Next clinic";
secondary links "Replay arrival" and "Chapter map";
small footer "Simulated delivery. Real-world outcomes are tracked separately.";
Constraints: no invented population values, lives-saved counters, real doctor names, verified testimonials, performance numbers, real-world electrification claims attributable to game play. All copy accurate and legible, no neon dashboard, excessive cards or celebratory clutter. The image is concept art, not a clinical evidence photograph.
```

