// src/app/pages/join/join.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { SolutionService } from 'src/app/services/solution.service';
import { AuthService } from 'src/app/services/auth.service';
import { Subscription } from 'rxjs';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-join-solution',
  templateUrl: './join-solution.component.html',
  styleUrl: './join-solution.component.css',
})
export class JoinSolutionComponent implements OnInit, OnDestroy {
  solution: Solution = {};
  loading = true;
  joining = false;
  alreadyMember = false;
  sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private solutionService: SolutionService,
    public auth: AuthService,
    public data: DataService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.sub = this.solutionService.getSolution(id).subscribe((s: any) => {
      this.solution = s;
      this.loading = false;
      this.alreadyMember = !!s!.participants?.[this.auth.currentUser.email];
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
  // Add these helpers
  get designersCount(): number {
    // if you already build designersList, prefer that
    if (this.designersList && this.designersList.length)
      return this.designersList.length;

    // fallback to participants map
    const p = this.solution?.participants;
    return p ? Object.keys(p).length : 0;
  }

  get evaluatorsCount(): number {
    return this.solution?.evaluators ? this.solution.evaluators.length : 0;
  }

  async joinTeam() {
    if (this.alreadyMember || this.joining) return;
    this.joining = true;
    try {
      // await this.solutionService.addParticipant(
      //   this.solution.solutionId!,
      //   this.auth.currentUser.email
      // );
      this.alreadyMember = true;
      // Optionally navigate to dashboard/solution page:
      // this.router.navigate(['/solution-details', this.solution.solutionId]);
    } catch (e) {
      console.error(e);
      alert('Error joining team. Try again.');
    } finally {
      this.joining = false;
    }
  }

  get designersList() {
    // fall back to evaluators etc. depending on your data
    return (this.solution as any).teamMembers || []; // or build from participants map
  }

  get sdgs() {
    return this.solution!.sdgs || [];
  }

  // You can expose these to template if needed:
  trackByIndex(i: number) {
    return i;
  }
}
