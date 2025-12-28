import { Component, OnInit } from '@angular/core';
import { LanguageService } from './services/language.service';
import { SeoService } from './services/seo.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  constructor(
    languageService: LanguageService,
    private seoService: SeoService
  ) {
    // Injecting LanguageService triggers language initialisation once at app bootstrap.
  }

  ngOnInit(): void {
    // Initialize route-based SEO meta tag updates
    this.seoService.initRouteMetaUpdates();
  }
}
