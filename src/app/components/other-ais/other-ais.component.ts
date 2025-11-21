import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/services/auth.service';
import { BoxService } from 'src/app/services/box.service';
import { ChatBotService } from 'src/app/services/chat-bot.service';
import { DataService, SDG, SDGPlus } from 'src/app/services/data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-other-ais',

  templateUrl: './other-ais.component.html',
  styleUrl: './other-ais.component.css',
})
export class OtherAisComponent implements OnInit, OnDestroy {
  @ViewChild('bottomAnchor') private bottomAnchor!: ElementRef<HTMLDivElement>;
  @ViewChild('chatWindow') chatWindow!: ElementRef;
  colleagues: AvatarOption[] = [];
  elders: AvatarOption[] = [];
  public sdgTiles: SDGPlus[] = [];
  singleCopyStates: string[] = [];
  visibleAvatars: AvatarOption[] = [];
  sampleMosaic: AvatarOption[] = [];
  private langChangeSub?: Subscription;

  private readonly guestUid = 'guest';

  private readonly avatarDefinitions: AvatarDefinition[] = [
    {
      avatarPath: '../../../assets/img/zara-agent.png',
      name: 'Zara Nkosi',
      group: 'colleague',
      sdgs: [1, 4, 15, 10, 17],
      introKey: 'otherAis.avatars.zara.intro',
      collectionKey: 'zara',
    },
    {
      avatarPath: '../../../assets/img/arjun-agent.png',
      name: 'Arjun Patel',
      group: 'colleague',
      sdgs: [1, 4, 6, 8, 9, 11],
      introKey: 'otherAis.avatars.arjun.intro',
      collectionKey: 'arjun',
    },
    {
      avatarPath: '../../../assets/img/sofia-agent.png',
      name: 'Sofia Morales',
      group: 'colleague',
      sdgs: [5, 13, 16],
      introKey: 'otherAis.avatars.sofia.intro',
      collectionKey: 'sofia',
    },
    {
      avatarPath: '../../../assets/img/li-agent.png',
      name: 'Li Wei',
      group: 'colleague',
      sdgs: [2, 9, 11],
      introKey: 'otherAis.avatars.li.intro',
      collectionKey: 'li',
    },
    {
      avatarPath: '../../../assets/img/amina-agent.png',
      name: 'Amina Al-Sayed',
      group: 'colleague',
      sdgs: [5, 10, 13],
      introKey: 'otherAis.avatars.amina.intro',
      collectionKey: 'amina',
    },
    {
      avatarPath: '../../../assets/img/elena-agent.png',
      name: 'Elena Volkov',
      group: 'colleague',
      sdgs: [2, 3, 7, 12, 17],
      introKey: 'otherAis.avatars.elena.intro',
      collectionKey: 'elena',
    },
    {
      avatarPath: '../../../assets/img/tane-agent.png',
      name: 'Tane Kahu',
      group: 'colleague',
      sdgs: [6, 12, 14, 15],
      introKey: 'otherAis.avatars.tane.intro',
      collectionKey: 'tane',
    },
    {
      avatarPath: '../../../assets/img/marie-curie.jpg',
      name: 'Marie Curie',
      group: 'elder',
      sdgs: [3, 7],
      introKey: 'otherAis.avatars.marie.intro',
      collectionKey: 'marie',
    },
    {
      avatarPath: '../../../assets/img/rachel-carlson.jpeg',
      name: 'Rachel Carson',
      group: 'elder',
      sdgs: [8, 13, 14],
      introKey: 'otherAis.avatars.rachel.intro',
      collectionKey: 'rachel',
    },
    {
      avatarPath: '../../../assets/img/fuller.jpg',
      name: 'Buckminster Fuller',
      group: 'elder',
      sdgs: [9, 11, 12],
      introKey: 'otherAis.avatars.bucky.intro',
      collectionKey: 'bucky',
    },
    {
      avatarPath: '../../../assets/img/albert.png',
      name: 'Albert Einstein',
      group: 'elder',
      sdgs: [7, 11, 16],
      introKey: 'otherAis.avatars.albert.intro',
      collectionKey: 'albert',
    },
    {
      avatarPath: '../../../assets/img/mandela.png',
      name: 'Nelson Mandela',
      group: 'elder',
      sdgs: [8, 16],
      introKey: 'otherAis.avatars.nelson.intro',
      collectionKey: 'nelson',
    },
    {
      avatarPath: '../../../assets/img/gandhi.jpg',
      name: 'Mahatma Gandhi',
      group: 'elder',
      sdgs: [],
      introKey: 'otherAis.avatars.gandhi.intro',
      collectionKey: 'gandhi',
    },
    {
      avatarPath: '../../../assets/img/twain.jpg',
      name: 'Mark Twain',
      group: 'elder',
      sdgs: [],
      introKey: 'otherAis.avatars.twain.intro',
      collectionKey: 'twain',
      requiresAdmin: false,
    },
  ];

