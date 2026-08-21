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

type Language = 'en' | 'fr';

interface ClinicProfile {
  id: string;
  index: string;
  name: string;
  nameFr: string;
  location: string;
  locationFr: string;
  stage: ClinicStage;
  stageLabel: string;
  stageLabelFr: string;
  images: string[];
  description: string;
  descriptionFr: string;
  nextMilestone: string;
  nextMilestoneFr: string;
  capacity?: string;
  capacityFr?: string;
}

@Component({
  selector: 'app-drc-clinic-campaign',
  templateUrl: './drc-clinic-campaign.component.html',
  styleUrls: [
    './drc-clinic-campaign.component.css',
    './drc-clinic-campaign.video.css',
    './drc-clinic-campaign.evidence.css',
    './drc-clinic-campaign.power.css',
  ],
  standalone: false,
})
export class DrcClinicCampaignComponent implements OnInit, AfterViewInit {
  @ViewChild('drcMap') private drcMap?: ElementRef<SVGSVGElement>;
  @ViewChild('campaignVideo') private campaignVideo?: ElementRef<HTMLVideoElement>;

  readonly donationUrl = 'https://buy.stripe.com/8wM5lR1IK2og8r6000';
  readonly solutionUrl =
    'https://globalsolutionlab.com/solution-view/o0eqjssL6yn1qZVqAY60';
  readonly presentationUrl =
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/ndingi%2FNDINGI%20Clinic%20Electrification%20Scale-Up%20Project%20DAY%204.pptx.pdf?alt=media&token=c60bb41a-d6d7-4b6b-bc94-32f6c51735e8';
  readonly achievedMasterImage = 'assets/campaigns/drc-clinics/ndingi-achieved-master-v1.jpg';
  readonly powerOffImage = 'assets/campaigns/drc-clinics/ndingi-achieved-power-off-v1.jpg';
  readonly powerOnImage = 'assets/campaigns/drc-clinics/ndingi-achieved-power-on-v1.jpg';
  readonly videoThumbnail = this.powerOnImage;
  readonly videoPages: Record<Language, string> = {
    en: 'https://globalsolutionlab.com/nwg-news?v=ux8SCCU6hH3WYwBznYrE',
    fr: 'https://globalsolutionlab.com/nwg-news?v=DVsh6rzPOrOngXEOv8Z4',
  };
  readonly videoSources: Record<Language, string> = {
    en: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/nwgNewsVideos%2Fvideos%2F2026%2Fux8SCCU6hH3WYwBznYrE-drc-health-clinis-v1.mp4?alt=media&token=1f5c043b-45e6-4bee-a0a4-0306ab96bef0',
    fr: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/nwgNewsVideos%2Fvideos%2F2026%2FDVsh6rzPOrOngXEOv8Z4-drc-clinics-french.mp4?alt=media&token=f06bc90d-bf2f-46e1-b05c-284b514ef1d1',
  };

