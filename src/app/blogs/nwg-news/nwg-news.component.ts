import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
interface Video {
  id?: string; // ← NEW
  title: string;
  url: string;
  speaker?: string; // ← NEW
  thumbUrl?: string; // ← NEW (speaker photo)
  tagline?: string;
}
@Component({
  selector: 'app-nwg-news',

  templateUrl: './nwg-news.component.html',
  styleUrl: './nwg-news.component.css',
})
export class NwgNewsComponent implements OnInit, AfterViewInit {
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;
  readonly DEFAULT_THUMB = '../../../assets/img/design-science.jpg'; // add a simple fallback
  showUnmute = false;
  readonly DEFAULT_TAGLINE =
    'Stay up to date with solutions being developed in real time';

  get heroTagline(): string {
    const t = this.mainVideo?.tagline?.trim();
    return t ? t : this.DEFAULT_TAGLINE;
  }

  ngOnInit(): void {
    window.scroll(0, 100);

    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
    /* pick the hero video from the URL or fall back to the first one */
    this.route.queryParamMap.subscribe((params) => {
      const requestedId = params.get('v');
      const candidate =
        this.allVideos.find((v) => v.id === requestedId) ?? this.allVideos[0];
      this.setMainVideo(candidate, /* updateUrl = */ false);
    });
  }

  ngAfterViewInit(): void {
    // First load (direct paste/refresh)
    queueMicrotask(() => this.autoPlayWithAudio());
  }

  // the “main” video shown up top
  mainVideo!: Video;
  previousVideos: Video[] = [];

  /** thumbnails under “Previous AI News”  */
  allVideos: Video[] = [
    {
      id: 'tane-kahu',
      title: `NewWorld Game: Changing the World`,
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FIB%20Flyer-%20Tane%20Kahu.mp4?alt=media&token=438a21d0-82a9-4043-ad20-0b004d895101',
      speaker: 'Tāne Kahu',
      thumbUrl: '../../../assets/img/tane-agent.png', // ← put your real URL
      tagline: 'NewWorld Game AI colleague Tane Kahu',
    },
    {
      id: 'sofia-change',
      title: `NewWorld Game Changemakers Tournament 2025–26`,
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FFor%20Tachers.%20_TN.mp4?alt=media&token=3d72ed6d-9baa-46e7-b4fc-801dcaba9208',
      speaker: 'Sofia ',
      thumbUrl: '../../../assets/img/sofia-agent.png',
    },
    {
      id: 'sofia',
      title: 'Global Solutions Lab 2025 Progress - Day 5 ',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day-5.mp4?alt=media&token=ef413d87-6f54-42ab-a809-1d29e4b9065b',
      speaker: 'Sofia ',
      thumbUrl: '../../../assets/img/sofia-agent.png',
    },
    {
      id: 'li',
      title: 'Global Solutions Lab 2025 Progress - Day 4 ',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%20Day%20-4.mp4?alt=media&token=2fadd75f-0ae3-41f8-92bf-1f21c8123eb9',
      speaker: 'Li',
      thumbUrl: '../../../assets/img/li-agent.png',
    },
    {
      id: 'elena-georgian',
      title:
        'Global Solutions Lab 2025 Progress - Day 4 - Short Message in Georgian',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%20Day%20-%20Georgia.mp4?alt=media&token=cbece233-ddbf-4735-bc77-d5afbb7f78b3',
      speaker: 'Elena',
      thumbUrl: '../../../assets/img/elena-agent.png',
    },
    {
      id: 'georgia',
      title: 'Global Solutions Lab 2025 Progress - Day 3',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day%203.mp4?alt=media&token=d8f8f632-297c-4d0f-a629-3e55af34d17c',

      speaker: 'Georgia',
      thumbUrl: '../../../assets/img/georgia-avatar.png',
    },
    {
      id: 'elena',
      title: 'Global Solutions Lab 2025 Progress - Day 2',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day%202.mp4?alt=media&token=a12dd4dc-8e9e-492d-97ec-6abdaca0c797',
      speaker: 'Elena',
      thumbUrl: '../../../assets/img/elena-agent.png',
    },
    {
      id: 'mandy',
      title: 'Mandy Welcome Participants to GSL 2025',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGlobal%20Solutions%20Lab%20Welcome%20AI_1.mp4?alt=media&token=66be6bb7-8cd6-4ab4-a78e-85ed3c35fa2e',
      speaker: 'Mandy',
      thumbUrl: '../../../assets/img/elena-avatar.png',
    },
    {
      id: 'renaldo',
      title: 'NewWorld Game News',

      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FWelcome%20GSL%202025v2.mp4?alt=media&token=37dab895-9458-4865-a7bf-cc7ad853cf80',
      speaker: 'Renaldo',
      thumbUrl: '../../../assets/img/renaldo.webp',
    },
  ];

  isLoggedIn: boolean = false;
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private route: ActivatedRoute,
    private router: Router
  ) {}
  /** user clicked a thumbnail */
  selectVideo(vid: Video) {
    this.setMainVideo(vid, /* updateUrl = */ true);
  }

  onImageError(e: Event) {
    (e.target as HTMLImageElement).src = this.DEFAULT_THUMB;
  }

  trackById(_: number, v: Video) {
    return v.id;
  }

  /** central place to swap hero + refresh thumbnail list */
  private setMainVideo(vid: Video, updateUrl: boolean) {
    this.mainVideo = vid;
    this.previousVideos = this.allVideos.filter((v) => v.id !== vid.id);

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { v: vid.id },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    // Wait for Angular to bind new [src], then attempt autoplay+audio again
    setTimeout(() => this.autoPlayWithAudio(), 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Called when metadata for the current video is loaded
  onLoadedMeta() {
    this.autoPlayWithAudio();
  }

  /** Try autoplay -> then unmute with sound. If blocked, arm one-gesture unlock. */
  private async autoPlayWithAudio() {
    const v = this.heroVideo?.nativeElement;
    if (!v) return;

    // 1) Ensure we can start anywhere (Safari/Chrome): start muted+inline
    v.muted = true;
    v.autoplay = true;
    v.playsInline = true;

    try {
      await v.play();
    } catch {
      /* ignore */
    }

    // 2) Immediately attempt to enable sound
    v.muted = false;
    v.volume = 1.0;
    try {
      await v.play(); // succeeds if browser allows sound here
      this.showUnmute = false;
    } catch (err) {
      // 3) Sound blocked → require *first* user gesture anywhere
      this.showUnmute = true;
      const unlock = () => this.unmuteAndPlay();
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });

      // Retry when tab becomes visible again (e.g., from URL paste switching tabs)
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.visibilityState === 'visible') this.autoPlayWithAudio();
        },
        { once: true }
      );
    }
  }

  unmuteAndPlay() {
    const v = this.heroVideo?.nativeElement;
    if (!v) return;
    v.muted = false;
    v.volume = 1.0;
    v.play().finally(() => (this.showUnmute = false));
  }
}
