import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-management-workshop',

  templateUrl: './management-workshop.component.html',
  styleUrl: './management-workshop.component.css',
})
export class ManagementWorkshopComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
  }
  email: string = '';
  workshopData: any[] = [];
  firstName: string = '';
  lastName: string = '';
  readyToSubmit: boolean = false;
  loading: boolean = false;
  wid: string = '';
  success = false;
  isLoggedIn: boolean = false;
  constructor(
    public auth: AuthService,
    private data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private time: TimeService
  ) {
    this.data.getWorkshopData().subscribe((data: any) => {
      this.workshopData = data[0].signUps;
      this.wid = data[0].wid;
    });
  }

  async submitWorkshopRegistration() {
    if (this.firstName === '' || this.lastName === '') {
      alert('Enter your first and last name to register for the event.');
      return;
    } else if (!this.data.isValidEmail(this.email)) {
      alert('Enter a valid email');
      return;
    } else {
      try {
        const wData = {
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
          registerDate: this.time.todaysDate(),
        };
        this.workshopData.push(wData);
        let workshop = await this.data.workshopSignUp(
          this.wid,
          this.workshopData
        );
      } catch (error) {
        alert(
          'There was an error during the  registration process. Please tryagain. '
        );
        return;
      }
    }
  }
}
