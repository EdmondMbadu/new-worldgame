import { ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-tournament-landing',
  templateUrl: './tournament-landing.component.html',
  styleUrl: './tournament-landing.component.css',
})
export class TournamentLandingComponent {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  aiOptions: any[] = [];
  email: string = 'newworld@newworld-game.org';
  isLoggedIn: boolean = false;
  constructor(
    public auth: AuthService,
    data: DataService,
    private scroller: ViewportScroller
  ) {
    // console.log('curent user email', this.auth.currentUser);
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
    this.aiOptions = data.aiOptions;
  }

  // 👇 REPLACE your old scrollTo method with this one 👇
  scrollTo(event: Event, fragment: string): void {
    event.preventDefault();

    const element = document.getElementById(fragment);
    if (element) {
      // 1. Define the height of your sticky navigation bar
      const offset = 100; // 👈 ADJUST THIS VALUE (in pixels)

      // 2. Calculate the element's position from the top of the page
      const elementPosition =
        element.getBoundingClientRect().top + window.scrollY;

      // 3. Calculate the final scroll position, subtracting the offset
      const offsetPosition = elementPosition - offset;

      // 4. Scroll to the calculated position
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }
}
