import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-nwg-news',

  templateUrl: './nwg-news.component.html',
  styleUrl: './nwg-news.component.css',
})
export class NwgNewsComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 100);
  }
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }
  gAfterViewInit(): void {
    // const video: HTMLVideoElement | null = document.getElementById(
    //   'myVideo'
    // ) as HTMLVideoElement;
    // if (video) {
    //   video
    //     .play()
    //     .then(() => {
    //       // If autoplay works, try unmuting (Safari may block this)
    //       video.muted = false;
    //     })
    //     .catch((error) => {
    //       console.log(
    //         'Autoplay blocked on Safari. Waiting for user interaction.'
    //       );
    //     });
    //   // Unmute and play on first user interaction (Safari Fix)
    //   document.addEventListener('click', function once() {
    //     video.muted = false;
    //     video.play();
    //     document.removeEventListener('click', once);
    //   });
    // }
  }
}
