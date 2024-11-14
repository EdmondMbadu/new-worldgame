import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-primer',

  templateUrl: './primer.component.html',
  styleUrl: './primer.component.css',
})
export class PrimerComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
  }
}
