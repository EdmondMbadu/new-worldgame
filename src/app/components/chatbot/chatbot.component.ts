import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';

export interface DisplayMessage {
  text?: string;
  src?: string;
  link?: { text?: string; url?: string };
  type: 'PROMPT' | 'RESPONSE' | 'IMAGE' | 'ATTACHMENT';
  streaming?: boolean;
}

export interface AiAvatar {
  id: string;
  name: string;
  shortName?: string; // Optional short name for display (e.g., "Bucky" for Buckminster Fuller)
  avatarPath: string;
  collectionKey: string;
  intro: string;
  group: 'colleague' | 'elder';
}

type UiPhase = 'idle' | 'thinking' | 'error';

interface PendingPreview {
  file: File;
  mime: string;
  uploading: boolean;
  path?: string;
  url?: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent implements OnInit, OnDestroy {
  showBot = false;
  isEnlarged = false;
  isFullScreen = false;
  copyButtonText = 'Copy';
  private attachment: { url: string; mime: string } | null = null;
  MAX_SIZE = 10 * 1024 * 1024;

  singleCopyStates: string[] = [];

  user: User = {};
  profilePicturePath = '';

  status = '';
  errorMsg = '';
  prompt = '';

  previews: PendingPreview[] = [];
  uploading = false;

  collectionPath: string;

  // AI Avatar Selection
  showAiSelector = false;
  selectedAi: AiAvatar;
  
  aiAvatars: AiAvatar[] = [
    {
      id: 'bucky',
      name: 'Buckminster Fuller',
      shortName: 'Bucky',
      avatarPath: 'assets/img/fuller.jpg',
      collectionKey: 'discussions',
      intro: "Visionary architect, systems theorist, and inventor. Let's solve world problems together.",
      group: 'elder',
    },
    {
      id: 'zara',
      name: 'Zara Nkosi',
      avatarPath: 'assets/img/zara-agent.png',
      collectionKey: 'zara',
      intro: 'Development specialist focused on poverty reduction and quality education.',
      group: 'colleague',
    },
    {
      id: 'arjun',
      name: 'Arjun Patel',
      avatarPath: 'assets/img/arjun-agent.png',
      collectionKey: 'arjun',
      intro: 'Infrastructure expert specializing in sustainable cities and clean water.',
      group: 'colleague',
    },
    {
      id: 'sofia',
      name: 'Sofia Morales',
      avatarPath: 'assets/img/sofia-agent.png',
      collectionKey: 'sofia',
      intro: 'Climate action advocate working on gender equality and peace.',
      group: 'colleague',
    },
    {
      id: 'li',
      name: 'Li Wei',
      avatarPath: 'assets/img/li-agent.png',
      collectionKey: 'li',
      intro: 'Innovation specialist in sustainable agriculture and smart cities.',
      group: 'colleague',
    },
    {
      id: 'amina',
      name: 'Amina Al-Sayed',
      avatarPath: 'assets/img/amina-agent.png',
      collectionKey: 'amina',
      intro: 'Human rights expert focusing on equality and climate resilience.',
      group: 'colleague',
    },
    {
      id: 'elena',
      name: 'Elena Volkov',
      avatarPath: 'assets/img/elena-agent.png',
      collectionKey: 'elena',
      intro: 'Health and energy systems researcher promoting sustainable partnerships.',
      group: 'colleague',
    },
    {
      id: 'tane',
      name: 'Tane Kahu',
      avatarPath: 'assets/img/tane-agent.png',
      collectionKey: 'tane',
      intro: 'Environmental guardian protecting life below water and on land.',
      group: 'colleague',
    },
    {
      id: 'marie',
      name: 'Marie Curie',
      avatarPath: 'assets/img/marie-curie.jpg',
      collectionKey: 'marie',
      intro: 'Pioneer in physics and chemistry, advocate for scientific discovery.',
      group: 'elder',
    },
    {
      id: 'rachel',
      name: 'Rachel Carson',
      avatarPath: 'assets/img/rachel-carlson.jpeg',
      collectionKey: 'rachel',
      intro: 'Environmental scientist and conservationist who sparked the ecology movement.',
      group: 'elder',
    },
    {
      id: 'albert',
      name: 'Albert Einstein',
      avatarPath: 'assets/img/albert.png',
      collectionKey: 'albert',
      intro: 'Theoretical physicist and humanitarian, exploring the universe and peace.',
      group: 'elder',
    },
    {
      id: 'nelson',
      name: 'Nelson Mandela',
      avatarPath: 'assets/img/mandela.png',
      collectionKey: 'nelson',
      intro: 'Champion of freedom, equality, and reconciliation.',
      group: 'elder',
    },
    {
      id: 'gandhi',
      name: 'Mahatma Gandhi',
      avatarPath: 'assets/img/gandhi.jpg',
      collectionKey: 'gandhi',
      intro: 'Leader of nonviolent resistance and advocate for peace and justice.',
      group: 'elder',
    },
  ];

  introMessage: DisplayMessage = {
    text: '',
    link: { text: 'here.', url: '/blogs/nwg-ai' },
    type: 'RESPONSE',
  };

  responses: DisplayMessage[] = [];

  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private cdRef: ChangeDetectorRef,
    private storage: AngularFireStorage,
    public router: Router
  ) {
    this.user = this.auth.currentUser;
    this.selectedAi = this.aiAvatars[0]; // Default to Bucky
    this.collectionPath = `users/${this.auth.currentUser.uid}/${this.selectedAi.collectionKey}`;
    this.updateIntroMessage();
  }

