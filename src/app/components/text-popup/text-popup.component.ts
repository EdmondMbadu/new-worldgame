import { Component, Input } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-text-popup',
  templateUrl: './text-popup.component.html',
  styleUrls: ['./text-popup.component.css'],
})
export class TextPopupComponent {
  constructor(public data: DataService, private router: Router) {}
  content: string = '';
  @Input() title: string = 'Profile Credentials';
  @Input() wordsLeft: number = 60;
  @Input() updateProfileCredential: boolean = false;
  @Input() updateDescription: boolean = false;

  textColor = 'text-gray-700';

  toggle() {
    this.reinitializeTextArea();
    this.data.toggle();
  }
  reinitializeTextArea() {
    this.content = '';
    this.wordsLeft = 60;
    this.textColor = 'text-gray-700';
  }
  countWords() {
    this.wordsLeft = 60 - this.content.length;
    if (this.wordsLeft < 5) {
      this.textColor = 'text-red-700';
    } else {
      this.textColor = 'text-gray-700';
    }
  }

  update() {
    if (this.updateProfileCredential) {
      this.data.updateUserProfileCredential(this.content);
      this.toggle();
      this.router.navigate(['/home']);
      return;
    } else if (this.updateDescription) {
      this.data.updateUserDescription(this.content);
      this.toggle();
      this.router.navigate(['/home']);
      this.toggle();
    }
  }
}
