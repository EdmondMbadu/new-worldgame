import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GSL_2027_DATES } from 'src/app/utils/gsl-workshop-dates';

@Component({
  selector: 'app-landing-alternative',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-alternative.component.html',
  styleUrls: [
    './landing-alternative.component.css',
    './landing-alternative.sections.css',
    './landing-alternative.responsive.css',
    './landing-alternative.introduction.css',
  ],
})
export class LandingAlternativeComponent implements OnInit, OnDestroy {
  readonly workshopDates = GSL_2027_DATES;
  @ViewChild('filmDialog') filmDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('film') film?: ElementRef<HTMLVideoElement>;
  menuOpen = false;
  activeSlide = 0;
  rotationEnabled = true;
  carouselHovered = false;
  carouselFocused = false;
  filmOpen = false;
  selectedSdg = 13;
  filmDuration = '';
  introductionDuration = '0:28';
  activeVideo: 'film' | 'introduction' = 'film';
  readonly videos = {
    film: {
      title: 'The Global Solutions Lab film',
      src: 'assets/videos/global-solutions-lab-film-v3.mp4',
      poster: 'assets/img/global-solutions-lab-film-poster-v2.jpg',
    },
    introduction: {
      title: 'Start here: your first community solution',
      src: 'assets/videos/landing-alternative/start-here-avatar.mp4',
      poster: 'assets/img/landing-alternative/start-here-avatar.jpg',
    },
  };
  readonly typingWords = ['Envision', 'Build', 'Share', 'Develop', 'Design'];
  typedWord = this.typingWords[0];
  readonly year = new Date().getFullYear();
  private typingTimer?: ReturnType<typeof setTimeout>;
  private typingIndex = 0;
  private typingCharIndex = this.typedWord.length;
  private deleting = true;
  private rotationTimer?: ReturnType<typeof setInterval>;
  private returnFocus?: HTMLElement;
  private previousOverflow = '';
  private motionPreference?: MediaQueryList;
  private readonly motionChanged = (event: MediaQueryListEvent) => {
    if (event.matches) this.rotationEnabled = false;
    this.restartTypewriter(event.matches);
  };

  readonly slides = [
    { src: 'assets/img/landing-alternative/small-team.jpg', alt: 'Four young adults sharing ideas around a laptop in a sunlit community studio.', label: 'A few curious minds. A shared possibility.' },
    { src: 'assets/img/landing-alternative/individual.jpg', alt: 'A young woman exploring a community garden idea at her sunny home desk.', label: 'One person. An idea worth exploring.' },
    { src: 'assets/img/landing-alternative/community.jpg', alt: 'Neighbors of different ages and backgrounds exchanging ideas at an accessible workshop table.', label: 'Different perspectives. Common ground.' },
    { src: 'assets/img/landing-alternative/classroom.jpg', alt: 'University students and their professor developing a project together in a design studio.', label: 'A classroom. A world of possibilities.' },
  ];
  readonly sdgs = [
    'No Poverty', 'Zero Hunger', 'Good Health', 'Quality Education', 'Gender Equality',
    'Clean Water', 'Clean Energy', 'Decent Work', 'Industry & Innovation', 'Reduced Inequalities',
    'Sustainable Cities', 'Responsible Consumption', 'Climate Action', 'Life Below Water',
    'Life on Land', 'Peace & Justice', 'Partnerships',
  ];
  readonly terms = [
    { weeks: 'Weeks 1–3', title: 'Frame the problem' },
    { weeks: 'Weeks 4–7', title: 'Research & design' },
    { weeks: 'Weeks 8–11', title: 'Plan & prototype' },
    { weeks: 'Weeks 12–15', title: 'Present & publish' },
  ];

