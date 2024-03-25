import {
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnInit,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Comment, Solution } from 'src/app/models/solution';

import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { TimeService } from 'src/app/services/time.service';

interface DisplayMessage {
  text: string;
  link?: { text?: string; url?: string };
  type: 'PROMPT' | 'RESPONSE';
}
@Component({
  selector: 'app-team-discussion',
  templateUrl: './team-discussion.component.html',
  styleUrl: './team-discussion.component.css',
})
export class TeamDiscussionComponent implements OnInit {
  showDiscussion: boolean = false;
  profilePicturePath: string = '';
  user: User = {};
  private hasScrolled = false;
  @Input() solution?: Solution;
  @Input() botHeight: string = 'h-10';
  collectionPath: string = '';
  status = '';
  errorMsg = '';
  prompt = '';
  temp = '';
  profilePic: string =
    this.auth.currentUser.profilePicture.downloadURL !== undefined
      ? this.auth.currentUser.profilePicture.downloadURL
      : '';

  @Input() comments?: Comment[] = [];
  constructor(
    private afs: AngularFirestore,
    private auth: AuthService,
    private cdRef: ChangeDetectorRef,
    private time: TimeService,
    private ngZone: NgZone
  ) {
    this.user = this.auth.currentUser;

    // this.deleteAllDocuments();
  }
  responses: DisplayMessage[] = [];
  ngOnInit(): void {
    this.collectionPath = `solutions/${this.solution!.solutionId}`;
    if (this.user?.profilePicture && this.user.profilePicture.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL!;
    }
  }
  scrollToBottom(): void {
    const chatbox = document.getElementById('chatboxDicussion');
    if (chatbox) {
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  }

  toggleDiscussion() {
    if (this.showDiscussion) {
      this.showDiscussion = false;
      this.hasScrolled = false;
      this.botHeight = 'h-10';
    } else {
      this.showDiscussion = true;
      this.botHeight = 'h-96';
    }
  }

  endChat() {
    this.toggleDiscussion();
  }

  addToDiscussion() {
    let content = this.prompt;
    this.comments!.push({
      date: this.time.todaysDate(),
      authorId: this.auth.currentUser.uid,
      content: content,
      authorName:
        this.auth.currentUser.firstName + ' ' + this.auth.currentUser.lastName,
      profilePic: this.profilePic,
    });
    this.prompt = '';
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.scrollToBottom(), 0);
    });

    const discRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${this.solution?.solutionId}`
    );
    const data = {
      discussion: this.comments,
    };
    return discRef.set(data, { merge: true });
  }

  ngAfterViewChecked() {
    if (this.showDiscussion && !this.hasScrolled) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.scrollToBottom(), 0);
      });
      this.hasScrolled = true; // Prevent continuous scrolling
    }
  }
}
