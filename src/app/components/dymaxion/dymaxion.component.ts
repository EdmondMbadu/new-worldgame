import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { geoPath } from 'd3-geo';
import { geoAirocean } from 'd3-geo-polygon';
import { feature as topojsonFeature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { DymaxionCityAdapter, WorldGameCity } from './dymaxion-city.adapter';

type RegionId =
  | 'north-america'
  | 'south-america'
  | 'europe'
  | 'africa'
  | 'asia'
  | 'oceania';

interface Region {
  id: RegionId;
  label: string;
}

interface Focus {
  id: string;
  label: string;
  region?: RegionId;
  box?: [number, number, number, number];
}

interface ProjectedCity extends WorldGameCity {
  region: RegionId;
  x: number;
  y: number;
}

interface MarkerEntry {
  c: ProjectedCity;
  b: HTMLButtonElement;
}

interface DymaxionCountry {
  id: string;
  name: string;
  key: string;
  d: string;
  box: [number, number, number, number];
  cities: ProjectedCity[];
  el: SVGPathElement | null;
}

interface ProjectionFrame {
  path: ReturnType<typeof geoPath>;
  transform: string;
  place(lng: number, lat: number): { x: number; y: number } | null;
  bounds(geometry: Feature<Geometry>): [number, number, number, number] | null;
}

interface PanState {
  pointerId: number;
  startX: number;
  startY: number;
  tx: number;
  ty: number;
  moved: boolean;
}

const REGIONS: Region[] = [
  { id: 'north-america', label: 'N. America' },
  { id: 'south-america', label: 'S. America' },
  { id: 'europe', label: 'Europe' },
  { id: 'africa', label: 'Africa' },
  { id: 'asia', label: 'Asia' },
  { id: 'oceania', label: 'Oceania' },
];

const SUB_FOCI: Focus[] = [
  { id: 'middle-east', label: 'Middle East', box: [27, 18, 39.5, 40] },
  { id: 'japan', label: 'Japan', box: [36.5, 65, 42, 77.5] },
  { id: 'us-east', label: 'US East Coast', box: [58.9, 39.2, 64.2, 43.2] },
];

const MAX_Z = 4.6;
const MAX_DRILL = 80;
const MAX_COUNTRY_Z = 8.2;
const PAD = 0.22;
const CLUSTER_TH = 28;
const MIN_CLUSTER_TH = 10;
const MAP_W = 1000;
const MAP_H = 475;
const SVG_NS = 'http://www.w3.org/2000/svg';
const COUNTRY_TOPOLOGY_URL = '/assets/maps/countries-50m.json';
const COUNTRY_ALIASES: Record<string, string> = {
  'czech-republic': 'czechia',
  'democratic-republic-of-the-congo': 'dem-rep-congo',
  drc: 'dem-rep-congo',
  usa: 'united-states-of-america',
  'united-states': 'united-states-of-america',
  'south-korea': 'south-korea',
  turkiye: 'turkey',
};

@Component({
  selector: 'app-dymaxion',
  templateUrl: './dymaxion.component.html',
  styleUrls: ['./dymaxion.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class DymaxionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('frame') frameRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('countryLayer') countryLayerRef!: ElementRef<SVGSVGElement>;
  @ViewChild('clusterLayer') clusterLayerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('picker') pickerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('zoomout') zoomoutRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('hint') hintRef!: ElementRef<HTMLDivElement>;

  readonly isMapLoading = signal(true);
  readonly cityDataLoading = signal(true);
  readonly cityCount = signal(0);
  readonly playerCount = signal(0);
  readonly shownCityCount = signal(0);
  readonly shownPlayerCount = signal(0);
  readonly foci = signal<Focus[]>([{ id: 'all', label: 'World' }]);
  readonly activeFocus = signal('all');
  readonly searchValue = signal('');
  readonly selected = signal<ProjectedCity | null>(null);
  readonly selectedCountry = signal<DymaxionCountry | null>(null);

  private cities: ProjectedCity[] = [];
  private countries: DymaxionCountry[] = [];
  private countriesByKey = new Map<string, DymaxionCountry>();
  private countryLayerTransform = '';
  private projectionFrame: ProjectionFrame | null = null;
  private markerEls: MarkerEntry[] = [];
  private view = { z: 1, tx: 0, ty: 0 };
  private panState: PanState | null = null;
  private suppressMapClick = false;
  private query = '';
  private viewReady = false;
  private viewInited = false;
  private dataReady = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly isBrowser: boolean;

  private readonly onResize = () => {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.applyFilter(), 150);
  };
  private readonly onDocClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.dym-picker, .cluster, .marker, .dym-selected-card')) {
      this.closePicker();
    }
  };
  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.closePicker();
      this.clearSelected();
    }
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.panState || !this.viewReady || event.pointerId !== this.panState.pointerId) {
      return;
    }

    const frame = this.frameRef.nativeElement;
    if (Math.hypot(event.clientX - this.panState.startX, event.clientY - this.panState.startY) > 3) {
      this.panState.moved = true;
      event.preventDefault();
    }

    const dx = (event.clientX - this.panState.startX) / frame.clientWidth;
    const dy = (event.clientY - this.panState.startY) / frame.clientHeight;
    this.setView(this.view.z, this.panState.tx + dx, this.panState.ty + dy);
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    if (!this.panState || event.pointerId !== this.panState.pointerId) return;
    const moved = this.panState.moved;
    this.panState = null;
    if (moved) {
      this.suppressMapClick = true;
      window.setTimeout(() => {
        this.suppressMapClick = false;
      }, 250);
    }
    this.applyView();
  };

  constructor(
    private cityAdapter: DymaxionCityAdapter,
    @Inject(PLATFORM_ID)
    platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.isMapLoading.set(false);
      this.cityDataLoading.set(false);
      return;
    }

    void this.loadCountries();
    this.isMapLoading.set(false);
    this.dataReady = true;
    this.tryInitMap();
    void this.loadCities();
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.viewInited = true;
    this.tryInitMap();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onKeydown);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onKeydown);
  }

  async loadCities(): Promise<void> {
    this.cityDataLoading.set(true);
    const rawCities = await this.cityAdapter.loadCities();
    this.cities = this.projectCities(rawCities);
    this.cityCount.set(this.cities.length);
    this.playerCount.set(this.totalUsers(this.cities));
    this.refreshFoci();
    this.attachCitiesToCountries();
    this.renderCountryLayer();
    if (this.viewReady) this.rebuildMarkers();
    this.cityDataLoading.set(false);
  }

  private projectCities(cities: WorldGameCity[]): ProjectedCity[] {
    const frame = this.createProjectionFrame();
    return cities
      .map((city): ProjectedCity | null => {
        const pos = frame.place(city.lng, city.lat);
        if (!pos) return null;
        return {
          ...city,
          region: this.bucketRegion(city.lat, city.lng),
          x: pos.x,
          y: pos.y,
        };
      })
      .filter((city): city is ProjectedCity => !!city)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async loadCountries(): Promise<void> {
    try {
      const response = await fetch(COUNTRY_TOPOLOGY_URL);
      if (!response.ok) throw new Error(`Country topology request failed: ${response.status}`);

      const topology = await response.json() as { objects?: Record<string, unknown> };
      const countriesObject = topology.objects?.['countries'];
      if (!countriesObject) throw new Error('Country topology is missing countries object.');

      const converted = topojsonFeature(topology as any, countriesObject as any) as unknown;
      if ((converted as { type?: string }).type !== 'FeatureCollection') return;

      const collection = converted as FeatureCollection<Geometry, { name?: string }>;
      const frame = this.createProjectionFrame();
      this.countryLayerTransform = frame.transform;
      this.countries = collection.features
        .map((country, index): DymaxionCountry | null => {
          const name = country.properties?.name?.trim();
          if (!name) return null;
          const d = frame.path(country) ?? '';
          const box = frame.bounds(country);
          if (!d || !box) return null;
          return {
            id: `${country.id ?? index}`,
            name,
            key: countryKey(name),
            d,
            box,
            cities: [],
            el: null,
          };
        })
        .filter((country): country is DymaxionCountry => !!country);
      this.countriesByKey = new Map(this.countries.map((country) => [country.key, country]));
      this.attachCitiesToCountries();
      this.renderCountryLayer();
      this.applyFilter();
    } catch {
      this.countries = [];
      this.countriesByKey.clear();
    }
  }

  private createProjectionFrame(): ProjectionFrame {
    if (this.projectionFrame) return this.projectionFrame;

    const projection = geoAirocean();
    const path = geoPath(projection);
    const [[bx0, by0], [bx1, by1]] = path.bounds({ type: 'Sphere' });
    const sx = MAP_W / (bx1 - bx0);
    const sy = MAP_H / (by1 - by0);
    const toPercent = ([px, py]: [number, number]) => ({
      x: (((px - bx0) * sx) / MAP_W) * 100,
      y: (((py - by0) * sy) / MAP_H) * 100,
    });

    this.projectionFrame = {
      path,
      transform: `matrix(${sx} 0 0 ${sy} ${-bx0 * sx} ${-by0 * sy})`,
      place: (lng: number, lat: number) => {
        const projected = projection([lng, lat]);
        if (!projected) return null;
        return toPercent(projected as [number, number]);
      },
      bounds: (geometry: Feature<Geometry>) => {
        const [[x0, y0], [x1, y1]] = path.bounds(geometry);
        if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
        const p0 = toPercent([x0, y0]);
        const p1 = toPercent([x1, y1]);
        return [p0.x, p0.y, p1.x, p1.y];
      },
    };
    return this.projectionFrame;
  }

  private bucketRegion(lat: number, lng: number): RegionId {
    if (lng < -30 && lat >= 8) return 'north-america';
    if (lng < -30) return 'south-america';
    if (lng >= 110 && lat < -10) return 'oceania';
    if (lng >= -25 && lng <= 60 && lat >= 35) return 'europe';
    if (lng >= -25 && lng <= 60 && lat < 35 && lat > -36) return 'africa';
    if (lng >= 110 && lat < 0) return 'oceania';
    return 'asia';
  }

  private attachCitiesToCountries(): void {
    this.countries.forEach((country) => {
      country.cities = [];
    });

    for (const city of this.cities) {
      const country = this.countriesByKey.get(countryKey(city.country));
      if (country) country.cities.push(city);
    }

    this.countries.forEach((country) => {
      country.cities.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  private tryInitMap(): void {
    if (this.viewReady || !this.viewInited || !this.dataReady) return;
    this.renderCountryLayer();
    this.viewReady = true;
    this.rebuildMarkers();
  }

  private rebuildMarkers(): void {
    if (!this.canvasRef || !this.clusterLayerRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.markerEls.forEach(({ b }) => b.remove());
    this.clusterLayerRef.nativeElement.innerHTML = '';

    this.markerEls = this.cities.map((c, i) => {
      const b = document.createElement('button');
      b.className = 'marker';
      b.type = 'button';
      b.style.left = `${c.x}%`;
      b.style.top = `${c.y}%`;
      b.style.animationDelay = `${i * 16}ms`;
      b.style.setProperty('--marker-size', `${this.markerSize(c.userCount)}px`);
      b.setAttribute('aria-label', `${c.name}, ${c.country}, ${formatPlayers(c.userCount)}`);
      b.innerHTML =
        `<span class="ring"></span><span class="dot"></span>` +
        `<span class="marker-count">${formatCompact(c.userCount)}</span>` +
        `<span class="label"><b>${escapeHtml(c.name)}</b>` +
        `<span class="lc">${escapeHtml(c.country)} · ${formatPlayers(c.userCount)}</span></span>`;
      b.addEventListener('click', (event) => {
        event.stopPropagation();
        this.selectCity(c, b);
      });
      canvas.appendChild(b);
      return { c, b };
    });

    this.applyFilter();
  }

  private markerSize(userCount: number): number {
    return Math.max(22, Math.min(42, 20 + Math.sqrt(userCount) * 2.15));
  }

  zoomBy(factor: number): void {
    if (!this.viewReady) return;
    this.zoomAt(0.5, 0.5, factor);
  }

  onMapWheel(event: WheelEvent): void {
    if (!this.viewReady) return;
    event.preventDefault();
    if (this.view.z > 1.01 && Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.15) {
      const frame = this.frameRef.nativeElement;
      this.setView(
        this.view.z,
        this.view.tx - event.deltaX / frame.clientWidth,
        this.view.ty - event.deltaY / frame.clientHeight,
      );
      this.closePicker();
      return;
    }

    const rect = this.frameRef.nativeElement.getBoundingClientRect();
    const sx = this.clamp01((event.clientX - rect.left) / rect.width);
    const sy = this.clamp01((event.clientY - rect.top) / rect.height);
    this.zoomAt(sx, sy, Math.exp(-event.deltaY * 0.0014));
  }

  onMapPointerDown(event: PointerEvent): void {
    if (!this.viewReady || this.view.z <= 1.01 || event.button !== 0) return;
    const target = event.target as Element | null;
    if (target?.closest('button, a, input, .marker, .cluster, .dym-picker, .dym-selected-card, .dym-zoom-controls')) {
      return;
    }

    this.closePicker();
    this.panState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      tx: this.view.tx,
      ty: this.view.ty,
      moved: false,
    };
    this.frameRef.nativeElement.setPointerCapture?.(event.pointerId);
    if (target?.closest('.country-shape')) event.preventDefault();
    this.applyView();
  }

  private zoomAt(sx: number, sy: number, factor: number): void {
    const z = Math.max(1, Math.min(MAX_DRILL, this.view.z * factor));
    const wx = (sx - this.view.tx) / this.view.z;
    const wy = (sy - this.view.ty) / this.view.z;
    this.setView(z, sx - wx * z, sy - wy * z);
    this.closePicker();
    if (this.hintRef) this.hintRef.nativeElement.style.opacity = '0';
    this.applyFilter();
  }

  private setView(z: number, tx: number, ty: number): void {
    const clampedZ = Math.max(1, Math.min(MAX_DRILL, z));
    const [clampedTx, clampedTy] = this.clampPan(clampedZ, tx, ty);
    this.view = { z: clampedZ, tx: clampedTx, ty: clampedTy };
    this.applyView();
  }

  private applyView(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.style.setProperty('--z', String(this.view.z));
    canvas.style.transform = `translate(${this.view.tx * 100}%, ${this.view.ty * 100}%) scale(${this.view.z})`;

    const frame = this.frameRef?.nativeElement;
    if (frame) {
      frame.classList.toggle('is-zoomed', this.view.z > 1.01);
      frame.classList.toggle('detail-mid', this.view.z >= 3);
      frame.classList.toggle('detail-deep', this.view.z >= 8);
      frame.classList.toggle('detail-labels', this.view.z >= 12);
      frame.classList.toggle('dragging', !!this.panState);
    }
    this.zoomoutRef?.nativeElement.classList.toggle('show', this.view.z > 1.01);
    this.scheduleAutoLabels();
  }

  private clampPan(z: number, tx: number, ty: number): [number, number] {
    if (z <= 1.01) return [0, 0];
    return [
      Math.min(0, Math.max(1 - z, tx)),
      Math.min(0, Math.max(1 - z, ty)),
    ];
  }

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private refreshFoci(): void {
    const regionsWithCities = REGIONS.filter((region) =>
      this.cities.some((city) => city.region === region.id),
    );
    this.foci.set([
      { id: 'all', label: 'World' },
      ...regionsWithCities.map((region) => ({
        id: region.id,
        label: region.label,
        region: region.id,
      })),
      ...SUB_FOCI,
    ]);
  }

  setFocus(f: Focus): void {
    if (this.activeFocus() === f.id && f.id !== 'all') {
      f = { id: 'all', label: 'World' };
    }
    this.activeFocus.set(f.id);
    this.selectedCountry.set(null);
    if (this.hintRef) this.hintRef.nativeElement.style.opacity = '0';
    if (!this.viewReady) return;
    if (f.id === 'all') this.resetZoom();
    else if (f.box) this.applyZoom(f.box);
    else if (f.region) this.applyZoom(this.regionBBox(f.region));
    this.applyFilter();
  }

  resetToWorld(): void {
    this.activeFocus.set('all');
    this.selectedCountry.set(null);
    this.resetZoom();
    this.applyFilter();
  }

  private resetZoom(): void {
    this.setView(1, 0, 0);
  }

  private regionBBox(region: RegionId): [number, number, number, number] {
    const points = this.cities.filter((city) => city.region === region);
    return [
      Math.min(...points.map((city) => city.x)),
      Math.min(...points.map((city) => city.y)),
      Math.max(...points.map((city) => city.x)),
      Math.max(...points.map((city) => city.y)),
    ];
  }

  private applyZoom(box: [number, number, number, number], cap = MAX_Z): void {
    let [x0, y0, x1, y1] = box.map((v) => v / 100) as [number, number, number, number];
    let bw = Math.max(0.0008, x1 - x0);
    let bh = Math.max(0.0008, y1 - y0);
    x0 -= bw * PAD;
    x1 += bw * PAD;
    y0 -= bh * PAD;
    y1 += bh * PAD;
    bw = x1 - x0;
    bh = y1 - y0;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const z = Math.max(1, Math.min(cap, Math.min(1 / bw, 1 / bh)));
    this.setView(z, 0.5 - cx * z, 0.5 - cy * z);
  }

  private inFocus(c: ProjectedCity): boolean {
    const selectedCountry = this.selectedCountry();
    if (selectedCountry && countryKey(c.country) !== selectedCountry.key) return false;

    const id = this.activeFocus();
    if (id === 'all') return true;
    const focus = this.foci().find((item) => item.id === id);
    if (!focus) return true;
    if (focus.region) return c.region === focus.region;
    if (focus.box) {
      const [x0, y0, x1, y1] = focus.box;
      return c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1;
    }
    return true;
  }

  private screenPos(c: ProjectedCity): { fx: number; fy: number } {
    return {
      fx: this.view.tx + (c.x / 100) * this.view.z,
      fy: this.view.ty + (c.y / 100) * this.view.z,
    };
  }

  private computeClusters(): { m: MarkerEntry; sx: number; sy: number }[][] {
    const frame = this.frameRef.nativeElement;
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const clusterThreshold = Math.max(
      MIN_CLUSTER_TH,
      CLUSTER_TH / Math.sqrt(Math.max(1, this.view.z)),
    );
    const items = this.markerEls
      .filter((m) => this.inFocus(m.c))
      .map((m) => {
        const { fx, fy } = this.screenPos(m.c);
        return { m, sx: fx * fw, sy: fy * fh };
      });
    const used = new Set<number>();
    const clusters: { m: MarkerEntry; sx: number; sy: number }[][] = [];

    if (this.query) {
      for (let i = 0; i < items.length; i++) {
        if (this.match(items[i].m.c)) {
          used.add(i);
          clusters.push([items[i]]);
        }
      }
    }

    for (let i = 0; i < items.length; i++) {
      if (used.has(i)) continue;
      used.add(i);
      const group = [items[i]];
      let cx = items[i].sx;
      let cy = items[i].sy;
      for (let j = 0; j < items.length; j++) {
        if (used.has(j)) continue;
        if (Math.hypot(items[j].sx - cx, items[j].sy - cy) < clusterThreshold) {
          used.add(j);
          group.push(items[j]);
          cx = group.reduce((sum, item) => sum + item.sx, 0) / group.length;
          cy = group.reduce((sum, item) => sum + item.sy, 0) / group.length;
        }
      }
      clusters.push(group);
    }
    return clusters;
  }

  private applyFilter(): void {
    if (!this.viewReady) return;
    this.closePicker();
    this.syncCountryLayerState();
    const clusterLayer = this.clusterLayerRef.nativeElement;
    clusterLayer.innerHTML = '';
    this.markerEls.forEach((m) => {
      const dim = !this.inFocus(m.c) || (!!this.query && !this.match(m.c));
      m.b.classList.toggle('dim', dim);
      m.b.classList.remove('clustered');
    });

    this.computeClusters().forEach((group) => {
      if (group.length <= 1) return;

      group.forEach((item) => item.m.b.classList.add('clustered'));
      const members = group.map((item) => item.m.c);
      const totalUsers = this.totalUsers(members);
      const cx = members.reduce((sum, city) => sum + city.x, 0) / members.length;
      const cy = members.reduce((sum, city) => sum + city.y, 0) / members.length;
      const pip = document.createElement('button');
      pip.className = 'cluster';
      pip.type = 'button';
      pip.style.left = `${cx}%`;
      pip.style.top = `${cy}%`;
      pip.innerHTML = `<span class="cnum">${formatCompact(totalUsers)}</span>`;
      pip.title = `${members.length} cities · ${formatPlayers(totalUsers)}`;
      pip.setAttribute('aria-label', `${members.length} cities, ${formatPlayers(totalUsers)}. Activate to zoom in.`);
      pip.addEventListener('click', (event) => {
        event.stopPropagation();
        this.clusterClick(members);
      });
      clusterLayer.appendChild(pip);
    });

    this.markerEls.forEach((m) => {
      const isMatch =
        !!this.query &&
        this.match(m.c) &&
        !m.b.classList.contains('clustered') &&
        this.inFocus(m.c);
      m.b.classList.toggle('hl', isMatch);
      m.b.classList.toggle('pinned', isMatch);
    });

    const shown = this.markerEls.filter((m) => this.inFocus(m.c)).map((m) => m.c);
    this.shownCityCount.set(shown.length);
    this.shownPlayerCount.set(this.totalUsers(shown));
    this.scheduleAutoLabels();
  }

  private match(c: ProjectedCity): boolean {
    return !this.query || `${c.name} ${c.country}`.toLowerCase().includes(this.query);
  }

  private clusterClick(members: ProjectedCity[]): void {
    const frame = this.frameRef.nativeElement;
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    let minPx = Number.POSITIVE_INFINITY;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const dx = ((members[i].x - members[j].x) / 100) * fw;
        const dy = ((members[i].y - members[j].y) / 100) * fh;
        minPx = Math.min(minPx, Math.hypot(dx, dy));
      }
    }

    const xs = members.map((city) => city.x);
    const ys = members.map((city) => city.y);
    const box: [number, number, number, number] = [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ];
    if (minPx > 0 && this.view.z < MAX_DRILL - 0.1) {
      this.applyZoom(box, MAX_DRILL);
      this.applyFilter();
      return;
    }

    this.openPicker(members);
  }

  private renderCountryLayer(): void {
    if (!this.countryLayerRef || this.countries.length === 0 || !this.countryLayerTransform) {
      return;
    }

    const layer = this.countryLayerRef.nativeElement;
    layer.innerHTML = '';
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', this.countryLayerTransform);

    for (const country of this.countries) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', country.d);
      path.setAttribute('class', 'country-shape');
      path.setAttribute('role', 'button');
      path.setAttribute('tabindex', '0');
      path.setAttribute(
        'aria-label',
        country.cities.length > 0
          ? `${country.name}, ${country.cities.length} cities, ${formatPlayers(this.totalUsers(country.cities))}`
          : `${country.name}, no players yet`,
      );
      path.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!this.suppressMapClick) this.selectCountry(country);
      });
      path.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.selectCountry(country);
        }
      });
      country.el = path;
      group.appendChild(path);
    }

    layer.appendChild(group);
    this.syncCountryLayerState();
  }

  private syncCountryLayerState(): void {
    const selectedCountry = this.selectedCountry();
    for (const country of this.countries) {
      if (!country.el) continue;
      const active = selectedCountry?.key === country.key;
      const populated = country.cities.length > 0;
      country.el.classList.toggle('active', active);
      country.el.classList.toggle('has-cities', populated);
      country.el.classList.toggle('muted', !!selectedCountry && !active);
    }
  }

  private selectCountry(country: DymaxionCountry): void {
    this.clearSelected();
    this.selectedCountry.set(country);
    this.activeFocus.set('all');
    this.applyZoom(country.box, MAX_COUNTRY_Z);
    if (this.hintRef) this.hintRef.nativeElement.style.opacity = '0';
    this.applyFilter();
  }

  private openPicker(members: ProjectedCity[]): void {
    const picker = this.pickerRef.nativeElement;
    const frame = this.frameRef.nativeElement;
    picker.innerHTML =
      `<div class="phead"><span>${members.length} cities · ${formatPlayers(this.totalUsers(members))}</span>` +
      `<button class="pclose" type="button" aria-label="Close">×</button></div>` +
      members
        .map(
          (city, i) =>
            `<button class="pitem" type="button" data-i="${i}">${escapeHtml(city.name)}` +
            `<span class="pc">${escapeHtml(city.country)} · ${formatPlayers(city.userCount)}</span></button>`,
        )
        .join('');
    const frameRect = frame.getBoundingClientRect();
    const stageRect = (frame.parentElement as HTMLElement).getBoundingClientRect();
    const cx = members.reduce((sum, city) => sum + city.x, 0) / members.length;
    const cy = members.reduce((sum, city) => sum + city.y, 0) / members.length;
    const sxFrac = this.view.tx + (cx / 100) * this.view.z;
    const syFrac = this.view.ty + (cy / 100) * this.view.z;
    let left = frameRect.left - stageRect.left + sxFrac * frameRect.width;
    const top = frameRect.top - stageRect.top + syFrac * frameRect.height + 16;
    left = Math.max(132, Math.min(stageRect.width - 132, left));
    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
    picker.classList.add('show');
    picker.querySelector('.pclose')?.addEventListener('click', () => this.closePicker());
    picker.querySelectorAll<HTMLButtonElement>('.pitem').forEach((btn) => {
      btn.addEventListener('click', () => {
        const city = members[Number(btn.dataset['i'])];
        const marker = this.markerEls.find((m) => m.c === city);
        this.closePicker();
        this.selectCity(city, marker ? marker.b : null);
      });
    });
  }

  private closePicker(): void {
    this.pickerRef?.nativeElement.classList.remove('show');
  }

  onSearch(value: string): void {
    this.searchValue.set(value);
    this.query = value.trim().toLowerCase();
    this.selectedCountry.set(null);

    if (!this.query) {
      this.activeFocus.set('all');
      if (this.viewReady) this.resetZoom();
      this.applyFilter();
      return;
    }

    if (this.activeFocus() !== 'all') this.activeFocus.set('all');
    const matches = this.cities.filter((city) => this.match(city));
    if (this.viewReady && matches.length > 0) {
      const target = matches[0];
      this.applyZoom([target.x, target.y, target.x, target.y], 3.4);
    } else if (this.viewReady) {
      this.resetZoom();
    }
    if (this.hintRef) this.hintRef.nativeElement.style.opacity = '0';
    this.applyFilter();
  }

  private selectCity(c: ProjectedCity, b: HTMLButtonElement | null): void {
    this.selected.set(c);
    this.selectedCountry.set(null);
    this.markerEls.forEach((m) => m.b.classList.toggle('sel', m.b === b));
    if (this.hintRef) this.hintRef.nativeElement.style.opacity = '0';
    this.scheduleAutoLabels();
  }

  clearSelected(): void {
    this.selected.set(null);
    this.markerEls.forEach((m) => m.b.classList.remove('sel'));
  }

  private scheduleAutoLabels(): void {
    if (!this.isBrowser || !this.viewReady) return;
    window.requestAnimationFrame(() => this.updateAutoLabels());
  }

  private updateAutoLabels(): void {
    if (!this.frameRef || !this.markerEls.length) return;
    this.markerEls.forEach((m) => m.b.classList.remove('auto-label'));
    if (this.view.z < 12) return;

    const frameRect = this.frameRef.nativeElement.getBoundingClientRect();
    const placed: DOMRect[] = [];
    const candidates = this.markerEls
      .filter((m) => {
        if (!this.inFocus(m.c)) return false;
        if (m.b.classList.contains('clustered') || m.b.classList.contains('dim')) return false;
        const markerRect = m.b.getBoundingClientRect();
        return (
          markerRect.right >= frameRect.left &&
          markerRect.left <= frameRect.right &&
          markerRect.bottom >= frameRect.top &&
          markerRect.top <= frameRect.bottom
        );
      })
      .sort((a, b) => {
        const aPinned = a.b.classList.contains('pinned') || a.b.classList.contains('sel');
        const bPinned = b.b.classList.contains('pinned') || b.b.classList.contains('sel');
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return b.c.userCount - a.c.userCount;
      });

    for (const candidate of candidates) {
      const label = candidate.b.querySelector<HTMLElement>('.label');
      if (!label) continue;
      const rect = label.getBoundingClientRect();
      const padded = new DOMRect(rect.x - 5, rect.y - 4, rect.width + 10, rect.height + 8);
      if (
        padded.left < frameRect.left + 6 ||
        padded.right > frameRect.right - 6 ||
        padded.top < frameRect.top + 6 ||
        padded.bottom > frameRect.bottom - 6
      ) {
        continue;
      }
      if (placed.some((r) => rectsOverlap(r, padded))) continue;
      candidate.b.classList.add('auto-label');
      placed.push(padded);
    }
  }

  private totalUsers(cities: Pick<ProjectedCity, 'userCount'>[]): number {
    return cities.reduce((sum, city) => sum + city.userCount, 0);
  }

  formatPlayers(value: number): string {
    return formatPlayers(value);
  }

  fmtLat(value: number): string {
    return `${Math.abs(value).toFixed(2)}°${value >= 0 ? 'N' : 'S'}`;
  }

  fmtLng(value: number): string {
    return `${Math.abs(value).toFixed(2)}°${value >= 0 ? 'E' : 'W'}`;
  }
}

function countryKey(value: string): string {
  const key = value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bis\.\b/g, 'islands')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return COUNTRY_ALIASES[key] ?? key;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

function formatPlayers(value: number): string {
  return `${value.toLocaleString()} ${value === 1 ? 'player' : 'players'}`;
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
