import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Evaluator, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-solution-preview',

  templateUrl: './solution-preview.component.html',
  styleUrl: './solution-preview.component.css',
})
export class SolutionPreviewComponent implements OnInit {
  solutionId: any = '';
  edited: string = '';
  displayEditSolution: boolean = false;
  displayAddCommentPermission: boolean = false;
  displayDeleteSolution: boolean = false;
  confirmationEditSolution: boolean = false;
  confirmationDeleteSolution: boolean = false;
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
  etAl: string = '';
  comments: any = {};
  commentUserProfilePicturePath: string[] = [];
  numberOfcomments: number = 0;
  commentTimeElapsed: string[] = [];
  comment: string = '';
  commentUserNames: string[] = [];
  hoverTournament: boolean = false;
  evaluators: any[] = [];
  isLoading: boolean = false;

  hoverWinner: boolean = false;
  displayCongrats: boolean = false;
  submitDisplay: boolean = false;

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
    public router: Router,
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
        // fill the evaluator class
        this.currentSolution.evaluators?.forEach((ev: any) => {
          this.evaluators.push(ev);
          console.log('evaluators', this.evaluators);
        });
        this.etAl =
          Object.keys(this.currentSolution.participants!).length > 1
            ? 'Et al'
            : '';
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
    console.log('list all the team members', this.teamMembers);
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
  async finallySubmitSolution() {
    // check if one is submitting what was previously saved
    this.isLoading = true;
    try {
      this.solution.submitSolution(this.solutionId).then(() => {
        console.log('Submission successful, sending request for evaluation.');
        this.sendRequestForEvaluation();
        this.router.navigate(['/solution-view', this.solutionId]);
        // this.submissionComplete.emit(); // Emit event to parent
        // this.toggleCongrats();
        // Additional logic on successful submission
      });
    } catch (error) {
      alert('An error occured while submitting the solution. Try again');
      console.log(error);
    }
  }
  toggleSubmission() {
    this.submitDisplay = !this.submitDisplay;
  }
  sendRequestForEvaluation() {
    const solutionEvaluationInvite = this.fns.httpsCallable(
      'solutionEvaluationInvite'
    );
    // remove duplicate in evaluators
    const evaluatorSet = new Set();
    this.evaluators = this.evaluators.filter((evaluator) => {
      const duplicate = evaluatorSet.has(evaluator.name);
      evaluatorSet.add(evaluator.name);
      return !duplicate;
    });
    this.evaluators.forEach((evaluator) => {
      const emailData = {
        email: evaluator.name,
        subject: `You have been invited to evaluate the NewWorld Game solution: ...`,
        title: this.currentSolution.title,
        description: `${this.currentSolution.title} by ${this.currentSolution.authorName} ${this.etAl}`,
        path: `https://newworld-game.org/problem-feedback/${this.currentSolution.solutionId}`,
        // Include any other data required by your Cloud Function
      };

      solutionEvaluationInvite(emailData).subscribe(
        (result) => {
          console.log('Email sent:', result);
        },
        (error) => {
          console.error('Error sending email:', error);
        }
      );
    });
  }

  openFeedback() {
    const url =
      'https://docs.google.com/forms/d/e/1FAIpQLSdmK6F4EDAvXNZsuUBYdQ4CW1h9hIdlA44qYajMsmHBNa4jrQ/viewform?usp=sf_link';
    window.open(url, '_blank');
    this.toggleCongratsAndDone();
  }
  toggle(property: 'isLoading') {
    this[property] = !this[property];
  }
  toggleCongrats() {
    this.displayCongrats = !this.displayCongrats;
  }
  toggleCongratsAndDone() {
    this.displayCongrats = !this.displayCongrats;
    this.router.navigate(['/solution-view', this.solutionId]);
  }

  accept() {
    this.submitDisplay = false;

    this.finallySubmitSolution();
    // Reset submission response to allow future submissions, but only after current process is complete
  }

  // generatePdfFromHtml(): void {
  //   let htmlContent = this.currentSolution.content!;
  //   console.log('html content', htmlContent);
  //   // 1. Create a new jsPDF instance
  //   const doc = new jsPDF({
  //     unit: 'pt', // 'pt' for points, 'px' for pixels, etc.
  //     format: 'letter', // or 'a4', 'legal', etc.
  //   });

