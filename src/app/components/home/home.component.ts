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
  solutions: Solution[] = [];
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
    this.solution.getAllSolutionsFromAllAccounts().subscribe((data) => {
      this.allSolutions = data;
      this.findPendingSolutions();
      this.findCompletedSolutions();
    });
    this.solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.currentUserSolutions = data;
      this.findAwaitingEvaluationSolution();
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

  async findAwaitingEvaluationSolution() {
    this.evaluationSolutions = [];
    this.evaluationSolutionsUsers = [];

    let combinedPromises = [];

    for (let s of this.currentUserSolutions) {
      if (s.feedbackRequest) {
        for (let request of s.feedbackRequest) {
          // Check if authorId exists and evaluated field is 'false'
          if (request.authorId && request.evaluated === 'false') {
            const value = request.authorId;

            // Create a promise to fetch user data
            const userPromise = new Promise<any>((resolve, reject) => {
              this.auth.getAUser(value).subscribe(
                (data) => resolve(data),
                (error) => reject(error)
              );
            });

            // Create a promise to fetch solution data
            const solutionPromise = new Promise<any>((resolve, reject) => {
              this.solution.getThisUserSolution(value, s.solutionId!).subscribe(
                (data) => resolve(data),
                (error) => reject(error)
              );
            });

            // Combine promises for user and solution data
            combinedPromises.push(
              (async () => {
                const userData = await userPromise;
                const solutionData = await solutionPromise;

                // Ensure no duplicates for userData
                if (
                  !this.evaluationSolutionsUsers.some(
                    (user) => user.uid === userData.uid
                  )
                ) {
                  this.evaluationSolutionsUsers.push(userData);
                }

                // Ensure no duplicates for solutionData
                if (
                  !this.evaluationSolutions.some(
                    (solution) =>
                      solution.solutionId === solutionData.solutionId
                  )
                ) {
                  this.evaluationSolutions.push(solutionData);
                }
              })()
            );
          }
        }
      }
    }

    // Wait for all combined promises to resolve
    await Promise.all(combinedPromises);
    this.evaluation = this.evaluationSolutions.length;
  }

  async findPendingSolutions() {
    this.pendingSolutions = [];
    this.pendingSolutionsUsers = [];

    const userPromises = this.allSolutions!.filter(
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
