import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  Optional,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AIOption, DataService } from 'src/app/services/data.service';
import { AuthService } from 'src/app/services/auth.service';
import { AvatarRegistryService } from 'src/app/services/avatar-registry.service';
import { Subscription } from 'rxjs';

declare const L: any;

interface CountryMetrics {
  country: string;
  activeUsers: number;
  newUsers: number;
  engagedSessions: number;
  engagementRate: number;
  averageEngagementTime: number;
  eventCount: number;
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  'United States': { lat: 39.8283, lng: -98.5795 },
  Canada: { lat: 56.1304, lng: -106.3468 },
  Sweden: { lat: 60.1282, lng: 18.6435 },
  Ireland: { lat: 53.1424, lng: -7.6921 },
  Netherlands: { lat: 52.1326, lng: 5.2913 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  'United Kingdom': { lat: 55.3781, lng: -3.436 },
  Switzerland: { lat: 46.8182, lng: 8.2275 },
  Australia: { lat: -25.2744, lng: 133.7751 },
  China: { lat: 35.8617, lng: 104.1954 },
  Spain: { lat: 40.4637, lng: -3.7492 },
  France: { lat: 46.2276, lng: 2.2137 },
  India: { lat: 20.5937, lng: 78.9629 },
  Malaysia: { lat: 4.2105, lng: 101.9758 },
  Vietnam: { lat: 14.0583, lng: 108.2772 },
  Brazil: { lat: -14.235, lng: -51.9253 },
  Chile: { lat: -35.6751, lng: -71.543 },
  Colombia: { lat: 4.5709, lng: -74.2973 },
  'Congo - Kinshasa': { lat: -4.0383, lng: 21.7587 },
  Norway: { lat: 60.472, lng: 8.4689 },
  Pakistan: { lat: 30.3753, lng: 69.3451 },
  Poland: { lat: 51.9194, lng: 19.1451 },
  Portugal: { lat: 39.3999, lng: -8.2245 },
  Romania: { lat: 45.9432, lng: 24.9668 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
};

@Component({
  selector: 'app-landing-test',
  templateUrl: './landing-test.component.html',
  styleUrls: ['./landing-test.component.css'],
})
export class LandingTestComponent implements OnInit, OnDestroy, AfterViewInit {
  playersCount = 0;
  teamsCount = 0;
  solutionsCount = 0;
  aiOptions: AIOption[] = [];
  private rafId?: number;
  countryStats: CountryMetrics[] = [];
  totalActiveUsers = 0;
  totalCountries = 0;
  totalNewUsers = 0;
  totalEngagedSessions = 0;
  private csvSub?: Subscription;
  private mapInstance?: any;
  private markersLayer?: any;

  constructor(
    private data: DataService,
    private router: Router,
    private http: HttpClient,
    @Optional() private auth?: AuthService,
    @Optional() private avatars?: AvatarRegistryService
  ) {}
  ngOnInit(): void {
    // Animate counters to friendly demo targets.
    this.animateCount('playersCount', 1280, 900);
    this.animateCount('teamsCount', 86, 700);
    this.animateCount('solutionsCount', 312, 650);
    this.aiOptions = this.data.aiOptions;
    this.loadCountryMetrics();
  }

  ngAfterViewInit(): void {
    this.renderMap();
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.csvSub?.unsubscribe();
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = undefined;
    }
  }
  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  openAvatar(ai: AIOption) {
    const slug = this.slugify(ai.name);
    const destination = `/avatar/${slug}`;

    if (!this.auth?.currentUser?.uid) {
      this.auth?.setRedirectUrl(destination);
      sessionStorage.setItem('redirectTo', destination);
    }

    const avatarState = this.avatars?.getBySlug(slug) ?? ai;
    this.router.navigate(['/avatar', slug], { state: { avatar: avatarState } });
  }

  private animateCount(
    prop: 'playersCount' | 'teamsCount' | 'solutionsCount',
    target: number,
    duration = 800
  ) {
    const start = performance.now();
    const initial = (this as any)[prop] as number;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      (this as any)[prop] = Math.round(initial + (target - initial) * eased);
      if (p < 1) this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private loadCountryMetrics() {
    this.csvSub = this.http
      .get('assets/files/Demographic_details_Country.csv', {
        responseType: 'text',
      })
      .subscribe({
        next: (csv) => {
          this.countryStats = this.parseCsv(csv);
          this.totalActiveUsers = this.countryStats.reduce(
            (sum, item) => sum + item.activeUsers,
            0
          );
          this.totalNewUsers = this.countryStats.reduce(
            (sum, item) => sum + item.newUsers,
            0
          );
          this.totalEngagedSessions = this.countryStats.reduce(
            (sum, item) => sum + item.engagedSessions,
            0
          );
          this.totalCountries = this.countryStats.length;
          this.renderMap();
        },
        error: () => {
          this.countryStats = [];
        },
      });
  }

  private parseCsv(csv: string): CountryMetrics[] {
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => !!line);

    const headerIndex = lines.findIndex((line) => !line.startsWith('#'));
    if (headerIndex === -1) return [];
    const headers = lines[headerIndex].split(',');
    const countryIdx = headers.indexOf('Country');
    const activeIdx = headers.indexOf('Active users');
    const newIdx = headers.indexOf('New users');
    const engagedIdx = headers.indexOf('Engaged sessions');
    const rateIdx = headers.indexOf('Engagement rate');
    const timeIdx = headers.indexOf('Average engagement time per active user');
    const eventsIdx = headers.indexOf('Event count');

    if (
      countryIdx === -1 ||
      activeIdx === -1 ||
      newIdx === -1 ||
      engagedIdx === -1 ||
      rateIdx === -1 ||
      timeIdx === -1 ||
      eventsIdx === -1
    ) {
      return [];
    }

    const stats: CountryMetrics[] = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#')) continue;
      const cols = line.split(',');
      const country = cols[countryIdx]?.trim();
      if (!country || country === '(not set)') continue;

      stats.push({
        country,
        activeUsers: Number(cols[activeIdx] ?? 0) || 0,
        newUsers: Number(cols[newIdx] ?? 0) || 0,
        engagedSessions: Number(cols[engagedIdx] ?? 0) || 0,
        engagementRate: Number(cols[rateIdx] ?? 0) || 0,
        averageEngagementTime: Number(cols[timeIdx] ?? 0) || 0,
        eventCount: Number(cols[eventsIdx] ?? 0) || 0,
      });
    }

    return stats;
  }

