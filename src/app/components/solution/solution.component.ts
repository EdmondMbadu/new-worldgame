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
  isCopied = false;
  el: number = 100;
  @Input() fullPage: boolean = true;
  comment: string = '';
  hoverLikes: boolean = false;
  hoverComments: boolean = false;
  hoverShare: boolean = false;
  hoverWinner: boolean = false;
  hoverTournament: boolean = false;
  commentUserNames: string[] = [];
  @Input() teamMembers: User[] = [];
  evaluators: User[] = [];
  commentTimeElapsed: string[] = [];
  touched: boolean = false;
  commentUserProfilePicturePath: string[] = [];
  numberOfcomments: number = 0;
  currentUser: User = {};
  @Input() evaluationSummary: any = {};
  @Input() colors: any = {};
  displayEvaluationSummary: boolean = false;
  displaySharePost: boolean = false;

  avatarNoPicturePath: string = '../../../assets/img/user.png';
  showPopUpTeam: boolean[] = [];
  @Input() solution: Solution = {};
  @Input() comments: any[] = [];
  @Input() user: User = {};
  excerpt: string = '';
  profilePicture?: string = '';
  expandedStates: { [solutionId: string]: boolean } = {};
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
            this.commentUserProfilePicturePath.push();
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
    if (this.fullPage) {
      this.router.navigate(['/solution-view', this.solution.solutionId]);
    }
    this.full = !this.full;
  }

  displayComments() {
    this.showComments = !this.showComments;
  }
  openSharetoSocialMedia() {
    this.displaySharePost = true;
  }

  addLike() {
    this.solution.likes =
      typeof this.solution.likes === 'string' ||
      this.solution.likes === undefined
        ? []
        : this.solution.likes;

    console.log(
      'solution likes and liker ',
      this.solution.likes,
      this.auth.currentUser.uid
    );
    if (
      this.solution.likes !== undefined &&
      this.solution.likes!.indexOf(this.auth.currentUser.uid) === -1
    ) {
      this.solution.likes.push(this.auth.currentUser.uid);
      this.solutionService.addLikes(this.solution);
    } else {
      this.solution.likes = this.solution.likes!.filter((item) => {
        return item !== this.auth.currentUser.uid;
      });
      this.solutionService.removeLikes(this.solution);
    }
  }
  addComment() {
    if (!this.auth.currentUser) {
      this.displayAddCommentPermission = true;
      return;
    }
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
  share(social: string) {
    if (social === 'facebook') {
      const facebookUrl = `https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`;
      const encodedFacebookUrl = encodeURIComponent(facebookUrl);
      const facebookMessage = `Hi! I've recently developed a solution titled ${this.solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness.`;
      const encodedFacebookMessage = encodeURIComponent(facebookMessage);
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodedFacebookUrl}&quote=${encodedFacebookMessage}`;

      window.open(url, '_blank');
    } else if (social === 'twitter') {
      const message = `Hi! I've recently developed a NewWorld Game solution titled ${this.solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness`;
      const encodedMessage = encodeURIComponent(message);
      const url = `https://twitter.com/intent/tweet?url=https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}&text=${encodedMessage}`;

      window.open(url, '_blank');
    } else if (social === 'email') {
      const url = `mailto:?subject=NewWorld Game Solution Invitation &body=Hi! I've recently developed a solution titled ${this.solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness! https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`;
      window.open(url, '_blank');
    } else if (social === 'linkedin') {
      const linkedInMessage = `Hi! I've recently developed a solution titled ${this.solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness. Check it out here: https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`;
      const encodedLinkedInMessage = encodeURIComponent(linkedInMessage);
      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLinkedInMessage}`;
      window.open(url, '_blank');
    } else {
      this.copyToClipboard();
    }
    this.solutionService.addNumShare(this.solution);
  }

  closeSharePost() {
    this.displaySharePost = false;
  }
  copyToClipboard(): void {
    const listener = (e: ClipboardEvent) => {
      e.clipboardData!.setData(
        'text/plain',
        `https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`
      );
      e.preventDefault();
    };

    document.addEventListener('copy', listener);
    document.execCommand('copy');
    document.removeEventListener('copy', listener);
    this.isCopied = true;
    setTimeout(() => (this.isCopied = false), 2000); // Reset after 2 seconds
  }

  onHoverImageTeam(index: number) {
    this.showPopUpTeam[index] = true;
  }
  onHoverLikes() {
    this.hoverLikes = true;
  }
  onLeaveLikes() {
    this.hoverLikes = false;
  }
  onHoverComments() {
    this.hoverComments = true;
  }
  onHoverTournament() {
    this.hoverTournament = true;
  }

  onLeaveTournament() {
    this.hoverTournament = false;
  }
  onLeaveComments() {
    this.hoverComments = false;
  }
  onHoverShare() {
    this.hoverShare = true;
  }

  onHoverWinner() {
    this.hoverWinner = true;
  }
  onLeaveWinner() {
    this.hoverWinner = false;
  }
  onLeaveShare() {
    this.hoverShare = false;
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