  uiPhase: UiPhase = 'idle';
  thinkingLabel = 'Thinking';
  private thinkingTimer?: any;
  private thinkingPhrases = ['Thinking'];
  private thinkingIndex = 0;

  ngOnDestroy(): void {
    this.stopThinking();
  }

  ngOnInit(): void {
    if (this.user?.profilePicture?.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL!;
    }
    this.deleteAllDocuments();
  }

  private updateIntroMessage(): void {
    this.introMessage.text = `I'm ${this.selectedAi.name}. ${this.selectedAi.intro} To learn how to interact with me efficiently see `;
  }

  selectAi(ai: AiAvatar): void {
    if (this.selectedAi.id === ai.id) {
      this.showAiSelector = false;
      return;
    }
    
    this.selectedAi = ai;
    this.collectionPath = `users/${this.auth.currentUser.uid}/${ai.collectionKey}`;
    this.updateIntroMessage();
    this.responses = [];
    this.showAiSelector = false;
    this.deleteAllDocuments();
    this.cdRef.detectChanges();
  }

  toggleAiSelector(): void {
    this.showAiSelector = !this.showAiSelector;
  }

  get colleagueAvatars(): AiAvatar[] {
    return this.aiAvatars.filter(a => a.group === 'colleague');
  }

  get elderAvatars(): AiAvatar[] {
    return this.aiAvatars.filter(a => a.group === 'elder');
  }

  /** Returns short name if available, otherwise first name */
  getDisplayName(ai: AiAvatar): string {
    return ai.shortName || ai.name.split(' ')[0];
  }

  openFullPage(): void {
    this.showBot = false;
    this.router.navigate(['/ask-bucky'], { queryParams: { from: 'widget' } });
  }

  toggleBot() {
    this.showBot = !this.showBot;
    if (this.showBot) {
      this.showAiSelector = false;
    }
  }

