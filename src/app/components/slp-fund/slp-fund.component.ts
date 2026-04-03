import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable, shareReplay, switchMap, tap } from 'rxjs';
import {
  SlpLocationContext,
  SlpContextService,
  SlpFundViewModel,
} from 'src/app/services/slp-context.service';
import { SlpLocationService } from 'src/app/services/slp-location.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-slp-fund',
  templateUrl: './slp-fund.component.html',
  styleUrls: ['./slp-fund.component.css'],
})
export class SlpFundComponent implements OnInit {
  vm$!: Observable<SlpFundViewModel>;
  city = '';
  country = '';
  locationError = '';
  savingLocation = false;

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private slpContext: SlpContextService,
    private slpLocation: SlpLocationService
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);

    this.vm$ = combineLatest([
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
      switchMap((solutionId) =>
        this.slpLocation.state$.pipe(
          switchMap((location) =>
            this.slpContext.getFundViewModel(solutionId, location)
          )
        )
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

    void this.initializeLocation();
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
        'Enter both city and country to rank funding options more precisely.';
      return;
    }

    this.locationError = '';
    this.savingLocation = true;

    try {
      await this.slpLocation.applyLocation(city, country);
    } catch (error) {
      console.error('Failed to save Solution Launch funding location', error);
      this.locationError = 'The funding list updated, but the location could not be saved. Try again.';
    } finally {
      this.savingLocation = false;
    }
  }

  private async initializeLocation(): Promise<void> {
    await this.slpLocation.init();
    const { city, country } = this.slpLocation.snapshot as SlpLocationContext;
    this.city = city?.trim() || '';
    this.country = country?.trim() || '';
  }
}
