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
  @Input() docPath = ''; // e.g. 'challengePages/xyz' or 'solutions/abc'
  @Input() titleLabel = ''; // heading text like '#challenge-discussion'
  @Input() hideNavbar = false;

  user: User = {};
  profilePic: string = '';
  prompt = '';
  id: any;
  // currentSolution: Solution = {};
  introMessage = `
    Welcome to the team discussion chat. You can use the following resource for more advanced prompts
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
    const prefix = this.activatedRoute.snapshot.data['docPrefix'];
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    /* Hosted mode: we got a docPath – stream its data */
    if (prefix && id) {
      // ← we are on /challenge-discussion/…
      this.docPath = `${prefix}/${id}`; // e.g. challengePages/xyz
      this.titleLabel = '#challenge-discussion';
    }
    if (this.docPath) {
      this.afs
        .doc(this.docPath)
        .valueChanges()
        .subscribe((doc: any) => {
          this.currentSolution = { title: this.titleLabel }; // for template
          this.comments = (doc?.discussion || []).map((c: any) =>
            !c.date || isNaN(Date.parse(c.date as string))
              ? { ...c, date: undefined }
              : c
          );
          this.scrollToBottom();
        });
      return; // skip the old “solution-id via route” code
    }

    // scrool to bottom
    window.scrollTo(0, document.body.scrollHeight);
    // If you need the user’s profile pic
    if (this.user?.profilePicture?.downloadURL) {
      this.profilePic = this.user.profilePicture.downloadURL;
    }
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      this.comments = (data?.discussion || []).map((c: any) => {
        // if the original field is garbage we drop it
        if (!c.date || isNaN(Date.parse(c.date as string))) {
          return { ...c, date: undefined }; // renders nothing
        }
        // keep the ISO string so the pipe works
        return c;
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
    const nowIso = new Date().toISOString();
    this.comments.push({
      date: nowIso,

      authorId: this.auth.currentUser.uid,
      content,
      authorName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      profilePic: this.profilePic,
      // helper visible immediately in the UI
      displayTime: this.time.formatDateStringComment(nowIso),
    });

    // Clear the prompt & scroll
    this.prompt = '';
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.scrollToBottom(), 0);
    });

    // Save to Firestore
    // const toSave = this.comments.map(({ displayTime, ...raw }) => raw);
    // this.afs
    //   .doc<Solution>(`solutions/${this.currentSolution!.solutionId}`)
    //   .set({ discussion: toSave }, { merge: true });
    const toSave = this.comments.map(({ displayTime, ...raw }) => raw);

    const path =
      this.docPath || `solutions/${this.currentSolution!.solutionId}`;
    this.afs.doc(path).set({ discussion: toSave }, { merge: true });
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
  linkify(text: string): string {
    if (!text) return '';

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">${url}</a>`;
    });
  }
}
