# Power the Next 15 Clinics — Futuristic Implementation Plan

Concept image: [drc-clinics-futuristic-landing-page-concept-v2.png](./drc-clinics-futuristic-landing-page-concept-v2.png)

This revision presents the campaign as a mission-critical infrastructure deployment rather than a conventional fundraising page. It borrows principles from exceptional technology websites—cinematic scale, disciplined grids, sparse language, purposeful motion, and operational credibility—without copying another company’s brand or layout.

## Product idea

**A living network of care:** Ndingi is the first verified energy node. Fifteen clinic nodes are waiting to be assessed, funded, installed, commissioned, and monitored.

The interface should continuously connect three layers:

1. **Human consequence** — care after dark, safer clinic operations, and real field photography.
2. **Technical system** — solar generation, battery storage, distribution, installation, and monitoring.
3. **Capital accountability** — the clinic pipeline, campaign allocation, receipts, milestones, and operating status.

The donation action remains unmistakable, but it is framed as activating proven infrastructure rather than filling a generic donation thermometer.

## Final page sequence

### 0. Cinematic hero

- Use the exact existing logo at `src/assets/img/gsl-logo.png` beside “Global Solutions Lab.”
- Campaign-specific translucent header; do not reuse the dense global navigation.
- Full-bleed Ndingi exterior photograph.
- Fine coordinate grid and network path from one online node to fifteen waiting nodes.
- Monumental copy:
  - `FIELD PROVEN // NDINGI, KONGO CENTRAL`
  - `Infrastructure for life.`
  - `Power the next 15 clinics.`
- Primary CTA: `ACTIVATE THE NEXT CLINIC`
- Secondary CTA: `EXPLORE THE FIELD PROOF`
- Telemetry rail:
  - `NODE 01 // ONLINE`
  - `2.0 kW PILOT`
  - `24H HYBRID POWER`
  - `15 CLINICS QUEUED`
  - `$230K MISSION CAPITAL`

### 1. Field proof

- Numbered section label: `/01 FIELD PROOF`
- Heading: `The night Ndingi changed.`
- Real-image film strip: solar panels, transport/installation, commissioned clinic, interior at night.
- Scrolling timeline: `ASSESS → TRANSPORT → INSTALL → COMMISSION → MONITOR`
- Short quote, not an anonymous testimonial:
  - “That first night, deliveries, surgery, and emergency care continued under stable light.”
- Link to the complete project record and downloadable mission brief.

### 2. Deployment grid

- Numbered section label: `/02 DEPLOYMENT GRID`
- DRC/Kongo Central map rendered from existing D3 geographic tooling.
- Ndingi is a bright amber node marked `ONLINE`.
- Other nodes use evidence-based states only:
  - `IDENTIFIED`
  - `VERIFICATION`
  - `ASSESSMENT`
  - `READY`
  - `FUNDED`
  - `INSTALLATION`
  - `ONLINE`
  - `MONITORING`
- A precise adjacent table replaces donation cards.
- Selecting a verified node opens a side panel with clinic details, images, budget, source date, and the next milestone.
- Unverified clinics must not display invented names, locations, statistics, or photographs.

### 3. System architecture

- Numbered section label: `/03 SYSTEM`
- Heading: `From sunlight to care.`
- Four-stage diagram:
  - `SOLAR ARRAY → STORAGE → CLINIC POWER → CARE AFTER DARK`
- Show the pilot’s known metrics: four 500W panels and 2.0kW total installed capacity.
- A clinic-specific system should show assessed capacity rather than inheriting the pilot values.
- The diagram becomes a simple vertical flow on mobile.

### 4. Capital ledger

- Numbered section label: `/04 CAPITAL LEDGER`
- Show `$230,000 CAMPAIGN GOAL` and `ABOUT $15K PER CLINIC`.
- Use the verified detailed estimate in the disclosure layer: $15,376.24 per clinic and $230,643.60 for fifteen clinics.
- Allocation categories:
  - Solar and storage
  - Clinic equipment
  - Field logistics
  - Local team
  - First-year monitoring
  - Contingency