  //   // 2. Use the .html(...) function to parse and render HTML
  //   doc.html(htmlContent, {
  //     x: 20, // left margin
  //     y: 20, // top margin
  //     width: 560, // rendering width (approx. 8.5in - margins for letter)
  //     // You can adjust "windowWidth" if your HTML is wide and you want scaling
  //     // windowWidth: 800,

  //     // 3. Callback runs once HTML rendering finishes
  //     callback: function (doc) {
  //       // 4. Save the PDF
  //       doc.save('StrategyReview.pdf');
  //     },
  //   });
  // }

  // async generatePdfFromHtml() {
  //   // 1. Create a hidden container in the DOM
  //   const container = document.createElement('div');
  //   container.style.position = 'absolute';
  //   container.style.left = '-9999px'; // hide offscreen
  //   // Force a narrower width so text wraps nicely
  //   container.style.width = '600px';
  //   // Add padding if desired
  //   container.style.padding = '20px';
  //   // Ensure long text wraps
  //   container.style.whiteSpace = 'normal';
  //   container.style.wordWrap = 'break-word';

  //   container.innerHTML = this.currentSolution.content ?? '';
  //   document.body.appendChild(container);

  //   // 2. Use html2canvas to make a higher-resolution screenshot
  //   const canvas = await html2canvas(container, {
  //     scale: 3, // Increase if still too small; 3 or 4 often looks good
  //   });

  //   // 3. Convert canvas to image data
  //   const imgData = canvas.toDataURL('image/png');

  //   // 4. Create jsPDF (Letter in pts: 612 x 792)
  //   const pdf = new jsPDF('p', 'pt', 'letter');
  //   const pdfWidth = pdf.internal.pageSize.getWidth();
  //   const pdfHeight = pdf.internal.pageSize.getHeight();

  //   // Keep aspect ratio of the rendered canvas
  //   const imgWidth = canvas.width;
  //   const imgHeight = canvas.height;
  //   const ratio = imgHeight / imgWidth;

  //   // Add margins so it doesn't run edge to edge
  //   const marginLeft = 40;
  //   const marginTop = 40;
  //   const usableWidth = pdfWidth - marginLeft * 2; // room for left+right margins
  //   const usableHeight = usableWidth * ratio;

  //   // 5. Add the image to the PDF
  //   pdf.addImage(
  //     imgData,
  //     'PNG',
  //     marginLeft,
  //     marginTop,
  //     usableWidth,
  //     usableHeight
  //   );

  //   // 6. Save
  //   pdf.save('StrategyReview.pdf');

  //   // 7. Cleanup
  //   document.body.removeChild(container);
  // }

  // async generatePdfFromHtml() {
  //   let htmlContent = this.currentSolution.content!;
  //   // 1) Create a hidden container so we can render the HTML
  //   const container = document.createElement('div');
  //   container.style.position = 'absolute';
  //   container.style.left = '-9999px';
  //   container.style.width = '600px';
  //   container.style.padding = '20px';
  //   container.style.whiteSpace = 'normal';
  //   container.style.wordWrap = 'break-word';

  //   container.innerHTML = htmlContent;
  //   document.body.appendChild(container);

  //   // --- Wait for all images to load ---
  //   const images = Array.from(container.getElementsByTagName('img'));
  //   // Create an array of Promises that resolve when each image loads
  //   const loadPromises = images.map((img) => {
  //     return new Promise<void>((resolve, reject) => {
  //       // If the image is from a different origin, may need crossOrigin
  //       img.crossOrigin = 'anonymous';

  //       // If already loaded (cached), onload might not fire. So check:
  //       if (img.complete) {
  //         resolve();
  //       } else {
  //         img.onload = () => resolve();
  //         img.onerror = () => reject();
  //       }
  //     });
  //   });

  //   // Wait for all image Promises
  //   await Promise.allSettled(loadPromises);

  //   // 2) Use html2canvas at a decent scale for better text/image quality
  //   const canvas = await html2canvas(container, {
  //     scale: 2,
  //     // Use CORS if needed for external images
  //     useCORS: true,
  //   });

  //   // Cleanup the DOM element
  //   document.body.removeChild(container);

  //   // 3) Prepare jsPDF (Letter size in points: 612 x 792)
  //   const pdf = new jsPDF('p', 'pt', 'letter');

