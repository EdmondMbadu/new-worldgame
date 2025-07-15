import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-tournament-landing',
  templateUrl: './tournament-landing.component.html',
  styleUrl: './tournament-landing.component.css',
})
export class TournamentLandingComponent {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  email: string = 'newworld@newworld-game.org';
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService) {
    // console.log('curent user email', this.auth.currentUser);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
  }
}
