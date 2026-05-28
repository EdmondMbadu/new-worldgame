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
    { city: 'Las Vegas', region: 'NV', country: 'United States', label: 'Las Vegas, NV, United States', aliases: ['vegas'] },
    { city: 'Phoenix', region: 'AZ', country: 'United States', label: 'Phoenix, AZ, United States' },
    { city: 'Portland', region: 'OR', country: 'United States', label: 'Portland, OR, United States' },
    { city: 'Minneapolis', region: 'MN', country: 'United States', label: 'Minneapolis, MN, United States' },
    { city: 'Detroit', region: 'MI', country: 'United States', label: 'Detroit, MI, United States' },
    { city: 'Houston', region: 'TX', country: 'United States', label: 'Houston, TX, United States' },
    { city: 'Dallas', region: 'TX', country: 'United States', label: 'Dallas, TX, United States' },
    { city: 'San Diego', region: 'CA', country: 'United States', label: 'San Diego, CA, United States' },
    { city: 'San Jose', region: 'CA', country: 'United States', label: 'San Jose, CA, United States' },
    { city: 'Pittsburgh', region: 'PA', country: 'United States', label: 'Pittsburgh, PA, United States' },
    { city: 'Baltimore', region: 'MD', country: 'United States', label: 'Baltimore, MD, United States' },
    { city: 'Charlotte', region: 'NC', country: 'United States', label: 'Charlotte, NC, United States' },
    { city: 'New Orleans', region: 'LA', country: 'United States', label: 'New Orleans, LA, United States' },
    { city: 'Nashville', region: 'TN', country: 'United States', label: 'Nashville, TN, United States' },
    { city: 'Columbus', region: 'OH', country: 'United States', label: 'Columbus, OH, United States' },
    { city: 'Cleveland', region: 'OH', country: 'United States', label: 'Cleveland, OH, United States' },
    { city: 'Austin', region: 'TX', country: 'United States', label: 'Austin, TX, United States' },
    { city: 'Denver', region: 'CO', country: 'United States', label: 'Denver, CO, United States' },
    { city: 'Montreal', region: 'QC', country: 'Canada', label: 'Montreal, QC, Canada' },
    { city: 'Toronto', region: 'ON', country: 'Canada', label: 'Toronto, ON, Canada' },
    { city: 'Vancouver', region: 'BC', country: 'Canada', label: 'Vancouver, BC, Canada' },
    { city: 'Ottawa', region: 'ON', country: 'Canada', label: 'Ottawa, ON, Canada' },
    { city: 'Calgary', region: 'AB', country: 'Canada', label: 'Calgary, AB, Canada' },
    { city: 'London', region: 'England', country: 'United Kingdom', label: 'London, England, United Kingdom' },
    { city: 'Manchester', region: 'England', country: 'United Kingdom', label: 'Manchester, England, United Kingdom' },
    { city: 'Birmingham', region: 'England', country: 'United Kingdom', label: 'Birmingham, England, United Kingdom' },
    { city: 'Edinburgh', region: 'Scotland', country: 'United Kingdom', label: 'Edinburgh, Scotland, United Kingdom' },
    { city: 'Paris', region: 'Ile-de-France', country: 'France', label: 'Paris, Ile-de-France, France' },
    { city: 'Lyon', region: 'Auvergne-Rhone-Alpes', country: 'France', label: 'Lyon, France' },
    { city: 'Marseille', region: 'Provence-Alpes-Cote d Azur', country: 'France', label: 'Marseille, France' },
    { city: 'Berlin', region: 'Berlin', country: 'Germany', label: 'Berlin, Germany' },
    { city: 'Munich', region: 'Bavaria', country: 'Germany', label: 'Munich, Bavaria, Germany' },
    { city: 'Hamburg', region: 'Hamburg', country: 'Germany', label: 'Hamburg, Germany' },
    { city: 'Amsterdam', region: 'North Holland', country: 'Netherlands', label: 'Amsterdam, North Holland, Netherlands' },
    { city: 'Rotterdam', region: 'South Holland', country: 'Netherlands', label: 'Rotterdam, Netherlands' },
    { city: 'Brussels', region: 'Brussels', country: 'Belgium', label: 'Brussels, Belgium' },
    { city: 'Madrid', region: 'Madrid', country: 'Spain', label: 'Madrid, Spain' },
    { city: 'Barcelona', region: 'Catalonia', country: 'Spain', label: 'Barcelona, Catalonia, Spain' },
    { city: 'Rome', region: 'Lazio', country: 'Italy', label: 'Rome, Italy' },
    { city: 'Milan', region: 'Lombardy', country: 'Italy', label: 'Milan, Lombardy, Italy' },
    { city: 'Zurich', region: 'Zurich', country: 'Switzerland', label: 'Zurich, Switzerland' },
    { city: 'Geneva', region: 'Geneva', country: 'Switzerland', label: 'Geneva, Switzerland' },
    { city: 'Stockholm', region: 'Stockholm', country: 'Sweden', label: 'Stockholm, Sweden' },
    { city: 'Copenhagen', region: 'Capital Region', country: 'Denmark', label: 'Copenhagen, Denmark' },
    { city: 'Oslo', region: 'Oslo', country: 'Norway', label: 'Oslo, Norway' },
    { city: 'Helsinki', region: 'Uusimaa', country: 'Finland', label: 'Helsinki, Finland' },
    { city: 'Dublin', region: 'Leinster', country: 'Ireland', label: 'Dublin, Ireland' },
    { city: 'Vienna', region: 'Vienna', country: 'Austria', label: 'Vienna, Austria' },
    { city: 'Warsaw', region: 'Masovian', country: 'Poland', label: 'Warsaw, Poland' },
    { city: 'Prague', region: 'Prague', country: 'Czechia', label: 'Prague, Czechia' },
    { city: 'Lisbon', region: 'Lisbon', country: 'Portugal', label: 'Lisbon, Portugal' },
    { city: 'Istanbul', region: 'Istanbul', country: 'Turkiye', label: 'Istanbul, Turkiye', aliases: ['istanbul turkey'] },
    { city: 'Lagos', region: 'Lagos', country: 'Nigeria', label: 'Lagos, Nigeria' },
    { city: 'Abuja', region: 'Federal Capital Territory', country: 'Nigeria', label: 'Abuja, Nigeria' },
    { city: 'Nairobi', region: 'Nairobi County', country: 'Kenya', label: 'Nairobi, Kenya' },
    { city: 'Mombasa', region: 'Mombasa County', country: 'Kenya', label: 'Mombasa, Kenya' },
    { city: 'Cape Town', region: 'Western Cape', country: 'South Africa', label: 'Cape Town, Western Cape, South Africa' },
    { city: 'Johannesburg', region: 'Gauteng', country: 'South Africa', label: 'Johannesburg, Gauteng, South Africa' },
    { city: 'Pretoria', region: 'Gauteng', country: 'South Africa', label: 'Pretoria, Gauteng, South Africa' },
    { city: 'Accra', region: 'Greater Accra', country: 'Ghana', label: 'Accra, Ghana' },
    { city: 'Kumasi', region: 'Ashanti', country: 'Ghana', label: 'Kumasi, Ghana' },
    { city: 'Kinshasa', region: 'Kinshasa', country: 'Democratic Republic of the Congo', label: 'Kinshasa, DR Congo', aliases: ['kinshasa drc', 'kinshasa congo', 'kinshasa democratic republic of congo'] },
    { city: 'Lubumbashi', region: 'Haut-Katanga', country: 'Democratic Republic of the Congo', label: 'Lubumbashi, DR Congo', aliases: ['lubumbashi drc'] },
    { city: 'Kampala', region: 'Central Region', country: 'Uganda', label: 'Kampala, Uganda' },
    { city: 'Kigali', region: 'Kigali', country: 'Rwanda', label: 'Kigali, Rwanda' },
    { city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia', label: 'Addis Ababa, Ethiopia' },
    { city: 'Dakar', region: 'Dakar', country: 'Senegal', label: 'Dakar, Senegal' },
    { city: 'Abidjan', region: 'Abidjan', country: 'Cote d Ivoire', label: 'Abidjan, Cote d Ivoire', aliases: ['abidjan ivory coast'] },
    { city: 'Cairo', region: 'Cairo', country: 'Egypt', label: 'Cairo, Egypt' },
    { city: 'Casablanca', region: 'Casablanca-Settat', country: 'Morocco', label: 'Casablanca, Morocco' },
    { city: 'Tunis', region: 'Tunis', country: 'Tunisia', label: 'Tunis, Tunisia' },
    { city: 'Rabat', region: 'Rabat-Sale-Kenitra', country: 'Morocco', label: 'Rabat, Morocco' },
    { city: 'Mumbai', region: 'Maharashtra', country: 'India', label: 'Mumbai, Maharashtra, India' },
    { city: 'Delhi', region: 'Delhi', country: 'India', label: 'Delhi, India' },
    { city: 'Bengaluru', region: 'Karnataka', country: 'India', label: 'Bengaluru, Karnataka, India', aliases: ['bangalore'] },
    { city: 'Hyderabad', region: 'Telangana', country: 'India', label: 'Hyderabad, Telangana, India' },
    { city: 'Chennai', region: 'Tamil Nadu', country: 'India', label: 'Chennai, Tamil Nadu, India' },
    { city: 'Pune', region: 'Maharashtra', country: 'India', label: 'Pune, Maharashtra, India' },
    { city: 'Kolkata', region: 'West Bengal', country: 'India', label: 'Kolkata, West Bengal, India' },
    { city: 'Ahmedabad', region: 'Gujarat', country: 'India', label: 'Ahmedabad, Gujarat, India' },
    { city: 'Karachi', region: 'Sindh', country: 'Pakistan', label: 'Karachi, Pakistan' },
    { city: 'Lahore', region: 'Punjab', country: 'Pakistan', label: 'Lahore, Pakistan' },
    { city: 'Islamabad', region: 'Islamabad Capital Territory', country: 'Pakistan', label: 'Islamabad, Pakistan' },
    { city: 'Dhaka', region: 'Dhaka', country: 'Bangladesh', label: 'Dhaka, Bangladesh' },
    { city: 'Colombo', region: 'Western Province', country: 'Sri Lanka', label: 'Colombo, Sri Lanka' },
    { city: 'Kathmandu', region: 'Bagmati', country: 'Nepal', label: 'Kathmandu, Nepal' },
    { city: 'Singapore', region: '', country: 'Singapore', label: 'Singapore' },
    { city: 'Tokyo', region: 'Tokyo', country: 'Japan', label: 'Tokyo, Japan' },
    { city: 'Osaka', region: 'Osaka', country: 'Japan', label: 'Osaka, Japan' },
    { city: 'Seoul', region: 'Seoul', country: 'South Korea', label: 'Seoul, South Korea' },
    { city: 'Beijing', region: 'Beijing', country: 'China', label: 'Beijing, China' },
    { city: 'Shanghai', region: 'Shanghai', country: 'China', label: 'Shanghai, China' },
    { city: 'Shenzhen', region: 'Guangdong', country: 'China', label: 'Shenzhen, Guangdong, China' },
    { city: 'Hong Kong', region: 'Hong Kong', country: 'China', label: 'Hong Kong, China' },
    { city: 'Taipei', region: 'Taipei', country: 'Taiwan', label: 'Taipei, Taiwan' },
    { city: 'Bangkok', region: 'Bangkok', country: 'Thailand', label: 'Bangkok, Thailand' },
    { city: 'Jakarta', region: 'Jakarta', country: 'Indonesia', label: 'Jakarta, Indonesia' },
    { city: 'Kuala Lumpur', region: 'Kuala Lumpur', country: 'Malaysia', label: 'Kuala Lumpur, Malaysia' },
    { city: 'Manila', region: 'Metro Manila', country: 'Philippines', label: 'Manila, Philippines' },
    { city: 'Ho Chi Minh City', region: 'Ho Chi Minh City', country: 'Vietnam', label: 'Ho Chi Minh City, Vietnam', aliases: ['saigon'] },
    { city: 'Hanoi', region: 'Hanoi', country: 'Vietnam', label: 'Hanoi, Vietnam' },
    { city: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', label: 'Dubai, United Arab Emirates', aliases: ['dubai uae'] },
    { city: 'Abu Dhabi', region: 'Abu Dhabi', country: 'United Arab Emirates', label: 'Abu Dhabi, United Arab Emirates', aliases: ['abu dhabi uae'] },
    { city: 'Doha', region: 'Doha', country: 'Qatar', label: 'Doha, Qatar' },
    { city: 'Riyadh', region: 'Riyadh', country: 'Saudi Arabia', label: 'Riyadh, Saudi Arabia' },
    { city: 'Jeddah', region: 'Makkah', country: 'Saudi Arabia', label: 'Jeddah, Saudi Arabia' },
    { city: 'Tel Aviv', region: 'Tel Aviv', country: 'Israel', label: 'Tel Aviv, Israel' },
    { city: 'Jerusalem', region: 'Jerusalem', country: 'Israel', label: 'Jerusalem, Israel' },
    { city: 'Amman', region: 'Amman', country: 'Jordan', label: 'Amman, Jordan' },
    { city: 'Beirut', region: 'Beirut', country: 'Lebanon', label: 'Beirut, Lebanon' },
    { city: 'Sydney', region: 'NSW', country: 'Australia', label: 'Sydney, NSW, Australia' },
    { city: 'Melbourne', region: 'VIC', country: 'Australia', label: 'Melbourne, VIC, Australia' },
    { city: 'Brisbane', region: 'QLD', country: 'Australia', label: 'Brisbane, QLD, Australia' },
    { city: 'Perth', region: 'WA', country: 'Australia', label: 'Perth, WA, Australia' },
    { city: 'Auckland', region: 'Auckland', country: 'New Zealand', label: 'Auckland, New Zealand' },
    { city: 'Wellington', region: 'Wellington', country: 'New Zealand', label: 'Wellington, New Zealand' },
    { city: 'Mexico City', region: 'CDMX', country: 'Mexico', label: 'Mexico City, CDMX, Mexico' },
    { city: 'Guadalajara', region: 'Jalisco', country: 'Mexico', label: 'Guadalajara, Jalisco, Mexico' },
    { city: 'Monterrey', region: 'Nuevo Leon', country: 'Mexico', label: 'Monterrey, Nuevo Leon, Mexico' },
    { city: 'Sao Paulo', region: 'Sao Paulo', country: 'Brazil', label: 'Sao Paulo, Brazil', aliases: ['são paulo'] },
    { city: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'Brazil', label: 'Rio de Janeiro, Brazil' },
    { city: 'Brasilia', region: 'Federal District', country: 'Brazil', label: 'Brasilia, Brazil' },
    { city: 'Buenos Aires', region: 'Buenos Aires', country: 'Argentina', label: 'Buenos Aires, Argentina' },
    { city: 'Santiago', region: 'Santiago Metropolitan', country: 'Chile', label: 'Santiago, Chile' },
    { city: 'Lima', region: 'Lima', country: 'Peru', label: 'Lima, Peru' },
    { city: 'Bogota', region: 'Bogota', country: 'Colombia', label: 'Bogota, Colombia', aliases: ['bogotá'] },
    { city: 'Medellin', region: 'Antioquia', country: 'Colombia', label: 'Medellin, Antioquia, Colombia', aliases: ['medellín'] },
    { city: 'Quito', region: 'Pichincha', country: 'Ecuador', label: 'Quito, Ecuador' },
    { city: 'Guayaquil', region: 'Guayas', country: 'Ecuador', label: 'Guayaquil, Ecuador' },
    { city: 'Caracas', region: 'Capital District', country: 'Venezuela', label: 'Caracas, Venezuela' },
    { city: 'Montevideo', region: 'Montevideo', country: 'Uruguay', label: 'Montevideo, Uruguay' },
    { city: 'San Juan', region: 'PR', country: 'United States', label: 'San Juan, PR, United States' },
    { city: 'Kingston', region: 'Kingston', country: 'Jamaica', label: 'Kingston, Jamaica' },
    { city: 'Port of Spain', region: 'Port of Spain', country: 'Trinidad and Tobago', label: 'Port of Spain, Trinidad and Tobago' },
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
