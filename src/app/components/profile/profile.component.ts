import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import {
  BoxEducationCredential,
  BoxEmploymentCredential,
  BoxLocationCredential,
  BoxProfileCredential,
  BoxProfileDescription,
} from 'src/app/services/box.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  user: User;

  dateJoined: string = '';
  constructor(
    public auth: AuthService,
    private time: TimeService,
    public boxProfile: BoxProfileCredential,
    public boxDescription: BoxProfileDescription,
    public boxEmployment: BoxEmploymentCredential,
    public boxEducation: BoxEducationCredential,
    public boxLocation: BoxLocationCredential
  ) {
    this.user = this.auth.currentUser;
  }
  ngOnInit(): void {
    this.dateJoined = this.time.getMonthYear(this.user.dateJoined!);
  }

  toggleProfileCredential() {
    this.boxProfile.toggle();
  }

  toggleProfileDescription() {
    this.boxDescription.toggle();
  }

  toggleEmployementCredential() {
    this.boxEmployment.toggle();
  }
  toggleEducationCredential() {
    this.boxEducation.toggle();
  }
  toggleLocationCredential() {
    this.boxLocation.toggle();
  }
}
