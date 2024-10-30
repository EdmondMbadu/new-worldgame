import { Component,Input } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';


@Component({
  selector: 'app-template-thanks',

  templateUrl: './template-thanks.component.html',
  styleUrl: './template-thanks.component.css'
})
export class TemplateThanksComponent {
  @ Input() paragraph:string="Thank you for registering for Architects of the Future: The Essential AI Toolkit for Advancing the UN SDGs! We’re thrilled to have you join us on December 12, 2024, at 12 PM EST. Get ready for an inspiring session dedicated to shaping a sustainable future together!";
  @Input()title:string="Registration Complete!"
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
