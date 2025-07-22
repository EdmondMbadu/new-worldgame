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
  featureRows: FeatureRow[] = [
    {
      name: 'Student capacity',
      detail: 'Maximum concurrent student accounts.',
      minPlanIndex: 0,
      customValues: ['30', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
    },
    {
      name: 'Unlimited solution runs',
      detail: 'No limit on code executions / AI calls.',
      minPlanIndex: 0,
    },
    {
      name: 'AI avatars included',
      detail: 'Ready-made AI personas for classroom use.',
      minPlanIndex: 0,
      customValues: ['3', '12', '12', '12', 'Custom'],
    },
    {
      name: 'Tournament access',
      detail: 'Ability to enter the global NewWorld Game tournament.',
      minPlanIndex: 2, // starts at “Tournament” plan
    },
    {
      name: 'Tournament entries',
      detail: 'Max number of team submissions per school.',
      minPlanIndex: 1, // License and up
      customValues: ['0', '1', '3', '5', 'Custom'],
    },
    {
      name: 'Global judging & prizes',
      detail: 'Projects reviewed by international jury; prizes awarded.',
      minPlanIndex: 2,
    },
    {
      name: 'Email support',
      detail: 'Standard support (48h SLA).',
      minPlanIndex: 1,
    },
    {
      name: 'Staff PD webinar',
      detail: '60-minute live Professional-Development session.',
      minPlanIndex: 3,
    },
    {
      name: 'Priority support',
      detail: 'Fast-track queue and shorter SLA.',
      minPlanIndex: 4,
    },
    {
      name: 'Dedicated account manager',
      detail: 'Personal onboarding & quarterly success reviews.',
      minPlanIndex: 4,
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
  cellValue(row: FeatureRow, planIdx: number): string {
    // custom override?
    if (row.customValues && row.customValues[planIdx] !== null) {
      return row.customValues[planIdx] as string;
    }
    // inherited ✓ if planIdx >= minPlanIndex
    if (row.minPlanIndex !== null && planIdx >= row.minPlanIndex) {
      return '✓';
    }
    return '—';
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