- Expose `raised`, `committed`, `spent`, and `remaining` as different values.
- Link every completed deployment to the associated public report.
- CTAs: `FUND A FULL CLINIC` and `CONTRIBUTE TO THE NETWORK`.

### 5. Closing field image

- Full-bleed illuminated clinic interior.
- Heading: `When care cannot wait, power cannot fail.`
- Compact EarthGame nonprofit, tax-deductibility, contact, and safeguarding copy.
- Final CTA: `POWER THE NEXT CLINIC`.

## Visual system

### Color tokens

```css
--mission-black: #05090d;
--mission-graphite: #0b1218;
--mission-panel: #111a21;
--mission-white: #f2f0e9;
--mission-muted: #8c98a3;
--mission-line: rgba(225, 235, 240, 0.16);
--mission-blue: #3f8fb7;
--mission-amber: #f6b73c;
--mission-online: #2f9b73;
```

### Typography

Self-host open-source fonts to avoid third-party runtime requests:

- Display: `Barlow Condensed` or `Archivo Narrow`
- Body: `Inter`
- Telemetry and labels: `IBM Plex Mono`

Use fluid sizes with `clamp()` and preserve a readable line length. The condensed face is for short headings only.

### Layout

- Twelve-column desktop grid
- Four-column mobile grid
- 1px hairline separators instead of card shadows
- Rectangular documentary frames
- Large negative-space intervals between chapters
- Small monospaced section identifiers and status labels
- One accent color at a time; amber means action or energy, green means verified online status

## Motion language

Motion should communicate state, not decorate empty space.

- On load: the official logo and hero image appear immediately; the network line draws after the first content paint.
- On scroll: the field timeline advances and the map nodes transition from outline to their verified state.
- On hover/focus: deployment rows reveal the next milestone and source date.
- On progress changes: totals cross-fade; never animate donation numbers from zero on every visit.
- Photo transitions use restrained masks and opacity, not carousel sliding.
- `prefers-reduced-motion` disables line drawing, parallax, counters, and smooth scrolling.

Implementation should begin with CSS transitions, Angular animation primitives, and `IntersectionObserver`. Do not add a large animation library unless the implemented prototype proves that native tools are insufficient.

## Angular architecture

The current project already has Angular 20, Tailwind CSS, AngularFire, Angular SSR, D3 Geo, and TopoJSON. The concept does not require a new rendering framework.

Suggested structure:

```text
src/app/components/drc-clinic-campaign/
  drc-clinic-campaign.component.ts
  drc-clinic-campaign.component.html
  drc-clinic-campaign.component.css
  campaign-hero/
  field-proof/
  deployment-grid/
  system-flow/
  capital-ledger/
  campaign-footer/
  models/
    clinic-campaign.model.ts
  services/
    clinic-campaign.service.ts
```

Add the public route:

```text
/campaigns/power-drc-clinics
```

Use a campaign-specific header instead of the existing application navbar. Continue to use the official `gsl-logo.png` asset rather than generating or redrawing the logo.

## Data model

### Campaign

```ts
interface ClinicCampaign {
  id: string;
  title: string;
  goalUsd: number;
  raisedUsd: number;
  committedUsd: number;
  spentUsd: number;
  currency: 'USD';
  clinicTarget: number;
  onlineCount: number;
  donationUrl: string;
  reportUrl?: string;
  updatedAt: unknown;
}
```

### Clinic node

```ts
type ClinicStage =
  | 'identified'
  | 'verification'
  | 'assessment'
  | 'ready'
  | 'funded'
  | 'installation'
  | 'online'
  | 'monitoring';

interface ClinicNode {
  id: string;
  publicName?: string;
  stage: ClinicStage;
  province?: string;
  territory?: string;
  publicCoordinates?: [number, number];
  verificationDate?: string;
  services?: string[];
  systemCapacityWatts?: number;
  budgetUsd?: number;
  fundedUsd?: number;
  imageUrls?: string[];
  sourceUpdatedAt?: unknown;
  publicReportUrl?: string;
}
```

Exact coordinates should be generalized when publishing them would create a privacy or security concern.

## Firestore and payment integrity

