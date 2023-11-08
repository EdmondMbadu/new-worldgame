import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { FeedbackRequest } from '../playground-step/playground-step.component';

export interface Eval {
  evaluatorId?: string;
  achievable?: string;
  feasible?: string;
  ecological?: string;
  economical?: string;
  equitable?: string;
  understandable?: string;
}
@Component({
  selector: 'app-problem-feedback',
  templateUrl: './problem-feedback.component.html',
  styleUrls: ['./problem-feedback.component.css'],
})
export class ProblemFeedbackComponent {
  user: User = {};
  id: any;
  solutionId: string = '';

  teamMembers: User[] = [];

  feebdackRequests: FeedbackRequest[] = [];
  userId: string = '';
  disabled = false;
  max = 10;
  min = 0;
  showTicks = true;
  step = 1;
  thumbLabel = false;
  value = 0;
  average: number = 0;
  evaluationArray: string[] = [
    'Achieve Preferred State',
    'Technologically Feasible',
    'Ecologically positive',
    'Economical',
    'Equitable',
    'Understandable',
  ];
  evaluator: Eval = {};

  values: number[] = this.evaluationArray.map((data) => {
    return 0;
  });

  currenUserSolution: Solution = {};
  userSolution: Solution = {};
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    // this.solution
    //   .getThisUserSolution(this.auth.currentUser.uid, this.solutionId)
    //   .subscribe((data) => {
    //     this.currenUserSolution = data!;
    //     this.feebdackRequests = data!.feedbackRequest!;
    //   });

    this.solution.getSolution(this.id).subscribe((data) => {
      this.userSolution = data!;
      this.getMembers();
    });
  }

  markFeedbackRequestDone() {
    for (let f of this.feebdackRequests) {
      if (f.authorId === this.userId) {
        f.evaluated = 'true';
        return;
      }
    }
  }
  getMembers() {
    for (const key in this.userSolution.participants) {
      let participant = this.userSolution.participants[key];
      let email = Object.values(participant)[0];
      this.auth.getUserFromEmail(email).subscribe((data) => {
        // Check if the email of the incoming data is already in the teamMembers
        if (
          data &&
          data[0] &&
          !this.teamMembers.some((member) => member.email === data[0].email)
        ) {
          this.teamMembers.push(data[0]);
        }
      });
    }
  }

  submitFeedback() {
    this.evaluator = this.mapNumbersToEval(this.values);

    this.findAverage();
    console.log('evaluator', this.evaluator);
    console.log('the average is', this.average);

    if (this.userSolution.evaluationAverage === undefined) {
      let n = 1;
      console.log('here is the grade', this.average);

      // this.solution.addEvaluation(
      //   this.evaluator,
      //   n.toString(),
      //   this.userId,
      //   this.solutionId
      // );
    } else {
      let n = Number(this.userSolution.numberofTimesEvaluated);
      let weighted = Math.ceil(
        (Number(this.userSolution.evaluationAverage) * n + this.average) / n + 1
      );

      this.average = weighted;
      n++;
      console.log('here is the grade', this.average);
      // this.solution.addEvaluation(
      //   this.evaluator,
      //   n.toString(),
      //   this.userId,
      //   this.solutionId
      // );
    }

    // this.markFeedbackRequestDone();
    // this.solution.updateFeedbackRequestAfterEvaluation(
    //   this.feebdackRequests,
    //   this.solutionId
    // );
    console.log(' here is the feedback', this.feebdackRequests);
  }

  mapNumbersToEval(numbers: number[]): Eval {
    if (numbers.length !== 6) {
      throw new Error('Expected an array of 7 numbers.');
    }

    return {
      evaluatorId: this.auth.currentUser.uid,
      achievable: numbers[0].toString(),
      feasible: numbers[1].toString(),
      ecological: numbers[2].toString(),
      economical: numbers[3].toString(),
      equitable: numbers[4].toString(),
      understandable: numbers[5].toString(),
    };
  }

  findAverage() {
    this.average = Math.ceil(
      this.values.reduce((x, y) => x + y) / this.values.length
    );
  }
}
