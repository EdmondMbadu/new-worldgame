import { Component, OnInit } from '@angular/core';
import { SeoService } from 'src/app/services/seo.service';

interface FundTier {
  label: string;
  subtitle: string;
  active?: boolean;
}

interface GrantCard {
  label: string;
  fitScore: number;
  title: string;
  description: string;
  amountLabel: string;
  amount: string;
  image: string;
}

@Component({
  selector: 'app-slp-fund',
  templateUrl: './slp-fund.component.html',
  styleUrls: ['./slp-fund.component.css'],
})
export class SlpFundComponent implements OnInit {
  readonly tiers: FundTier[] = [
    { label: 'Tier 1', subtitle: 'Micro-Grants', active: true },
    { label: 'Tier 2', subtitle: 'Mid-Scale' },
    { label: 'Tier 3', subtitle: 'Institutional' },
  ];

  readonly grants: GrantCard[] = [
    {
      label: 'Clean Tech Grant',
      fitScore: 92,
      title: 'Earthshot Innovation Fund',
      description:
        'Dedicated early-stage support for carbon capture projects that are ready to translate research into a pilotable intervention.',
      amountLabel: 'Amount',
      amount: '$5,000 – $25,000',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA0h1ySAoHeZjgzoH-ssyuKcLMT3XICRYOfq49-xba4WOkLsBSNbbvp-GGTnHjyZl2cnZXaOINQU0hm91yDAsyOHxnn0DU6U6txaOXjXlgyoea73kEPRK2ddNlxpIrCF2C91CAyTY9MzX6Xo2rCjcjySgdMGW0bCgX9wAAG82Ml3B-sarR5Wgox34NnQPlWK5-4kBTeSPP0ZGgtmxGdgkxXK3HBMwGnwEIBDPESYvXoDwX3WxUSTn4H5ggCqd0wgwdr3AzkgGIXodjj',
    },
    {
      label: 'Academic Award',
      fitScore: 88,
      title: 'Global Scholar Network',
      description:
        'A strong match for research teams building open, field-ready environmental tools with a demonstrable community learning edge.',
      amountLabel: 'Stipend',
      amount: '$2,500 – $10,000',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCBtdLPik1uJ3Fl86BHnRUiD6YUo-cHNNXTUhVZT-n-EzpL10b6GQV1uIyuY-Bm5vpAjknJEsFHgVlC3erAT7fFS_2s1HWQzj_DvL6c57X4cNzNJXt7N-9XhCTiGwN38aFUuFeGwaZyehkvEh1O8k7XiuWhSDQsknYUSC7epweHW_iROsfuotkWh5GO0IYyuUeawFM8pSPtBWRUYHzrARHDE8a6_ICQe3fWdfh7IOJn4tJdelkST-5jo-8Y3bi9GkTq606VUCu-ppaP',
    },
  ];

  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.seoService.updateMetaTags({
      title: 'SLP Funding Pathway | NewWorld Game',
      description:
        'Browse grant-oriented funding matches inside the Solution Launch Pathway, organized for early momentum and scale readiness.',
      keywords:
        'NewWorld Game funding, SLP fund pathway, micro grants, climate tech grants, student research funding',
      url: 'https://newworld-game.org/fund',
      type: 'website',
    });
  }
}