- Store a small public campaign projection and public clinic-node records; keep internal contacts, private coordinates, receipts, and raw field notes protected.
- The client may read totals but must never write `raisedUsd`, `spentUsd`, or payment status.
- Use a campaign-specific Stripe destination or metadata value.
- Update verified totals from a server-side webhook or an administrator-controlled reconciliation process.
- Do not count incomplete, refunded, disputed, or failed payments as raised funds.
- Distinguish unrestricted gifts from legally restricted clinic sponsorships.
- Publish a last-updated time beside financial totals.

## Media pipeline

1. Preserve original photos and consent records in protected storage.
2. Produce AVIF and WebP renditions with JPEG fallback.
3. Create responsive widths for 480, 768, 1280, and 1920 pixels.
4. Preload only the desktop/mobile hero candidate.
5. Lazy-load every image below the first viewport.
6. Use descriptive alt text; mark decorative grid and map lines as hidden from assistive technology.
7. Never use generated people or generated clinic photographs in the production campaign.

## Performance and accessibility targets

- Largest Contentful Paint below 2.5 seconds on a representative mobile connection
- Interaction to Next Paint below 200ms
- Cumulative Layout Shift below 0.1
- No blocking preloader
- Keyboard access to every clinic node and ledger disclosure
- WCAG AA text contrast
- Visible focus treatment using amber/white, not color alone
- Text alternative for the deployment map and system diagram
- Full experience without motion, WebGL, hover, or a fine pointer
- Low-bandwidth mode should display the same facts with static imagery

Avoid WebGL in the first implementation. A layered CSS/SVG hero and an SVG D3 map can achieve the futuristic effect with better accessibility and lower risk. WebGL can be evaluated later only if it adds a specific, measurable experience improvement.

## Delivery sequence

### Phase 1 — Content and evidence, 1–2 days

- Confirm the campaign goal and public rounding convention.
- Finalize English/French copy.
- Verify the first 3–4 clinic profiles.
- Complete the photo consent and source register.
- Confirm the dedicated donation attribution.

### Phase 2 — Visual foundation, 2–3 days

- Build tokens, typography, grid, mission header, section identifiers, buttons, and telemetry labels.
- Create responsive photo treatments.
- Establish reduced-motion behavior from the beginning.

### Phase 3 — Core page, 4–5 days

- Implement hero, field proof, D3 deployment grid, system flow, capital ledger, and closing CTA.
- Add mobile layouts and progressive enhancement.
- Add English/French localization keys.

### Phase 4 — Live data and giving, 3–5 days

- Add public campaign/clinic data projections.
- Connect the campaign-specific donation flow.
- Add thank-you, receipt, update subscription, and sponsor inquiry paths.
- Add public financial and deployment update timestamps.

### Phase 5 — Motion, performance, and QA, 3–4 days

- Add node-path drawing, timeline reveals, and restrained photo transitions.
- Run accessibility, privacy, responsive, payment, SSR, and slow-network tests.
- Validate analytics, metadata, Open Graph imagery, and indexability.

Estimated implementation: roughly two to three focused weeks for one developer once clinic profiles, donation attribution, and approved copy are available.

## Analytics

Track decisions, not vanity scrolling:

- `campaign_hero_primary_clicked`
- `field_proof_opened`
- `clinic_node_selected`
- `clinic_report_opened`
- `capital_ledger_expanded`
- `donation_started`
- `donation_completed`
- `monthly_giving_selected`
- `full_clinic_inquiry_started`
- `campaign_update_subscribed`

Do not expose donor identity, patient information, or precise clinic coordinates in analytics payloads.

## Definition of done

- The official Global Solutions Lab logo is used from the repository and remains unmodified.
- The page feels like an operational mission site, not a template fundraising page.
- All real-world claims have a source and date.
- No unverified clinic is presented as verified or ready.
- Campaign totals are server-controlled and reconciled.
- English and French experiences are complete.
- The page works with motion disabled and on a slow mobile connection.
- All production photography has documented publication permission.
- The complete donor path works from CTA through payment, receipt, thank-you, and progress updates.
