import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-problem-list-view',
  templateUrl: './problem-list-view.component.html',
  styleUrls: ['./problem-list-view.component.css'],
})
export class ProblemListViewComponent implements OnInit {
  solutions: Solution[] = [];
  pendingSolutions: Solution[] = [];
  gradientPalette = [
    'from-sky-500 via-indigo-500 to-purple-500',
    'from-emerald-500 via-cyan-500 to-blue-500',
    'from-orange-500 via-rose-500 to-pink-500',
    'from-amber-500 via-yellow-500 to-lime-500',
    'from-fuchsia-500 via-purple-500 to-blue-500',
    'from-blue-500 via-slate-500 to-neutral-600',
  ];

  confirmationDeleteSolution: boolean = false;
  confirmationLeaveSolution: boolean = false;
  currentSolution?: Solution;
  pending: number = 0;
  /** 🆕 bound to the search box */
  searchTerm = '';
  viewMode: 'list' | 'grid' = 'list';

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private router: Router
  ) {
    solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.solutions = data;
      console.log('all solutions I am in', this.solutions);
      this.findPendingSolutions();
    });
  }
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  @Input() title: string = `Pending Solutions`;

  async findPendingSolutions() {
    this.pendingSolutions = [];

    for (let s of this.solutions) {
      if (s.finished === undefined || s.finished !== 'true') {
        this.pendingSolutions.push(s);
      }
    }
    this.pending = this.pendingSolutions.length;
  }
  toggleConfirmationDeleteSolution() {
    console.log('button clicked ');
    this.confirmationDeleteSolution = !this.confirmationDeleteSolution;
  }
  toggleConfirmationLeaveSolution() {
    this.confirmationLeaveSolution = !this.confirmationLeaveSolution;
  }
  submitDeleteSolution() {
    this.solution.deleteSolution(this.currentSolution!.solutionId!);
    this.toggleConfirmationDeleteSolution();
    this.router.navigate(['/home']);
  }

  submitLeaveSolution() {
    this.removeParticipantFromSolution(this.auth.currentUser.email!);
  }
  removeParticipantFromSolution(email: string) {
    // Ensure participants array exists
    if (
      (this.currentSolution && !this.currentSolution.participants) ||
      !Array.isArray(this.currentSolution!.participants)
    ) {
      alert('No participants found!');
      return;
    }

    // Filter out the participant to be removed
    const updatedParticipants = this.currentSolution!.participants.filter(
      (participant: any) => participant.name !== email
    );

    // Update the solution's participants
    this.solution
      .addParticipantsToSolution(
        updatedParticipants,
        this.currentSolution!.solutionId!
      )
      .then(() => {
        alert(`Successfully removed ${email} from the solution.`);
        this.toggleConfirmationLeaveSolution();
        // this.router.navigate(['/home']);
      })
      .catch((error) => {
        console.error('Error occurred while removing a team member:', error);
        alert('Error occurred while removing a team member. Try again!');
      });
  }

  receiveConfirmationDelete(eventData: Solution) {
    this.currentSolution = eventData;
    this.toggleConfirmationDeleteSolution();
  }

  receiveLeaveSolution(eventData: Solution) {
    this.currentSolution = eventData;
    this.toggleConfirmationLeaveSolution();
  }
  isSidebarOpen = true;

  /** search */
  get filteredPendingSolutions(): Solution[] {
    const t = this.searchTerm.trim().toLowerCase();
    return !t
      ? this.pendingSolutions
      : this.pendingSolutions.filter((s) => s.title?.toLowerCase().includes(t));
  }

  toggleAside() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  setViewMode(mode: 'list' | 'grid') {
    this.viewMode = mode;
  }

  openSolution(solution: Solution) {
    if (!solution.solutionId) {
      return;
    }
    this.router.navigate(['/dashboard', solution.solutionId]);
  }

  getSolutionDate(solution: Solution): string {
    const raw =
      solution.creationDate ||
      solution.createdAt ||
      solution.updatedAt ||
      solution.submissionDate;
    if (!raw) {
      return 'Date unavailable';
    }
    const date = new Date(raw);
    if (isNaN(date.getTime())) {
      return raw;
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  participantCount(solution: Solution): number {
    const participants = solution.participants;
    if (!participants) {
      return 0;
    }
    if (Array.isArray(participants)) {
      return participants.length;
    }
    return Object.keys(participants).length;
  }

  previewText(solution: Solution): string {
    const text = solution.preview || solution.description || solution.content;
    if (!text) {
      return 'No description provided yet.';
    }
    const trimmed = text.trim();
    return trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed;
  }

  getCardAccent(index: number): string {
    return this.gradientPalette[index % this.gradientPalette.length];
  }

  tileInitial(solution: Solution): string {
    const title = solution.title?.trim();
    if (title) {
      return title[0].toUpperCase();
    }
    const author = solution.authorName?.trim();
    if (author) {
      return author[0].toUpperCase();
    }
    return 'S';
  }
}
