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
