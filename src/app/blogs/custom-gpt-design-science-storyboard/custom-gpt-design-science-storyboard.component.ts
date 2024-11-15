import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-custom-gpt-design-science-storyboard',

  templateUrl: './custom-gpt-design-science-storyboard.component.html',
  styleUrl: './custom-gpt-design-science-storyboard.component.css',
})
export class CustomGptDesignScienceStoryboardComponent {
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    window.scroll(0, 0);
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }
}
