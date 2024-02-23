import { Component, Input, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
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
  evaluationSolutions: Solution[] = [];
  evaluationSolutionsUsers: User[] = [];
  allSolutions: Solution[] = [];
  currentUserSolutions: Solution[] = [];
  pendingSolutions: Solution[] = [];
  pendingSolutionsUsers: User[] = [];
  completedSolutionsUsers: User[] = [];
  completedSolutions: Solution[] = [];
  profilePicturePath?: string = '';
  pending: number = 0;
  evaluation: number = 0;
  constructor(public auth: AuthService, private solution: SolutionService) {
    this.user = this.auth.currentUser;
  }
  ngOnInit(): void {
    window.scroll(0, 0);
    this.solution.getAllSolutionsFromAllAccounts().subscribe((data) => {
      this.allSolutions = data;
      this.findCompletedSolutions();
    });
    this.solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      // console.log('this is the current user solutions', data);
      this.currentUserSolutions = data;
      this.findPendingSolutions();
    });

    this.solution.getAuthenticatedUserPendingEvaluations().subscribe((data) => {
      this.evaluationSolutions = data.filter((element) => {
        return element.finished !== undefined;
      });
      this.evaluation = this.evaluationSolutions.length;
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

  findAwaitingEvaluationSolutionLength() {}

  findPendingSolutions() {
    this.pendingSolutions = [];

    for (let s of this.currentUserSolutions) {
      if (s.finished === undefined || s.finished === 'false') {
        this.pendingSolutions.push(s);
      }
    }
    this.pending = this.pendingSolutions.length;
  }

  findCompletedSolutions() {
    this.completedSolutions = [];

    for (let s of this.allSolutions) {
      if (s.finished === 'true') {
        this.completedSolutions.push(s);
      }
    }
  }
}