  private buildLocalizedAiOptions(): AvatarOption[] {
    return this.avatarDefinitions.map((definition) => {
      const { introKey, collectionKey, ...rest } = definition;
      return {
        ...rest,
        intro: this.translate.instant(introKey, {
          name: definition.name,
        }),
        collectionPath: this.buildCollectionPath(collectionKey),
      };
    });
  }

  private applyLocalizedAiOptions(): void {
    const currentSelectionName = this.aiSelected?.name;
    this.aiOptions = this.buildLocalizedAiOptions();
    if (this.aiOptions.length) {
      this.aiSelected =
        this.aiOptions.find((ai) => ai.name === currentSelectionName) ||
        this.aiOptions[0];
    } else {
      this.aiSelected = undefined;
    }
    this.splitGroups();
    this.refreshCounts();
    this.visibleAvatars = this.filterAvatars();
    this.sampleMosaic = this.buildMosaic();
    this.sdgTiles = this.data.attachAvatars(this.aiOptions);
  }

  private buildCollectionPath(key: string, uid?: string | null): string {
    const resolvedUid = uid ?? this.auth?.currentUser?.uid ?? this.guestUid;
    return `users/${resolvedUid}/${key}/`;
  }

  // NEW state
  search = '';
  activeGroup: 'all' | 'colleague' | 'elder' = 'all';
  activeSdg: number | null = null;

  sdgNumbers = Array.from({ length: 17 }, (_, i) => i + 1);

