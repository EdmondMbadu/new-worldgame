import { Component, Input } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-problem-list-view',
  templateUrl: './problem-list-view.component.html',
  styleUrls: ['./problem-list-view.component.css'],
})
export class ProblemListViewComponent {
  solutions: Solution[] = [];
  pendingSolutions: Solution[] = [];
  pendingSolutionsUsers: User[] = [];
  pending: number = 0;
  constructor(public auth: AuthService, private solution: SolutionService) {
    solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.solutions = data;
      this.findPendingSolutions();
    });
  }
  @Input() title: string = `Pending Work`;
  findPendingSolutions() {
    for (let s of this.solutions!) {
      if (s.finished !== undefined) {
      } else {
        this.pending++;
        this.auth.getAUser(s.authorAccountId!).subscribe((data) => {
          this.pendingSolutionsUsers.push(data!);
        });
        this.pendingSolutions.push(s);
      }
    }
  }
}
