import {
  Component,
  Input,
  OnInit,
  AfterViewChecked,
  OnDestroy,
  NgZone,
  ElementRef,
  ViewChild,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { Attachment, Comment, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

interface PendingPreview {
  file: File;
  url: string; // created with URL.createObjectURL
  type: 'image' | 'other';
}

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
  pendingFiles: File[] = [];
  previews: PendingPreview[] = []; // NEW
  MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes
  @ViewChild('notifyAudio', { static: true })
  notifyAudio!: ElementRef<HTMLAudioElement>;
  @ViewChild('bottomAnchor') bottomAnchor!: ElementRef<HTMLDivElement>;

  private firstSnapshot = true; // skip sound on initial load
  private lastMsgIso = ''; // ISO string of last message shown

  user: User = {};
  profilePic: string = '';
  prompt = '';
  id: any;
  meetingUrl = ''; // <- add at class level
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
    private router: Router,
    private storage: AngularFireStorage
  ) {
    this.user = this.auth.currentUser;
    if (this.user?.profilePicture?.downloadURL) {
      this.profilePic = this.user.profilePicture.downloadURL;
    }
  }

  ngOnInit(): void {
    const prefix = this.activatedRoute.snapshot.data['docPrefix'];
    // const id = this.activatedRoute.snapshot.paramMap.get('id');
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    /* Hosted mode: we got a docPath – stream its data */
    if (prefix && this.id) {
      // ← we are on /challenge-discussion/…
      this.docPath = `${prefix}/${this.id}`; // e.g. challengePages/xyz
    }
    if (this.docPath) {
      this.afs
        .doc(this.docPath)
        .valueChanges()
        .subscribe((doc: any) => {
          this.comments = (doc?.discussion || []).map((c: any) =>
            !c.date || isNaN(Date.parse(c.date as string))
              ? { ...c, date: undefined }
              : c
          );
          const latest = this.comments.at(-1);
          if (latest?.date && latest.date !== this.lastMsgIso) {
            if (!this.firstSnapshot) this.playPing(); // skip very first batch
            this.lastMsgIso = latest.date;
          }
          this.firstSnapshot = false;
          this.scrollToBottom();
          const qp = this.activatedRoute.snapshot.queryParamMap;
          const qpTitle = qp.get('title');
          if (qpTitle) this.currentSolution.title = qpTitle;

          const qpMeet = qp.get('meet'); // NEW
          if (qpMeet) this.meetingUrl = qpMeet; // store it
          if (qpTitle) {
            // <- title was provided
            this.currentSolution.title = qpTitle; // shown in the template
          }
        });
      return; // skip the old “solution-id via route” code
    }

    // scrool to bottom
    window.scrollTo(0, document.body.scrollHeight);
    // If you need the user’s profile pic
    if (this.user?.profilePicture?.downloadURL) {
      this.profilePic = this.user.profilePicture.downloadURL;
    }

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
  private playPing() {
    const audio = this.notifyAudio.nativeElement;
    audio.currentTime = 0; // rewind in case it’s still playing
    audio.play().catch(() => {}); // ignore autoplay blocking in some browsers
  }

  ngAfterViewChecked() {
    if (!this.hasScrolled) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.scrollToBottom(), 0);
      });
      this.hasScrolled = true;
    }
  }

  private scrollToBottom(): void {
    // use rAF so it executes immediately after the current paint
    requestAnimationFrame(() => {
      this.bottomAnchor?.nativeElement.scrollIntoView({ behavior: 'auto' });
    });
  }

  onFileSelected(evt: Event) {
    const list = (evt.target as HTMLInputElement).files;
    if (!list?.length) return;
    // optional HEIC → JPEG conversion on-client
    for (const file of Array.from(list)) {
      if (file.size > this.MAX_FILE_SIZE) {
        alert(`❗️ ${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB.
Please choose a file under 5 MB.`);
        continue; // skip this file
      }
      this.pendingFiles.push(file);

      // build local preview
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('image/') ? 'image' : 'other';
      this.previews.push({ file, url, type });
    }
    // reset <input> so the same file can be chosen again later
    (evt.target as HTMLInputElement).value = '';
  }
  async addToDiscussion() {
    if (!this.comments) {
      this.comments = [];
    }
    const content = this.prompt.trim(); // may be empty
    if (!content && !this.pendingFiles.length) return; // nothing at all
    const nowIso = new Date().toISOString();
    const msg: Comment = {
      date: nowIso,

      authorId: this.auth.currentUser.uid,
      content,
      authorName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      profilePic: this.profilePic,
      // helper visible immediately in the UI
      displayTime: this.time.formatDateStringComment(nowIso),
    };
    if (this.pendingFiles.length) {
      msg.attachments = [];
      for (const file of this.pendingFiles) {
        if (file.size > this.MAX_FILE_SIZE) {
          console.warn(`${file.name} skipped (too large)`);
          continue;
        }
        const id = this.afs.createId();
        const path = `chatUploads/${this.currentSolution.solutionId}/${id}-${file.name}`;
        const task = await this.storage.upload(path, file);
        const url = await task.ref.getDownloadURL();

        const att: Attachment = {
          url,
          name: file.name,
          type: file.type.startsWith('image/')
            ? 'image'
            : file.type === 'application/pdf'
            ? 'pdf'
            : file.type.startsWith('video/')
            ? 'video'
            : file.type.includes('word')
            ? 'doc'
            : 'other',
        };

        // Generate thumbnail for videos (Cloud Function) – see §3
        // if (att.type === 'video') att.thumb = await this.getVideoThumb(url, id);

        msg.attachments.push(att);
      }
    }

    this.comments.push(msg);

    // Clear the prompt & scroll
    this.previews.forEach((p) => URL.revokeObjectURL(p.url));
    this.previews = [];
    this.pendingFiles = [];
    this.prompt = '';
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.scrollToBottom(), 0);
    });

    const toSave = this.comments.map(({ displayTime, ...raw }) => raw);
    // play ping before adding message
    this.playPing();
    const path =
      this.docPath || `solutions/${this.currentSolution!.solutionId}`;
    this.afs.doc(path).set({ discussion: toSave }, { merge: true });
  }

  // “Close” might navigate away or handle a different route
  endChat() {
    // example: navigate away, or hide overlay, or do something else

    if (this.docPath) {
      this.router.navigate(['/home-challenge', this.id]);
    } else {
      this.router.navigate(['/dashboard', this.id]);
    }

    console.log('Closed the full-screen chat');
  }
  removePreview(index: number) {
    URL.revokeObjectURL(this.previews[index].url);
    this.previews.splice(index, 1);
    this.pendingFiles.splice(index, 1);
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
  getInitial(name: string = ''): string {
    return (name.trim()[0] || '?').toUpperCase();
  }
}