  // hero stats + mosaic
  totalCount = 0;
  colleagueCount = 0;
  elderCount = 0;
  ngOnInit(): void {
    setTimeout(() => {
      window.scrollTo(0, 0); // Ensure the scroll happens after the content is loaded
    }, 1000);
    this.applyLocalizedAiOptions();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.applyLocalizedAiOptions();
      this.updateCollectionPaths(this.auth?.currentUser?.uid);
    });
    this.checkLoginStatus();
    this.deleteAllDocuments();
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
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
  collectionPath = this.buildCollectionPath('bucky');
  prompt = '';
  status = '';
  /* put near other UI state */
  showSdgStrip = false;

  /* simple toggle */
  toggleSdgStrip() {
    this.showSdgStrip = !this.showSdgStrip;
  }
  aiOptions: AvatarOption[] = [];
  aiSelected?: AvatarOption;
  errorMsg = '';
  responses: DisplayMessage[] = [];
  private isAdminFlag(): boolean {
    const adminRaw = this.auth?.currentUser?.admin;
    return adminRaw === true || adminRaw === 'true';
  }
  get isAdmin(): boolean {
    return this.isAdminFlag();
  }
  isLoggedIn: boolean = false;
  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private cdRef: ChangeDetectorRef,
    public chat: ChatBotService,
    private data: DataService,
    private box: BoxService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.responses = [
      {
        text: this.translate.instant('otherAis.chat.intro'),
        type: 'RESPONSE',
      },
    ];
  }
  checkLoginStatus(): void {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
      const uid =
        user && typeof user === 'object' && 'uid' in user
          ? (user as { uid: string }).uid
          : null;
      this.updateCollectionPaths(uid);
      if (user) {
        void this.deleteAllDocuments();
      }
      this.visibleAvatars = this.filterAvatars();
      this.sampleMosaic = this.buildMosaic();
    });
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
        this.singleCopyStates[idx] = this.translate.instant(
          'otherAis.chat.copy.success'
        );
        setTimeout(() => {
          this.singleCopyStates[idx] = this.translate.instant(
            'otherAis.chat.copy.default'
          );
        }, 2000);
      })
      .catch((err) => console.error('Copy failed', err));
  }

  async submitPrompt(
    event: Event,
    promptText: HTMLInputElement
  ): Promise<void> {
    event.preventDefault();
    if (!promptText.value || !this.aiSelected) return;

    /* user prompt */
    this.prompt = promptText.value;
    promptText.value = '';
    this.responses.push({ text: this.prompt, type: 'PROMPT' });
    this.singleCopyStates.push(
      this.translate.instant('otherAis.chat.copy.default')
    );
    this.scrollToBottom();

    //   immediate placeholder AI bubble with spinner
    const placeholder: DisplayMessage = {
      text: '',
      type: 'RESPONSE',
      loading: true,
    };
    const placeholderIndex = this.responses.push(placeholder) - 1; // remember its slot
    this.scrollToBottom('auto');
    this.status = this.translate.instant('otherAis.chat.status.thinking');
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
          this.status = this.translate.instant(
            'otherAis.chat.status.thinking'
          );
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
          this.status = this.translate.instant('otherAis.chat.status.error');
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
    const uid = this.auth?.currentUser?.uid;
    if (!uid) {
      return;
    }
    const batch = this.afs.firestore.batch();
    const snapshot = await this.afs.collection(`users/${uid}/bucky`).ref.get();
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
        this.status = this.translate.instant('otherAis.chat.copy.success');
        setTimeout(() => (this.status = ''), 1200);
      })
      .catch(() => {
        this.status = this.translate.instant('otherAis.chat.copy.failure');
        setTimeout(() => (this.status = ''), 1200);
      });
  }

  private extractCollectionKey(path?: string): string | null {
    if (!path) return null;
    const segments = path.split('/').filter(Boolean);
    return segments.length >= 3 ? segments[2] : segments.pop() ?? null;
  }

  private updateCollectionPaths(uid?: string | null): void {
    const resolvedUid = uid ?? this.auth?.currentUser?.uid;
    if (!resolvedUid) {
      return;
    }

    const basePath = `users/${resolvedUid}/`;
    this.collectionPath = `${basePath}bucky`;

    const currentSelectionName = this.aiSelected?.name;

    this.aiOptions = this.aiOptions.map((ai) => {
      const key =
        this.extractCollectionKey(ai.collectionPath) || this.slugify(ai.name);
      return {
        ...ai,
        collectionPath: `${basePath}${key}/`,
      };
    });

    if (this.aiOptions.length) {
      this.aiSelected =
        this.aiOptions.find((ai) => ai.name === currentSelectionName) ||
        this.aiOptions[0];
    }

    this.splitGroups();
    this.refreshCounts();
    this.sdgTiles = this.data.attachAvatars(this.aiOptions);
  }

  // --- NAV ---
  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  openAvatar(ai: any) {
    const slug = this.slugify(ai.name);
    this.router.navigate(['/avatar', slug], { state: { avatar: ai } });
  }

  // --- FILTERS ---
  onSearch(v: string) {
    this.search = v;
    this.visibleAvatars = this.filterAvatars();
  }
  setGroup(g: 'all' | 'colleague' | 'elder') {
    this.activeGroup = g;
    this.visibleAvatars = this.filterAvatars();
  }
  setSdg(n: number | null) {
    this.activeSdg = n;
    this.visibleAvatars = this.filterAvatars();
  }

  private filterAvatars(): AvatarOption[] {
    const q = this.search.trim().toLowerCase();
    const isAdmin = this.isAdminFlag();

    return this.aiOptions
      .filter((a) => isAdmin || !a.requiresAdmin)
      .filter((a) =>
        this.activeGroup === 'all' ? true : a.group === this.activeGroup
      )
      .filter((a) => {
        if (this.activeSdg === null) return true;
        const sdgs = Array.isArray(a.sdgs) ? (a.sdgs as number[]) : [];
        return sdgs.includes(this.activeSdg!);
      })

      .filter((a) => {
        if (!q) return true;
        const txt = (
          a.name +
          ' ' +
          (a.intro || '') +
          ' ' +
          (a.sdgs || []).join(' ')
        ).toLowerCase();
        return txt.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  excerpt(html: string = '', max = 200): string {
    const text = html
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  private refreshCounts() {
    this.totalCount = this.aiOptions.length;
    this.colleagueCount = this.aiOptions.filter(
      (a) => a.group === 'colleague'
    ).length;
    this.elderCount = this.aiOptions.filter((a) => a.group === 'elder').length;
  }

  private buildMosaic(): AvatarOption[] {
    const isAdmin = this.isAdminFlag();
    // pick up to 9 avatars for the hero mosaic
    return [...this.aiOptions]
      .filter((a) => isAdmin || !a.requiresAdmin)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 9);
  }

  scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
interface DisplayMessage {
  text: string;
  type: 'PROMPT' | 'RESPONSE';
  loading?: boolean;
}

interface AvatarDefinition {
  avatarPath: string;
  name: string;
  group: 'colleague' | 'elder';
  sdgs: number[];
  introKey: string;
  collectionKey: string;
  requiresAdmin?: boolean;
}

interface AvatarOption
  extends Omit<AvatarDefinition, 'introKey' | 'collectionKey'> {
  intro: string;
  collectionPath: string;
}
