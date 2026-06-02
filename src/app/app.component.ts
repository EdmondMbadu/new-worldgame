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
})
export class AppComponent implements OnInit, OnDestroy {
  showRouteLoading = false;

  private routerEventsSub?: Subscription;
  private routeLoadingStart = 0;
  private currentNavigationId?: number;
  private hideLoaderTimeout?: ReturnType<typeof setTimeout>;
  private readonly minRouteLoadingMs = 400;

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
    if (this.hideLoaderTimeout) {
      clearTimeout(this.hideLoaderTimeout);
    }
  }

  private startRouteLoading(navigationId: number): void {
    if (this.hideLoaderTimeout) {
      clearTimeout(this.hideLoaderTimeout);
      this.hideLoaderTimeout = undefined;
    }

    this.currentNavigationId = navigationId;
    this.routeLoadingStart = performance.now();
    this.showRouteLoading = true;
  }

  private finishRouteLoading(navigationId: number): void {
    if (this.currentNavigationId !== navigationId) {
      return;
    }

    const elapsed = performance.now() - this.routeLoadingStart;
    const remaining = Math.max(this.minRouteLoadingMs - elapsed, 0);

    this.hideLoaderTimeout = setTimeout(() => {
      if (this.currentNavigationId === navigationId) {
        this.showRouteLoading = false;
        this.currentNavigationId = undefined;
      }
      this.hideLoaderTimeout = undefined;
    }, remaining);
  }
}
