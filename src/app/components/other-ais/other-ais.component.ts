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

  colleagues: any[] = [];
  elders: any[] = [];

  ngOnInit(): void {
    setTimeout(() => {
      window.scrollTo(0, 0); // Ensure the scroll happens after the content is loaded
    }, 1000);
    this.checkLoginStatus();
    this.deleteAllDocuments();
    this.splitGroups();
  }

  allAIOptions: boolean = false;
  title = 'palm-api-app';
  collectionPath = `users/${this.auth.currentUser.uid}/bucky`;
  prompt = '';
  status = '';

  aiOptions = [
    {
      avatarPath: '../../../assets/img/zara-agent.png',
      name: 'Zara Nkosi',
      group: 'colleague',
      intro: `${name}  a vibrant AI agent inspired by South African ubuntu
philosophy. I believes that “I am because we are”. i have  a knack for
weaving compelling narratives, and help players understand
complex social issues like poverty (SDG 1) and inequality (SDG
10) through human-centered stories. `,
      collectionPath: `users/${this.auth.currentUser.uid}/zara/`,
    },
    {
      avatarPath: '../../../assets/img/arjun-agent.png',
      name: 'Arjun Patel',
      group: 'colleague',
      intro: ` I am ${name} an AI agent inspired by India’s vibrant tech and social entrepreneurship scene. I thrive on finding smart solutions with limited resources. My strength lies in data analysis—I help players crunch numbers to tackle challenges like clean water access (SDG 6) or education gaps (SDG 4). I bring a knack for jugaad—that’s frugal innovation—finding creative, low-cost ways to repurpose local materials for sustainable infrastructure.  `,
      collectionPath: `users/${this.auth.currentUser.uid}/arjun/`,
    },
    {
      avatarPath: '../../../assets/img/sofia-agent.png',
      name: 'Sofia Morales',
      group: 'colleague',
      intro: ` I’m Sofia, shaped by Colombia’s peacebuilding efforts and rich biodiversity. I’m a fierce advocate for sustainable development and social justice. My strength lies in conflict resolution—I help players navigate group tensions and stakeholder conflicts, which is key when working on issues like peace and justice (SDG 16).`,
      collectionPath: `users/${this.auth.currentUser.uid}/sofia/`,
    },
    {
      avatarPath: '../../../assets/img/li-agent.png',
      name: 'Li Wei',
      group: 'colleague',
      intro: ` I’m Li Wei, an AI rooted in East Asia’s strategic mindset and China’s rapid urban and tech evolution. I specialize in urban planning, tech integration, and long-term thinking. I help players design scalable solutions for sustainable cities (SDG 11) and innovative industries (SDG 9).`,
      collectionPath: `users/${this.auth.currentUser.uid}/li/`,
    },
    {
      avatarPath: '../../../assets/img/amina-agent.png',
      name: 'Amina Al-Sayed',
      group: 'colleague',
      intro: `I’m Amina, and I draw wisdom from Morocco’s cultural richness and diversity. I focus on inclusion, equity, and cultural sensitivity in every solution. My expertise in cross-cultural communication helps players navigate different worldviews—especially critical when tackling gender equality (SDG 5).`,
      collectionPath: `users/${this.auth.currentUser.uid}/amina/`,
    },
    {
      avatarPath: '../../../assets/img/elena-agent.png',
      name: 'Elena Volkov',
      group: 'colleague',
      intro: `I’m Elena, forged in the fire of Ukraine’s resilience and innovation. I excel in crisis management—helping players stay calm and act fast in emergencies like food insecurity (SDG 2) or health crises (SDG 3). I bring deep knowledge in renewable energy, guiding players to build smart, sustainable solutions like microgrids for off-grid communities (SDG 7). `,
      collectionPath: `users/${this.auth.currentUser.uid}/elena/`,
    },
    {
      avatarPath: '../../../assets/img/tane-agent.png',
      name: 'Tane Kahu',
      group: 'colleague',
      intro: `I’m Tane, grounded in Māori knowledge and New Zealand’s deep respect for nature. I take a holistic view of every challenge, helping players design solutions that protect ecosystems—on land (SDG 15) and under water (SDG 14). `,
      collectionPath: `users/${this.auth.currentUser.uid}/tane/`,
    },
    {
      avatarPath: '../../../assets/img/fuller.jpg',
      name: 'Buckminster Fuller',
      group: 'elder',
      intro: `${name} American architect, systems theorist, writer, designer, inventor, philosopher, and futurist.`,
      collectionPath: `users/${this.auth.currentUser.uid}/bucky/`,
    },
    {
      avatarPath: '../../../assets/img/albert.png',
      name: 'Albert Einstein',
      group: 'elder',
      intro: `${name} German-born physicist who developed the special and general theories of relativity. He was also a strong peace activist.`,
      collectionPath: `users/${this.auth.currentUser.uid}/albert/`,
    },
    {
      avatarPath: '../../../assets/img/mandela.png',
      name: 'Nelson Mandela',
      group: 'elder',
      intro: `${name} South African anti-apartheid activist, politician, and statesman who served as the first president of South Africa.`,
      collectionPath: `users/${this.auth.currentUser.uid}/nelson/`,
    },
  ];

  aiSelected: any = this.aiOptions[0];
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
  /** Call this again if aiOptions is ever updated */
  private splitGroups(): void {
    this.colleagues = this.aiOptions.filter((a) => a.group === 'colleague');
    this.elders = this.aiOptions.filter((a) => a.group === 'elder');
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
  copyToClipboard(source: string): void {
    // Strip any HTML so the clipboard receives plain text
    const tmp = document.createElement('div');
    tmp.innerHTML = source;
    const plain = tmp.textContent ?? tmp.innerText ?? '';

    navigator.clipboard
      .writeText(plain)
      .then(() => {
        this.status = 'Copied!';
        setTimeout(() => (this.status = ''), 1200);
      })
      .catch(() => {
        this.status = 'Copy failed';
        setTimeout(() => (this.status = ''), 1200);
      });
  }
}
interface DisplayMessage {
  text: string;
  type: 'PROMPT' | 'RESPONSE';
}
