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
    public data: DataService,
    private scroller: ViewportScroller
  ) {
    // console.log('curent user email', this.auth.currentUser);
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
    this.aiOptions = data.aiOptions;
  }
}
