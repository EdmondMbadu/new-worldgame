import { Component, Input, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  user: User;
  allUsers: User[] = [];
  allSolutions: Solution[] = [];
  solutions: Solution[] = [];
  pendingSolutions: Solution[] = [];
  pendingSolutionsUsers: User[] = [];
  completedSolutionsUsers: User[] = [];
  completedSolutions: Solution[] = [];
  profilePicturePath?: string = '';
  pending: number = 0;
  constructor(public auth: AuthService, private solution: SolutionService) {
    this.user = this.auth.currentUser;
  }
  ngOnInit(): void {
    this.solution.getAllSolutionsFromAllAccounts().subscribe((data) => {
      this.allSolutions = data;

      this.findPendingSolutions();
    });

    if (this.user!.profilePicture && this.user.profilePicture.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL;
    }
  }
  problems: string[] = [
    'Ending Poverty',
    'Inequality and Poverty',
    'Mental Health',
  ];

  findPendingSolutions() {
    this.completedSolutions = [];
    this.pendingSolutions = [];
    this.pending = 0;

    for (let s of this.allSolutions!) {
      if (s.finished !== undefined) {
        this.completedSolutions.push(s);
        this.auth.getAUser(s.authorAccountId!).subscribe((data) => {
          this.completedSolutionsUsers.push(data!);
        });
      } else if (
        this.auth.currentUser &&
        s.authorName ===
          `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`
      ) {
        this.auth.getAUser(s.authorAccountId!).subscribe((data) => {
          this.pendingSolutionsUsers.push(data!);
        });
        this.pendingSolutions.push(s);
        this.pending++;
      }
    }
  }
}
