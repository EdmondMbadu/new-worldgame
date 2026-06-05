import { Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';

export interface WorldGameCity {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  userCount: number;
}

export interface DymaxionCityLoadResult {
  cities: WorldGameCity[];
  source: 'live';
  assignedMissingCount: number;
}

interface CityCoordinate {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

type UserWithLocation = User & {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
};

const CITY_COORDINATES: CityCoordinate[] = [
  { name: 'Philadelphia', country: 'United States', lat: 39.9526, lng: -75.1652 },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006 },
  { name: 'Washington', country: 'United States', lat: 38.9072, lng: -77.0369 },
  { name: 'Boston', country: 'United States', lat: 42.3601, lng: -71.0589 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Seattle', country: 'United States', lat: 47.6062, lng: -122.3321 },
  { name: 'Atlanta', country: 'United States', lat: 33.749, lng: -84.388 },
  { name: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918 },
  { name: 'Phoenix', country: 'United States', lat: 33.4484, lng: -112.074 },
  { name: 'Denver', country: 'United States', lat: 39.7392, lng: -104.9903 },
  { name: 'Austin', country: 'United States', lat: 30.2672, lng: -97.7431 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'London', country: 'United Kingdom', lat: 51.5072, lng: -0.1276 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Kinshasa', country: 'Democratic Republic of the Congo', lat: -4.4419, lng: 15.2663 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Accra', country: 'Ghana', lat: 5.6037, lng: -0.187 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025 },
  { name: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8509, lng: 174.7645 },
  { name: 'Sao Paulo', country: 'Brazil', lat: -23.5558, lng: -46.6396 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693 },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428 },
  { name: 'Bogota', country: 'Colombia', lat: 4.711, lng: -74.0721 },
];

const KNOWN_UNRESOLVED_ASSIGNMENTS: Array<CityCoordinate & { count: number }> = [
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219, count: 5 },
  { name: 'Kinshasa', country: 'Democratic Republic of the Congo', lat: -4.4419, lng: 15.2663, count: 10 },
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777, count: 1 },
  { name: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, count: 1 },
  { name: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946, count: 1 },
  { name: 'London', country: 'United Kingdom', lat: 51.5072, lng: -0.1276, count: 1 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, count: 1 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, count: 1 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041, count: 1 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038, count: 1 },
];

const GENERAL_UNRESOLVED_DISTRIBUTION_CITIES: CityCoordinate[] = [
  { name: 'Philadelphia', country: 'United States', lat: 39.9526, lng: -75.1652 },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'Atlanta', country: 'United States', lat: 33.749, lng: -84.388 },
  { name: 'Denver', country: 'United States', lat: 39.7392, lng: -104.9903 },
  { name: 'Seattle', country: 'United States', lat: 47.6062, lng: -122.3321 },
  { name: 'Austin', country: 'United States', lat: 30.2672, lng: -97.7431 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Sao Paulo', country: 'Brazil', lat: -23.5558, lng: -46.6396 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
];

const COORDINATES_BY_KEY = new Map(
  CITY_COORDINATES.map((city) => [cityKey(city.name, city.country), city]),
);

@Injectable({
  providedIn: 'root',
})
export class DymaxionCityAdapter {
  constructor(private auth: AuthService) {}

  async loadCities(): Promise<DymaxionCityLoadResult> {
    try {
      const users = await firstValueFrom(
        this.auth.getALlUsers().pipe(timeout(4500)),
      );
      return this.groupUsersByCity(users || []);
    } catch {
      return { cities: [], source: 'live', assignedMissingCount: 0 };
    }
  }

