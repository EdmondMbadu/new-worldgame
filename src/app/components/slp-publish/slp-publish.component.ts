import { Component, OnInit } from '@angular/core';
import { SeoService } from 'src/app/services/seo.service';

interface LaunchIntent {
  label: string;
  description: string;
  icon: string;
  route?: string;
  active?: boolean;
}

interface PublishResource {
  category: string;
  title: string;
  fitScore: number;
  description: string;
  timeline: string;
  scope: string;
  icon: string;
  cta: string;
}

interface ChecklistItem {
  label: string;
  detail: string;
  complete?: boolean;
}

@Component({
  selector: 'app-slp-publish',
  templateUrl: './slp-publish.component.html',
  styleUrls: ['./slp-publish.component.css'],
})
export class SlpPublishComponent implements OnInit {
  readonly launchIntents: LaunchIntent[] = [
    {
      label: 'Publish',
      description: 'Reach journals and media',
      icon: 'campaign',
      route: '/slp',
      active: true,
    },
    {
      label: 'Fund',
      description: 'Apply for targeted grants',
      icon: 'payments',
      route: '/fund',
    },
    {
      label: 'Partner',
      description: 'Line up implementation allies',
      icon: 'handshake',
      route: '/partner',
    },
    {
      label: 'Pass Forward',
      description: 'Prepare open-source release notes',
      icon: 'forward',
    },
  ];

  readonly resources: PublishResource[] = [
    {
      category: 'Academic Journal',
      title: 'The Lancet Planetary Health',
      fitScore: 84,
      description:
        'A strong editorial fit for climate-health work that connects systems thinking, human wellbeing, and evidence-backed intervention design.',
      timeline: 'Deadline Apr 15, 2026',
      scope: 'Global scope',
      icon: 'menu_book',
      cta: 'View submission guide',
    },
    {
      category: 'Science Media',
      title: 'Nature Sustainability',
      fitScore: 79,
      description:
        'Well suited to solutions with high policy relevance and a clear pathway from prototype evidence to larger carbon reduction outcomes.',
      timeline: 'Rolling admission',
      scope: 'Global scope',
      icon: 'newspaper',
      cta: 'Prepare editor pitch',
    },
    {
      category: 'Thought Leadership',
      title: 'Project Drawdown Network',
      fitScore: 73,
      description:
        'A useful bridge outlet when the goal is visibility with climate practitioners, coalition builders, and deployment-oriented institutions.',
      timeline: 'Quarterly feature window',
      scope: 'North America + global partners',
      icon: 'public',
      cta: 'Draft summary brief',
    },
  ];

  readonly checklist: ChecklistItem[] = [
    {
      label: 'Abstract tightened',
      detail: 'Lead claim, evidence, and public relevance are aligned.',
      complete: true,
    },
    {
      label: 'Asset pack assembled',
      detail: 'Charts, visuals, and explainer copy ready for handoff.',
      complete: true,
    },
    {
      label: 'Target outlet order',
      detail: 'Sequence your first three submissions before launch.',
    },
    {
      label: 'Press language review',
      detail: 'Confirm the plain-language version for non-academic readers.',
    },
  ];

  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.seoService.updateMetaTags({
      title: 'SLP Publish Pathway | NewWorld Game',
      description:
        'Explore the publish lane of the Solution Launch Pathway with recommended journals, media targets, and launch preparation prompts.',
      keywords:
        'NewWorld Game SLP, publish pathway, journal matching, solution launch, climate proposal publication',
      url: 'https://newworld-game.org/slp',
      type: 'website',
    });
  }
}
