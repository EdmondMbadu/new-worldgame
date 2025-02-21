import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Solution, Evaluation } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-solution-evaluation',
  templateUrl: './solution-evaluation.component.html',
  styleUrls: ['./solution-evaluation.component.css'],
})
export class SolutionEvaluationComponent implements OnInit {
  @Input() currentSolution: Solution = {};
  @Input() teamMembers: User[] = [];
  @Input() comments: any[] = [];
  @Input() user: User = {};
  @Input() timeElapsed: string = '';
  @Input() evaluationSummary: any = {};
  @Input() colors: any = {};

  // Extra, if needed:
  comment: string = '';
  commentUserNames: string[] = [];
  commentUserProfilePicturePath: string[] = [];
  commentTimeElapsed: string[] = [];
  numberOfcomments: number = 0;

  hoverLikes = false;
  hoverShare = false;
  hoverTournament = false;
  hoverWinner = false;
  displayEvaluationSummary = false;
  displaySharePost = false;
  isCopied = false;
  showPopUpTeam: boolean[] = [];
  edited = '';
  currentUser: User = {};
  avatarNoPicturePath: string = '../../../assets/img/user.png';

  // For controlling "edit solution" or "delete solution" modals, etc. (if you wish)
  displayEditSolution = false;
  confirmationEditSolution = false;
  confirmationDeleteSolution = false;

  // Example flags for identifying if the current user is a contributor
  isContributorOfThisSolution = false;
  iscreatorOfThisSolution = false;

  constructor(
    private time: TimeService,
    public auth: AuthService,
    private router: Router,
    public data: DataService,
    private solutionService: SolutionService
  ) {}

  ngOnInit(): void {
    // Save the current user for reference
    this.currentUser = this.auth.currentUser;

    // If no time elapsed was passed in, we can set it here
    if (!this.timeElapsed && this.currentSolution.submissionDate) {
      this.timeElapsed = this.time.timeAgo(this.currentSolution.submissionDate);
    }

    // If no teamMembers array was passed, we can look them up
    if (this.teamMembers.length === 0 && this.currentSolution.participants) {
      this.getMembers();
    }

    // Convert evaluation summary to numeric (colors, percentages, etc.)
    if (this.currentSolution.evaluationSummary) {
      this.evaluationSummary = this.data.mapEvaluationToNumeric(
        this.currentSolution.evaluationSummary
      );
      this.colors = this.data.mapEvaluationToColors(
        this.currentSolution.evaluationSummary
      );
    }

    // Initialize the comments to show usernames, profile images, etc.
    this.initializeComments();

    // If you have logic to check if user is contributor:
    this.checkIfContributor();
  }

  /**
   * Load the team members’ user data given the solution.participants array
   */
  getMembers() {
    if (!this.currentSolution.participants) return;
    for (const key in this.currentSolution.participants) {
      let participant = this.currentSolution.participants[key];
      let email = Object.values(participant)[0];
      this.auth.getUserFromEmail(email).subscribe((data) => {
        if (data && data[0]) {
          // Add only if not already in the array
          if (!this.teamMembers.some((m) => m.email === data[0].email)) {
            this.teamMembers.push(data[0]);
          }
        }
      });
    }
  }

  /**
   * Fill in local arrays for comment authors, time-ago stamps, etc.
   */
  async initializeComments() {
    if (this.comments && this.comments.length > 0) {
      this.numberOfcomments = this.comments.length;
      const userPromises = this.comments.map((comment) => {
        if (comment.date) {
          this.commentTimeElapsed.push(this.time.timeAgo(comment.date));
        }
        if (comment.authorId) {
          // fetch the user by authorId
          return new Promise<any>((resolve, reject) => {
            this.auth.getAUser(comment.authorId).subscribe(
              (data: any) => resolve(data),
              (error) => reject(error)
            );
          });
        } else {
          return Promise.resolve(null);
        }
      });
      const users = await Promise.all(userPromises);
      users.forEach((data: any) => {
        if (data) {
          const fullName = data.firstName + ' ' + data.lastName;
          this.commentUserNames.push(fullName);
          if (data.profilePicture?.downloadURL) {
            this.commentUserProfilePicturePath.push(
              data.profilePicture.downloadURL
            );
          } else {
            this.commentUserProfilePicturePath.push(''); // or push an empty string
          }
        }
      });
    }
  }