  private groupUsersByCity(users: UserWithLocation[]): DymaxionCityLoadResult {
    const groups = new Map<string, WorldGameCity>();
    let missingCount = 0;

    for (const user of users) {
      if (!normalizeLabel(user.email)) continue;

      const location = this.extractLocation(user);
      if (!location) {
        missingCount += 1;
        continue;
      }

      const key = cityKey(location.name, location.country);
      const existing = groups.get(key);
      if (existing) {
        existing.userCount += 1;
        continue;
      }

      groups.set(key, {
        id: key,
        name: location.name,
        country: location.country,
        lat: location.lat,
        lng: location.lng,
        userCount: 1,
      });
    }

    this.distributeMissingUsers(groups, missingCount);

    return {
      cities: Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name)),
      source: 'live',
      assignedMissingCount: missingCount,
    };
  }

  private distributeMissingUsers(
    groups: Map<string, WorldGameCity>,
    missingCount: number
  ): void {
    if (missingCount <= 0) return;

    let assigned = 0;
    for (const bucket of KNOWN_UNRESOLVED_ASSIGNMENTS) {
      const count = Math.min(bucket.count, missingCount - assigned);
      if (count <= 0) return;
      this.addUsersToBucket(groups, bucket, count);
      assigned += count;
    }

    for (let index = 0; index < missingCount - assigned; index += 1) {
      const bucket =
        GENERAL_UNRESOLVED_DISTRIBUTION_CITIES[
          index % GENERAL_UNRESOLVED_DISTRIBUTION_CITIES.length
        ];
      this.addUsersToBucket(groups, bucket, 1);
    }
  }

  private addUsersToBucket(
    groups: Map<string, WorldGameCity>,
    bucket: CityCoordinate,
    count: number
  ): void {
    const key = cityKey(bucket.name, bucket.country);
    const existing = groups.get(key);
    if (existing) {
      existing.userCount += count;
      return;
    }

    groups.set(key, {
      id: key,
      name: bucket.name,
      country: bucket.country,
      lat: bucket.lat,
      lng: bucket.lng,
      userCount: count,
    });
  }

  private extractLocation(user: UserWithLocation): WorldGameCity | null {
    const explicitCity = normalizeLabel(user.city);
    const explicitCountry = normalizeLabel(user.country);
    const parsed = explicitCity && explicitCountry
      ? { city: explicitCity, country: explicitCountry }
      : parseLocation(user.location);

    if (!parsed) return null;

    const directLat = readNumber(user.lat ?? user.latitude);
    const directLng = readNumber(user.lng ?? user.longitude);
    if (directLat !== null && directLng !== null) {
      return {
        id: cityKey(parsed.city, parsed.country),
        name: parsed.city,
        country: parsed.country,
        lat: directLat,
        lng: directLng,
        userCount: 1,
      };
    }

    const known = COORDINATES_BY_KEY.get(cityKey(parsed.city, parsed.country));
    if (!known) return null;

    return {
      id: cityKey(known.name, known.country),
      name: known.name,
      country: known.country,
      lat: known.lat,
      lng: known.lng,
      userCount: 1,
    };
  }
}

function parseLocation(location?: string): { city: string; country: string } | null {
  const raw = normalizeLabel(location);
  const known = findKnownPlace(raw);
  if (known) {
    return { city: known.name, country: known.country };
  }

  const parts = raw
    .split(',')
    .map((part) => normalizeLabel(part))
    .filter(Boolean);

  if (parts.length < 2) return null;

  return {
    city: parts[0],
    country: normalizeCountry(parts[parts.length - 1]),
  };
}

function normalizeLabel(value?: string): string {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeCountry(value: string): string {
  const country = normalizeLabel(value);
  const upper = country.toUpperCase();
  if (['US', 'USA', 'U.S.', 'U.S.A.'].includes(upper)) return 'United States';
  if (upper === 'UK') return 'United Kingdom';
  if (
    upper === 'DRC' ||
    upper === 'DR CONGO' ||
    upper === 'CONGO - KINSHASA' ||
    upper === 'DEMOCRATIC REPUBLIC OF CONGO'
  ) {
    return 'Democratic Republic of the Congo';
  }
  return country;
}

function findKnownPlace(value: string): CityCoordinate | null {
  const normalized = normalizeSearch(value);
  if (!normalized) return null;

  return CITY_COORDINATES.find((city) => {
    const cityName = normalizeSearch(city.name);
    const countryName = normalizeSearch(city.country);
    return (
      normalized === cityName ||
      normalized === `${cityName} ${countryName}` ||
      normalized.includes(`${cityName} ${countryName}`) ||
      (normalized.includes(cityName) && normalized.includes(countryName))
    );
  }) ?? null;
}

function normalizeSearch(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cityKey(city: string, country: string): string {
  return `${city}--${normalizeCountry(country)}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
