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
  private readonly defaultImage = `${this.primaryDomain}/assets/img/earth-triangle-test.png`;

  private defaultConfig: SeoConfig = {
    title: 'NewWorld Game - Solve Global Challenges Through Collaborative Gameplay',
    description: 'NewWorld Game is an educational platform where students, educators, and teams collaborate to solve real-world global challenges through design science, AI guidance, and structured programs.',
    keywords: 'NewWorld Game, New World Game, global challenges, educational game, collaborative learning, sustainability, problem-solving, tournaments, world game, Buckminster Fuller',
    image: this.defaultImage,
    url: `${this.primaryDomain}/`,
    type: 'website',
    author: 'NewWorld Game Team',
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
    this.metaService.updateTag({ property: 'og:site_name', content: 'NewWorld Game' });
    this.metaService.updateTag({ property: 'og:image:alt', content: 'NewWorld Game - educational platform for solving global challenges' });

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
        title: 'NewWorld Game - Solve Global Challenges Through Collaborative Gameplay',
        description: 'NewWorld Game is an educational platform inspired by Buckminster Fuller where students, educators, and communities collaborate to solve global challenges through AI guidance, design science, tournaments, and solution-building programs.',
        keywords: 'NewWorld Game, New World Game, NWG, global challenges, educational platform, Buckminster Fuller, design science, sustainability education, collaborative learning, AI problem solving',
        url: `${baseUrl}/`,
        type: 'website'
      },
      '/get-started': {
        title: 'Get Started with NewWorld Game | Global Challenge Learning Platform',
        description: 'Start using NewWorld Game. Explore the onboarding path for students, educators, and partners who want to solve global challenges through collaborative gameplay and design science.',
        keywords: 'get started NewWorld Game, NewWorld Game onboarding, start New World Game, design science learning platform',
        url: `${baseUrl}/get-started`
      },
      '/welcome': {
        title: 'Get Started with NewWorld Game | Global Challenge Learning Platform',
        description: 'Start using NewWorld Game. Explore the onboarding path for students, educators, and partners who want to solve global challenges through collaborative gameplay and design science.',
        keywords: 'get started NewWorld Game, NewWorld Game onboarding, start New World Game, design science learning platform',
        url: `${baseUrl}/get-started`
      },
      '/about': {
        title: 'About NewWorld Game | Buckminster Fuller Inspired Learning Platform',
        description: 'Learn what NewWorld Game is, how it works, and how it brings Buckminster Fuller’s World Game ideas into modern education, collaboration, and global problem solving.',
        keywords: 'about NewWorld Game, Buckminster Fuller world game, design science education, global problem solving platform',
        url: `${baseUrl}/about`
      },
      '/landing': {
        title: 'Welcome to NewWorld Game - Transform Learning Through Global Problem Solving',
        description: 'Engage students in solving real-world challenges. NewWorld Game combines education, collaboration, and innovation to create meaningful learning experiences.',
        keywords: 'NewWorld Game, educational platform, student engagement, global learning, collaborative problem solving',
        url: `${baseUrl}/landing`
      },
      '/landing-college': {
        title: 'NewWorld Game for Colleges - University-Level Global Challenge Platform',
        description: 'Bring NewWorld Game to your college or university. Engage students in collaborative problem-solving for real-world global challenges.',
        keywords: 'NewWorld Game college, university game, higher education, collaborative learning, global challenges university',
        url: `${baseUrl}/landing-college`
      },
      '/landing-un': {
        title: 'NewWorld Game & United Nations SDGs - Sustainable Development Goals Platform',
        description: 'Align your learning with UN Sustainable Development Goals through NewWorld Game. Tackle global challenges connected to the UN SDGs.',
        keywords: 'NewWorld Game UN, SDGs, sustainable development goals, global challenges, United Nations education',
        url: `${baseUrl}/landing-un`
      },
      '/landing-community': {
        title: 'NewWorld Game Community - Join Global Problem Solvers',
        description: 'Join the NewWorld Game community of educators, students, and problem solvers working together to address global challenges.',
        keywords: 'NewWorld Game community, global problem solvers, collaborative learning community, educational network',
        url: `${baseUrl}/landing-community`
      },
      '/pricing': {
        title: 'NewWorld Game Pricing Plans | Programs for Schools, Universities, and Teams',
        description: 'Explore NewWorld Game pricing and program options for schools, universities, nonprofits, and organizations ready to run workshops, labs, and tournaments.',
        keywords: 'NewWorld Game pricing, NewWorld Game plans, educational platform pricing, school packages, university challenge platform',
        url: `${baseUrl}/pricing`
      },
      '/plans': {
        title: 'NewWorld Game Pricing Plans | Programs for Schools, Universities, and Teams',
        description: 'Explore NewWorld Game pricing and program options for schools, universities, nonprofits, and organizations ready to run workshops, labs, and tournaments.',
        keywords: 'NewWorld Game pricing, NewWorld Game plans, educational platform pricing, school packages, university challenge platform',
        url: `${baseUrl}/pricing`
      },
      '/workshop': {
        title: 'NewWorld Game Workshop - Interactive Learning Experience',
        description: 'Join our NewWorld Game workshop and learn how to facilitate collaborative problem-solving sessions for global challenges.',
        keywords: 'NewWorld Game workshop, educational workshop, facilitator training, problem-solving workshop',
        url: `${baseUrl}/workshop`
      },
      '/tournament-landing': {
        title: 'NewWorld Game Tournaments - Compete to Solve Global Challenges',
        description: 'Participate in NewWorld Game tournaments. Teams compete to develop the best solutions for real-world global challenges.',
        keywords: 'NewWorld Game tournament, global challenge competition, student tournament, problem-solving competition',
        url: `${baseUrl}/tournament-landing`
      },
      '/our-team': {
        title: 'Our Team - NewWorld Game Leadership & Creators',
        description: 'Meet the NewWorld Game team dedicated to creating innovative educational experiences for global problem-solving.',
        keywords: 'NewWorld Game team, about us, educational innovators, game creators',
        url: `${baseUrl}/our-team`
      },
      '/contact': {
        title: 'Contact NewWorld Game | Partnerships, Workshops, and Support',
        description: 'Contact the NewWorld Game team for partnerships, school programs, workshops, tournaments, and platform support.',
        keywords: 'contact NewWorld Game, support, workshops, partnerships, New World Game contact',
        url: `${baseUrl}/contact`
      },
      '/contact-us': {
        title: 'Contact NewWorld Game | Partnerships, Workshops, and Support',
        description: 'Contact the NewWorld Game team for partnerships, school programs, workshops, tournaments, and platform support.',
        keywords: 'contact NewWorld Game, support, workshops, partnerships, New World Game contact',
        url: `${baseUrl}/contact`
      },
      '/blogs/features': {
        title: 'NewWorld Game Features - Platform Capabilities & Tools',
        description: 'Discover all the features of NewWorld Game including AI avatars, solution libraries, collaborative tools, and tournament systems.',
        keywords: 'NewWorld Game features, platform tools, AI avatars, solution library, collaboration tools',
        url: `${baseUrl}/blogs/features`
      },
      '/ask-bucky': {
        title: 'Ask Bucky - AI Assistant for Global Challenges | NewWorld Game',
        description: 'Chat with Bucky, our AI assistant inspired by Buckminster Fuller. Get insights on global challenges and sustainable solutions.',
        keywords: 'Ask Bucky, AI assistant, Buckminster Fuller AI, global challenges chatbot, NewWorld Game AI',
        url: `${baseUrl}/ask-bucky`
      },
      '/bucky': {
        title: 'Meet Bucky - Your AI Guide to Global Problem Solving',
        description: 'Bucky is your AI companion for exploring global challenges and discovering innovative solutions in NewWorld Game.',
        keywords: 'Bucky AI, virtual assistant, Buckminster Fuller, AI guide, problem solving assistant',
        url: `${baseUrl}/bucky`
      },
      '/privacy': {
        title: 'Privacy Policy - NewWorld Game',
        description: 'Read NewWorld Game\'s privacy policy to understand how we protect and handle your data.',
        keywords: 'privacy policy, data protection, NewWorld Game privacy, user data',
        url: `${baseUrl}/privacy`
      },
      '/overview': {
        title: 'About NewWorld Game | Buckminster Fuller Inspired Learning Platform',
        description: 'Learn what NewWorld Game is, how it works, and how it brings Buckminster Fuller’s World Game ideas into modern education, collaboration, and global problem solving.',
        keywords: 'about NewWorld Game, Buckminster Fuller world game, design science education, global problem solving platform',
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
