import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-primer-register',

  templateUrl: './primer-register.component.html',
  styleUrl: './primer-register.component.css',
})
export class PrimerRegisterComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
    this.data.getPrimerData().subscribe((data: any) => {
      console.log('data', data);
      if (data[0].signUps) {
        this.primerData = data[0].signUps;
      }
      this.pid = data[0].id;
    });
  }
  email: string = '';
  primerData: any[] = [];
  firstName: string = '';
  lastName: string = '';
  readyToSubmit: boolean = false;
  loading: boolean = false;
  pid: string = '';
  success = false;
  isLoggedIn: boolean = false;
  constructor(
    public auth: AuthService,
    private data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private time: TimeService
  ) {}

  async submitPrimerRegistration() {
    if (this.firstName === '' || this.lastName === '') {
      alert('Enter your first and last name to download the book.');
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

        this.primerData.push(wData);
        let workshop = await this.data.primerSignUp(this.pid, this.primerData);

        window.location.href =
          'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/blogs%2FTools%20for%20Changing%20the%20Worlda%CC%82%E2%82%AC%E2%80%9D%20A%20Design%20Science%20Primer_FOR%20WEB.pdf?alt=media&token=7ebaba13-2a28-4be8-8da9-026c3c0f1232';
      } catch (error) {
        alert(
          'There was an error during the  registration process. Please tryagain. '
        );
        console.log('error while entering primer data', error);
        return;
      }
    }
  }
}
