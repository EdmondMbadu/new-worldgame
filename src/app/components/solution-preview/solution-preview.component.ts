import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Evaluator, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';
import {
  detectSupportedContentLanguage,
  normalizeSupportedContentLanguage,
  shouldOfferContentTranslation,
  SupportedContentLanguage,
} from './solution-content-language';

type SolutionPreviewContentView = 'latest' | 'draft' | 'published';
type ContentTranslationLanguage = SupportedContentLanguage;

interface CommunityContentTranslation {
  translations: Record<string, string>;
  sourceLanguage: string;
  targetLanguage: ContentTranslationLanguage;
  alreadyInTargetLanguage: boolean;
  cacheHit: boolean;
}

interface CommentTranslationState {
  loading: boolean;
  showOriginal: boolean;
  errorKey: string;
  result?: CommunityContentTranslation;
}

interface SolutionPreviewAnswer {
  key: string;
  label: string;
  content: string;
}

interface SolutionPreviewSection {
  step: number;
  title: string;
  description: string;
  icon: string;
  total: number;
  answers: SolutionPreviewAnswer[];
}

const SOLUTION_STEP_SECTIONS: Array<
  Omit<SolutionPreviewSection, 'answers' | 'total' | 'title' | 'description'> & {
    titleKey: string;
    descriptionKey: string;
    questions: Array<{ key: string; labelKey: string }>;
  }
