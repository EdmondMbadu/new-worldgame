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

interface Problem {
  number: string;
  title: string;
  body: string;
}

interface ExampleDraft {
  heading: string;
  body: string;
  chips: string[];
  colleague: { name: string; avatar: string; note: string };
}

interface Step {
  number: string;
  name: string;
  question: string;
  students: string;
  ai: string;
  draft: ExampleDraft;
}

interface Format {
  name: string;
  length: string;
  scope: string;
  outcome: string;
  /** Share of a 15-week term, 0–1, drawn as a bar. */
  span: number;
}

interface Feature {
  icon: string;
  title: string;
  body: string;
}

interface TimelineItem {
  when: string;
  what: string;
  detail: string;
}

interface Faq {
  q: string;
  a: string;
}

/** A wireframe geodesic sphere (a nod to Fuller), drawn into an SVG <g>. */
class GeodesicSphere {
  private lines: SVGLineElement[] = [];
  private vertices: Vec3[] = [];
  private edges: Array<[number, number]> = [];

  constructor(
    private readonly group: SVGGElement,
    private readonly radius: number,
    frequency: number,
    doc: Document
  ) {
    this.build(frequency);
    const ns = 'http://www.w3.org/2000/svg';
    this.lines = this.edges.map(() => {
      const line = doc.createElementNS(ns, 'line') as SVGLineElement;
      group.appendChild(line);
      return line;
    });
  }

  render(yaw: number, tilt: number): void {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const R = this.radius;
    const p = this.vertices.map(([x, y, z]) => {
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * ct - z1 * st;
      const z2 = y * st + z1 * ct;
      return [x1 * R, y2 * R, z2] as Vec3;
    });
    for (let i = 0; i < this.edges.length; i++) {
      const [a, b] = this.edges[i];
      const pa = p[a];
      const pb = p[b];
      const front = ((pa[2] + pb[2]) / 2 + 1) / 2;
      const line = this.lines[i];
      line.setAttribute('x1', pa[0].toFixed(1));
      line.setAttribute('y1', pa[1].toFixed(1));
      line.setAttribute('x2', pb[0].toFixed(1));
      line.setAttribute('y2', pb[1].toFixed(1));
      line.setAttribute('stroke-opacity', (0.06 + front * 0.6).toFixed(3));
      line.setAttribute('stroke-width', (0.45 + front * 0.85).toFixed(2));
    }
  }

  private build(n: number): void {
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
    const vid = (q: Vec3): number => {
      const len = Math.hypot(q[0], q[1], q[2]);
      const v: Vec3 = [q[0] / len, q[1] / len, q[2] / len];
      const key = v.map((c) => c.toFixed(5)).join(',');
      const found = index.get(key);
      if (found !== undefined) {
        return found;
      }
      this.vertices.push(v);
      index.set(key, this.vertices.length - 1);
      return this.vertices.length - 1;
    };
    const edge = (a: number, b: number) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        this.edges.push([a, b]);
      }
    };
    for (const [ia, ib, ic] of faces) {
      const A = base[ia];
      const B = base[ib];
      const C = base[ic];
      const pt = (i: number, j: number) => {
        const k = n - i - j;
        return vid([
          (A[0] * i + B[0] * j + C[0] * k) / n,
          (A[1] * i + B[1] * j + C[1] * k) / n,
          (A[2] * i + B[2] * j + C[2] * k) / n,
        ]);
      };
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n - i; j++) {
          const p = pt(i, j);
          if (i + 1 <= n - j) edge(p, pt(i + 1, j));
          if (j + 1 <= n - i) edge(p, pt(i, j + 1));
          if (i + 1 <= n && j - 1 >= 0) edge(p, pt(i + 1, j - 1));
        }
      }
    }
  }
}

/**
 * Global Solutions Lab — landing page for college professors.
 * Goal: get faculty to book a 20-minute demo and register a class.
 * Routes: /for-professors (aliases: /professors, /for-faculty)
 */