  get sdgInquiryHref(): string {
    const subject = `Custom SDG ${this.selectedSdg} Lab: ${this.sdgs[this.selectedSdg - 1]}`;
    const body = `Hello, I would like to discuss a ${this.sdgs[this.selectedSdg - 1]} Lab (SDG ${this.selectedSdg}).`;
    return `mailto:newworld@newworld-game.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  ngOnInit(): void {
    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.rotationEnabled = !this.motionPreference.matches;
    this.restartTypewriter(this.motionPreference.matches);
    this.motionPreference.addEventListener('change', this.motionChanged);
    this.rotationTimer = setInterval(() => {
      if (this.rotationEnabled && !this.carouselHovered && !this.carouselFocused && !this.filmOpen && !document.hidden) {
        this.activeSlide = (this.activeSlide + 1) % this.slides.length;
      }
    }, 7000);
  }

  private restartTypewriter(reducedMotion: boolean): void {
    clearTimeout(this.typingTimer);
    this.typingIndex = 0;
    this.typedWord = this.typingWords[0];
    this.typingCharIndex = this.typedWord.length;
    this.deleting = true;
    if (!reducedMotion) {
      this.typingTimer = setTimeout(() => this.runTypewriter(), 1600);
    }
  }

  private runTypewriter(): void {
    const word = this.typingWords[this.typingIndex];
    this.typingCharIndex += this.deleting ? -1 : 1;
    this.typedWord = word.slice(0, this.typingCharIndex);

    let delay = this.deleting ? 110 : 230;
    if (!this.deleting && this.typedWord === word) {
      this.deleting = true;
      delay = 1600;
    } else if (this.deleting && this.typedWord === '') {
      this.deleting = false;
      this.typingIndex = (this.typingIndex + 1) % this.typingWords.length;
      delay = 360;
    }
    this.typingTimer = setTimeout(() => this.runTypewriter(), delay);
  }

  selectSlide(index: number): void {
    this.activeSlide = (index + this.slides.length) % this.slides.length;
    this.rotationEnabled = false;
  }

  carouselFocusOut(event: FocusEvent): void {
    this.carouselFocused = !!event.relatedTarget && (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node);
  }

  openFilm(event?: MouseEvent): void {
    this.openVideo('film', event?.currentTarget as HTMLElement | undefined);
  }

  openIntroduction(event?: MouseEvent): void {
    this.openVideo('introduction', event?.currentTarget as HTMLElement | undefined);
  }

  private openVideo(kind: 'film' | 'introduction', trigger?: HTMLElement): void {
    const dialog = this.filmDialog?.nativeElement;
    const video = this.film?.nativeElement;
    if (!dialog || !video) return;
    this.returnFocus = trigger ?? document.activeElement as HTMLElement;
    this.activeVideo = kind;
    const media = this.videos[kind];
    if (video.getAttribute('src') !== media.src) {
      video.src = media.src;
      video.poster = media.poster;
      video.load();
    }
    this.filmOpen = true;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    void video.play().catch(() => { /* Native play controls remain available. */ });
  }

  closeFilm(): void {
    this.filmDialog?.nativeElement.close();
    this.onFilmClosed();
  }

  onFilmClosed(): void {
    if (!this.filmOpen) return;
    this.film?.nativeElement.pause();
    this.filmOpen = false;
    document.body.style.overflow = this.previousOverflow;
    this.returnFocus?.focus();
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target !== this.filmDialog?.nativeElement) return;
    const rect = this.filmDialog.nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.closeFilm();
  }

  setFilmDuration(): void {
    const seconds = Math.floor(this.film?.nativeElement.duration || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    if (this.activeVideo === 'film') {
      this.filmDuration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
      const duration = Math.ceil(this.film?.nativeElement.duration || 0);
      this.introductionDuration = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
    }
  }

  @HostListener('document:keydown.escape')
  closeMenu(): void { this.menuOpen = false; }

  ngOnDestroy(): void {
    clearTimeout(this.typingTimer);
    clearInterval(this.rotationTimer);
    this.motionPreference?.removeEventListener('change', this.motionChanged);
    if (this.filmOpen) {
      this.film?.nativeElement.pause();
      document.body.style.overflow = this.previousOverflow;
    }
  }
}
