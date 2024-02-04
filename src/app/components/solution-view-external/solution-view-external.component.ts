import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-solution-view-external',
  templateUrl: './solution-view-external.component.html',
  styleUrl: './solution-view-external.component.css',
})
export class SolutionViewExternalComponent {
  solutionId: any = '';
  currentSolution: Solution = {};
  otherSolutions: Solution[] = [];
  showPopUpTeam: boolean[] = [];
  currentAuth: User = {};
  currentUser: User = {};
  timeElapsed: string = '';
  evaluationSummary: any = {};
  colors: any = {};
  comments: any = {};
  commentUserProfilePicturePath: string[] = [];
  numberOfcomments: number = 0;
  commentTimeElapsed: string[] = [];
  comment: string = '';
  commentUserNames: string[] = [];

  teamMembers: User[] = [];

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private activatedRoute: ActivatedRoute,
    private time: TimeService,
    public data: DataService
  ) {}
  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
      this.solutionId = params.get('id');
      window.scroll(0, 0);
      this.loadSolutionData(this.solutionId);
    });
  }

  async initializeComments() {
    if (this.comments && this.comments.length > 0) {
      this.numberOfcomments = this.comments.length;

      // An array to store promises for user data fetching
      const userPromises = this.comments.map((comment: any) => {
        // Assuming 'date' is the time of the comment, similar to the previous key.split('#')[1]
        if (comment.date) {
          this.commentTimeElapsed.push(this.time.timeAgo(comment.date));
        }

        return new Promise<any>((resolve, reject) => {
          if (comment.authorId) {
            this.auth.getAUser(comment.authorId).subscribe(
              (data: any) => resolve(data),
              (error) => reject(error)
            );
          } else {
            resolve(null); // Or handle the lack of an authorId as needed
          }
        });
      });

      const users = await Promise.all(userPromises);
      users.forEach((data: any) => {
        if (data) {
          this.commentUserNames.push(data.firstName + ' ' + data.lastName);

          if (data.profilePicture && data.profilePicture.downloadURL) {
            this.commentUserProfilePicturePath.push(
              data.profilePicture.downloadURL
            );
          } else {
            this.commentUserProfilePicturePath.push();
          }
        }
      });
    }
  }

  loadSolutionData(solutionId: string): void {
    this.solution
      .getSolutionForNonAuthenticatedUser(solutionId)
      .subscribe((data: any) => {
        this.currentSolution = data[0];
        this.timeElapsed = this.time.timeAgo(
          this.currentSolution.submissionDate!
        );
        this.evaluationSummary = this.data.mapEvaluationToNumeric(
          this.currentSolution.evaluationSummary!
        );
        this.colors = this.data.mapEvaluationToColors(
          this.currentSolution.evaluationSummary!
        );
        this.comments = this.currentSolution.comments;
        this.getMembers();
        this.solution
          .getAllSolutionsOfThisUser(this.currentSolution!.authorAccountId!)
          .subscribe((data: any) => {
            this.otherSolutions = data;
          });
        this.initializeComments();
      });
  }

  getMembers() {
    for (const key in this.currentSolution.participants) {
      let participant = this.currentSolution.participants[key];
      let email = Object.values(participant)[0];
      this.auth.getUserFromEmail(email).subscribe((data) => {
        // Check if the email of the incoming data is already in the teamMembers
        if (
          data &&
          data[0] &&
          !this.teamMembers.some((member) => member.email === data[0].email)
        ) {
          this.teamMembers.push(data[0]);
        }
      });
    }
  }
  onHoverImageTeam(index: number) {
    this.showPopUpTeam[index] = true;
  }
  onLeaveTeam(index: number) {
    this.showPopUpTeam[index] = false;
  }
}
