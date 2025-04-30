import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
interface Video {
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
  }
  // the “main” video shown up top
  mainVideo: Video = {
    title: 'NewWorld Game News',
    url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FWelcome%20GSL%202025v2.mp4?alt=media&token=37dab895-9458-4865-a7bf-cc7ad853cf80',
  };
  previousVideos: Video[] = [
    // add more as needed:
    {
      title: 'Mandy Welcome Participants to GSL 2025',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGlobal%20Solutions%20Lab%20Welcome%20AI_1.mp4?alt=media&token=66be6bb7-8cd6-4ab4-a78e-85ed3c35fa2e',
    },
    // { title: 'Some Other AI Update', url: 'https://…' }
  ];
  selectVideo(vid: Video) {
    this.mainVideo = vid;
    // scroll back up so the user sees the new “main” video immediately
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }
}