> = [
  {
    step: 1,
    titleKey: 'solutionPreview.steps.step1.title',
    descriptionKey: 'solutionPreview.steps.step1.description',
    icon: 'search_insights',
    questions: [
      { key: 'S1-A', labelKey: 'solutionPreview.steps.questions.S1-A' },
      { key: 'S1-B', labelKey: 'solutionPreview.steps.questions.S1-B' },
      { key: 'S1-C', labelKey: 'solutionPreview.steps.questions.S1-C' },
      { key: 'S1-D', labelKey: 'solutionPreview.steps.questions.S1-D' },
    ],
  },
  {
    step: 2,
    titleKey: 'solutionPreview.steps.step2.title',
    descriptionKey: 'solutionPreview.steps.step2.description',
    icon: 'flag',
    questions: [
      { key: 'S2-A', labelKey: 'solutionPreview.steps.questions.S2-A' },
      { key: 'S2-B', labelKey: 'solutionPreview.steps.questions.S2-B' },
    ],
  },
  {
    step: 3,
    titleKey: 'solutionPreview.steps.step3.title',
    descriptionKey: 'solutionPreview.steps.step3.description',
    icon: 'lightbulb',
    questions: [
      { key: 'S3-A', labelKey: 'solutionPreview.steps.questions.S3-A' },
      { key: 'S3-B', labelKey: 'solutionPreview.steps.questions.S3-B' },
      { key: 'S3-C', labelKey: 'solutionPreview.steps.questions.S3-C' },
      { key: 'S3-D', labelKey: 'solutionPreview.steps.questions.S3-D' },
      {
        key: 'S3-E',
        labelKey: 'solutionPreview.steps.questions.S3-E',
      },
    ],
  },
  {
    step: 4,
    titleKey: 'solutionPreview.steps.step4.title',
    descriptionKey: 'solutionPreview.steps.step4.description',
    icon: 'account_tree',
    questions: [
      { key: 'S4-A', labelKey: 'solutionPreview.steps.questions.S4-A' },
      { key: 'S4-B', labelKey: 'solutionPreview.steps.questions.S4-B' },
      { key: 'S4-C', labelKey: 'solutionPreview.steps.questions.S4-C' },
      { key: 'S4-D', labelKey: 'solutionPreview.steps.questions.S4-D' },
      { key: 'S4-E', labelKey: 'solutionPreview.steps.questions.S4-E' },
      { key: 'S4-F', labelKey: 'solutionPreview.steps.questions.S4-F' },
      { key: 'S4-G', labelKey: 'solutionPreview.steps.questions.S4-G' },
      { key: 'S4-H', labelKey: 'solutionPreview.steps.questions.S4-H' },
      { key: 'S4-I', labelKey: 'solutionPreview.steps.questions.S4-I' },
      { key: 'S4-J', labelKey: 'solutionPreview.steps.questions.S4-J' },
      { key: 'S4-K', labelKey: 'solutionPreview.steps.questions.S4-K' },
      { key: 'S4-L', labelKey: 'solutionPreview.steps.questions.S4-L' },
      { key: 'S4-M', labelKey: 'solutionPreview.steps.questions.S4-M' },
      { key: 'S4-N', labelKey: 'solutionPreview.steps.questions.S4-N' },
    ],
  },
];

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
  activePreviewView: SolutionPreviewContentView = 'latest';
  developmentSections: SolutionPreviewSection[] = [];
  solutionTranslationLoading = false;
  solutionTranslationErrorKey = '';
  private solutionTranslations = new Map<
    string,
    CommunityContentTranslation
  >();
  private solutionOriginalKeys = new Set<string>();
  private commentTranslationStates = new Map<
    string,
    CommentTranslationState
  >();
  private detectedSolutionLanguages = new Map<
    SolutionPreviewContentView,
    SupportedContentLanguage | null
  >();
  isDiscussionInView = false;
  private commentReturnScrollY = 0;
  private discussionObserver?: IntersectionObserver;
  private discussionObserverSetupTimer?: ReturnType<typeof setTimeout>;
  private previewViewSolutionId = '';
  private solutionSub?: Subscription;
  private communityCommentsSub?: Subscription;
  private languageSub?: Subscription;

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
    private fns: AngularFireFunctions,
    private ngZone: NgZone,
    private translate: TranslateService
  ) {}
  isLoggedIn: boolean = false;

  get isGuest(): boolean {
    return !this.isLoggedIn;
  }

  ngOnInit(): void {
    this.languageSub = this.translate.onLangChange.subscribe(() => {
      if (this.currentSolution?.solutionId) {
        this.refreshPreviewContentModel();
      }
    });
    this.returnTo =
      this.activatedRoute.snapshot.queryParamMap.get('returnTo') || '/home';
    this.activatedRoute.paramMap.subscribe(async (params) => {
      this.solutionId = params.get('id');
      window.scroll(0, 0);
      const user = await this.auth.getCurrentUserPromise();
      this.isLoggedIn = !!user?.uid;
      this.loadSolutionData(this.solutionId);
    });
  }

  ngOnDestroy(): void {
    this.solutionSub?.unsubscribe();
    this.communityCommentsSub?.unsubscribe();
    this.languageSub?.unsubscribe();
    this.discussionObserver?.disconnect();
    if (this.discussionObserverSetupTimer) {
      clearTimeout(this.discussionObserverSetupTimer);
    }
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

    if (!this.isLoggedIn) {
      this.comments.forEach((comment: any, index: number) => {
        this.commentTimeElapsed[index] = this.commentTimeLabel(comment);
        this.commentAuthors[index] = null;
        this.commentUserNames[index] = this.getCommentAuthorName(null, comment);
        this.commentUserProfilePicturePath[index] =
          this.getUserAvatarUrl(null, comment);
      });
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
    this.solutionTranslations.clear();
    this.solutionOriginalKeys.clear();
    this.commentTranslationStates.clear();
    this.solutionTranslationErrorKey = '';
    this.iscreatorOfThisSolution = false;
    this.isContributorOfThisSolution = false;
    this.teamMembers = [];
    this.evaluators = [];
    this.comments = [];

    if (!this.isLoggedIn) {
      void this.loadPublicSolutionData(solutionId);
      return;
    }

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
          this.applyLoadedSolution(data[0], false);
        },
      error: (error) => {
        console.error('Unable to open solution', error);
        this.isLoadingSolution = false;
        this.solutionAccessError =
          'This solution is private, unavailable, or you no longer have access.';
      },
    });
  }

  private async loadPublicSolutionData(solutionId: string): Promise<void> {
    try {
      const solution =
        await this.solution.getPublicCommunitySolutionPreview(solutionId);
      if (!solution) {
        this.solutionAccessError = 'This community solution is not available.';
        this.isLoadingSolution = false;
        return;
      }
      this.applyLoadedSolution(solution, true);
    } catch (error) {
      console.error('Unable to open public community solution', error);
      this.isLoadingSolution = false;
      this.solutionAccessError =
        'This community solution is private or no longer available.';
    }
  }

  private applyLoadedSolution(
    loadedSolution: Solution,
    publicGuestView: boolean
  ): void {
    this.currentSolution = loadedSolution;
    this.refreshPreviewContentModel();
    if (
      !publicGuestView &&
      this.currentSolution.authorEmail === this.auth.currentUser?.email
    ) {
      this.iscreatorOfThisSolution = true;
    }
    this.edited = this.currentSolution.edited === 'true' ? ' (Edited)' : '';
    const activityDate =
      this.currentSolution.submissionDate ||
      this.currentSolution.creationDate ||
      '';
    this.timeElapsed = activityDate
      ? this.time.timeAgo(activityDate)
      : 'Recently active';
    this.evaluationSummary = this.data.mapEvaluationToNumeric(
      this.currentSolution.evaluationSummary || {}
    );
    this.colors = this.data.mapEvaluationToColors(
      this.currentSolution.evaluationSummary || {}
    );
    this.currentSolution.evaluators?.forEach((evaluator: any) => {
      this.evaluators.push(evaluator);
    });
    const memberCount = publicGuestView
      ? Number(this.currentSolution.publicMemberCount || 1)
      : this.solutionMemberEmails().length;
    this.etAl = memberCount > 1 ? 'Et al' : '';
    this.comments = Array.isArray(this.currentSolution.comments)
      ? [...this.currentSolution.comments]
      : [];

    if (!publicGuestView) {
      this.getMembers();
      this.watchCommunityComments();
    }
    void this.initializeComments();
    this.isLoadingSolution = false;
    this.setupDiscussionObserver();

    if (
      this.activatedRoute.snapshot.queryParamMap.get('focus') === 'discussion'
    ) {
      setTimeout(() => this.scrollToDiscussion(), 0);
    }
  }

  private redirectToLogin(focusDiscussion = false): void {
    const tree = this.router.parseUrl(this.router.url);
    if (focusDiscussion) {
      tree.queryParams = {
        ...tree.queryParams,
        focus: 'discussion',
      };
    }
    const redirectTo = this.router.serializeUrl(tree);
    this.auth.setRedirectUrl(redirectTo);
    sessionStorage.setItem('redirectTo', redirectTo);
    void this.router.navigate(['/login'], {
      queryParams: { redirectTo },
    });
  }

  signInToComment(): void {
    this.redirectToLogin(true);
  }

  signInToTranslate(): void {
    this.redirectToLogin(false);
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

  scrollToDiscussion(): void {
    const discussion = document.getElementById('solution-discussion');
    if (!discussion) return;

    this.commentReturnScrollY = window.scrollY || 0;
    discussion.scrollIntoView({
      behavior: this.preferredScrollBehavior(),
      block: 'start',
    });
  }

  scrollBackToSolution(): void {
    if (this.commentReturnScrollY > 0) {
      window.scrollTo({
        top: this.commentReturnScrollY,
        behavior: this.preferredScrollBehavior(),
      });
      return;
    }

    document
      .getElementById('solution-reading-start')
      ?.scrollIntoView({
        behavior: this.preferredScrollBehavior(),
        block: 'start',
      });
  }

  get isInDevelopment(): boolean {
    return this.currentSolution.finished !== 'true';
  }

  get hasCompiledContent(): boolean {
    return this.hasMeaningfulContent(this.currentSolution.content);
  }

  get hasLatestWork(): boolean {
    return this.developmentSections.length > 0;
  }

  get hasTeamDraft(): boolean {
    return this.hasMeaningfulContent(this.currentSolution.strategyReview);
  }

  get hasAnyPreviewContent(): boolean {
    return (
      this.hasLatestWork ||
      this.hasTeamDraft ||
      this.hasCompiledContent ||
      this.hasMeaningfulContent(this.currentSolution.description)
    );
  }

  get previewViewCount(): number {
    return [
      this.hasLatestWork,
      this.hasTeamDraft,
      this.hasCompiledContent,
    ].filter(Boolean).length;
  }

  get isDraftBehindSteps(): boolean {
    const stepsUpdatedAt = this.timestampMillis(
      this.currentSolution.stepsUpdatedAt
    );
    const reviewedAgainstStepsAt = this.timestampMillis(
      this.currentSolution.strategyReviewReviewedAgainstStepsAt
    );
    const draftUpdatedAt =
      reviewedAgainstStepsAt ||
      this.timestampMillis(this.currentSolution.draftUpdatedAt);
    return (
      this.currentSolution.strategyReviewSyncStatus === 'attention' ||
      stepsUpdatedAt > 0 &&
      draftUpdatedAt > 0 &&
      stepsUpdatedAt > draftUpdatedAt
    );
  }

  get isPublishedSnapshotBehind(): boolean {
    if (!this.isInDevelopment) return false;

    const publishedAt = this.timestampMillis(
      this.currentSolution.publishedContentUpdatedAt
    );
    const latestSourceAt = Math.max(
      this.timestampMillis(this.currentSolution.stepsUpdatedAt),
      this.timestampMillis(this.currentSolution.draftUpdatedAt)
    );
    return publishedAt > 0 && latestSourceAt > publishedAt;
  }

  selectPreviewView(view: SolutionPreviewContentView): void {
    if (
      (view === 'latest' && !this.hasLatestWork) ||
      (view === 'draft' && !this.hasTeamDraft) ||
      (view === 'published' && !this.hasCompiledContent)
    ) {
      return;
    }
    this.activePreviewView = view;
    this.solutionTranslationErrorKey = '';
  }

  get contentTargetLanguage(): ContentTranslationLanguage {
    const language = String(
      this.translate.currentLang || this.translate.defaultLang || 'en'
    ).toLowerCase();
    return language.startsWith('fr') ? 'fr' : 'en';
  }

  get contentTargetLanguageName(): string {
    return this.translate.instant(
      `solutionPreview.translation.languages.${this.contentTargetLanguage}`
    );
  }

  get activeSolutionSourceLanguage(): SupportedContentLanguage | null {
    return (
      normalizeSupportedContentLanguage(
        this.activeSolutionTranslation?.sourceLanguage
      ) ||
      this.detectedSolutionLanguages.get(this.activePreviewView) ||
      null
    );
  }

  get shouldOfferSolutionTranslation(): boolean {
    return shouldOfferContentTranslation(
      this.activeSolutionSourceLanguage,
      this.contentTargetLanguage,
      this.isSolutionAlreadyInTargetLanguage
    );
  }

  get activeSolutionTranslation(): CommunityContentTranslation | undefined {
    return this.solutionTranslations.get(this.activeSolutionTranslationKey);
  }

  get isShowingSolutionTranslation(): boolean {
    const result = this.activeSolutionTranslation;
    return (
      !!result &&
      !result.alreadyInTargetLanguage &&
      !this.solutionOriginalKeys.has(this.activeSolutionTranslationKey)
    );
  }

  get isSolutionAlreadyInTargetLanguage(): boolean {
    return !!this.activeSolutionTranslation?.alreadyInTargetLanguage;
  }

  get translatedSourceLanguageName(): string {
    const sourceLanguage = this.activeSolutionTranslation?.sourceLanguage;
    if (!sourceLanguage) return '';
    const key = `solutionPreview.translation.languages.${sourceLanguage}`;
    const translated = this.translate.instant(key);
    return translated === key ? sourceLanguage.toUpperCase() : translated;
  }

  get displayedOriginalLanguageName(): string {
    return (
      this.translatedSourceLanguageName ||
      this.translate.instant('solutionPreview.translation.original')
    );
  }

  async translateActiveSolutionView(): Promise<void> {
    const translationKey = this.activeSolutionTranslationKey;
    const existing = this.solutionTranslations.get(translationKey);
    if (existing) {
      this.solutionOriginalKeys.delete(translationKey);
      return;
    }
    if (this.solutionTranslationLoading) return;

    this.solutionTranslationLoading = true;
    this.solutionTranslationErrorKey = '';
    try {
      const callable = this.fns.httpsCallable('translateCommunityContent');
      const result = (await firstValueFrom(
        callable({
          solutionId: this.solutionId,
          contentType: 'solution',
          view: this.activePreviewView,
          targetLanguage: this.contentTargetLanguage,
        })
      )) as CommunityContentTranslation;
      this.solutionTranslations.set(translationKey, result);
      if (result.alreadyInTargetLanguage) {
        this.solutionOriginalKeys.add(translationKey);
      } else {
        this.solutionOriginalKeys.delete(translationKey);
      }
    } catch (error: any) {
      console.error('Unable to translate solution content', error);
      this.solutionTranslationErrorKey = this.translationErrorKey(error);
    } finally {
      this.solutionTranslationLoading = false;
    }
  }

  showOriginalSolution(): void {
    this.solutionOriginalKeys.add(this.activeSolutionTranslationKey);
  }

  showTranslatedSolution(): void {
    this.solutionOriginalKeys.delete(this.activeSolutionTranslationKey);
  }

  displayedSolutionTitle(): string {
    return this.solutionTranslatedValue(
      'title',
      String(this.currentSolution.title || '')
    );
  }

  displayedSolutionDescription(): string {
    return this.solutionTranslatedValue(
      'description',
      String(this.currentSolution.description || '')
    );
  }

  displayedAnswerContent(answer: SolutionPreviewAnswer): string {
    return this.solutionTranslatedValue(
      `answer:${answer.key}`,
      answer.content
    );
  }

  displayedNarrativeContent(
    view: 'draft' | 'published'
  ): string {
    const original =
      view === 'draft'
        ? this.currentSolution.strategyReview
        : this.currentSolution.content;
    return this.solutionTranslatedValue(view, String(original || ''));
  }

  commentTranslationState(
    comment: any,
    index: number
  ): CommentTranslationState | undefined {
    return this.commentTranslationStates.get(
      this.commentTranslationKey(comment, index)
    );
  }

  displayedCommentContent(comment: any, index: number): string {
    const state = this.commentTranslationState(comment, index);
    if (
      state?.result &&
      !state.result.alreadyInTargetLanguage &&
      !state.showOriginal
    ) {
      return state.result.translations['comment'] || comment.content || '';
    }
    return String(comment?.content || '');
  }

  async translateComment(comment: any, index: number): Promise<void> {
    const key = this.commentTranslationKey(comment, index);
    const existing = this.commentTranslationStates.get(key);
    if (existing?.result) {
      existing.showOriginal = false;
      existing.errorKey = '';
      return;
    }
    if (existing?.loading) return;

    const state: CommentTranslationState = {
      loading: true,
      showOriginal: false,
      errorKey: '',
    };
    this.commentTranslationStates.set(key, state);

    try {
      const callable = this.fns.httpsCallable('translateCommunityContent');
      const result = (await firstValueFrom(
        callable({
          solutionId: this.solutionId,
          contentType: 'comment',
          commentId: String(comment?.messageId || ''),
          legacyCommentIndex: comment?.messageId ? null : index,
          targetLanguage: this.contentTargetLanguage,
        })
      )) as CommunityContentTranslation;
      state.result = result;
      state.showOriginal = result.alreadyInTargetLanguage;
    } catch (error: any) {
      console.error('Unable to translate comment', error);
      state.errorKey = this.translationErrorKey(error);
    } finally {
      state.loading = false;
    }
  }

  toggleCommentOriginal(comment: any, index: number): void {
    const state = this.commentTranslationState(comment, index);
    if (!state?.result) return;
    state.showOriginal = !state.showOriginal;
  }

  commentIsTranslated(comment: any, index: number): boolean {
    const state = this.commentTranslationState(comment, index);
    return (
      !!state?.result &&
      !state.result.alreadyInTargetLanguage &&
      !state.showOriginal
    );
  }

  commentIsAlreadyInTargetLanguage(comment: any, index: number): boolean {
    return !!this.commentTranslationState(comment, index)?.result
      ?.alreadyInTargetLanguage;
  }

  private get activeSolutionTranslationKey(): string {
    return `${this.activePreviewView}:${this.contentTargetLanguage}`;
  }

  private solutionTranslatedValue(key: string, original: string): string {
    if (!this.isShowingSolutionTranslation) return original;
    return this.activeSolutionTranslation?.translations[key] || original;
  }

  private commentTranslationKey(comment: any, index: number): string {
    return `${String(comment?.messageId || `legacy-${index}`)}:${
      this.contentTargetLanguage
    }`;
  }

  private translationErrorKey(error: any): string {
    const code = String(error?.code || error?.details?.code || '');
    if (code.includes('resource-exhausted')) {
      return 'solutionPreview.translation.errors.limit';
    }
    if (code.includes('aborted')) {
      return 'solutionPreview.translation.errors.inProgress';
    }
    if (code.includes('permission-denied')) {
      return 'solutionPreview.translation.errors.access';
    }
    return 'solutionPreview.translation.errors.unavailable';
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

  trackDevelopmentSection(
    _index: number,
    section: SolutionPreviewSection
  ): number {
    return section.step;
  }

  trackDevelopmentAnswer(
    _index: number,
    answer: SolutionPreviewAnswer
  ): string {
    return answer.key;
  }

  private refreshPreviewContentModel(): void {
    const status = this.currentSolution.status || {};
    this.developmentSections = SOLUTION_STEP_SECTIONS.map((section) => ({
      step: section.step,
      title: this.translate.instant(section.titleKey),
      description: this.translate.instant(section.descriptionKey),
      icon: section.icon,
      total: section.questions.length,
      answers: section.questions
        .map((question) => ({
          key: question.key,
          label: this.translate.instant(question.labelKey),
          content: String(status[question.key] || ''),
        }))
        .filter((answer) => this.hasMeaningfulContent(answer.content)),
    })).filter((section) => section.answers.length > 0);
    this.refreshDetectedSolutionLanguages();

    const solutionKey = String(
      this.currentSolution.solutionId || this.solutionId || ''
    );
    if (this.previewViewSolutionId !== solutionKey) {
      this.previewViewSolutionId = solutionKey;
      this.activePreviewView = this.defaultPreviewView();
      return;
    }

    if (
      (this.activePreviewView === 'latest' && !this.hasLatestWork) ||
      (this.activePreviewView === 'draft' && !this.hasTeamDraft) ||
      (this.activePreviewView === 'published' && !this.hasCompiledContent)
    ) {
      this.activePreviewView = this.defaultPreviewView();
    }
  }

  private refreshDetectedSolutionLanguages(): void {
    const title = this.currentSolution.title;
    const description = this.currentSolution.description;
    const status = this.currentSolution.status || {};
    const latestAnswers = SOLUTION_STEP_SECTIONS.flatMap((section) =>
      section.questions.map((question) => status[question.key])
    );
    const publishedContent = this.currentSolution.content;

    this.detectedSolutionLanguages.set(
      'latest',
      detectSupportedContentLanguage([title, description, ...latestAnswers])
    );
    this.detectedSolutionLanguages.set(
      'draft',
      detectSupportedContentLanguage([
        title,
        this.currentSolution.strategyReview,
      ])
    );
    this.detectedSolutionLanguages.set(
      'published',
      detectSupportedContentLanguage([
        title,
        this.hasMeaningfulContent(publishedContent)
          ? publishedContent
          : description,
      ])
    );
  }

  private defaultPreviewView(): SolutionPreviewContentView {
    if (!this.isInDevelopment && this.hasCompiledContent) {
      return 'published';
    }
    if (this.hasLatestWork) {
      return 'latest';
    }
    if (this.hasTeamDraft) {
      return 'draft';
    }
    return 'published';
  }

  private hasMeaningfulContent(value: unknown): boolean {
    const raw = String(value || '');
    if (/<(?:img|video|audio|iframe|table)\b/i.test(raw)) {
      return true;
    }
    return raw
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/\u00a0/g, ' ')
      .trim().length > 0;
  }

  private timestampMillis(value: any): number {
    const direct = value?.toMillis?.();
    if (Number.isFinite(direct)) return Number(direct);

    const date = value?.toDate?.() || (value ? new Date(value) : null);
    const millis = date?.getTime?.();
    return Number.isFinite(millis) ? Number(millis) : 0;
  }

  private preferredScrollBehavior(): ScrollBehavior {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
  }

  private setupDiscussionObserver(): void {
    this.discussionObserver?.disconnect();
    if (this.discussionObserverSetupTimer) {
      clearTimeout(this.discussionObserverSetupTimer);
    }

    this.discussionObserverSetupTimer = setTimeout(() => {
      const discussion = document.getElementById('solution-discussion');
      if (!discussion || typeof IntersectionObserver === 'undefined') return;

      this.discussionObserver = new IntersectionObserver(
        ([entry]) => {
          this.ngZone.run(() => {
            this.isDiscussionInView = Boolean(entry?.isIntersecting);
          });
        },
        {
          rootMargin: '-15% 0px -45% 0px',
          threshold: 0.01,
        }
      );
      this.discussionObserver.observe(discussion);
    }, 0);
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
    if (!this.auth.currentUser?.uid) {
      this.redirectToLogin(false);
      return;
    }
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
    if (!this.auth.currentUser?.uid) {
      this.signInToComment();
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

    // -- (E) Add the content currently selected in the preview --
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = this.activePreviewContentForExport();
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

  private activePreviewContentForExport(): string {
    if (this.activePreviewView === 'draft' && this.hasTeamDraft) {
      return String(this.currentSolution.strategyReview || '');
    }

    if (this.activePreviewView === 'published' && this.hasCompiledContent) {
      return String(this.currentSolution.content || '');
    }

    if (this.hasLatestWork) {
      const overview = this.hasMeaningfulContent(
        this.currentSolution.description
      )
        ? `<section><h2>Solution overview</h2>${this.currentSolution.description}</section>`
        : '';
      const steps = this.developmentSections
        .map(
          (section) => `
            <section>
              <h2>Step ${section.step}: ${section.title}</h2>
              ${section.answers
                .map(
                  (answer) => `
                    <h3>${answer.label}</h3>
                    ${answer.content}
                  `
                )
                .join('')}
            </section>
          `
        )
        .join('');
      return `${overview}${steps}`;
    }

    return String(
      this.currentSolution.content ||
        this.currentSolution.strategyReview ||
        this.currentSolution.description ||
        ''
    );
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