@Component({
  selector: 'app-for-professors',
  templateUrl: './for-professors.component.html',
  styleUrls: [
    './for-professors.component.css',
    './for-professors.sections.css',
    './for-professors.closing.css',
  ],
  standalone: false,
})
export class ForProfessorsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('page', { static: false }) pageRef?: ElementRef<HTMLElement>;
  @ViewChild('heroSphere', { static: false }) heroSphereRef?: ElementRef<SVGGElement>;
  @ViewChild('finalSphere', { static: false }) finalSphereRef?: ElementRef<SVGGElement>;
  @ViewChild('mock', { static: false }) mockRef?: ElementRef<HTMLElement>;
  @ViewChild('typed', { static: false }) typedRef?: ElementRef<HTMLElement>;
  @ViewChild('stepsList', { static: false }) stepsListRef?: ElementRef<HTMLElement>;

  readonly demoLink = '/scheduler';
  readonly registerLink = '/signup-school-free';

  readonly navSections = [
    { label: 'How it works', id: 'how-it-works' },
    { label: 'Your course', id: 'your-course' },
    { label: 'Drexel', id: 'drexel' },
    { label: 'FAQ', id: 'faq' },
  ];

  readonly titleLine1 = ['Your', 'students', 'already', 'use', 'AI.'];
  readonly titleLine2 = ['Give', 'them', 'a', 'problem', 'worth', 'using', 'it', 'on.'];

  readonly buckyNote =
    'Your problem statement names the waste. What’s driving it? Start with the causes.';

  readonly problems: Problem[] = [
    {
      number: '01',
      title: 'The essay can be outsourced.',
      body:
        'A take-home paper now tells you little about what a student understands. In Global Solutions Lab, the work happens in stages you can see: how the team framed the problem, what evidence they used, which options they dropped and why.',
    },
    {
      number: '02',
      title: 'Team projects drift.',
      body:
        'Without structure, groups stall after the first meeting and one person carries the rest. Each team gets a shared workspace, a discussion board, a meeting room and a clear next step, so momentum doesn’t depend on you chasing them.',
    },
    {
      number: '03',
      title: 'Students ask what it’s for.',
      body:
        'Students work harder on a problem that exists outside the classroom. Teams pick a real local or global issue, apply what your course teaches to it, and can enter the result in the Global Solutions Lab Tournament.',
    },
  ];

  readonly steps: Step[] = [
    {
      number: '1',
      name: 'Problem state',
      question: 'What is wrong, and how bad is it?',
      students:
        'Define the problem, its size, where it is, who it affects, how to measure it and what causes it.',
      ai: 'AI colleagues test the framing, suggest data sources and point out missing causes.',
      draft: {
        heading: 'Good food is thrown away where families go without.',
        body:
          'In several neighborhoods, households can’t reliably get fresh food, while nearby grocers and restaurants discard food that is still safe to eat. Causes: distance to full-service stores, cost, and no simple way to move surplus food.',
        chips: ['Households far from a full-service grocer', 'Edible food discarded each week'],
        colleague: {
          name: 'Bucky',
          avatar: 'assets/img/bucky.png',
          note: 'You’ve named two problems. Show how they connect before you solve either.',
        },
      },
    },
    {
      number: '2',
      name: 'Preferred state',
      question: 'What would “solved” look like?',
      students:
        'Describe the future the team wants and the measures that would show they got there.',
      ai: 'AI colleagues push for goals that are specific, measurable and honest about trade-offs.',
      draft: {
        heading: 'Surplus food reaches neighbors the same day.',
        body:
          'Every household is a short walk from fresh, affordable food. Food that grocers can’t sell is rescued and shared instead of thrown out.',
        chips: ['Food discarded: cut by half', 'Households with access: rising every term'],
        colleague: {
          name: 'Tane Kahu',
          avatar: 'assets/img/tane-agent.png',
          note: 'Think in cycles: what happens to the food nobody picks up?',
        },
      },
    },
    {
      number: '3',
      name: 'Developing the solution',
      question: 'How do we get from here to there?',
      students:
        'Design the strategy: the technology, policy, programs, partners and funding it would take.',
      ai: 'Specialist AI colleagues give feedback from different disciplines and flag what’s missing.',
      draft: {
        heading: 'A network of community fridges, stocked daily.',
        body:
          'Partner grocers set aside surplus each evening. Volunteer drivers move it to community fridges, and a simple app shows what’s available where.',
        chips: ['Grocers', 'Food bank', 'City health department', 'Volunteers'],
        colleague: {
          name: 'Arjun Patel',
          avatar: 'assets/img/arjun-agent.png',
          note: 'Could you pilot this with two fridges and a shared spreadsheet before building an app?',
        },
      },
    },
    {
      number: '4',
      name: 'Implementation',
      question: 'Who does what, when, and for how much?',
      students:
        'Plan the rollout: timeline, costs, stakeholders, risks and how success will be measured.',
      ai: 'AI colleagues stress-test the plan before the team presents it or enters the tournament.',
      draft: {
        heading: 'Pilot first, then grow block by block.',
        body:
          'Months 1–2: two fridges and three partner grocers. Months 3–6: expand to ten sites if pickup rates hold. Track food rescued and families served every week.',
        chips: ['Pilot budget', 'Food-safety plan', 'Risks and owners'],
        colleague: {
          name: 'Li Wei',
          avatar: 'assets/img/li-agent.png',
          note: 'Who keeps this running after the semester ends? Name the owner.',
        },
      },
    },
  ];

  readonly formats: Format[] = [
    {
      name: 'Module',
      length: '1–2 weeks',
      scope: 'Steps 1 and 2',
      outcome: 'A sharp problem brief and a measurable goal, tied to your course content.',
      span: 0.12,
    },
    {
      name: 'Team project',
      length: '4–6 weeks',
      scope: 'All four steps',
      outcome: 'A complete solution and a team presentation, assessed at each step.',
      span: 0.4,
    },
    {
      name: 'Capstone',
      length: 'Full term',
      scope: 'All four steps + tournament',
      outcome: 'An implementation-ready solution entered in the Global Solutions Lab Tournament.',
      span: 1,
    },
  ];

  readonly disciplinesA = [
    'Entrepreneurship',
    'Sustainability',
    'Public health',
    'Environmental science',
    'Engineering & design',
  ];
  readonly disciplinesB = [
    'Public policy',
    'Business & management',
    'International development',
    'Urban studies',
    'Global studies',
  ];

  readonly features: Feature[] = [
    {
      icon: 'lock',
      title: 'A private space for your class',
      body: 'One page for your course with your teams, your challenges and your participants. Keep it private or make it public.',
    },
    {
      icon: 'edit_note',
      title: 'Your syllabus, your questions',
      body: 'Upload the syllabus and handouts. Customize the questions teams answer at each step so they match your learning goals.',
    },
    {
      icon: 'forum',
      title: 'Discussion and an always-on meeting room',
      body: 'A class discussion board and a video room students can drop into anytime, so teams can meet outside class without extra tools.',
    },
    {
      icon: 'dashboard',
      title: 'Every team’s work in one place',
      body: 'Open any team’s solution to see what they’ve written at each step, and pull every team’s work into a single summary when it’s time to review.',
    },
    {
      icon: 'diversity_3',
      title: 'AI colleagues for every team',
      body: 'Bucky, inspired by Buckminster Fuller, and a dozen specialist AI colleagues coach teams through research, feedback and storytelling.',
    },
    {
      icon: 'emoji_events',
      title: 'A real audience',
      body: 'Finished solutions can be entered in the Global Solutions Lab Tournament, where they’re evaluated and the strongest are recognized.',
    },
  ];

  readonly timeline: TimelineItem[] = [
    {
      when: 'Week 0',
      what: '20-minute demo',
      detail: 'We walk through the platform with your course in mind and answer your questions.',
    },
    {
      when: 'Setup',
      what: 'Class space in 15 minutes',
      detail: 'Register your class, add your syllabus, pick a challenge and adjust the step questions.',
    },
    {
      when: 'Week 1',
      what: 'Teams form',
      detail: 'Students sign up for free, join your class space, form teams and choose their problem.',
    },
    {
      when: 'The term',
      what: 'Four steps',
      detail: 'You check progress step by step and give feedback where it matters.',
    },
    {
      when: 'Finale',
      what: 'Present and compete',
      detail: 'Teams present in class and can submit to the Global Solutions Lab Tournament.',
    },
  ];

  readonly faqs: Faq[] = [
    {
      q: 'How does this handle AI and academic integrity?',
      a: 'AI is part of the method, not a shortcut around it. Students use AI colleagues for research and feedback, but the team writes each step, and the work is saved stage by stage. You can see how a solution developed, not just the final version.',
    },
    {
      q: 'What does it cost?',
      a: 'Nothing. Classes are free through the 2026–27 academic year, including full platform access and tournament entries. Students don’t pay anything either.',
    },
    {
      q: 'How much of my time does it take?',
      a: 'About 15 minutes to set up a class space after a short demo. During the term, the four steps give teams a structure, so most of your time goes to feedback rather than logistics.',
    },
    {
      q: 'How do I grade it?',
      a: 'Each step produces written work you can assess on its own, so you can grade at milestones or grade the finished solution. We’re happy to share example rubrics during the demo.',
    },
    {
      q: 'Is my class private?',
      a: 'Yes, if you want it to be. Each class space can be set to private or public, and you decide who joins as a participant or an admin.',
    },
    {
      q: 'How big a class can I run?',
      a: 'The free class plan covers up to 30 students or five teams. If your class is larger, or you want several sections, contact us and we’ll set it up.',
    },
    {
      q: 'Does it only work for sustainability courses?',
      a: 'No. Any course that asks students to apply what they learn to a real problem works: business, engineering, health, policy, design, the sciences and more. You choose the challenge.',
    },
  ];

  openFaq = 0;
  activeStep = 0;

  private readonly isBrowser: boolean;
  private reduceMotion = false;
  private rafId: number | null = null;
  private spheres: Array<{ sphere: GeodesicSphere; visible: boolean; speed: number; tilt: number }> = [];
  private observers: IntersectionObserver[] = [];
  private cleanups: Array<() => void> = [];
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

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
    const pageTitle = 'Global Solutions Lab for Professors | Run your class as a real-world lab';
    const description =
      'Turn your course into a lab where student teams solve real problems in four structured steps, with AI colleagues as coaches. Free for classes through the 2026–27 academic year. Book a 20-minute demo.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: 'https://newworld-game.org/for-professors' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      this.reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this.loadEditorialFont();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }
    // The global `body { overflow-x: hidden }` turns <body> into a scroll
    // container, which stops `position: sticky` from working. `clip` keeps the
    // same visual result without that side effect, so use it on this page only.
    const body = this.document.body;
    const previous = body.style.overflowX;
    body.style.overflowX = 'clip';
    this.cleanups.push(() => (body.style.overflowX = previous));

    this.zone.runOutsideAngular(() => {
      this.setupReveal();
      this.setupProgress();
      this.setupSpheres();
      this.setupTilt();
      this.setupTyping();
      this.setupStepTracking();
      this.setupCountUp();
      this.setupSpotlight();
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    this.observers.forEach((o) => o.disconnect());
    this.cleanups.forEach((fn) => fn());
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? -1 : index;
  }

  goToStep(index: number): void {
    const el = this.stepsListRef?.nativeElement.querySelectorAll<HTMLElement>('.fp-step')[index];
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: this.reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }

  scrollToId(id: string): void {
    this.document
      .getElementById(id)
      ?.scrollIntoView({ behavior: this.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  wordDelay(line: number, i: number): string {
    const offset = line === 0 ? 0 : this.titleLine1.length;
    return `${0.15 + (offset + i) * 0.06}s`;
  }

  /* ------------------------------------------------------------------ */

  private on(target: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions): void {
    target.addEventListener(type, fn, opts);
    this.cleanups.push(() => target.removeEventListener(type, fn, opts));
  }

  private loadEditorialFont(): void {
    const id = 'aip-newsreader-font'; // shared with /ai-position
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

  private setupReveal(): void {
    const root = this.pageRef?.nativeElement;
    if (!root || this.reduceMotion || typeof IntersectionObserver === 'undefined') {
      return; // content is visible by default
    }
    root.classList.add('fp-animate');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    root.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    this.observers.push(io);
  }

  private setupProgress(): void {
    const root = this.pageRef?.nativeElement;
    const bar = root?.querySelector('.fp-progress-fill') as HTMLElement | null;
    const rail = root?.querySelector('.fp-steps-rail-fill') as HTMLElement | null;
    const list = this.stepsListRef?.nativeElement;
    if (!bar) {
      return;
    }
    const update = () => {
      const doc = this.document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
      if (rail && list) {
        const r = list.getBoundingClientRect();
        const mid = window.innerHeight * 0.5;
        const p = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
        rail.style.transform = `scaleY(${p})`;
      }
    };
    this.on(window, 'scroll', update, { passive: true });
    this.on(window, 'resize', update, { passive: true });
    update();
  }

  private setupSpheres(): void {
    const defs: Array<[ElementRef<SVGGElement> | undefined, number, number, number]> = [
      [this.heroSphereRef, 230, 0.07, 0.42],
      [this.finalSphereRef, 260, 0.05, 0.3],
    ];
    for (const [ref, radius, speed, tilt] of defs) {
      if (!ref) continue;
      const entry = {
        sphere: new GeodesicSphere(ref.nativeElement, radius, 3, this.document),
        visible: true,
        speed,
        tilt,
      };
      this.spheres.push(entry);
      if (typeof IntersectionObserver !== 'undefined') {
        const io = new IntersectionObserver((es) => (entry.visible = es.some((e) => e.isIntersecting)));
        io.observe(ref.nativeElement.ownerSVGElement ?? ref.nativeElement);
        this.observers.push(io);
      }
    }
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      for (const s of this.spheres) {
        if (s.visible) s.sphere.render(0.6 + t * s.speed, s.tilt);
      }
    };
    if (this.reduceMotion) {
      draw(start);
      return;
    }
    const loop = (now: number) => {
      draw(now);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** The hero class space leans gently toward the pointer. */
  private setupTilt(): void {
    const el = this.mockRef?.nativeElement;
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    if (!el || this.reduceMotion || !fine) {
      return;
    }
    const zone = el.parentElement ?? el;
    this.on(zone, 'pointermove', (e) => {
      const ev = e as PointerEvent;
      const r = zone.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5;
      const y = (ev.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
    });
    this.on(zone, 'pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  }

  /** Bucky "types" his note once the hero has settled. */
  private setupTyping(): void {
    const el = this.typedRef?.nativeElement;
    if (!el) {
      return;
    }
    const text = this.buckyNote;
    if (this.reduceMotion) {
      el.textContent = `“${text}”`;
      el.parentElement?.classList.add('is-done');
      return;
    }
    el.textContent = '';
    let i = 0;
    const tick = () => {
      i++;
      if (i === 1) el.parentElement?.classList.add('has-text');
      el.textContent = `“${text.slice(0, i)}${i >= text.length ? '”' : ''}`;
      if (i < text.length) {
        this.typingTimer = setTimeout(tick, 18 + Math.random() * 28);
      } else {
        el.parentElement?.classList.add('is-done');
      }
    };
    this.typingTimer = setTimeout(() => {
      el.parentElement?.classList.add('is-typing');
      this.typingTimer = setTimeout(tick, 900);
    }, 1900);
  }

  /** Scrollytelling: the step in the middle of the viewport drives the example document. */
  private setupStepTracking(): void {
    const list = this.stepsListRef?.nativeElement;
    if (!list || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const items = Array.from(list.querySelectorAll<HTMLElement>('.fp-step'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = items.indexOf(entry.target as HTMLElement);
            if (idx >= 0 && idx !== this.activeStep) {
              this.zone.run(() => (this.activeStep = idx));
            }
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    items.forEach((el) => io.observe(el));
    this.observers.push(io);
  }

  private setupCountUp(): void {
    const root = this.pageRef?.nativeElement;
    const nums = Array.from(root?.querySelectorAll<HTMLElement>('[data-count]') ?? []);
    if (!nums.length || this.reduceMotion || typeof IntersectionObserver === 'undefined') {
      return;
    }
    nums.forEach((n) => (n.textContent = `${n.dataset['prefix'] ?? ''}0`));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          const target = Number(el.dataset['count'] ?? 0);
          const prefix = el.dataset['prefix'] ?? '';
          const t0 = performance.now();
          const dur = 1400;
          const step = (now: number) => {
            const k = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - k, 3);
            el.textContent = `${prefix}${Math.round(target * eased)}`;
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          // Guarantee the true value even if animation frames are paused.
          setTimeout(() => (el.textContent = `${prefix}${target}`), dur + 300);
        }
      },
      { threshold: 0.6 }
    );
    nums.forEach((n) => io.observe(n));
    this.observers.push(io);
  }

  /** A soft light follows the pointer across the feature grid. */
  private setupSpotlight(): void {
    const grid = this.pageRef?.nativeElement.querySelector('.fp-features') as HTMLElement | null;
    if (!grid) {
      return;
    }
    this.on(grid, 'pointermove', (e) => {
      const ev = e as PointerEvent;
      grid.querySelectorAll<HTMLElement>('.fp-feature').forEach((card) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${ev.clientX - r.left}px`);
        card.style.setProperty('--my', `${ev.clientY - r.top}px`);
      });
    });
  }
}
