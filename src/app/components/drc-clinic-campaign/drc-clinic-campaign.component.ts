import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { geoMercator, geoPath } from 'd3-geo';

type ClinicStage =
  | 'online'
  | 'verification'
  | 'assessment'
  | 'ready';

interface ClinicProfile {
  id: string;
  index: string;
  name: string;
  location: string;
  stage: ClinicStage;
  stageLabel: string;
  images: string[];
  description: string;
  nextMilestone: string;
  capacity?: string;
}

@Component({
  selector: 'app-drc-clinic-campaign',
  templateUrl: './drc-clinic-campaign.component.html',
  styleUrls: ['./drc-clinic-campaign.component.css'],
  standalone: false,
})
export class DrcClinicCampaignComponent implements OnInit, AfterViewInit {
  @ViewChild('drcMap') private drcMap?: ElementRef<SVGSVGElement>;

  readonly donationUrl = 'https://buy.stripe.com/8wM5lR1IK2og8r6000';
  readonly solutionUrl = '/solution-view-external/a8QC5eufcizRKd1NvgPv';

  readonly clinics: ClinicProfile[] = [
    {
      id: 'ndingi',
      index: '01',
      name: 'Ndingi Clinic',
      location: 'Ndingi · Tshela Territory · Kongo Central',
      stage: 'online',
      stageLabel: 'Online',
      images: [
        'assets/campaigns/drc-clinics/ndingi-after.png',
        'assets/campaigns/drc-clinics/ndingi-solar-installation.png',
        'assets/campaigns/drc-clinics/ndingi-care-after-dark.png',
      ],
      description:
        'The field-proven pilot now powers the maternity ward, laboratory, inpatient rooms, consultation office, and operating room.',
      nextMilestone: 'First-year performance report',
      capacity: '2.0 kW pilot',
    },
    {
      id: 'nganga-tsanga',
      index: '02',
      name: 'Centre de santé ophtalmologique CEAC / Nganga–Tsanga',
      location: '17 km from Tsanga Nord · Democratic Republic of the Congo',
      stage: 'verification',
      stageLabel: 'Field verification',
      images: ['assets/campaigns/drc-clinics/nganga-tsanga-01.jpg'],
      description:
        'Field photography documents the existing CEAC eye-care facility. The next step is to verify its electrical baseline, priority medical loads, and installation scope.',
      nextMilestone: 'Complete energy and site assessment',
    },
    {
      id: 'nsioni',
      index: '03',
      name: 'Centre de santé ophtalmologique CEAC Nsioni',
      location: 'Democratic Republic of the Congo · Coordinates in verification',
      stage: 'verification',
      stageLabel: 'Field verification',
      images: [
        'assets/campaigns/drc-clinics/nsioni-01.jpg',
        'assets/campaigns/drc-clinics/nsioni-02.jpg',
      ],
      description:
        'Two documentary views establish the clinic identity and present condition. System sizing will follow a verified inventory of clinical equipment and operating hours.',
      nextMilestone: 'Verify location and priority loads',
    },
    {
      id: 'kiobo-kwimba',
      index: '04',
      name: 'Centre de santé CEAC Kiobo–Kwimba',
      location: 'Democratic Republic of the Congo · Coordinates in verification',
      stage: 'assessment',
      stageLabel: 'Photo assessment',
      images: [
        'assets/campaigns/drc-clinics/kiobo-kwimba-01.jpg',
        'assets/campaigns/drc-clinics/kiobo-kwimba-02.jpg',
        'assets/campaigns/drc-clinics/kiobo-kwimba-03.jpg',
        'assets/campaigns/drc-clinics/kiobo-kwimba-04.jpg',
        'assets/campaigns/drc-clinics/kiobo-kwimba-05.jpg',
      ],
      description:
        'The five-image field set records the exterior, treatment spaces, and current building condition. A technical visit will convert this evidence into a clinic-specific power design.',
      nextMilestone: 'Conduct technical site survey',
    },
    {
      id: 'mont-sinai',
      index: '05',
      name: 'Centre Hospitalier Mont Sinaï',
      location: 'Boma · Kongo Central · Democratic Republic of the Congo',
      stage: 'assessment',
      stageLabel: 'Photo assessment',
      images: [
        'assets/campaigns/drc-clinics/mont-sinai-01.jpg',
        'assets/campaigns/drc-clinics/mont-sinai-02.jpg',
        'assets/campaigns/drc-clinics/mont-sinai-03.jpg',
      ],
      description:
        'The Boma photo set documents a larger hospital campus. Its system must be scoped from verified essential-care circuits and an on-site energy assessment before funding is assigned.',
      nextMilestone: 'Map essential circuits and power demand',
    },
  ];