  readonly clinics: ClinicProfile[] = [
    {
      id: 'ndingi',
      index: '01',
      name: 'Ndingi Clinic',
      nameFr: 'Clinique de Ndingi',
      location: 'Ndingi · Tshela Territory · Kongo Central',
      locationFr: 'Ndingi · Territoire de Tshela · Kongo Central',
      stage: 'online',
      stageLabel: 'Solar power installed',
      stageLabelFr: 'Énergie solaire installée',
      images: [
        this.achievedMasterImage,
        'assets/campaigns/drc-clinics/ndingi-solar-installation.png',
        'assets/campaigns/drc-clinics/ndingi-care-after-dark.png',
      ],
      description:
        'Solar power now serves the maternity ward, laboratory, inpatient rooms, consultation office, and operating room.',
      descriptionFr:
        'L’énergie solaire alimente désormais la maternité, le laboratoire, les chambres, le cabinet de consultation et la salle d’opération.',
      nextMilestone: 'Publish the first-year results report',
      nextMilestoneFr: 'Publier le rapport des résultats de la première année',
      capacity: '2.0 kW solar system',
      capacityFr: 'Système solaire de 2,0 kW',
    },
    {
      id: 'nganga-tsanga',
      index: '02',
      name: 'Centre de santé ophtalmologique CEAC / Nganga–Tsanga',
      nameFr: 'Centre de santé ophtalmologique CEAC / Nganga–Tsanga',
      location: '17 km from Tsanga Nord · Democratic Republic of the Congo',
      locationFr: 'À 17 km de Tsanga Nord · République démocratique du Congo',
      stage: 'verification',
      stageLabel: 'Site visit needed',
      stageLabelFr: 'Visite sur place nécessaire',
      images: ['assets/campaigns/drc-clinics/nganga-tsanga-01.jpg'],
      description:
        'The team has received a photo of this CEAC eye-care clinic. Next, it will visit the clinic, check the existing electricity supply, list the medical equipment that needs power, and plan the solar installation.',
      descriptionFr:
        'L’équipe a reçu une photo de ce centre de soins oculaires CEAC. Elle doit maintenant visiter le centre, vérifier l’alimentation électrique existante, dresser la liste des équipements médicaux à alimenter et planifier l’installation solaire.',
      nextMilestone: 'Visit the clinic and document its electricity needs',
      nextMilestoneFr: 'Visiter le centre et documenter ses besoins en électricité',
    },
    {
      id: 'nsioni',
      index: '03',
      name: 'Centre de santé ophtalmologique CEAC Nsioni',
      nameFr: 'Centre de santé ophtalmologique CEAC Nsioni',
      location: 'Democratic Republic of the Congo · Exact location to be confirmed',
      locationFr: 'République démocratique du Congo · Lieu exact à confirmer',
      stage: 'verification',
      stageLabel: 'Site visit needed',
      stageLabelFr: 'Visite sur place nécessaire',
      images: [
        'assets/campaigns/drc-clinics/nsioni-01.jpg',
        'assets/campaigns/drc-clinics/nsioni-02.jpg',
      ],
      description:
        'The team has received two photos showing this clinic and its current condition. Next, it will confirm the location and list the medical equipment, lighting, and hours of operation that require electricity.',
      descriptionFr:
        'L’équipe a reçu deux photos montrant ce centre et son état actuel. Elle doit maintenant confirmer le lieu et dresser la liste des équipements médicaux, de l’éclairage et des horaires nécessitant de l’électricité.',
      nextMilestone: 'Confirm the location and document electricity needs',
      nextMilestoneFr: 'Confirmer le lieu et documenter les besoins en électricité',
    },
    {
      id: 'kiobo-kwimba',
      index: '04',
      name: 'Centre de santé CEAC Kiobo–Kwimba',
      nameFr: 'Centre de santé CEAC Kiobo–Kwimba',
      location: 'Democratic Republic of the Congo · Exact location to be confirmed',
      locationFr: 'République démocratique du Congo · Lieu exact à confirmer',
      stage: 'assessment',
      stageLabel: 'Photos received',
      stageLabelFr: 'Photos reçues',
      images: [
        'assets/campaigns/drc-clinics/kiobo-kwimba-01.jpg',
        'assets/campaigns/drc-clinics/kiobo-kwimba-02.jpg',
        'assets/campaigns/drc-clinics/kiobo-kwimba-03.jpg',
        'assets/campaigns/drc-clinics/kiobo-kwimba-04.jpg',
        'assets/campaigns/drc-clinics/kiobo-kwimba-05.jpg',
      ],
      description:
        'The team has received five photos showing the clinic exterior, treatment rooms, and current building condition. Next, a technical team will visit and decide what solar equipment the clinic needs.',
      descriptionFr:
        'L’équipe a reçu cinq photos montrant l’extérieur du centre, les salles de soins et l’état actuel du bâtiment. Une équipe technique doit maintenant visiter le centre et déterminer l’équipement solaire nécessaire.',
      nextMilestone: 'Visit the clinic and plan the solar installation',
      nextMilestoneFr: 'Visiter le centre et planifier l’installation solaire',
    },
    {
      id: 'mont-sinai',
      index: '05',
      name: 'Centre Hospitalier Mont Sinaï',
      nameFr: 'Centre Hospitalier Mont Sinaï',
      location: 'Boma · Kongo Central · Democratic Republic of the Congo',
      locationFr: 'Boma · Kongo Central · République démocratique du Congo',
      stage: 'assessment',
      stageLabel: 'Photos received',
      stageLabelFr: 'Photos reçues',
      images: [
        'assets/campaigns/drc-clinics/mont-sinai-01.jpg',
        'assets/campaigns/drc-clinics/mont-sinai-02.jpg',
        'assets/campaigns/drc-clinics/mont-sinai-03.jpg',
      ],
      description:
        'The photos show a larger hospital in Boma. The team must visit the hospital, identify which rooms and medical equipment need reliable electricity, and estimate the cost before funding is assigned.',
      descriptionFr:
        'Les photos montrent un hôpital plus vaste à Boma. L’équipe doit visiter l’hôpital, identifier les salles et les équipements médicaux qui ont besoin d’une électricité fiable, puis estimer le coût avant l’attribution des fonds.',
      nextMilestone: 'Visit the hospital and document its electricity needs',
      nextMilestoneFr: 'Visiter l’hôpital et documenter ses besoins en électricité',
    },
  ];

