import { Component, OnDestroy } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { ChallengePage } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService, FeaturedChallengeSpaceConfig } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-solution-publication',
  templateUrl: './solution-publication.component.html',
  styleUrl: './solution-publication.component.css',
})
export class SolutionPublicationComponent implements OnDestroy {
  allSolutions: Solution[] = [];
  allChallengeSpaces: ChallengePage[] = [];
  featuredSpaceConfig: FeaturedChallengeSpaceConfig | null = null;
  selectedFeaturedSpaceId = '';
  featuredSpaceSearch = '';
  showFeaturedSpaceResults = false;
  featuredSpaceSaving = false;
  featuredSpaceMessage = '';
  featuredSpaceError = '';
  statusFilter: 'all' | 'pending' | 'approved' = 'all';
  private challengeSpacesSub?: Subscription;
  private featuredSpaceSub?: Subscription;

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private challenges: ChallengesService,
    private activatedRoute: ActivatedRoute,
    private time: TimeService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions
  ) {}

  /* existing fields … */

  /* ➊ NEW – master list of categories */
  categories: string[] = [
    'UN SDG',
    'Climate',
    'Poverty',
    'Energy',
    'Food',
    'Health',
    'Forestry',
  ];

  ngOnInit(): void {
    this.solution.getAllSolutionsFromAllAccounts().subscribe((sols) => {
      this.allSolutions = sols;
      this.allSolutions = this.allSolutions.filter(
        (sol) => sol.finished === 'true'
      );

      /* ➋ NEW – enrich category list from existing data */
      const extras = new Set(
        sols
          .map((s) => s.category?.trim())
          .filter((c) => c && !this.categories.includes(c!))
      );
      this.categories.push(...(extras as any));
    });

    this.challengeSpacesSub = this.challenges.getAllChallengePages().subscribe({
      next: (spaces) => {
        this.allChallengeSpaces = (spaces || []).sort((a, b) =>
          this.challengeSpaceTitle(a).localeCompare(this.challengeSpaceTitle(b))
        );
        this.syncFeaturedSearchLabel();
      },
      error: (error) => {
        console.error('Unable to load challenge spaces', error);
        this.featuredSpaceError = 'Unable to load challenge spaces.';
      },
    });

    this.featuredSpaceSub = this.challenges
      .getFeaturedChallengeSpaceConfig()
      .subscribe({
        next: (config) => {
          this.featuredSpaceConfig = config;
          this.selectedFeaturedSpaceId = config?.featuredSpaceId || '';
          this.featuredSpaceSearch = config?.featuredSpaceTitle || '';
          this.syncFeaturedSearchLabel();
        },
        error: (error) => {
          console.error('Unable to load featured challenge space', error);
          this.featuredSpaceError = 'Unable to load featured space setting.';
        },
      });
  }

  ngOnDestroy(): void {
    this.challengeSpacesSub?.unsubscribe();
    this.featuredSpaceSub?.unsubscribe();
  }

  /* existing helpers (btnClass, filteredSolutions, setStatus) remain unchanged */

  /* ➌ NEW – toggle the inline category editor */
  toggleCategoryEditor(sol: Solution): void {
    (sol as any).editingCategory = !(sol as any).editingCategory;
    (sol as any).tempCategory = sol.category || '';
  }

  /* ➍ NEW – save category, extend list if needed, persist */
  saveCategory(sol: Solution): void {
    const cat = ((sol as any).tempCategory || '').trim();
    (sol as any).editingCategory = false;

    if (!cat) return;

    if (!this.categories.includes(cat)) {
      this.categories.push(cat); // make it selectable for next time
    }

    sol.category = cat; // optimistic UI

    this.solution
      .setSolutionCategoryForPublication(sol.solutionId!, {
        ...sol,
        category: cat,
      }) // merge update
      .catch((err) => console.error('Category update failed', err));
  }

  /** UI helper for button coloring */
  btnClass(target: 'all' | 'pending' | 'approved') {
    return this.statusFilter === target
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  challengeSpaceTitle(space: ChallengePage): string {
    return (
      String(space.name || space.heading || '').trim() ||
      'Untitled challenge space'
    );
  }

  challengeSpaceKey(space: ChallengePage): string {
    return space.challengePageId || space.customUrl || this.challengeSpaceTitle(space);
  }

  get filteredFeaturedChallengeSpaces(): ChallengePage[] {
    const query = this.featuredSpaceSearch.trim().toLowerCase();
    const spaces = this.allChallengeSpaces;

    if (!query) {
      return spaces.slice(0, 8);
    }

    return spaces
      .filter((space) =>
        [
          this.challengeSpaceTitle(space),
          space.subHeading,
          space.description,
          space.customUrl,
          space.challengePageId,
        ]
          .map((value) => String(value || '').toLowerCase())
          .some((value) => value.includes(query))
      )
      .slice(0, 8);
  }

  onFeaturedSpaceSearchInput(): void {
    this.selectedFeaturedSpaceId = '';
    this.featuredSpaceMessage = '';
    this.featuredSpaceError = '';
    this.showFeaturedSpaceResults = true;
  }

  selectFeaturedChallengeSpace(space: ChallengePage): void {
    this.selectedFeaturedSpaceId = this.challengeSpaceKey(space);
    this.featuredSpaceSearch = this.challengeSpaceTitle(space);
    this.featuredSpaceMessage = '';
    this.featuredSpaceError = '';
    this.showFeaturedSpaceResults = false;
  }

  private syncFeaturedSearchLabel(): void {
    if (!this.selectedFeaturedSpaceId || !this.allChallengeSpaces.length) {
      return;
    }

    const selected = this.selectedFeaturedSpace;
    if (selected) {
      this.featuredSpaceSearch = this.challengeSpaceTitle(selected);
    }
  }

  get selectedFeaturedSpace(): ChallengePage | null {
    if (!this.selectedFeaturedSpaceId) {
      return null;
    }

    return (
      this.allChallengeSpaces.find(
        (space) => this.challengeSpaceKey(space) === this.selectedFeaturedSpaceId
      ) || null
    );
  }

  get currentFeaturedSpaceTitle(): string {
    const current = this.allChallengeSpaces.find(
      (space) =>
        this.challengeSpaceKey(space) ===
        (this.featuredSpaceConfig?.featuredSpaceId || '')
    );

    return (
      (current && this.challengeSpaceTitle(current)) ||
      this.featuredSpaceConfig?.featuredSpaceTitle ||
      'None'
    );
  }

  async saveFeaturedChallengeSpace(): Promise<void> {
    if (this.featuredSpaceSaving) return;

    this.featuredSpaceMessage = '';
    this.featuredSpaceError = '';

    const space = this.selectedFeaturedSpace;
    if (!space) {
      this.featuredSpaceError = 'Choose a challenge space to feature.';
      return;
    }

    this.featuredSpaceSaving = true;

    try {
      await this.challenges.setFeaturedChallengeSpace(space);
      this.featuredSpaceMessage = `${this.challengeSpaceTitle(space)} is now featured.`;
    } catch (error) {
      console.error('Unable to save featured challenge space', error);
      this.featuredSpaceError = 'Unable to save the featured space.';
    } finally {
      this.featuredSpaceSaving = false;
    }
  }

  async clearFeaturedChallengeSpace(): Promise<void> {
    if (this.featuredSpaceSaving) return;

    this.featuredSpaceMessage = '';
    this.featuredSpaceError = '';
    this.featuredSpaceSaving = true;

    try {
      await this.challenges.setFeaturedChallengeSpace(null);
      this.selectedFeaturedSpaceId = '';
      this.featuredSpaceSearch = '';
      this.showFeaturedSpaceResults = false;
      this.featuredSpaceMessage = 'No challenge space is featured now.';
    } catch (error) {
      console.error('Unable to clear featured challenge space', error);
      this.featuredSpaceError = 'Unable to clear the featured space.';
    } finally {
      this.featuredSpaceSaving = false;
    }
  }

  /** List actually shown in the template */
  get filteredSolutions(): Solution[] {
    if (this.statusFilter === 'all') return this.allSolutions;
    // strictly match 'pending' or 'approved' only
    return this.allSolutions.filter(
      (s) => s.statusForPublication === this.statusFilter
    );
  }

  /** Flip status and persist */
  togglePublication(sol: Solution): void {
    const newStatus =
      (sol.statusForPublication || 'pending') === 'approved'
        ? 'pending'
        : 'approved';

    // optimistic UI update
    sol.statusForPublication = newStatus;

    this.solution
      .submitSolutionForPublication(sol.solutionId!, sol) // you already have this method
      .catch((err) => {
        // rollback on error
        sol.statusForPublication =
          newStatus === 'approved' ? 'pending' : 'approved';
        console.error('Status update failed', err);
      });
  }
}
