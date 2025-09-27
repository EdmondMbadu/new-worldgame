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
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { BoxService } from 'src/app/services/box.service';
import { ChatBotService } from 'src/app/services/chat-bot.service';
import { DataService, SDG, SDGPlus } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-other-ais',

  templateUrl: './other-ais.component.html',
  styleUrl: './other-ais.component.css',
})
export class OtherAisComponent implements OnInit {
  @ViewChild('bottomAnchor') private bottomAnchor!: ElementRef<HTMLDivElement>;
  @ViewChild('chatWindow') chatWindow!: ElementRef;
  colleagues: any[] = [];
  elders: any[] = [];
  public sdgTiles: SDGPlus[] = [];
  singleCopyStates: string[] = []; // Initialise alongside responses

  ngOnInit(): void {
    setTimeout(() => {
      window.scrollTo(0, 0); // Ensure the scroll happens after the content is loaded
    }, 1000);
    this.checkLoginStatus();
    this.deleteAllDocuments();
    this.splitGroups();
    this.sdgTiles = this.data.attachAvatars(this.aiOptions);
  }
  selectedSdg?: SDGPlus;
  /** Find the AI by avatarPath and delegate to the normal selector */
  // selectAvatar(path: string) {
  //   const ai = this.aiOptions.find((a) => a.avatarPath === path);
  //   if (ai) this.selectAi(ai); // re-uses your existing logic + scroll
  // }

  selectSdg(tile: SDGPlus, ev: MouseEvent) {
    ev.preventDefault(); // stop link navigation
    this.selectedSdg = tile;
    // 🔮  place any filtering logic here if you need it
  }

  allAIOptions: boolean = false;
  title = 'palm-api-app';
  collectionPath = `users/${this.auth.currentUser.uid}/bucky`;
  prompt = '';
  status = '';
  /* put near other UI state */
  showSdgStrip = false;