  selectedClinic = this.clinics[0];
  selectedPhotoIndex = 0;
  currentLanguage: Language = 'en';
  isVideoPlaying = false;
  proofView: 'before' | 'after' = 'after';
  isClinicPowerOn = true;
  powerOffImageLoaded = false;
  powerOnImageLoaded = false;
  powerImageError = false;

  readonly proofImages = {
    before: {
      src: 'assets/campaigns/drc-clinics/ndingi-before.jpg',
      label: 'Before solar power',
      labelFr: 'Avant l’électrification',
      note: 'Photo taken at the clinic',
      noteFr: 'Photo prise au centre',
    },
    after: {
      src: this.achievedMasterImage,
      label: 'Solar power installed',
      labelFr: 'Énergie solaire installée',
      note: 'Approved image of completed work',
      noteFr: 'Image approuvée des travaux réalisés',
    },
  };

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    this.updateDocumentMetadata();
  }

  setLanguage(language: Language): void {
    if (this.currentLanguage === language) return;
    this.currentLanguage = language;
    this.isVideoPlaying = false;
    this.updateDocumentMetadata();
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.lang = language;
      setTimeout(() => this.campaignVideo?.nativeElement.load());
    }
  }

  playVideo(): void {
    const video = this.campaignVideo?.nativeElement;
    if (!video) return;
    void video.play();
  }

  markPowerImageLoaded(state: 'off' | 'on'): void {
    if (state === 'off') {
      this.powerOffImageLoaded = true;
    } else {
      this.powerOnImageLoaded = true;
    }
  }

  markPowerImageError(): void {
    this.powerImageError = true;
  }

  toggleClinicPower(): void {
    if (!this.isPowerSceneReady || this.powerImageError) return;
    this.isClinicPowerOn = !this.isClinicPowerOn;
  }

  tr(english: string, french: string): string {
    return this.currentLanguage === 'fr' ? french : english;
  }

  clinicName(clinic: ClinicProfile): string {
    return this.currentLanguage === 'fr' ? clinic.nameFr : clinic.name;
  }

  clinicLocation(clinic: ClinicProfile): string {
    return this.currentLanguage === 'fr' ? clinic.locationFr : clinic.location;
  }

  clinicStageLabel(clinic: ClinicProfile): string {
    return this.currentLanguage === 'fr' ? clinic.stageLabelFr : clinic.stageLabel;
  }

  clinicDescription(clinic: ClinicProfile): string {
    return this.currentLanguage === 'fr' ? clinic.descriptionFr : clinic.description;
  }

  clinicMilestone(clinic: ClinicProfile): string {
    return this.currentLanguage === 'fr' ? clinic.nextMilestoneFr : clinic.nextMilestone;
  }

  clinicCapacity(clinic: ClinicProfile): string {
    return this.currentLanguage === 'fr'
      ? clinic.capacityFr || 'À déterminer après la visite sur place'
      : clinic.capacity || 'To be determined after the site visit';
  }

  get videoSource(): string {
    return this.videoSources[this.currentLanguage];
  }

  get videoPage(): string {
    return this.videoPages[this.currentLanguage];
  }

  get isPowerSceneReady(): boolean {
    return this.powerOffImageLoaded && this.powerOnImageLoaded;
  }

  get proofLabel(): string {
    const image = this.currentProofImage;
    return this.currentLanguage === 'fr' ? image.labelFr : image.label;
  }

  get proofNote(): string {
    const image = this.currentProofImage;
    return this.currentLanguage === 'fr' ? image.noteFr : image.note;
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

  setProofView(view: 'before' | 'after'): void {
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
      const africaCountryNames = new Set([
        'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
        'Cameroon', 'Central African Rep.', 'Chad', 'Congo', 'Dem. Rep. Congo',
        "Côte d'Ivoire", 'Djibouti', 'Egypt', 'Eq. Guinea', 'Eritrea',
        'eSwatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
        'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar',
        'Malawi', 'Mali', 'Mauritania', 'Morocco', 'Mozambique', 'Namibia',
        'Niger', 'Nigeria', 'Rwanda', 'S. Sudan', 'Senegal', 'Sierra Leone',
        'Somalia', 'Somaliland', 'South Africa', 'Sudan', 'Tanzania', 'Togo',
        'Tunisia', 'Uganda', 'W. Sahara', 'Zambia', 'Zimbabwe',
      ]);
      const africaFeatures = world.features.filter(
        (feature: { properties?: { name?: string } }) =>
          africaCountryNames.has(feature.properties?.name || '')
      );
      const drc = africaFeatures.find(
        (feature: { properties?: { name?: string } }) =>
          feature.properties?.name === 'Dem. Rep. Congo'
      );
      if (!drc) return;

      const africa = {
        type: 'FeatureCollection',
        features: africaFeatures,
      };

      const projection = geoMercator().fitExtent(
        [
          [42, 36],
          [598, 486],
        ],
        africa as never
      );
      const pathGenerator = geoPath(projection);
      const namespace = 'http://www.w3.org/2000/svg';

      africaFeatures.forEach(
        (feature: { properties?: { name?: string } }) => {
          const country = document.createElementNS(namespace, 'path');
          country.setAttribute('d', pathGenerator(feature as never) || '');
          country.setAttribute(
            'class',
            feature.properties?.name === 'Dem. Rep. Congo'
              ? 'africa-map__country africa-map__country--active'
              : 'africa-map__country'
          );
          svg.appendChild(country);
        }
      );

      const drcPosition = projection([23.65, -2.88]);
      if (drcPosition) {
        const [x, y] = drcPosition;
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
        label.textContent = 'DRC // WORK UNDERWAY';
        svg.appendChild(label);
      }
    } catch {
      svg.setAttribute('data-map-status', 'unavailable');
    }
  }

  private updateDocumentMetadata(): void {
    this.title.setTitle(
      this.tr(
        'Power the Next 15 Clinics | Global Solutions Lab',
        'Électrifier les 15 prochains centres | Global Solutions Lab'
      )
    );
    this.meta.updateTag({
      name: 'description',
      content: this.tr(
        'A project to bring reliable solar power to 15 health clinics in the Democratic Republic of the Congo.',
        'Un projet visant à fournir une énergie solaire fiable à 15 centres de santé en République démocratique du Congo.'
      ),
    });
  }
}
