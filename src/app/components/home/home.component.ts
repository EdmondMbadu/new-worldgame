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
      this.findCompletedSolutions();
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

  async findPendingSolutions() {
    this.pendingSolutions = [];
    this.pendingSolutionsUsers = [];

    const userPromises = this.allSolutions!.filter(
      (s) =>
        s.finished === undefined &&
        this.auth.currentUser &&
        s.authorName ===
          `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`
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
  async findCompletedSolutions() {
    this.completedSolutions = [];
    this.completedSolutionsUsers = [];

    const userPromises = this.allSolutions!.filter(
      (s) => s.finished !== undefined
    ).map(async (s) => {
      this.completedSolutions.push(s); // Push solution to the array

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
    this.completedSolutionsUsers.push(...users);
  }
}
