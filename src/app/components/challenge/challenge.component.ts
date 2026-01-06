import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-challenge',
  templateUrl: './challenge.component.html',
  styleUrl: './challenge.component.css',
})
export class ChallengeComponent implements OnInit {
  @Input() image: string = '';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() id: string = '';
  @Input() restricted: string = '';
  @Input() fromChallengeSpace: boolean = false;
  @Input() fit: 'cover' | 'contain' = 'cover';
  @Input() challengePageId: string = ''; // The workspace/challenge page ID

  currentSolution: Solution = {};
  user?: User = {};
  alreadyParticipant = false;
  isLoadingParticipantStatus = false;
  challengeText = 'Join Solution';
  constructor(
    private time: TimeService,
    public auth: AuthService,
    private solutionService: SolutionService,
    public data: DataService,
    private router: Router,
    private challenge: ChallengesService
  ) {}
  selectChallenge() {
    const selectedChallengeItem = {
      id: this.id,
      title: this.title,
      description: this.description,
      image: this.image,
      restricted: this.restricted,
    };

    this.challenge.setSelectedChallengeItem(selectedChallengeItem);

    this.router.navigate(['/start-challenge/']);
  }

  async selectChallengeSolution(): Promise<void> {
    /* ---------- 0) Guard: user must be logged‑in ---------- */
    const email = this.auth.currentUser.email?.trim().toLowerCase();
    if (!email) {
      alert('Please log in first.');
      return;
    }

    try {
      /* ---------- 1) Fetch the single solution once ---------- */
      const solution = await firstValueFrom(
        this.solutionService.getSolution(this.id) // ← observable
      );
      console.log('the solution id', this.id);

      if (!solution) {
        alert('No workspace exists for this challenge yet.');
        return;
      }

      /* ---------- 2) Join if the user is not a participant ---------- */
      const raw = solution.participants ?? [];
      const participants: { name: string }[] = Array.isArray(raw)
        ? [...raw]
        : Object.values(raw as Record<string, string>).map((e) => ({
            name: e,
          }));

      /* --- 2. add user if missing --- */
      if (!participants.some((p) => p.name.trim().toLowerCase() === email)) {
        await this.solutionService.joinSolution(solution, email);
      }

      /* ---------- 3) Navigate to the workspace ---------- */
      this.router.navigate(['/dashboard', solution.solutionId]);
    } catch (err) {
      console.error('Error opening workspace:', err);
      alert('Unable to open the workspace. Please try again.');
    }
  }

  isParticipant() {
    const email = this.auth.currentUser.email?.trim().toLowerCase();
    const raw = this.currentSolution.participants ?? [];
    const participants: { name: string }[] = Array.isArray(raw)
      ? [...raw]
      : Object.values(raw as Record<string, string>).map((e) => ({ name: e }));

    /* --- 2. add user if missing --- */
    return !participants.some((p) => p.name.trim().toLowerCase() === email);
  }

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    // Check participant status when component loads (only for challenge space view)
    if (this.fromChallengeSpace && this.id) {
      this.checkParticipantStatus();
    }
  }

  /**
   * Check if the current user is already a participant of this solution
   */
  async checkParticipantStatus(): Promise<void> {
    const email = this.auth.currentUser?.email?.trim().toLowerCase();
    if (!email) {
      this.alreadyParticipant = false;
      return;
    }

    this.isLoadingParticipantStatus = true;
    try {
      const solution = await firstValueFrom(
        this.solutionService.getSolution(this.id)
      );
      
      if (!solution) {
        this.alreadyParticipant = false;
        return;
      }

      this.currentSolution = solution;
      const raw = solution.participants ?? [];
      const participants: { name: string }[] = Array.isArray(raw)
        ? [...raw]
        : Object.values(raw as Record<string, string>).map((e) => ({
            name: e,
          }));

      this.alreadyParticipant = participants.some(
        (p) => p.name.trim().toLowerCase() === email
      );
    } catch (err) {
      console.error('Error checking participant status:', err);
      this.alreadyParticipant = false;
    } finally {
      this.isLoadingParticipantStatus = false;
    }
  }

  /**
   * View the solution without joining (for workspace participants)
   * This navigates to the dashboard with a special query param
   */
  viewSolution(): void {
    if (!this.id) {
      console.error('No solution ID available');
      return;
    }
    // Navigate to dashboard - user is already a participant
    this.router.navigate(['/dashboard', this.id]);
  }

  /**
   * Preview the solution without joining
   * This allows workspace members to view the dashboard without becoming participants
   */
  async previewSolution(): Promise<void> {
    if (!this.id) {
      console.error('No solution ID available');
      return;
    }
    // Navigate to dashboard with challengePageId so auth guard allows workspace participants
    this.router.navigate(['/dashboard', this.id], {
      queryParams: { challengePageId: this.challengePageId }
    });
  }
}
