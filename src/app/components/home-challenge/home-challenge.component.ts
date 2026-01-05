import { Component, ElementRef, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { nonUserchallengePageInvite } from 'functions/src';
import { firstValueFrom } from 'rxjs';
import { ChallengePage } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-home-challenge',
  templateUrl: './home-challenge.component.html',
  styleUrl: './home-challenge.component.css',
})
export class HomeChallengeComponent {
  titleCreateChallenge: string = '';
  imageCreateChallenge: string = '';
  descriptionCreateChallenge: string = '';
  categoryCreateChallenge: string = '';
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
  categories: string[] = [];
  participantsHidden = false;
  showAllParticipants = false;
  challenges: {
    [key: string]: {
      ids?: string[];
      titles: string[];
      descriptions: string[];
      images: string[];
    };
  } = {};
  challengeId: string = '';
  // Active data to display
  titles: string[] = [];
  descriptions: string[] = [];
  challengeImages: string[] = [];
  ids: string[] = [];
  participants: string[] = [];
  participantProfiles: {
    email: string;
    displayName: string;
    uid?: string;
    photoUrl?: string;
    exists: boolean;
    isCurrentUser: boolean;
  }[] = [];
  isLoadingParticipantProfiles = false;
  adminProfiles: {
    email: string;
    displayName: string;
    uid?: string;
    photoUrl?: string;
    exists: boolean;
    isCurrentUser: boolean;
  }[] = [];
  isLoadingAdminProfiles = false;
  googleMeetLink: string = '';
  newParticipant: string = '';
  teamMemberToDelete: string = '';
  zoomLink = '';
  chatNote = '';
  showEditLinks = false;

