import { Component, Input } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import {
  BoxEducationCredential,
  BoxEmploymentCredential,
  BoxLocationCredential,
  BoxProfileCredential,
  BoxProfileDescription,
  BoxService,
} from 'src/app/services/box.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-text-popup',
  templateUrl: './text-popup.component.html',
  styleUrls: ['./text-popup.component.css'],
})
export class TextPopupComponent {
  constructor(
    private boxProfile: BoxProfileCredential,
    private boxDescription: BoxProfileDescription,
    private router: Router,
    private boxEmployment: BoxEmploymentCredential,
    private boxEducation: BoxEducationCredential,
    private boxLocation: BoxLocationCredential
  ) {}
  content: string = '';
  @Input() title: string = 'Profile Credentials';
  @Input() limit: number = 60;
  @Input() height: number = 16;
  wordsLeft?: number;
  @Input() updateProfileCredential: boolean = false;
  @Input() updateDescription: boolean = false;
  @Input() updateEmploymentCredential: boolean = false;
  @Input() updateEducationCredential: boolean = false;
  @Input() updateLocationCredential: boolean = false;

  textColor = 'text-gray-700';

  toggle() {
    this.reinitializeTextArea();
    if (this.updateProfileCredential) {
      this.boxProfile.toggle();
    } else if (this.updateDescription) {
      this.boxDescription.toggle();
    } else if (this.updateEmploymentCredential) {
      this.boxEmployment.toggle();
    } else if (this.updateEducationCredential) {
      this.boxEducation.toggle();
    } else if (this.updateLocationCredential) {
      this.boxLocation.toggle();
    }
  }
  ngOnInit() {
    this.wordsLeft = this.limit;
  }
  reinitializeTextArea() {
    this.content = '';
    this.wordsLeft = this.limit;
    this.textColor = 'text-gray-700';
  }
  countWords() {
    this.wordsLeft = this.limit - this.content.length;
    if (this.wordsLeft < 5) {
      this.textColor = 'text-red-700';
    } else {
      this.textColor = 'text-gray-700';
    }
  }

  update() {
    if (this.updateProfileCredential) {
      this.boxProfile.updateUserProfileCredential(this.content);
    } else if (this.updateDescription) {
      this.boxDescription.updateUserDescription(this.content);
    } else if (this.updateEmploymentCredential) {
      this.boxEmployment.updateUserEmploymentCredential(this.content);
    } else if (this.updateEducationCredential) {
      this.boxEducation.updateUserEducationCredential(this.content);
    } else if (this.updateLocationCredential) {
      this.boxLocation.updateUserLocationCredential(this.content);
    }
    this.toggle();
    this.router.navigate(['/home']);
    return;
  }
}
