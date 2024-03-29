import { Component, Input, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-problem-list-view',
  templateUrl: './problem-list-view.component.html',
  styleUrls: ['./problem-list-view.component.css'],
})
export class ProblemListViewComponent implements OnInit {
  solutions: Solution[] = [];
  pendingSolutions: Solution[] = [];

  pending: number = 0;
  constructor(public auth: AuthService, private solution: SolutionService) {
    solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.solutions = data;
      this.findPendingSolutions();
    });
  }
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  @Input() title: string = `Pending Solutions`;

  async findPendingSolutions() {
    this.pendingSolutions = [];

    for (let s of this.solutions) {
      if (s.finished === undefined || s.finished !== 'true') {
        this.pendingSolutions.push(s);
      }
    }
    this.pending = this.pendingSolutions.length;
  }
}
