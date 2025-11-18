import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Optional,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { AvatarRegistryService } from 'src/app/services/avatar-registry.service';
import { AIOption, DataService } from 'src/app/services/data.service';

declare var am4core: any;
declare var am4maps: any;
declare var am4geodata_worldLow: any;
declare var am4themes_animated: any;
@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
})
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  themeSubscription?: Subscription;
  aiOptions: AIOption[] = [];
  constructor(
    private router: Router,
    private data: DataService,
    @Optional() private avatars?: AvatarRegistryService,
    @Optional() private auth?: AuthService
  ) {}
  colorTheme: string = 'rgb(15, 23, 42)';
  ngOnInit(): void {
    this.aiOptions = this.data.aiOptions;
    window.scroll(0, 0);
    this.themeSubscription = this.data.currentTheme.subscribe((theme) => {
      document.documentElement.style.setProperty(
        '--cursor-color',
        theme === 'dark' ? 'rgb(45 212 191)' : 'rgb(13 148 136)'
      );
    });
  }

  @ViewChild('typedWord', { static: true }) typedWord:
    | ElementRef<HTMLSpanElement>
    | undefined;

  private typingTimer?: ReturnType<typeof setTimeout>;
  private typingWords = ['Design', 'Write', 'Envision', 'Build', 'Share'];
  private typingIndex = 0;
  private typingCharIndex = 0;
  private deleting = false;

  ngAfterViewInit(): void {
    this.runTypewriter();
  }

  private runTypewriter() {
    if (!this.typedWord) {
      return;
    }

    const currentWord = this.typingWords[this.typingIndex];
    this.typingCharIndex += this.deleting ? -1 : 1;
    const nextValue = currentWord.slice(0, this.typingCharIndex);
    this.typedWord.nativeElement.textContent = nextValue;

    let delay = this.deleting ? 110 : 230;

    if (!this.deleting && nextValue === currentWord) {
      delay = 1600;
      this.deleting = true;
    } else if (this.deleting && nextValue === '') {
      this.deleting = false;
      this.typingIndex = (this.typingIndex + 1) % this.typingWords.length;
      delay = 360;
    }

    this.typingTimer = setTimeout(() => this.runTypewriter(), delay);
  }

  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  openAvatar(ai: AIOption) {
    const slug = this.slugify(ai.name);
    const destination = `/avatar/${slug}`;

    if (!this.auth?.currentUser?.uid) {
      this.auth?.setRedirectUrl(destination);
      sessionStorage.setItem('redirectTo', destination);
    }

    const avatarState = this.avatars?.getBySlug(slug) ?? ai;
    this.router.navigate(['/avatar', slug], { state: { avatar: avatarState } });
  }
  @ViewChild('globeContainer', { static: true }) globeContainer:
    | ElementRef
    | undefined;

  ngOnDestroy() {
    this.themeSubscription?.unsubscribe();
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
  }
}
