import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-template-thanks',

  templateUrl: './template-thanks.component.html',
  styleUrl: './template-thanks.component.css',
})
export class TemplateThanksComponent implements OnInit {
  @Input() paragraph: string =
    'Thank you for registering for the 2025 Global Solutoins Lab! We’re thrilled to have you join us from June 17-21, 2025. Get ready for an inspiring lab dedicated to shaping a sustainable future together!';
  @Input() title: string = 'Registration Complete!';
  isLoggedIn: boolean = false;
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private router: Router
  ) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }
  ourEmail: string = 'info@newworld-game.org';
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
  goToSignUp(): void {
    // Replace '/sign-up' with your actual route or external link
    // If it's an external link, you could do: window.location.href = 'https://your-signup-link';
    this.router.navigate(['/welcome']);
  }
}