  //   // We'll define margins in points
  //   const marginLeft = 40;
  //   const marginTop = 40;
  //   const pageWidth = pdf.internal.pageSize.getWidth();
  //   const pageHeight = pdf.internal.pageSize.getHeight();

  //   // 4) Calculate how to scale the canvas to fit page width inside margins
  //   const usableWidth = pageWidth - marginLeft * 2;
  //   const pdfHeightUsable = pageHeight - marginTop * 2;
  //   const scaleFactor = usableWidth / canvas.width;
  //   const scaledCanvasHeight = canvas.height * scaleFactor;

  //   // 5) Figure out how many pages we need
  //   const totalPages = Math.ceil(scaledCanvasHeight / pdfHeightUsable);

  //   // 6) Slice the original canvas into chunks, one per page
  //   let yOffset = 0; // how far we've drawn so far (canvas coords)
  //   for (let page = 0; page < totalPages; page++) {
  //     // Create a temporary canvas for one "page" slice
  //     const pageCanvas = document.createElement('canvas');
  //     pageCanvas.width = canvas.width;
  //     const pageCanvasHeight = Math.min(
  //       canvas.height - yOffset,
  //       pdfHeightUsable / scaleFactor
  //     );
  //     pageCanvas.height = pageCanvasHeight;

  //     const pageCtx = pageCanvas.getContext('2d');
  //     if (!pageCtx) continue;

  //     // Draw a slice of the full canvas onto this page canvas
  //     pageCtx.drawImage(
  //       canvas,
  //       0,
  //       yOffset,
  //       canvas.width,
  //       pageCanvasHeight,
  //       0,
  //       0,
  //       canvas.width,
  //       pageCanvasHeight
  //     );

  //     // Convert slice to image
  //     const pageImgData = pageCanvas.toDataURL('image/png');

  //     // Add to PDF
  //     if (page > 0) {
  //       pdf.addPage();
  //     }

  //     const chunkPdfHeight = pageCanvasHeight * scaleFactor;
  //     pdf.addImage(
  //       pageImgData,
  //       'PNG',
  //       marginLeft,
  //       marginTop,
  //       usableWidth,
  //       chunkPdfHeight
  //     );

  //     yOffset += pageCanvasHeight;
  //   }

  //   const pdfUrl = pdf.output('bloburl');
  //   window.open(pdfUrl, '_blank');
  //   // 7) Save the PDF

  //   // pdf.save(`${this.currentSolution.title}.pdf`);
  // }
  // async generatePdfFromHtml() {
  //   // --- 1) Build a new container with the logo, title, team members, and content ---
  //   const container = document.createElement('div');
  //   // Basic styling to ensure it stays off-screen and doesn't affect the layout
  //   container.style.position = 'absolute';
  //   container.style.left = '-9999px';
  //   container.style.width = '600px';
  //   container.style.padding = '20px';
  //   container.style.whiteSpace = 'normal';
  //   container.style.wordWrap = 'break-word';
  //   container.style.fontFamily = 'Arial, sans-serif'; // Example of custom font

  //   // -- (A) Insert the logo at the top --
  //   const logoImg = document.createElement('img');
  //   logoImg.src = '../../../assets/img/earth-triangle-test.png';
  //   // Adjust as you see fit
  //   logoImg.style.display = 'block';
  //   logoImg.style.margin = '0 auto 20px';
  //   logoImg.style.width = '80px';
  //   container.appendChild(logoImg);

  //   // -- (B) Add the Solution Title --
  //   const titleElement: any = document.createElement('h2');
  //   titleElement.textContent = this.currentSolution.title;
  //   titleElement.style.textAlign = 'center';
  //   titleElement.style.marginBottom = '20px';
  //   container.appendChild(titleElement);

  //   // -- (C) Add a "Contributors" heading (optional) --
  //   const contributorsHeader = document.createElement('h3');
  //   contributorsHeader.textContent = 'Contributors';
  //   contributorsHeader.style.textDecoration = 'underline';
  //   contributorsHeader.style.marginBottom = '10px';
  //   container.appendChild(contributorsHeader);

  //   // -- (D) Display the team members in a nice list --
  //   const teamList = document.createElement('ul');
  //   teamList.style.listStyleType = 'circle';
  //   teamList.style.paddingLeft = '20px';

  //   this.teamMembers.forEach((member) => {
  //     const li = document.createElement('li');
  //     li.textContent = `${member.firstName} ${member.lastName}`;
  //     li.style.marginBottom = '6px';
  //     teamList.appendChild(li);
  //   });

