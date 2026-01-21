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
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Attachment, Comment, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

interface ParticipantInfo {
  email: string;
  displayName: string;
  uid?: string;
  isAI?: boolean;
  avatarPath?: string;
  collectionKey?: string;
}

interface AIAvatar {
  name: string;
  avatarPath: string;
  collectionKey: string;
  group: 'colleague' | 'elder';
}

const AI_AVATARS: AIAvatar[] = [
  { name: 'Zara Nkosi', avatarPath: '../../../assets/img/zara-agent.png', collectionKey: 'zara', group: 'colleague' },
  { name: 'Arjun Patel', avatarPath: '../../../assets/img/arjun-agent.png', collectionKey: 'arjun', group: 'colleague' },
  { name: 'Sofia Morales', avatarPath: '../../../assets/img/sofia-agent.png', collectionKey: 'sofia', group: 'colleague' },
  { name: 'Li Wei', avatarPath: '../../../assets/img/li-agent.png', collectionKey: 'li', group: 'colleague' },
  { name: 'Amina Al-Sayed', avatarPath: '../../../assets/img/amina-agent.png', collectionKey: 'amina', group: 'colleague' },
  { name: 'Elena Volkov', avatarPath: '../../../assets/img/elena-agent.png', collectionKey: 'elena', group: 'colleague' },
  { name: 'Tane Kahu', avatarPath: '../../../assets/img/tane-agent.png', collectionKey: 'tane', group: 'colleague' },
  { name: 'Dr. Logos', avatarPath: '../../../assets/img/logos.png', collectionKey: 'business', group: 'colleague' },
  { name: 'Marie Curie', avatarPath: '../../../assets/img/marie-curie.jpg', collectionKey: 'marie', group: 'elder' },
  { name: 'Rachel Carson', avatarPath: '../../../assets/img/rachel-carlson.jpeg', collectionKey: 'rachel', group: 'elder' },
  { name: 'Buckminster Fuller', avatarPath: '../../../assets/img/fuller.jpg', collectionKey: 'bucky', group: 'elder' },
  { name: 'Albert Einstein', avatarPath: '../../../assets/img/albert.png', collectionKey: 'albert', group: 'elder' },
  { name: 'Nelson Mandela', avatarPath: '../../../assets/img/mandela.png', collectionKey: 'nelson', group: 'elder' },
  { name: 'Mahatma Gandhi', avatarPath: '../../../assets/img/gandhi.jpg', collectionKey: 'gandhi', group: 'elder' },
  { name: 'Mark Twain', avatarPath: '../../../assets/img/twain.jpg', collectionKey: 'twain', group: 'elder' },
];

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

  editingId: string | null = null; // holds ISO date (acts as unique id)
  editingContent = '';

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

  // @mention functionality
  participants: ParticipantInfo[] = [];
  showMentionDropdown = false;
  mentionSearchText = '';
  filteredParticipants: ParticipantInfo[] = [];
  filteredAIAvatars: ParticipantInfo[] = [];
  mentionStartIndex = -1;

  private hasScrolled = false;

  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private time: TimeService,
    private ngZone: NgZone,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    private router: Router,
    private storage: AngularFireStorage,
    private fns: AngularFireFunctions
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

          // Load participants for @mention functionality
          this.loadParticipants(doc?.participants || []).then(() => {
            this.buildParticipantsFromComments();
          });
        });
      return; // skip the old "solution-id via route" code
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

      // Load participants for @mention from solution participants
      const participantEmails: string[] = [];
      if (data?.participants) {
        // participants can be an object or array
        if (Array.isArray(data.participants)) {
          participantEmails.push(...data.participants.map((p: any) => p.name || p.email || p).filter(Boolean));
        } else if (typeof data.participants === 'object') {
          participantEmails.push(...Object.values(data.participants).filter(Boolean) as string[]);
        }
      }
      this.loadParticipants(participantEmails).then(() => {
        this.buildParticipantsFromComments();
      });
    });
  }

  /** True when the comment at index i is the first of a new calendar day */
  shouldShowDateDivider(i: number): boolean {
    // NEW
    if (i === 0) {
      return true;
    }
    return !this.isSameDay(this.comments[i].date, this.comments[i - 1].date);
  }

  /** Fast same-day comparison */
  private isSameDay(
    a: Date | string | undefined,
    b: Date | string | undefined
  ): boolean {
    // NEW
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  }

  /** Sort helper: oldest → newest (undefined dates to top just in case) */
  private byDateAsc = (a: Comment, b: Comment) => {
    // NEW
    if (!a.date) return -1;
    if (!b.date) return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  };

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

    // Process @mentions and send notifications (before clearing prompt)
    if (content) {
      this.processMentions(content);
      // Process AI mentions and generate responses
      this.processAIMentions(content);
    }

    // Clear the prompt & scroll
    this.previews.forEach((p) => URL.revokeObjectURL(p.url));
    this.previews = [];
    this.pendingFiles = [];
    this.prompt = '';
    this.showMentionDropdown = false;
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

  /** --- Methods --- */
  startEdit(c: Comment) {
    this.editingId = c.date!; // use ISO date as id
    this.editingContent = c.content ?? '';
    /* optional: scroll the textarea into view */
  }

  cancelEdit() {
    this.editingId = null;
    this.editingContent = '';
  }

  async saveEdit(c: Comment) {
    if (!this.editingContent.trim()) return; // no empty messages
    c.content = this.editingContent.trim();
    this.editingId = null;
    this.editingContent = '';

    await this.syncDiscussion(); // reuse helper below
  }

  async deleteComment(c: Comment) {
    if (!confirm('Delete this message?')) return;
    this.comments = this.comments.filter((m) => m !== c);
    await this.syncDiscussion();
  }

  /** --- helper: update Firestore once --- */
  private async syncDiscussion() {
    const toSave = this.comments.map(({ displayTime, ...raw }) => raw);
    const path =
      this.docPath || `solutions/${this.currentSolution!.solutionId}`;
    await this.afs.doc(path).set({ discussion: toSave }, { merge: true });
  }

  // ============ @Mention functionality ============

  /** Load participant emails and fetch their display names */
  private async loadParticipants(participantEmails: string[]) {
    const participants: ParticipantInfo[] = [];
    const seenEmails = new Set<string>();
    
    // First, add participants from the page's participant list
    if (participantEmails?.length) {
      for (const email of participantEmails) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || seenEmails.has(normalizedEmail)) continue;
        seenEmails.add(normalizedEmail);

        // Try to find user in database
        try {
          const userQuery = await firstValueFrom(
            this.afs
              .collection('users', (ref) =>
                ref.where('email', '==', normalizedEmail).limit(1)
              )
              .valueChanges()
          );
          
          if (userQuery && userQuery.length > 0) {
            const user: any = userQuery[0];
            participants.push({
              email: normalizedEmail,
              displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || normalizedEmail,
              uid: user.uid,
            });
          } else {
            participants.push({
              email: normalizedEmail,
              displayName: normalizedEmail,
            });
          }
        } catch {
          participants.push({
            email: normalizedEmail,
            displayName: normalizedEmail,
          });
        }
      }
    }

    this.participants = participants;

    // Add AI avatars to participants
    this.addAIParticipants();

    console.log('Loaded participants for mentions:', this.participants);
  }

  /** Add AI avatars to the participants list */
  private addAIParticipants() {
    for (const ai of AI_AVATARS) {
      this.participants.push({
        email: `ai-${ai.collectionKey}@system`,
        displayName: ai.name,
        isAI: true,
        avatarPath: ai.avatarPath,
        collectionKey: ai.collectionKey,
      });
    }
  }

  /** Build participants from discussion comments (people who have posted) */
  private buildParticipantsFromComments() {
    if (!this.comments?.length) return;

    const seenIds = new Set(this.participants.map(p => p.uid || p.email));
    
    for (const comment of this.comments) {
      if (!comment.authorId || seenIds.has(comment.authorId)) continue;
      seenIds.add(comment.authorId);

      // Add participant from comment author
      this.participants.push({
        email: '', // We don't have email from comments, will lookup
        displayName: comment.authorName || 'Unknown',
        uid: comment.authorId,
      });
    }
  }

  /** Handle input changes to detect @ mentions */
  onPromptInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = this.prompt.substring(0, cursorPos);
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show dropdown if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(' ')) {
        this.mentionStartIndex = lastAtIndex;
        this.mentionSearchText = textAfterAt.toLowerCase();
        this.filterParticipants();
        this.showMentionDropdown = true;
        console.log('Showing mention dropdown:', {
          mentionSearchText: this.mentionSearchText,
          filteredParticipants: this.filteredParticipants.length,
          showEveryoneOption: this.shouldShowEveryoneOption()
        });
        return;
      }
    }
    
    this.showMentionDropdown = false;
    this.mentionStartIndex = -1;
  }

  /** Filter participants based on search text */
  private filterParticipants() {
    const searchText = this.mentionSearchText.toLowerCase();

    // Filter human participants (non-AI)
    if (!searchText) {
      this.filteredParticipants = this.participants.filter((p) => !p.isAI);
      this.filteredAIAvatars = this.participants.filter((p) => p.isAI);
    } else {
      this.filteredParticipants = this.participants.filter(
        (p) =>
          !p.isAI &&
          (p.displayName.toLowerCase().includes(searchText) ||
            p.email.toLowerCase().includes(searchText))
      );

      // Filter AI avatars
      this.filteredAIAvatars = this.participants.filter(
        (p) =>
          p.isAI &&
          p.displayName.toLowerCase().includes(searchText)
      );
    }
  }

  /** Insert selected mention into the prompt */
  selectMention(participant: ParticipantInfo | 'everyone') {
    if (this.mentionStartIndex === -1) return;

    const beforeMention = this.prompt.substring(0, this.mentionStartIndex);
    const afterMention = this.prompt.substring(
      this.mentionStartIndex + 1 + this.mentionSearchText.length
    );

    if (participant === 'everyone') {
      this.prompt = `${beforeMention}@everyone ${afterMention}`;
    } else {
      this.prompt = `${beforeMention}@${participant.displayName} ${afterMention}`;
    }

    this.showMentionDropdown = false;
    this.mentionStartIndex = -1;
    this.mentionSearchText = '';
  }

  /** Close mention dropdown */
  closeMentionDropdown() {
    this.showMentionDropdown = false;
    this.mentionStartIndex = -1;
    this.mentionSearchText = '';
  }

  /** Parse message for @mentions and send notifications */
  private async processMentions(content: string) {
    if (!content) return;

    const senderName = `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`.trim();
    const challengeTitle = this.currentSolution?.title || 'Discussion';
    const discussionUrl = `${window.location.origin}/challenge-discussion/${this.id}`;

    // Check for @everyone
    if (content.toLowerCase().includes('@everyone')) {
      const recipientEmails = this.participants
        .filter((p) => p.email !== this.auth.currentUser.email?.toLowerCase())
        .map((p) => p.email);

      if (recipientEmails.length > 0) {
        try {
          const callable = this.fns.httpsCallable('sendMentionNotification');
          await firstValueFrom(
            callable({
              mentionType: 'everyone',
              recipients: recipientEmails,
              senderName,
              messageContent: content,
              challengeTitle,
              discussionUrl,
            })
          );
        } catch (err) {
          console.error('Failed to send @everyone notification:', err);
        }
      }
      return; // Don't process individual mentions if @everyone was used
    }

    // Check for individual @mentions
    const mentionPattern = /@([^\s@]+(?:\s+[^\s@]+)?)/g;
    const matches = content.matchAll(mentionPattern);
    const mentionedEmails: string[] = [];

    for (const match of matches) {
      const mentionText = match[1].toLowerCase();
      // Find participant by display name or email
      const found = this.participants.find(
        (p) =>
          p.displayName.toLowerCase() === mentionText ||
          p.email.toLowerCase() === mentionText ||
          p.displayName.toLowerCase().startsWith(mentionText)
      );
      if (found && found.email !== this.auth.currentUser.email?.toLowerCase()) {
        if (!mentionedEmails.includes(found.email)) {
          mentionedEmails.push(found.email);
        }
      }
    }

    if (mentionedEmails.length > 0) {
      try {
        const callable = this.fns.httpsCallable('sendMentionNotification');
        await firstValueFrom(
          callable({
            mentionType: 'individual',
            recipients: mentionedEmails,
            senderName,
            messageContent: content,
            challengeTitle,
            discussionUrl,
          })
        );
      } catch (err) {
        console.error('Failed to send mention notifications:', err);
      }
    }
  }

  /** Check if text shows @everyone mention hint */
  shouldShowEveryoneOption(): boolean {
    return (
      !this.mentionSearchText ||
      'everyone'.startsWith(this.mentionSearchText.toLowerCase())
    );
  }

  /** Highlight @mentions in displayed message content */
  highlightMentions(text: string): string {
    if (!text) return '';

    // First linkify URLs
    let result = this.linkify(text);

    // Then highlight @mentions
    result = result.replace(
      /@everyone\b/gi,
      '<span class="mention-everyone font-semibold text-amber-500">@everyone</span>'
    );
    result = result.replace(
      /@([^\s<]+)/g,
      '<span class="mention font-semibold text-blue-400">@$1</span>'
    );

    return result;
  }

  // ============ AI Mention functionality ============

  /** Process AI mentions in the message and generate responses */
  private async processAIMentions(content: string) {
    if (!content) return;

    // Find AI mentions in content
    const aiMentionPattern = /@([^\s@]+)/g;
    const matches = [...content.matchAll(aiMentionPattern)];
    const processedAIs = new Set<string>();

    for (const match of matches) {
      const mentionName = match[1].toLowerCase();

      // Find matching AI participant
      const ai = this.participants.find(
        (p) =>
          p.isAI &&
          (p.displayName.toLowerCase() === mentionName ||
            p.displayName.toLowerCase().replace(/\s+/g, '').includes(mentionName.replace(/\s+/g, '')) ||
            p.displayName.split(' ')[0].toLowerCase() === mentionName)
      );

      // Process ALL mentioned AIs (user preference: all respond)
      if (ai && ai.collectionKey && !processedAIs.has(ai.collectionKey)) {
        processedAIs.add(ai.collectionKey);
        await this.generateAIResponse(ai, content);
      }
    }
  }

  /** Generate an AI response and add it to the discussion */
  private async generateAIResponse(ai: ParticipantInfo, userMessage: string) {
    // Build context from full discussion
    const context = this.buildDiscussionContext();

    // Create prompt document in Firestore (triggers Cloud Function)
    // NOTE: Must write to 'discussions' collection to trigger the onChatPrompt Cloud Function
    const uid = this.auth.currentUser.uid;
    const docId = this.afs.createId();
    const docRef = this.afs.doc(
      `users/${uid}/discussions/${docId}`
    ) as AngularFirestoreDocument<any>;

    // Add placeholder message immediately
    const nowIso = new Date().toISOString();
    const placeholderMsg: Comment = {
      date: nowIso,
      authorId: `ai-${ai.collectionKey}`,
      authorName: ai.displayName,
      profilePic: ai.avatarPath,
      content: '',
      displayTime: this.time.formatDateStringComment(nowIso),
      isAI: true,
      isLoading: true,
    };
    this.comments.push(placeholderMsg);
    this.scrollToBottom();

    // Write prompt to trigger Cloud Function
    await docRef.set({
      prompt: `You are ${ai.displayName}, an AI team member participating in a team discussion.
Here is the context of the conversation so far:

${context}

A team member has just mentioned you with this message: "${userMessage}"

Please respond helpfully to their question or comment, staying in character as ${ai.displayName}.
Keep your response concise and relevant to the discussion. Do not use markdown formatting.`,
    });

    // Subscribe to response
    const subscription = docRef.valueChanges().subscribe(async (data: any) => {
      if (!data || !data.status) return;

      if (data.status.state === 'COMPLETED' && data.response) {
        // Run inside Angular zone to trigger change detection
        this.ngZone.run(async () => {
          // Find and update the placeholder message in the array
          const msgIndex = this.comments.findIndex(
            (c) => c.date === placeholderMsg.date && c.authorId === placeholderMsg.authorId
          );
          if (msgIndex !== -1) {
            // Create a new object to trigger change detection
            this.comments[msgIndex] = {
              ...this.comments[msgIndex],
              content: data.response,
              isLoading: false,
            };
            // Force array reference change for Angular
            this.comments = [...this.comments];
          }

          // Sync to Firestore
          await this.syncDiscussion();
          this.scrollToBottom();
          this.playPing();

          subscription.unsubscribe();
        });
      } else if (data.status.state === 'ERRORED') {
        this.ngZone.run(async () => {
          const msgIndex = this.comments.findIndex(
            (c) => c.date === placeholderMsg.date && c.authorId === placeholderMsg.authorId
          );
          if (msgIndex !== -1) {
            this.comments[msgIndex] = {
              ...this.comments[msgIndex],
              content: 'Sorry, I encountered an error while generating a response. Please try again.',
              isLoading: false,
            };
            this.comments = [...this.comments];
          }
          await this.syncDiscussion();
          subscription.unsubscribe();
        });
      }
    });
  }

  /** Build context from the discussion for AI */
  private buildDiscussionContext(): string {
    // Get last 20 messages for context
    const recentMessages = this.comments.slice(-20);
    return recentMessages
      .filter((c) => c.content && !c.isLoading)
      .map((c) => `${c.authorName}: ${c.content}`)
      .join('\n');
  }
}
