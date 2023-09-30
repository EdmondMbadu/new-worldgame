import { Component } from '@angular/core';

@Component({
  selector: 'app-problem-feedback',
  templateUrl: './problem-feedback.component.html',
  styleUrls: ['./problem-feedback.component.css'],
})
export class ProblemFeedbackComponent {
  formatLabel(value: number) {
    console.log('entering here');
    if (value >= 1000) {
      return Math.round(value / 1000) + 'k';
    }

    return value.toString();
  }
}