  //   container.appendChild(teamList);

  //   // -- (E) Add a small separator or spacing after the list --
  //   const hrElement = document.createElement('hr');
  //   hrElement.style.margin = '20px 0';
  //   container.appendChild(hrElement);

  //   // -- (F) Finally, add the existing solution content below everything else --
  //   const contentDiv = document.createElement('div');
  //   contentDiv.innerHTML = this.currentSolution.content!;
  //   container.appendChild(contentDiv);

  //   // -- Add the container to DOM (so images, etc., can load properly) --
  //   document.body.appendChild(container);

  //   // --- 2) Wait for all images within the container to load ---
  //   const images = Array.from(container.getElementsByTagName('img'));
  //   const loadPromises = images.map((img) => {
  //     return new Promise<void>((resolve, reject) => {
  //       img.crossOrigin = 'anonymous';
  //       if (img.complete) {
  //         resolve();
  //       } else {
  //         img.onload = () => resolve();
  //         img.onerror = () => reject();
  //       }
  //     });
  //   });
  //   await Promise.allSettled(loadPromises);

  //   // --- 3) Render to canvas with html2canvas ---
  //   const canvas = await html2canvas(container, {
  //     scale: 2,
  //     useCORS: true, // In case of external images
  //   });

  //   // Cleanup the DOM element
  //   document.body.removeChild(container);

  //   // --- 4) Prepare jsPDF (Letter size: 612 x 792 points) ---
  //   const pdf = new jsPDF('p', 'pt', 'letter');
  //   const marginLeft = 40;
  //   const marginTop = 40;
  //   const pageWidth = pdf.internal.pageSize.getWidth();
  //   const pageHeight = pdf.internal.pageSize.getHeight();

  //   // Scale canvas to fit page width inside margins
  //   const usableWidth = pageWidth - marginLeft * 2;
  //   const pdfHeightUsable = pageHeight - marginTop * 2;
  //   const scaleFactor = usableWidth / canvas.width;
  //   const scaledCanvasHeight = canvas.height * scaleFactor;

  //   // Calculate total pages needed
  //   const totalPages = Math.ceil(scaledCanvasHeight / pdfHeightUsable);

  //   // --- 5) Slice the canvas into PDF pages ---
  //   let yOffset = 0;
  //   for (let page = 0; page < totalPages; page++) {
  //     // Create a temp canvas for one "page" slice
  //     const pageCanvas = document.createElement('canvas');
  //     pageCanvas.width = canvas.width;
  //     const pageCanvasHeight = Math.min(
  //       canvas.height - yOffset,
  //       pdfHeightUsable / scaleFactor
  //     );
  //     pageCanvas.height = pageCanvasHeight;

  //     const pageCtx = pageCanvas.getContext('2d');
  //     if (!pageCtx) continue;

  //     pageCtx.drawImage(
  //       canvas,
  //       0,
  //       yOffset,
  //       canvas.width,
  //       pageCanvasHeight,
  //       0,
  //       0,
  //       canvas.width,
  //       pageCanvasHeight
  //     );

  //     const pageImgData = pageCanvas.toDataURL('image/png');

  //     if (page > 0) {
  //       pdf.addPage();
  //     }

  //     const chunkPdfHeight = pageCanvasHeight * scaleFactor;
  //     pdf.addImage(
  //       pageImgData,
  //       'PNG',
  //       marginLeft,
  //       marginTop,
  //       usableWidth,
  //       chunkPdfHeight
  //     );

  //     yOffset += pageCanvasHeight;
  //   }

  //   // If you want to open a preview in a new tab:
  //   const pdfUrl = pdf.output('bloburl');
  //   window.open(pdfUrl, '_blank');

