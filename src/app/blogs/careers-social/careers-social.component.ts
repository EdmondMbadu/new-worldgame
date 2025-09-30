import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-careers-social',
  templateUrl: './careers-social.component.html',
  styleUrl: './careers-social.component.css',
})
export class CareersSocialComponent implements OnInit {
  email = 'newworld@newworld-game.org';
  subject = 'NWG Social Media Fellow – Your Name';
  copied = false;

  get mailto() {
    return `mailto:${this.email}?subject=${encodeURIComponent(this.subject)}`;
  }

  ngOnInit(): void {
    window.scroll(0, 0);
  }
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }

  async copyEmail() {
    try {
      await navigator.clipboard.writeText(this.email);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1800);
    } catch {}
  }
}
