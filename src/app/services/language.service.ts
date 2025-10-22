import { Injectable } from '@angular/core';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom } from 'rxjs';

const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_STORAGE_KEY = 'nwg_language';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly languageOptionsList = [
    { code: 'en', labelKey: 'app.language.english' },
    { code: 'fr', labelKey: 'app.language.french' },
  ];

  private readonly supportedLanguages: string[] = this.languageOptionsList.map(
    (option) => option.code
  );

  constructor(private readonly translateService: TranslateService) {
    this.translateService.addLangs(this.supportedLanguages);
    this.translateService.setDefaultLang(DEFAULT_LANGUAGE);
  }

  use(language: string) {
    const nextLanguage = this.isSupported(language)
      ? language
      : DEFAULT_LANGUAGE;
    this.translateService.use(nextLanguage);
    this.applySideEffects(nextLanguage);
  }

  get currentLanguage(): string {
    return this.translateService.currentLang || DEFAULT_LANGUAGE;
  }

  get languageChanges$(): Observable<LangChangeEvent> {
    return this.translateService.onLangChange;
  }

  get availableLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  getLanguageOptions(): { code: string; labelKey: string }[] {
    return this.languageOptionsList.map((option) => ({ ...option }));
  }

  private isSupported(language: string): boolean {
    return this.supportedLanguages.includes(language);
  }

  initialize(): Promise<void> {
    const initialLanguage = this.resolveInitialLanguage();
    this.applySideEffects(initialLanguage);
    return firstValueFrom(this.translateService.use(initialLanguage)).then(
      () => void 0,
      () => void 0
    );
  }

  private resolveInitialLanguage(): string {
    const storedLanguage = this.getStoredLanguage();
    const browserLanguage = this.translateService.getBrowserLang();

    if (storedLanguage && this.isSupported(storedLanguage)) {
      return storedLanguage;
    }

    if (browserLanguage && this.isSupported(browserLanguage)) {
      return browserLanguage;
    }

    return DEFAULT_LANGUAGE;
  }

  private getStoredLanguage(): string | null {
    try {
      return localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private persistLanguage(language: string) {
    try {
      localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Non-blocking: ignore storage errors (e.g., private browsing)
    }
  }

  private updateDocumentLanguage(language: string) {
    try {
      document?.documentElement?.setAttribute('lang', language);
    } catch {
      // Ignore DOM access errors (e.g., during server-side rendering)
    }
  }

  private applySideEffects(language: string) {
    this.updateDocumentLanguage(language);
    this.persistLanguage(language);
  }
}
