import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Evaluation, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Component({
  selector: 'app-problem-feedback',
  templateUrl: './problem-feedback.component.html',
  styleUrls: ['./problem-feedback.component.css'],
})
export class ProblemFeedbackComponent implements OnInit, OnDestroy {
  user: User = {};
  id: any;
  solutionId: string = '';
  displayTableEvaluator: boolean[] = [];
  private readonly destroy$ = new Subject<void>();

  teamMembers: User[] = [];
  timeElapsed: string = '';
  submitDisplay: boolean = false;
  comment: string = '';
  hasZeroScores = false;

  sendFeedback: boolean = false;
  evaluationSummary: Evaluation = {};
  evaluationDetails: Evaluation[] = [];
  userId: string = '';
  submitError: string | null = null;
  submissionSucceeded = false;
  isLoggedIn = false;
  guestMode = false;
  guestName = '';
  guestEmail = '';
  commentRequired = false;
  guestNameRequired = false;
  guestEmailInvalid = false;
  isSubmitting = false;
  disabled = false;
  max = 10;
  min = 0;
  showTicks = true;
  step = 1;
  thumbLabel = false;
  value = 0;
  average: number = 0;
  evaluationArray: string[] = [
    'Achieve Preferred State',
    'Technologically Feasible',
    'Ecologically positive',
    'Economical',
    'Equitable',
    'Understandable',
  ];
  evaluation: Evaluation = {};
  evaluators: any = {};
  comments: any[] = [];

  values: number[] = this.evaluationArray.map((data) => {
    return 0;
  });

