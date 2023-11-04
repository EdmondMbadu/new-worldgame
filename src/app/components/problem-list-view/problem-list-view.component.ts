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
  @Input() title: string = `Pending Solutions`;

  async findPendingSolutions() {
    this.pendingSolutions = [];
    this.pendingSolutionsUsers = [];

    const userPromises = this.solutions!.filter(
      (s) =>
        s.finished === undefined &&
        this.auth.currentUser &&
        s.authorAccountId === this.auth.currentUser.uid
    ).map(async (s) => {
      this.pendingSolutions.push(s); // Push solution to the array

      // Create a promise for each user fetch
      return new Promise<any>((resolve, reject) => {
        this.auth.getAUser(s.authorAccountId!).subscribe(
          (data) => resolve(data),
          (error) => reject(error)
        );
      });
    });

    // Wait for all user-fetching promises to resolve
    const users = await Promise.all(userPromises);
    this.pendingSolutionsUsers.push(...users);
    this.pending = users.length;
  }
}
