import { Component, Input } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-problem-list-feedback',
  templateUrl: './problem-list-feedback.component.html',
  styleUrls: ['./problem-list-feedback.component.css'],
})
export class ProblemListFeedbackComponent {
  constructor(public auth: AuthService) {}
  @Input() title: string = 'Awaiting Feedback(3)';
  problems: string[] = [
    'Ending Poverty',
    'Inequality and Poverty',
    'Mental Health',
  ];
}
