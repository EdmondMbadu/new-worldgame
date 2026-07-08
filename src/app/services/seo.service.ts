import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  robots?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly primaryDomain = 'https://newworld-game.org';
  private readonly defaultImage = `${this.primaryDomain}/assets/img/gsl-logo.png`;

  private defaultConfig: SeoConfig = {
    title: 'Global Solutions Lab - Developing solutions for global and local problems.',
    description: 'Global Solutions Lab develops solutions for global and local problems through design science, AI guidance, structured collaboration, workshops, labs, and tournaments.',
    keywords: 'Global Solutions Lab, GSL, global challenges, local problems, educational platform, collaborative learning, sustainability, problem-solving, tournaments, world game, Buckminster Fuller',
    image: this.defaultImage,
    url: `${this.primaryDomain}/`,
    type: 'website',
    author: 'Global Solutions Lab Team',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  };

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router
  ) {
    // Set default meta tags
    this.setDefaultMetaTags();
  }

  /**
   * Update SEO meta tags for a specific page
   */
  updateMetaTags(config: SeoConfig): void {
    const seoConfig = { ...this.defaultConfig, ...config };
    const canonicalUrl = this.toAbsoluteUrl(seoConfig.url || '/');
    const robots = seoConfig.robots || this.defaultConfig.robots || 'index, follow';

    // Update title
    if (seoConfig.title) {
      this.titleService.setTitle(seoConfig.title);
    }

    // Update or create meta tags
    this.metaService.updateTag({ name: 'description', content: seoConfig.description || '' });
    this.metaService.updateTag({ name: 'keywords', content: seoConfig.keywords || '' });
    this.metaService.updateTag({ name: 'author', content: seoConfig.author || '' });
    this.metaService.updateTag({ name: 'robots', content: robots });
    this.metaService.updateTag({ name: 'googlebot', content: robots });

    // Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: seoConfig.title || '' });
    this.metaService.updateTag({ property: 'og:description', content: seoConfig.description || '' });
    this.metaService.updateTag({ property: 'og:image', content: this.toAbsoluteUrl(seoConfig.image || this.defaultImage) });
    this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
    this.metaService.updateTag({ property: 'og:type', content: seoConfig.type || 'website' });
    this.metaService.updateTag({ property: 'og:site_name', content: 'Global Solutions Lab' });
    this.metaService.updateTag({ property: 'og:image:alt', content: 'Global Solutions Lab - Developing solutions for global and local problems.' });

    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: seoConfig.title || '' });
    this.metaService.updateTag({ name: 'twitter:description', content: seoConfig.description || '' });
    this.metaService.updateTag({ name: 'twitter:image', content: this.toAbsoluteUrl(seoConfig.image || this.defaultImage) });
    this.metaService.updateTag({ name: 'twitter:url', content: canonicalUrl });

    // Canonical URL
    this.updateCanonicalUrl(canonicalUrl);
  }

  /**
   * Set default meta tags on app initialization
   */
  private setDefaultMetaTags(): void {
    this.updateMetaTags(this.defaultConfig);
  }

  /**
   * Update canonical URL
   */
  private updateCanonicalUrl(url: string): void {
    const head = document.getElementsByTagName('head')[0];
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      head.appendChild(canonical);
    }

    canonical.setAttribute('href', url);
  }

  /**
   * Add structured data (JSON-LD)
   */
  addStructuredData(data: any): void {
    const head = document.getElementsByTagName('head')[0];
    let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }

  /**
   * Get route-specific SEO configuration
   */
  getRouteConfig(route: string): SeoConfig {
    const normalizedRoute = this.normalizeRoute(route);
    const baseUrl = this.primaryDomain;
    const configs: { [key: string]: SeoConfig } = {
      '/': {
        title: 'Global Solutions Lab - Developing solutions for global and local problems.',
        description: 'Global Solutions Lab develops solutions for global and local problems through AI guidance, design science, tournaments, and solution-building programs.',
        keywords: 'Global Solutions Lab, GSL, global challenges, educational platform, Buckminster Fuller, design science, sustainability education, collaborative learning, AI problem solving',
        url: `${baseUrl}/`,
        type: 'website'
      },
      '/get-started': {
        title: 'Get Started with Global Solutions Lab | Global Challenge Learning Platform',
        description: 'Start using Global Solutions Lab. Explore the onboarding path for students, educators, and partners who want to solve global challenges through collaborative gameplay and design science.',
        keywords: 'get started Global Solutions Lab onboarding, start Global Solutions Lab, design science learning platform',
        url: `${baseUrl}/get-started`
      },
      '/welcome': {
        title: 'Get Started with Global Solutions Lab | Global Challenge Learning Platform',
        description: 'Start using Global Solutions Lab. Explore the onboarding path for students, educators, and partners who want to solve global challenges through collaborative gameplay and design science.',
        keywords: 'get started Global Solutions Lab onboarding, start Global Solutions Lab, design science learning platform',
        url: `${baseUrl}/get-started`
      },
      '/about': {
        title: 'About Global Solutions Lab | Buckminster Fuller Inspired Learning Platform',
        description: 'Learn what Global Solutions Lab is, how it works, and how it brings Buckminster Fuller’s World Game ideas into modern education, collaboration, and global problem solving.',
        keywords: 'about Global Solutions Lab, Buckminster Fuller world game, design science education, global problem solving platform',
        url: `${baseUrl}/about`
      },
      '/landing': {
        title: 'Welcome to Global Solutions Lab - Transform Learning Through Global Problem Solving',
        description: 'Engage students in solving real-world challenges. Global Solutions Lab combines education, collaboration, and innovation to create meaningful learning experiences.',
        keywords: 'Global Solutions Lab, educational platform, student engagement, global learning, collaborative problem solving',
        url: `${baseUrl}/landing`
      },
      '/landing-college': {
        title: 'Global Solutions Lab for Colleges - University-Level Global Challenge Platform',
        description: 'Bring Global Solutions Lab to your college or university. Engage students in collaborative problem-solving for real-world global challenges.',
        keywords: 'Global Solutions Lab college, university game, higher education, collaborative learning, global challenges university',
        url: `${baseUrl}/landing-college`
      },
      '/landing-un': {
        title: 'Global Solutions Lab & United Nations SDGs - Sustainable Development Goals Platform',
        description: 'Align your learning with UN Sustainable Development Goals through Global Solutions Lab. Tackle global challenges connected to the UN SDGs.',
        keywords: 'Global Solutions Lab UN, SDGs, sustainable development goals, global challenges, United Nations education',
        url: `${baseUrl}/landing-un`
      },
      '/landing-community': {
        title: 'Global Solutions Lab Community - Join Global Problem Solvers',
        description: 'Join the Global Solutions Lab community of educators, students, and problem solvers working together to address global challenges.',
        keywords: 'Global Solutions Lab community, global problem solvers, collaborative learning community, educational network',
        url: `${baseUrl}/landing-community`
      },
      '/solution-a-thon': {
        title: 'Solution-a-thon 2026 | One-Day SDG Sprint for Student Teams',
        description: 'The 2026 Solution-a-thon is a one-day SDG sprint for high school and university teams using Global Solutions Lab, Bucky, and design science to create structured Solution Briefs.',
        keywords: 'Solution-a-thon, Global Solutions Lab Solution-a-thon, student SDG sprint, design science competition, student solution brief, global challenges competition',
        url: `${baseUrl}/solution-a-thon`
      },
      '/gsl-solution-a-thon': {
        title: 'Solution-a-thon 2026 | One-Day SDG Sprint for Student Teams',
        description: 'The 2026 Solution-a-thon is a one-day SDG sprint for high school and university teams using Global Solutions Lab, Bucky, and design science to create structured Solution Briefs.',
        keywords: 'Solution-a-thon, GSL Solution-a-thon, Global Solutions Lab Solution-a-thon, student SDG sprint, design science competition',
        url: `${baseUrl}/solution-a-thon`
      },
      '/solution-a-thon-hubs': {
        title: 'Host a Solution-a-thon Hub | Global Solutions Lab',
        description: 'Learn how schools, departments, student groups, and community organizations can host a local Solution-a-thon hub for the one-day SDG sprint.',
        keywords: 'host Solution-a-thon hub, Global Solutions Lab hub, school SDG sprint, university challenge hub, student innovation event',
        url: `${baseUrl}/solution-a-thon-hubs`
      },
      '/solution-a-thon-sponsors': {
        title: 'Sponsor the Solution-a-thon | Global Solutions Lab',
        description: 'Learn how sponsors can support student awards, access, hub operations, and follow-on support for the Global Solutions Lab Solution-a-thon.',
        keywords: 'sponsor Solution-a-thon, Global Solutions Lab sponsor, student SDG competition sponsor, design science sponsorship',
        url: `${baseUrl}/solution-a-thon-sponsors`
      },
      '/pricing': {
        title: 'Global Solutions Lab Pricing Plans | Programs for Schools, Universities, and Teams',
        description: 'Explore Global Solutions Lab pricing and program options for schools, universities, nonprofits, and organizations ready to run workshops, labs, and tournaments.',
        keywords: 'Global Solutions Lab pricing, Global Solutions Lab plans, educational platform pricing, school packages, university challenge platform',
        url: `${baseUrl}/pricing`
      },
      '/plans': {
        title: 'Global Solutions Lab Pricing Plans | Programs for Schools, Universities, and Teams',
        description: 'Explore Global Solutions Lab pricing and program options for schools, universities, nonprofits, and organizations ready to run workshops, labs, and tournaments.',
        keywords: 'Global Solutions Lab pricing, Global Solutions Lab plans, educational platform pricing, school packages, university challenge platform',
        url: `${baseUrl}/pricing`
      },
      '/workshop': {
        title: 'Global Solutions Lab Workshop - Interactive Learning Experience',
        description: 'Join our Global Solutions Lab workshop and learn how to facilitate collaborative problem-solving sessions for global challenges.',
        keywords: 'Global Solutions Lab workshop, educational workshop, facilitator training, problem-solving workshop',
        url: `${baseUrl}/workshop`
      },
      '/tournament-landing': {
        title: 'Global Solutions Lab Tournaments - Compete to Solve Global Challenges',
        description: 'Participate in Global Solutions Lab tournaments. Teams compete to develop the best solutions for real-world global challenges.',
        keywords: 'Global Solutions Lab tournament, global challenge competition, student tournament, problem-solving competition',
        url: `${baseUrl}/tournament-landing`
      },
      '/our-team': {
        title: 'Our Team - Global Solutions Lab Leadership & Creators',
        description: 'Meet the Global Solutions Lab team dedicated to creating innovative educational experiences for global problem-solving.',
        keywords: 'Global Solutions Lab team, about us, educational innovators, game creators',
        url: `${baseUrl}/our-team`
      },
      '/contact': {
        title: 'Contact Global Solutions Lab | Partnerships, Workshops, and Support',
        description: 'Contact the Global Solutions Lab team for partnerships, school programs, workshops, tournaments, and platform support.',
        keywords: 'contact Global Solutions Lab, support, workshops, partnerships, Global Solutions Lab contact',
        url: `${baseUrl}/contact`
      },
      '/contact-us': {
        title: 'Contact Global Solutions Lab | Partnerships, Workshops, and Support',
        description: 'Contact the Global Solutions Lab team for partnerships, school programs, workshops, tournaments, and platform support.',
        keywords: 'contact Global Solutions Lab, support, workshops, partnerships, Global Solutions Lab contact',
        url: `${baseUrl}/contact`
      },
      '/blogs/features': {
        title: 'Global Solutions Lab Features - Weekly Intelligence Reports, AI Tools, and Collaboration',
        description: 'Explore Global Solutions Lab features including the Weekly Intelligence Report, Ask Bucky, AI colleagues, collaborative solution building, and tournament pathways.',
        keywords: 'Global Solutions Lab features, Weekly Intelligence Report, Ask Bucky, AI collaboration, solution platform, funding intelligence',
        url: `${baseUrl}/blogs/features`
      },
      '/ask-bucky': {
        title: 'Ask Bucky - AI Assistant for Global Challenges | Global Solutions Lab',
        description: 'Chat with Bucky, our AI assistant inspired by Buckminster Fuller. Get insights on global challenges and sustainable solutions.',
        keywords: 'Ask Bucky, AI assistant, Buckminster Fuller AI, global challenges chatbot, Global Solutions Lab AI',
        url: `${baseUrl}/ask-bucky`
      },
      '/bucky': {
        title: 'Meet Bucky - Your AI Guide to Global Problem Solving',
        description: 'Bucky is your AI companion for exploring global challenges and discovering innovative solutions in Global Solutions Lab.',
        keywords: 'Bucky AI, virtual assistant, Buckminster Fuller, AI guide, problem solving assistant',
        url: `${baseUrl}/bucky`
      },
      '/privacy': {
        title: 'Privacy Policy - Global Solutions Lab',
        description: 'Read Global Solutions Lab\'s privacy policy to understand how we protect and handle your data.',
        keywords: 'privacy policy, data protection, Global Solutions Lab privacy, user data',
        url: `${baseUrl}/privacy`
      },
      '/intellectual-property': {
        title: 'Intellectual Property & Honor Code - Global Solutions Lab',
        description: 'Learn how Global Solutions Lab handles participant ownership, attribution, protected work, commercialization, and embargo options.',
        keywords: 'Global Solutions Lab intellectual property, honor code, student IP, solution ownership, attribution',
        url: `${baseUrl}/intellectual-property`
      },
      '/overview': {
        title: 'About Global Solutions Lab | Buckminster Fuller Inspired Learning Platform',
        description: 'Learn what Global Solutions Lab is, how it works, and how it brings Buckminster Fuller’s World Game ideas into modern education, collaboration, and global problem solving.',
        keywords: 'about Global Solutions Lab, Buckminster Fuller world game, design science education, global problem solving platform',
        url: `${baseUrl}/about`
      }
    };

    return {
      ...this.defaultConfig,
      ...(configs[normalizedRoute] || {}),
      url: (configs[normalizedRoute]?.url || `${baseUrl}${normalizedRoute === '/' ? '/' : normalizedRoute}`),
      robots: this.getRobotsForRoute(normalizedRoute),
    };
  }

  /**
   * Initialize route-based SEO updates
   */
  initRouteMetaUpdates(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const config = this.getRouteConfig(event.urlAfterRedirects);
        this.updateMetaTags(config);

        // Scroll to top on route change
        window.scrollTo(0, 0);
      });

    this.updateMetaTags(this.getRouteConfig(this.router.url || '/'));
  }

  private normalizeRoute(route: string): string {
    const [path] = route.split(/[?#]/);
    return path || '/';
  }

  private toAbsoluteUrl(url: string): string {
    if (!url) {
      return `${this.primaryDomain}/`;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    return `${this.primaryDomain}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private getRobotsForRoute(route: string): string {
    const noIndexPrefixes = [
      '/home',
      '/game',
      '/mini-game',
      '/discover',
      '/profile',
      '/challenge',
      '/whiteboard',
      '/team-building',
      '/solution',
      '/dashboard',
      '/video-call',
      '/meeting',
      '/school-admin',
      '/login',
      '/signup',
      '/forgot-password',
      '/verify-email',
      '/admin',
      '/join',
      '/unsubscribe',
      '/scheduler',
      '/thank-you',
      '/start-challenge',
      '/problem-feedback',
      '/evaluation-summary',
      '/solution-view',
      '/solution-preview',
      '/solution-details',
      '/document-files',
      '/broadcasts',
      '/create-playground',
      '/create-solution',
      '/playground-steps',
      '/active-tournaments',
      '/your-tournaments',
      '/past-tournaments',
      '/invitations',
    ];

    return noIndexPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))
      ? 'noindex, nofollow'
      : this.defaultConfig.robots || 'index, follow';
  }
}
