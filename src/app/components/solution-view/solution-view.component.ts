import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Evaluation, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-solution-view',
  templateUrl: './solution-view.component.html',
  styleUrls: ['./solution-view.component.css'],
})
export class SolutionViewComponent implements OnInit {
  solutionId: any = '';
  edited: string = '';
  displayEditSolution: boolean = false;
  displayAddCommentPermission: boolean = false;
  displayDeleteSolution: boolean = false;
  confirmationEditSolution: boolean = false;
  confirmationDeleteSolution: boolean = false;
  confirmPublishSolution: boolean = false;
  currentSolution: Solution = {};
  otherSolutions: Solution[] = [];
  showPopUpTeam: boolean[] = [];
  isContributorOfThisSolution: boolean = false;
  iscreatorOfThisSolution: boolean = false;
  currentAuth: User = {};
  isCopied = false;
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
  hoverTournament: boolean = false;
  evaluatorsAdmin: any = {};

  hoverWinner: boolean = false;

  teamMembers: User[] = [];
  hoverShare: boolean = false;
  hoverLikes: boolean = false;
  displayEvaluationSummary: boolean = false;
  displaySharePost: boolean = false;

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private activatedRoute: ActivatedRoute,
    private time: TimeService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions
  ) {}
  isLoggedIn: boolean = false;
  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
      this.solutionId = params.get('id');
      window.scroll(0, 0);

      this.loadSolutionData(this.solutionId);
    });
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
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
        if (this.currentSolution.authorEmail === this.auth.currentUser.email) {
          this.iscreatorOfThisSolution = true;
        }
        if (this.currentSolution.edited === 'true') {
          this.edited = ' (Edited)';
        }
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
    this.teamMembers = [];
    for (const key in this.currentSolution.participants) {
      let participant = this.currentSolution.participants[key];
      let email = Object.values(participant)[0];
      if (email === this.auth.currentUser.email) {
        this.isContributorOfThisSolution = true;
      }

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
  onHoverShare() {
    this.hoverShare = true;
  }
  onLeaveShare() {
    this.hoverShare = false;
  }
  onHoverLikes() {
    this.hoverLikes = true;
  }
  onLeaveLikes() {
    this.hoverLikes = false;
  }

  onHoverEvaluation() {
    this.displayEvaluationSummary = true;
  }
  onLeaveEvaluation() {
    this.displayEvaluationSummary = false;
  }
  onHoverTournament() {
    this.hoverTournament = true;
  }

  onLeaveTournament() {
    this.hoverTournament = false;
  }

  addLike() {
    this.currentSolution.likes =
      typeof this.currentSolution.likes === 'string' ||
      this.currentSolution.likes === undefined
        ? []
        : this.currentSolution.likes;
    if (
      this.currentSolution.likes !== undefined &&
      this.currentSolution.likes!.indexOf(this.auth.currentUser.uid) === -1
    ) {
      this.currentSolution.likes.push(this.auth.currentUser.uid);
      this.solution.addLikes(this.currentSolution);
    } else {
      this.currentSolution.likes = this.currentSolution.likes!.filter(
        (item) => {
          return item !== this.auth.currentUser.uid;
        }
      );
      this.solution.removeLikes(this.currentSolution);
    }
  }
  openSharetoSocialMedia() {
    this.displaySharePost = true;
  }

  onHoverWinner() {
    this.hoverWinner = true;
  }
  onLeaveWinner() {
    this.hoverWinner = false;
  }
  goToEvaluationSummary() {
    this.router.navigate([
      '/evaluation-summary/' + this.currentSolution.solutionId,
    ]);
  }
  closeSharePost() {
    this.displaySharePost = false;
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
      const message = `Hi! I've recently developed a NewWorld Game solution titled ${this.currentSolution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness`;
      const encodedMessage = encodeURIComponent(message);
      const url = `https://twitter.com/intent/tweet?url=https://new-worldgame.web.app/solution-view-external/${this.currentSolution.solutionId}&text=${encodedMessage}`;

      window.open(url, '_blank');
    } else if (social === 'email') {
      const url = `mailto:?subject=NewWorld Game Solution Invitation &body=Hi! I've recently developed a solution titled ${this.currentSolution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness! https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`;
      window.open(url, '_blank');
    } else if (social === 'linkedin') {
      const linkedInMessage = `Hi! I've recently developed a solution titled ${this.currentSolution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness. Check it out here: https://new-worldgame.web.app/solution-view-external/${this.solution.solutionId}`;
      const encodedLinkedInMessage = encodeURIComponent(linkedInMessage);
      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLinkedInMessage}`;
      window.open(url, '_blank');
    } else {
      this.copyToClipboard();
    }
    this.solution.addNumShare(this.currentSolution);
  }
  copyToClipboard(): void {
    const listener = (e: ClipboardEvent) => {
      e.clipboardData!.setData(
        'text/plain',
        `https://new-worldgame.web.app/solution-view-external/${this.currentSolution.solutionId}`
      );
      e.preventDefault();
    };

    document.addEventListener('copy', listener);
    document.execCommand('copy');
    document.removeEventListener('copy', listener);
    this.isCopied = true;
    setTimeout(() => (this.isCopied = false), 2000); // Reset after 2 seconds
  }
  toggleEditSolution() {
    this.displayEditSolution = !this.displayEditSolution;
  }
  toggleConfirmationEditSolution() {
    this.confirmationEditSolution = !this.confirmationEditSolution;
  }
  toggle(
    property:
      | 'displayEditSolution'
      | 'displayAddCommentPermission'
      | 'displayDeleteSolution'
      | 'confirmationEditSolution'
      | 'confirmationDeleteSolution'
      | 'confirmPublishSolution'
  ) {
    this[property] = !this[property];
  }
  toggleConfirmationDeleteSolution() {
    this.confirmationDeleteSolution = !this.confirmationDeleteSolution;
  }

  submitDeleteSolution() {
    this.solution.deleteSolution(this.currentSolution.solutionId!);
    this.toggleConfirmationDeleteSolution();
    this.router.navigate(['/home']);
  }

  submitEditSolution() {
    this.currentSolution.evaluators?.forEach((ev) => {
      ev.evaluated = 'false';
    });
    this.solution.editSolutionAfterInitialSubmission(
      this.currentSolution.solutionId!,
      this.currentSolution
    );
    this.toggleConfirmationEditSolution();
    this.router.navigate(['/dashboard', this.currentSolution.solutionId]);
  }
  submitForPublication() {
    this.currentSolution.statusForPublication = 'pending';
    // add admin as evaluator first to approve this solution
    this.addAdminToValidateSolutionForPublication();
    this.solution.submitSolutionForPublication(
      this.currentSolution.solutionId!,
      this.currentSolution
    );
    // send email to admin
    this.sendRequestForEvaluation();
    this.toggle('confirmPublishSolution');

    alert('Solution successfully submitted for evaluation!');
    return;
    // this.router.navigate(['/dashboard', this.currentSolution.solutionId]);
  }

  addAdminToValidateSolutionForPublication() {
    const adminsToAdd = [
      { name: 'mbadungoma@gmail.com' },
      { name: 'medard@1earthgame.org' },
      { name: 'jimwalker@mindpalace.com' },
      { name: 'newworld@newworld-game.org' },
      { name: 'globalsollab@gmail.com' },
    ];

    if (!this.currentSolution.evaluators) {
      this.currentSolution.evaluators = [];
    }

    const existingNames = new Set(
      this.currentSolution.evaluators.map((e) => e.name)
    );

    adminsToAdd.forEach((admin) => {
      if (!existingNames.has(admin.name)) {
        this.currentSolution.evaluators?.push(admin);
      }
    });
  }
  sendRequestForEvaluation() {
    const solutionEvaluationInvite = this.fns.httpsCallable(
      'solutionEvaluationInvite'
    );

    const emailData = {
      email: 'newworld@newworld-game.org',
      // email: this.auth.currentUser.email,
      subject: `Call for Publication: Evaluation of NewWorld Game Solution: ...`,
      title: this.currentSolution.title,
      description: `${this.currentSolution.title} by ${this.currentSolution.authorName}`,
      path: `https://newworld-game.org/problem-feedback/${this.currentSolution.solutionId}`,
    };

    solutionEvaluationInvite(emailData).subscribe(
      (result) => {
        console.log('Email sent:', result);
      },
      (error) => {
        console.error('Error sending email:', error);
      }
    );
  }

  updateEvaluationToNotEvaluated() {
    this.currentSolution.evaluators?.forEach((ev) => {
      ev.evaluated = 'false';
    });
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
    // Update time elapsed for the new comment directly
    let newCommentDate = this.time.todaysDate(); // Ensure this is compatible with your timeAgo method
    // Calculate time elapsed for the new comment
    let timeElapsedForNewComment = this.time.timeAgo(newCommentDate);
    this.commentTimeElapsed.push(timeElapsedForNewComment);
    try {
      this.solution.addCommentToSolution(this.currentSolution, this.comments);
      // .then(() => {
      //   this.initializeComments();
      // });
      this.comment = '';
      this.sendEmailForCommentNotification();
    } catch (error) {
      alert('An error occured while submitting the comment. Try Again.');
      console.log(error);
      console.log('an error ocurred. try again.');
    }
  }
  sendEmailForCommentNotification() {
    const commentNotificationEmail = this.fns.httpsCallable(
      'commentNotificationEmail'
    );

    this.teamMembers.forEach((evaluator) => {
      const emailData = {
        email: evaluator.email,
        subject: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName} has commented on your NewWorld Game solution: ${this.currentSolution.title}`,
        // title: this.myForm.value.title,
        // description: this.myForm.value.description,
        path: `https://newworld-game.org/solution-view/${this.currentSolution.solutionId}`,
        // Include any other data required by your Cloud Function
      };

      commentNotificationEmail(emailData).subscribe(
        (result) => {
          console.log('Email sent:', result);
        },
        (error) => {
          console.error('Error sending email:', error);
        }
      );
    });
  }
}
