import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-sample-preffered-states',
  templateUrl: './sample-preffered-states.component.html',
  styleUrl: './sample-preffered-states.component.css',
})
export class SamplePrefferedStatesComponent {
  email: string = 'newworld@newworld-game.org';
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    window.scroll(0, 0);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
  }
}
