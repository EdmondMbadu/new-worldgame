import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  user: User;
  displayaProfileCredential: boolean = false;
  dateJoined: string = '';
  constructor(
    public auth: AuthService,
    private time: TimeService,
    public data: DataService
  ) {
    this.user = this.auth.currentUser;
  }
  ngOnInit(): void {
    console.log('currend date', this.time.getCurrentDate());
    this.dateJoined = this.time.getMonthYear(this.user.dateJoined!);
  }

  toggle() {
    this.data.toggle();
  }
}
