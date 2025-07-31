import { Component, OnInit } from '@angular/core';
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
  text?: string; // present for PROMPT / RESPONSE
  src?: string; // present for IMAGE
  link?: { text?: string; url?: string };
  type: 'PROMPT' | 'RESPONSE' | 'IMAGE' | 'ATTACHMENT';
}
// put this near your class top
type UiPhase = 'idle' | 'thinking' | 'error';

interface PendingPreview {
  file: File;
  mime: string;
  uploading: boolean;
  path?: string; // cloud-storage object path
  url?: string; // download URL after upload
}
@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent implements OnInit {
  showBot = false; // toggles visibility
  isEnlarged = false; // toggles small vs. big
  copyButtonText = 'Copy'; // button text that changes briefly to "Copied!"
  private attachment: { url: string; mime: string } | null = null;
  MAX_SIZE = 10 * 1024 * 1024; // 10,485,760

  // Track single-message copy states; index-based, e.g. 'Copy' or 'Copied!'
  singleCopyStates: string[] = [];

  user: User = {};
  profilePicturePath = '';

  status = '';
  errorMsg = '';
  prompt = '';

  previews: PendingPreview[] = [];
  uploading = false; // disables Send

  collectionPath: string;

  introMessage: DisplayMessage = {
    text: `I'm Bucky, a chatbot that will be assisting you on your journey tackling world problems. 
           To learn how to interact with me or other LLMs efficiently see `,
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
    this.collectionPath = `users/${this.auth.currentUser.uid}/discussions`;
  }
  uiPhase: UiPhase = 'idle';
  thinkingLabel = 'Thinking';
  private thinkingTimer?: any;
  private thinkingPhrases = ['Thinking', 'Reasoning', 'Writing'];
  private thinkingIndex = 0;

  ngOnDestroy(): void {
    this.stopThinking();
  }

  ngOnInit(): void {
    if (this.user?.profilePicture?.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL!;
    }
    this.deleteAllDocuments(); // optional, clearing old docs
  }
  openFullPage(): void {
    // Close the bubble (optional) and jump to stand-alone view
    this.showBot = false;
    this.router.navigate(['/ask-bucky'], { queryParams: { from: 'widget' } });
  }
  toggleBot() {
    this.showBot = !this.showBot;
  }
  /* --- remove: import * as mime from 'mime-types'; --- */

  /* simple extension map for rare cases */
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
        text: `⚠️ That file is ${(file.size / 1024 / 1024).toFixed(
          1
        )} MB — limit is 10 MB.`,
      });
      this.scrollToBottom();
      (event.target as HTMLInputElement).value = '';
      return;
    }

    // mime guess
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = file.type || this.EXT_MIME[ext] || 'application/octet-stream';

    // add to preview list
    const preview: PendingPreview = { file, mime, uploading: true };
    this.previews.push(preview);
    this.uploading = true;

    // upload to GCS
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
          this.uploading = this.previews.some((p) => p.uploading); // still something uploading?
        })
      )
      .subscribe();
  }
  removePreview(i: number) {
    const [preview] = this.previews.splice(i, 1);
    // optional: delete partially uploaded file if it had finished
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

  // ---------------------------------------------------------------------------
  // Send prompt + attachments
  // ---------------------------------------------------------------------------
  async submitPrompt() {
    /* block if a file is still uploading */
    if (this.uploading) return;

    const trimmed = this.prompt.trim();

    /* nothing to send? bail out */
    if (!trimmed && !this.previews.length) return;

    // ─── 1. push user's prompt bubble ─────────────────────────────
    if (trimmed) {
      this.responses.push({ text: trimmed, type: 'PROMPT' });
    }

    // ─── 2. push attachment bubbles ───────────────────────────────
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

    // ─── 3. build Firestore payload ───────────────────────────────
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
    this.cdRef.detectChanges(); // force immediate paint of the thinking UI

    // ─── 4. reset compose area ────────────────────────────────────
    this.prompt = '';
    this.previews = [];
    this.uploading = false;
    this.status = 'sure, one sec';

    // ─── 5. listen for Bucky’s answer ─────────────────────────────
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
              this.responses.push({ text: snap.response, type: 'RESPONSE' });
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

  scrollToBottom(): void {
    const chatbox = document.getElementById('chatbox');
    if (chatbox) {
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  }

  // Copies the entire conversation
  copyChat() {
    let result = `Bucky: ${this.introMessage.text}`;
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
        result += `\n\nBucky: ${msg.text}`;
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
    // 1) Convert your markdown/shortcode to HTML:
    const formattedMessage = this.formatText(text);

    // 2) Create Blob objects for both plain text and HTML (for maximum compatibility)
    const blobPlain = new Blob([formattedMessage], { type: 'text/plain' });
    const blobHtml = new Blob([formattedMessage], { type: 'text/html' });

    // 3) Build a ClipboardItem containing both
    const clipboardItem = new ClipboardItem({
      'text/plain': blobPlain,
      'text/html': blobHtml,
    });

    // 4) Write to the clipboard
    navigator.clipboard.write([clipboardItem]).then(
      () => {
        // Temporarily show "Copied!"
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
    // Very simple markdown-like rules:
    formatted = formatted.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^### (.*?)$/gm, '<h3>$1</h3>');

    // Bold and italic
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Bullet points
    formatted = formatted.replace(/^\* (.*?)(?=\n|$)/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');

    // Line breaks => <br>
    formatted = formatted.replace(/\n/g, '<br>');

    // Links: [text](URL)
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
    // Derive a sensible filename
    const urlParts = src.split('/');
    let filename = urlParts[urlParts.length - 1].split('?')[0];
    if (!filename.match(/\.(png|jpe?g|gif)$/i)) {
      filename = `image-${Date.now()}.png`;
    }

    try {
      // Try to fetch the image and download via blob (no navigation)
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

      // Free up memory
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback: open in a new tab (won’t disturb current page)
      window.open(src, '_blank', 'noopener');
    }
  }
  handleComposerKey(event: KeyboardEvent) {
    // Don’t submit while using an IME (e.g., Chinese/Japanese composition)
    if ((event as any).isComposing) return;

    // Send on Enter, allow new line on Shift+Enter
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault(); // stop the newline
      if (!this.uploading) {
        // your submitPrompt already guards, but this feels snappier
        this.submitPrompt();
      }
    }
  }

  private startThinking(): void {
    // clear any previous timer first
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
