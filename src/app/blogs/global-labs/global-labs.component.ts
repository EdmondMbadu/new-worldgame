import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DataService } from 'src/app/services/data.service';

interface ConversionCard {
  icon: string;
  title: string;
  body: string;
}

interface LabVideo {
  id: string;
  title: string;
  eyebrow: string;
  heading: string;
  body: string;
  src: string;
  thumbnailSrc: string;
}

@Component({
  selector: 'app-global-labs',
  templateUrl: './global-labs.component.html',
  styleUrl: './global-labs.component.css',
})
export class GlobalLabsComponent implements OnInit {
  loadedVideoIds: Record<string, boolean> = {};
  announcementEmail = '';
  announcementSubmitting = false;
  announcementSuccess = false;
  announcementError = '';

  readonly videos: LabVideo[] = [
    {
      id: 'differentiation',
      title: 'Global Solutions Lab - Differentiation',
      eyebrow: 'Start here',
      heading: 'What sets this Lab apart',
      body:
        'A quick overview of why the Global Solutions Lab is different from a class, conference, or ordinary workshop.',
      src: 'https://app.heygen.com/embeds/968bdd6e41df46d2b759fef5caabe0d3',
      thumbnailSrc: '../../../assets/img/zara-agent.png',
    },
    {
      id: 'promo',
      title: 'Global Solutions Lab Promo',
      eyebrow: 'The workshop experience',
      heading: 'See the Lab in action',
      body:
        'See the Lab experience, the community, and the kind of work participants take away.',
      src: 'https://app.heygen.com/embeds/625a1fb51b704c7796b455de9cdb2970',
      thumbnailSrc: '../../../assets/img/sofia-agent.png',
    },
    {
      id: 'mission',
      title: 'Global Solutions Lab - Choose Your Mission',
      eyebrow: 'Pick your focus',
      heading: 'Choose a problem that matters',
      body:
        'Explore how participants select a challenge and turn it into practical solution work.',
      src: 'https://app.heygen.com/embeds/f6e00c1aab4d4135bf51dfb9e4d314e0',
      thumbnailSrc: '../../../assets/img/li-agent.png',
    },
  ];

  readonly focusAreas = [
    'Climate resilience for your community or the world',
    'Clean energy and electrification',
    'Sustainable cities',
    'Democracy and civic engagement',
    'Food systems',
    'A challenge from your own community, organization, or startup',
  ];

  readonly outcomes: ConversionCard[] = [
    {
      icon: 'psychology',
      title: 'Build a real solution with AI support',
      body:
        'Use the Global Solutions Lab platform, custom-trained AIs, global data, state-of-the-world reports, and solution libraries to research and design practical strategies.',
    },
    {
      icon: 'groups',
      title: 'Work with a global team',
      body:
        'Collaborate with students, professionals, mentors, researchers, and participants from different countries, disciplines, and generations.',
    },
    {
      icon: 'article',
      title: 'Leave with publishable work',
      body:
        'The Lab culminates in solution presentations, and selected work can be shaped for publication, reports, proposals, articles, and outreach.',
    },
    {
      icon: 'travel_explore',
      title: 'Keep support after the Lab',
      body:
        'Participants continue with Global Solutions Lab access and project support, including AI-assisted updates on research, funding, partners, and Global Solutions Lab Tournament readiness.',
    },
  ];

  readonly proofPoints: ConversionCard[] = [
    {
      icon: 'public',
      title: 'International track record',
      body:
        'Past participants have joined from Africa, Asia, Europe, the Americas, Australia, New Zealand, and across the United States.',
    },
    {
      icon: 'account_balance',
      title: 'UN-connected context',
      body:
        'Previous presenters have included representatives from WHO, UNDP, UNEP, UNESCO, UNICEF, FAO, WFP, UN-Habitat, and other UN bodies.',
    },
    {
      icon: 'bolt',
      title: 'Work that reaches implementation',
      body:
        'A previous Global Solutions Lab Tournament award helped a DR Congo team electrify a village health clinic as proof of concept for scaling clinic power access.',
    },
  ];

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly data: DataService
  ) {}

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }

  playVideo(id: string): void {
    this.loadedVideoIds[id] = true;
  }

  scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  async joinAnnouncementList(): Promise<void> {
    this.announcementError = '';
    const email = this.announcementEmail.trim().toLowerCase();

    if (!this.data.isValidEmail(email)) {
      this.announcementError = 'Please enter a valid email address.';
      return;
    }

    this.announcementSubmitting = true;
    try {
      await this.data.gslWorkshopAnnouncementSignUp(email);
      this.announcementEmail = '';
      this.announcementSuccess = true;
    } catch (error) {
      console.error('Could not join the GSL Workshop announcement list', error);
      this.announcementError =
        'We could not add you right now. Please try again in a moment.';
    } finally {
      this.announcementSubmitting = false;
    }
  }

  trustedVideoUrl(src: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(src);
  }
}
