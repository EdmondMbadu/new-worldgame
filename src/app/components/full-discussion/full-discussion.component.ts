import {
  Component,
  Input,
  OnInit,
  AfterViewChecked,
  OnDestroy,
  NgZone,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { comment } from 'postcss';
import { Comment, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-full-discussion',
  templateUrl: './full-discussion.component.html',
  styleUrls: ['./full-discussion.component.css'],
})
export class FullDiscussionComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @Input() currentSolution: Solution = {};
  @Input() comments: Comment[] = [];

  user: User = {};
  profilePic: string = '';
  prompt = '';
  id: any;
  // currentSolution: Solution = {};
  introMessage = `
    Welcome to the team discussion chat. You can use the following resources for more advanced prompts
    and insights on collaboration.
  `;

  private hasScrolled = false;

  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private time: TimeService,
    private ngZone: NgZone,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    private router: Router
  ) {
    this.user = this.auth.currentUser;
    if (this.user?.profilePicture?.downloadURL) {
      this.profilePic = this.user.profilePicture.downloadURL;
    }
  }

  ngOnInit(): void {
    // scrool to bottom
    window.scrollTo(0, document.body.scrollHeight);
    // If you need the user’s profile pic
    if (this.user?.profilePicture?.downloadURL) {
      this.profilePic = this.user.profilePicture.downloadURL;
    }
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      this.comments = data?.discussion || [];
      // Convert each comment's date string to your new, prettier format
      this.comments.forEach((comment) => {
        if (comment.date) {
          comment.date = this.formatDateString(comment.date);
        }
      });

      // Once data is loaded, scroll to bottom
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.scrollToBottom(), 0);
      });
      this.hasScrolled = false;
    });
  }

  ngAfterViewChecked() {
    if (!this.hasScrolled) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.scrollToBottom(), 0);
      });
      this.hasScrolled = true;
    }
  }

  scrollToBottom(): void {
    const chatbox = document.getElementById('chatboxDiscussion');
    if (chatbox) {
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  }

  addToDiscussion() {
    if (!this.comments) {
      this.comments = [];
    }
    const content = this.prompt.trim();
    if (!content) return;

    this.comments.push({
      date: this.time.todaysDate(),
      authorId: this.auth.currentUser.uid,
      content,
      authorName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      profilePic: this.profilePic,
    });

    // Clear the prompt & scroll
    this.prompt = '';
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.scrollToBottom(), 0);
    });

    // Save to Firestore
    const discRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${this.currentSolution?.solutionId}`
    );
    discRef.set({ discussion: this.comments }, { merge: true });
  }

  // “Close” might navigate away or handle a different route
  endChat() {
    // example: navigate away, or hide overlay, or do something else
    this.router.navigate(['/dashboard', this.id]);
    console.log('Closed the full-screen chat');
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }
  private formatDateString(rawDate: string): string {
    // rawDate e.g. "1-13-2025-15-54-12"
    const parts = rawDate.split('-');
    // parts: [month, day, year, hours, minutes, seconds]
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const hour = parseInt(parts[3], 10);
    const minute = parseInt(parts[4], 10);
    const second = parseInt(parts[5], 10);

    // Create a Date object
    const dateObj = new Date(year, month - 1, day, hour, minute, second);

    // Format using toLocaleString to get "M/D/YY, h:mm AM/PM"
    // e.g. "1/13/25, 11:10 AM"
    return dateObj.toLocaleString('en-US', {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
