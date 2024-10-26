import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService) {
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
  }
}
