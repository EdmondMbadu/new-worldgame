import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  shareReplay,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import {
  SlpLocationContext,
  SlpContextService,
  SlpReachViewModel,
} from 'src/app/services/slp-context.service';
import {
  SlpReachCachedSearch,
  SlpReachPerson,
  SlpReachService,
} from 'src/app/services/slp-reach.service';
import { SlpLocationService } from 'src/app/services/slp-location.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-slp-reach',
  templateUrl: './slp-reach.component.html',
  styleUrls: ['./slp-reach.component.css'],
})
export class SlpReachComponent implements OnInit, OnDestroy {
  readonly loadingSteps = [
    'Scanning solution topic and key terms',
    'Checking public profiles and staff pages',
    'Filtering for person-specific public emails',
    'Removing weak fits and duplicate organizations',
  ];
  readonly loadingSkeletonCards = [0, 1, 2];
  vm$!: Observable<SlpReachViewModel>;
  setupSectionOpen = false;
  briefSectionOpen = false;
  city = '';
  country = '';
  locationError = '';
  savingLocation = false;
  loading = false;
  loadingMore = false;
  loadError = '';
  people: SlpReachPerson[] = [];
  removedCount = 0;
  currentPage = 0;
  hasMore = true;
  searchSummary = '';
  generatedAtLabel = '';
  hasStoredResults = false;
  usingStoredResults = false;
  private solutionId?: string;
  private contextSub?: Subscription;
  private loadingStepIndex = 0;
  private loadingStepTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly seoService: SeoService,
    private readonly route: ActivatedRoute,
    private readonly slpContext: SlpContextService,
    private readonly slpLocation: SlpLocationService,
    private readonly slpReach: SlpReachService
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);

    const solutionId$ = combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
    ]).pipe(
      map(
        ([params, queryParams]) =>
          params.get('solutionId') ||
          queryParams.get('solutionId') ||
          queryParams.get('sid') ||
          undefined
      ),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.vm$ = combineLatest([solutionId$, this.slpLocation.state$]).pipe(
      filter(([, location]) => location.initialized),
      switchMap(([solutionId, location]) =>
        this.slpContext.getReachViewModel(solutionId, location)
      ),
      tap((vm) => {
        this.seoService.updateMetaTags({
          title: vm.shell.hasSolution
            ? `${vm.shell.solutionTitle} | Solution Launch Reach | NewWorld Game`
            : 'Solution Launch Reach | NewWorld Game',
          description: vm.heroDescription,
          keywords:
            'NewWorld Game reach, solution launch reach, outreach contacts, real people lookup, public contact discovery',
          url: 'https://newworld-game.org/reach',
          type: 'website',
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.contextSub = combineLatest([solutionId$, this.slpLocation.state$])
      .pipe(
        filter(([, location]) => location.initialized),
        map(([solutionId, location]) => ({
          solutionId: solutionId || undefined,
          city: location.city?.trim() || '',
          country: location.country?.trim() || '',
        })),
        distinctUntilChanged(
          (a, b) =>
            a.solutionId === b.solutionId &&
            a.city === b.city &&
            a.country === b.country
        )
      )
      .subscribe((context) => {
        this.solutionId = context.solutionId;
        this.city = context.city;
        this.country = context.country;
        this.resetSearchState();
        if (this.solutionId) {
          const usedCached = this.loadCachedSearch();
          if (!usedCached) {
            void this.fetchPage(1, true);
          }
        }
      });

    void this.initializeLocation();
  }

  ngOnDestroy(): void {
    this.contextSub?.unsubscribe();
    this.stopLoadingMotion();
  }

  get locationSourceLabel(): string {
    if (this.slpLocation.snapshot.source === 'profile') {
      return 'From profile';
    }
    if (this.slpLocation.snapshot.source === 'manual') {
      return 'Saved here';
    }
    if (this.slpLocation.snapshot.source === 'guest') {
      return 'This browser';
    }
    return 'Needed for precision';
  }

  get currentLocationLabel(): string {
    if (!this.city.trim() || !this.country.trim()) {
      return 'City and country not set yet';
    }
    return `${this.city.trim()}, ${this.country.trim()}`;
  }

  get locationStatusMessage(): string {
    return this.slpLocation.snapshot.statusMessage;
  }

  async applyLocation(): Promise<void> {
    const city = this.city.trim();
    const country = this.country.trim();

    if (!city || !country) {
      this.locationError =
        'Enter both city and country to tighten the contact search.';
      return;
    }

    this.locationError = '';
    this.savingLocation = true;

    try {
      await this.slpLocation.applyLocation(city, country);
    } catch (error) {
      console.error('Failed to save Solution Launch reach location', error);
      this.locationError =
        'The location could not be saved. Try again.';
    } finally {
      this.savingLocation = false;
    }
  }

  async loadMore(): Promise<void> {
    if (this.loading || this.loadingMore || !this.solutionId) {
      return;
    }
    await this.fetchPage(this.currentPage + 1, false);
  }

  async refreshResults(): Promise<void> {
    if (!this.solutionId || this.loading || this.loadingMore) {
      return;
    }

    this.slpReach.clearCachedSearch({
      solutionId: this.solutionId,
      city: this.city.trim(),
      country: this.country.trim(),
    });
    this.usingStoredResults = false;
    await this.fetchPage(1, true, true);
  }

  removePerson(person: SlpReachPerson): void {
    this.people = this.people.filter((entry) => entry.id !== person.id);
    this.removedCount += 1;
    this.slpReach.dismissPerson(this.solutionId, person.id);
  }

  trackByPerson(_index: number, person: SlpReachPerson): string {
    return person.id;
  }

  toggleSetupSection(): void {
    this.setupSectionOpen = !this.setupSectionOpen;
  }

  toggleBriefSection(): void {
    this.briefSectionOpen = !this.briefSectionOpen;
  }

  get currentLoadingStep(): string {
    return this.loadingSteps[this.loadingStepIndex] || this.loadingSteps[0];
  }

  get currentLoadingStepIndex(): number {
    return this.loadingStepIndex;
  }

  private async fetchPage(
    page: number,
    reset: boolean,
    forceRefresh = false
  ): Promise<void> {
    if (!this.solutionId) {
      return;
    }

    if (reset) {
      this.loading = true;
      this.startLoadingMotion();
    } else {
      this.loadingMore = true;
    }
    this.loadError = '';

    try {
      const excludedIds = Array.from(
        new Set([
          ...this.people.map((person) => person.id),
          ...this.slpReach.readDismissedIds(this.solutionId),
        ])
      );
      const response = await this.slpReach.findPeople({
        solutionId: this.solutionId,
        page,
        pageSize: 10,
        city: this.city.trim(),
        country: this.country.trim(),
        excludedIds,
        forceRefresh,
      });
      const incoming = response.people.filter(
        (person) => !excludedIds.includes(person.id)
      );

      this.people = reset
        ? incoming
        : [...this.people, ...incoming.filter((person) => !this.people.some((existing) => existing.id === person.id))];
      this.currentPage = response.page;
      this.hasMore = response.hasMore && incoming.length > 0;
      this.searchSummary = response.summary;
      this.generatedAtLabel = this.formatGeneratedAt(response.generatedAt);
      this.hasStoredResults = true;
      this.usingStoredResults = false;
      this.slpReach.writeCachedSearch(
        {
          solutionId: this.solutionId,
          city: this.city.trim(),
          country: this.country.trim(),
        },
        {
          ...response,
          people: this.people,
          page: this.currentPage,
          nextPage: response.nextPage,
          hasMore: this.hasMore,
        }
      );
    } catch (error: any) {
      console.error('Reach people lookup failed', error);
      this.loadError =
        error?.message ||
        'We could not find reach contacts right now. Please retry.';
      this.hasMore = true;
    } finally {
      this.loading = false;
      this.loadingMore = false;
      this.stopLoadingMotion();
    }
  }

  private resetSearchState(): void {
    this.people = [];
    this.currentPage = 0;
    this.hasMore = true;
    this.loadError = '';
    this.searchSummary = '';
    this.generatedAtLabel = '';
    this.hasStoredResults = false;
    this.usingStoredResults = false;
    this.removedCount = this.slpReach.readDismissedIds(this.solutionId).length;
  }

  private formatGeneratedAt(raw: string): string {
    const timestamp = Date.parse(raw);
    if (Number.isNaN(timestamp)) {
      return '';
    }

    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private async initializeLocation(): Promise<void> {
    await this.slpLocation.init();
    const { city, country } = this.slpLocation.snapshot as SlpLocationContext;
    this.city = city?.trim() || '';
    this.country = country?.trim() || '';
  }

  private loadCachedSearch(): boolean {
    const cached = this.slpReach.readCachedSearch({
      solutionId: this.solutionId,
      city: this.city.trim(),
      country: this.country.trim(),
    });
    if (!cached) {
      return false;
    }

    const dismissedIds = new Set(this.slpReach.readDismissedIds(this.solutionId));
    const filteredPeople = cached.people.filter(
      (person) => !dismissedIds.has(person.id)
    );
    if (!filteredPeople.length) {
      return false;
    }

    this.applyCachedSearch({
      ...cached,
      people: filteredPeople,
    });
    return true;
  }

  private applyCachedSearch(cached: SlpReachCachedSearch): void {
    this.people = cached.people;
    this.currentPage = cached.page;
    this.hasMore = cached.hasMore;
    this.searchSummary = cached.summary;
    this.generatedAtLabel = this.formatGeneratedAt(cached.generatedAt);
    this.hasStoredResults = true;
    this.usingStoredResults = true;
  }

  private startLoadingMotion(): void {
    this.stopLoadingMotion();
    this.loadingStepIndex = 0;
    this.loadingStepTimer = setInterval(() => {
      this.loadingStepIndex =
        (this.loadingStepIndex + 1) % this.loadingSteps.length;
    }, 1500);
  }

  private stopLoadingMotion(): void {
    if (this.loadingStepTimer) {
      clearInterval(this.loadingStepTimer);
      this.loadingStepTimer = undefined;
    }
    this.loadingStepIndex = 0;
  }
}
