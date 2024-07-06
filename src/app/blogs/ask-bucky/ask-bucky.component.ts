import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-ask-bucky',
  templateUrl: './ask-bucky.component.html',
  styleUrl: './ask-bucky.component.css',
})
export class AskBuckyComponent {
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
