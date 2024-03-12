import { Component, Input, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-problem-list-feedback',
  templateUrl: './problem-list-feedback.component.html',
  styleUrls: ['./problem-list-feedback.component.css'],
})
export class ProblemListFeedbackComponent implements OnInit {
  evaluationSolutions: Solution[] = [];
  evaluationSolutionsUsers: User[] = [];
  @Input() margin = '';
  currentUserSolutions: any;
  evaluation: number = 0;

  constructor(public auth: AuthService, private solution: SolutionService) {
    this.solution.getAuthenticatedUserPendingEvaluations().subscribe((data) => {
      this.evaluationSolutions = data.filter((element) => {
        return element.finished !== undefined && element.finished === 'true';
      });
      this.evaluation = this.evaluationSolutions.length;
    });
  }
  ngOnInit(): void {
    window.scroll(0, 0);
  }

  @Input() title: string = 'Strategy Evaluation';
  @Input() path: string = '/problem-feedback';
  problems: string[] = [
    'Ending Poverty',
    'Inequality and Poverty',
    'Mental Health',
  ];
}
