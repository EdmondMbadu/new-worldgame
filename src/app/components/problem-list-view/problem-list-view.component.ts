import { Component, Input, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
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
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  private readonly timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  confirmationDeleteSolution: boolean = false;
  confirmationLeaveSolution: boolean = false;
  currentSolution?: Solution;
  pending: number = 0;
  /** 🆕 bound to the search box */
  searchTerm = '';
  viewMode: 'list' | 'grid' = 'grid';
  weeklyBriefSolutionId = '';
  weeklyBriefSavingId = '';
  weeklyBriefMessage = '';
  weeklyBriefError = '';
  weeklyBriefFromEmailLink = false;

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private router: Router,
    private afs: AngularFirestore,
    private route: ActivatedRoute
  ) {
    solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.solutions = data;
      console.log('all solutions I am in', this.solutions);
      this.findPendingSolutions();
    });
  }
  ngOnInit(): void {
    window.scroll(0, 0);
    this.route.queryParamMap.subscribe((params) => {
      this.weeklyBriefFromEmailLink = params.get('weeklyBrief') === '1';
    });
    this.auth.getObservableUser().subscribe((user) => {
      if (!user) return;
      this.weeklyBriefSolutionId = user.weeklyBriefSolutionId || '';
    });
  }
  @Input() title: string = 'problemListView.tabs.pending';

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

  isWeeklyBriefSelected(solution: Solution): boolean {
    return !!solution.solutionId && solution.solutionId === this.weeklyBriefSolutionId;
  }

  get weeklyBriefSelectedSolution(): Solution | undefined {
    if (!this.weeklyBriefSolutionId) {
      return undefined;
    }
    return this.pendingSolutions.find(
      (solution) => solution.solutionId === this.weeklyBriefSolutionId
    );
  }

  async saveWeeklyBriefSolution(solution: Solution, event?: Event) {
    event?.stopPropagation();
    this.weeklyBriefMessage = '';
    this.weeklyBriefError = '';

    if (!solution.solutionId) {
      this.weeklyBriefError = 'This solution cannot be selected yet.';
      return;
    }

    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.weeklyBriefError = 'Please sign in again before saving your weekly brief choice.';
      return;
    }

    this.weeklyBriefSavingId = solution.solutionId;
    try {
      const title = solution.title || 'Untitled Solution';
      await this.afs.doc(`users/${uid}`).set(
        {
          weeklyBriefSolutionId: solution.solutionId,
          weeklyBriefSolutionTitle: title,
          weeklyBriefSolutionUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      this.weeklyBriefSolutionId = solution.solutionId;
      this.auth.currentUser.weeklyBriefSolutionId = solution.solutionId;
      this.auth.currentUser.weeklyBriefSolutionTitle = title;
      this.weeklyBriefMessage = `${title} is now your weekly brief solution.`;
    } catch (error: any) {
      console.error('Unable to save weekly brief solution', error);
      this.weeklyBriefError =
        error?.message || 'Unable to save your weekly brief solution right now.';
    } finally {
      this.weeklyBriefSavingId = '';
    }
  }

  saveWeeklyBriefSolutionById(solutionId: string) {
    if (!solutionId) {
      void this.clearWeeklyBriefSolution();
      return;
    }
    const solution = this.pendingSolutions.find(
      (item) => item.solutionId === solutionId
    );
    if (!solution) {
      return;
    }
    void this.saveWeeklyBriefSolution(solution);
  }

  async clearWeeklyBriefSolution(event?: Event) {
    event?.stopPropagation();
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    this.weeklyBriefMessage = '';
    this.weeklyBriefError = '';
    this.weeklyBriefSavingId = '__clear__';
    try {
      await this.afs.doc(`users/${uid}`).set(
        {
          weeklyBriefSolutionId: '',
          weeklyBriefSolutionTitle: '',
          weeklyBriefSolutionUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      this.weeklyBriefSolutionId = '';
      this.auth.currentUser.weeklyBriefSolutionId = '';
      this.auth.currentUser.weeklyBriefSolutionTitle = '';
      this.weeklyBriefMessage =
        'Weekly brief choice cleared. The weekly sender will use its fallback rule.';
    } catch (error: any) {
      console.error('Unable to clear weekly brief solution', error);
      this.weeklyBriefError =
        error?.message || 'Unable to clear your weekly brief solution right now.';
    } finally {
      this.weeklyBriefSavingId = '';
    }
  }

  getSolutionDate(solution: Solution): string {
    const raw =
      solution.creationDate ||
      solution.createdAt ||
      solution.updatedAt ||
      solution.submissionDate;
    return this.formatFriendlyDate(raw);
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
    const text = solution.description ?? solution.content;
    if (typeof text !== 'string') {
      return 'No description provided yet.';
    }
    const withoutTags = text.replace(/<[^>]*>/g, ' ');
    const normalized = withoutTags.replace(/\s+/g, ' ').trim();
    if (!normalized || /^(true|false|null|undefined)$/i.test(normalized)) {
      return 'No description provided yet.';
    }
    return normalized.length > 160
      ? `${normalized.slice(0, 157)}…`
      : normalized;
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

  private formatFriendlyDate(raw: unknown): string {
    if (raw === undefined || raw === null) {
      return 'Date unavailable';
    }
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      return this.composeDate(raw, true);
    }
    if (typeof raw === 'object' && 'seconds' in (raw as any)) {
      const seconds = Number((raw as any).seconds);
      const nanoseconds = Number((raw as any).nanoseconds ?? 0);
      const date = new Date(seconds * 1000 + nanoseconds / 1e6);
      if (!isNaN(date.getTime())) {
        return this.composeDate(date, true);
      }
    }
    const value = String(raw).trim();
    if (!value) {
      return 'Date unavailable';
    }
    const parsed = this.normalizeDate(value);
    if (!parsed) {
      return value;
    }
    return this.composeDate(
      parsed,
      this.containsTimeInformation(value, parsed)
    );
  }

  private normalizeDate(raw: string): Date | undefined {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      const ms = raw.length === 10 ? numeric * 1000 : numeric;
      const date = new Date(ms);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    let date = new Date(raw);
    if (!isNaN(date.getTime())) {
      return date;
    }

    const patternMDY = raw.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})(?:-(\d{1,2})-(\d{1,2})-(\d{1,2}))?$/
    );
    if (patternMDY) {
      const [, month, day, year, hour, minute, second] = patternMDY;
      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour ? Number(hour) : 0,
        minute ? Number(minute) : 0,
        second ? Number(second) : 0
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    const patternYMD = raw.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:-(\d{1,2})-(\d{1,2})-(\d{1,2}))?$/
    );
    if (patternYMD) {
      const [, year, month, day, hour, minute, second] = patternYMD;
      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour ? Number(hour) : 0,
        minute ? Number(minute) : 0,
        second ? Number(second) : 0
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    const patternSlash = raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/
    );
    if (patternSlash) {
      const [, month, day, year, hour, minute] = patternSlash;
      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour ? Number(hour) : 0,
        minute ? Number(minute) : 0
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }

  private containsTimeInformation(raw: string, date: Date): boolean {
    if (/(\d{1,2}:\d{2})/.test(raw) || raw.includes('T')) {
      return true;
    }
    if (raw.split('-').length >= 5) {
      return true;
    }
    return (
      date.getHours() !== 0 ||
      date.getMinutes() !== 0 ||
      date.getSeconds() !== 0
    );
  }

  private composeDate(date: Date, includeTime: boolean): string {
    const datePart = this.dateFormatter.format(date);
    if (!includeTime) {
      return datePart;
    }
    return `${datePart} · ${this.timeFormatter.format(date)}`;
  }
}