  //   // Or directly save:
  //   // pdf.save(`${this.currentSolution.title}.pdf`);
  // }
  async generatePdfFromHtml() {
    this.toggle('isLoading');
    // --- 1) Build a new container with the logo, title, contributors, content ---
    const container = document.createElement('div');
    // Using Roboto Mono as requested
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '600px';
    container.style.padding = '20px';
    container.style.whiteSpace = 'normal';
    container.style.wordWrap = 'break-word';
    container.style.fontFamily = 'Roboto, monospace';
    container.style.lineHeight = '1.5';

    // -- (A) Insert the logo at the top --
    const logoImg = document.createElement('img');
    logoImg.src = '../../../assets/img/earth-triangle-test.png';
    logoImg.style.display = 'block';
    logoImg.style.margin = '0 auto 20px';
    logoImg.style.width = '80px';
    container.appendChild(logoImg);

    // -- (B) Add the Solution Title (big & bold) --
    const titleElement: any = document.createElement('h1');
    titleElement.textContent = this.currentSolution.title;
    titleElement.style.textAlign = 'center';
    titleElement.style.fontWeight = 'bold';
    titleElement.style.fontSize = '32px';
    titleElement.style.marginBottom = '20px';
    container.appendChild(titleElement);

    // -- (C) Display the contributors horizontally in bold italics --
    if (this.teamMembers && this.teamMembers.length > 0) {
      const contributorsContainer = document.createElement('div');
      contributorsContainer.style.textAlign = 'center';
      contributorsContainer.style.marginBottom = '20px';

      // Build the list of contributor names as bold+italic, separated by commas
      const contributorNames = this.teamMembers.map((member) => {
        return `<strong><em>${member.firstName} ${member.lastName}</em></strong>`;
      });
      contributorsContainer.innerHTML = `
        <span style="font-size: 16px;">
          Designers: 
          ${contributorNames.join(', ')}
        </span>
      `;
      container.appendChild(contributorsContainer);
    }
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    const dateElement = document.createElement('div');
    dateElement.style.textAlign = 'center';
    dateElement.style.marginBottom = '20px';
    const dateStr = new Date().toLocaleDateString('en-US', dateOptions);
    dateElement.innerHTML = `<strong>${dateStr}</strong>`;
    container.appendChild(dateElement);

    // -- (D) Add a small horizontal rule (like a LaTeX section break) --
    const hrElement = document.createElement('hr');
    hrElement.style.margin = '20px 0';
    container.appendChild(hrElement);

    // -- (E) Add the existing solution content --
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = this.currentSolution.content!;
    container.appendChild(contentDiv);

    // -- Add the container to the DOM (off-screen) for rendering --
    document.body.appendChild(container);

    // --- 2) Wait for all images to load ---
    const images = Array.from(container.getElementsByTagName('img'));
    const loadPromises = images.map((img) => {
      return new Promise<void>((resolve, reject) => {
        img.crossOrigin = 'anonymous';
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => reject();
        }
      });
    });
    await Promise.allSettled(loadPromises);

    // --- 3) Render container to canvas using html2canvas ---
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
    });

    // Cleanup the DOM element
    document.body.removeChild(container);

    // --- 4) Prepare jsPDF (Letter size: 612 x 792 points) ---
    const pdf = new jsPDF('p', 'pt', 'letter');
    const marginLeft = 40;
    const marginTop = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale canvas to fit page width inside margins
    const usableWidth = pageWidth - marginLeft * 2;
    const pdfHeightUsable = pageHeight - marginTop * 2;
    const scaleFactor = usableWidth / canvas.width;
    const scaledCanvasHeight = canvas.height * scaleFactor;

    // Calculate total pages
    const totalPages = Math.ceil(scaledCanvasHeight / pdfHeightUsable);

    // --- 5) Slice the canvas into PDF pages ---
    let yOffset = 0;
    for (let page = 0; page < totalPages; page++) {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      const pageCanvasHeight = Math.min(
        canvas.height - yOffset,
        pdfHeightUsable / scaleFactor
      );
      pageCanvas.height = pageCanvasHeight;

      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) continue;

      pageCtx.drawImage(
        canvas,
        0,
        yOffset,
        canvas.width,
        pageCanvasHeight,
        0,
        0,
        canvas.width,
        pageCanvasHeight
      );

      const pageImgData = pageCanvas.toDataURL('image/png');

      if (page > 0) {
        pdf.addPage();
      }

      const chunkPdfHeight = pageCanvasHeight * scaleFactor;
      pdf.addImage(
        pageImgData,
        'PNG',
        marginLeft,
        marginTop,
        usableWidth,
        chunkPdfHeight
      );

      yOffset += pageCanvasHeight;
    }

    // If you want to open a preview:
    const pdfUrl = pdf.output('bloburl');
    window.open(pdfUrl, '_blank');
    this.toggle('isLoading');

    // Or directly save:
    // pdf.save(`${this.currentSolution.title}.pdf`);
  }
}
