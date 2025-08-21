import { ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
// ── Add below your existing imports ───────────────────────────────────────────// ✦ utility interface
interface FeatureRow {
  name: string; // Table row label
  detail: string; // Extra info revealed on expand
  minPlanIndex: number | null; // 0-based index of the first plan that gets this feature
  customValues?: (string | null)[]; // Optional per-plan override (numbers, “Custom”, “—”)
}

@Component({
  selector: 'app-tournament-landing',
  templateUrl: './tournament-landing.component.html',
  styleUrl: './tournament-landing.component.css',
})
export class TournamentLandingComponent {
  ngOnInit(): void {
    window.scroll(0, 0);
  }

  /** Accordion-open state */
  showTable = false;

  /** Toggle accordion */
  toggleTable(): void {
    this.showTable = !this.showTable;
  }
  /** Comparison-matrix source.  `minPlanIndex` handles feature inheritance */
  // Table rows
  // Plans (match the card headers exactly)
  PLANS = [
    'Free Evaluation',
    'NWG Only',
    'NWG & Tournament',
    'NWG & Your Tournament',
    'NWG and Your District or University',
  ];

  plans = this.PLANS;
  // Comparison rows (5 columns per row, same order as PLANS above)
  featureRows = [
    {
      name: 'Student capacity',
      values: [
        'Single player',
        'Unlimited students',
        'Unlimited students',
        'Unlimited students',
        'Unlimited users (multi-campus)',
      ],
      detail:
        'Free is single-player only. All paid plans allow unlimited student accounts; District/University extends across campuses.',
    },
    {
      name: 'Private Dashboard (School/Class)',
      values: [false, true, true, true, true],
      detail:
        'Admin dashboard for teachers/classes. Included from NWG Only upward and inherited by all higher tiers.',
    },
    {
      name: 'Tournament access',
      values: [false, false, true, true, true],
      detail: 'Eligibility to participate in official tournaments.',
    },
    {
      name: 'Tournament entries included',
      values: ['—', '—', '3 teams', 'Unlimited', 'Unlimited & Custom'],
      detail: 'Baseline team entries included with the plan',
    },
    {
      name: 'Extra team entries (add-on)',
      values: ['—', '—', '$30 each', '—', 'Custom'],
      detail: 'Per-team add-on price where applicable.',
    },
    {
      name: 'Global judging & prizes',
      values: ['—', '—', true, true, true],
      detail: 'Access to global judging rounds and prize consideration.',
    },
    {
      name: 'Teacher AI-training masterclass',
      values: ['—', '—', true, true, true],
      detail:
        'Included live training (with recording) in Tournament/Your Tournament; District/University includes PD + AI training.',
    },
    {
      name: 'Your tournament set-up',
      values: ['—', '—', '—', true, true],
      detail:
        'Hands-on set-up for your own school/class tournament. Inherited by District/University.',
    },
    {
      name: 'Use of NWG in any class (curriculum-related)',
      values: ['—', '—', '—', true, true],
      detail:
        'Explicit allowance to integrate NWG into any class/curriculum use case.',
    },
    {
      name: 'Support level',
      values: [
        '—',
        'Email',
        'Email',
        'Email & Video',
        'Priority (Email & Video) + Manager',
      ],
      detail:
        'Support channel and priority. District/University includes a dedicated manager.',
    },
    {
      name: 'Onboarding & training',
      values: ['—', '—', '—', '—', 'Custom onboarding & training'],
      detail:
        'Tailored setup/workshops for multi-campus deployments (District/University).',
    },
    {
      name: 'License term',
      values: ['—', 'Annual', 'Annual', 'Annual', 'Two-year'],
      detail: 'Plan duration. District/University is a two-year license.',
    },
    {
      name: 'Campuses included',
      values: ['—', '1 school', '1 school', '1 school', 'Up to 10 campuses'],
      detail: 'Intended deployment scope per plan.',
    },
    {
      name: 'Dedicated account manager',
      values: ['—', '—', '—', '—', true],
      detail:
        'Single point of contact for planning, enablement, and success (District/University).',
    },
  ];

  /** UI state */
  expanded: boolean[] = this.featureRows.map(() => false);
  showMode: 'summary' | 'details' = 'summary';

  // ───────── helpers ────────────────────────────────────────────────────────
  toggleRow(i: number): void {
    this.expanded[i] = !this.expanded[i];
  }

  onSelectChange(mode: 'summary' | 'details'): void {
    this.showMode = mode;
    const expand = mode === 'details';
    this.expanded = this.expanded.map(() => expand);
  }

  /** trackBy for *ngFor */
  trackByIndex(index: number): number {
    return index;
  }

  /** Resolve cell value based on inheritance rules */
  // Helper used by the template
  cellValue(row: any, j: number) {
    const v = row.values[j];
    if (v === true) return '✓';
    if (v === false || v === null || v === undefined) return '—';
    return v; // string/number already formatted
  }

  aiOptions: any[] = [];
  email: string = 'newworld@newworld-game.org';
  isLoggedIn: boolean = false;
  constructor(
    public auth: AuthService,
    public data: DataService,
    private scroller: ViewportScroller
  ) {
    // console.log('curent user email', this.auth.currentUser);
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
    this.aiOptions = data.aiOptions;
  }
}
