import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

type Vec3 = [number, number, number];

interface Principle {
  number: string;
  title: string;
  body: string;
}

interface LabStep {
  verb: string;
  detail: string;
}

/**
 * Global Solutions Lab — position statement on artificial intelligence.
 * Route: /ai-position (aliases: /position-on-ai, /our-position-on-ai)
 */
@Component({
  selector: 'app-ai-position',
  templateUrl: './ai-position.component.html',
  styleUrls: ['./ai-position.component.css'],
  standalone: false,
})
export class AiPositionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sphere', { static: false }) sphereRef?: ElementRef<SVGGElement>;
  @ViewChild('page', { static: false }) pageRef?: ElementRef<HTMLElement>;

  readonly principles: Principle[] = [
    {
      number: '01',
      title: 'Humans drive innovation.',
      body:
        'AI extends human judgment. It doesn’t replace it. People decide which problems are worth solving, which trade-offs are acceptable and what success means. A machine can propose, but people decide and people answer for the result.',
    },
    {
      number: '02',
      title: 'Aim it at real problems.',
      body:
        'Energy access, food security, health, education, climate resilience and disaster preparedness are where AI should prove itself. We judge a tool by what it fixes.',
    },
    {
      number: '03',
      title: 'Share the benefits and the authorship.',
      body:
        'If AI is built by a few people for a few people, it will deepen the divides we exist to close. Communities in the Global South and underserved places everywhere should be able to use these tools. They should also be able to help shape them.',
    },
    {
      number: '04',
      title: 'Protect human dignity.',
      body:
        'Privacy, fairness, transparency and accountability belong in every stage of a system’s life. Efficiency never justifies discrimination.',
    },
    {
      number: '05',
      title: 'Cooperate across borders.',
      body:
        'No nation, company or discipline can get this right alone. Governments, researchers, builders and civil society have to work on it together.',
    },
  ];

  readonly risks: string[] = [
    'Misuse by people who mean harm',
    'Power concentrated in a few hands',
    'Erosion of public trust',
    'Displaced work and meaning',
    'Systems we don’t fully understand',
  ];

  readonly responses: string[] = [
    'Careful design',
    'Honest testing',
    'Human oversight',
    'Broad participation',
  ];

  readonly aiSteps: LabStep[] = [
    { verb: 'Gather evidence', detail: 'Data, research and precedent' },
    { verb: 'Model scenarios', detail: 'What could happen, and to whom' },
    { verb: 'Test assumptions', detail: 'Where the plan might break' },
  ];

  readonly humanSteps: LabStep[] = [
    { verb: 'Debate', detail: 'Weigh values and trade-offs' },
    { verb: 'Decide', detail: 'Choose what is worth doing' },
    { verb: 'Own the result', detail: 'Stay accountable for it' },
  ];

  private readonly isBrowser: boolean;
  private rafId: number | null = null;
  private observer: IntersectionObserver | null = null;
  private sphereVisibilityObserver: IntersectionObserver | null = null;
  private sphereVisible = true;
  private scrollListener: (() => void) | null = null;
  private lineEls: SVGLineElement[] = [];
  private vertices: Vec3[] = [];
  private edges: Array<[number, number]> = [];

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    private readonly zone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    const pageTitle =
      'Human-Led, World-Serving: Our Position on AI | Global Solutions Lab';
    const description =
      'The Global Solutions Lab position on artificial intelligence: AI should serve all of humanity, with people at the center of innovation and accountable for every decision.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({
      property: 'og:url',
      content: 'https://newworld-game.org/ai-position',
    });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      this.loadEditorialFont();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.setupReveal();
      this.setupProgress();
      this.setupSphere();
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.observer?.disconnect();
    this.sphereVisibilityObserver?.disconnect();
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      window.removeEventListener('resize', this.scrollListener);
    }
  }

  scrollToEssay(): void {
    if (!this.isBrowser) {
      return;
    }
    const target = this.document.getElementById('the-moment');
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    target?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  /* ------------------------------------------------------------------ */
  /* Editorial serif (loaded only on this page)                          */
  /* ------------------------------------------------------------------ */
  private loadEditorialFont(): void {
    const id = 'aip-newsreader-font';
    if (this.document.getElementById(id)) {
      return;
    }
    const link = this.document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..600&display=swap';
    this.document.head.appendChild(link);
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal                                                        */
  /* ------------------------------------------------------------------ */
  private setupReveal(): void {
    const root = this.pageRef?.nativeElement;
    if (!root) {
      return;
    }
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      return; // content is visible by default
    }

    root.classList.add('aip-animate');
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    root
      .querySelectorAll('.reveal')
      .forEach((el) => this.observer?.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Reading progress                                                     */
  /* ------------------------------------------------------------------ */
  private setupProgress(): void {
    const bar = this.pageRef?.nativeElement.querySelector(
      '.aip-progress-fill'
    ) as HTMLElement | null;
    if (!bar) {
      return;
    }
    this.scrollListener = () => {
      const doc = this.document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
    window.addEventListener('resize', this.scrollListener, { passive: true });
    this.scrollListener();
  }

  /* ------------------------------------------------------------------ */
  /* Geodesic sphere (a nod to Fuller), drawn as an SVG wireframe         */
  /* ------------------------------------------------------------------ */
  private setupSphere(): void {
    const group = this.sphereRef?.nativeElement;
    if (!group) {
      return;
    }
    this.buildGeodesic(3);

    const ns = 'http://www.w3.org/2000/svg';
    this.lineEls = this.edges.map(() => {
      const line = this.document.createElementNS(ns, 'line') as SVGLineElement;
      group.appendChild(line);
      return line;
    });

    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const start = performance.now();
    const draw = (now: number) => {
      const t = reduceMotion ? 0.6 : (now - start) / 1000;
      this.renderSphere(t * 0.12 + 0.6, 0.38);
    };

    if (reduceMotion) {
      draw(start);
      return;
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.sphereVisibilityObserver = new IntersectionObserver((entries) => {
        this.sphereVisible = entries.some((e) => e.isIntersecting);
      });
      this.sphereVisibilityObserver.observe(group.ownerSVGElement ?? group);
    }

    const loop = (now: number) => {
      if (this.sphereVisible) {
        draw(now);
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private renderSphere(yaw: number, tilt: number): void {
    const R = 200;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);

    const projected = this.vertices.map(([x, y, z]) => {
      // rotate around Y (yaw), then around X (tilt)
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * ct - z1 * st;
      const z2 = y * st + z1 * ct;
      return [x1 * R, y2 * R, z2] as Vec3;
    });

    for (let i = 0; i < this.edges.length; i++) {
      const [a, b] = this.edges[i];
      const pa = projected[a];
      const pb = projected[b];
      const depth = (pa[2] + pb[2]) / 2; // -1 (back) .. 1 (front)
      const front = (depth + 1) / 2;
      const line = this.lineEls[i];
      line.setAttribute('x1', pa[0].toFixed(2));
      line.setAttribute('y1', pa[1].toFixed(2));
      line.setAttribute('x2', pb[0].toFixed(2));
      line.setAttribute('y2', pb[1].toFixed(2));
      line.setAttribute('stroke-opacity', (0.08 + front * 0.62).toFixed(3));
      line.setAttribute('stroke-width', (0.5 + front * 0.9).toFixed(2));
    }
  }

  private buildGeodesic(frequency: number): void {
    const phi = (1 + Math.sqrt(5)) / 2;
    const base: Vec3[] = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ];
    const faces: Array<[number, number, number]> = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];

    const index = new Map<string, number>();
    const edgeSet = new Set<string>();
    const vertices: Vec3[] = [];
    const edges: Array<[number, number]> = [];

    const vertexId = (p: Vec3): number => {
      const len = Math.hypot(p[0], p[1], p[2]);
      const n: Vec3 = [p[0] / len, p[1] / len, p[2] / len];
      const key = n.map((v) => v.toFixed(5)).join(',');
      const found = index.get(key);
      if (found !== undefined) {
        return found;
      }
      vertices.push(n);
      index.set(key, vertices.length - 1);
      return vertices.length - 1;
    };

    const addEdge = (a: number, b: number) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([a, b]);
      }
    };

    const n = frequency;
    for (const [ia, ib, ic] of faces) {
      const A = base[ia];
      const B = base[ib];
      const C = base[ic];
      const point = (i: number, j: number): number => {
        const k = n - i - j;
        return vertexId([
          (A[0] * i + B[0] * j + C[0] * k) / n,
          (A[1] * i + B[1] * j + C[1] * k) / n,
          (A[2] * i + B[2] * j + C[2] * k) / n,
        ]);
      };
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n - i; j++) {
          const p = point(i, j);
          if (i + 1 <= n - j) {
            addEdge(p, point(i + 1, j));
          }
          if (j + 1 <= n - i) {
            addEdge(p, point(i, j + 1));
          }
          if (i + 1 <= n && j - 1 >= 0) {
            addEdge(p, point(i + 1, j - 1));
          }
        }
      }
    }

    this.vertices = vertices;
    this.edges = edges;
  }
}