  selectedClinic = this.clinics[0];
  selectedPhotoIndex = 0;
  proofView: 'before' | 'after' | 'desired' = 'desired';

  readonly proofImages = {
    before: {
      src: 'assets/campaigns/drc-clinics/ndingi-before.jpg',
      label: 'Before electrification',
      note: 'Documentary photograph',
    },
    after: {
      src: 'assets/campaigns/drc-clinics/ndingi-after.png',
      label: 'Pilot completed',
      note: 'Documentary photograph',
    },
    desired: {
      src: 'assets/campaigns/drc-clinics/ndingi-desired-state.png',
      label: 'Desired state',
      note: 'Clearly labeled visualization',
    },
  };

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Power the Next 15 Clinics | Global Solutions Lab');
    this.meta.updateTag({
      name: 'description',
      content:
        'A field-proven mission to bring reliable solar power to rural health clinics in the Democratic Republic of Congo.',
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      void this.renderDrcMap();
    }
  }

  selectClinic(clinic: ClinicProfile): void {
    this.selectedClinic = clinic;
    this.selectedPhotoIndex = 0;
  }

  selectClinicPhoto(index: number): void {
    this.selectedPhotoIndex = index;
  }

  showPreviousClinicPhoto(): void {
    const count = this.selectedClinic.images.length;
    this.selectedPhotoIndex = (this.selectedPhotoIndex - 1 + count) % count;
  }

  showNextClinicPhoto(): void {
    const count = this.selectedClinic.images.length;
    this.selectedPhotoIndex = (this.selectedPhotoIndex + 1) % count;
  }

  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  setProofView(view: 'before' | 'after' | 'desired'): void {
    this.proofView = view;
  }

  get currentProofImage() {
    return this.proofImages[this.proofView];
  }

  get selectedClinicPhoto(): string {
    return this.selectedClinic.images[this.selectedPhotoIndex];
  }

  private async renderDrcMap(): Promise<void> {
    const svg = this.drcMap?.nativeElement;
    if (!svg) return;

    try {
      const response = await fetch('assets/files/countries.geo.json');
      const world = await response.json();
      const drc = world.features.find(
        (feature: { properties?: { name?: string } }) =>
          feature.properties?.name === 'Dem. Rep. Congo'
      );
      if (!drc) return;

      const projection = geoMercator().fitExtent(
        [
          [42, 36],
          [598, 486],
        ],
        drc
      );
      const pathData = geoPath(projection)(drc);
      const namespace = 'http://www.w3.org/2000/svg';

      const country = document.createElementNS(namespace, 'path');
      country.setAttribute('d', pathData || '');
      country.setAttribute('class', 'drc-map__country');
      svg.appendChild(country);

      const bomaPosition = projection([13.05, -5.85]);
      if (bomaPosition) {
        const [x, y] = bomaPosition;
        const pulse = document.createElementNS(namespace, 'circle');
        pulse.setAttribute('cx', String(x));
        pulse.setAttribute('cy', String(y));
        pulse.setAttribute('r', '15');
        pulse.setAttribute('class', 'drc-map__pulse');
        svg.appendChild(pulse);

        const marker = document.createElementNS(namespace, 'circle');
        marker.setAttribute('cx', String(x));
        marker.setAttribute('cy', String(y));
        marker.setAttribute('r', '5');
        marker.setAttribute('class', 'drc-map__marker');
        svg.appendChild(marker);

        const label = document.createElementNS(namespace, 'text');
        label.setAttribute('x', String(x + 20));
        label.setAttribute('y', String(y + 4));
        label.setAttribute('class', 'drc-map__label');
        label.textContent = 'BOMA / KONGO CENTRAL';
        svg.appendChild(label);
      }
    } catch {
      svg.setAttribute('data-map-status', 'unavailable');
    }
  }
}
