import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/services/data.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.css',
})
export class ContactUsComponent implements OnInit {
  firstName: string = '';
  lastName: string = '';
  customerEmail: string = '';
  message?: string = '';
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  ourEmail: string = 'newworld@newworld-game.org';
  constructor(private data: DataService, private translate: TranslateService) {}

  sendMessage() {
    if (
      this.firstName === '' ||
      this.lastName === '' ||
      this.customerEmail === '' ||
      this.message === ''
    ) {
      alert(this.translate.instant('contactPage.alerts.completeFields'));
      return;
    } else {
      if (this.data.isValidEmail(this.customerEmail)) {
        alert(this.translate.instant('contactPage.alerts.invalidEmail'));
        return;
      }
    }
  }
}
