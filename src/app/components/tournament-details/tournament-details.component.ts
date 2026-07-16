// tournament-details.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, filter } from 'rxjs/operators';
import { Tournament } from 'src/app/models/tournament';
import { Solution } from 'src/app/models/solution';
import { TournamentService } from 'src/app/services/tournament.service';
import { SolutionService } from 'src/app/services/solution.service';
import { AuthService } from 'src/app/services/auth.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { firstValueFrom, of } from 'rxjs';

@Component({
    selector: 'app-tournament-details',
    templateUrl: './tournament-details.component.html',
    styleUrls: ['./tournament-details.component.css'],
    standalone: false
})
export class TournamentDetailsComponent implements OnInit {
  t?: Tournament;
  completedSolutions: Solution[] = [];
  isAuthor = false;
  isPostDeadline = false;
  uploadBusy = false;
  /* NEW state */
  solutions: Solution[] = [];
  pickerOpen = false;
  submitBusy = false;

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

    this.route.paramMap
      .pipe(switchMap((p) => this.tourneySvc.getById(p.get('id')!)))
      .subscribe((t) => {
        if (!t) {
          this.router.navigate(['/active-tournaments']);
          return;
        }
        this.t = t;
        this.currentWinnerId = t.winningSolution || undefined;

        /* is the logged-in user the author? */
        this.isAuthor = t.authorId === this.auth.currentUser.uid;

        /* is deadline in the past? */
        this.isPostDeadline = new Date() > new Date(t.deadline ?? '');
        this.solSvc.getAuthenticatedUserAllSolutions().subscribe((sols) => {
          this.solutions = sols.filter((s) => s.finished === 'true');
        });
        /* load solutions if any */
        if (t.submittedSolutions?.length) {
          this.solSvc.getMany(t.submittedSolutions).subscribe((sols) => {
            this.completedSolutions = sols;
          });
        }
      });
  }

  get canEdit(): boolean {
    return this.isAuthor && this.t?.status !== 'approved';
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
    this.pickerOpen = !this.pickerOpen;
  }
  /** AUTHOR-ONLY – upload extra reference file */
  async addReferenceFile(fileList: FileList | null) {
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
    if (this.submitBusy) {
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

      /* update local list immediately */
      this.completedSolutions.push(sol);
      this.pickerOpen = false;
    } finally {
      this.submitBusy = false;
    }
  }

  /** NAV */
  submitFinishedSolution() {
    this.router.navigate(['/submit-solution', this.t!.tournamentId]);
  }
  createNewSolution() {
    this.router.navigate(['/create-solution']);
  }

  async unsubmitSolution(sol: Solution) {
    if (this.submitBusy) {
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
      !this.isPostDeadline && // ⬅️ must still be open
      (this.isAuthor || // tournament owner
        sol.authorAccountId === this.auth.currentUser.uid) // solution owner
    );
  }
  /*  New: choose / clear winner  */
  async chooseWinner(sol: Solution) {
    if (!this.isAuthor || !this.isPostDeadline) {
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
    if (!this.isAuthor || !this.isPostDeadline) {
      return;
    }

    await this.tourneySvc.setWinningSolution(this.t!.tournamentId!, null);
    this.currentWinnerId = undefined;
  }
  async deleteTournament() {
    if (!this.canEdit) return;
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
}
