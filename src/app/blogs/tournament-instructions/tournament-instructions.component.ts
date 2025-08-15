import { ViewportScroller } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-tournament-instructions',
  templateUrl: './tournament-instructions.component.html',
  styleUrl: './tournament-instructions.component.css',
})
export class TournamentInstructionsComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
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
  }
}
