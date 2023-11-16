import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Evaluation, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-evaluation-summary',
  templateUrl: './evaluation-summary.component.html',
  styleUrls: ['./evaluation-summary.component.css'],
})
export class EvaluationSummaryComponent {
  id: any = '';
  currentSolution: Solution = {};
  teamMembers: User[] = [];
  evaluationSummary: any = {};
  color: any = {};
  colors: any[] = [];
  evaluations: any[] = [];
  evaluators: User[] = [];
  timeElapsed: string = '';
  commentTimeElapsed: any;
  numberOfcomments: number = 0;
  commentUserNames: any;
  commentUserProfilePicturePath: any;

  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private solution: SolutionService,
    private data: DataService,
    private time: TimeService
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    solution.getSolution(this.id).subscribe((data) => {
      this.currentSolution = data!;

      this.evaluationSummary = this.data.mapEvaluationToNumeric(
        this.currentSolution.evaluationSummary!
      );
      this.color = this.data.mapEvaluationToColors(
        this.currentSolution.evaluationSummary!
      );
      if (this.currentSolution) {
        this.mapping();
        this.getEvaluators();
      }
    });
  }

  mapping() {
    if (this.currentSolution.evaluationDetails) {
      for (let a of this.currentSolution.evaluationDetails!) {
        this.colors.push(this.data.mapEvaluationToColors(a));
        this.evaluations.push(this.data.mapEvaluationToNumeric(a));
      }
    }
  }
  getEvaluators() {
    this.evaluators = [];

    if (this.currentSolution.evaluators) {
      for (const evaluator of this.currentSolution.evaluators) {
        let email = evaluator.name;
        if (email && evaluator.evaluated === 'true') {
          this.auth.getUserFromEmail(email).subscribe((data) => {
            // Check if the email of the incoming data is already in the teamMembers
            if (
              data &&
              data[0] &&
              !this.evaluators.some((member) => member.email === data[0].email)
            ) {
              this.evaluators.push(data[0]);
            }
          });
        }
      }
    }
  }
}
