import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-state-of-world',
  templateUrl: './state-of-world.component.html',
  styleUrl: './state-of-world.component.css',
})
export class StateOfWorldComponent implements OnInit {
  constructor() {}
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  email: string = 'newworld@newworld-game.org';
}
