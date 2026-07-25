import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Evaluator, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
    selector: 'app-solution-preview',
    templateUrl: './solution-preview.component.html',
    styleUrl: './solution-preview.component.css',
    standalone: false
})
export class SolutionPreviewComponent implements OnInit, OnDestroy {
  solutionId: any = '';
  edited: string = '';
  displayEditSolution: boolean = false;
  displayAddCommentPermission: boolean = false;
  displayDeleteSolution: boolean = false;
  confirmationEditSolution: boolean = false;
  confirmationDeleteSolution: boolean = false;
  currentSolution: Solution = {};
  otherSolutions: Solution[] = [];
  showPopUpTeam: boolean[] = [];
  isContributorOfThisSolution: boolean = false;
  iscreatorOfThisSolution: boolean = false;
  currentAuth: User = {};
  isCopied = false;
  currentUser: User = {};
  timeElapsed: string = '';
  evaluationSummary: any = {};
  colors: any = {};
  etAl: string = '';
  comments: any[] = [];
  commentUserProfilePicturePath: string[] = [];
  numberOfcomments: number = 0;
  commentTimeElapsed: string[] = [];
  comment: string = '';
  commentUserNames: string[] = [];
  commentAuthors: (User | null)[] = [];
  hoverTournament: boolean = false;
  evaluators: any[] = [];
  isLoading: boolean = false;
  isLoadingSolution = true;
  solutionAccessError = '';
  commentSaving = false;
  commentError = '';
  commentSuccess = '';
  returnTo = '/home';
  private solutionSub?: Subscription;
  private communityCommentsSub?: Subscription;

  hoverWinner: boolean = false;
  displayCongrats: boolean = false;
  submitDisplay: boolean = false;

