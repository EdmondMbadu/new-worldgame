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
    const normalizedCity = city.trim();
    const normalizedRegion = region.trim();
    const normalizedCountry = country.trim();
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
      return {
        mode: 'location',
        city: parts[0],
        region: parts.length > 2 ? parts.slice(1, -1).join(', ') : '',
        country: parts[parts.length - 1],
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

      return {
        mode: 'location',
        city: parsed.city,
        region: parsed.region || '',
        country: parsed.country,
      };
    } catch {
      return null;
    }
  }
}
