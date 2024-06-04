import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrl: './tournament.component.css',
})
export class TournamentComponent implements OnInit {
  constructor() {}
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  email: string = 'newworld@newworld-game.org';
}
