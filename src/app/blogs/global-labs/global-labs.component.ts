import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface ConversionCard {
  icon: string;
  title: string;
  body: string;
}

interface TuitionGroup {
  label: string;
  items: string[];
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
      eyebrow: '2026 overview',
      heading: 'What you are joining',
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
        'Use the NewWorld Game platform, custom-trained AIs, global data, state-of-the-world reports, and solution libraries to research and design practical strategies.',
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
        'Participants continue with NewWorld Game access and project support, including AI-assisted updates on research, funding, partners, and NewWorld Tournament readiness.',
    },
  ];

  readonly tuitionGroups: TuitionGroup[] = [
    {
      label: 'In-person',
      items: [
        '$800 for professionals',
        '$400 for students',
        '$0 for UN, community organizations, and Drexel University students',
      ],
    },
    {
      label: 'Online',
      items: [
        '$250 for professionals',
        '$200 for students and seniors',
        '$0 for Drexel University students',
        'Scholarships are available for a limited number of students, including international students',
      ],
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
      title: '$1,000 seed funding pathway',
      body:
        'The winning NewWorld Tournament solution receives $1,000 in award/seed funding, and past tournament support helped a DR Congo team electrify a village health clinic proof of concept.',
    },
  ];

  constructor(private readonly sanitizer: DomSanitizer) {}

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

  trustedVideoUrl(src: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(src);
  }
}
