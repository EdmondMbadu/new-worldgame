import { Component, Input } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-problem-list-feedback',
  templateUrl: './problem-list-feedback.component.html',
  styleUrls: ['./problem-list-feedback.component.css'],
})
export class ProblemListFeedbackComponent {
  evaluationSolutions: Solution[] = [];
  evaluationSolutionsUsers: User[] = [];
  @Input() margin = '';
  currentUserSolutions: any;
  evaluation: number = 0;

  constructor(public auth: AuthService, private solution: SolutionService) {
    this.solution.getAuthenticatedUserPendingEvaluations().subscribe((data) => {
      this.evaluationSolutions = data.filter((element) => {
        return element.finished !== undefined;
      });
      this.evaluation = this.evaluationSolutions.length;
    });
  }

  @Input() title: string = 'Strategy Evaluation';
  @Input() path: string = '/problem-feedback';
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
}
