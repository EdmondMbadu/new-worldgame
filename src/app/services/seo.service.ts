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
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private defaultConfig: SeoConfig = {
    title: 'NewWorld Game - Solve Global Challenges Through Collaborative Gameplay',
    description: 'NewWorld Game is an educational platform where students and teams collaborate to solve real-world global challenges. Join tournaments, discover solutions, and make a difference.',
    keywords: 'NewWorld Game, New World Game, global challenges, educational game, collaborative learning, sustainability, problem-solving, tournaments, world game, Buckminster Fuller',
    image: 'https://new-worldgame.web.app/assets/img/earth-triangle-test.png',
    url: 'https://new-worldgame.web.app',
    type: 'website',
    author: 'NewWorld Game Team'
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

    // Update title
    if (seoConfig.title) {
      this.titleService.setTitle(seoConfig.title);
    }

    // Update or create meta tags
    this.metaService.updateTag({ name: 'description', content: seoConfig.description || '' });
    this.metaService.updateTag({ name: 'keywords', content: seoConfig.keywords || '' });
    this.metaService.updateTag({ name: 'author', content: seoConfig.author || '' });

    // Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: seoConfig.title || '' });
    this.metaService.updateTag({ property: 'og:description', content: seoConfig.description || '' });
    this.metaService.updateTag({ property: 'og:image', content: seoConfig.image || '' });
    this.metaService.updateTag({ property: 'og:url', content: seoConfig.url || '' });
    this.metaService.updateTag({ property: 'og:type', content: seoConfig.type || 'website' });

    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: seoConfig.title || '' });
    this.metaService.updateTag({ name: 'twitter:description', content: seoConfig.description || '' });
    this.metaService.updateTag({ name: 'twitter:image', content: seoConfig.image || '' });

    // Canonical URL
    this.updateCanonicalUrl(seoConfig.url || '');
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
    const baseUrl = 'https://new-worldgame.web.app';
    const configs: { [key: string]: SeoConfig } = {
      '/': {
        title: 'NewWorld Game - Solve Global Challenges Through Collaborative Gameplay',
        description: 'NewWorld Game is an educational platform inspired by Buckminster Fuller where students collaborate to solve real-world global challenges. Join tournaments, discover solutions, and make a difference.',
        keywords: 'NewWorld Game, New World Game, NWG, global challenges, educational game, collaborative learning, sustainability, world game, Buckminster Fuller, problem solving',
        url: baseUrl,
        type: 'website'
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
      '/plans': {
        title: 'NewWorld Game Pricing Plans - Choose Your Package',
        description: 'Explore NewWorld Game pricing plans for individuals, schools, and organizations. Find the perfect package to start solving global challenges.',
        keywords: 'NewWorld Game pricing, NWG plans, educational platform pricing, school packages, tournament access',
        url: `${baseUrl}/plans`
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
      '/contact-us': {
        title: 'Contact NewWorld Game - Get in Touch',
        description: 'Contact the NewWorld Game team. Questions about our platform, workshops, or tournaments? We\'re here to help.',
        keywords: 'contact NewWorld Game, support, get in touch, NWG contact',
        url: `${baseUrl}/contact-us`
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
        title: 'NewWorld Game Overview - How It Works',
        description: 'Learn how NewWorld Game works. Understand the game mechanics, challenge structure, and collaborative problem-solving approach.',
        keywords: 'NewWorld Game overview, how it works, game mechanics, platform guide',
        url: `${baseUrl}/overview`
      }
    };

    return configs[route] || this.defaultConfig;
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
  }
}
