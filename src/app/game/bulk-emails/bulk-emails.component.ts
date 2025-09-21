import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-bulk-emails',

  templateUrl: './bulk-emails.component.html',
  styleUrl: './bulk-emails.component.css',
})
export class BulkEmailsComponent {
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }
}
