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
export const PLANS = ['Free', 'License', 'Tournament', 'Pro', 'Enterprise'];

@Component({
  selector: 'app-tournament-landing',
  templateUrl: './tournament-landing.component.html',
  styleUrl: './tournament-landing.component.css',
})
export class TournamentLandingComponent {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  plans = PLANS;
  /** Accordion-open state */
  showTable = false;

  /** Toggle accordion */
  toggleTable(): void {
    this.showTable = !this.showTable;
  }
  /** Comparison-matrix source.  `minPlanIndex` handles feature inheritance */
  // Table rows
  featureRows = [
    {
      name: 'Student capacity',
      values: [
        'Single player',
        'Unlimited',
        'Unlimited',
        'Unlimited',
        'Unlimited (multi-campus)',
      ],
      detail:
        'Free is single-player only. Paid plans allow unlimited student accounts.',
    },
    {
      name: 'AI avatars included',
      values: [true, true, true, true, true],
      detail:
        'AI avatar bundles are not included in plan pricing. (Show as — for clarity.)',
    },
    {
      name: 'Tournament access',
      values: [false, true, true, true, true],
      detail: 'Ability to enter official tournaments.',
    },
    {
      name: 'Tournament entries',
      values: ['—', '1', '3', '5', 'Custom'],
      detail: 'Number of team entries included per season.',
    },
    {
      name: 'Global judging & prizes',
      // If you want License-Only to count as judged (because it includes 1 submission),
      // set the second value to true instead of '—'.
      values: ['—', '—', true, true, true],
      detail: 'Eligibility for global judging rounds and prize consideration.',
    },
    {
      name: 'Teacher AI-training masterclass',
      values: ['—', '—', true, true, true],
      detail: 'Live training with recording.',
    },
    {
      name: 'Support',
      values: ['—', 'Email', 'Email', 'Priority', 'Priority + Manager'],
      detail: 'Support level and response expectations.',
    },
    {
      name: 'Onboarding & training',
      values: ['—', '—', '—', '—', 'Custom'],
      detail:
        'Setup, workshops, migration, and tailored enablement for Enterprise.',
    },
    {
      name: 'Dedicated account manager',
      values: ['—', '—', '—', '—', true],
      detail: 'Direct point-of-contact for multi-campus deployments.',
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
