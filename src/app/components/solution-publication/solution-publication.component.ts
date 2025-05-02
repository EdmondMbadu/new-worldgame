import { Component } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-solution-publication',
  templateUrl: './solution-publication.component.html',
  styleUrl: './solution-publication.component.css',
})
export class SolutionPublicationComponent {
  allSolutions: Solution[] = [];
  statusFilter: 'all' | 'pending' | 'approved' = 'all';
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
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
