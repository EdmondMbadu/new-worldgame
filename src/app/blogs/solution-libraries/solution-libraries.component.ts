import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-solution-libraries',
  templateUrl: './solution-libraries.component.html',
  styleUrl: './solution-libraries.component.css',
})
export class SolutionLibrariesComponent {
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    window.scroll(0, 0);
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }
}
