import { Injectable } from '@angular/core';

export interface SlpPlace {
  city: string;
  region: string;
  country: string;
  label: string;
  aliases?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SlpPlaceService {
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

  private readonly places: SlpPlace[] = [
    { city: 'Philadelphia', region: 'PA', country: 'United States', label: 'Philadelphia, PA, United States', aliases: ['philly'] },
    { city: 'New York', region: 'NY', country: 'United States', label: 'New York, NY, United States', aliases: ['nyc'] },
    { city: 'Washington', region: 'DC', country: 'United States', label: 'Washington, DC, United States' },
    { city: 'Boston', region: 'MA', country: 'United States', label: 'Boston, MA, United States' },
    { city: 'Chicago', region: 'IL', country: 'United States', label: 'Chicago, IL, United States' },
    { city: 'Los Angeles', region: 'CA', country: 'United States', label: 'Los Angeles, CA, United States', aliases: ['la'] },
    { city: 'San Francisco', region: 'CA', country: 'United States', label: 'San Francisco, CA, United States' },
    { city: 'Seattle', region: 'WA', country: 'United States', label: 'Seattle, WA, United States' },
    { city: 'Atlanta', region: 'GA', country: 'United States', label: 'Atlanta, GA, United States' },
    { city: 'Miami', region: 'FL', country: 'United States', label: 'Miami, FL, United States' },
    { city: 'Austin', region: 'TX', country: 'United States', label: 'Austin, TX, United States' },
    { city: 'Denver', region: 'CO', country: 'United States', label: 'Denver, CO, United States' },
    { city: 'Toronto', region: 'ON', country: 'Canada', label: 'Toronto, ON, Canada' },
    { city: 'Vancouver', region: 'BC', country: 'Canada', label: 'Vancouver, BC, Canada' },
    { city: 'London', region: 'England', country: 'United Kingdom', label: 'London, England, United Kingdom' },
    { city: 'Paris', region: 'Ile-de-France', country: 'France', label: 'Paris, Ile-de-France, France' },
    { city: 'Berlin', region: 'Berlin', country: 'Germany', label: 'Berlin, Germany' },
    { city: 'Amsterdam', region: 'North Holland', country: 'Netherlands', label: 'Amsterdam, North Holland, Netherlands' },
    { city: 'Lagos', region: 'Lagos', country: 'Nigeria', label: 'Lagos, Nigeria' },
    { city: 'Nairobi', region: 'Nairobi County', country: 'Kenya', label: 'Nairobi, Kenya' },
    { city: 'Cape Town', region: 'Western Cape', country: 'South Africa', label: 'Cape Town, Western Cape, South Africa' },
    { city: 'Accra', region: 'Greater Accra', country: 'Ghana', label: 'Accra, Ghana' },
    { city: 'Mumbai', region: 'Maharashtra', country: 'India', label: 'Mumbai, Maharashtra, India' },
    { city: 'Delhi', region: 'Delhi', country: 'India', label: 'Delhi, India' },
    { city: 'Bengaluru', region: 'Karnataka', country: 'India', label: 'Bengaluru, Karnataka, India', aliases: ['bangalore'] },
    { city: 'Singapore', region: '', country: 'Singapore', label: 'Singapore' },
    { city: 'Tokyo', region: 'Tokyo', country: 'Japan', label: 'Tokyo, Japan' },
    { city: 'Sydney', region: 'NSW', country: 'Australia', label: 'Sydney, NSW, Australia' },
    { city: 'Melbourne', region: 'VIC', country: 'Australia', label: 'Melbourne, VIC, Australia' },
    { city: 'Mexico City', region: 'CDMX', country: 'Mexico', label: 'Mexico City, CDMX, Mexico' },
    { city: 'Sao Paulo', region: 'Sao Paulo', country: 'Brazil', label: 'Sao Paulo, Brazil', aliases: ['são paulo'] },
    { city: 'Buenos Aires', region: 'Buenos Aires', country: 'Argentina', label: 'Buenos Aires, Argentina' },
  ];

  search(query: string, limit = 7): SlpPlace[] {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) {
      return this.places.slice(0, limit);
    }

    return this.places
      .map((place) => ({
        place,
        score: this.scorePlace(place, normalizedQuery),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.place);
  }

  parse(value: string): SlpPlace | null {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const exact = this.search(raw, 1)[0];
    if (exact && this.normalize(exact.label) === this.normalize(raw)) {
      return exact;
    }

    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const city = parts[0];
      const last = parts[parts.length - 1];
      const middle = parts.length > 2 ? parts.slice(1, -1).join(', ') : '';
      const normalized = this.normalizeLocationParts(city, middle, last);
      return this.toPlace(normalized.city, normalized.region, normalized.country);
    }

    const suggested = this.search(raw, 1)[0];
    return suggested || null;
  }

  normalizeLocationParts(
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

  format(city: string, region: string, country: string): string {
    return [city, region, country].filter(Boolean).join(', ');
  }

  private toPlace(city: string, region: string, country: string): SlpPlace {
    return {
      city,
      region,
      country,
      label: this.format(city, region, country),
    };
  }

  private scorePlace(place: SlpPlace, normalizedQuery: string): number {
    const candidates = [
      place.city,
      place.region,
      place.country,
      place.label,
      ...(place.aliases || []),
    ].map((value) => this.normalize(value));

    if (candidates.some((value) => value === normalizedQuery)) return 100;
    if (this.normalize(place.city).startsWith(normalizedQuery)) return 90;
    if (this.normalize(place.label).startsWith(normalizedQuery)) return 80;
    if (candidates.some((value) => value.includes(normalizedQuery))) return 60;
    return 0;
  }

  private normalize(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
