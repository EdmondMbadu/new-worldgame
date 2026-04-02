import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, map, Observable, shareReplay, switchMap, tap } from 'rxjs';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import {
  SlpLocationContext,
  SlpContextService,
  SlpPublishViewModel,
} from 'src/app/services/slp-context.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-slp-publish',
  templateUrl: './slp-publish.component.html',
  styleUrls: ['./slp-publish.component.css'],
})
export class SlpPublishComponent implements OnInit {
  vm$!: Observable<SlpPublishViewModel>;
  city = '';
  country = '';
  locationSource: SlpLocationContext['source'] = 'none';
  locationStatusMessage = '';
  locationError = '';
  savingLocation = false;
  currentUser: User | null = null;
  private readonly locationStorageKey = 'slp_publish_location';
  private readonly location$ = new BehaviorSubject<SlpLocationContext>({
    city: '',
    country: '',
    source: 'none',
  });

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private slpContext: SlpContextService,
    private auth: AuthService,
    private data: DataService
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
        this.location$.pipe(
          switchMap((location) =>
            this.slpContext.getPublishViewModel(solutionId, location)
          )
        )
      ),
      tap((vm) => {
        this.seoService.updateMetaTags({
          title: vm.shell.hasSolution
            ? `${vm.solutionTitle} | SLP Publish | NewWorld Game`
            : 'SLP Publish Pathway | NewWorld Game',
          description: vm.heroDescription,
          keywords:
            'NewWorld Game SLP, publish pathway, solution launch, public preview, launch workflow',
          url: 'https://newworld-game.org/slp',
          type: 'website',
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    void this.loadInitialLocation();
  }

  get hasLocation(): boolean {
    return !!this.city.trim() && !!this.country.trim();
  }

  get locationSourceLabel(): string {
    if (this.locationSource === 'profile') {
      return 'From profile';
    }
    if (this.locationSource === 'manual') {
      return 'Saved here';
    }
    if (this.locationSource === 'guest') {
      return 'This browser';
    }
    return 'Needed for precision';
  }

  get currentLocationLabel(): string {
    if (!this.hasLocation) {
      return 'City and country not set yet';
    }
    return `${this.city.trim()}, ${this.country.trim()}`;
  }

  async applyLocation(): Promise<void> {
    const city = this.city.trim();
    const country = this.country.trim();

    if (!city || !country) {
      this.locationError = 'Enter both city and country to rank local publication targets.';
      this.locationStatusMessage = '';
      return;
    }

    this.locationError = '';
    this.savingLocation = true;

    const source: SlpLocationContext['source'] = this.currentUser?.uid
      ? 'manual'
      : 'guest';

    this.pushLocation({ city, country, source });

    try {
      if (this.currentUser?.uid) {
        await this.data.updateLocation(this.currentUser.uid, `${city}, ${country}`);
        this.locationStatusMessage =
          'Location saved to your profile and used to refresh the publication list.';
      } else {
        localStorage.setItem(
          this.locationStorageKey,
          JSON.stringify({ city, country })
        );
        this.locationStatusMessage =
          'Location saved in this browser and used to refresh the publication list.';
      }
    } catch (error) {
      console.error('Failed to save publish location', error);
      this.locationError =
        'The list updated, but the location could not be saved. Try again.';
    } finally {
      this.savingLocation = false;
    }
  }

  private async loadInitialLocation(): Promise<void> {
    const user = (await this.auth.getCurrentUserPromise()) as User | null;
    this.currentUser = user;

    const profileLocation = this.parseLocation(user?.location);
    if (profileLocation) {
      this.pushLocation({
        ...profileLocation,
        source: 'profile',
      });
      this.locationStatusMessage =
        'Using the location already stored on your profile.';
      return;
    }

    const storedLocation = this.readStoredLocation();
    if (storedLocation) {
      this.pushLocation({
        ...storedLocation,
        source: user?.uid ? 'manual' : 'guest',
      });
      this.locationStatusMessage = user?.uid
        ? 'Using the last publish location you saved here.'
        : 'Using the last location saved in this browser.';
      return;
    }

    this.locationStatusMessage = user?.uid
      ? 'We did not find a location on your profile. Add city and country here and we will save it back to your profile.'
      : 'Add city and country to make the publication list more precise.';
  }

  private pushLocation(location: SlpLocationContext): void {
    this.city = location.city?.trim() || '';
    this.country = location.country?.trim() || '';
    this.locationSource = location.source || 'none';
    this.location$.next({
      city: this.city,
      country: this.country,
      source: this.locationSource,
    });
  }

  private parseLocation(rawLocation?: string | null): SlpLocationContext | null {
    const value = (rawLocation || '').trim();
    if (!value || value.toLowerCase() === 'na') {
      return null;
    }

    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return {
        city: parts[0],
        country: parts[parts.length - 1],
      };
    }

    return null;
  }

  private readStoredLocation(): SlpLocationContext | null {
    try {
      const raw = localStorage.getItem(this.locationStorageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as { city?: string; country?: string };
      if (!parsed.city || !parsed.country) {
        return null;
      }
      return { city: parsed.city, country: parsed.country };
    } catch {
      return null;
    }
  }
}