  userSolution: Solution = {};
  ngOnInit(): void {
    window.scroll(0, 0);

    this.auth.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: User | null) => {
        this.isLoggedIn = !!user?.uid;
        if (user) {
          this.user = user;
        }
      });
  }
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    private time: TimeService,
    private router: Router,
    private fns: AngularFireFunctions
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    this.solution.getSolution(this.id).subscribe((data) => {
      this.userSolution = data!;
      if (data?.evaluationDetails !== undefined) {
        this.evaluationDetails = data?.evaluationDetails!;
      }

      this.timeElapsed = this.time.timeAgo(data?.submissionDate!);
      this.getMembers();
      this.comments = this.userSolution.comments!;
    });
    this.displayTableEvaluator = new Array(6).fill(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getMembers() {
    if (!this.userSolution.participants) return;

    for (const key in this.userSolution.participants) {
      let participant = this.userSolution.participants[key];
      let email = Object.values(participant)[0];
      this.auth.getUserFromEmail(email).subscribe((data) => {
        // Check if the email of the incoming data is already in the teamMembers
        if (
          data &&
          data[0] &&
          !this.teamMembers.some((member) => member.email === data[0].email)
        ) {
          this.teamMembers.push(data[0]);
        }
      });
    }
  }

  scrollToFeedbackSection() {
    document
      .getElementById('feedback-form-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  continueAsGuest() {
    this.guestMode = true;
    this.submissionSucceeded = false;
    this.submitError = null;

    setTimeout(() => {
      document.getElementById('guest-name-input')?.focus();
    }, 0);
  }

  goToLoginForFeedback() {
    const redirectTo = this.router.url;
    this.auth.setRedirectUrl(redirectTo);
    sessionStorage.setItem('redirectTo', redirectTo);
    this.router.navigate(['/login'], { queryParams: { redirectTo } });
  }

  makeSureBeforeSubmit() {
    this.submissionSucceeded = false;
    this.submitError = null;
    this.commentRequired = this.comment.trim().length === 0;

    if (this.commentRequired) {
      this.scrollToFeedbackSection();
      return;
    }

    this.guestNameRequired = false;
    this.guestEmailInvalid = false;

    if (!this.isLoggedIn) {
      if (!this.guestMode) {
        this.scrollToFeedbackSection();
        return;
      }

      this.guestNameRequired = this.guestName.trim().length === 0;
      this.guestEmailInvalid = !this.isValidEmail(this.guestEmail);

      if (this.guestNameRequired || this.guestEmailInvalid) {
        this.scrollToFeedbackSection();
        return;
      }
    }

    this.hasZeroScores = this.values.some((v) => v === 0);
    this.submitDisplay = true;
  }
  async submitEvaluation() {
    this.evaluation = this.mapNumbersToEvaluation(this.values);

    const nextEvaluationDetails = [...this.evaluationDetails, this.evaluation];
    const nextEvaluationSummary =
      this.calculateAverageEvaluation(nextEvaluationDetails);
    const nextEvaluationCount = (
      Number(this.userSolution.numberofTimesEvaluated || '0') + 1
    ).toString();

    const updatedSolution: Solution = {
      ...this.userSolution,
      evaluationSummary: nextEvaluationSummary,
      evaluationDetails: nextEvaluationDetails,
      numberofTimesEvaluated: nextEvaluationCount,
      evaluators: this.buildUpdatedEvaluators(),
    };

    try {
      await this.solution.addEvaluation(updatedSolution);
      this.userSolution = updatedSolution;
      this.evaluationDetails = nextEvaluationDetails;
      this.evaluationSummary = nextEvaluationSummary;
      this.submissionSucceeded = true;
      this.comment = '';
      this.submitError = null;
      this.sendSolutionEvaluationCompleteEmail();
    } catch (error) {
      this.submitError = 'submit_failed';
      console.error('An error occurred while submitting the evaluation.', error);
      throw error;
    }
  }

  buildUpdatedEvaluators() {
    const existingEvaluators = [...(this.userSolution.evaluators || [])];

    if (!this.isLoggedIn || !this.auth.currentUser?.email) {
      return existingEvaluators;
    }

    return existingEvaluators.map((element) => {
      if (element.name === this.auth.currentUser.email) {
        return { ...element, evaluated: 'true' };
      }
      return element;
    });
  }

  mapNumbersToEvaluation(numbers: number[]): Evaluation {
    if (numbers.length !== 6) {
      throw new Error('Expected an array of 7 numbers.');
    }

    let average = this.findAverage(this.values);
    const guestSubmission = !this.isLoggedIn;
    const currentUser = this.auth.currentUser;
    const evaluatorName = guestSubmission
      ? this.guestName.trim()
      : this.getLoggedInDisplayName();
    const evaluatorEmail = guestSubmission
      ? this.guestEmail.trim()
      : currentUser?.email || '';

    return {
      evaluatorId: guestSubmission
        ? `guest-${Date.now()}`
        : currentUser?.uid || `user-${Date.now()}`,
      evaluatorName,
      evaluatorEmail,
      isGuest: guestSubmission,
      createdAtMs: Date.now(),
      average: average.toString(),
      achievable: numbers[0].toString(),
      feasible: numbers[1].toString(),
      ecological: numbers[2].toString(),
      economical: numbers[3].toString(),
      equitable: numbers[4].toString(),
      understandable: numbers[5].toString(),
      comment: this.comment.trim(),
      evaluator: guestSubmission
        ? ({
            firstName: evaluatorName,
            email: evaluatorEmail,
          } as User)
        : ({
            uid: currentUser?.uid,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
            email: currentUser?.email,
            profilePicture: currentUser?.profilePicture,
          } as User),
    };
  }

  findAverage(values: number[]) {
    return (this.average = Math.ceil(
      values.reduce((x, y) => x + y) / values.length
    ));
  }

  calculateAverageEvaluation(evaluations: Evaluation[]): Evaluation {
    const keys: (keyof Evaluation)[] = [
      'achievable',
      'feasible',
      'ecological',
      'economical',
      'equitable',
      'understandable',
    ];

    const sums = keys.reduce<{ [key in keyof Evaluation]?: number }>(
      (acc, key) => {
        acc[key] = evaluations.reduce((sum, ev) => sum + Number(ev[key]), 0);
        return acc;
      },
      {}
    );

    const averages = Object.fromEntries(
      Object.entries(sums).map(([key, value]) => [
        key,
        Math.ceil(value! / evaluations.length),
      ])
    );

    const average = Math.ceil(
      keys.reduce((sum, key) => sum + (averages[key] ?? 0), 0) / keys.length
    );

    return {
      evaluatorId: 'aggregate',
      average: average.toString(),
      ...Object.fromEntries(
        Object.entries(averages).map(([key, value]) => [key, value!.toString()])
      ),
    };
  }
  closeSubmission() {
    this.submitDisplay = false;
  }
  async accept() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.sendFeedback = true;

    try {
      await this.submitEvaluation();
      this.closeSubmission();
    } finally {
      this.isSubmitting = false;
    }
  }
  sendSolutionEvaluationCompleteEmail() {
    const solutionEvaluationComplete = this.fns.httpsCallable(
      'solutionEvaluationComplete'
    );
    const submitterName = this.getSubmitterDisplayName();

    this.teamMembers.forEach((team) => {
      const emailData = {
        email: team.email,
        subject: `${submitterName} has evaluated your solution: ${this.userSolution.title}`,
        // title: this.myForm.value.title,
        // description: this.myForm.value.description,
        path: `https://newworld-game.org/evaluation-summary/${this.userSolution.solutionId}`,
        // Include any other data required by your Cloud Function
      };

      solutionEvaluationComplete(emailData).subscribe(
        (result) => {
          console.log('Email sent:', result);
        },
        (error) => {
          console.error('Error sending email:', error);
        }
      );
    });
  }
  openPopups(index: number) {
    this.displayTableEvaluator[index] = true;
  }
  onHoverPopup(index: number) {
    this.displayTableEvaluator[index] = !this.displayTableEvaluator[index];
  }
  onLeavePopup(index: number) {
    this.displayTableEvaluator[index] = !this.displayTableEvaluator[index];
  }
  showWelcomeModal = true;

  closeModal() {
    this.showWelcomeModal = false;
  }

  openEvaluationGuide() {
    // e.g. open link in new tab
    // windoow open router evaluation guide
    // windown open a local path
    window.open('/evaluators', '_blank');
    // window.open('https://yourGuideUrl...', '_blank');
    this.closeModal();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private getLoggedInDisplayName(): string {
    const firstName = this.auth.currentUser?.firstName || '';
    const lastName = this.auth.currentUser?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || this.auth.currentUser?.email || 'Authenticated user';
  }

  private getSubmitterDisplayName(): string {
    if (!this.isLoggedIn) {
      return this.guestName.trim() || 'A guest evaluator';
    }

    return this.getLoggedInDisplayName();
  }
}