  EXT_MIME: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
  };

  handleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > this.MAX_SIZE) {
      this.responses.push({
        type: 'RESPONSE',
        text: `⚠️ That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — limit is 10 MB.`,
      });
      this.scrollToBottom();
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = file.type || this.EXT_MIME[ext] || 'application/octet-stream';

    const preview: PendingPreview = { file, mime, uploading: true };
    this.previews.push(preview);
    this.uploading = true;

    const path = `chat-uploads/${Date.now()}_${file.name}`;
    const task = this.storage.upload(path, file, { contentType: mime });

    task
      .snapshotChanges()
      .pipe(
        finalize(async () => {
          preview.uploading = false;
          preview.path = path;
          preview.url = await this.storage
            .ref(path)
            .getDownloadURL()
            .toPromise();
          this.uploading = this.previews.some((p) => p.uploading);
        })
      )
      .subscribe();
  }

  removePreview(i: number) {
    const [preview] = this.previews.splice(i, 1);
    if (preview.path && !preview.uploading) {
      this.storage
        .ref(preview.path)
        .delete()
        .toPromise()
        .catch(() => {});
    }
    this.uploading = this.previews.some((p) => p.uploading);
  }

  toggleChatSize() {
    this.isEnlarged = !this.isEnlarged;
  }

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
  }

  async submitPrompt() {
    if (this.uploading) return;

    const trimmed = this.prompt.trim();
    if (!trimmed && !this.previews.length) return;

    if (trimmed) {
      this.responses.push({ text: trimmed, type: 'PROMPT' });
    }

    const attachmentMsgs: DisplayMessage[] = this.previews
      .filter((p) => p.url && !p.uploading)
      .map((p) => ({
        type: 'ATTACHMENT',
        text: p.file.name,
        src: p.url!,
      }));
    this.responses.push(...attachmentMsgs);

    this.cdRef.detectChanges();
    setTimeout(() => this.scrollToBottom(), 0);

    const attachmentList = attachmentMsgs.map((a) => ({
      url: a.src!,
      name: a.text!,
      mime:
        this.EXT_MIME[a.text!.split('.').pop()!.toLowerCase()] ||
        'application/octet-stream',
    }));

    const docId = this.afs.createId();
    const discussionRef: AngularFirestoreDocument<any> = this.afs.doc(
      `${this.collectionPath}/${docId}`
    );

    await discussionRef.set({
      prompt: trimmed,
      attachmentList,
    });
    this.startThinking();
    this.cdRef.detectChanges();

    this.prompt = '';
    this.previews = [];
    this.uploading = false;
    this.status = 'sure, one sec';

    const unsub = discussionRef.valueChanges().subscribe({
      next: (snap) => {
        if (!snap?.status) return;
        const state = snap.status.state;

        switch (state) {
          case 'PROCESSING':
            this.startThinking();
            this.status = 'preparing your answer...';
            break;

          case 'COMPLETED':
            this.stopThinking();
            this.status = '';
            if (snap.response) {
              const slot: DisplayMessage = {
                type: 'RESPONSE',
                text: '',
                streaming: true,
              };
              this.responses.push(slot);
              this.cdRef.detectChanges();
              setTimeout(() => this.scrollToBottom('auto'), 0);

              this.typewriterEffect(snap.response, slot, () => {
                slot.streaming = false;
                this.cdRef.detectChanges();
                setTimeout(() => this.scrollToBottom('smooth'), 0);
              });
            }
            if (snap.imageUrl) {
              this.responses.push({ src: snap.imageUrl, type: 'IMAGE' });
            }
            this.cdRef.detectChanges();
            setTimeout(() => this.scrollToBottom(), 0);
            unsub.unsubscribe();
            break;

          case 'ERRORED':
            this.stopThinking();
            this.status = 'Oh no! Something went wrong.';
            unsub.unsubscribe();
            break;
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = err.message;
        unsub.unsubscribe();
      },
    });
  }

  endChat() {
    this.deleteAllDocuments();
    this.toggleBot();
  }

  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const chatbox = document.getElementById('chatbox');
    if (chatbox) {
      chatbox.scrollTo({ top: chatbox.scrollHeight, behavior });
    }
  }

  private typewriterEffect(
    fullText: string,
    msg: DisplayMessage,
    done: () => void
  ): void {
    let i = 0;
    const chunkSize = 8;
    msg.text = msg.text || '';

    const id = setInterval(() => {
      const next = fullText.slice(i, i + chunkSize);
      msg.text += next;
      i += next.length;

      this.cdRef.detectChanges();
      this.scrollToBottom('auto');

      if (i >= fullText.length) {
        clearInterval(id);
        this.scrollToBottom('smooth');
        done();
      }
    }, 10);
  }

  copyChat() {
    let result = `${this.selectedAi.name}: ${this.introMessage.text}`;
    if (this.introMessage.link) {
      result +=
        ' ' +
        this.introMessage.link.text +
        ' (' +
        this.introMessage.link.url +
        ')';
    }

    for (const msg of this.responses) {
      if (msg.type === 'PROMPT') {
        result += `\n\nYou: ${msg.text}`;
      } else {
        result += `\n\n${this.selectedAi.name}: ${msg.text}`;
      }
    }

    navigator.clipboard.writeText(result).then(
      () => {
        this.copyButtonText = 'Copied!';
        setTimeout(() => {
          this.copyButtonText = 'Copy';
        }, 2000);
      },
      (err) => {
        console.error('Failed to copy chat:', err);
      }
    );
  }

  copySingleMessage(text: string, index: number) {
    const formattedMessage = this.formatText(text);

    const blobPlain = new Blob([formattedMessage], { type: 'text/plain' });
    const blobHtml = new Blob([formattedMessage], { type: 'text/html' });

    const clipboardItem = new ClipboardItem({
      'text/plain': blobPlain,
      'text/html': blobHtml,
    });

    navigator.clipboard.write([clipboardItem]).then(
      () => {
        this.singleCopyStates[index] = 'Copied!';
        setTimeout(() => {
          this.singleCopyStates[index] = 'Copy';
        }, 2000);
      },
      (err) => {
        console.error('Failed to copy single message:', err);
      }
    );
  }

  formatText(value: string): string {
    if (!value) return '';

    let formatted = value;
    formatted = formatted.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^### (.*?)$/gm, '<h3>$1</h3>');

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    formatted = formatted.replace(/^\* (.*?)(?=\n|$)/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');

    formatted = formatted.replace(/\n/g, '<br>');

    formatted = formatted.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a class="text-blue-500 underline" target="_blank" href="$2">$1</a>'
    );

    return formatted;
  }

  async deleteAllDocuments(): Promise<void> {
    const batch = this.afs.firestore.batch();
    const snapshot = await this.afs.collection(this.collectionPath).ref.get();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  async downloadImage(src: string) {
    const urlParts = src.split('/');
    let filename = urlParts[urlParts.length - 1].split('?')[0];
    if (!filename.match(/\.(png|jpe?g|gif)$/i)) {
      filename = `image-${Date.now()}.png`;
    }

    try {
      const response = await fetch(src, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(src, '_blank', 'noopener');
    }
  }

  handleComposerKey(event: KeyboardEvent) {
    if ((event as any).isComposing) return;

    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      if (!this.uploading) {
        this.submitPrompt();
      }
    }
  }

  private startThinking(): void {
    if (this.thinkingTimer) {
      clearInterval(this.thinkingTimer);
      this.thinkingTimer = undefined;
    }

    this.uiPhase = 'thinking';
    this.thinkingIndex = 0;
    this.thinkingLabel = this.thinkingPhrases[this.thinkingIndex];

    this.thinkingTimer = setInterval(() => {
      this.thinkingIndex =
        (this.thinkingIndex + 1) % this.thinkingPhrases.length;
      this.thinkingLabel = this.thinkingPhrases[this.thinkingIndex];
    }, 900);
  }

  private stopThinking(): void {
    if (this.thinkingTimer) {
      clearInterval(this.thinkingTimer);
      this.thinkingTimer = undefined;
    }
    this.uiPhase = 'idle';
  }
}
