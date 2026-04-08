import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { LanguageService } from 'src/app/services/language.service';
import {
  GLOBAL_LAB_CONTENT,
  GlobalLabContent,
  TeamProfile,
  VideoCard,
} from './global-lab.content';

@Component({
  selector: 'app-global-lab',
  templateUrl: './global-lab.component.html',
  styleUrl: './global-lab.component.css',
})
export class GlobalLabComponent implements OnInit, OnDestroy {
  videoPlaying = false;
  loadedVideoIds: Record<string, boolean> = {};
  reachOutVisa = 'info@1earthgame.org';
  currentLanguage: 'en' | 'fr' = 'en';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private readonly languageService: LanguageService
  ) {}

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    this.currentLanguage = this.resolveLanguage(this.languageService.currentLanguage);
    this.languageService.languageChanges$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ lang }) => {
        this.currentLanguage = this.resolveLanguage(lang);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get copy(): GlobalLabContent {
    return GLOBAL_LAB_CONTENT[this.currentLanguage];
  }

  get videoCards(): VideoCard[] {
    return this.copy.videos.cards;
  }

  get aiOptions(): TeamProfile[] {
    return this.copy.aiTeam.members;
  }

  playGalleryVideo(id: string): void {
    this.loadedVideoIds[id] = true;
  }

  trustedVideoUrl(src: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(src);
  }

  private resolveLanguage(language: string): 'en' | 'fr' {
    return language === 'fr' ? 'fr' : 'en';
  }
}
