import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  Optional,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { json } from 'express';
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
export class LandingPageComponent implements OnInit {
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
        '--after-background-color',
        theme === 'dark' ? 'rgb(15, 23, 42)' : 'white'
      );
    });

    // Check if dark mode was initialized before
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
    this.themeSubscription!.unsubscribe();
  }
}
