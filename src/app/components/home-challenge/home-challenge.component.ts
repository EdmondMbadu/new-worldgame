import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, firstValueFrom, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { HOME_CHALLENGE_FR } from 'src/app/components/home/home-challenge-fr';
import { Solution } from 'src/app/models/solution';
import { ChallengeJoinRequest, ChallengePage } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import {
  ChallengesService,
  ResolvedChallengePage,
} from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { PresenceService } from 'src/app/services/presence.service';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';
import { ToastService } from 'src/app/services/toast.service';
import {
  PLAYGROUND_QUESTION_KEYS,
  PLAYGROUND_QUESTION_KEYS_FLAT,
  PLAYGROUND_QUESTION_SECTIONS,
  getDefaultQuestionLocales,
} from 'src/app/config/playground-question-schema';
import {
  PlaygroundQuestionLanguage,
  ResolvedPlaygroundQuestionTemplate,
} from 'src/app/models/challenge-question-template';
import { PlaygroundQuestionTemplateService } from 'src/app/services/playground-question-template.service';
import { filterChallengeLinksForPage } from 'src/app/utils/challenge-page-links';

@Component({
    selector: 'app-home-challenge',
    templateUrl: './home-challenge.component.html',
    styleUrl: './home-challenge.component.css',
    standalone: false
})
export class HomeChallengeComponent implements OnDestroy {
  titleCreateChallenge: string = '';
  imageCreateChallenge: string = '';
  descriptionCreateChallenge: string = '';
  isLoading: boolean = false;

  isSidebarOpen = false;
  heading: string = '';
  subHeading: any = '';
  image: string = '';
  logoImage: string = '';
  showAddChallenge: boolean = false;
  showExistingChallenges: boolean = false;
  showAddTeamMember: boolean = false;
  showRemoveTeamMember: boolean = false;
  challengePage: ChallengePage = new ChallengePage();
  challengePageId?: any = '';
  participantsHidden = false;
  showAllParticipants = false;
  challenges: {
    [key: string]: {
      ids?: string[];
      titles: string[];
      frenchTitles?: string[];
      descriptions: string[];
      frenchDescriptions?: string[];
      images: string[];
      addedByUids?: string[];
      privateFlags?: boolean[];
      participantCounts?: number[];
    };
  } = {};
  challengeId: string = '';
  // Active data to display
  titles: string[] = [];
  descriptions: string[] = [];
  challengeImages: string[] = [];
  solutionAddedByUids: string[] = [];
  solutionPrivateFlags: boolean[] = [];
  solutionParticipantCounts: number[] = [];
  ids: string[] = [];
  participants: string[] = [];
  participantProfiles: {
    email: string;
    displayName: string;
    uid?: string;
    photoUrl?: string;
    lastActiveAt?: string;
    isOnline?: boolean;
    exists: boolean;
    isCurrentUser: boolean;
  }[] = [];
  isLoadingParticipantProfiles = false;
  onlineParticipantCount = 0;
  private onlineParticipantUids = new Set<string>();
  private participantPresenceSub?: Subscription;
  adminProfiles: {
    email: string;
    displayName: string;
    uid?: string;
    photoUrl?: string;
    exists: boolean;
    isCurrentUser: boolean;
  }[] = [];
  isLoadingAdminProfiles = false;
  challengeJoinRequests: ChallengeJoinRequest[] = [];
  processingJoinRequestIds = new Set<string>();
  private challengeJoinRequestsSub?: Subscription;
  googleMeetLink: string = '';
  newParticipant: string = '';
  teamMemberToDelete: string = '';
  zoomLink = '';
  chatNote = '';
  showEditLinks = false;

  showMergeSolution = false;
  mergeSolutionId = '';
  showMySolutions = false;
  mySolutions: Solution[] = [];
  mySolutionSearch = '';
  isLoadingMySolutions = false;
  mySolutionsError = '';
  addingSolutionId = '';
  solutionRemovalTarget: { id: string; index: number; title: string } | null =
    null;
  isRemovingSolution = false;

  isHovering: boolean = false;
  @ViewChild('solutions') solutionsSection!: ElementRef;
  showDiscussion = false;
  public showAuthorTools: boolean = true; // or false if you want it hidden by default
  public isAuthorToolsVisible: boolean = false;

  isPrivate = false;
  allowAccess = false; // computed locally
  pageReady = false;
  handouts: { name: string; url: string }[] = [];
  showEditHandouts = false;

  // Existing challenges picker (global challenges)
  pageChallengeCards: any[] = [];
  existingChallenges: any[] = [];
  filteredExistingChallenges: any[] = [];
  isLoadingExistingChallenges = false;
  existingChallengesError = '';
  addingExistingChallengeIds: string[] = [];

  // ✨ temp holders while adding one file
  handoutName = '';
  handoutFile: File | null = null;

  programPDF: { title: string; url: string } | null = null;
  programTitleTmp = '';
  programFileTmp: File | null = null;
  showEditProgram = false;

  // ─ Edit-challenge modal state ─
  showEditChallenge = false;
  editChallengeId = '';
  editIndex = -1;
  editTitle = '';
  editDescription = '';
  editImage = '';
  editSolutionPrivate = false;

  // page admins
  adminEmails: string[] = [];
  adminUids: string[] = [];
  showAddAdmin = false;
  showRemoveAdmin = false;
  newAdminEmail = '';
  adminToRemove = '';

  showAdminsList = true;
  showAllAdmins = false;

  authorEmail = '';
  visibleAdminEmails: string[] = [];

  showJoinPrompt = false;
  isJoining = false;
  private hasHandledJoinPrompt = false;
  showLeavePrompt = false;

  // Edit page content
  showEditPageContent = false;
  editHeading = '';
  editSubHeading = '';
  editCustomUrl = '';
  editLogoFile: File | null = null;
  editHeroFile: File | null = null;
  editLogoPreview = '';
  editHeroPreview = '';
  customUrlError = '';
  isCheckingUrl = false;
  customUrlValid = true;
  private customUrlCheckTimeout: any;

  // User search for adding participants (hybrid: client-side + server fallback)
  userSearchQuery = '';
  userSearchResults: { email: string; displayName: string; photoUrl?: string; uid?: string }[] = [];
  isSearchingUsers = false;
  selectedUserToAdd: { email: string; displayName: string; photoUrl?: string; uid?: string } | null = null;
  allUsers: any[] = [];  // Cached users for instant client-side filtering
  private allUsersLoadPromise?: Promise<void>;
  showUserSuggestions = false;
  private userSearchTimeout: any;  // For debouncing server-side search
  bulkParticipantsText = '';
  bulkParticipantsFileName = '';
  bulkParticipantEmails: string[] = [];
  bulkDuplicateEmails: string[] = [];

  // Remove participant search
  removeParticipantSearchQuery = '';

  // Admin search for adding admins
  adminSearchQuery = '';
  adminSearchResults: { email: string; displayName: string; photoUrl?: string; uid?: string }[] = [];
  isSearchingAdmins = false;
  selectedAdminToAdd: { email: string; displayName: string; photoUrl?: string; uid?: string } | null = null;

  // Remove admin search
  removeAdminSearchQuery = '';
  private languageSub?: Subscription;
  private pageChallengesSub?: Subscription;
  private challengeHydrationSub?: Subscription;
  private pageLoadToken = 0;
  private pageChallengeSignature = '';
  private readonly allChallengesKey = '__all__';
  private readonly historyPageIdKey = 'homeChallengePageId';
  private readonly historyPageSlugKey = 'homeChallengePageSlug';
  showQuestionEditor = false;
  questionEditorLanguage: PlaygroundQuestionLanguage = 'en';
  questionTemplate: ResolvedPlaygroundQuestionTemplate | null = null;
  questionDraft = getDefaultQuestionLocales();
  private questionOriginalDraft = getDefaultQuestionLocales();
  isSavingQuestions = false;
  questionResetArmed = false;
  readonly questionSections = PLAYGROUND_QUESTION_SECTIONS;
  readonly questionKeys = PLAYGROUND_QUESTION_KEYS;
  private questionTemplateSub?: Subscription;

  // home-challenge.component.ts
  goToChallengeDiscussion() {
    this.router.navigate(['/challenge-discussion', this.challengePageId], {
      queryParams: {
        title: this.heading, // already added
        meet: this.googleMeetLink || this.zoomLink || '', // NEW
      },
    });
  }

  scrollToSolutions() {
    this.solutionsSection.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private router: Router,
    private solution: SolutionService,
    public data: DataService,
    private time: TimeService,
    private afs: AngularFirestore,
    private challenge: ChallengesService,
    private fns: AngularFireFunctions,
    private toast: ToastService,
    private translate: TranslateService,
    private presence: PresenceService,
    private questionTemplates: PlaygroundQuestionTemplateService
  ) {}
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.languageSub = this.translate.onLangChange.subscribe(() => {
      this.updateChallenges();
    });
    this.activatedRoute.paramMap.subscribe((params) => {
      const idOrSlug = params.get('id');
      if (!idOrSlug) {
        console.error('No challenge page ID or slug provided');
        this.pageReady = true;
        return;
      }
      if (
        this.challengePageId &&
        idOrSlug === this.challengePage?.customUrl
      ) {
        return;
      }
      window.scrollTo(0, 0);
      this.pageReady = false;
      const storedPageId = this.getStoredChallengePageId(idOrSlug);
      void this.loadChallengePage(idOrSlug, storedPageId);
    });
    
