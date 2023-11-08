import { Component, Input, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
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
  comment: string = '';
  commentUserNames: string[] = [];
  @Input() teamMembers: User[] = [];
  evaluators: User[] = [];
  commentTimeElapsed: string[] = [];
  commentUserProfilePicturePath: string[] = [];
  numberOfcomments: number = 0;
  currentUser: User = {};

  avatarNoPicturePath: string = '../../../assets/img/user.png';
  showPopUpTeam: boolean[] = [];
  @Input() solution: Solution = {};
  @Input() comments = {};
  @Input() user: User = {};
  excerpt: string = '';
  profilePicture?: string = '';
  constructor(
    private time: TimeService,
    private auth: AuthService,
    private solutionService: SolutionService,
    public data: DataService
  ) {}

  showComments: boolean = false;
  full: boolean = false;
  fullAritcle: string = '';
  timeElapsed: string = '';
  ngOnInit(): void {
    this.timeElapsed = this.time.timeAgo(this.solution.submissionDate!);
    this.currentUser = this.auth.currentUser;
    if (this.teamMembers.length === 0) {
      this.getMembers();
    }
    // for(let p of this.solution.participants)
    if (
      this.currentUser?.profilePicture &&
      this.currentUser.profilePicture.path
    ) {
      this.profilePicture = this.currentUser.profilePicture.downloadURL;
      // console.log('here  iam', this.profilePicturePath);
    }
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

  async initializeComments() {
    if (this.solution.comments) {
      this.numberOfcomments = Object.keys(this.solution.comments!).length;

      // An array to store promises for user data fetching
      const userPromises = Object.entries(this.solution.comments!).map(
        ([key]) => {
          const element = key.split('#');
          this.commentTimeElapsed.push(this.time.timeAgo(element[1]));

          return new Promise<any>((resolve, reject) => {
            this.auth.getAUser(element[0]).subscribe(
              (data: any) => resolve(data),
              (error) => reject(error)
            );
          });
        }
      );

      const users = await Promise.all(userPromises);
      users.forEach((data) => {
        this.commentUserNames.push(data.firstName + ' ' + data.lastName);

        if (data.profilePicture.downloadURL) {
          this.commentUserProfilePicturePath.push(
            data.profilePicture.downloadURL
          );
        } else {
          this.commentUserProfilePicturePath.push(
            '../../../assets/img/user.png'
          );
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
      const comments = {
        [`${
          this.auth.currentUser.uid
        }#${this.time.todaysDate()}`]: `${this.comment}`,
      };

      this.solutionService.addCommentToSolution(this.solution, comments);
      this.comment = '';
    }
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
}
