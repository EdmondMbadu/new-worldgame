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
  ngOnInit(): void {
    setTimeout(() => {
      window.scrollTo(0, 0); // Ensure the scroll happens after the content is loaded
    }, 0);
    this.checkLoginStatus();
    this.deleteAllDocuments();
  }
  // ngAfterViewInit() {
  //   this.scrollToBottom();
  // }
  // ngAfterViewChecked() {
  //   this.scrollToBottom();
  // }
  // @ViewChild('chatbox') private chatbox?: ElementRef;
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
      intro: `${name} German-born physicist who developed the special and general theories of relativity`,
      collectionPath: `users/${this.auth.currentUser.uid}/albert/`,
    },
    {
      avatarPath: '../../../assets/img/mandela.png',
      name: 'Nelson Mandela',
      intro: `${name} South African anti-apartheid activist, politician, and statesman who served as the first president of South Africa`,
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
  async submitPrompt(event: Event, promptText: HTMLInputElement) {
    event.preventDefault();

    if (!promptText.value) return;
    this.prompt = promptText.value;
    promptText.value = '';
    this.responses.push({
      text: this.prompt,
      type: 'PROMPT',
    });

    this.status = 'sure, one sec';
    let id = this.afs.createId();
    const discussionRef: AngularFirestoreDocument<any> = this.afs.doc(
      `${this.aiSelected.collectionPath}${id}`
    );
    await discussionRef.set({ prompt: this.prompt });
    const destroyFn = discussionRef.valueChanges().subscribe({
      next: (conversation) => {
        if (conversation && conversation['status']) {
          this.status = 'thinking...';
          const state = conversation['status']['state'];

          switch (state) {
            case 'COMPLETED':
              this.status = '';

              // this.prompt = '';
              this.responses.push({
                text: conversation['response'],
                type: 'RESPONSE',
              });
              console.log(
                ' the response date and format',
                conversation['response']
              );
              // this.cdRef.detectChanges(); // Detect changes to update the view

              // // Use setTimeout to allow time for the DOM to update
              // setTimeout(() => this.scrollToBottom(), 0);
              this.typewriterEffect(conversation['response'], () => {
                this.cdRef.detectChanges(); // Detect changes to update the view
                setTimeout(() => this.scrollToBottom(), 0);
                destroyFn.unsubscribe();
              });

              destroyFn.unsubscribe();
              break;
            case 'PROCESSING':
              // currentPrompt = '';
              // this.prompt = '';
              this.status = 'preparing your answer...';
              break;
            case 'ERRORED':
              // currentPrompt = '';
              // this.prompt = '';
              this.status = 'Oh no! Something went wrong. Please try again.';
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
  scrollToBottom(): void {
    const chatbox = document.getElementById('chatbox');
    if (chatbox) {
      chatbox.scrollTop = chatbox.scrollHeight;
    }
    // try {
    //   this.chatbox!.nativeElement.scrollTop =
    //     this.chatbox!.nativeElement.scrollHeight;
    // } catch (err) {
    //   console.error('Scroll to bottom failed:', err);
    // }
  }
  typewriterEffect(text: string, callback: () => void) {
    let index = 0;
    this.responses[this.responses.length - 1].text = '';

    const interval = setInterval(() => {
      this.responses[this.responses.length - 1].text += text[index];
      index++;

      if (index === text.length) {
        clearInterval(interval);
        callback();
      }

      this.cdRef.detectChanges();
      this.scrollToBottom();
    }, 1); // Adjust typing speed here
  }
  async deleteAllDocuments(): Promise<void> {
    const batch = this.afs.firestore.batch();

    const querySnapshot = await this.afs
      .collection(this.collectionPath)
      .ref.get();
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }
}
interface DisplayMessage {
  text: string;
  type: 'PROMPT' | 'RESPONSE';
}
