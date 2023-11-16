import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Evaluation, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-solution',
  templateUrl: './solution.component.html',
  styleUrls: ['./solution.component.css'],
})
export class PostComponent implements OnInit {
  @Input() title: string = 'Electrifying Africa';
  displayAddCommentPermission: boolean = false;
  el: number = 100;
  comment: string = '';
  commentUserNames: string[] = [];
  @Input() teamMembers: User[] = [];
  evaluators: User[] = [];
  commentTimeElapsed: string[] = [];
  commentUserProfilePicturePath: string[] = [];
  numberOfcomments: number = 0;
  currentUser: User = {};
  @Input() evaluationSummary: any = {};
  @Input() colors: any = {};
  displayEvaluationSummary: boolean = false;

  avatarNoPicturePath: string = '../../../assets/img/user.png';
  showPopUpTeam: boolean[] = [];
  @Input() solution: Solution = {};
  @Input() comments: any[] = [];
  @Input() user: User = {};
  excerpt: string = '';
  profilePicture?: string = '';
  constructor(
    private time: TimeService,
    public auth: AuthService,
    private solutionService: SolutionService,
    public data: DataService,
    private router: Router
  ) {}

  showComments: boolean = false;
  full: boolean = false;
  fullAritcle: string = '';
  @Input() timeElapsed: string = '';
  ngOnInit(): void {
    this.timeElapsed = this.time.timeAgo(this.solution.submissionDate!);
    this.currentUser = this.auth.currentUser;
    if (this.teamMembers.length === 0) {
      this.getMembers();
    }
    this.evaluationSummary = this.data.mapEvaluationToNumeric(
      this.solution.evaluationSummary!
    );
    this.colors = this.data.mapEvaluationToColors(
      this.solution.evaluationSummary!
    );
    // console.log('Here i am evaluation summary', this.evaluationSummary);

    if (
      this.currentUser?.profilePicture &&
      this.currentUser.profilePicture.path
    ) {
      this.profilePicture = this.currentUser.profilePicture.downloadURL;
      // console.log('here  iam', this.profilePicturePath);
    }
    this.comments = this.solution.comments!;
    this.initializeComments();
  }

  getMembers() {
    for (const key in this.solution.participants) {
      let participant = this.solution.participants[key];
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
  goToEvaluationSummary() {
    this.router.navigate(['/evaluation-summary/' + this.solution.solutionId]);
  }

  // async initializeComments() {
  //   if (this.comments) {
  //     this.numberOfcomments = Object.keys(this.comments).length;

  //     // An array to store promises for user data fetching
  //     const userPromises = Object.entries(this.comments!).map(([key]) => {
  //       const element = key.split('#');
  //       this.commentTimeElapsed.push(this.time.timeAgo(element[1]));

  //       return new Promise<any>((resolve, reject) => {
  //         this.auth.getAUser(element[0]).subscribe(
  //           (data: any) => resolve(data),
  //           (error) => reject(error)
  //         );
  //       });
  //     });

  //     const users = await Promise.all(userPromises);
  //     users.forEach((data) => {
  //       this.commentUserNames.push(data.firstName + ' ' + data.lastName);

  //       if (data.profilePicture && data.profilePicture.downloadURL) {
  //         this.commentUserProfilePicturePath.push(
  //           data.profilePicture.downloadURL
  //         );
  //       } else {
  //         this.commentUserProfilePicturePath.push(
  //           '../../../assets/img/user.png'
  //         );
  //       }
  //     });
  //   }
  // }

  async initializeComments() {
    if (this.comments && this.comments.length > 0) {
      this.numberOfcomments = this.comments.length;

      // An array to store promises for user data fetching
      const userPromises = this.comments.map((comment) => {
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
            this.commentUserProfilePicturePath.push(
              '../../../assets/img/user.png'
            );
          }
        }
      });
    }
  }

  findLength(comments: any) {
    if (comments) {
      return Object.keys(comments).length;
    } else return 0;
  }

  extractComments(comments: any) {}

  showLessOrMore() {
    if (this.full) {
      this.full = false;
    } else {
      this.full = true;
    }
  }

  displayComments() {
    if (this.showComments) {
      this.showComments = false;
    } else {
      this.showComments = true;
    }
  }
  addComment() {
    if (!this.auth.currentUser) {
      this.displayAddCommentPermission = true;
    } else {
    }
    // const comments = {
    //   [`${
    //     this.auth.currentUser.uid
    //   }#${this.time.todaysDate()}`]: `${this.comment}`,
    // };

    if (this.comments) {
      this.comments.push({
        authorId: this.auth.currentUser.uid,
        date: this.time.todaysDate(),
        content: this.comment,
        likes: '0',
        dislikes: '0',
      });
    } else {
      this.comments = [
        {
          authorId: this.auth.currentUser.uid,
          date: this.time.todaysDate(),
          content: this.comment,
          likes: '0',
          dislikes: '0',
        },
      ];
    }

    this.solutionService.addCommentToSolution(this.solution, this.comments);
    this.comment = '';
  }

  closeDisplayCommentPermission() {
    this.displayAddCommentPermission = false;
  }

  onHoverImageTeam(index: number) {
    this.showPopUpTeam[index] = true;
  }
  onLeaveTeam(index: number) {
    this.showPopUpTeam[index] = false;
  }

  onHoverEvaluation() {
    this.displayEvaluationSummary = true;
  }
  onLeaveEvaluation() {
    this.displayEvaluationSummary = false;
  }
}
