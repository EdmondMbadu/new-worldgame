import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { TranslateService } from '@ngx-translate/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { HOME_CHALLENGE_FR } from 'src/app/components/home/home-challenge-fr';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import {
  CommunitySolutionFilter,
  SolutionService,
} from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';
import { solutionOwnerIdentity } from 'src/app/utils/solution-ownership';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  user: User | null;
  // Centralized data for all challenges
  challenges: {
    [key: string]: {
      ids?: string[];
      titles: string[];
      frenchTitles?: string[];
      descriptions: string[];
      frenchDescriptions?: string[];
      images: string[];
    };
  } = {};

  titleChallenge: string = '';
  descriptionChallenge: string = '';
  categoryChallenge: string = '';
  imageChallenge: string = '';
  challengeId: string = '';
  // Active data to display
  titles: string[] = [];
  descriptions: string[] = [];
  challengeImages: string[] = [];
  ids: string[] = [];

  isHovering: boolean = false;
  showAddChallenge: boolean = false;

  /** Loading UX flags */
  isInitialLoad = true; // fullscreen overlay when the page first opens
  isLoadingChallenges = true; // skeletons in the grid when (re)loading challenges
  isErrorChallenges = false; // error state if fetch fails
  homeView: 'solutions' | 'challenges' = 'solutions';
  communityFilter: CommunitySolutionFilter = 'all';
  communitySolutions: Solution[] = [];
  isLoadingCommunitySolutions = false;
  isLoadingMoreCommunitySolutions = false;
  communitySolutionsError = '';
  hasMoreCommunitySolutions = false;
  private communityCursor: any = null;
  private readonly communityPageSize = 20;

  // (optional) simple cache hit to prevent flashing loader if we already have data for that category
  private minOverlayMs = 120; // a brief transition without delaying the feed
  private initialStart = performance.now();
  private languageSub?: Subscription;

  get isGuest(): boolean {
    return !this.auth.currentUser?.uid;
  }

  updateChallenges(): void {
    const categoryData = this.challenges[this.activeCategory];
    if (!categoryData) {
      console.warn(`No challenges found for category: ${this.activeCategory}`);
      this.titles = [];
      this.descriptions = [];
      this.challengeImages = [];
      this.ids = [];
      return;
    }
    const shouldUseFrenchContent = this.shouldUseFrenchTitles();
    this.titles = shouldUseFrenchContent
      ? categoryData.frenchTitles ?? categoryData.titles
      : categoryData.titles;
    this.descriptions = shouldUseFrenchContent
      ? categoryData.frenchDescriptions ?? categoryData.descriptions
      : categoryData.descriptions;
    this.challengeImages = categoryData.images;
    this.ids = categoryData.ids!;
  }

  categoryImages: { [key: string]: string[] } = {};

  showSortByDrowpDown: boolean = false;
  allUsers: User[] = [];
  evaluationSolutions: Solution[] = [];
  evaluationSolutionsUsers: User[] = [];
  allSolutions: Solution[] = [];
  everySolution: Solution[] = [];
  currentUserSolutions: Solution[] = [];
  pendingSolutions: Solution[] = [];
  pendingSolutionsUsers: User[] = [];
  completedSolutionsUsers: User[] = [];
  completedSolutions: Solution[] = [];
  profilePicturePath?: string = '';
  pending: number = 0;
  evaluation: number = 0;
  location: string = '';
  displayPromptLocation: boolean = true;
  isSidebarOpen: boolean = true;
  imageDownloadUrl: string = '';

  private readonly categoryLabelKeyMap: Record<string, string> = {
    'UN SDG': 'home.categories.unSdg',
    Climate: 'home.categories.climate',
    Poverty: 'home.categories.poverty',
    Energy: 'home.categories.energy',
    Food: 'home.categories.food',
    Health: 'home.categories.health',
    Forestry: 'home.categories.forestry',
  };

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private data: DataService,
    private storage: AngularFireStorage,
    private challenge: ChallengesService,
    private router: Router,
    private route: ActivatedRoute,
    private time: TimeService,
    private afs: AngularFirestore,
    private translate: TranslateService
  ) {
    this.user = this.auth.currentUser || null;
  }
  async ngOnInit() {
    this.languageSub = this.translate.onLangChange.subscribe(() => {
      this.updateChallenges();
    });
    this.filterSolutions();
    window.scroll(0, 0);

    const requestedView = this.route.snapshot.queryParamMap.get('view');
    const requestedFilter = this.route.snapshot.queryParamMap.get('filter');
    this.homeView = requestedView === 'challenges' ? 'challenges' : 'solutions';
    if (
      requestedFilter === 'in-development' ||
      requestedFilter === 'submitted'
    ) {
      this.communityFilter = requestedFilter;
    }

    if (this.homeView === 'challenges') {
      this.fetchChallenges(this.activeCategory, { isInitial: true });
    } else {
      void this.loadCommunitySolutions(true);
    }

    this.auth.user$
      .pipe(
        filter((user): user is User => Boolean(user)),
        take(1)
      )
      .subscribe((user) => {
        this.user = user;
        this.displayPromptLocation = !user.location;

        this.solution
          .getAuthenticatedUserAllSolutions(user.email)
          .subscribe((data) => {
            this.currentUserSolutions = data;
            this.mergeAccessibleSolutionAttribution();
            this.findPendingSolutions();
          });

        this.solution
          .getAuthenticatedUserPendingEvaluations(user.email)
          .subscribe((data) => {
            this.evaluationSolutions = data.filter(
              (e) => e.finished !== undefined && e.finished === 'true'
            );
            this.evaluation = this.evaluationSolutions.length;
          });

        if (user.profilePicture?.path) {
          this.profilePicturePath = user.profilePicture.downloadURL;
        }
      });
  }

  fetchChallenges(category: string, opts?: { isInitial?: boolean }) {
    // If already cached, reuse immediately without refetch (prevents loader flicker)
    if (this.challenges[category]?.titles?.length) {
      this.updateChallenges();
      this.isLoadingChallenges = false;
      if (opts?.isInitial) this.finishInitialOverlay();
      return;
    }

    this.isErrorChallenges = false;
    this.isLoadingChallenges = true;

    this.challenge
      .getChallengesByCategory(category)
      .pipe(take(1))
      .subscribe({
        next: (data: any[]) => {
          const transformedData = {
            ids: data.map((d) => d.id),
            titles: data.map((d) => d.title),
            frenchTitles: data.map((d) => this.resolveFrenchChallengeTitle(d)),
            descriptions: data.map((d) => d.description),
            frenchDescriptions: data.map((d) =>
              this.resolveFrenchChallengeDescription(d)
            ),
            images: data.map((d) => d.image || 'No image available'),
          };
          this.challenges[category] = transformedData;
          this.updateChallenges();
        },
        error: (err) => {
          console.error('Error loading challenges:', err);
          this.isErrorChallenges = true;
        },
        complete: () => {
          this.isLoadingChallenges = false;
          if (opts?.isInitial) this.finishInitialOverlay();
        },
      });
  }

  ngOnDestroy(): void {
    this.languageSub?.unsubscribe();
  }

  private finishInitialOverlay() {
    const elapsed = performance.now() - this.initialStart;
    const remaining = Math.max(this.minOverlayMs - elapsed, 0);
    setTimeout(() => (this.isInitialLoad = false), remaining);
  }

  async setActiveCategory(category: string) {
    this.activeCategory = category;
    this.fetchChallenges(category);
  }

  async selectHomeView(view: 'solutions' | 'challenges'): Promise<void> {
    if (this.homeView === view) return;
    this.homeView = view;
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        view: view === 'challenges' ? 'challenges' : null,
        filter:
          view === 'solutions' && this.communityFilter !== 'all'
            ? this.communityFilter
            : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    if (view === 'challenges' && !this.titles.length) {
      this.fetchChallenges(this.activeCategory);
    } else if (view === 'solutions' && !this.communitySolutions.length) {
      await this.loadCommunitySolutions(true);
    }
  }

  async setCommunityFilter(filter: CommunitySolutionFilter): Promise<void> {
    if (this.communityFilter === filter) return;
    this.communityFilter = filter;
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: filter === 'all' ? null : filter },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    await this.loadCommunitySolutions(true);
  }

  async loadCommunitySolutions(reset = false): Promise<void> {
    if (
      this.isLoadingCommunitySolutions ||
      this.isLoadingMoreCommunitySolutions
    ) {
      return;
    }

    if (reset) {
      this.isLoadingCommunitySolutions = true;
      this.communityCursor = null;
      this.communitySolutions = [];
      this.communitySolutionsError = '';
    } else {
      this.isLoadingMoreCommunitySolutions = true;
    }

    try {
      const page = await this.solution.getCommunitySolutionsPage(
        this.communityFilter,
        this.communityPageSize,
        this.communityCursor
      );
      this.communityCursor = page.cursor;
      if (reset) {
        this.communitySolutions = this.rankCommunitySolutions(page.solutions);
      } else {
        const existingIds = new Set(
          this.communitySolutions.map((item) => item.solutionId)
        );
        const nextPage = this.rankCommunitySolutions(
          page.solutions.filter(
            (item) => item.solutionId && !existingIds.has(item.solutionId)
          )
        );
        this.communitySolutions = [...this.communitySolutions, ...nextPage];
      }
      this.mergeAccessibleSolutionAttribution();
      this.hasMoreCommunitySolutions = page.hasMore;
      if (reset) this.restoreCommunityScroll();
    } catch (error) {
      console.error('Unable to load community solutions', error);
      this.communitySolutionsError =
        'home.community.error.message';
    } finally {
      this.isLoadingCommunitySolutions = false;
      this.isLoadingMoreCommunitySolutions = false;
      if (this.isInitialLoad) this.finishInitialOverlay();
    }
  }

  openCommunitySolution(solution: Solution): void {
    if (!solution.solutionId) return;
    sessionStorage.setItem(
      'communitySolutionsScroll',
      String(window.scrollY || 0)
    );
    void this.router.navigate(['/solution-preview', solution.solutionId], {
      queryParams: {
        returnTo: this.router.url,
        from: 'community',
      },
    });
  }

  startSolution(): void {
    if (this.isGuest) {
      const redirectTo = '/create-solution';
      this.auth.setRedirectUrl(redirectTo);
      sessionStorage.setItem('redirectTo', redirectTo);
      void this.router.navigate(['/login'], {
        queryParams: { redirectTo },
      });
      return;
    }
    void this.router.navigate(['/create-solution']);
  }

  communityExcerpt(solution: Solution): string {
    const source =
      solution.description ||
      solution.strategyReview ||
      solution.content ||
      Object.values(solution.status || {}).find(Boolean) ||
      '';
    const clean = String(source)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return clean.length > 210 ? `${clean.slice(0, 207).trim()}…` : clean;
  }

  communityProgress(solution: Solution): number {
    if (Number.isFinite(Number(solution.publicProgress))) {
      return Number(solution.publicProgress);
    }
    if (solution.finished === 'true') return 100;
    const answers = Object.values(solution.status || {}).filter(
      (value) => String(value || '').replace(/<[^>]*>/g, '').trim().length > 15
    ).length;
    const supporting = [
      solution.description,
      solution.strategyReview,
      solution.content,
    ].filter(
      (value) => String(value || '').replace(/<[^>]*>/g, '').trim().length > 30
    ).length;
    return Math.min(90, Math.max(10, (answers + supporting) * 10));
  }

  communityDesignerCount(solution: Solution): number | null {
    if (!Number.isFinite(Number(solution.publicDesignerCount))) return null;
    return Math.max(0, Number(solution.publicDesignerCount));
  }

  private mergeAccessibleSolutionAttribution(): void {
    if (!this.currentUserSolutions.length || !this.communitySolutions.length) {
      return;
    }

    const accessibleById = new Map(
      this.currentUserSolutions
        .filter((solution) => Boolean(solution.solutionId))
        .map((solution) => [solution.solutionId, solution])
    );

    this.communitySolutions = this.communitySolutions.map((card) => {
      const fullSolution = accessibleById.get(card.solutionId);
      if (!fullSolution) return card;

      const owner = solutionOwnerIdentity(fullSolution);
      return {
        ...card,
        authorName: owner?.authorName || card.authorName,
        publicDesignerCount:
          this.designerCountFromParticipants(fullSolution),
      };
    });
  }

  private designerCountFromParticipants(solution: Solution): number {
    const value: any = solution.participants;
    const entries = Array.isArray(value)
      ? value
      : value && typeof value === 'object'
      ? Object.values(value)
      : [];
    const emails = entries
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

    return new Set(emails).size;
  }

  communityInitials(solution: Solution): string {
    const name = String(
      solution.authorName || solution.title || 'Solution team'
    ).trim();
    const words = name.split(/\s+/).filter(Boolean);
    return words.length > 1
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  handleCommunityImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) return;

    image.style.display = 'none';
    image.nextElementSibling?.classList.remove('hidden');
  }

  communityActivityLabel(solution: Solution): string {
    const raw =
      solution.feedUpdatedAt ||
      solution.lastSubstantiveEditAt ||
      solution.updatedAt ||
      solution.submissionDate ||
      solution.creationDate;
    const date = raw?.toDate?.() || (raw ? new Date(raw) : null);
    if (!date || Number.isNaN(date.getTime())) {
      return this.translate.instant('home.community.activity.recently');
    }
    const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) {
      return this.translate.instant('home.community.activity.justNow');
    }
    if (seconds < 3600) {
      return this.translate.instant('home.community.activity.minutesAgo', {
        count: Math.floor(seconds / 60),
      });
    }
    if (seconds < 86400) {
      return this.translate.instant('home.community.activity.hoursAgo', {
        count: Math.floor(seconds / 3600),
      });
    }
    if (seconds < 604800) {
      return this.translate.instant('home.community.activity.daysAgo', {
        count: Math.floor(seconds / 86400),
      });
    }
    const formattedDate = date.toLocaleDateString(
      this.shouldUseFrenchTitles() ? 'fr-FR' : 'en-US',
      {
      month: 'short',
      day: 'numeric',
      }
    );
    return this.translate.instant('home.community.activity.updated', {
      date: formattedDate,
    });
  }

  trackCommunitySolution(index: number, solution: Solution): string {
    return solution.solutionId || String(index);
  }

  private rankCommunitySolutions(solutions: Solution[]): Solution[] {
    const unique = Array.from(
      new Map(
        solutions
          .filter((item) => item.solutionId)
          .map((item) => [item.solutionId, item])
      ).values()
    );
    const scored = unique.sort((a, b) => {
      const score = (solution: Solution) => {
        const raw =
          solution.feedUpdatedAt ||
          solution.lastSubstantiveEditAt ||
          solution.updatedAt;
        const time = raw?.toMillis?.() || raw?.toDate?.()?.getTime?.() || 0;
        const needsFirstResponse =
          Number(solution.commentCount || solution.comments?.length || 0) === 0;
        return time + (needsFirstResponse ? 6 * 60 * 60 * 1000 : 0);
      };
      return score(b) - score(a);
    });

    const output: Solution[] = [];
    const remaining = [...scored];
    while (remaining.length) {
      const previousOwners = output
        .slice(-2)
        .map(
          (item) =>
            item.ownerAccountId ||
            item.ownerEmail ||
            item.authorAccountId ||
            item.authorEmail ||
            ''
        );
      const index = remaining.findIndex(
        (item) =>
          !previousOwners.length ||
          !previousOwners.every(
            (owner) =>
              owner ===
              (item.ownerAccountId ||
                item.ownerEmail ||
                item.authorAccountId ||
                item.authorEmail ||
                '')
          )
      );
      output.push(remaining.splice(index >= 0 ? index : 0, 1)[0]);
    }
    return output;
  }

  private restoreCommunityScroll(): void {
    const value = Number(
      sessionStorage.getItem('communitySolutionsScroll') || 0
    );
    if (!value) return;
    sessionStorage.removeItem('communitySolutionsScroll');
    setTimeout(() => window.scrollTo({ top: value, behavior: 'auto' }), 0);
  }
  extractNumber(filename: string, prefix: string): number {
    const match = filename.match(new RegExp(`${prefix}-(\\d+)`)); // Extract number based on the prefix
    return match ? parseInt(match[1], 10) : 0;
  }

  findPendingSolutions() {
    this.pendingSolutions = [];

    for (let s of this.currentUserSolutions) {
      if (s.finished === undefined || s.finished === 'false') {
        this.pendingSolutions.push(s);
      }
    }
    this.pending = this.pendingSolutions.length;
  }

  findCompletedSolutions() {
    this.completedSolutions = [];

    for (let s of this.allSolutions) {
      if (s.finished === 'true') {
        this.completedSolutions.push(s);
      }
    }
    // added sorted by number of likes. so that not random solutions appear first
    this.sortByNumLikes('descending');
    this.toggleSortyByDropDown();
  }

  toggleSortyByDropDown() {
    this.showSortByDrowpDown = !this.showSortByDrowpDown;
  }

  sortByNumLikes(order: string) {
    const sortedSolutions = this.completedSolutions.sort((a, b) => {
      // Convert numLikes from string to number
      const likesA = parseInt(a.numLike!, 10);
      const likesB = parseInt(b.numLike!, 10);

      // Compare likes for sorting

      return order === 'ascending' ? likesA - likesB : likesB - likesA;
    });
    this.completedSolutions = sortedSolutions;
    this.toggleSortyByDropDown();
  }
  sortBySubmissionDate(order: string) {
    const sortedSolutions = this.completedSolutions.sort((a, b) => {
      // Correctly parse the submissionDate to a comparable format
      const dateA = new Date(
        a.submissionDate!.replace(
          /(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)/,
          '$3/$1/$2 $4:$5:$6'
        )
      );
      const dateB = new Date(
        b.submissionDate!.replace(
          /(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)/,
          '$3/$1/$2 $4:$5:$6'
        )
      );

      // Compare the dates based on the specified order
      return order === 'ascending'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });

    this.completedSolutions = sortedSolutions;
    this.toggleSortyByDropDown();
  }
  // we might use this part.
  async submitLocation() {
    if (this.location === '') {
      alert(this.translate.instant('home.alerts.enterLocation'));
      return;
    }
    const uid = this.user?.uid;
    if (!uid) return;
    try {
      await this.data.updateLocation(uid, this.location);
      this.closeDisplayPromptLocation();
      // this.ngOnInit();
    } catch (error) {
      console.error('Error updating location:', error);
      // Optionally, you can add more error handling logic here, such as displaying an error message to the user.
    }
  }
  closeDisplayPromptLocation() {
    this.displayPromptLocation = !this.displayPromptLocation;
  }
  async RejectSubmitLocation() {
    const uid = this.user?.uid;
    if (!uid) return;
    try {
      await this.data.updateLocation(uid, 'NA');
      this.closeDisplayPromptLocation();
      // this.ngOnInit();
    } catch (error) {
      console.error('Error updating location:', error);
      // Optionally, you can add more error handling logic here, such as displaying an error message to the user.
    }
  }
  categories: string[] = [
    'UN SDG',
    'Climate',
    'Poverty',
    'Energy',
    'Food',
    'Health',
    'Forestry',
  ];
  // Define the solutions data

  activeCategory: string = 'Climate';
  filteredSolutions: Solution[] = [];

  // Filter solutions based on the active category
  filterSolutions(): void {
    if (this.activeCategory === 'All') {
      this.filteredSolutions = this.completedSolutions;
    } else {
      this.filteredSolutions = this.completedSolutions.filter(
        (solution) => solution.category === this.activeCategory
      );
    }
  }
  toggleAside() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  toggle(property: 'isSidebarOpen' | 'showAddChallenge') {
    this[property] = !this[property];
  }

  async fetchImagesForCategory(category: string): Promise<string[]> {
    try {
      const folderPath = `challenges/${category.toLowerCase()}`;
      const storageRef = this.storage.ref(folderPath);

      const imageUrls = await storageRef
        .listAll()
        .pipe(
          map((result) =>
            result.items.map((itemRef) => itemRef.getDownloadURL())
          )
        )
        .toPromise()
        .then((urlPromises: any) => Promise.all(urlPromises));

      console.log(`Images fetched for category ${category}:`, imageUrls);
      return imageUrls; // Return fetched images
    } catch (error) {
      console.error(`Error fetching images for category ${category}:`, error);
      return []; // Return an empty array if fetching fails
    }
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
      this.imageChallenge = url!;
      console.log('The URL is', url);
      console.log('The ID is', this.challengeId);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(this.translate.instant('home.alerts.uploadError'));
    }
  }

  addChallenge() {
    if (
      !this.titleChallenge ||
      !this.descriptionChallenge ||
      !this.categoryChallenge ||
      !this.imageChallenge
    ) {
      alert(this.translate.instant('home.alerts.missingFields'));
      return;
    }

    const newChallenge = {
      id: this.challengeId,
      title: this.titleChallenge,
      description: this.descriptionChallenge,
      category: this.categoryChallenge,
      image: this.imageChallenge,
    };

    this.challenge
      .addChallenge(newChallenge)
      .then(() => {
        console.log('Challenge added successfully:', newChallenge);

        // Automatically select the added challenge and navigate
        this.selectChallenge();

        // Clear the form fields
        this.challengeId = '';
        this.titleChallenge = '';
        this.descriptionChallenge = '';
        this.categoryChallenge = '';
        this.imageChallenge = '';
      })
      .catch((error) => {
        console.error('Error adding challenge:', error);
      });
  }

  selectChallenge() {
    if (!this.challengeId) {
      console.error('No challenge ID available to select.');
      return;
    }
    const selectedChallengeItem = {
      id: this.challengeId,
      title: this.titleChallenge,
      description: this.descriptionChallenge,
      image: this.imageChallenge,
      restricted: 'false',
    };

    this.challenge.setSelectedChallengeItem(selectedChallengeItem);

    this.router.navigate(['/start-challenge/']);
  }
  public isSdgCategory(cat: string): boolean {
    return (cat ?? '').toLowerCase().includes('sdg'); // matches 'UN SDG', 'SDGs', etc.
  }

  getCategoryLabelKey(category: string): string {
    return this.categoryLabelKeyMap[category] || category;
  }

  getOriginalChallengeTitle(index: number): string {
    return this.challenges[this.activeCategory]?.titles?.[index] || this.titles[index];
  }

  getOriginalChallengeDescription(index: number): string {
    return (
      this.challenges[this.activeCategory]?.descriptions?.[index] ||
      this.descriptions[index]
    );
  }

  private shouldUseFrenchTitles(): boolean {
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
}
