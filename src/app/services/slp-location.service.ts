import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import { SlpLocationContext } from './slp-context.service';
import { SlpPlaceService } from './slp-place.service';
import { SolutionService } from './solution.service';

export interface SlpLocationState extends SlpLocationContext {
  currentUser: User | null;
  statusMessage: string;
  initialized: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SlpLocationService {
  private readonly storageKey = 'slp_publish_location';
  private activeSolutionId = '';
  private initializedForSolutionId = '';
  private initializingPromise?: Promise<void>;
  private readonly stateSubject = new BehaviorSubject<SlpLocationState>({
    mode: 'unset',
    city: '',
    region: '',
    country: '',
    source: 'none',
    currentUser: null,
    statusMessage: '',
    initialized: false,
  });

  readonly state$ = this.stateSubject.asObservable();

  constructor(
    private auth: AuthService,
    private places: SlpPlaceService,
    private solutionService: SolutionService
  ) {}

  get snapshot(): SlpLocationState {
    return this.stateSubject.value;
  }

  async init(solutionId?: string): Promise<void> {
    const cleanSolutionId = String(solutionId || '').trim();
    if (
      this.snapshot.initialized &&
      this.initializedForSolutionId === cleanSolutionId
    ) {
      return;
    }
    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      this.activeSolutionId = cleanSolutionId;
      const user = (await this.auth.getCurrentUserPromise()) as User | null;
      const storedLocation = this.readStoredLocation(cleanSolutionId);
      if (storedLocation) {
        this.setState({
          ...storedLocation,
          source: user?.uid ? 'manual' : 'guest',
          currentUser: user,
          statusMessage: user?.uid
            ? storedLocation.mode === 'global'
              ? 'Using the global Solution Launch targeting you chose here.'
              : 'Using the last Solution Launch location you saved here.'
            : storedLocation.mode === 'global'
              ? 'Using the global targeting saved in this browser.'
              : 'Using the last location saved in this browser.',
          initialized: true,
        });
        this.initializedForSolutionId = cleanSolutionId;
        return;
      }

      const solutionLocation = await this.getSolutionLocation(cleanSolutionId);
      if (solutionLocation) {
        this.setState({
          ...solutionLocation,
          mode: 'location',
          source: 'solution',
          currentUser: user,
          statusMessage: 'Using the location attached to this solution.',
          initialized: true,
        });
        this.initializedForSolutionId = cleanSolutionId;
        return;
      }

      const profileLocation = this.parseLocation(user?.location);

      if (profileLocation) {
        this.setState({
          ...profileLocation,
          mode: 'location',
          source: 'profile',
          currentUser: user,
          statusMessage: 'Using the location already stored on your profile.',
          initialized: true,
        });
        this.initializedForSolutionId = cleanSolutionId;
        return;
      }

      this.setState({
        city: '',
        region: '',
        country: '',
        mode: 'global',
        source: 'none',
        currentUser: user,
        statusMessage:
          'Using global targeting until you choose a specific launch location.',
        initialized: true,
      });
      this.initializedForSolutionId = cleanSolutionId;
    })();

