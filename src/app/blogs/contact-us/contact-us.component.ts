import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/services/data.service';

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
  constructor(private data: DataService) {}

  sendMessage() {
    if (
      this.firstName === '' ||
      this.lastName === '' ||
      this.customerEmail === '' ||
      this.message === ''
    ) {
      alert('Complete all fiends');
      return;
    } else {
      if (this.data.isValidEmail(this.customerEmail)) {
        alert('Enter a valid email');
        return;
      }
    }
  }
}
