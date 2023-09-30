import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-problem-list-view',
  templateUrl: './problem-list-view.component.html',
  styleUrls: ['./problem-list-view.component.css'],
})
export class ProblemListViewComponent {
  @Input() title: string = 'Playground Invitation (3)';
}
