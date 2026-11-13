import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from './services/language.service';
import { SeoService } from './services/seo.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  showRouteLoading = false;

  private routerEventsSub?: Subscription;
  private currentNavigationId?: number;
  private showLoaderTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    languageService: LanguageService,
    private seoService: SeoService,
    private router: Router
  ) {
    // Injecting LanguageService triggers language initialisation once at app bootstrap.
  }

  ngOnInit(): void {
    // Initialize route-based SEO meta tag updates
    this.seoService.initRouteMetaUpdates();
    this.routerEventsSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.startRouteLoading(event.id);
        return;
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.finishRouteLoading(event.id);
      }
    });
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
    clearTimeout(this.showLoaderTimeout);
  }

  private startRouteLoading(navigationId: number): void {
    clearTimeout(this.showLoaderTimeout);
    this.currentNavigationId = navigationId;
    this.showLoaderTimeout = setTimeout(() => {
      this.showRouteLoading = true;
    }, 180);
  }

  private finishRouteLoading(navigationId: number): void {
    if (this.currentNavigationId !== navigationId) {
      return;
    }

    clearTimeout(this.showLoaderTimeout);
    this.showRouteLoading = false;
    this.currentNavigationId = undefined;
  }
}
