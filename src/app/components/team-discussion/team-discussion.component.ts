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

  showChatIcon: boolean = true;
  private isDragging = false;
  private originalX: number = 0;
  private originalY: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private hasScrolled = false;
  @Input() solution?: Solution;
  displayOtherVoiceChannels: boolean = false;
  @Input() botHeight: string = 'h-10';
  collectionPath: string = '';
  status = '';
  errorMsg = '';
  prompt = '';
  temp = '';

  nwgHubLink: string =
    'https://chat.openai.com/g/g-1NcFZO67Z-new-world-game-impact-hub-gpt';

  introMessage: string = `Welcome to the team discussion chat. You can use the following resources for more advanced prompts and insights on collaboration. `;
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

  toggleShowOtherVoiceChannels() {
    this.displayOtherVoiceChannels = !this.displayOtherVoiceChannels;
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
    this.showChatIcon = !this.showChatIcon;
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

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;

    const draggableElement = document.getElementById(
      'draggable-team-discussion'
    );
    if (draggableElement) {
      // Calculate offsets from the mouse position to the element's top-left corner
      this.offsetX =
        event.clientX - draggableElement.getBoundingClientRect().left;
      this.offsetY =
        event.clientY - draggableElement.getBoundingClientRect().top;
    }

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;

    // Use the offsets to keep the mouse position relative to the element's position
    const newX = event.clientX - this.offsetX;
    const newY = event.clientY - this.offsetY;

    const draggableElement = document.getElementById(
      'draggable-team-discussion'
    );
    if (draggableElement) {
      draggableElement.style.left = `${newX}px`;
      draggableElement.style.top = `${newY}px`;
    }
  };

  onMouseUp = (): void => {
    this.isDragging = false;

    // Remove the event listeners when the mouse is released
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  // Ensure to clean up the event listeners on component destroy
  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}
