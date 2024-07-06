import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrl: './tournament.component.css',
})
export class TournamentComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  email: string = 'newworld@newworld-game.org';
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    // console.log('curent user email', this.auth.currentUser);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
  }
}