  teamMembers: User[] = [];
  hoverShare: boolean = false;
  hoverLikes: boolean = false;
  displayEvaluationSummary: boolean = false;
  displaySharePost: boolean = false;

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private activatedRoute: ActivatedRoute,
    private time: TimeService,
    public data: DataService,
    public router: Router,
    private fns: AngularFireFunctions
  ) {}
  isLoggedIn: boolean = false;
  ngOnInit(): void {
    this.returnTo =
      this.activatedRoute.snapshot.queryParamMap.get('returnTo') || '/home';
    this.activatedRoute.paramMap.subscribe((params) => {
      this.solutionId = params.get('id');
      window.scroll(0, 0);

      this.loadSolutionData(this.solutionId);
    });
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }

  ngOnDestroy(): void {
    this.solutionSub?.unsubscribe();
    this.communityCommentsSub?.unsubscribe();
  }

  async initializeComments() {
    this.numberOfcomments = this.comments?.length || 0;
    this.commentTimeElapsed = [];
    this.commentUserNames = [];
    this.commentUserProfilePicturePath = [];
    this.commentAuthors = [];

    if (!this.comments || this.comments.length === 0) {
      return;
    }

    const userPromises = this.comments.map(async (comment: any, index: number) => {
      this.commentTimeElapsed[index] = this.commentTimeLabel(comment);

      if (!comment.authorId) {
        return null;
      }

      try {
        return await firstValueFrom(this.auth.getAUser(comment.authorId));
      } catch (error) {
        console.error('Unable to load comment author', error);
        return null;
      }
    });

    const users = await Promise.all(userPromises);
    users.forEach((user: User | null | undefined, index: number) => {
      const author = user || null;
      this.commentAuthors[index] = author;
      this.commentUserNames[index] = this.getCommentAuthorName(
        author,
        this.comments[index]
      );
      this.commentUserProfilePicturePath[index] =
        this.getUserAvatarUrl(author, this.comments[index]);
    });
  }

  private commentTimeLabel(comment: any): string {
    const date =
      comment?.createdAt?.toDate?.() ||
      (Number(comment?.createdAtMs)
        ? new Date(Number(comment.createdAtMs))
        : comment?.date && String(comment.date).includes('T')
        ? new Date(comment.date)
        : null);
    if (!date || Number.isNaN(date.getTime())) {
      return comment?.date ? this.time.timeAgo(comment.date) : '';
    }

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 45) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    });
  }

  getCommentAuthorName(user?: User | null, comment?: any): string {
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

    return (
      fullName ||
      user?.email ||
      comment?.authorName ||
      comment?.email ||
      'Global Solutions Lab member'
    );
  }

  getCommentAuthorInitials(user?: User | null, comment?: any): string {
    const name = this.getCommentAuthorName(user, comment);
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return 'NW';
  }

  getUserAvatarUrl(user?: User | null, comment?: any): string {
    return (
      user?.profilePicture?.downloadURL ||
      (user as any)?.profilePicPath ||
      comment?.authorAvatar ||
      ''
    );
  }

  getCommentAuthorRoute(user?: User | null): string[] | null {
    if (!user?.uid) {
      return null;
    }

    if (this.auth.currentUser?.uid && user.uid === this.auth.currentUser.uid) {
      return ['/profile'];
    }

    return ['/user-profile', user.uid];
  }

  getTeamMemberRoute(user?: User | null): string[] | null {
    return this.getCommentAuthorRoute(user);
  }

  getUserCount(
    user: User | null | undefined,
    countKey: 'followers' | 'following',
    arrayKey: 'followersArray' | 'followingArray'
  ): string | number {
    return (
      (user as any)?.[countKey] || (user as any)?.[arrayKey]?.length || 0
    );
  }

  loadSolutionData(solutionId: string): void {
    this.isLoadingSolution = true;
    this.solutionAccessError = '';
    this.solutionSub = this.solution
      .getSolutionForNonAuthenticatedUser(solutionId)
      .subscribe({
        next: (data: any) => {
        if (!data?.[0]) {
          this.isLoadingSolution = false;
          this.solutionAccessError =
            'This solution is unavailable or you no longer have access.';
          return;
        }
        this.currentSolution = data[0];
        if (this.currentSolution.authorEmail === this.auth.currentUser.email) {
          this.iscreatorOfThisSolution = true;
        }
        if (this.currentSolution.edited === 'true') {
          this.edited = ' (Edited)';
        }
        const activityDate =
          this.currentSolution.submissionDate ||
          this.currentSolution.creationDate ||
          '';
        this.timeElapsed = activityDate
          ? this.time.timeAgo(activityDate)
          : 'Recently active';
        this.evaluationSummary = this.data.mapEvaluationToNumeric(
          this.currentSolution.evaluationSummary!
        );
        this.colors = this.data.mapEvaluationToColors(
          this.currentSolution.evaluationSummary!
        );
        // fill the evaluator class
        this.currentSolution.evaluators?.forEach((ev: any) => {
          this.evaluators.push(ev);
          console.log('evaluators', this.evaluators);
        });
        this.etAl = this.solutionMemberEmails().length > 1 ? 'Et al' : '';
        this.comments = Array.isArray(this.currentSolution.comments)
          ? [...this.currentSolution.comments]
          : [];
        this.getMembers();
        this.watchCommunityComments();
        void this.initializeComments();
        this.isLoadingSolution = false;
      },
      error: (error) => {
        console.error('Unable to open solution', error);
        this.isLoadingSolution = false;
        this.solutionAccessError =
          'This solution is private, unavailable, or you no longer have access.';
      },
    });
  }

  getMembers() {
    this.teamMembers = [];
    for (const email of this.solutionMemberEmails()) {
      if (email === String(this.auth.currentUser?.email || '').toLowerCase()) {
        this.isContributorOfThisSolution = true;
      }

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

  goBackToCommunity(): void {
    void this.router.navigateByUrl(this.returnTo || '/home');
  }

  get isInDevelopment(): boolean {
    return this.currentSolution.finished !== 'true';
  }

  get hasCompiledContent(): boolean {
    return Boolean(
      String(this.currentSolution.content || '').replace(/<[^>]*>/g, '').trim()
    );
  }

  developmentAnswers(): Array<{ label: string; content: string }> {
    return Object.entries(this.currentSolution.status || {})
      .filter(([, value]) => String(value || '').trim())
      .map(([key, value], index) => ({
        label: this.humanizeAnswerKey(key, index),
        content: String(value),
      }));
  }

  private watchCommunityComments(): void {
    this.communityCommentsSub?.unsubscribe();
    this.communityCommentsSub = this.solution
      .watchCommunityComments(this.solutionId)
      .subscribe({
        next: (communityComments) => {
          const legacy = Array.isArray(this.currentSolution.comments)
            ? this.currentSolution.comments
            : [];
          this.comments = Array.from(
            new Map(
              [...legacy, ...communityComments].map((item: any, index) => [
                item.messageId ||
                  `${item.authorId || 'legacy'}_${item.date || index}_${index}`,
                item,
              ])
            ).values()
          );
          void this.initializeComments().then(() => this.scrollToLinkedComment());
        },
        error: (error) =>
          console.error('Unable to load community comments', error),
      });
  }

  private solutionMemberEmails(): string[] {
    if (Array.isArray(this.currentSolution.teamMemberEmails)) {
      return this.currentSolution.teamMemberEmails;
    }
    const values: any = this.currentSolution.participants;
    const entries = Array.isArray(values)
      ? values
      : values && typeof values === 'object'
      ? Object.values(values)
      : [];
    return entries
      .map((entry: any) =>
        String(
          typeof entry === 'string'
            ? entry
            : entry?.name ||
                entry?.email ||
                Object.values(entry || {})[0] ||
                ''
        )
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);
  }

  private humanizeAnswerKey(key: string, index: number): string {
    const clean = String(key || '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
    return clean
      ? clean.replace(/\b\w/g, (letter) => letter.toUpperCase())
      : `Development note ${index + 1}`;
  }

  private scrollToLinkedComment(): void {
    const messageId =
      this.activatedRoute.snapshot.queryParamMap.get('messageId');
    if (!messageId) return;
    setTimeout(() => {
      document
        .getElementById(`comment-${messageId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }
  onHoverImageTeam(index: number) {
    this.showPopUpTeam[index] = true;
  }
  onLeaveTeam(index: number) {
    this.showPopUpTeam[index] = false;
  }
  onHoverShare() {
    this.hoverShare = true;
  }
  onLeaveShare() {
    this.hoverShare = false;
  }
  onHoverLikes() {
    this.hoverLikes = true;
  }
  onLeaveLikes() {
    this.hoverLikes = false;
  }

  onHoverEvaluation() {
    this.displayEvaluationSummary = true;
  }
  onLeaveEvaluation() {
    this.displayEvaluationSummary = false;
  }
  onHoverTournament() {
    this.hoverTournament = true;
  }

  onLeaveTournament() {
    this.hoverTournament = false;
  }

  addLike() {
    this.currentSolution.likes =
      typeof this.currentSolution.likes === 'string' ||
      this.currentSolution.likes === undefined
        ? []
        : this.currentSolution.likes;
    if (
      this.currentSolution.likes !== undefined &&
      this.currentSolution.likes!.indexOf(this.auth.currentUser.uid) === -1
    ) {
      this.currentSolution.likes.push(this.auth.currentUser.uid);
      this.solution.addLikes(this.currentSolution);
    } else {
      this.currentSolution.likes = this.currentSolution.likes!.filter(
        (item) => {
          return item !== this.auth.currentUser.uid;
        }
      );
      this.solution.removeLikes(this.currentSolution);
    }
  }
  openSharetoSocialMedia() {
    this.displaySharePost = true;
  }

  onHoverWinner() {
    this.hoverWinner = true;
  }
  onLeaveWinner() {
    this.hoverWinner = false;
  }
  goToEvaluationSummary() {
    this.router.navigate([
      '/evaluation-summary/' + this.currentSolution.solutionId,
    ]);
  }
  closeSharePost() {
    this.displaySharePost = false;
  }
  share(social: string) {
    if (social === 'facebook') {
      const facebookUrl = `https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`;
      const encodedFacebookUrl = encodeURIComponent(facebookUrl);
      const facebookMessage = `Hi! I've recently developed a solution titled ${this.solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness.`;
      const encodedFacebookMessage = encodeURIComponent(facebookMessage);
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodedFacebookUrl}&quote=${encodedFacebookMessage}`;

      window.open(url, '_blank');
    } else if (social === 'twitter') {
      const message = `Hi! I've recently developed a Global Solutions Lab solution titled ${this.currentSolution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness`;
      const encodedMessage = encodeURIComponent(message);
      const url = `https://twitter.com/intent/tweet?url=https://new-worldgame.web.app/solution-view-external/${this.currentSolution.solutionId}&text=${encodedMessage}`;

      window.open(url, '_blank');
    } else if (social === 'email') {
      const url = `mailto:?subject=Global Solutions Lab Solution Invitation &body=Hi! I've recently developed a solution titled ${this.currentSolution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness! https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`;
      window.open(url, '_blank');
    } else if (social === 'linkedin') {
      const linkedInMessage = `Hi! I've recently developed a solution titled ${this.currentSolution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness. Check it out here: https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`;
      const encodedLinkedInMessage = encodeURIComponent(linkedInMessage);
      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLinkedInMessage}`;
      window.open(url, '_blank');
    } else {
      this.copyToClipboard();
    }
    this.solution.addNumShare(this.currentSolution);
  }
  copyToClipboard(): void {
    const listener = (e: ClipboardEvent) => {
      e.clipboardData!.setData(
        'text/plain',
        `https://new-worldgame.web.app/solution-view-external/${this.currentSolution.solutionId}`
      );
      e.preventDefault();
    };

    document.addEventListener('copy', listener);
    document.execCommand('copy');
    document.removeEventListener('copy', listener);
    this.isCopied = true;
    setTimeout(() => (this.isCopied = false), 2000); // Reset after 2 seconds
  }
  toggleEditSolution() {
    this.displayEditSolution = !this.displayEditSolution;
  }
  toggleConfirmationEditSolution() {
    this.confirmationEditSolution = !this.confirmationEditSolution;
  }
  toggleConfirmationDeleteSolution() {
    this.confirmationDeleteSolution = !this.confirmationDeleteSolution;
  }

  submitDeleteSolution() {
    this.solution.deleteSolution(this.currentSolution.solutionId!);
    this.toggleConfirmationDeleteSolution();
    this.router.navigate(['/home']);
  }

  submitEditSolution() {
    this.currentSolution.evaluators?.forEach((ev) => {
      ev.evaluated = 'false';
    });
    this.solution.editSolutionAfterInitialSubmission(
      this.currentSolution.solutionId!,
      this.currentSolution
    );
    this.toggleConfirmationEditSolution();
    this.router.navigate(['/dashboard', this.currentSolution.solutionId]);
  }

  updateEvaluationToNotEvaluated() {
    this.currentSolution.evaluators?.forEach((ev) => {
      ev.evaluated = 'false';
    });
  }

  async addComment() {
    if (!this.auth.currentUser) {
      this.displayAddCommentPermission = true;
      return;
    }
    const content = String(this.comment || '').trim();
    if (!content || this.commentSaving) return;

    this.commentSaving = true;
    this.commentError = '';
    this.commentSuccess = '';
    try {
      await this.solution.addCommunityComment(this.solutionId, content);
      this.comment = '';
      this.commentSuccess = 'Your comment was shared with the solution team.';
      setTimeout(() => (this.commentSuccess = ''), 3500);
    } catch (error: any) {
      console.error('Unable to add community comment', error);
      this.commentError =
        error?.message || 'Your comment could not be shared. Please try again.';
    } finally {
      this.commentSaving = false;
    }
  }
  sendEmailForCommentNotification() {
    const commentNotificationEmail = this.fns.httpsCallable(
      'commentNotificationEmail'
    );

    this.teamMembers.forEach((evaluator) => {
      const emailData = {
        email: evaluator.email,
        subject: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName} has commented on your Global Solutions Lab solution: ${this.currentSolution.title}`,
        // title: this.myForm.value.title,
        // description: this.myForm.value.description,
        path: `https://newworld-game.org/solution-view/${this.currentSolution.solutionId}`,
        // Include any other data required by your Cloud Function
      };

      commentNotificationEmail(emailData).subscribe(
        (result) => {
          console.log('Email sent:', result);
        },
        (error) => {
          console.error('Error sending email:', error);
        }
      );
    });
  }
  async finallySubmitSolution() {
    // check if one is submitting what was previously saved
    this.isLoading = true;
    try {
      this.solution.submitSolution(this.solutionId).then(() => {
        console.log('Submission successful, sending request for evaluation.');
        this.sendRequestForEvaluation();
        this.router.navigate(['/solution-view', this.solutionId]);
        // this.submissionComplete.emit(); // Emit event to parent
        // this.toggleCongrats();
        // Additional logic on successful submission
      });
    } catch (error) {
      alert('An error occured while submitting the solution. Try again');
      console.log(error);
    }
  }
  toggleSubmission() {
    this.submitDisplay = !this.submitDisplay;
  }
  sendRequestForEvaluation() {
    const solutionEvaluationInvite = this.fns.httpsCallable(
      'solutionEvaluationInvite'
    );
    // remove duplicate in evaluators
    const evaluatorSet = new Set();
    this.evaluators = this.evaluators.filter((evaluator) => {
      const duplicate = evaluatorSet.has(evaluator.name);
      evaluatorSet.add(evaluator.name);
      return !duplicate;
    });
    this.evaluators.forEach((evaluator) => {
      const emailData = {
        email: evaluator.name,
        subject: `You have been invited to evaluate the Global Solutions Lab solution: ...`,
        title: this.currentSolution.title,
        description: `${this.currentSolution.title} by ${this.currentSolution.authorName} ${this.etAl}`,
        path: `https://newworld-game.org/problem-feedback/${this.currentSolution.solutionId}`,
        // Include any other data required by your Cloud Function
      };

      solutionEvaluationInvite(emailData).subscribe(
        (result) => {
          console.log('Email sent:', result);
        },
        (error) => {
          console.error('Error sending email:', error);
        }
      );
    });
  }

  openFeedback() {
    const url =
      'https://docs.google.com/forms/d/e/1FAIpQLSdmK6F4EDAvXNZsuUBYdQ4CW1h9hIdlA44qYajMsmHBNa4jrQ/viewform?usp=sf_link';
    window.open(url, '_blank');
    this.toggleCongratsAndDone();
  }
  toggle(property: 'isLoading') {
    this[property] = !this[property];
  }
  toggleCongrats() {
    this.displayCongrats = !this.displayCongrats;
  }
  toggleCongratsAndDone() {
    this.displayCongrats = !this.displayCongrats;
    this.router.navigate(['/solution-view', this.solutionId]);
  }

  accept() {
    this.submitDisplay = false;

    this.finallySubmitSolution();
    // Reset submission response to allow future submissions, but only after current process is complete
  }

  async generatePdfFromHtml() {
    this.toggle('isLoading');
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    // --- 1) Build a new container with the logo, title, contributors, content ---
    const container = document.createElement('div');
    // Using Roboto Mono as requested
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '600px';
    container.style.padding = '20px';
    container.style.whiteSpace = 'normal';
    container.style.wordWrap = 'break-word';
    container.style.fontFamily = 'Roboto, monospace';
    container.style.lineHeight = '1.5';

    // -- (A) Insert the logo at the top --
    const logoImg = document.createElement('img');
    logoImg.src = '../../../assets/img/gsl-logo.png';
    logoImg.style.display = 'block';
    logoImg.style.margin = '0 auto 20px';
    logoImg.style.width = '80px';
    container.appendChild(logoImg);

    // -- (B) Add the Solution Title (big & bold) --
    const titleElement: any = document.createElement('h1');
    titleElement.textContent = this.currentSolution.title;
    titleElement.style.textAlign = 'center';
    titleElement.style.fontWeight = 'bold';
    titleElement.style.fontSize = '32px';
    titleElement.style.marginBottom = '20px';
    container.appendChild(titleElement);

    // -- (C) Display the contributors horizontally in bold italics --
    if (this.teamMembers && this.teamMembers.length > 0) {
      const contributorsContainer = document.createElement('div');
      contributorsContainer.style.textAlign = 'center';
      contributorsContainer.style.marginBottom = '20px';

      // Build the list of contributor names as bold+italic, separated by commas
      const contributorNames = this.teamMembers.map((member) => {
        return `<strong><em>${member.firstName} ${member.lastName}</em></strong>`;
      });
      contributorsContainer.innerHTML = `
        <span style="font-size: 16px;">
          Designers:
          ${contributorNames.join(', ')}
        </span>
      `;
      container.appendChild(contributorsContainer);
    }
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    const dateElement = document.createElement('div');
    dateElement.style.textAlign = 'center';
    dateElement.style.marginBottom = '20px';
    const dateStr = new Date().toLocaleDateString('en-US', dateOptions);
    dateElement.innerHTML = `<strong>${dateStr}</strong>`;
    container.appendChild(dateElement);

    // -- (D) Add a small horizontal rule (like a LaTeX section break) --
    const hrElement = document.createElement('hr');
    hrElement.style.margin = '20px 0';
    container.appendChild(hrElement);

    // -- (E) Add the existing solution content --
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = this.currentSolution.content!;
    container.appendChild(contentDiv);

    // -- Add the container to the DOM (off-screen) for rendering --
    document.body.appendChild(container);

    // --- 2) Wait for all images to load ---
    const images = Array.from(container.getElementsByTagName('img'));
    const loadPromises = images.map((img) => {
      return new Promise<void>((resolve, reject) => {
        img.crossOrigin = 'anonymous';
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => reject();
        }
      });
    });
    await Promise.allSettled(loadPromises);

    // --- 3) Render container to canvas using html2canvas ---
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
    });

    // Cleanup the DOM element
    document.body.removeChild(container);

    // --- 4) Prepare jsPDF (Letter size: 612 x 792 points) ---
    const pdf = new jsPDF('p', 'pt', 'letter');
    const marginLeft = 40;
    const marginTop = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale canvas to fit page width inside margins
    const usableWidth = pageWidth - marginLeft * 2;
    const pdfHeightUsable = pageHeight - marginTop * 2;
    const scaleFactor = usableWidth / canvas.width;
    const scaledCanvasHeight = canvas.height * scaleFactor;

    // Calculate total pages
    const totalPages = Math.ceil(scaledCanvasHeight / pdfHeightUsable);

    // --- 5) Slice the canvas into PDF pages ---
    let yOffset = 0;
    for (let page = 0; page < totalPages; page++) {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      const pageCanvasHeight = Math.min(
        canvas.height - yOffset,
        pdfHeightUsable / scaleFactor
      );
      pageCanvas.height = pageCanvasHeight;

      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) continue;

      pageCtx.drawImage(
        canvas,
        0,
        yOffset,
        canvas.width,
        pageCanvasHeight,
        0,
        0,
        canvas.width,
        pageCanvasHeight
      );

      const pageImgData = pageCanvas.toDataURL('image/png');

      if (page > 0) {
        pdf.addPage();
      }

      const chunkPdfHeight = pageCanvasHeight * scaleFactor;
      pdf.addImage(
        pageImgData,
        'PNG',
        marginLeft,
        marginTop,
        usableWidth,
        chunkPdfHeight
      );

      yOffset += pageCanvasHeight;
    }

    // If you want to open a preview:
    const pdfUrl = pdf.output('bloburl');
    window.open(pdfUrl, '_blank');
    this.toggle('isLoading');

    // Or directly save:
    // pdf.save(`${this.currentSolution.title}.pdf`);
  }

  getAvatarColor(uid: string): string {
    const colors = [
      '#4285F4', // blue
      '#DB4437', // red
      '#F4B400', // yellow
      '#0F9D58', // green
      '#AB47BC', // purple
      '#00ACC1', // cyan
      '#FF7043', // orange
    ];
    // pick a stable color by hashing uid
    const index =
      Math.abs(uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) %
      colors.length;
    return colors[index];
  }
}
