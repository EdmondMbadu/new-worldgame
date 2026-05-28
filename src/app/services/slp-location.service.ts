import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { SlpLocationContext } from './slp-context.service';

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
  private readonly usStateCodes = new Set([
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
    'DC',
  ]);
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

  constructor(private auth: AuthService, private data: DataService) {}

  get snapshot(): SlpLocationState {
    return this.stateSubject.value;
  }

  async init(): Promise<void> {
    if (this.snapshot.initialized) {
      return;
    }
    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      const user = (await this.auth.getCurrentUserPromise()) as User | null;
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
        return;
      }

      const storedLocation = this.readStoredLocation();
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
        return;
      }

      this.setState({
        city: '',
        region: '',
        country: '',
        mode: 'unset',
        source: 'none',
        currentUser: user,
        statusMessage: user?.uid
          ? 'Choose local targeting or global targeting before we build Solution Launch recommendations.'
          : 'Choose local targeting or global targeting before we build Solution Launch recommendations.',
        initialized: true,
      });
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
    } = this.normalizeLocationParts(city, region, country);
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

    if (currentUser?.uid) {
      await this.data.updateLocation(
        currentUser.uid,
        [normalizedCity, normalizedRegion, normalizedCountry]
          .filter(Boolean)
          .join(', ')
      );
      this.setState({
        mode: 'location',
        city: normalizedCity,
        region: normalizedRegion,
        country: normalizedCountry,
        source,
        statusMessage:
          'Location saved to your profile and used to refresh Solution Launch recommendations.',
      });
      return;
    }

    localStorage.setItem(
      this.storageKey,
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
        'Location saved in this browser and used to refresh Solution Launch recommendations.',
    });
  }

  async applyGlobal(): Promise<void> {
    const currentUser = this.snapshot.currentUser;
    const source: SlpLocationContext['source'] = currentUser?.uid
      ? 'manual'
      : 'guest';

    localStorage.setItem(
      this.storageKey,
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
      const normalized = this.normalizeLocationParts(
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

  private readStoredLocation(): SlpLocationContext | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
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
      const normalized = this.normalizeLocationParts(
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

  private normalizeLocationParts(
    city: string,
    region: string,
    country: string
  ): { city: string; region: string; country: string } {
    const normalizedCity = city.trim();
    let normalizedRegion = region.trim();
    let normalizedCountry = country.trim();
    const countryUpper = normalizedCountry.toUpperCase();

    if (!normalizedRegion && this.usStateCodes.has(countryUpper)) {
      normalizedRegion = countryUpper;
      normalizedCountry = 'United States';
    } else if (['US', 'USA', 'U.S.', 'U.S.A.'].includes(countryUpper)) {
      normalizedCountry = 'United States';
    }

    return {
      city: normalizedCity,
      region: normalizedRegion,
      country: normalizedCountry,
    };
  }
}
