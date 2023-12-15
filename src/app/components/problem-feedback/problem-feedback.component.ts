import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Evaluation, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { FeedbackRequest } from '../playground-step/playground-step.component';
import { TimeService } from 'src/app/services/time.service';

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
  timeElapsed: string = '';
  submitDisplay: boolean = false;
  comment: string = '';

  sendFeedback: boolean = false;
  evaluationSummary: Evaluation = {};
  evaluationDetails: Evaluation[] = [];
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
  evaluation: Evaluation = {};
  evaluators: any = {};
  comments: any[] = [];

  values: number[] = this.evaluationArray.map((data) => {
    return 0;
  });

  userSolution: Solution = {};
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    private time: TimeService,
    private router: Router
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    this.solution.getSolution(this.id).subscribe((data) => {
      this.userSolution = data!;
      if (data?.evaluationDetails !== undefined) {
        this.evaluationDetails = data?.evaluationDetails!;
      }

      this.timeElapsed = this.time.timeAgo(data?.submissionDate!);
      this.getMembers();
      this.comments = this.userSolution.comments!;
    });
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

  makeSureBeforeSubmit() {
    // console.log('user solution before submitting', this.userSolution);
    this.submitDisplay = true;
  }
  submitEvaluation() {
    this.evaluation = this.mapNumbersToEvaluation(this.values);

    this.evaluationDetails.push(this.evaluation);
    this.evaluationSummary = this.calculateAverageEvaluation(
      this.evaluationDetails
    );

    if (this.userSolution.numberofTimesEvaluated) {
      this.userSolution.numberofTimesEvaluated = (
        Number(this.userSolution.numberofTimesEvaluated) + 1
      ).toString();
    } else {
      this.userSolution.numberofTimesEvaluated = '1';
    }
    (this.userSolution.evaluationSummary = this.evaluationSummary),
      (this.userSolution.evaluationDetails = this.evaluationDetails);
    this.updateEvaluators();

    if (this.sendFeedback) {
      this.solution.addEvaluation(this.userSolution).then(() => {
        this.router.navigate(['/home']);
      });
    }
  }
  updateEvaluators() {
    this.evaluators = this.userSolution.evaluators;
    for (let element of this.evaluators) {
      if (element.name === this.auth.currentUser.email) {
        element.evaluated = 'true';
      }
    }

    this.userSolution.evaluators = this.evaluators;
  }

  mapNumbersToEvaluation(numbers: number[]): Evaluation {
    if (numbers.length !== 6) {
      throw new Error('Expected an array of 7 numbers.');
    }

    let average = this.findAverage(this.values);
    return {
      evaluatorId: this.auth.currentUser.uid,
      average: average.toString(),
      achievable: numbers[0].toString(),
      feasible: numbers[1].toString(),
      ecological: numbers[2].toString(),
      economical: numbers[3].toString(),
      equitable: numbers[4].toString(),
      understandable: numbers[5].toString(),
      comment: this.comment,
    };
  }

  findAverage(values: number[]) {
    return (this.average = Math.ceil(
      values.reduce((x, y) => x + y) / values.length
    ));
  }

  calculateAverageEvaluation(evaluations: Evaluation[]): Evaluation {
    const keys: (keyof Evaluation)[] = [
      'achievable',
      'feasible',
      'ecological',
      'economical',
      'equitable',
      'understandable',
    ];

    const sums = keys.reduce<{ [key in keyof Evaluation]?: number }>(
      (acc, key) => {
        acc[key] = evaluations.reduce((sum, ev) => sum + Number(ev[key]), 0);
        return acc;
      },
      {}
    );

    const averages = Object.fromEntries(
      Object.entries(sums).map(([key, value]) => [
        key,
        Math.ceil(value! / evaluations.length),
      ])
    );

    const average = Math.ceil(
      keys.reduce((sum, key) => sum + (averages[key] ?? 0), 0) / keys.length
    );

    return {
      evaluatorId: this.auth.currentUser.uid,
      average: average.toString(),
      ...Object.fromEntries(
        Object.entries(averages).map(([key, value]) => [key, value!.toString()])
      ),
    };
  }
  closeSubmission() {
    this.submitDisplay = false;
  }
  accept() {
    this.sendFeedback = true;
    this.submitEvaluation();
    this.closeSubmission();
  }
}
