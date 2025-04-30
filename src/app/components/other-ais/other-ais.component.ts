import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from 'src/app/services/auth.service';
import { ChatBotService } from 'src/app/services/chat-bot.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-other-ais',

  templateUrl: './other-ais.component.html',
  styleUrl: './other-ais.component.css',
})
export class OtherAisComponent implements OnInit {
  @ViewChild('bottomAnchor') private bottomAnchor!: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    setTimeout(() => {
      window.scrollTo(0, 0); // Ensure the scroll happens after the content is loaded
    }, 1000);
    this.checkLoginStatus();
    this.deleteAllDocuments();
  }

  allAIOptions: boolean = false;
  title = 'palm-api-app';
  collectionPath = `users/${this.auth.currentUser.uid}/bucky`;
  prompt = '';
  status = '';

  aiOptions = [
    {
      avatarPath: '../../../assets/img/fuller.jpg',
      name: 'Buckminster Fuller',
      intro: `${name} American architect, systems theorist, writer, designer, inventor, philosopher, and futurist.`,
      collectionPath: `users/${this.auth.currentUser.uid}/bucky/`,
    },
    {
      avatarPath: '../../../assets/img/albert.png',
      name: 'Albert Einstein',
      intro: `${name} German-born physicist who developed the special and general theories of relativity. He was also a strong peace activist.`,
      collectionPath: `users/${this.auth.currentUser.uid}/albert/`,
    },
    {
      avatarPath: '../../../assets/img/mandela.png',
      name: 'Nelson Mandela',
      intro: `${name} South African anti-apartheid activist, politician, and statesman who served as the first president of South Africa.`,
      collectionPath: `users/${this.auth.currentUser.uid}/nelson/`,
    },
    // waiting for approval to get jane goodall
    // {
    //   avatarPath: '../../../assets/img/jane-goodal.png',
    //   name: 'Jane Goodall',
    //   intro: `${name} English zoologist, primatologist and anthropologist considered the world's foremost expert on chimpanzees...`,
    //   collectionPath: `users/${this.auth.currentUser.uid}/jane/`,
    // },
  ];
  // einstein is the default personna
  aiSelected: any = this.aiOptions[2];
  errorMsg = '';
  responses: DisplayMessage[] = [
    {
      text: "I'm a chatbot powered by the Palm API Firebase Extension and built with Angular.",
      type: 'RESPONSE',
    },
  ];
  isLoggedIn: boolean = false;
  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private cdRef: ChangeDetectorRef,
    public chat: ChatBotService
  ) {}
  checkLoginStatus(): void {
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    } else {
      this.isLoggedIn = false;
    }
  }
  selectAi(ai: any) {
    this.aiSelected = ai;
    // this.toggleAiOptions();
    this.responses = [
      {
        text: '',
        type: 'RESPONSE',
      },
    ];
    this.deleteAllDocuments();
  }
  selectAiFromDropDown(ai: any) {
    this.aiSelected = ai;
    this.toggleAiOptions();
    this.responses = [
      {
        text: '',
        type: 'RESPONSE',
      },
    ];
    this.deleteAllDocuments();
  }
  toggleAiOptions() {
    this.allAIOptions = !this.allAIOptions;
  }

  ngAfterViewInit(): void {
    this.scrollToBottom('auto'); // first render
  }

  /* ---------------- utilities ---------------- */

  private scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    this.bottomAnchor?.nativeElement.scrollIntoView({ behavior });
  }

  async submitPrompt(
    event: Event,
    promptText: HTMLInputElement
  ): Promise<void> {
    event.preventDefault();
    if (!promptText.value) return;

    /* user prompt */
    this.prompt = promptText.value;
    promptText.value = '';
    this.responses.push({ text: this.prompt, type: 'PROMPT' });
    this.scrollToBottom();

    /* firestore write */
    const id = this.afs.createId();
    const discussionRef = this.afs.doc(
      `${this.aiSelected.collectionPath}${id}`
    ) as AngularFirestoreDocument<any>;
    await discussionRef.set({ prompt: this.prompt });

    const destroyFn = discussionRef.valueChanges().subscribe({
      next: (conversation) => {
        if (!conversation || !conversation.status) return;

        const state = conversation.status.state;
        if (state === 'PROCESSING') {
          this.status = 'thinking...';
        }
        if (state === 'COMPLETED') {
          this.status = '';

          /* ---- create ONE placeholder message ---- */
          const msg: DisplayMessage = { text: '', type: 'RESPONSE' };
          this.responses.push(msg);

          this.typewriterEffect(conversation.response, msg, () => {
            destroyFn.unsubscribe();
          });
        }
        if (state === 'ERRORED') {
          this.status = 'Oh no! Something went wrong. Please try again.';
          destroyFn.unsubscribe();
        }
      },
      error: (err) => {
        this.errorMsg = err.message;
        destroyFn.unsubscribe();
      },
    });
  }

  /* -------------------------------- typewriter effect --------------------------- */

  /** Animates text into `msg.text` one character at a time. */
  private typewriterEffect(
    fullText: string,
    msg: DisplayMessage,
    done: () => void
  ): void {
    let i = 0;
    const id = setInterval(() => {
      msg.text += fullText[i++];
      this.cdRef.detectChanges();
      this.scrollToBottom('auto');

      if (i === fullText.length) {
        clearInterval(id);
        this.scrollToBottom(); // smooth final scroll
        done();
      }
    }, 1); // typing speed
  }
  /* ---------------- housekeeping ---------------- */

  async deleteAllDocuments(): Promise<void> {
    const batch = this.afs.firestore.batch();
    const snapshot = await this.afs
      .collection(`users/${this.auth.currentUser.uid}/bucky`)
      .ref.get();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
interface DisplayMessage {
  text: string;
  type: 'PROMPT' | 'RESPONSE';
}
