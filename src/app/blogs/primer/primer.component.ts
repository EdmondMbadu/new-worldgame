import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-primer',

  templateUrl: './primer.component.html',
  styleUrl: './primer.component.css',
})
export class PrimerComponent implements OnInit {
  ngOnInit(): void {}
  isLoggedIn: boolean = false;
  primerData: any[] = [];
  pid: string = '';
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private router: Router,
    private time: TimeService,
    private data: DataService
  ) {
    window.scroll(0, 0);
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });

    this.data.getPrimerData().subscribe((data: any) => {
      console.log('data', data);
      if (data[0].signUps) {
        this.primerData = data[0].signUps;
      }
      this.pid = data[0].id;
      console.log('design science primer', this.pid);
    });
  }

  async goToRegisterForPrimer() {
    if (this.isLoggedIn) {
      try {
        const wData = {
          firstName: this.auth.currentUser.firstName,
          lastName: this.auth.currentUser.lastName,
          email: this.auth.currentUser.email,
          registerDate: this.time.todaysDate(),
        };
        console.log('data ', wData);
        console.log('primer ', this.primerData);
        this.primerData.push(wData);
        let workshop = await this.data.primerSignUp(this.pid, this.primerData);
        // this.sendConfirmationEmail();
        window.open(
          'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/blogs%2FTCW2_web.pdf?alt=media&token=c9b916aa-58f2-4c32-a180-90237777b3d2',
          '_blank'
        );
      } catch (error) {
        alert(
          'There was an error during the  registration process. Please tryagain. '
        );
        console.log('error while entering primer data', error);
        return;
      }
    } else {
      this.router.navigate(['/primer-register/']);
    }
  }
}
