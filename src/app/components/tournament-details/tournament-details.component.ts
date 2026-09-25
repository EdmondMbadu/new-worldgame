// tournament-details.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, map, shareReplay, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Tournament } from 'src/app/models/tournament';
import { Solution } from 'src/app/models/solution';
import { TournamentService } from 'src/app/services/tournament.service';
import { SolutionService } from 'src/app/services/solution.service';
import { AuthService } from 'src/app/services/auth.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { BehaviorSubject, combineLatest, EMPTY, firstValueFrom, of, Subject } from 'rxjs';
import { isSolutionOwner } from 'src/app/utils/solution-ownership';
import { tournamentEntryIds } from 'src/app/utils/tournament-entries';

@Component({
    selector: 'app-tournament-details',
    templateUrl: './tournament-details.component.html',
    styleUrls: ['./tournament-details.component.css'],
    standalone: false
})
export class TournamentDetailsComponent implements OnInit, OnDestroy {
  t?: Tournament;
  completedSolutions: Solution[] = [];
  isAuthor = false;
  isPostDeadline = false;
  uploadBusy = false;
  isLoading = true;
  loadError = false;
  entriesLoading = true;
  entriesError = false;
  pickerLoading = false;
  pickerError = false;
  solutions: Solution[] = [];
  pickerOpen = false;
  submitBusy = false;
  isAuthenticated = false;
  private readonly destroy$ = new Subject<void>();
  private readonly reload$ = new BehaviorSubject(0);
  private readonly retryEntries$ = new BehaviorSubject(0);
  private readonly pickerRequested$ = new BehaviorSubject(false);
  private viewerId = '';

