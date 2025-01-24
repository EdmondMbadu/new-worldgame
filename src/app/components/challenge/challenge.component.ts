import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-challenge',
  templateUrl: './challenge.component.html',
  styleUrl: './challenge.component.css',
})
export class ChallengeComponent implements OnInit {
  @Input() image: string = '';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() id: string = '';
  @Input() restricted: string = '';
  user?: User = {};
  constructor(
    private time: TimeService,
    public auth: AuthService,
    private solutionService: SolutionService,
    public data: DataService,
    private router: Router,
    private challenge: ChallengesService
  ) {}
  selectChallenge() {
    const selectedChallengeItem = {
      id: this.id,
      title: this.title,
      description: this.description,
      image: this.image,
      restricted: this.restricted,
    };

    this.challenge.setSelectedChallengeItem(selectedChallengeItem);

    this.router.navigate(['/start-challenge/']);
  }

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    // console.log('the current user is', this.user);
  }
}