  private renderMap() {
    if (!this.countryStats.length) return;
    const container = document.getElementById('demographicMap');
    if (!container) return;
    if (typeof L === 'undefined') {
      setTimeout(() => this.renderMap(), 250);
      return;
    }

    if (!this.mapInstance) {
      this.mapInstance = L.map(container, {
        scrollWheelZoom: false,
        worldCopyJump: true,
      }).setView([20, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 6,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.mapInstance);
    }

    if (this.markersLayer) {
      this.mapInstance.removeLayer(this.markersLayer);
    }

    const markers = this.countryStats
      .map((stat) => {
        const coords = COUNTRY_COORDS[stat.country];
        if (!coords) return null;
        const radius = Math.max(6, Math.sqrt(stat.activeUsers) * 1.8);
        const circle = L.circleMarker(coords, {
          radius,
          color: '#0f766e',
          weight: 1,
          fillColor: '#14b8a6',
          fillOpacity: 0.65,
        });
        circle.bindPopup(
          `<strong>${stat.country}</strong><br/>` +
            `${stat.activeUsers.toLocaleString()} active users<br/>` +
            `${stat.newUsers.toLocaleString()} new users<br/>` +
            `${stat.engagedSessions.toLocaleString()} engaged sessions`
        );
        return circle;
      })
      .filter((marker): marker is any => !!marker);

    if (!markers.length) return;

    this.markersLayer = L.featureGroup(markers).addTo(this.mapInstance);
    const bounds = this.markersLayer.getBounds();
    if (bounds.isValid()) {
      this.mapInstance.fitBounds(bounds, { padding: [30, 30] });
    }

    setTimeout(() => this.mapInstance.invalidateSize(), 150);
  }
}
