import { Component, OnInit } from '@angular/core';
import { Route, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-worldgame-packet',
  templateUrl: './worldgame-packet.component.html',
  styleUrl: './worldgame-packet.component.css',
})
export class WorldgamePacketComponent implements OnInit {
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
          'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/blogs%2FTools%20for%20Changing%20the%20Worlda%CC%82%E2%82%AC%E2%80%9D%20A%20Design%20Science%20Primer_FOR%20WEB.pdf?alt=media&token=7ebaba13-2a28-4be8-8da9-026c3c0f1232',
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