  showMergeSolution = false;
  mergeSolutionId = '';
  mergeCategory = '';
  mergeCategoryCustom = '';

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
  existingChallenges: any[] = [];
  filteredExistingChallenges: any[] = [];
  existingCategories: string[] = [];
  existingActiveCategory = '';
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
  editCategory = '';
  editCategoryCustom = '';

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
  activeCategory: string = '';
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private router: Router,
    private solution: SolutionService,
    public data: DataService,
    private time: TimeService,
    private afs: AngularFirestore,
    private challenge: ChallengesService,
    private fns: AngularFireFunctions
  ) {}
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.activatedRoute.paramMap.subscribe((params) => {
      const idOrSlug = params.get('id');
      if (!idOrSlug) {
        console.error('No challenge page ID or slug provided');
        this.pageReady = true;
        return;
      }
      window.scrollTo(0, 0);
      this.pageReady = false;
      this.loadChallengePage(idOrSlug);
    });
  }
  private resetPageState(): void {
    // everything that can legitimately be “missing” on a page
    this.handouts = [];
    this.programPDF = null;
    this.googleMeetLink = '';
    this.zoomLink = '';
    this.chatNote = '';
    this.participants = [];
    this.logoImage = '';
    this.image = '';
  }
  loadChallengePage(idOrSlug: string): void {
    // Reset challenge-related data before fetching new ones
    this.resetPageState();
    this.categories = [];
    this.challenges = {};
    this.activeCategory = '';
    this.titles = [];
    this.descriptions = [];
    this.challengeImages = [];
    this.ids = [];

    // Try to load by custom URL first, then fall back to ID
    const customUrlObservable = this.challenge.getChallengePageByCustomUrl(idOrSlug);
    const idObservable = this.challenge.getChallengePageById(idOrSlug);

    // Track if we loaded by custom URL to avoid unnecessary redirects
    let loadedByCustomUrl = false;

    // Combine both observables - try custom URL first, then ID
    customUrlObservable.subscribe((customUrlData: any) => {
      if (customUrlData) {
        this.challengePageId = customUrlData.challengePageId || idOrSlug;
        loadedByCustomUrl = true;
        this.processChallengePageData(customUrlData, loadedByCustomUrl);
      } else {
        // Fall back to ID lookup
        idObservable.subscribe((idData: any) => {
          if (idData) {
            this.challengePageId = idOrSlug;
            this.processChallengePageData(idData, loadedByCustomUrl);
          } else {
            console.error('Challenge page not found');
            this.pageReady = true;
          }
        });
      }
    });
  }

  private processChallengePageData(data: any, loadedByCustomUrl: boolean = false): void {
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
              replaceUrl: true
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

        this.challenge
          .getThisUserChallenges(
            this.challengePage.authorId!,
            this.challengePageId
          )
          .subscribe((challenges: any[]) => {
            // Extract unique categories from new challenges
            const uniqueCategories = Array.from(
              new Set(challenges.map((challenge) => challenge.category))
            );

            this.categories = uniqueCategories;
            this.activeCategory = this.categories[0] || ''; // Set to first category if available
            this.fetchChallenges(this.activeCategory);
          });
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

  toggleAside() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  async setActiveCategory(category: string) {
    if (this.activeCategory === category) {
      return;
    } // noop if already active
    this.activeCategory = category;

    // If this category is already in memory, paint it instantly (no flicker)
    if (this.challenges[category]) {
      this.updateChallenges();
    }

    // Always kick off (re)fetch—will refresh data & UI when query returns
    this.fetchChallenges(category);
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
      alert('Links updated!');
    } catch (err) {
      console.error('Error updating links:', err);
      alert('Could not save links—try again.');
    }
  }
  /** whether the detailed list is visible */
  showParticipantsList = false;

  fetchChallenges(category: string) {
    // only fetch challenges if the category is present and not an empty string
    if (!category) {
      console.warn('No category provided to fetch challenges.');
      return;
    }
    this.challenge
      .getUserChallengesByCategory(category)
      .subscribe((data: any[]) => {
        // Transform the array into the expected format
        const transformedData = {
          ids: data.map((challenge) => challenge.id),
          titles: data.map((challenge) => challenge.title),
          descriptions: data.map((challenge) => challenge.description),
          images: data.map(
            (challenge) => challenge.image || 'No image available'
          ),
        };
        this.challenges[category] = transformedData; // Assign to the challenges object
        // console.log(
        //   `Challenges for category ${category}:`,
        //   this.challenges[category]
        // );
        this.updateChallenges(); // Update the active challenge display
      });
  }

  updateChallenges(): void {
    const categoryData = this.challenges[this.activeCategory];
    // ⬅️ NEW – if we haven’t fetched this category yet, don’t blank the UI
    if (!categoryData) {
      return;
    }
    if (!categoryData) {
      console.warn(`No challenges found for category: ${this.activeCategory}`);
      this.titles = [];
      this.descriptions = [];
      this.challengeImages = [];
      this.ids = [];
      return;
    }
    this.titles = categoryData.titles;
    this.descriptions = categoryData.descriptions;
    this.challengeImages = categoryData.images;
    this.ids = categoryData.ids!;
  }

  openExistingChallenges(): void {
    this.showExistingChallenges = true;
    this.loadExistingChallenges();
  }

  async loadExistingChallenges(): Promise<void> {
    if (this.existingChallenges.length) {
      this.applyExistingFilter();
      return;
    }

    this.isLoadingExistingChallenges = true;
    this.existingChallengesError = '';

    try {
      const data = await firstValueFrom(this.challenge.getAllChallenges());
      const list = Array.isArray(data) ? data : [];
      this.existingChallenges = list;
      this.existingCategories = Array.from(
        new Set(list.map((challenge: any) => challenge.category).filter(Boolean))
      );
      this.existingActiveCategory =
        this.existingActiveCategory || this.existingCategories[0] || '';
      this.applyExistingFilter();
    } catch (err) {
      console.error('Error loading existing challenges:', err);
      this.existingChallengesError =
        'Could not load existing challenges. Please try again.';
    } finally {
      this.isLoadingExistingChallenges = false;
    }
  }

  setExistingCategory(category: string): void {
    if (this.existingActiveCategory === category) {
      return;
    }
    this.existingActiveCategory = category;
    this.applyExistingFilter();
  }

  private applyExistingFilter(): void {
    if (!this.existingActiveCategory) {
      this.filteredExistingChallenges = [...this.existingChallenges];
      return;
    }

    this.filteredExistingChallenges = this.existingChallenges.filter(
      (challenge: any) => challenge.category === this.existingActiveCategory
    );
  }

  isAddingExistingChallenge(challengeId: string): boolean {
    return this.addingExistingChallengeIds.includes(challengeId);
  }

  async addExistingChallengeToPage(challenge: any): Promise<void> {
    if (!challenge?.title || !challenge?.description || !challenge?.category) {
      alert('This challenge is missing required details.');
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
      category: challenge.category,
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
        newChallengeId
      );

      alert('Challenge added to this workspace.');
    } catch (err) {
      console.error('Error adding existing challenge:', err);
      alert('There was a problem adding this challenge.');
    } finally {
      this.addingExistingChallengeIds =
        this.addingExistingChallengeIds.filter(
          (id) => id !== challenge.id
        );
    }
  }
  get participantsProfilesToRender() {
    return this.showAllParticipants
      ? this.participantProfiles
      : this.participantProfiles.slice(0, 5);
  }

  get adminProfilesToRender() {
    return this.showAllAdmins
      ? this.adminProfiles
      : this.adminProfiles.slice(0, 5);
  }

  async loadParticipantProfiles(): Promise<void> {
    const rawEmails = (this.participants || [])
      .map((email) => (email || '').toString().trim())
      .filter((email) => email);

    if (!rawEmails.length) {
      this.participantProfiles = [];
      this.isLoadingParticipantProfiles = false;
      return;
    }

    this.isLoadingParticipantProfiles = true;
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
          isCurrentUser: false,
        };
      });
    } finally {
      this.isLoadingParticipantProfiles = false;
    }
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
      | 'showRemoveAdmin'
      | 'showAddAdmin'
  ) {
    this[property] = !this[property];
  }
  get adminEmailsToRender(): string[] {
    const list = this.visibleAdminEmails || [];
    return this.showAllAdmins ? list : list.slice(0, 5);
  }

  async addParticipant() {
    if (!this.newParticipant || !this.data.isValidEmail(this.newParticipant)) {
      alert('Please enter a valid email address to add a participant.');
      return;
    }

    if (this.participants.includes(this.newParticipant)) {
      alert('This participant has already been added.');
      return;
    }

    this.participants.push(this.newParticipant);
    this.isLoading = true;

    try {
      this.challenge.addParticipantToChallengePage(
        this.challengePageId,
        this.participants
      ); // then send email to participant
      await this.sendEmailToParticipant(this.newParticipant);
      await this.loadParticipantProfiles();

      console.log('Participant added successfully:', this.newParticipant);
      alert('Participant added successfully!');
      this.toggle('showAddTeamMember');
      this.isLoading = false;
    } catch (error) {
      console.error('Error adding participant:', error);
    }
    this.newParticipant = '';
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
      alert('Participant removed successfully!');
      this.toggle('showRemoveTeamMember');
    } catch (error) {
      console.error('Error removing participant from challenge:', error);
    }
  }

  async joinChallengePage(): Promise<void> {
    const email = this.normalizeEmail(this.auth.currentUser?.email || '');
    if (!email || !this.data.isValidEmail(email)) {
      alert('Please sign in to join this workspace.');
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
      alert('Could not join this workspace. Please try again.');
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
      alert('Could not leave this workspace. Please try again.');
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
            alert(
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
      alert('Error occurred while uploading file. Please try again.');
    }
  }
  // addCreateChallenge() {
  //   if (
  //     !this.titleCreateChallenge ||
  //     !this.descriptionCreateChallenge ||
  //     !this.categoryCreateChallenge ||
  //     !this.imageCreateChallenge
  //   ) {
  //     alert('Please fill in all required fields before adding the challenge.');
  //     return;
  //   }

  //   const newChallenge = {
  //     id: this.challengeId,
  //     title: this.titleCreateChallenge,
  //     description: this.descriptionCreateChallenge,
  //     category: this.categoryCreateChallenge,
  //     image: this.imageCreateChallenge,
  //     authordId: this.auth.currentUser.uid,
  //     challengePageId: this.challengePageId,
  //   };

  //   this.challenge
  //     .addUserChallenge(newChallenge)
  //     .then(() => {
  //       console.log('Challenge added successfully:', newChallenge);

  //       // Automatically select the added challenge and navigate
  //       this.selectChallenge();

  //       // Clear the form fields
  //       this.resetCreateChallengeInfo();
  //     })
  //     .catch((error) => {
  //       console.error('Error adding challenge:', error);
  //     });
  // }

  async addCreateChallenge() {
    if (
      !this.titleCreateChallenge ||
      !this.descriptionCreateChallenge ||
      !this.categoryCreateChallenge ||
      !this.imageCreateChallenge
    ) {
      alert('Please fill in all required fields before adding the challenge.');
      return;
    }

    const newChallenge = {
      id: this.challengeId,
      title: this.titleCreateChallenge,
      description: this.descriptionCreateChallenge,
      category: this.categoryCreateChallenge,
      image: this.imageCreateChallenge,
      authorId: this.auth.currentUser.uid,
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

        this.solution.newSolution.participantsHolder, // Assuming 'any' means an array of participants
        [], // Assuming 'any' means an array of evaluators
        // endDate: "", // This was commented out in your request, so I've kept it out
        [],
        this.challengeId
      );
      // Clear the form fields

      // 4️⃣ housekeeping
      // this.resetCreateChallengeInfo();
      // this.toggle('showAddChallenge');
      this.isLoading = false;
      this.router.navigate(['/dashboard', this.challengeId]);
    } catch (err) {
      console.error('Error creating challenge & solution:', err);
      alert('There was a problem creating the challenge.');
    }

    // Automatically select the added challenge and navigate
  }

  resetCreateChallengeInfo() {
    this.titleCreateChallenge = '';
    this.descriptionCreateChallenge = '';
    this.categoryCreateChallenge = '';
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
        alert('URL copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy URL: ', err);
        alert('Failed to copy URL. Please try again.');
      });
  }

  // New method to send emails to participants
  async sendEmailToParticipant(participant: string) {
    console.log('sending email invite to ', participant);
    const challengePageInvite = this.fns.httpsCallable('challengePageInvite');
    const nonUserchallengePageInvite = this.fns.httpsCallable(
      'nonUserchallengePageInvite'
    ); // Ensure you have this Cloud Function set up

    // for (const participant of participants) {
    try {
      // Fetch the user data
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(participant)
      );
      console.log('extracted user from email', users);
      console.log('the new solution data', this.solution.newSolution);

      if (users && users.length > 0) {
        // Participant is a registered user
        console.log('Participant is a registered user');

        const emailData = {
          email: participant, // Ensure this is the correct field
          subject: `You Have Been Invited to Join a Challenge Workspace @ NewWorld Game`,
          title: `${this.challengePage.name}`,
          description: `${this.challengePage.description}`,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: `${this.challengePage.imageChallenge}`,
          path: `https://newworld-game.org/home-challenge/${this.challengePageId}`,
          user: `${users[0].firstName} ${users[0].lastName}`,
          // Add any other necessary fields
        };

        const result = await firstValueFrom(challengePageInvite(emailData));
        console.log(`Email sent to ${participant}:`, result);
      } else {
        console.log('Participant is NOT a registered user');
        // Participant is NOT a registered user
        // Participant is a registered user
        const emailData = {
          email: participant, // Ensure this is the correct field
          subject: `You Have Been Invited to Join a Challenge Workspace @ NewWorld Game`,
          title: `${this.challengePage.name}`,
          description: `${this.challengePage.description}`,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: `${this.challengePage.imageChallenge}`,
          path: `https://newworld-game.org/home-challenge/${this.challengePageId}`,
          // Add any other necessary fields
        };

        const result = await firstValueFrom(
          nonUserchallengePageInvite(emailData)
        );
        console.log(`Email sent to ${participant}:`, result);
      }
    } catch (error) {
      console.error(`Error processing participant ${participant}:`, error);
    }
    // }
  }
  async deleteChallenge(challengeId: string, index: number) {
    if (!confirm('Delete this challenge? This cannot be undone.')) {
      return;
    }

    this.isLoading = true;

    try {
      /* 1️⃣ delete the user-challenge document */
      await this.afs.doc(`user-challenges/${challengeId}`).delete();

      /* 2️⃣ (optional) delete the linked Solution doc */
      await this.afs
        .doc(`solutions/${challengeId}`)
        .delete()
        .catch(() => {});

      /* 3️⃣ Remove from local arrays so the UI updates instantly */
      this.ids.splice(index, 1);
      this.titles.splice(index, 1);
      this.descriptions.splice(index, 1);
      this.challengeImages.splice(index, 1);

      // If you also track counts per category, update them here.

      alert('Challenge deleted.');
    } catch (err) {
      console.error('Error deleting challenge:', err);
      alert('Could not delete challenge—try again.');
    } finally {
      this.isLoading = false;
    }
  }
  async moveChallenge(challengeId: string, localIndex: number) {
    // 1️⃣ Build a list of choices
    const choices = [...this.categories]; // existing categories
    const newCat = prompt(
      'Move to which category?\n' +
        choices.map((c, idx) => `${idx + 1}. ${c}`).join('\n') +
        '\n\nOr type a new category name:'
    );

    if (!newCat) {
      return;
    } // user cancelled

    // 2️⃣ Update Firestore
    this.isLoading = true;
    try {
      await this.afs
        .doc(`user-challenges/${challengeId}`)
        .update({ category: newCat });

      /* 3️⃣ Local UI updates */

      // 3a remove from current lists
      this.ids.splice(localIndex, 1);
      this.titles.splice(localIndex, 1);
      this.descriptions.splice(localIndex, 1);
      this.challengeImages.splice(localIndex, 1);

      // 3b if new category is brand-new, add it to the filter pills
      if (!this.categories.includes(newCat)) {
        this.categories.push(newCat);
        this.categories.sort();
      }

      // 3c fetch challenges for the destination category so it shows up
      await this.fetchChallenges(newCat);
      this.activeCategory = newCat; // auto-switch view
      alert('Challenge moved.');
    } catch (err) {
      console.error('Move failed:', err);
      alert('Could not move challenge—try again.');
    } finally {
      this.isLoading = false;
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
      alert('Could not update participants visibility.');
    }
  }
  async addHandout() {
    if (!this.handoutName.trim() || !this.handoutFile) {
      alert('Choose a file and give it a name.');
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
      alert('Upload failed.');
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
      alert('Please enter a title.');
      return;
    }

    // if user is only renaming, no new file is needed
    if (!this.programFileTmp && !this.programPDF) {
      alert('Please choose a PDF to upload.');
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
      alert('Upload failed — try again.');
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
    this.editCategory = this.activeCategory;
    this.editCategoryCustom = '';
    this.showEditChallenge = true;
  }

  async saveEditChallenge() {
    /* resolve final category */
    let newCat =
      this.editCategory === '__new__'
        ? this.editCategoryCustom.trim()
        : this.editCategory;

    if (!newCat) {
      alert('Category required');
      return;
    }

    try {
      this.isLoading = true;

      await this.afs.doc(`user-challenges/${this.editChallengeId}`).update({
        title: this.editTitle.trim(),
        description: this.editDescription.trim(),
        category: newCat,
      });

      /* — update local arrays for instant UI feedback — */
      this.titles[this.editIndex] = this.editTitle.trim();
      this.descriptions[this.editIndex] = this.editDescription.trim();

      /* if the category changed */
      if (newCat !== this.activeCategory) {
        // 1. remove from current view
        this.ids.splice(this.editIndex, 1);
        this.titles.splice(this.editIndex, 1);
        this.descriptions.splice(this.editIndex, 1);
        this.challengeImages.splice(this.editIndex, 1);

        // 2. add category pill if brand-new
        if (!this.categories.includes(newCat)) {
          this.categories.push(newCat);
          this.categories.sort();
        }

        // 3. refresh destination category & switch view
        await this.fetchChallenges(newCat);
        this.activeCategory = newCat;
      }

      this.showEditChallenge = false;
      alert('Challenge updated.');
    } catch (err) {
      console.error('Update failed:', err);
      alert('Could not update challenge—try again.');
    } finally {
      this.isLoading = false;
    }
  }

  private pickMergeCategory(): string {
    const typed = this.mergeCategoryCustom?.trim();
    return typed
      ? typed
      : this.mergeCategory || this.activeCategory || 'General';
  }

  private emailsFromSolutionParticipants(pList: any): string[] {
    // your solution uses array of maps: [{name: 'email'}, ...]
    if (!Array.isArray(pList)) return [];
    return pList
      .map((p: any) => (p?.name || '').toString().trim().toLowerCase())
      .filter((e) => e && this.data.isValidEmail(e));
  }

  private uniqueEmails(...groups: string[][]): string[] {
    const set = new Set<string>();
    groups.flat().forEach((e) => set.add(e.trim().toLowerCase()));
    return Array.from(set);
  }

  private toParticipantObjects(emails: string[]): { name: string }[] {
    return emails.map((e) => ({ name: e }));
  }

  async mergeExistingSolution() {
    const id = this.mergeSolutionId.trim();
    if (!id) {
      alert('Enter a solution ID.');
      return;
    }

    this.isLoading = true;
    try {
      // 1) Load the solution
      const solSnap = await this.afs.doc(`solutions/${id}`).ref.get();
      if (!solSnap.exists) {
        alert('No solution found with that ID.');
        return;
      }
      const sol: any = solSnap.data();

      // 2) Build participants unions (solution <-> challenge page)
      const emailsFromSol = this.emailsFromSolutionParticipants(
        sol.participants
      );
      const emailsFromPage = (this.participants || [])
        .map((e) => (e || '').toString().trim().toLowerCase())
        .filter((e) => e && this.data.isValidEmail(e));

      const unionForSolution = this.uniqueEmails(emailsFromSol, emailsFromPage);
      const unionForPage = this.uniqueEmails(emailsFromPage, emailsFromSol);

      // 3) Determine category + fields for the challenge card
      const category = this.pickMergeCategory();

      // IMPORTANT: authorId should be the page’s author so your queries pick it up
      const authorIdForCard = this.challengePage.authorId;

      const title = (
        sol.title ||
        sol.solutionTitle ||
        'Untitled Solution'
      ).toString();
      const description = (sol.description || '').toString();
      const image = (sol.image || '').toString();
      const titleLower = title.toLowerCase();

      // 4) Write in one batch:
      //    - user-challenges/{solutionId} (the card)
      //    - solutions/{solutionId} participants + back-link to this page
      //    - challengePages/{pageId} participants (union)
      const batch = this.afs.firestore.batch();

      const cardRef = this.afs.doc(`user-challenges/${id}`).ref;
      batch.set(
        cardRef,
        {
          id,
          title,
          titleLower,
          description,
          image,
          category,
          authorId: authorIdForCard, // ✅ key fix
          challengePageId: this.challengePageId, // ✅ ensure page linkage
        },
        { merge: true }
      );

      const solutionRef = this.afs.doc(`solutions/${id}`).ref;
      batch.set(
        solutionRef,
        {
          participants: this.toParticipantObjects(unionForSolution),
          challengePageId: this.challengePageId, // optional but handy back-link
        },
        { merge: true }
      );

      const pageRef = this.afs.doc(
        `challengePages/${this.challengePageId}`
      ).ref;
      batch.set(
        pageRef,
        {
          participants: unionForPage,
        },
        { merge: true }
      );

      await batch.commit();

      // 5) Update local UI instantly
      this.participants = unionForPage;
      this.loadParticipantProfiles();

      if (!this.categories.includes(category)) {
        this.categories.push(category);
        this.categories.sort();
      }

      // If we are already on this category, inject the card immediately for snappier UX
      if (this.activeCategory === category) {
        if (!this.ids.includes(id)) {
          this.ids.unshift(id);
          this.titles.unshift(title);
          this.descriptions.unshift(description);
          this.challengeImages.unshift(image || 'No image available');
        }
      } else {
        // otherwise fetch and switch
        await this.fetchChallenges(category);
        this.activeCategory = category;
      }

      // reset modal
      this.mergeSolutionId = '';
      this.mergeCategory = '';
      this.mergeCategoryCustom = '';
      this.showMergeSolution = false;

      alert('Solution merged and challenge card created.');
    } catch (err) {
      console.error('Merge failed', err);
      alert('Could not merge solution — check the ID and try again.');
    } finally {
      this.isLoading = false;
    }
  }

  private normalizeEmail(e: string): string {
    return (e || '').trim().toLowerCase();
  }

  async addAdminByEmail() {
    const emailLC = this.normalizeEmail(this.newAdminEmail);

    if (!emailLC || !this.data.isValidEmail(emailLC)) {
      alert('Enter a valid admin email.');
      return;
    }
    if ((this.adminEmails || []).includes(emailLC)) {
      alert('This admin is already added.');
      return;
    }

    this.isLoading = true;
    try {
      // try to resolve a user by email → store uid if exists
      let uidToAdd: string | null = null;
      try {
        const users = await firstValueFrom(this.auth.getUserFromEmail(emailLC));
        if (users && users.length > 0 && users[0]?.uid) {
          uidToAdd = users[0].uid;
        }
      } catch {}

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

      alert('Admin added.');
      this.toggle('showAddAdmin');
      this.recomputeAdminsView();
      this.loadAdminProfiles();
    } catch (err) {
      console.error('Failed to add admin', err);
      alert('Could not add admin—try again.');
    } finally {
      this.isLoading = false;
      this.newAdminEmail = '';
    }
  }

  async removeAdminByEmail(email: string) {
    const emailLC = this.normalizeEmail(email);
    if (emailLC === this.authorEmail) {
      alert('You can’t remove the page owner from admins.');
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
      alert('Admin removed.');
    } catch (err) {
      console.error('Failed to remove admin', err);
      alert('Could not remove admin—try again.');
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
      alert('Heading is required');
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
          alert('Custom URL must contain at least one letter or number');
          this.isLoading = false;
          return;
        }

        // Final duplicate check before saving
        const exists = await this.challenge.checkCustomUrlExists(normalized, this.challengePageId);
        if (exists) {
          alert('This custom URL is already taken. Please choose another.');
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
        alert('Page content updated successfully! The URL has been updated to use your custom URL.');
      } else {
        alert('Page content updated successfully!');
      }
    } catch (err) {
      console.error('Error updating page content:', err);
      alert('Could not update page content—try again.');
    } finally {
      this.isLoading = false;
    }
  }
}