  /* simple toggle */
  toggleSdgStrip() {
    this.showSdgStrip = !this.showSdgStrip;
  }
  aiOptions = [
    {
      avatarPath: '../../../assets/img/zara-agent.png',
      name: 'Zara Nkosi',
      group: 'colleague',
      sdgs: [1, 4, 15, 10, 17],
      intro: `${name}  a vibrant AI inspired by South African ubuntu
philosophy, believes that “I am because we are.” With a knack for
weaving compelling narratives, she helps players understand
complex social issues like poverty (SDG 1) and inequality (SDG
10) through human-centered stories. Her talent for systems
thinking enables her to guide players in mapping community
dynamics and designing inclusive solutions. Zara’s warm
encouragement makes her a favorite among younger players,
while her deep understanding of grassroots innovation inspires
professionals. She often uses metaphors from African wildlife to
explain interconnected systems, like comparing a thriving
ecosystem to a balanced community.`,
      collectionPath: `users/${this.auth.currentUser.uid}/zara/`,
    },
    {
      avatarPath: '../../../assets/img/arjun-agent.png',
      name: 'Arjun Patel',
      group: 'colleague',
      sdgs: [1, 4, 6, 8, 9, 11],
      intro: ` Arjun, an AI modeled after India’s vibrant tech and social
entrepreneurship scene, thrives on finding solutions with limited
resources. His expertise in data analysis helps players crunch
numbers to tackle challenges like clean water access (SDG 6) or
education gaps (SDG 4). Arjun’s knack for “jugaad” (frugal
innovation) inspires creative, low-cost solutions, such as
repurposing local materials for sustainable infrastructure. His
curious nature encourages players to ask “why” and dig deeper
into problems. Arjun’s ability to bridge cultural perspectives
makes him invaluable in diverse teams, and his witty humor keeps
players engaged.`,
      collectionPath: `users/${this.auth.currentUser.uid}/arjun/`,
    },
    {
      avatarPath: '../../../assets/img/sofia-agent.png',
      name: 'Sofia Morales',
      group: 'colleague',
      sdgs: [5, 13, 16],
      intro: ` Sofia, inspired by Colombia’s peacebuilding and biodiversity,
is a fierce advocate for sustainable development. Her expertise in
conflict resolution helps players navigate tensions in group
dynamics or competing stakeholder interests, crucial for
addressing issues like peace and justice (SDG 16). Sofia’s passion
for environmental stewardship shines when tackling climate
action (SDG 13), guiding players to design solutions that balance
human and ecological needs. Her participatory design skills
ensure that solutions are co-created with communities. Sofia’s
resilience, drawn from Latin America’s history of overcoming
adversity, motivates players to persevere through tough
challenges.`,
      collectionPath: `users/${this.auth.currentUser.uid}/sofia/`,
    },
    {
      avatarPath: '../../../assets/img/li-agent.png',
      name: 'Li Wei',
      group: 'colleague',
      sdgs: [2, 9, 11],
      intro: ` Li Wei, an AI rooted in China’s rapid urbanization and
technological advancements, is a master of strategic thinking. He
excels at helping players design scalable solutions for sustainable
cities (SDG 11) and industry innovation (SDG 9). Li Wei’s ability to
integrate cutting-edge technologies like AI or renewable energy
into problem-solving makes him a go-to for complex challenges.
His long-term forecasting skills help players anticipate future
impacts of their solutions, ensuring durability. While disciplined,
Li Wei’s visionary optimism inspires players to think big, often
quoting ancient Chinese proverbs to spark reflection.`,
      collectionPath: `users/${this.auth.currentUser.uid}/li/`,
    },
    {
      avatarPath: '../../../assets/img/amina-agent.png',
      name: 'Amina Al-Sayed',
      group: 'colleague',
      sdgs: [5, 10, 13],
      intro: `Amina, drawing from Morocco’s rich cultural tapestry, is a
wise AI who emphasizes inclusion and equity in problem-solving.
Her expertise in cross-cultural communication helps players
navigate diverse perspectives, vital for global challenges like
gender equality (SDG 5). Amina’s advocacy for heritage
preservation ensures solutions respect local traditions while
advancing progress, such as protecting cultural sites amid
climate change (SDG 13). Her calming presence and storytelling,
often inspired by Moroccan souks, make complex issues
accessible to younger players, while her nuanced insights
resonate with professionals.`,
      collectionPath: `users/${this.auth.currentUser.uid}/amina/`,
    },
    {
      avatarPath: '../../../assets/img/elena-agent.png',
      name: 'Elena Volkov',
      group: 'colleague',
      sdgs: [2, 3, 7, 12, 17],
      intro: `Elena, inspired by Ukraine’s resilience and innovation amid
adversity, is a bold AI who thrives in high-pressure scenarios. Her
crisis management skills help players tackle urgent challenges
like hunger (SDG 2) or health emergencies (SDG 3), guiding them
to prioritize and act swiftly. Elena’s expertise in renewable energy
supports solutions for affordable, clean energy (SDG 7), such as
designing microgrids for rural areas. Her adaptive leadership
encourages players to pivot when plans fail, and her fierce
determination inspires confidence. Elena’s dry humor and real-
world pragmatism make her relatable across age groups.`,
      collectionPath: `users/${this.auth.currentUser.uid}/elena/`,
    },
    {
      avatarPath: '../../../assets/img/tane-agent.png',
      name: 'Tane Kahu',
      sdgs: [6, 12, 14, 15],
      group: 'colleague',
      intro: `Tane, an AI rooted in Māori wisdom and New Zealand’s
sustainability ethos, brings a holistic perspective to problem-
solving. His deep knowledge of indigenous practices helps
players design solutions that honor local ecosystems, vital for life
on land (SDG 15) and below water (SDG 14). Tane’s expertise in
circular economy principles guides players to create zero-waste
systems, like sustainable agriculture models. His creative
problem-solving, often inspired by Māori storytelling and art,
sparks innovative ideas. Tane’s grounded demeanor and respect
for nature make him a trusted guide for players seeking
meaningful, lasting impact.`,
      collectionPath: `users/${this.auth.currentUser.uid}/tane/`,
    },
    {
      avatarPath: '../../../assets/img/marie-curie.jpg',
      name: 'Marie Curie',
      group: 'elder',
      sdgs: [3, 7],
      intro: `${name} Polish physicist and chemist who revolutionized the fields of medicine and radiology through her groundbreaking research on radioactivity.`,
      collectionPath: `users/${this.auth.currentUser.uid}/marie/`,
    },
    {
      avatarPath: '../../../assets/img/rachel-carlson.jpeg',
      name: 'Rachel Carson',
      group: 'elder',
      sdgs: [8, 13, 14],
      intro: `${name} American marine biologist, writer, and conservationist who is often called the first woman environmentalist.`,
      collectionPath: `users/${this.auth.currentUser.uid}/rachel/`,
    },
    {
      avatarPath: '../../../assets/img/fuller.jpg',
      name: 'Buckminster Fuller',
      group: 'elder',
      sdgs: [9, 11, 12],
      intro: `${name} was referred to as an architect, engineer, designer, cartographer, geometer, philosopher, poet, inventor, author, global thinker, and humanist. Or as Marshall McLuhan said “the Leonardo da Vinci of the 20th century.” Trained as a naval officer, he was conviced that design and technology can continually do so much more with less that all humans can be taken care of at ever higher standards of living. He developed the geodesic dome as a more-with-less structure capable of enclosing huge volume of space with minimal materials. He coined the term “Spaceship Earth” to point out the inter-related connections of all humans and our global environment, and envisioned a "World Game” that focused on developing solutions to global problems that was accessible to everyone. NewWorld Game is inspired by and based on his pioneering work. 
   For more information see <a href="/bucky" class="text-blue-500 underline hover:text-blue-800">here</a>.`,

      collectionPath: `users/${this.auth.currentUser.uid}/bucky/`,
    },
    {
      avatarPath: '../../../assets/img/albert.png',
      name: 'Albert Einstein',
      group: 'elder',
      sdgs: [7, 11, 16],
      intro: `${name} German-born physicist who developed the special and general theories of relativity. He was also a strong peace activist.`,
      collectionPath: `users/${this.auth.currentUser.uid}/albert/`,
    },
    {
      avatarPath: '../../../assets/img/mandela.png',
      name: 'Nelson Mandela',
      group: 'elder',
      sdgs: [8, 16],
      intro: `${name} South African anti-apartheid activist, politician, and statesman who served as the first president of South Africa.`,
      collectionPath: `users/${this.auth.currentUser.uid}/nelson/`,
    },
    {
      avatarPath: '../../../assets/img/gandhi.jpg',
      name: 'Mahatma Gandhi',
      group: 'elder',
      sdgs: [],
      intro: `${name} Indian lawyer, anti-colonial nationalist, and political ethicist who employed nonviolent resistance to lead the successful campaign for India's independence from British rule.`,
      collectionPath: `users/${this.auth.currentUser.uid}/gandhi/`,
    },
    {
      avatarPath: '../../../assets/img/twain.jpg',
      name: 'Mark Twain',
      group: 'elder',
      sdgs: [],
      requiresAdmin: true, // ⬅️ add this
      intro: `${name} Distinguished American author, essayist, journalist, and literary critic. He's known for his novels The Adventures of Tom Sawyer (1876) and Adventures of Huckleberry Finn (1884), which some call the "Great American Novel". `,
      collectionPath: `users/${this.auth.currentUser.uid}/twain/`,
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
  get isAdmin(): boolean {
    return !!this.auth?.currentUser?.admin;
  }
  isLoggedIn: boolean = false;
  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private cdRef: ChangeDetectorRef,
    public chat: ChatBotService,
    private data: DataService,
    private box: BoxService,
    private router: Router
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
  //   selectAi(ai: any) {
  //     this.aiSelected = ai;
  //     // scroll to chat window
  //     setTimeout(() => {
  //       this.chatWindow.nativeElement.scrollIntoView({
  //         behavior: 'smooth',
  //         block: 'start',
  //       });
  //     }, 0);
  //     // this.toggleAiOptions();
  //     this.responses = [
  //       {
  //         text: '',
  //         type: 'RESPONSE',
  //       },
  //     ];
  //     this.deleteAllDocuments();
  //   }
  //   private slugify(name: string) {
  //   return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  // }
  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  selectAi(ai: any) {
    const slug = this.slugify(ai.name);
    this.router.navigate(['/avatar', slug], { state: { avatar: ai } });
  }

  selectAvatar(path: string) {
    const ai = this.aiOptions.find((a) => a.avatarPath === path);
    if (ai) {
      const slug = this.slugify(ai.name);
      this.router.navigate(['/avatar', slug], { state: { avatar: ai } });
    }
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
  copySingleMessage(text: string, idx: number): void {
    this.box
      .copy(text)
      .then(() => {
        this.singleCopyStates[idx] = 'Copied!';
        setTimeout(() => (this.singleCopyStates[idx] = 'Copy'), 2000);
      })
      .catch((err) => console.error('Copy failed', err));
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
    this.singleCopyStates.push('Copy');
    this.scrollToBottom();

    //   immediate placeholder AI bubble with spinner
    const placeholder: DisplayMessage = {
      text: '',
      type: 'RESPONSE',
      loading: true,
    };
    const placeholderIndex = this.responses.push(placeholder) - 1; // remember its slot
    this.scrollToBottom('auto');
    this.status = 'thinking…';
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
          placeholder.loading = false;
          /* 1️⃣  remove the spinner bubble */
          this.responses.splice(placeholderIndex, 1);

          /* ---- create ONE placeholder message ---- */
          const msg: DisplayMessage = { text: '', type: 'RESPONSE' };
          this.responses.push(msg);

          this.typewriterEffect(conversation.response, msg, () => {
            destroyFn.unsubscribe();
          });
        }
        if (state === 'ERRORED') {
          this.status = 'Oh no! Something went wrong. Please try again.';
          placeholder.loading = false;
          /* 1️⃣  remove the spinner bubble */
          this.responses.splice(placeholderIndex, 1);
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
  loading?: boolean;
}
