import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
interface Video {
  id?: string; // ← NEW
  title: string;
  url: string;
}
@Component({
  selector: 'app-nwg-news',

  templateUrl: './nwg-news.component.html',
  styleUrl: './nwg-news.component.css',
})
export class NwgNewsComponent implements OnInit {
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
      id: 'sofia',
      title: 'Global Solutions Lab 2025 Progress - Day 5 ',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day-5.mp4?alt=media&token=ef413d87-6f54-42ab-a809-1d29e4b9065b',
    },
    {
      id: 'li',
      title: 'Global Solutions Lab 2025 Progress - Day 4 ',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%20Day%20-4.mp4?alt=media&token=2fadd75f-0ae3-41f8-92bf-1f21c8123eb9',
    },
    {
      id: 'elena-georgian',
      title:
        'Global Solutions Lab 2025 Progress - Day 4 - Short Message in Georgian',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%20Day%20-%20Georgia.mp4?alt=media&token=cbece233-ddbf-4735-bc77-d5afbb7f78b3',
    },
    {
      id: 'georgia',
      title: 'Global Solutions Lab 2025 Progress - Day 3',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day%203.mp4?alt=media&token=d8f8f632-297c-4d0f-a629-3e55af34d17c',
    },
    {
      id: 'elena',
      title: 'Global Solutions Lab 2025 Progress - Day 2',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day%202.mp4?alt=media&token=a12dd4dc-8e9e-492d-97ec-6abdaca0c797',
    },
    {
      id: 'mandy',
      title: 'Mandy Welcome Participants to GSL 2025',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGlobal%20Solutions%20Lab%20Welcome%20AI_1.mp4?alt=media&token=66be6bb7-8cd6-4ab4-a78e-85ed3c35fa2e',
    },
    {
      id: 'renaldo',
      title: 'NewWorld Game News',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FWelcome%20GSL%202025v2.mp4?alt=media&token=37dab895-9458-4865-a7bf-cc7ad853cf80',
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
}