    try {
      await this.initializingPromise;
    } finally {
      this.initializingPromise = undefined;
    }
  }

  get hasTargetingChoice(): boolean {
    const snapshot = this.snapshot;
    return (
      snapshot.mode === 'global' ||
      (!!snapshot.city?.trim() && !!snapshot.country?.trim())
    );
  }

  async applyLocation(
    city: string,
    country: string,
    region: string = ''
  ): Promise<void> {
    const {
      city: normalizedCity,
      region: normalizedRegion,
      country: normalizedCountry,
    } = this.places.normalizeLocationParts(city, region, country);
    const currentUser = this.snapshot.currentUser;
    const source: SlpLocationContext['source'] = currentUser?.uid
      ? 'manual'
      : 'guest';

    this.setState({
      mode: 'location',
      city: normalizedCity,
      region: normalizedRegion,
      country: normalizedCountry,
      source,
      statusMessage: this.snapshot.statusMessage,
    });

    localStorage.setItem(
      this.getStorageKey(this.activeSolutionId),
      JSON.stringify({
        mode: 'location',
        city: normalizedCity,
        region: normalizedRegion,
        country: normalizedCountry,
      })
    );
    this.setState({
      mode: 'location',
      city: normalizedCity,
      region: normalizedRegion,
      country: normalizedCountry,
      source,
      statusMessage:
        'Location saved for this solution launch and used to refresh recommendations.',
    });
  }

  async applyGlobal(): Promise<void> {
    const currentUser = this.snapshot.currentUser;
    const source: SlpLocationContext['source'] = currentUser?.uid
      ? 'manual'
      : 'guest';

    localStorage.setItem(
      this.getStorageKey(this.activeSolutionId),
      JSON.stringify({ mode: 'global', city: '', region: '', country: '' })
    );

    this.setState({
      mode: 'global',
      city: '',
      region: '',
      country: '',
      source,
      statusMessage:
        'Using global targeting. Results will be ranked by topic fit, credibility, and actionability rather than local proximity.',
    });
  }

  private setState(partial: Partial<SlpLocationState>): void {
    this.stateSubject.next({
      ...this.snapshot,
      ...partial,
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
      const normalized = this.places.normalizeLocationParts(
        parts[0],
        parts.length > 2 ? parts.slice(1, -1).join(', ') : '',
        parts[parts.length - 1]
      );
      return {
        mode: 'location',
        city: normalized.city,
        region: normalized.region,
        country: normalized.country,
      };
    }

    return null;
  }

  private readStoredLocation(solutionId?: string): SlpLocationContext | null {
    try {
      const raw =
        localStorage.getItem(this.getStorageKey(solutionId)) ||
        localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as {
        mode?: 'location' | 'global' | 'unset';
        city?: string;
        region?: string;
        country?: string;
      };
      if (parsed.mode === 'global') {
        return {
          mode: 'global',
          city: '',
          region: '',
          country: '',
        };
      }
      if (!parsed.city || !parsed.country) {
        return null;
      }
      const normalized = this.places.normalizeLocationParts(
        parsed.city,
        parsed.region || '',
        parsed.country
      );

      return {
        mode: 'location',
        city: normalized.city,
        region: normalized.region,
        country: normalized.country,
      };
    } catch {
      return null;
    }
  }

  private async getSolutionLocation(
    solutionId: string
  ): Promise<SlpLocationContext | null> {
    if (!solutionId) {
      return null;
    }

    try {
      const solutions = await firstValueFrom(
        this.solutionService.getSolutionForNonAuthenticatedUser(solutionId)
      );
      const solution = Array.isArray(solutions) ? (solutions[0] as any) : null;
      if (!solution) {
        return null;
      }

      const parsedFromText = this.parseLocation(
        solution.location ||
          solution.targetLocation ||
          solution.launchLocation ||
          solution.place ||
          solution.recruitmentProfile?.location
      );
      if (parsedFromText) {
        return parsedFromText;
      }

      const rawCity = String(solution.city || solution.locationCity || '').trim();
      const rawRegion = String(
        solution.region ||
          solution.state ||
          solution.stateProvince ||
          solution.locationRegion ||
          ''
      ).trim();
      const rawCountry = String(solution.country || solution.locationCountry || '').trim();

      if (rawCity && rawCountry) {
        const normalized = this.places.normalizeLocationParts(
          rawCity,
          rawRegion,
          rawCountry
        );
        return {
          mode: 'location',
          city: normalized.city,
          region: normalized.region,
          country: normalized.country,
        };
      }
    } catch (error) {
      console.warn('Could not read solution location for Solution Launch', error);
    }

    return null;
  }

  private getStorageKey(solutionId?: string): string {
    const cleanSolutionId = String(solutionId || '').trim();
    return cleanSolutionId
      ? `${this.storageKey}:${cleanSolutionId}`
      : this.storageKey;
  }
}