  editing = false;
  tempTitle = '';
  tempSubtitle = '';
  tempInstr = '';
  tempEligibility = '';
  tempSubmissionRequirements = '';
  tempJudgingCriteria = '';
  tempAwardLabel = '';
  tempAwardPurpose = '';
  tempIntellectualProperty = '';
  tempCallToAction = '';
  tempPrizeOther = '';
  tempDeadline = '';
  tempPrizeAmount = '';
  currentWinnerId?: string;
  constructor(
    private route: ActivatedRoute,
    private tourneySvc: TournamentService,
    private solSvc: SolutionService,
    private storage: AngularFireStorage,
    public auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    const viewer$ = this.auth.user$.pipe(
      map((viewer) => viewer?.uid || ''),
      distinctUntilChanged(),
      tap((uid) => {
        this.viewerId = uid;
        this.isAuthenticated = !!uid;
        this.isAuthor = !!uid && this.t?.authorId === uid;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    const tournament$ = combineLatest([
      this.route.paramMap.pipe(map((p) => p.get('id')!), distinctUntilChanged()),
      this.reload$,
    ]).pipe(
      switchMap(([id]) => {
        this.isLoading = true;
        this.loadError = false;
        this.t = undefined;
        this.completedSolutions = [];
        this.pickerOpen = false;
        this.pickerRequested$.next(false);
        return this.tourneySvc.getById(id).pipe(
          tap((t) => {
            this.isLoading = false;
            if (!t) {
              void this.router.navigate(['/active-tournaments']);
              return;
            }
            this.t = { ...t, tournamentId: t.tournamentId || id };
            this.currentWinnerId = t.winningSolution || undefined;
            this.isAuthor = !!this.viewerId && t.authorId === this.viewerId;
            this.isPostDeadline = new Date() > new Date(t.deadline ?? '');
          }),
          catchError(() => {
            this.isLoading = false;
            this.loadError = true;
            return EMPTY;
          }),
          startWith(undefined)
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Render the tournament without waiting for auth or the entry queries.
    tournament$.pipe(takeUntil(this.destroy$)).subscribe();
    const entryRequest$ = tournament$.pipe(
      map((t) => ({ tournamentId: t?.tournamentId, ids: tournamentEntryIds(t?.submittedSolutions) })),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );
    combineLatest([entryRequest$, viewer$, this.retryEntries$]).pipe(
      switchMap(([{ ids }, uid]) => {
        this.entriesLoading = true;
        this.entriesError = false;
        this.completedSolutions = [];
        return this.solSvc.getTournamentSolutions(ids, !!uid).pipe(
          catchError(() => {
            this.entriesError = true;
            return of(null);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((solutions) => {
      this.completedSolutions = solutions ?? [];
      this.entriesLoading = false;
    });

    // A visitor reading the tournament does not need their four personal-solution queries.
    combineLatest([viewer$, this.pickerRequested$]).pipe(
      switchMap(([uid, requested]) => {
        this.pickerError = false;
        this.pickerLoading = !!uid && requested;
        if (!uid || !requested) return of([] as Solution[]);
        return this.solSvc.getAuthenticatedUserAllSolutions().pipe(
          map((solutions) => solutions.filter((s) => s.finished === 'true')),
          catchError(() => {
            this.pickerError = true;
            return of([] as Solution[]);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((solutions) => {
      this.solutions = solutions;
      this.pickerLoading = false;
    });
  }

  retry(): void {
    this.reload$.next(this.reload$.value + 1);
  }

  retryEntries(): void {
    this.retryEntries$.next(this.retryEntries$.value + 1);
  }

  retryPicker(): void {
    this.pickerRequested$.next(true);
  }

  get availableSolutions(): Solution[] {
    const submittedIds = new Set(tournamentEntryIds(this.t?.submittedSolutions));
    return this.solutions.filter((solution) => !submittedIds.has(solution.solutionId!));
  }

  trackSolution(index: number, solution: Solution): string | number {
    return solution.solutionId || index;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canEdit(): boolean {
    return (
      this.isAuthenticated &&
      this.isAuthor &&
      this.t?.status !== 'approved'
    );
  }

  get aboutText(): string {
    return this.t?.about || this.t?.instruction || '';
  }

  get awardLabel(): string {
    return this.t?.awardLabel || 'Prize';
  }

  get closingCallToAction(): string {
    return (
      this.t?.callToAction ||
      `Submit your completed solution before the deadline and show what your idea can achieve.`
    );
  }

  formatAward(value?: string): string {
    const raw = (value ?? '').trim();
    if (!raw) return 'To be announced';
    if (raw.includes('$') || /[a-z]/i.test(raw)) return raw;

    const amount = Number(raw.replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(amount)) return raw;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  startEdit() {
    if (!this.canEdit) return;
    this.editing = true;
    this.tempTitle = this.t!.title!;
    this.tempSubtitle = this.t!.subtTitle ?? '';
    this.tempInstr = this.aboutText;
    this.tempEligibility = (this.t!.eligibility ?? []).join('\n');
    this.tempSubmissionRequirements = (
      this.t!.submissionRequirements ?? []
    ).join('\n');
    this.tempJudgingCriteria = (this.t!.judgingCriteria ?? []).join('\n');
    this.tempAwardLabel = this.awardLabel;
    this.tempAwardPurpose = this.t!.awardPurpose ?? '';
    this.tempIntellectualProperty = this.t!.intellectualProperty ?? '';
    this.tempCallToAction = this.t!.callToAction ?? '';
    this.tempPrizeOther = this.t!.prizeOther ?? '';
    this.tempDeadline = this.t!.deadline!; // YYYY-MM-DD
    this.tempPrizeAmount = this.t!.prizeAmount ?? '';
  }
  async saveEdit() {
    if (!this.canEdit) return;
    this.editing = false;
    Object.assign(this.t!, {
      title: this.tempTitle.trim(),
      subtTitle: this.tempSubtitle.trim(),
      instruction: this.tempInstr.trim(),
      about: this.tempInstr.trim(),
      eligibility: this.lines(this.tempEligibility),
      submissionRequirements: this.lines(this.tempSubmissionRequirements),
      judgingCriteria: this.lines(this.tempJudgingCriteria),
      awardLabel: this.tempAwardLabel.trim(),
      awardPurpose: this.tempAwardPurpose.trim(),
      intellectualProperty: this.tempIntellectualProperty.trim(),
      callToAction: this.tempCallToAction.trim(),
      prizeOther: this.tempPrizeOther.trim(),
      deadline: this.tempDeadline, // ISO-date from <input type="date">
      prizeAmount: this.tempPrizeAmount.trim(),
    });

    /* 2️⃣ persist to Firestore  */
    await this.tourneySvc.updateTournament(this.t!.tournamentId!, {
      title: this.t!.title,
      subtTitle: this.t!.subtTitle,
      instruction: this.t!.instruction,
      about: this.t!.about,
      eligibility: this.t!.eligibility,
      submissionRequirements: this.t!.submissionRequirements,
      judgingCriteria: this.t!.judgingCriteria,
      awardLabel: this.t!.awardLabel,
      awardPurpose: this.t!.awardPurpose,
      intellectualProperty: this.t!.intellectualProperty,
      callToAction: this.t!.callToAction,
      prizeOther: this.t!.prizeOther,
      deadline: this.t!.deadline,
      prizeAmount: this.t!.prizeAmount,
    });
  }

  cancelEdit() {
    this.editing = false;
  }

  scrollToDetails(): void {
    document
      .getElementById('tournament-information')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private lines(value: string): string[] {
    return (value ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  /* UI toggle */
  openSolutionPicker() {
    if (!this.requireLogin()) return;
    this.pickerOpen = !this.pickerOpen;
    this.pickerRequested$.next(this.pickerOpen);
  }
  /** AUTHOR-ONLY – upload extra reference file */
  async addReferenceFile(fileList: FileList | null) {
    if (!this.requireLogin() || !this.isAuthor) return;
    const file = fileList?.item(0);
    if (!file || file.size > 20_000_000) {
      return;
    }

    this.uploadBusy = true;
    const path = `tournament_refs/${Date.now()}_${file.name}`;
    const task = await this.storage.upload(path, file);
    const url = await task.ref.getDownloadURL();

    const files = this.t?.files ?? [];
    files.push(url);
    await this.tourneySvc.updateFiles(this.t!.tournamentId!, files);

    /* refresh local state */
    this.t!.files = files;
    this.uploadBusy = false;
  }
  /* user clicked a solution chip */
  async attachSolution(sol: Solution) {
    if (!this.requireLogin() || this.submitBusy ||
        tournamentEntryIds(this.t?.submittedSolutions).includes(sol.solutionId!)) {
      return;
    }
    this.submitBusy = true;

    try {
      await this.tourneySvc.addSubmittedSolution(
        this.t!.tournamentId!,
        sol.solutionId!
      );
      const authorEmail = this.t!.authorEmail
        ? this.t!.authorEmail
        : (await firstValueFrom(this.auth.getAUser(this.t!.authorId!)))?.email;
      let evaluators = sol.evaluators ?? [];
      const alreadyThere = evaluators.some(
        (e: any) => e.name?.toLowerCase() === authorEmail!.toLowerCase()
      );

      if (!alreadyThere) {
        evaluators = [...evaluators, { name: authorEmail }];

        await this.solSvc.addEvaluatorsToSolution(evaluators, sol.solutionId!);
      }

      // The live entry query owns the list, avoiding a duplicate when it updates before this write finishes.
      this.pickerOpen = false;
      this.pickerRequested$.next(false);
    } finally {
      this.submitBusy = false;
    }
  }

  /** NAV */
  submitFinishedSolution() {
    if (!this.requireLogin()) return;
    this.router.navigate(['/submit-solution', this.t!.tournamentId]);
  }
  createNewSolution() {
    if (!this.requireLogin()) return;
    this.router.navigate(['/create-solution']);
  }

  async unsubmitSolution(sol: Solution) {
    if (!this.requireLogin() || !this.canUnsubmit(sol) || this.submitBusy) {
      return;
    }
    this.submitBusy = true;

    try {
      await this.tourneySvc.removeSubmittedSolution(
        this.t!.tournamentId!,
        sol.solutionId!
      );
      const authorEmail = this.t!.authorEmail
        ? this.t!.authorEmail
        : (await firstValueFrom(this.auth.getAUser(this.t!.authorId!)))?.email;
      if (authorEmail && sol.evaluators?.length) {
        const updated = sol.evaluators.filter(
          (e: any) => e.name?.toLowerCase() !== authorEmail.toLowerCase()
        );

        // Only write if something actually changed
        if (updated.length !== sol.evaluators.length) {
          await this.solSvc.addEvaluatorsToSolution(updated, sol.solutionId!);
        }
      }
      // remove locally
      this.completedSolutions = this.completedSolutions.filter(
        (s) => s.solutionId !== sol.solutionId
      );
    } finally {
      this.submitBusy = false;
    }
  }
  /* Replace the helper with this */
  canUnsubmit(sol: Solution): boolean {
    return (
      this.isAuthenticated &&
      !this.isPostDeadline && // ⬅️ must still be open
      (this.isAuthor || // tournament owner
        isSolutionOwner(sol, this.auth.currentUser)) // solution owner
    );
  }
  /*  New: choose / clear winner  */
  async chooseWinner(sol: Solution) {
    if (!this.requireLogin() || !this.isAuthor || !this.isPostDeadline) {
      alert('You are not the author or the deadline is not yet set');
      return;
    }

    const newId = sol.solutionId!;
    if (this.currentWinnerId === newId) {
      return;
    } // already set

    await this.tourneySvc.setWinningSolution(this.t!.tournamentId!, newId);
    this.currentWinnerId = newId;
  }

  async clearWinner() {
    if (!this.requireLogin() || !this.isAuthor || !this.isPostDeadline) {
      return;
    }

    await this.tourneySvc.setWinningSolution(this.t!.tournamentId!, null);
    this.currentWinnerId = undefined;
  }
  async deleteTournament() {
    if (!this.requireLogin() || !this.canEdit) return;
    if (!confirm('Delete this tournament? This cannot be undone.')) return;

    await this.tourneySvc.deleteTournament(this.t!.tournamentId!);
    this.router.navigate(['/your-tournaments']);
  }
  /* +++ utility to strip full URL/path → just “report.pdf” */
  fileName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  /* +++ extension for badge / icon hint */
  fileExt(path: string): string {
    return (this.fileName(path).split('.').pop() ?? '').toLowerCase();
  }

  /* +++ dynamic Tailwind colour by extension */
  fileBadgeColour(path: string): string {
    switch (this.fileExt(path)) {
      case 'pdf':
        return 'bg-red-600';
      case 'doc':
      case 'docx':
        return 'bg-blue-600';
      case 'xls':
      case 'xlsx':
        return 'bg-emerald-600';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'bg-indigo-600';
      default:
        return 'bg-gray-500';
    }
  }

  solutionViewRoute(solution: Solution): any[] {
    return this.isAuthenticated
      ? ['/solution-view', solution.solutionId]
      : ['/solution-preview', solution.solutionId];
  }

  private requireLogin(): boolean {
    if (this.isAuthenticated && this.auth.currentUser?.uid) return true;

    const returnUrl = this.router.url;
    this.auth.setRedirectUrl(returnUrl);
    sessionStorage.setItem('redirectTo', returnUrl);
    void this.router.navigate(['/login']);
    return false;
  }
}
