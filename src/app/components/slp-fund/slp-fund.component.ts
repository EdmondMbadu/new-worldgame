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
  SlpActionCard,
  SlpLocationContext,
  SlpContextService,
  SlpFundViewModel,
} from 'src/app/services/slp-context.service';
import {
  SlpLaunchResource,
  SlpLaunchResourceService,
} from 'src/app/services/slp-launch-resource.service';
import { SlpLocationService } from 'src/app/services/slp-location.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-slp-fund',
  templateUrl: './slp-fund.component.html',
  styleUrls: ['./slp-fund.component.css'],
})
export class SlpFundComponent implements OnInit, OnDestroy {
  vm$!: Observable<SlpFundViewModel>;
  city = '';
  region = '';
  country = '';
  locationError = '';
  savingLocation = false;
  targetingModalOpen = false;
  researchLoading = false;
  researchError = '';
  researchCards: SlpActionCard[] = [];
  researchSummary = '';
  researchGeneratedAtLabel = '';
  usingStoredResearch = false;
  private solutionId?: string;
  private contextSub?: Subscription;
  private locationInitSub?: Subscription;

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private slpContext: SlpContextService,
    private slpLocation: SlpLocationService,
    private slpResources: SlpLaunchResourceService
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
        this.slpContext.getFundViewModel(solutionId, location)
      ),
      tap((vm) => {
        this.seoService.updateMetaTags({
          title: vm.shell.hasSolution
            ? `${vm.shell.solutionTitle} | Solution Launch Funding | NewWorld Game`
            : 'Solution Launch Funding | NewWorld Game',
          description: vm.heroDescription,
          keywords:
            'NewWorld Game funding, Solution Launch funding pathway, solution funding readiness, team signal, evidence pack',
          url: 'https://newworld-game.org/fund',
          type: 'website',
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.locationInitSub = solutionId$.subscribe((solutionId) => {
      void this.initializeLocation(solutionId);
    });

    this.contextSub = combineLatest([solutionId$, this.slpLocation.state$])
      .pipe(
        filter(([, location]) => location.initialized),
        map(([solutionId, location]) => ({ solutionId, location })),
        distinctUntilChanged(
          (a, b) =>
            a.solutionId === b.solutionId &&
            a.location.mode === b.location.mode &&
            a.location.city === b.location.city &&
            a.location.region === b.location.region &&
            a.location.country === b.location.country
        )
      )
      .subscribe(({ solutionId, location }) => {
        this.solutionId = solutionId;
        this.city = location.city?.trim() || '';
        this.region = location.region?.trim() || '';
        this.country = location.country?.trim() || '';
        this.researchCards = [];
        this.researchSummary = '';
        this.researchError = '';
        this.researchGeneratedAtLabel = '';
        this.usingStoredResearch = false;
        this.targetingModalOpen = !this.hasTargetingChoice(location);

        if (solutionId && this.hasTargetingChoice(location)) {
          const cached = this.slpResources.readCachedSearch({
            solutionId,
            lane: 'fund',
            location,
          });
          if (cached?.resources.length) {
            this.applyResearch(cached.resources, cached.summary, cached.generatedAt, true);
          } else {
            void this.loadResearch(false);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.contextSub?.unsubscribe();
    this.locationInitSub?.unsubscribe();
  }

  get locationSourceLabel(): string {
    if (this.slpLocation.snapshot.source === 'solution') {
      return 'From solution';
    }
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

  get currentTargetingLabel(): string {
    if (this.slpLocation.snapshot.mode === 'global') {
      return 'Global / anywhere';
    }
    return [this.city.trim(), this.region.trim(), this.country.trim()]
      .filter(Boolean)
      .join(', ') || 'City and country not set yet';
  }

  get locationStatusMessage(): string {
    return this.slpLocation.snapshot.statusMessage;
  }

  async applyLocation(): Promise<void> {
    const city = this.city.trim();
    const region = this.region.trim();
    const country = this.country.trim();

    if (!city || !country) {
      this.locationError =
        'Enter both city and country to rank funding options more precisely.';
      return;
    }

    this.locationError = '';
    this.savingLocation = true;

    try {
      await this.slpLocation.applyLocation(city, country, region);
    } catch (error) {
      console.error('Failed to save Solution Launch funding location', error);
      this.locationError = 'The funding list updated, but the location could not be saved. Try again.';
    } finally {
      this.savingLocation = false;
    }
  }

  async applyTargetingLocation(value: {
    city: string;
    region: string;
    country: string;
  }): Promise<void> {
    this.city = value.city;
    this.region = value.region;
    this.country = value.country;
    await this.applyLocation();
    if (!this.locationError) {
      this.targetingModalOpen = false;
    }
  }

  async applyGlobalTargeting(): Promise<void> {
    this.locationError = '';
    this.savingLocation = true;
    try {
      await this.slpLocation.applyGlobal();
      this.targetingModalOpen = false;
    } finally {
      this.savingLocation = false;
    }
  }

  async refreshResearch(): Promise<void> {
    await this.loadResearch(true);
  }

  private async initializeLocation(solutionId?: string): Promise<void> {
    await this.slpLocation.init(solutionId);
    const { city, country } = this.slpLocation.snapshot as SlpLocationContext;
    this.city = city?.trim() || '';
    this.region = this.slpLocation.snapshot.region?.trim() || '';
    this.country = country?.trim() || '';
  }

  private async loadResearch(forceRefresh: boolean): Promise<void> {
    if (!this.solutionId || !this.hasTargetingChoice(this.slpLocation.snapshot)) {
      return;
    }

    this.researchLoading = true;
    this.researchError = '';
    try {
      if (forceRefresh) {
        this.slpResources.clearCachedSearch({
          solutionId: this.solutionId,
          lane: 'fund',
          location: this.slpLocation.snapshot,
        });
      }
      const response = await this.slpResources.findResources({
        solutionId: this.solutionId,
        lane: 'fund',
        location: this.slpLocation.snapshot,
        pageSize: 8,
        forceRefresh,
      });
      this.applyResearch(response.resources, response.summary, response.generatedAt, false);
      this.slpResources.writeCachedSearch(
        {
          solutionId: this.solutionId,
          lane: 'fund',
          location: this.slpLocation.snapshot,
        },
        response
      );
    } catch (error: any) {
      console.error('Funding research failed', error);
      const message = String(error?.message || '').trim();
      const technicalMessage =
        /firestore|undefined|valid firestore document|value for argument/i.test(message);
      this.researchError =
        message &&
        !technicalMessage &&
        !['internal', 'not-found', 'unknown'].includes(message.toLowerCase())
          ? message
          : 'Live funding research is unavailable. Showing the fallback funding list.';
    } finally {
      this.researchLoading = false;
    }
  }

  private applyResearch(
    resources: SlpLaunchResource[],
    summary: string,
    generatedAt: string,
    fromCache: boolean
  ): void {
    this.researchCards = resources.map((resource) => this.toResearchCard(resource));
    this.researchSummary = summary;
    this.researchGeneratedAtLabel = this.formatGeneratedAt(generatedAt);
    this.usingStoredResearch = fromCache;
  }

  private toResearchCard(resource: SlpLaunchResource): SlpActionCard {
    return {
      label: resource.type,
      title: resource.name,
      description: `${resource.whyRelevant} ${resource.specificFit}`,
      fitScore: resource.fitScore,
      icon: 'savings',
      meta: [
        resource.location ? `Location: ${resource.location}` : this.currentTargetingLabel,
        resource.eligibility ? `Eligibility: ${resource.eligibility}` : '',
        resource.deadline ? `Cycle: ${resource.deadline}` : 'Cycle: check current application window',
        resource.contactHint ? `Access: ${resource.contactHint}` : '',
        `Next: ${resource.nextAction}`,
      ].filter(Boolean),
      cta: 'Open result',
      badge: 'Live research',
      href: resource.url,
      external: true,
    };
  }

  private hasTargetingChoice(location: SlpLocationContext): boolean {
    return (
      location.mode === 'global' ||
      (!!location.city?.trim() && !!location.country?.trim())
    );
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
}