    this.challengeJoinRequestsSub = this.challenge
      .getChallengeJoinRequests()
      .subscribe({
        next: (requests) => {
          this.challengeJoinRequests = requests || [];
        },
        error: (error) => {
          console.error('Unable to load challenge join requests', error);
        },
      });
  }
  ngOnDestroy(): void {
    this.pageLoadToken += 1;
    this.languageSub?.unsubscribe();
    this.participantPresenceSub?.unsubscribe();
    this.challengeJoinRequestsSub?.unsubscribe();
    this.pageChallengesSub?.unsubscribe();
    this.challengeHydrationSub?.unsubscribe();
    this.questionTemplateSub?.unsubscribe();
  }
  private resetPageState(): void {
    // everything that can legitimately be “missing” on a page
    this.handouts = [];
    this.programPDF = null;
    this.googleMeetLink = '';
    this.zoomLink = '';
    this.chatNote = '';
    this.participants = [];
    this.participantProfiles = [];
    this.onlineParticipantCount = 0;
    this.onlineParticipantUids = new Set<string>();
    this.participantPresenceSub?.unsubscribe();
    this.logoImage = '';
    this.image = '';
  }
  async loadChallengePage(
    routeIdOrSlug: string,
    storedPageId: string = ''
  ): Promise<void> {
    const loadToken = ++this.pageLoadToken;
    // Reset challenge-related data before fetching new ones
    this.resetPageState();
    this.pageChallengesSub?.unsubscribe();
    this.challengeHydrationSub?.unsubscribe();
    this.pageChallengeCards = [];
    this.challenges = {};
    this.titles = [];
    this.descriptions = [];
    this.challengeImages = [];
    this.solutionAddedByUids = [];
    this.solutionPrivateFlags = [];
    this.solutionParticipantCounts = [];
    this.ids = [];
    this.pageChallengeSignature = '';

    try {
      let resolved: ResolvedChallengePage | null = null;

      if (storedPageId) {
        const storedResolution =
          await this.challenge.resolveChallengePage(storedPageId);
        if (loadToken !== this.pageLoadToken) {
          return;
        }

        // Browser history can outlive a slug edit. Never trust its document ID
        // unless the current server record still belongs to the visible route.
        if (this.resolvedPageMatchesRoute(storedResolution, routeIdOrSlug)) {
          resolved = storedResolution;
        }
      }

      if (!resolved) {
        resolved =
          await this.challenge.resolveChallengePage(routeIdOrSlug);
      }
      if (loadToken !== this.pageLoadToken) {
        return;
      }
      if (!resolved) {
        console.error('Challenge page not found');
        this.pageReady = true;
        return;
      }

      this.challengePageId = resolved.id;
      this.watchQuestionTemplate(resolved.id);
      const resolvedSlug = String(resolved.data.customUrl || '');
      this.rememberResolvedChallengePage(
        resolved.id,
        resolvedSlug,
        routeIdOrSlug
      );
      this.processChallengePageData(
        resolved.data,
        resolved.loadedByCustomUrl || routeIdOrSlug === resolvedSlug,
        loadToken
      );
    } catch (error) {
      if (loadToken !== this.pageLoadToken) {
        return;
      }
      console.error('Unable to load challenge page', error);
      this.pageReady = true;
    }
  }

  private getStoredChallengePageId(routeIdOrSlug: string): string {
    const state = window.history.state || {};
    const storedPageId = String(state[this.historyPageIdKey] || '');
    const storedSlug = String(state[this.historyPageSlugKey] || '');

    return storedSlug === routeIdOrSlug &&
      /^[A-Za-z0-9]{20}$/.test(storedPageId)
      ? storedPageId
      : '';
  }

  private resolvedPageMatchesRoute(
    resolved: ResolvedChallengePage | null,
    routeIdOrSlug: string
  ): resolved is ResolvedChallengePage {
    if (!resolved) {
      return false;
    }

    return (
      resolved.id === routeIdOrSlug ||
      String(resolved.data.customUrl || '') === routeIdOrSlug
    );
  }

  private rememberResolvedChallengePage(
    pageId: string,
    slug: string,
    routeIdOrSlug: string
  ): void {
    if (!slug || routeIdOrSlug !== slug) {
      return;
    }

    window.history.replaceState(
      {
        ...(window.history.state || {}),
        [this.historyPageIdKey]: pageId,
        [this.historyPageSlugKey]: slug,
      },
      '',
      this.router.url
    );
  }

  private processChallengePageData(
    data: any,
    loadedByCustomUrl: boolean = false,
    loadToken: number = this.pageLoadToken
  ): void {
        this.challengePage = data;
        this.heading = this.challengePage.heading!;
        this.subHeading = this.challengePage.subHeading!;
        this.isPrivate = !!data.isPrivate;
        this.pageReady = true;
        this.participantsHidden = !!data.participantsHidden; // default = false
        this.showParticipantsList = !this.participantsHidden; // sync UI

        // Update URL to use custom URL if available and we loaded by ID (not custom URL)
        if (this.challengePage.customUrl && !loadedByCustomUrl) {
          const currentIdOrSlug = this.activatedRoute.snapshot.paramMap.get('id');
          // Only update if we're currently using the ID, not the custom URL
          if (currentIdOrSlug === this.challengePageId && currentIdOrSlug !== this.challengePage.customUrl) {
            this.router.navigate(['/home-challenge', this.challengePage.customUrl], {
              replaceUrl: true,
              state: {
                [this.historyPageIdKey]: this.challengePageId,
                [this.historyPageSlugKey]: this.challengePage.customUrl,
              },
            });
          }
        }

        if (Array.isArray(data.adminEmails))
          this.adminEmails = data.adminEmails.map((e: string) =>
            (e || '').toLowerCase()
          );
        if (Array.isArray(data.adminUids)) this.adminUids = data.adminUids;
        // after: this.challengePage = data;
        const ownerId = this.challengePage.authorId;
        if (ownerId) {
          firstValueFrom(this.auth.getAUser(ownerId))
            .then((u) => {
              this.authorEmail = this.normalizeEmail((u as any)?.email || '');
              this.recomputeAdminsView();
              this.loadAdminProfiles();
            })
            .catch(() => {
              this.recomputeAdminsView();
              this.loadAdminProfiles();
            });
        } else {
          this.recomputeAdminsView();
          this.loadAdminProfiles();
        }

        // test first if the logo image is available
        if (this.challengePage.logoImage) {
          this.logoImage = this.challengePage.logoImage;
        }
        if (data.handouts) this.handouts = data.handouts;
        if (data.programPDF) this.programPDF = data.programPDF;

        if (this.challengePage.imageChallenge) {
          this.image = this.challengePage.imageChallenge;
        }
        // test if participants array is there
        if (this.challengePage.participants) {
          this.participants = this.challengePage.participants;
          console.log('Participants:', this.participants);
          this.loadParticipantProfiles();
        }
        if (this.challengePage.meetLink) {
          this.googleMeetLink = this.challengePage.meetLink;
          console.log('Google Meet Link:', this.googleMeetLink);
        }
        if (this.challengePage.zoomLink) {
          this.zoomLink = this.challengePage.zoomLink;
        }
        if (this.challengePage.chatNote) {
          this.chatNote = this.challengePage.chatNote;
        }

        this.checkAccess();
        this.maybePromptJoin();

        void this.loadPageChallenges(loadToken);
  }

  private async loadPageChallenges(loadToken: number): Promise<void> {
    this.pageChallengesSub?.unsubscribe();
    const expectedPageId = String(this.challengePageId || '');

    try {
      const initialChallenges = await this.challenge
        .getUserChallengesForPageOnce(expectedPageId);
      if (
        loadToken !== this.pageLoadToken ||
        expectedPageId !== String(this.challengePageId || '')
      ) {
        return;
      }
      this.applyPageChallenges(initialChallenges, loadToken, expectedPageId);
    } catch (error) {
      console.error('Unable to load solution links for challenge page', error);
    }

    if (loadToken !== this.pageLoadToken) {
      return;
    }

    this.pageChallengesSub = this.challenge
      .getUserChallengesForPage(expectedPageId)
      .subscribe({
        next: (challenges: any[]) => {
          if (
            loadToken !== this.pageLoadToken ||
            expectedPageId !== String(this.challengePageId || '')
          ) {
            return;
          }
          const nextChallenges = challenges || [];
          if (!nextChallenges.length && this.pageChallengeCards.length) {
            void this.confirmEmptyPageChallenges(loadToken, expectedPageId);
            return;
          }
          this.applyPageChallenges(nextChallenges, loadToken, expectedPageId);
        },
        error: (error) => {
          console.error('Solution link updates stopped', error);
        },
      });
  }

  private async confirmEmptyPageChallenges(
    loadToken: number,
    expectedPageId: string
  ): Promise<void> {
    try {
      const confirmedChallenges = await this.challenge
        .getUserChallengesForPageOnce(expectedPageId);
      if (
        loadToken === this.pageLoadToken &&
        expectedPageId === String(this.challengePageId || '')
      ) {
        this.applyPageChallenges(confirmedChallenges, loadToken, expectedPageId);
      }
    } catch (error) {
      // Preserve the last known-good grid when an empty cached emission cannot
      // be confirmed by Firestore.
      console.warn('Could not confirm an empty solution list', error);
    }
  }

  private applyPageChallenges(
    challenges: any[],
    loadToken: number = this.pageLoadToken,
    expectedPageId: string = String(this.challengePageId || '')
  ): void {
    if (
      loadToken !== this.pageLoadToken ||
      expectedPageId !== String(this.challengePageId || '')
    ) {
      return;
    }

    // Treat the Firestore query as a first filter, not the authority. Cached
    // or stale emissions must never leak links from another challenge space
    // into the active page.
    const pageChallenges = filterChallengeLinksForPage(
      challenges,
      expectedPageId
    );
    const signature = pageChallenges
      .map((challenge) => String(challenge.id || challenge.docId || ''))
      .filter(Boolean)
      .sort()
      .join('|');
    if (signature === this.pageChallengeSignature && pageChallenges.length) {
      return;
    }

    this.pageChallengeSignature = signature;
    this.pageChallengeCards = pageChallenges;
    this.fetchChallenges(pageChallenges, loadToken, expectedPageId);
  }
  private checkAccess(): void {
    const email = this.normalizeEmail(this.auth.currentUser?.email || '');
    const isParticipant = (this.participants || []).some(
      (participant) => this.normalizeEmail(participant) === email
    );
    // author always gets in
    this.allowAccess = this.isAuthorPage || isParticipant;
  }

  private maybePromptJoin(): void {
    if (this.hasHandledJoinPrompt) {
      return;
    }

    const email = this.normalizeEmail(this.auth.currentUser?.email || '');
    if (!email) {
      return;
    }

    const isParticipant = (this.participants || []).some(
      (participant) => this.normalizeEmail(participant) === email
    );

    if (this.isAuthorPage || isParticipant) {
      this.hasHandledJoinPrompt = true;
      return;
    }

    this.showJoinPrompt = true;
    this.hasHandledJoinPrompt = true;
  }

  get isAuthorPage(): boolean {
    const meUid = this.auth.currentUser?.uid;
    const meEmail = (this.auth.currentUser?.email || '').toLowerCase();
    const isAuthor = this.challengePage.authorId === meUid;

    const isPageAdmin =
      (this.adminEmails || []).includes(meEmail) ||
      (this.adminUids || []).includes(meUid);

    return isAuthor || isPageAdmin;
  }

  openQuestionEditor(): void {
    this.questionDraft = this.questionTemplates.createEditorDraft(this.questionTemplate);
    this.questionOriginalDraft = this.questionTemplates.createEditorDraft(this.questionTemplate);
    this.questionEditorLanguage = 'en';
    this.questionResetArmed = false;
    this.showQuestionEditor = true;
  }

  closeQuestionEditor(): void {
    if (this.isSavingQuestions) return;
    if (
      this.hasQuestionDraftChanges &&
      typeof window !== 'undefined' &&
      !window.confirm('Discard your unsaved question changes?')
    ) {
      return;
    }
    this.showQuestionEditor = false;
    this.questionResetArmed = false;
  }

  restoreStandardQuestion(key: string): void {
    this.questionDraft[this.questionEditorLanguage][key] =
      getDefaultQuestionLocales()[this.questionEditorLanguage][key];
  }

  get changedQuestionCount(): number {
    const defaults = getDefaultQuestionLocales();
    return PLAYGROUND_QUESTION_KEYS_FLAT.filter((key) =>
      (['en', 'fr'] as PlaygroundQuestionLanguage[]).some(
        (language) => this.questionDraft[language][key].trim() !== defaults[language][key].trim()
      )
    ).length;
  }

  get hasQuestionDraftChanges(): boolean {
    return (['en', 'fr'] as PlaygroundQuestionLanguage[]).some((language) =>
      PLAYGROUND_QUESTION_KEYS_FLAT.some(
        (key) => this.questionDraft[language][key] !== this.questionOriginalDraft[language][key]
      )
    );
  }

  async saveQuestionTemplate(): Promise<void> {
    if (!this.isAuthorPage || !this.challengePageId || this.isSavingQuestions) return;
    if (!this.hasQuestionDraftChanges) {
      this.toast.warning('No question wording has changed. Nothing was saved.');
      return;
    }
    if (!this.changedQuestionCount) {
      this.toast.warning('Use “Restore all standard questions” to return to the standard template.');
      return;
    }
    const invalidKey = PLAYGROUND_QUESTION_KEYS_FLAT.find((key) =>
      (['en', 'fr'] as PlaygroundQuestionLanguage[]).some(
        (language) => !this.questionDraft[language][key]?.trim()
      )
    );
    if (invalidKey) {
      this.toast.error(`Question ${invalidKey} cannot be empty.`);
      return;
    }

    this.isSavingQuestions = true;
    try {
      this.questionTemplate = await this.questionTemplates.save(
        String(this.challengePageId),
        this.questionDraft
      );
      this.questionDraft = this.questionTemplates.createEditorDraft(this.questionTemplate);
      this.questionOriginalDraft = this.questionTemplates.createEditorDraft(this.questionTemplate);
      this.toast.success(`Questions updated for ${this.ids.length} solution${this.ids.length === 1 ? '' : 's'}.`);
      this.showQuestionEditor = false;
    } catch (error) {
      console.error('Unable to save challenge questions', error);
      this.toast.error('Could not save the questions. Your draft is still here; please try again.');
    } finally {
      this.isSavingQuestions = false;
    }
  }

  async resetQuestionTemplate(): Promise<void> {
    if (!this.questionResetArmed) {
      this.questionResetArmed = true;
      return;
    }
    if (!this.isAuthorPage || !this.challengePageId || this.isSavingQuestions) return;
    if (this.questionTemplate?.mode !== 'custom') {
      this.questionDraft = getDefaultQuestionLocales();
      this.questionOriginalDraft = getDefaultQuestionLocales();
      this.questionResetArmed = false;
      this.showQuestionEditor = false;
      this.toast.success('The standard Solution Playground questions are already active.');
      return;
    }
    this.isSavingQuestions = true;
    try {
      this.questionTemplate = await this.questionTemplates.reset(String(this.challengePageId));
      this.questionDraft = this.questionTemplates.createEditorDraft(this.questionTemplate);
      this.questionOriginalDraft = this.questionTemplates.createEditorDraft(this.questionTemplate);
      this.questionResetArmed = false;
      this.toast.success('Standard Solution Playground questions restored.');
      this.showQuestionEditor = false;
    } catch (error) {
      console.error('Unable to restore standard questions', error);
      this.toast.error('Could not restore the standard questions. Please try again.');
    } finally {
      this.isSavingQuestions = false;
    }
  }

  private watchQuestionTemplate(challengePageId: string): void {
    this.questionTemplateSub?.unsubscribe();
    this.questionTemplateSub = this.questionTemplates
      .watchForChallenge(challengePageId)
      .subscribe((template) => {
        this.questionTemplate = template;
        if (!this.showQuestionEditor) {
          this.questionDraft = this.questionTemplates.createEditorDraft(template);
          this.questionOriginalDraft = this.questionTemplates.createEditorDraft(template);
        }
      });
  }

  get pendingJoinRequestsForPage(): ChallengeJoinRequest[] {
    if (!this.challengePageId || !this.isAuthorPage) {
      return [];
    }

    return (this.challengeJoinRequests || [])
      .filter(
        (request) =>
          request.challengePageId === this.challengePageId &&
          request.status === 'pending'
      )
      .sort((a, b) => this.requestDateMs(b.createdAt) - this.requestDateMs(a.createdAt));
  }

  isProcessingJoinRequest(request: ChallengeJoinRequest): boolean {
    return !!request.id && this.processingJoinRequestIds.has(request.id);
  }

  async acceptJoinRequest(request: ChallengeJoinRequest): Promise<void> {
    if (!request.id || this.processingJoinRequestIds.has(request.id)) {
      return;
    }

    this.processingJoinRequestIds.add(request.id);
    try {
      await this.challenge.acceptChallengeJoinRequest(request.id);
      this.toast.success(`${request.requesterName || request.requesterEmail} was added.`);
    } catch (error) {
      console.error('Unable to accept challenge join request:', error);
      this.toast.error('Could not accept this request.');
    } finally {
      this.processingJoinRequestIds.delete(request.id);
    }
  }

  async rejectJoinRequest(request: ChallengeJoinRequest): Promise<void> {
    if (!request.id || this.processingJoinRequestIds.has(request.id)) {
      return;
    }

    this.processingJoinRequestIds.add(request.id);
    try {
      await this.challenge.rejectChallengeJoinRequest(request.id);
      this.toast.success('Request rejected.');
    } catch (error) {
      console.error('Unable to reject challenge join request:', error);
      this.toast.error('Could not reject this request.');
    } finally {
      this.processingJoinRequestIds.delete(request.id);
    }
  }

  private requestDateMs(value: any): number {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  toggleAside() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  async saveLinks() {
    try {
      await this.afs.doc(`challengePages/${this.challengePageId}`).set(
        {
          meetLink: this.googleMeetLink || null,
          zoomLink: this.zoomLink || null,
          chatNote: this.chatNote?.trim() || null,
        },
        { merge: true }
      );

      this.toggle('showEditLinks');
      this.toast.success('Links updated!');
    } catch (err) {
      console.error('Error updating links:', err);
      this.toast.error('Could not save links—try again.');
    }
  }
  /** whether the detailed list is visible */
  showParticipantsList = false;

  fetchChallenges(
    pageChallenges: any[] = this.pageChallengeCards,
    loadToken: number = this.pageLoadToken,
    expectedPageId: string = String(this.challengePageId || '')
  ) {
    this.challengeHydrationSub?.unsubscribe();

    if (
      loadToken !== this.pageLoadToken ||
      expectedPageId !== String(this.challengePageId || '')
    ) {
      return;
    }

    const matchingChallenges = filterChallengeLinksForPage(
      pageChallenges,
      expectedPageId
    );

    if (!matchingChallenges.length) {
      this.challenges[this.allChallengesKey] = {
        ids: [],
        titles: [],
        frenchTitles: [],
        descriptions: [],
        frenchDescriptions: [],
        images: [],
        addedByUids: [],
        privateFlags: [],
        participantCounts: [],
      };
      this.updateChallenges();
      return;
    }

    this.challengeHydrationSub = combineLatest(
      matchingChallenges.map((challenge) =>
        this.solution.getSolution(challenge.id || challenge.docId).pipe(
          map((solution: any) =>
            this.mergeChallengeCardWithSolution(challenge, solution)
          ),
          // The link document already contains everything needed to draw the
          // card. Render it immediately, then enrich it when the live solution
          // document arrives instead of holding the whole grid back.
          startWith(this.mergeChallengeCardWithSolution(challenge, null))
        )
      )
    ).subscribe((data: any[]) => {
        if (
          loadToken !== this.pageLoadToken ||
          expectedPageId !== String(this.challengePageId || '')
        ) {
          return;
        }
        // Transform the array into the expected format
        const transformedData = {
          ids: data.map((challenge) => challenge.id),
          titles: data.map((challenge) => challenge.title),
          frenchTitles: data.map((challenge) =>
            this.resolveFrenchChallengeTitle(challenge)
          ),
          descriptions: data.map((challenge) => challenge.description),
          frenchDescriptions: data.map((challenge) =>
            this.resolveFrenchChallengeDescription(challenge)
          ),
          images: data.map(
            (challenge) => challenge.image || 'No image available'
          ),
          addedByUids: data.map((challenge) =>
            String(challenge.addedByUid || challenge.authorId || '')
          ),
          privateFlags: data.map((challenge) => !!challenge.isPrivate),
          participantCounts: data.map(
            (challenge) => challenge.participantCount || 0
          ),
        };
        this.challenges[this.allChallengesKey] = transformedData;
        this.updateChallenges();
      });
  }

  private mergeChallengeCardWithSolution(challenge: any, solution: any): any {
    if (!solution) {
      return {
        ...challenge,
        id: challenge.id || challenge.docId,
        isPrivate: !!challenge.isPrivate,
      };
    }

    return {
      ...challenge,
      id: challenge.id || challenge.docId,
      title: solution.title || challenge.title,
      description: solution.description || challenge.description,
      image: solution.image || challenge.image,
      isPrivate: !!(solution.isPrivate ?? challenge.isPrivate),
      participantCount: this.countSolutionParticipants(solution.participants),
    };
  }

  private countSolutionParticipants(participants: any): number {
    return this.normalizeSolutionParticipants(participants).length;
  }

  private normalizeSolutionParticipants(participants: any): { name: string }[] {
    if (!participants) {
      return [];
    }

    const normalizeValue = (value: any): { name: string } | null => {
      if (!value) {
        return null;
      }

      if (typeof value === 'string') {
        const name = value.trim();
        return name ? { name } : null;
      }

      if (typeof value === 'object') {
        const fallback = value.name || value.email || Object.values(value)[0];
        if (typeof fallback === 'string' && fallback.trim()) {
          return { name: fallback.trim() };
        }
      }

      return null;
    };

    const values = Array.isArray(participants)
      ? participants
      : typeof participants === 'object'
        ? Object.values(participants)
        : [];

    const uniqueEmails = new Set<string>();
    return values
      .map(normalizeValue)
      .filter((participant): participant is { name: string } => !!participant)
      .filter((participant) => {
        const key = this.normalizeEmail(participant.name);
        if (!key || uniqueEmails.has(key)) {
          return false;
        }
        uniqueEmails.add(key);
        return true;
      });
  }

  updateChallenges(): void {
    const categoryData = this.challenges[this.allChallengesKey];
    if (!categoryData) {
      return;
    }
    const shouldUseFrenchContent = this.shouldUseFrenchContent();
    this.titles = shouldUseFrenchContent
      ? categoryData.frenchTitles ?? categoryData.titles
      : categoryData.titles;
    this.descriptions = shouldUseFrenchContent
      ? categoryData.frenchDescriptions ?? categoryData.descriptions
      : categoryData.descriptions;
    this.challengeImages = categoryData.images;
    this.solutionAddedByUids = categoryData.addedByUids ?? [];
    this.solutionPrivateFlags = categoryData.privateFlags ?? [];
    this.solutionParticipantCounts = categoryData.participantCounts ?? [];
    this.ids = categoryData.ids!;
  }

  trackChallengeById = (index: number, title: string): string =>
    this.ids[index] || title;

  getOriginalChallengeTitle(index: number): string {
    return this.challenges[this.allChallengesKey]?.titles?.[index] || this.titles[index];
  }

  getOriginalChallengeDescription(index: number): string {
    return (
      this.challenges[this.allChallengesKey]?.descriptions?.[index] ||
      this.descriptions[index]
    );
  }

  getExistingChallengeDisplayTitle(challenge: any): string {
    if (!this.shouldUseFrenchContent()) {
      return challenge?.title || '';
    }

    return this.resolveFrenchChallengeTitle(challenge);
  }

  getExistingChallengeDisplayDescription(challenge: any): string {
    if (!this.shouldUseFrenchContent()) {
      return challenge?.description || '';
    }

    return this.resolveFrenchChallengeDescription(challenge);
  }

  private shouldUseFrenchContent(): boolean {
    return (this.translate.currentLang || this.translate.defaultLang || 'en')
      .toLowerCase()
      .startsWith('fr');
  }

  private resolveFrenchChallengeTitle(challenge: any): string {
    const explicitFrenchTitle =
      challenge?.titleFr ||
      challenge?.frenchTitle ||
      challenge?.translations?.fr?.title ||
      challenge?.titleTranslations?.fr;

    if (typeof explicitFrenchTitle === 'string' && explicitFrenchTitle.trim()) {
      return explicitFrenchTitle.trim();
    }

    return HOME_CHALLENGE_FR[challenge?.id]?.title || challenge?.title || '';
  }

  private resolveFrenchChallengeDescription(challenge: any): string {
    const explicitFrenchDescription =
      challenge?.descriptionFr ||
      challenge?.frenchDescription ||
      challenge?.translations?.fr?.description ||
      challenge?.descriptionTranslations?.fr;

    if (
      typeof explicitFrenchDescription === 'string' &&
      explicitFrenchDescription.trim()
    ) {
      return explicitFrenchDescription.trim();
    }

    return (
      HOME_CHALLENGE_FR[challenge?.id]?.description ||
      challenge?.description ||
      ''
    );
  }

  openExistingChallenges(): void {
    if (!this.isAuthorPage) {
      this.toast.error('Only workspace admins can add library challenges.');
      return;
    }
    this.showExistingChallenges = true;
    this.loadExistingChallenges();
  }

  async loadExistingChallenges(): Promise<void> {
    if (this.existingChallenges.length) {
      this.filteredExistingChallenges = [...this.existingChallenges];
      return;
    }

    this.isLoadingExistingChallenges = true;
    this.existingChallengesError = '';

    try {
      const data = await firstValueFrom(this.challenge.getAllChallenges());
      const list = Array.isArray(data) ? data : [];
      this.existingChallenges = list;
      this.filteredExistingChallenges = [...list];
    } catch (err) {
      console.error('Error loading existing challenges:', err);
      this.existingChallengesError =
        'Could not load existing challenges. Please try again.';
    } finally {
      this.isLoadingExistingChallenges = false;
    }
  }

  isAddingExistingChallenge(challengeId: string): boolean {
    return this.addingExistingChallengeIds.includes(challengeId);
  }

  async addExistingChallengeToPage(challenge: any): Promise<void> {
    if (!this.isAuthorPage) {
      this.toast.error('Only workspace admins can add library challenges.');
      return;
    }

    if (!challenge?.title || !challenge?.description) {
      this.toast.error('This challenge is missing required details.');
      return;
    }

    if (this.isAddingExistingChallenge(challenge.id)) {
      return;
    }

    this.addingExistingChallengeIds = [
      ...this.addingExistingChallengeIds,
      challenge.id,
    ];

    const newChallengeId = this.afs.createId();
    const image = challenge.image || 'No image available';
    const newChallenge = {
      id: newChallengeId,
      title: challenge.title,
      description: challenge.description,
      category: challenge.category || 'General',
      image,
      authorId: this.auth.currentUser.uid,
      challengePageId: this.challengePageId,
    };

    try {
      await this.challenge.addUserChallenge(newChallenge);
      await this.solution.createdNewSolution(
        newChallenge.title,
        '',
        newChallenge.description,
        newChallenge.image,
        this.solution.newSolution.participantsHolder,
        [],
        [],
        newChallengeId,
        String(this.challengePageId)
      );

      this.toast.success('Challenge added to this workspace.');
    } catch (err) {
      console.error('Error adding existing challenge:', err);
      this.toast.error('There was a problem adding this challenge.');
    } finally {
      this.addingExistingChallengeIds =
        this.addingExistingChallengeIds.filter(
          (id) => id !== challenge.id
        );
    }
  }
  get participantsProfilesToRender() {
    const sortedProfiles = this.participantProfilesSortedByPresence();
    return this.showAllParticipants
      ? sortedProfiles
      : sortedProfiles.slice(0, 5);
  }

  get adminProfilesToRender() {
    return this.showAllAdmins
      ? this.adminProfiles
      : this.adminProfiles.slice(0, 5);
  }

  private participantProfilesSortedByPresence(): typeof this.participantProfiles {
    return [...this.participantProfiles].sort((a, b) => {
      if (!!a.isOnline === !!b.isOnline) {
        return 0;
      }

      return a.isOnline ? -1 : 1;
    });
  }

  async loadParticipantProfiles(): Promise<void> {
    const rawEmails = (this.participants || [])
      .map((email) => (email || '').toString().trim())
      .filter((email) => email);

    if (!rawEmails.length) {
      this.participantProfiles = [];
      this.onlineParticipantCount = 0;
      this.onlineParticipantUids = new Set<string>();
      this.participantPresenceSub?.unsubscribe();
      this.isLoadingParticipantProfiles = false;
      return;
    }

    this.isLoadingParticipantProfiles = true;
    try {
      const normalizedEmails = rawEmails.map((email) =>
        this.normalizeEmail(email)
      );
      const uniqueEmails = Array.from(new Set(normalizedEmails));
      const users = await this.auth.getUsersByEmails(uniqueEmails);
      const usersByEmail = new Map(
        users.map((user) => [this.normalizeEmail(user.email || ''), user])
      );
      const currentUserEmail = this.normalizeEmail(
        this.auth.currentUser?.email || ''
      );
      const currentUid =
        this.auth.currentUser?.uid || this.auth.currentAuthUid || '';

      const results = uniqueEmails.map((email) => {
        const user = usersByEmail.get(email);
        const isCurrentUser = email === currentUserEmail && !!currentUid;
        const profileUser = isCurrentUser ? this.auth.currentUser || user : user;
        if (profileUser || isCurrentUser) {
          const name = [profileUser?.firstName, profileUser?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
          return {
            email,
            displayName: name || profileUser?.email || email,
            uid: isCurrentUser ? currentUid : profileUser?.uid,
            photoUrl:
              profileUser?.profilePicture?.downloadURL ||
              profileUser?.profilePicPath ||
              '',
            lastActiveAt: isCurrentUser
              ? new Date().toISOString()
              : profileUser?.lastActiveAt,
            isOnline: isCurrentUser,
            exists: true,
            isCurrentUser,
          };
        }

        return {
          email,
          displayName: email,
          exists: false,
          isOnline: false,
          isCurrentUser: false,
        };
      });

      const profileMap = new Map(
        results.map((profile) => [profile.email, profile])
      );
      this.participantProfiles = rawEmails.map((email) => {
        const key = this.normalizeEmail(email);
        const profile = profileMap.get(key);
        if (profile) {
          return {
            ...profile,
            email,
          };
        }
        return {
          email,
          displayName: email,
          exists: false,
          isOnline: false,
          isCurrentUser: false,
        };
      });
      this.subscribeToParticipantPresence();
    } finally {
      this.isLoadingParticipantProfiles = false;
    }
  }

  private subscribeToParticipantPresence(): void {
    const fallbackLastActiveByUid = new Map<string, string | undefined>();
    const uids = this.participantProfiles
      .map((participant) => {
        const uid = String(participant.uid || '').trim();
        if (uid) {
          fallbackLastActiveByUid.set(uid, participant.lastActiveAt);
        }
        return uid;
      })
      .filter(Boolean);

    this.participantPresenceSub?.unsubscribe();
    this.onlineParticipantCount = 0;
    this.onlineParticipantUids = new Set<string>();

    this.participantPresenceSub = this.presence
      .watchOnlineUids$(uids, fallbackLastActiveByUid)
      .subscribe((onlineUids) => {
        this.onlineParticipantUids = onlineUids;
        this.onlineParticipantCount = onlineUids.size;
        this.participantProfiles = this.participantProfiles.map((participant) => ({
          ...participant,
          isOnline: !!participant.uid && onlineUids.has(participant.uid),
        }));
      });
  }

  async loadAdminProfiles(): Promise<void> {
    const rawEmails = (this.visibleAdminEmails || [])
      .map((email) => (email || '').toString().trim())
      .filter((email) => email);

    if (!rawEmails.length) {
      this.adminProfiles = [];
      this.isLoadingAdminProfiles = false;
      return;
    }

    this.isLoadingAdminProfiles = true;
    try {
      const normalizedEmails = rawEmails.map((email) =>
        this.normalizeEmail(email)
      );
      const uniqueEmails = Array.from(new Set(normalizedEmails));

      const results = await Promise.all(
        uniqueEmails.map(async (email) => {
          try {
            const users = await firstValueFrom(
              this.auth.getUserFromEmail(email)
            );
            const user = users?.[0];
            if (user) {
              const name = [user.firstName, user.lastName]
                .filter(Boolean)
                .join(' ')
                .trim();
              return {
                email,
                displayName: name || email,
                uid: user.uid,
                photoUrl:
                  user.profilePicture?.downloadURL || user.profilePicPath || '',
                exists: true,
                isCurrentUser: user.uid === this.auth.currentUser?.uid,
              };
            }
          } catch {}

          return {
            email,
            displayName: email,
            exists: false,
            isCurrentUser: false,
          };
        })
      );

      const profileMap = new Map(
        results.map((profile) => [profile.email, profile])
      );
      this.adminProfiles = rawEmails.map((email) => {
        const key = this.normalizeEmail(email);
        const profile = profileMap.get(key);
        if (profile) {
          return {
            ...profile,
            email,
          };
        }
        return {
          email,
          displayName: email,
          exists: false,
          isCurrentUser: false,
        };
      });
    } finally {
      this.isLoadingAdminProfiles = false;
    }
  }

  participantInitial(profile: { displayName: string; email: string }): string {
    const label = profile.displayName || profile.email || '';
    return label.trim().charAt(0).toUpperCase() || '?';
  }
  toggle(
    property:
      | 'isSidebarOpen'
      | 'showAddChallenge'
      | 'showExistingChallenges'
      | 'showAddTeamMember'
      | 'showRemoveTeamMember'
      | 'showEditLinks'
      | 'showEditHandouts'
      | 'showEditProgram'
      | 'showMergeSolution'
      | 'showMySolutions'
      | 'showRemoveAdmin'
      | 'showAddAdmin'
  ) {
    this[property] = !this[property];
    
    // Load the large user directory only when an admin opens a people picker.
    if (property === 'showAddTeamMember' && this.showAddTeamMember) {
      void this.loadAllUsersForSearch();
      this.clearSelectedUser();
      this.clearBulkParticipants();
    }
    
    // Reset remove participant search when opening modal
    if (property === 'showRemoveTeamMember' && this.showRemoveTeamMember) {
      this.removeParticipantSearchQuery = '';
      this.teamMemberToDelete = '';
    }

    if (property === 'showAddAdmin' && this.showAddAdmin) {
      void this.loadAllUsersForSearch();
      this.clearSelectedAdmin();
    }

    // Reset remove admin search when opening modal
    if (property === 'showRemoveAdmin' && this.showRemoveAdmin) {
      this.removeAdminSearchQuery = '';
      this.adminToRemove = '';
    }
  }

  private loadAllUsersForSearch(): Promise<void> {
    if (this.allUsers.length) {
      return Promise.resolve();
    }
    if (this.allUsersLoadPromise) {
      return this.allUsersLoadPromise;
    }

    this.allUsersLoadPromise = firstValueFrom(this.auth.getALlUsers())
      .then((users) => {
        this.allUsers = users || [];
      })
      .catch((error) => {
        console.warn('Could not preload the user search directory', error);
      })
      .finally(() => {
        this.allUsersLoadPromise = undefined;
      });
    return this.allUsersLoadPromise;
  }
  get adminEmailsToRender(): string[] {
    const list = this.visibleAdminEmails || [];
    return this.showAllAdmins ? list : list.slice(0, 5);
  }

  /**
   * Hybrid search: Instant client-side filter + server-side fallback
   * - Immediately filters from cached users (instant feedback)
   * - If few/no results, also queries Firestore with debounce (catches users not in cache)
   * - Scales well: works fast for small datasets, falls back to server for large ones
   */
  onUserSearchChange(): void {
    // Reset selected user if input changes
    this.selectedUserToAdd = null;
    
    // Clear any pending server search
    if (this.userSearchTimeout) {
      clearTimeout(this.userSearchTimeout);
    }
    
    const searchTerm = this.userSearchQuery.toLowerCase().trim();
    
    if (searchTerm.length === 0) {
      this.userSearchResults = [];
      this.showUserSuggestions = false;
      this.isSearchingUsers = false;
      return;
    }
    
    // STEP 1: Instant client-side filter from cached users
    const clientResults = this.filterUsersLocally(searchTerm);
    this.userSearchResults = clientResults;
    this.showUserSuggestions = clientResults.length > 0;
    
    // STEP 2: If few results OR searching by email, also query server (debounced)
    if (clientResults.length < 5 || searchTerm.includes('@')) {
      this.isSearchingUsers = true;
      this.userSearchTimeout = setTimeout(() => {
        this.searchUsersFromServer(searchTerm);
      }, 300); // 300ms debounce for server query
    }
  }

  /**
   * Filter users from local cache (instant)
   */
  private filterUsersLocally(searchTerm: string): { email: string; displayName: string; photoUrl?: string; uid?: string }[] {
    return this.allUsers
      .filter((user: any) => {
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const displayName = (user.displayName || '').toLowerCase();
        
        // Don't show users already in participants
        if (this.participants.some(p => this.normalizeEmail(p) === this.normalizeEmail(email))) {
          return false;
        }
        
        return (
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm) ||
          email.includes(searchTerm) ||
          displayName.includes(searchTerm)
        );
      })
      .slice(0, 10)
      .map((user: any) => ({
        email: user.email || '',
        displayName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.displayName || user.email || '',
        photoUrl: user.profilePicture?.downloadURL || user.profilePicPath || '',
        uid: user.uid
      }));
  }

  /**
   * Search users from Firestore (scalable server-side search)
   */
  private searchUsersFromServer(searchTerm: string): void {
    this.auth.searchUsers(searchTerm, 15).subscribe({
      next: (serverUsers) => {
        // Merge server results with client results, avoiding duplicates
        const existingEmails = new Set(this.userSearchResults.map(u => u.email.toLowerCase()));
        
        const newResults = serverUsers
          .filter((user: any) => {
            const email = (user.email || '').toLowerCase();
            // Skip duplicates and existing participants
            if (existingEmails.has(email)) return false;
            if (this.participants.some(p => this.normalizeEmail(p) === this.normalizeEmail(email))) return false;
            return true;
          })
          .map((user: any) => ({
            email: user.email || '',
            displayName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.displayName || user.email || '',
            photoUrl: user.profilePicture?.downloadURL || user.profilePicPath || '',
            uid: user.uid
          }));
        
        // Combine results (client results first, then server additions)
        this.userSearchResults = [...this.userSearchResults, ...newResults].slice(0, 12);
        this.showUserSuggestions = this.userSearchResults.length > 0;
        this.isSearchingUsers = false;
      },
      error: (err) => {
        console.error('Server search failed:', err);
        this.isSearchingUsers = false;
        // Keep showing client results even if server fails
      }
    });
  }

  selectUserToAdd(user: { email: string; displayName: string; photoUrl?: string; uid?: string }): void {
    this.selectedUserToAdd = user;
    this.userSearchQuery = user.email || '';
    this.userSearchResults = [];
    this.showUserSuggestions = false;
    this.newParticipant = user.email;
  }

  clearSelectedUser(): void {
    this.selectedUserToAdd = null;
    this.userSearchQuery = '';
    this.newParticipant = '';
    this.userSearchResults = [];
    this.showUserSuggestions = false;
  }

  onBulkParticipantsTextChange(): void {
    this.refreshBulkParticipantPreview();
  }

  onBulkParticipantsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.bulkParticipantsFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.bulkParticipantsText = String(reader.result || '');
      this.refreshBulkParticipantPreview();
      input.value = '';
    };
    reader.onerror = () => {
      this.toast.error('Could not read that CSV file.');
      input.value = '';
    };
    reader.readAsText(file);
  }

  clearBulkParticipants(): void {
    this.bulkParticipantsText = '';
    this.bulkParticipantsFileName = '';
    this.bulkParticipantEmails = [];
    this.bulkDuplicateEmails = [];
  }

  private refreshBulkParticipantPreview(): void {
    const extractedEmails = this.extractEmailsFromText(this.bulkParticipantsText);
    const existingEmails = new Set(
      (this.participants || []).map((email) => this.normalizeEmail(email))
    );

    this.bulkDuplicateEmails = extractedEmails.filter((email) =>
      existingEmails.has(email)
    );
    this.bulkParticipantEmails = extractedEmails.filter(
      (email) => !existingEmails.has(email)
    );
  }

  private extractEmailsFromText(text: string): string[] {
    const matches =
      text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    const uniqueEmails = new Set<string>();

    matches.forEach((email) => {
      const normalizedEmail = this.normalizeEmail(email);
      if (normalizedEmail && this.data.isValidEmail(normalizedEmail)) {
        uniqueEmails.add(normalizedEmail);
      }
    });

    return Array.from(uniqueEmails);
  }

  // Filter participants for remove modal
  get filteredParticipantsForRemoval(): typeof this.participantProfiles {
    const query = this.removeParticipantSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.participantProfiles;
    }
    return this.participantProfiles.filter(p => 
      p.email.toLowerCase().includes(query) || 
      p.displayName.toLowerCase().includes(query)
    );
  }

  // Admin search methods (hybrid: client-side + server fallback)
  showAdminSuggestions = false;
  private adminSearchTimeout: any;
  
  onAdminSearchChange(): void {
    // Reset selected admin if input changes
    this.selectedAdminToAdd = null;
    
    // Clear any pending server search
    if (this.adminSearchTimeout) {
      clearTimeout(this.adminSearchTimeout);
    }
    
    const searchTerm = this.adminSearchQuery.toLowerCase().trim();
    
    if (searchTerm.length === 0) {
      this.adminSearchResults = [];
      this.showAdminSuggestions = false;
      this.isSearchingAdmins = false;
      return;
    }
    
    // STEP 1: Instant client-side filter from cached users
    const clientResults = this.filterAdminsLocally(searchTerm);
    this.adminSearchResults = clientResults;
    this.showAdminSuggestions = clientResults.length > 0;
    
    // STEP 2: If few results OR searching by email, also query server (debounced)
    if (clientResults.length < 5 || searchTerm.includes('@')) {
      this.isSearchingAdmins = true;
      this.adminSearchTimeout = setTimeout(() => {
        this.searchAdminsFromServer(searchTerm);
      }, 300);
    }
  }

  /**
   * Filter admins from local cache (instant)
   */
  private filterAdminsLocally(searchTerm: string): { email: string; displayName: string; photoUrl?: string; uid?: string }[] {
    return this.allUsers
      .filter((user: any) => {
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const displayName = (user.displayName || '').toLowerCase();
        
        // Don't show users already in admins
        if ((this.adminEmails || []).some(e => this.normalizeEmail(e) === this.normalizeEmail(email))) {
          return false;
        }
        
        return (
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm) ||
          email.includes(searchTerm) ||
          displayName.includes(searchTerm)
        );
      })
      .slice(0, 10)
      .map((user: any) => ({
        email: user.email || '',
        displayName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.displayName || user.email || '',
        photoUrl: user.profilePicture?.downloadURL || user.profilePicPath || '',
        uid: user.uid
      }));
  }

  /**
   * Search admins from Firestore (scalable server-side search)
   */
  private searchAdminsFromServer(searchTerm: string): void {
    this.auth.searchUsers(searchTerm, 15).subscribe({
      next: (serverUsers) => {
        const existingEmails = new Set(this.adminSearchResults.map(u => u.email.toLowerCase()));
        
        const newResults = serverUsers
          .filter((user: any) => {
            const email = (user.email || '').toLowerCase();
            if (existingEmails.has(email)) return false;
            if ((this.adminEmails || []).some(e => this.normalizeEmail(e) === this.normalizeEmail(email))) return false;
            return true;
          })
          .map((user: any) => ({
            email: user.email || '',
            displayName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.displayName || user.email || '',
            photoUrl: user.profilePicture?.downloadURL || user.profilePicPath || '',
            uid: user.uid
          }));
        
        this.adminSearchResults = [...this.adminSearchResults, ...newResults].slice(0, 12);
        this.showAdminSuggestions = this.adminSearchResults.length > 0;
        this.isSearchingAdmins = false;
      },
      error: (err) => {
        console.error('Server search failed:', err);
        this.isSearchingAdmins = false;
      }
    });
  }

  selectAdminToAdd(user: { email: string; displayName: string; photoUrl?: string; uid?: string }): void {
    this.selectedAdminToAdd = user;
    this.adminSearchQuery = user.displayName || user.email;
    this.adminSearchResults = [];
    this.newAdminEmail = user.email;
  }

  clearSelectedAdmin(): void {
    this.selectedAdminToAdd = null;
    this.adminSearchQuery = '';
    this.newAdminEmail = '';
    this.adminSearchResults = [];
  }

  // Filter admins for remove modal
  get filteredAdminsForRemoval(): typeof this.adminProfiles {
    const query = this.removeAdminSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.adminProfiles;
    }
    return this.adminProfiles.filter(p => 
      p.email.toLowerCase().includes(query) || 
      p.displayName.toLowerCase().includes(query)
    );
  }

  async addParticipant() {
    const emailToAdd = this.selectedUserToAdd?.email || this.newParticipant;
    
    if (!emailToAdd || !this.data.isValidEmail(emailToAdd)) {
      this.toast.error('Please enter a valid email address to add a participant.');
      return;
    }

    if (this.participants.some(p => this.normalizeEmail(p) === this.normalizeEmail(emailToAdd))) {
      this.toast.warning('This participant has already been added.');
      return;
    }

    this.participants.push(emailToAdd);
    this.isLoading = true;

    try {
      this.challenge.addParticipantToChallengePage(
        this.challengePageId,
        this.participants
      ); // then send email to participant
      await this.sendEmailToParticipant(emailToAdd);
      await this.loadParticipantProfiles();

      console.log('Participant added successfully:', emailToAdd);
      this.toast.success(`${this.selectedUserToAdd?.displayName || emailToAdd} added successfully!`);
      this.toggle('showAddTeamMember');
      this.isLoading = false;
    } catch (error) {
      console.error('Error adding participant:', error);
    }
    
    // Reset state
    this.newParticipant = '';
    this.selectedUserToAdd = null;
    this.userSearchQuery = '';
    this.userSearchResults = [];
  }

  async addBulkParticipants(): Promise<void> {
    this.refreshBulkParticipantPreview();

    if (!this.bulkParticipantEmails.length) {
      this.toast.warning('Paste or upload a list with at least one new valid email.');
      return;
    }

    const nextParticipants = [
      ...(this.participants || []),
      ...this.bulkParticipantEmails,
    ];

    this.isLoading = true;
    try {
      await this.challenge.addParticipantToChallengePage(
        this.challengePageId,
        nextParticipants
      );

      this.participants = nextParticipants;
      await this.loadParticipantProfiles();

      const inviteResults = await Promise.allSettled(
        this.bulkParticipantEmails.map((email) =>
          this.sendEmailToParticipant(email)
        )
      );
      const failedInvites = inviteResults.filter(
        (result) => result.status === 'rejected'
      ).length;

      const addedCount = this.bulkParticipantEmails.length;
      const skippedCount = this.bulkDuplicateEmails.length;
      this.clearBulkParticipants();
      this.toggle('showAddTeamMember');

      if (failedInvites) {
        this.toast.warning(
          `${addedCount} participant${addedCount === 1 ? '' : 's'} added. ${failedInvites} invite email${failedInvites === 1 ? '' : 's'} could not be sent.`
        );
      } else if (skippedCount) {
        this.toast.success(
          `${addedCount} participant${addedCount === 1 ? '' : 's'} added. ${skippedCount} duplicate${skippedCount === 1 ? '' : 's'} skipped.`
        );
      } else {
        this.toast.success(
          `${addedCount} participant${addedCount === 1 ? '' : 's'} added.`
        );
      }
    } catch (error) {
      console.error('Error adding bulk participants:', error);
      this.toast.error('Could not add participants. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  removeParticipant(email: string) {
    if (!email) {
      console.error('No email provided to remove participant.');
      return; // Exit early
    } else if (!this.participants.includes(email)) {
      console.error('Participant not found in the list.');
      return; // Exit early
    }
    const index = this.participants.indexOf(email);
    this.participants.splice(index, 1); // Remove the participant from the list

    try {
      this.challenge.addParticipantToChallengePage(
        this.challengePageId,
        this.participants
      );
      this.loadParticipantProfiles();

      console.log('Participant removed successfully:', email);
      this.toast.success('Participant removed successfully!');
      this.toggle('showRemoveTeamMember');
    } catch (error) {
      console.error('Error removing participant from challenge:', error);
    }
  }

  async joinChallengePage(): Promise<void> {
    const email = this.normalizeEmail(this.auth.currentUser?.email || '');
    if (!email || !this.data.isValidEmail(email)) {
      this.toast.error('Please sign in to join this workspace.');
      return;
    }

    if (this.isJoining) {
      return;
    }

    const alreadyParticipant = (this.participants || []).some(
      (participant) => this.normalizeEmail(participant) === email
    );
    if (alreadyParticipant) {
      this.showJoinPrompt = false;
      this.allowAccess = true;
      return;
    }

    this.isJoining = true;
    const nextParticipants = [...(this.participants || [])];
    nextParticipants.push(email);

    try {
      await this.challenge.addParticipantToChallengePage(
        this.challengePageId,
        nextParticipants
      );
      this.participants = nextParticipants;
      this.allowAccess = true;
      this.showJoinPrompt = false;
      this.loadParticipantProfiles();
    } catch (error) {
      console.error('Error joining challenge page:', error);
      this.toast.error('Could not join this workspace. Please try again.');
    } finally {
      this.isJoining = false;
    }
  }

  declineJoin(): void {
    this.showJoinPrompt = false;
    this.router.navigate(['/home']);
  }

  openLeavePrompt(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showLeavePrompt = true;
  }

  cancelLeave(): void {
    this.showLeavePrompt = false;
  }

  async leaveChallengePage(): Promise<void> {
    const email = this.normalizeEmail(this.auth.currentUser?.email || '');
    if (!email) {
      return;
    }

    const nextParticipants = (this.participants || []).filter(
      (participant) => this.normalizeEmail(participant) !== email
    );

    try {
      await this.challenge.addParticipantToChallengePage(
        this.challengePageId,
        nextParticipants
      );
      this.participants = nextParticipants;
      this.allowAccess = this.isAuthorPage;
      this.loadParticipantProfiles();
      this.showLeavePrompt = false;
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error leaving challenge page:', error);
      this.toast.error('Could not leave this workspace. Please try again.');
    }
  }
  deleteChallengePage() {
    if (
      !confirm(
        'Are you sure you want to delete this challenge page and all associated user challenges?'
      )
    ) {
      return;
    }

    const batch = this.afs.firestore.batch();
    const challengePageRef = this.afs.doc(
      `challengePages/${this.challengePageId}`
    ).ref;

    // Delete the challenge page
    batch.delete(challengePageRef);

    // Also delete the denormalized copy under schools if it exists
    const schoolId = (this.challengePage as any)?.schoolId;
    if (schoolId) {
      const schoolClassRef = this.afs.doc(
        `schools/${schoolId}/classes/${this.challengePageId}`
      ).ref;
      batch.delete(schoolClassRef);
    }

    // Fetch and delete all user challenges where `authorId` matches the current user ID
    const userId = this.auth.currentUser.uid;
    this.afs
      .collection('user-challenges', (ref) =>
        ref.where('authorId', '==', userId)
      )
      .get()
      .subscribe((snapshot) => {
        snapshot.forEach((doc) => {
          batch.delete(doc.ref); // Add each user challenge document to the batch
        });

        // Commit the batch
        batch
          .commit()
          .then(() => {
            console.log(
              'Challenge page and related user challenges deleted successfully.'
            );
            this.router.navigate(['/home']);
          })
          .catch((error) => {
            console.error(
              'Error deleting challenge page or related challenges:',
              error
            );
            this.toast.error(
              'There was an error while deleting the challenge page. Try again.'
            );
          });
      });
  }

  toggleHover(event: boolean) {
    this.isHovering = event;
  }
  async startUpload(event: FileList) {
    if (!this.challengeId) {
      this.challengeId = this.afs.createId(); // Generate ID only if not already generated
    }

    try {
      const url = await this.data.startUpload(
        event,
        `challenges/${this.challengeId}`,
        'false'
      );
      this.imageCreateChallenge = url!;
      console.log('The URL is', url);
      console.log('The ID is', this.challengeId);
    } catch (error) {
      console.error('Error uploading file:', error);
      this.toast.error('Error occurred while uploading file. Please try again.');
    }
  }
  async addCreateChallenge() {
    const currentUser = this.auth.currentUser;
    if (!currentUser?.uid || !currentUser?.email || !this.challengePageId) {
      this.toast.error('Please sign in before adding a solution.');
      return;
    }

    if (
      !this.titleCreateChallenge ||
      !this.descriptionCreateChallenge ||
      !this.imageCreateChallenge
    ) {
      this.toast.error('Please fill in all required fields before adding the solution.');
      return;
    }

    if (!this.challengeId) {
      this.challengeId = this.afs.createId();
    }

    const newChallenge = {
      id: this.challengeId,
      title: this.titleCreateChallenge,
      description: this.descriptionCreateChallenge,
      category: 'General',
      image: this.imageCreateChallenge,
      authorId: currentUser.uid,
      challengePageId: this.challengePageId,
    };

    try {
      this.isLoading = true;
      await this.challenge.addUserChallenge(newChallenge);
      console.log('Challenge added successfully:', newChallenge);
      // this.selectChallenge();
      // 2️⃣ create the linked Solution

      await this.solution.createdNewSolution(
        newChallenge.title,
        '',
        newChallenge.description,
        newChallenge.image,

        [{ name: currentUser.email }],
        [], // Assuming 'any' means an array of evaluators
        // endDate: "", // This was commented out in your request, so I've kept it out
        [],
        this.challengeId,
        String(this.challengePageId)
      );
      // Clear the form fields

      // 4️⃣ housekeeping
      // this.resetCreateChallengeInfo();
      // this.toggle('showAddChallenge');
      this.isLoading = false;
      this.router.navigate(['/dashboard', this.challengeId]);
    } catch (err) {
      console.error('Error creating solution:', err);
      this.toast.error('There was a problem creating the solution.');
    }

    // Automatically select the added challenge and navigate
  }

  resetCreateChallengeInfo() {
    this.titleCreateChallenge = '';
    this.descriptionCreateChallenge = '';
    this.imageCreateChallenge = '';
  }
  selectChallenge() {
    if (!this.challengeId) {
      console.error('No challenge ID available to select.');
      return;
    }
    const selectedChallengeItem = {
      id: this.challengeId,
      title: this.titleCreateChallenge,
      description: this.descriptionCreateChallenge,
      image: this.imageCreateChallenge,
      restricted: 'true',
    };

    this.challenge.setSelectedChallengeItem(selectedChallengeItem);

    this.router.navigate(['/start-challenge/']);
  }
  // Function to copy the current URL to the clipboard
  copyUrlToClipboard() {
    const currentUrl = window.location.href;

    // Use the Clipboard API to copy the URL
    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        this.toast.success('URL copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy URL: ', err);
        this.toast.error('Failed to copy URL. Please try again.');
      });
  }

  // Send beautiful invite email to participants
  async sendEmailToParticipant(participant: string) {
    console.log('sending email invite to ', participant);
    const sendParticipantInvite = this.fns.httpsCallable('sendParticipantInvite');

    try {
      // Fetch the user data to check if they're registered
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(participant)
      );
      const isRegisteredUser = users && users.length > 0;
      const inviterName = `${this.auth.currentUser.firstName || ''} ${this.auth.currentUser.lastName || ''}`.trim() || 'A team member';
      
      const emailData = {
        email: participant,
        inviterName,
        title: this.challengePage.name || 'Challenge Workspace',
        description: this.challengePage.description || '',
        image: this.challengePage.imageChallenge || '',
        logoImage: this.challengePage.logoImage || '',
        path: `https://newworld-game.org/home-challenge/${this.challengePageId}`,
        type: 'challenge',
        recipientName: isRegisteredUser ? `${users[0].firstName || ''} ${users[0].lastName || ''}`.trim() : '',
        isNewUser: !isRegisteredUser,
      };

      const result = await firstValueFrom(sendParticipantInvite(emailData));
      console.log(`Email sent to ${participant}:`, result);
    } catch (error) {
      console.error(`Error sending invite to ${participant}:`, error);
    }
  }
  canRemoveSolutionFromPage(index: number): boolean {
    const currentUid = this.auth.currentUser?.uid || '';
    return (
      !!currentUid &&
      (this.isAuthorPage || this.solutionAddedByUids[index] === currentUid)
    );
  }

  openSolutionRemoval(index: number): void {
    if (!this.canRemoveSolutionFromPage(index)) {
      this.toast.error('Only the contributor or a workspace admin can remove this solution.');
      return;
    }

    this.solutionRemovalTarget = {
      id: this.ids[index],
      index,
      title: this.titles[index] || 'This solution',
    };
  }

  closeSolutionRemoval(): void {
    if (!this.isRemovingSolution) {
      this.solutionRemovalTarget = null;
    }
  }

  async removeSolutionFromPage(): Promise<void> {
    const target = this.solutionRemovalTarget;
    const currentIndex = target ? this.ids.indexOf(target.id) : -1;
    if (
      !target ||
      currentIndex < 0 ||
      !this.canRemoveSolutionFromPage(currentIndex)
    ) {
      return;
    }

    this.isRemovingSolution = true;
    try {
      // Remove the page link and its denormalized inheritance pointer. The
      // underlying solution, answers, and team remain intact.
      const solutionRef = this.afs.doc<Solution>(`solutions/${target.id}`).ref;
      const solutionSnapshot = await solutionRef.get();
      const solutionData = solutionSnapshot.data();
      const batch = this.afs.firestore.batch();
      batch.delete(this.afs.doc(`user-challenges/${target.id}`).ref);
      if (
        solutionData &&
        solutionData.challengePageId === this.challengePageId &&
        this.canManageSolutionDocument(solutionData)
      ) {
        batch.update(solutionRef, {
          challengePageId: firebase.firestore.FieldValue.delete(),
        });
      }
      await batch.commit();

      this.ids.splice(currentIndex, 1);
      this.titles.splice(currentIndex, 1);
      this.descriptions.splice(currentIndex, 1);
      this.challengeImages.splice(currentIndex, 1);
      this.solutionAddedByUids.splice(currentIndex, 1);
      this.solutionPrivateFlags.splice(currentIndex, 1);
      this.solutionParticipantCounts.splice(currentIndex, 1);
      this.pageChallengeCards = this.pageChallengeCards.filter(
        (card) => (card.id || card.docId) !== target.id
      );

      const cachedChallenges = this.challenges[this.allChallengesKey];
      cachedChallenges?.ids?.splice(currentIndex, 1);
      cachedChallenges?.titles.splice(currentIndex, 1);
      cachedChallenges?.frenchTitles?.splice(currentIndex, 1);
      cachedChallenges?.descriptions.splice(currentIndex, 1);
      cachedChallenges?.frenchDescriptions?.splice(currentIndex, 1);
      cachedChallenges?.images.splice(currentIndex, 1);
      cachedChallenges?.addedByUids?.splice(currentIndex, 1);
      cachedChallenges?.privateFlags?.splice(currentIndex, 1);
      cachedChallenges?.participantCounts?.splice(currentIndex, 1);

      this.solutionRemovalTarget = null;
      this.toast.success('Solution removed from this challenge page.');
    } catch (error) {
      console.error('Unable to remove solution from challenge page:', error);
      this.toast.error('Could not remove the solution from this page.');
    } finally {
      this.isRemovingSolution = false;
    }
  }
  // home-challenge.component.ts  (add below other methods)
  toggleVisibility(): void {
    this.isPrivate = !this.isPrivate;
    this.afs
      .doc(`challengePages/${this.challengePageId}`)
      .update({ isPrivate: this.isPrivate })
      .catch((err) => console.error('Visibility update failed', err));
  }
  async toggleParticipantsVisibilityGlobal() {
    if (!this.isAuthorPage) {
      // safeguard - only author can change for all
      this.showParticipantsList = !this.showParticipantsList; // local fallback
      return;
    }

    // flip & persist
    this.participantsHidden = !this.participantsHidden;
    this.showParticipantsList = !this.participantsHidden;

    try {
      await this.afs
        .doc(`challengePages/${this.challengePageId}`)
        .update({ participantsHidden: this.participantsHidden });
    } catch (err) {
      console.error('Failed to update visibility', err);
      this.toast.error('Could not update participants visibility.');
    }
  }
  async addHandout() {
    if (!this.handoutName.trim() || !this.handoutFile) {
      this.toast.warning('Choose a file and give it a name.');
      return;
    }
    this.isLoading = true;
    try {
      const url = await this.uploadHandout(this.handoutFile);
      this.handouts.push({ name: this.handoutName.trim(), url });

      await this.afs
        .doc(`challengePages/${this.challengePageId}`)
        .update({ handouts: this.handouts });

      // reset inputs
      this.handoutName = '';
      this.handoutFile = null;
    } catch (err) {
      console.error(err);
      this.toast.error('Upload failed.');
    } finally {
      this.isLoading = false;
    }
  }

  async removeHandout(index: number) {
    if (!confirm('Delete this document?')) return;
    this.handouts.splice(index, 1);
    await this.afs
      .doc(`challengePages/${this.challengePageId}`)
      .update({ handouts: this.handouts });
  }
  async uploadHandout(file: File): Promise<string> {
    // store under the current page → handouts/{randomId}
    const url = await this.data.startUpload(
      file,
      `handouts/${this.afs.createId()}`,
      'false'
    );
    return url!;
  }
  async uploadProgramPDF(file: File): Promise<string> {
    const url = await this.data.startUpload(
      file,
      `programDocs/${this.afs.createId()}`,
      'false'
    );
    return url!;
  }
  async saveProgramPDF() {
    if (!this.programTitleTmp.trim()) {
      this.toast.warning('Please enter a title.');
      return;
    }

    // if user is only renaming, no new file is needed
    if (!this.programFileTmp && !this.programPDF) {
      this.toast.warning('Please choose a PDF to upload.');
      return;
    }

    this.isLoading = true;
    try {
      let url = this.programPDF?.url || '';
      if (this.programFileTmp) {
        url = await this.uploadProgramPDF(this.programFileTmp);
      }

      this.programPDF = { title: this.programTitleTmp.trim(), url };

      await this.afs
        .doc(`challengePages/${this.challengePageId}`)
        .update({ programPDF: this.programPDF });

      // reset
      this.programTitleTmp = '';
      this.programFileTmp = null;
      this.toggle('showEditProgram');
    } catch (err) {
      console.error('Program PDF update failed', err);
      this.toast.error('Upload failed — try again.');
    } finally {
      this.isLoading = false;
    }
  }

  /* delete */
  async deleteProgramPDF() {
    if (!confirm('Remove the current Program PDF?')) return;
    await this.afs
      .doc(`challengePages/${this.challengePageId}`)
      .update({ programPDF: null });
    this.programPDF = null;
  }

  /* ───────── helpers at the bottom of the class ───────── */

  /** Map MIME → extension */
  private mimeExt(mime: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'docx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        'pptx',
    };
    return map[mime] || '';
  }

  /** Friendly download that always has a filename+ext */
  downloadFile(ev: Event, baseName: string, url: string) {
    ev.preventDefault(); // stop the browser’s default
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        // figure out extension
        const ext =
          this.mimeExt(blob.type) ||
          url.match(/\.(\w{3,4})(?:\?|$)/)?.[1] ||
          '';
        const filename = `${this.stripExt(baseName)}${ext ? '.' + ext : ''}`;

        // download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      })
      .catch((err) => {
        console.error('Download failed', err);
        window.open(url, '_blank'); // graceful fallback
      });
  }

  /** Remove any existing extension from a name */
  private stripExt(name: string): string {
    return name.replace(/\.[^./\\]+$/, '');
  }

  openEditChallenge(id: string, index: number) {
    this.editChallengeId = id;
    this.editIndex = index;
    this.editTitle = this.titles[index];
    this.editDescription = this.descriptions[index];
    this.editImage = this.challengeImages[index] || '';
    this.editSolutionPrivate = !!this.solutionPrivateFlags[index];
    this.showEditChallenge = true;
  }

  async startEditChallengeImageUpload(event: FileList) {
    if (!this.editChallengeId) {
      return;
    }

    try {
      const url = await this.data.startUpload(
        event,
        `challenges/${this.editChallengeId}`,
        'false'
      );
      this.editImage = url || this.editImage;
    } catch (error) {
      console.error('Error uploading challenge image:', error);
      this.toast.error('Error occurred while uploading file. Please try again.');
    }
  }

  async saveEditChallenge() {
    try {
      this.isLoading = true;
      const title = this.editTitle.trim();
      const description = this.editDescription.trim();
      const image =
        this.editImage && this.editImage !== 'No image available'
          ? this.editImage
          : '';

      const batch = this.afs.firestore.batch();
      const challengeRef = this.afs.doc(
        `user-challenges/${this.editChallengeId}`
      ).ref;
      const solutionRef = this.afs.doc(`solutions/${this.editChallengeId}`).ref;

      batch.set(
        challengeRef,
        {
          title,
          description,
          image,
          isPrivate: this.editSolutionPrivate,
          titleLower: title.toLowerCase(),
        },
        { merge: true }
      );
      batch.set(
        solutionRef,
        {
          title,
          description,
          image,
          isPrivate: this.editSolutionPrivate,
        },
        { merge: true }
      );

      await batch.commit();

      /* — update local arrays for instant UI feedback — */
      this.titles[this.editIndex] = title;
      this.descriptions[this.editIndex] = description;
      this.challengeImages[this.editIndex] = image || 'No image available';
      this.solutionPrivateFlags[this.editIndex] = this.editSolutionPrivate;

      const cachedChallenges = this.challenges[this.allChallengesKey];
      if (cachedChallenges) {
        cachedChallenges.titles[this.editIndex] = title;
        cachedChallenges.descriptions[this.editIndex] = description;
        cachedChallenges.images[this.editIndex] = image || 'No image available';
        if (cachedChallenges.privateFlags) {
          cachedChallenges.privateFlags[this.editIndex] =
            this.editSolutionPrivate;
        }
      }

      const challengeCard = this.pageChallengeCards.find(
        (card) => (card.id || card.docId) === this.editChallengeId
      );
      if (challengeCard) {
        Object.assign(challengeCard, {
          title,
          description,
          image,
          isPrivate: this.editSolutionPrivate,
        });
      }

      this.showEditChallenge = false;
      this.toast.success('Challenge updated.');
    } catch (err) {
      console.error('Update failed:', err);
      this.toast.error('Could not update challenge—try again.');
    } finally {
      this.isLoading = false;
    }
  }

  get filteredMySolutions(): Solution[] {
    const linkedIds = new Set(this.ids);
    const search = this.mySolutionSearch.trim().toLowerCase();

    return this.mySolutions.filter((solution) => {
      const id = solution.solutionId || '';
      if (!id || linkedIds.has(id)) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [solution.title, solution.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }

  async openMySolutions(): Promise<void> {
    const email = this.auth.currentUser?.email;
    if (!email) {
      this.toast.error('Please sign in before adding a solution.');
      return;
    }

    this.showMySolutions = true;
    this.isLoadingMySolutions = true;
    this.mySolutionsError = '';
    this.mySolutionSearch = '';

    try {
      const solutions = await this.solution.getSolutionsForUserPicker(
        this.auth.currentUser?.uid,
        email
      );
      this.mySolutions = [...(solutions || [])].sort((a, b) =>
        String(a.title || '').localeCompare(String(b.title || ''))
      );
    } catch (error) {
      console.error('Unable to load user solutions:', error);
      this.mySolutions = [];
      this.mySolutionsError = 'Could not load your solutions. Please try again.';
    } finally {
      this.isLoadingMySolutions = false;
    }
  }

  async addMySolutionToPage(solution: Solution): Promise<void> {
    const id = String(solution.solutionId || '').trim();
    if (!id) {
      this.toast.error('This solution is missing its ID.');
      return;
    }

    const added = await this.linkSolutionToChallengePage(id, solution);
    if (added) {
      this.showMySolutions = false;
      this.mySolutionSearch = '';
    }
  }

  async addSolutionById(): Promise<void> {
    if (!this.isAuthorPage) {
      this.toast.error('Only workspace admins can add a solution by ID.');
      return;
    }

    const id = this.mergeSolutionId.trim();
    if (!id) {
      this.toast.warning('Enter a solution ID.');
      return;
    }

    const added = await this.linkSolutionToChallengePage(id);
    if (added) {
      this.mergeSolutionId = '';
      this.showMergeSolution = false;
    }
  }

  private async linkSolutionToChallengePage(
    id: string,
    existingSolution?: Solution
  ): Promise<boolean> {
    const currentUser = this.auth.currentUser;
    if (!currentUser?.uid || !this.challengePageId) {
      this.toast.error('Please sign in before adding a solution.');
      return false;
    }

    if (this.ids.includes(id)) {
      this.toast.warning('This solution is already on the challenge page.');
      return false;
    }

    this.addingSolutionId = id;
    try {
      let solutionToAdd: Solution | undefined = existingSolution;
      if (!solutionToAdd) {
        const solSnap = await this.afs.doc<Solution>(`solutions/${id}`).ref.get();
        if (!solSnap.exists) {
          this.toast.error('No solution found with that ID.');
          return false;
        }
        solutionToAdd = solSnap.data();
      }

      if (!solutionToAdd) {
        this.toast.error('Could not load that solution.');
        return false;
      }

      const title = (
        solutionToAdd.title ||
        (solutionToAdd as any).solutionTitle ||
        'Untitled Solution'
      ).toString();
      const description = (solutionToAdd.description || '').toString();
      const image = (solutionToAdd.image || '').toString();
      const titleLower = title.toLowerCase();

      const cardRef = this.afs.doc<any>(`user-challenges/${id}`).ref;
      const existingLink = await cardRef.get();
      const existingChallengePageId = String(existingLink.data()?.challengePageId || '');
      if (existingChallengePageId && existingChallengePageId !== String(this.challengePageId)) {
        this.toast.error('This solution already belongs to another challenge space. Remove it there before moving it.');
        return false;
      }

      const solutionRef = this.afs.doc<Solution>(`solutions/${id}`).ref;
      const batch = this.afs.firestore.batch();
      batch.set(
        cardRef,
        {
          id,
          title,
          titleLower,
          description,
          image,
          authorId: currentUser.uid,
          addedByUid: currentUser.uid,
          challengePageId: this.challengePageId,
        },
        { merge: true }
      );
      if (this.canManageSolutionDocument(solutionToAdd)) {
        batch.set(
          solutionRef,
          { challengePageId: String(this.challengePageId) },
          { merge: true }
        );
      }
      await batch.commit();

      if (!this.ids.includes(id)) {
        this.ids.unshift(id);
        this.titles.unshift(title);
        this.descriptions.unshift(description);
        this.challengeImages.unshift(image || 'No image available');
        this.solutionAddedByUids.unshift(currentUser.uid);
        this.solutionPrivateFlags.unshift(!!solutionToAdd.isPrivate);
        this.solutionParticipantCounts.unshift(
          this.countSolutionParticipants(solutionToAdd.participants)
        );
      }

      this.toast.success('Solution added to this challenge page.');
      return true;
    } catch (err) {
      console.error('Unable to add solution to challenge page:', err);
      this.toast.error('Could not add the solution. Please try again.');
      return false;
    } finally {
      this.addingSolutionId = '';
    }
  }

  private canManageSolutionDocument(solution: Solution): boolean {
    const uid = String(this.auth.currentUser?.uid || '');
    const email = this.normalizeEmail(this.auth.currentUser?.email || '');
    const ownerUids = [
      solution.ownerAccountId,
      solution.authorAccountId,
      solution.initiatorId,
    ].map((value) => String(value || ''));
    const adminEmails = (solution.solutionAdminEmails || []).map((value) =>
      this.normalizeEmail(value)
    );
    return (!!uid && ownerUids.includes(uid)) || (!!email && adminEmails.includes(email));
  }

  private normalizeEmail(e: string): string {
    return (e || '').trim().toLowerCase();
  }

  async addAdminByEmail() {
    const emailToAdd = this.selectedAdminToAdd?.email || this.newAdminEmail;
    const emailLC = this.normalizeEmail(emailToAdd);

    if (!emailLC || !this.data.isValidEmail(emailLC)) {
      this.toast.error('Enter a valid admin email.');
      return;
    }
    if ((this.adminEmails || []).includes(emailLC)) {
      this.toast.warning('This admin is already added.');
      return;
    }

    this.isLoading = true;
    try {
      // try to resolve a user by email → store uid if exists
      let uidToAdd: string | null = this.selectedAdminToAdd?.uid || null;
      if (!uidToAdd) {
        try {
          const users = await firstValueFrom(this.auth.getUserFromEmail(emailLC));
          if (users && users.length > 0 && users[0]?.uid) {
            uidToAdd = users[0].uid;
          }
        } catch {}
      }

      // update local arrays
      this.adminEmails = [...(this.adminEmails || []), emailLC];
      if (uidToAdd && !(this.adminUids || []).includes(uidToAdd)) {
        this.adminUids = [...(this.adminUids || []), uidToAdd];
      }

      // persist
      await this.afs.doc(`challengePages/${this.challengePageId}`).set(
        {
          adminEmails: this.adminEmails,
          adminUids: this.adminUids,
        },
        { merge: true }
      );

      // optional: notify by email (reuse your function)
      try {
        await this.sendEmailToParticipant(emailLC); // it accepts custom subject; if not, it still invites
      } catch {}

      const displayName = this.selectedAdminToAdd?.displayName || emailLC;
      this.toast.success(`${displayName} added as admin.`);
      this.toggle('showAddAdmin');
      this.recomputeAdminsView();
      this.loadAdminProfiles();
    } catch (err) {
      console.error('Failed to add admin', err);
      this.toast.error('Could not add admin—try again.');
    } finally {
      this.isLoading = false;
      this.newAdminEmail = '';
      this.selectedAdminToAdd = null;
      this.adminSearchQuery = '';
      this.adminSearchResults = [];
    }
  }

  async removeAdminByEmail(email: string) {
    const emailLC = this.normalizeEmail(email);
    if (emailLC === this.authorEmail) {
      this.toast.warning("You can't remove the page owner from admins.");
      return;
    }

    if (!emailLC) return;

    if (!confirm(`Remove admin ${emailLC}?`)) return;

    // remove email
    this.adminEmails = (this.adminEmails || []).filter((e) => e !== emailLC);

    // best-effort remove uid too
    try {
      const users = await firstValueFrom(this.auth.getUserFromEmail(emailLC));
      const uid = users && users[0]?.uid ? users[0].uid : null;
      if (uid) {
        this.adminUids = (this.adminUids || []).filter((u) => u !== uid);
      }
    } catch {
      /* ignore */
    }

    this.isLoading = true;
    try {
      await this.afs.doc(`challengePages/${this.challengePageId}`).set(
        {
          adminEmails: this.adminEmails,
          adminUids: this.adminUids,
        },
        { merge: true }
      );
      this.toast.success('Admin removed.');
    } catch (err) {
      console.error('Failed to remove admin', err);
      this.toast.error('Could not remove admin—try again.');
    } finally {
      this.isLoading = false;
      this.adminToRemove = '';
      this.toggle('showRemoveAdmin');
      this.recomputeAdminsView();
      this.loadAdminProfiles();
    }
  }

  private recomputeAdminsView() {
    const base = (this.adminEmails || []).map((e) => this.normalizeEmail(e));
    const extra = this.normalizeEmail(this.authorEmail);
    const set = new Set<string>(base);
    if (extra) set.add(extra);
    this.visibleAdminEmails = Array.from(set);
    this.loadAdminProfiles();
  }

  openEditPageContent() {
    this.editHeading = this.heading;
    this.editSubHeading = this.subHeading;
    this.editCustomUrl = this.challengePage.customUrl || '';
    this.editLogoPreview = this.logoImage;
    this.editHeroPreview = this.image;
    this.editLogoFile = null;
    this.editHeroFile = null;
    this.customUrlError = '';
    this.customUrlValid = true;
    this.showEditPageContent = true;
  }

  async checkCustomUrlAvailability() {
    const normalized = this.challenge.normalizeCustomUrl(this.editCustomUrl);
    
    // If empty or same as current, it's valid
    if (!normalized) {
      this.customUrlError = '';
      this.customUrlValid = true;
      return;
    }

    // If it's the same as the current URL, it's valid
    if (normalized === this.challengePage.customUrl) {
      this.customUrlError = '';
      this.customUrlValid = true;
      return;
    }

    this.isCheckingUrl = true;
    this.customUrlError = '';

    try {
      const exists = await this.challenge.checkCustomUrlExists(normalized, this.challengePageId);
      if (exists) {
        this.customUrlError = 'This URL is already taken';
        this.customUrlValid = false;
      } else {
        this.customUrlError = '';
        this.customUrlValid = true;
      }
    } catch (err) {
      console.error('Error checking URL:', err);
      this.customUrlError = 'Error checking availability';
      this.customUrlValid = false;
    } finally {
      this.isCheckingUrl = false;
    }
  }

  onCustomUrlChange() {
    // Debounce the check
    if (this.customUrlCheckTimeout) {
      clearTimeout(this.customUrlCheckTimeout);
    }
    this.customUrlCheckTimeout = setTimeout(() => {
      this.checkCustomUrlAvailability();
    }, 500);
  }

  onLogoFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editLogoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editLogoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onHeroFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editHeroFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editHeroPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async savePageContent() {
    if (!this.editHeading?.trim()) {
      this.toast.warning('Heading is required');
      return;
    }

    this.isLoading = true;
    try {
      const updates: any = {
        heading: this.editHeading.trim(),
        subHeading: this.editSubHeading?.trim() || null,
      };

      // Validate and update custom URL if provided
      if (this.editCustomUrl?.trim()) {
        const normalized = this.challenge.normalizeCustomUrl(this.editCustomUrl.trim());
        if (!normalized) {
          this.toast.error('Custom URL must contain at least one letter or number');
          this.isLoading = false;
          return;
        }

        // Final duplicate check before saving
        const exists = await this.challenge.checkCustomUrlExists(normalized, this.challengePageId);
        if (exists) {
          this.toast.error('This custom URL is already taken. Please choose another.');
          this.isLoading = false;
          return;
        }

        updates.customUrl = normalized;
      }

      // Upload logo if changed
      if (this.editLogoFile) {
        const logoUrl = await this.data.startUpload(
          this.editLogoFile,
          `challengePages/${this.challengePageId}/logo`,
          'false'
        );
        if (logoUrl) {
          updates.logoImage = logoUrl;
          this.logoImage = logoUrl;
        }
      }

      // Upload hero image if changed
      if (this.editHeroFile) {
        const heroUrl = await this.data.startUpload(
          this.editHeroFile,
          `challengePages/${this.challengePageId}/hero`,
          'false'
        );
        if (heroUrl) {
          updates.imageChallenge = heroUrl;
          this.image = heroUrl;
        }
      }

      // Save to Firestore
      await this.afs
        .doc(`challengePages/${this.challengePageId}`)
        .update(updates);

      // Update local state
      this.heading = this.editHeading.trim();
      this.subHeading = this.editSubHeading?.trim() || '';
      if (updates.customUrl) {
        this.challengePage.customUrl = updates.customUrl;
        // Update the browser URL to use the custom URL
        this.router.navigate(['/home-challenge', updates.customUrl], {
          replaceUrl: true
        });
      }

      this.showEditPageContent = false;
      if (updates.customUrl) {
        this.toast.success('Page content updated successfully! The URL has been updated to use your custom URL.');
      } else {
        this.toast.success('Page content updated successfully!');
      }
    } catch (err) {
      console.error('Error updating page content:', err);
      this.toast.error('Could not update page content—try again.');
    } finally {
      this.isLoading = false;
    }
  }
}
