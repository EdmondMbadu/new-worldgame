import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
interface Video {
  id?: string; // ← NEW
  title: string;
  url: string;
  speaker?: string; // ← NEW
  thumbUrl?: string; // ← NEW (speaker photo)
}
@Component({
  selector: 'app-nwg-news',

  templateUrl: './nwg-news.component.html',
  styleUrl: './nwg-news.component.css',
})
export class NwgNewsComponent implements OnInit {
  readonly DEFAULT_THUMB = '../../../assets/img/design-science.jpg'; // add a simple fallback
  @ViewChild('heroVideo') heroVideo!: ElementRef<HTMLVideoElement>;
  isMuted = false;

  showUnmute = false;
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
  // the “main” video shown up top
  mainVideo!: Video;
  previousVideos: Video[] = [];

  /** thumbnails under “Previous AI News”  */
  allVideos: Video[] = [
    {
      id: 'tane-kahu-univ',
      title: `NewWorld Game: Changing the World`,
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FIB%20Flyer-%20Tane%20Kahu.mp4?alt=media&token=438a21d0-82a9-4043-ad20-0b004d895101',
      speaker: 'Tāne Kahu',
      thumbUrl: '../../../assets/img/tane-agent.png', // ← put your real URL
    },
    {
      id: 'tane-kahu',
      title: `NewWorld Game Changemakers Tournament 2025–26  `,
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FIB%20Flyer-%20Tane%20Kahu.mp4?alt=media&token=438a21d0-82a9-4043-ad20-0b004d895101',
      speaker: 'Tāne Kahu',
      thumbUrl: '../../../assets/img/tane-agent.png', // ← put your real URL
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  ngAfterViewInit() {
    const v = this.heroVideo.nativeElement;
    v.setAttribute('playsinline', 'true');
    v.setAttribute('webkit-playsinline', 'true');

    // Try autoplay WITH sound first (Chrome may allow; Safari won’t)
    this.tryAutoplayWithSound(v);

    // Optional: if browser still requires a gesture, unmute on first click
    const onFirstClick = () => {
      if (this.showUnmute) this.unmute();
      document.removeEventListener('click', onFirstClick, {
        capture: true,
      } as any);
    };
    document.addEventListener('click', onFirstClick, { capture: true } as any);
  }

  private async tryAutoplayWithSound(v: HTMLVideoElement) {
    try {
      v.muted = false;
      await v.play(); // ✅ Chrome (if allowed) plays with sound
      this.showUnmute = false;
    } catch {
      // ❌ Blocked (Safari/iOS or Chrome without engagement) → fallback muted
      try {
        v.muted = true;
        await v.play(); // ✅ Autoplay muted
        this.showUnmute = true; // show button to enable sound
      } catch {
        // If even muted autoplay is blocked, user will press Play controls
        this.showUnmute = true;
      }
    }
  }

  unmute() {
    const v = this.heroVideo.nativeElement;
    v.muted = false;
    v.volume = 1;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    this.showUnmute = false;
  }
}
