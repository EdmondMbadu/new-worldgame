import { Component, OnInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';

export interface DisplayMessage {
  text?: string; // present for PROMPT / RESPONSE
  src?: string; // present for IMAGE
  link?: { text?: string; url?: string };
  type: 'PROMPT' | 'RESPONSE' | 'IMAGE';
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

  // Track single-message copy states; index-based, e.g. 'Copy' or 'Copied!'
  singleCopyStates: string[] = [];

  user: User = {};
  profilePicturePath = '';

  status = '';
  errorMsg = '';
  prompt = '';

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
    private auth: AuthService,
    private cdRef: ChangeDetectorRef
  ) {
    this.user = this.auth.currentUser;
    this.collectionPath = `users/${this.auth.currentUser.uid}/discussions`;
  }

  ngOnInit(): void {
    if (this.user?.profilePicture?.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL!;
    }
    this.deleteAllDocuments(); // optional, clearing old docs
  }

  toggleBot() {
    this.showBot = !this.showBot;
  }

  toggleChatSize() {
    this.isEnlarged = !this.isEnlarged;
  }

  async submitPrompt() {
    const trimmed = this.prompt.trim();
    if (!trimmed) return;

    this.responses.push({ text: trimmed, type: 'PROMPT' });
    this.prompt = '';
    this.status = 'sure, one sec';

    const id = this.afs.createId();
    const discussionRef: AngularFirestoreDocument<any> = this.afs.doc(
      `${this.collectionPath}/${id}`
    );
    await discussionRef.set({ prompt: trimmed });

    const destroyFn = discussionRef.valueChanges().subscribe({
      next: (conversation) => {
        if (conversation && conversation['status']) {
          this.status = 'thinking...';
          const state = conversation['status']['state'];

          switch (state) {
            case 'COMPLETED':
              // this.status = '';
              // this.responses.push({
              //   text: conversation['response'],
              //   type: 'RESPONSE',
              // });
              // this.cdRef.detectChanges();
              // setTimeout(() => this.scrollToBottom(), 0);
              // destroyFn.unsubscribe();
              // break;
              this.status = '';
              if (conversation['response']) {
                this.responses.push({
                  text: conversation['response'],
                  type: 'RESPONSE',
                });
              }
              if (conversation['imageUrl']) {
                this.responses.push({
                  src: conversation['imageUrl'],
                  type: 'IMAGE',
                });
              }
              this.cdRef.detectChanges();
              setTimeout(() => this.scrollToBottom(), 0);
              destroyFn.unsubscribe();
              break;
            case 'PROCESSING':
              this.status = 'preparing your answer...';
              break;
            case 'ERRORED':
              this.status = 'Oh no! Something went wrong.';
              destroyFn.unsubscribe();
              break;
          }
        }
      },
      error: (err) => {
        console.log(err);
        this.errorMsg = err.message;
        destroyFn.unsubscribe();
      },
    });

    this.scrollToBottom();
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

  // Copies only one message
  // copySingleMessage(text: string, index: number) {
  //   navigator.clipboard.writeText(text).then(
  //     () => {
  //       // Temporarily show "Copied!"
  //       this.singleCopyStates[index] = 'Copied!';
  //       setTimeout(() => {
  //         this.singleCopyStates[index] = 'Copy';
  //       }, 2000);
  //     },
  //     (err) => {
  //       console.error('Failed to copy single message:', err);
  //     }
  //   );
  // }
  // Copies only one message as real HTML data
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
}
