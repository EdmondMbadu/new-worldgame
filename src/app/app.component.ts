import { Component } from '@angular/core';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(languageService: LanguageService) {
    // Injecting LanguageService triggers language initialisation once at app bootstrap.
  }
}
