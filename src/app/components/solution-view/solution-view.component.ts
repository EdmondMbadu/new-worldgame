import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-solution-view',
  templateUrl: './solution-view.component.html',
  styleUrls: ['./solution-view.component.css'],
})
export class SolutionViewComponent implements OnInit {
  solutionId: any = '';
  currentSolution: Solution = {};
  otherSolutions: Solution[] = [];
  currentAuth: User = {};
  currentUser: User = {};
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private activatedRoute: ActivatedRoute
  ) {
    this.solutionId = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution
      .getSolutionForNonAuthenticatedUser(this.solutionId)
      .subscribe((data: any) => {
        this.currentSolution = data[0];
        console.log('solution view', this.currentSolution);
        this.auth
          .getAUser(this.currentSolution.authorAccountId!)
          .subscribe((user: any) => {
            this.currentUser = user!;
            console.log('the current user', user);
          });
        this.solution
          .getAllSolutionsOfThisUser(this.currentSolution!.authorAccountId!)
          .subscribe((data: any) => {
            this.otherSolutions = data;
          });
      });
  }
  ngOnInit(): void {}
}
