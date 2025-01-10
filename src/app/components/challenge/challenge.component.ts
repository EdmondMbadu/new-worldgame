import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-challenge',
  templateUrl: './challenge.component.html',
  styleUrl: './challenge.component.css',
})
export class ChallengeComponent {
  @Input() image: string = '';
  @Input() title: string = '';
  @Input() description: string = '';
  constructor(
    private time: TimeService,
    public auth: AuthService,
    private solutionService: SolutionService,
    public data: DataService,
    private router: Router
  ) {}
}
