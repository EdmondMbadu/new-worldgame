import { Component, OnInit } from '@angular/core';
import { SeoService } from 'src/app/services/seo.service';

interface ScopeOption {
  label: string;
  active?: boolean;
}

interface InsightStat {
  value: string;
  label: string;
  accent?: 'primary' | 'accent';
}

@Component({
  selector: 'app-slp-partner',
  templateUrl: './slp-partner.component.html',
  styleUrls: ['./slp-partner.component.css'],
})
export class SlpPartnerComponent implements OnInit {
  readonly scopes: ScopeOption[] = [
    { label: 'Global' },
    { label: 'Regional', active: true },
    { label: 'Local' },
  ];

  readonly insightStats: InsightStat[] = [
    { value: '12', label: 'Highly compatible partners', accent: 'primary' },
    { value: '3', label: 'Active conversations', accent: 'accent' },
  ];

  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.seoService.updateMetaTags({
      title: 'SLP Partner Pathway | NewWorld Game',
      description:
        'Explore partnership-fit opportunities inside the Solution Launch Pathway, including ecosystem matches and outreach framing.',
      keywords:
        'NewWorld Game partner pathway, climate partnerships, SLP ecosystem, outreach template, implementation partners',
      url: 'https://newworld-game.org/partner',
      type: 'website',
    });
  }
}