  /**
   * Example logic for liking a solution
   */
  addLike() {
    if (!this.currentSolution.likes) {
      this.currentSolution.likes = [];
    }
    if (!this.currentUser.uid) return;
    const idx = this.currentSolution.likes.indexOf(this.currentUser.uid);
    if (idx === -1) {
      // not liked yet, so push
      this.currentSolution.likes.push(this.currentUser.uid);
      this.solutionService.addLikes(this.currentSolution);
    } else {
      // un-like
      this.currentSolution.likes.splice(idx, 1);
      this.solutionService.removeLikes(this.currentSolution);
    }
  }

  openSharetoSocialMedia() {
    this.displaySharePost = true;
  }
  closeSharePost() {
    this.displaySharePost = false;
  }

  share(social: string) {
    const link = `https://new-worldgame.web.app/solution-view-external/${this.currentSolution.solutionId}`;
    if (social === 'facebook') {
      // etc. your existing logic
    } else if (social === 'twitter') {
      // ...
    } else if (social === 'email') {
      // ...
    } else if (social === 'linkedin') {
      // ...
    } else {
      this.copyToClipboard();
    }
    // Increase the solution’s share count
    this.solutionService.addNumShare(this.currentSolution);
  }

  copyToClipboard(): void {
    const link = `https://new-worldgame.web.app/solution-view-external/${this.currentSolution.solutionId}`;
    // Basic approach
    const listener = (e: ClipboardEvent) => {
      e.clipboardData!.setData('text/plain', link);
      e.preventDefault();
    };
    document.addEventListener('copy', listener);
    document.execCommand('copy');
    document.removeEventListener('copy', listener);
    this.isCopied = true;
    setTimeout(() => (this.isCopied = false), 2000);
  }

  // Simple hover booleans
  onHoverLikes() {
    this.hoverLikes = true;
  }
  onLeaveLikes() {
    this.hoverLikes = false;
  }
  onHoverShare() {
    this.hoverShare = true;
  }
  onLeaveShare() {
    this.hoverShare = false;
  }
  onHoverTournament() {
    this.hoverTournament = true;
  }
  onLeaveTournament() {
    this.hoverTournament = false;
  }
  onHoverWinner() {
    this.hoverWinner = true;
  }
  onLeaveWinner() {
    this.hoverWinner = false;
  }

  onHoverEvaluation() {
    this.displayEvaluationSummary = true;
  }
  onLeaveEvaluation() {
    this.displayEvaluationSummary = false;
  }

  onHoverImageTeam(index: number) {
    this.showPopUpTeam[index] = true;
  }
  onLeaveTeam(index: number) {
    this.showPopUpTeam[index] = false;
  }

  /**
   * Post a new comment
   */
  addComment() {
    if (!this.auth.currentUser) {
      // e.g. show “Please log in” message
      return;
    }
    if (!this.comments) {
      this.comments = [];
    }
    const newComment = {
      authorId: this.auth.currentUser.uid,
      date: this.time.todaysDate(),
      content: this.comment,
      likes: '0',
      dislikes: '0',
    };
    this.comments.push(newComment);
    // Save to Firestore or whichever DB
    this.solutionService.addCommentToSolution(
      this.currentSolution,
      this.comments
    );

    this.comment = '';
  }

  // If you want to navigate to an evaluation summary:
  goToEvaluationSummary() {
    this.router.navigate([
      '/evaluation-summary/' + this.currentSolution.solutionId,
    ]);
  }

  // Example logic to see if the current user is a contributor
  checkIfContributor() {
    if (!this.currentSolution.participants || !this.currentUser?.uid) return;
    // you can set flags like:
    // this.isContributorOfThisSolution = ...
    // this.iscreatorOfThisSolution = ...
  }

  // Example modals to edit or delete the solution
  toggleEditSolution() {
    this.displayEditSolution = !this.displayEditSolution;
  }
  toggleConfirmationEditSolution() {
    this.confirmationEditSolution = !this.confirmationEditSolution;
  }
  submitEditSolution() {
    // do your edit
    this.toggleConfirmationEditSolution();
  }
  toggleConfirmationDeleteSolution() {
    this.confirmationDeleteSolution = !this.confirmationDeleteSolution;
  }
  submitDeleteSolution() {
    // do your delete
    this.toggleConfirmationDeleteSolution();
  }
}
