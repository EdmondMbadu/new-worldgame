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
    city: '',
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
            ? 'Using the last Solution Launch location you saved here.'
            : 'Using the last location saved in this browser.',
          initialized: true,
        });
        return;
      }

      this.setState({
        city: '',
        country: '',
        source: 'none',
        currentUser: user,
        statusMessage: user?.uid
          ? 'We did not find a location on your profile. Add city and country here and we will save it back to your profile.'
          : 'Add city and country to make these recommendations more precise.',
        initialized: true,
      });
    })();

    try {
      await this.initializingPromise;
    } finally {
      this.initializingPromise = undefined;
    }
  }

  async applyLocation(city: string, country: string): Promise<void> {
    const normalizedCity = city.trim();
    const normalizedCountry = country.trim();
    const currentUser = this.snapshot.currentUser;
    const source: SlpLocationContext['source'] = currentUser?.uid
      ? 'manual'
      : 'guest';

    this.setState({
      city: normalizedCity,
      country: normalizedCountry,
      source,
      statusMessage: this.snapshot.statusMessage,
    });

    if (currentUser?.uid) {
      await this.data.updateLocation(
        currentUser.uid,
        `${normalizedCity}, ${normalizedCountry}`
      );
      this.setState({
        city: normalizedCity,
        country: normalizedCountry,
        source,
        statusMessage:
          'Location saved to your profile and used to refresh Solution Launch recommendations.',
      });
      return;
    }

    localStorage.setItem(
      this.storageKey,
      JSON.stringify({ city: normalizedCity, country: normalizedCountry })
    );
    this.setState({
      city: normalizedCity,
      country: normalizedCountry,
      source,
      statusMessage:
        'Location saved in this browser and used to refresh Solution Launch recommendations.',
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
        city: parts[0],
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

      const parsed = JSON.parse(raw) as { city?: string; country?: string };
      if (!parsed.city || !parsed.country) {
        return null;
      }

      return {
        city: parsed.city,
        country: parsed.country,
      };
    } catch {
      return null;
    }
  }
}
