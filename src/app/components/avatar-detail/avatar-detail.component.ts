// src/app/pages/avatar-detail/avatar-detail.component.ts
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AvatarRegistryService } from '../../services/avatar-registry.service';
import { AuthService } from '../../services/auth.service';
import { ChatBotService } from '../../services/chat-bot.service';
import { BoxService } from '../../services/box.service';
import { Avatar } from 'src/app/models/user';
import { CommonModule } from '@angular/common'; // ⬅️ add
import { FormsModule } from '@angular/forms';

interface DisplayMessage {
  text: string;
  type: 'PROMPT' | 'RESPONSE';
  loading?: boolean;
}

@Component({
  selector: 'app-avatar-detail',

  templateUrl: './avatar-detail.component.html',
})
export class AvatarDetailComponent implements OnInit {
  @ViewChild('bottomAnchor') private bottomAnchor!: ElementRef<HTMLDivElement>;
  @ViewChild('chatWindow') chatWindow!: ElementRef;
  @ViewChild('promptInput') promptInput!: ElementRef<HTMLInputElement>;

  avatar!: Avatar;
  allAvatars: Avatar[] = [];
  status = '';
  errorMsg = '';
  singleCopyStates: string[] = [];
  responses: DisplayMessage[] = [{ text: '', type: 'RESPONSE' }];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private registry: AvatarRegistryService,
    private afs: AngularFirestore,
    private cdRef: ChangeDetectorRef,
    public chat: ChatBotService,
    public auth: AuthService,
    private box: BoxService
  ) {}

  get isAdmin(): boolean {
    return !!this.auth?.currentUser?.admin;
  }

  ngOnInit(): void {
    this.allAvatars = this.registry.getAll();

    const nav = this.router.getCurrentNavigation();
    const viaState = nav?.extras?.state?.['avatar'] as Avatar | undefined;
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.avatar = viaState ?? this.registry.getBySlug(slug)!;

    if (!this.avatar) {
      this.router.navigate(['/other-ais']);
      return;
    }
    if (this.avatar.requiresAdmin && !this.isAdmin) {
      this.status = 'Admin-only avatar.';
    }

    // make sure viewport starts at top
    setTimeout(() => window.scrollTo({ top: 0 }), 0);
  }

  backToPool() {
    this.router.navigate(['/other-ais']);
  }

  switchAvatar(slug: string) {
    const a = this.allAvatars.find((v) => v.slug === slug);
    if (!a) return;
    this.router.navigate(['/avatar', a.slug], { state: { avatar: a } });
  }

  scrollToChat() {
    this.chatWindow?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    setTimeout(() => this.promptInput?.nativeElement.focus(), 250);
  }

  // keyboard: "/" focuses the prompt
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (e.key === '/') {
      e.preventDefault();
      this.promptInput?.nativeElement.focus();
    }
  }

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
      .catch(() => {});
  }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // QUICK PROMPTS
  quickPromptFill(str: string) {
    if (!this.promptInput) return;
    this.promptInput.nativeElement.value = str;
    this.promptInput.nativeElement.focus();
  }

  // CHAT FLOW (same logic as your existing page — scoped to avatar.collectionPath)
  async submitPrompt(
    event: Event,
    promptInputEl: HTMLInputElement
  ): Promise<void> {
    event.preventDefault();
    const val = promptInputEl.value.trim();
    if (!val) return;

    // user prompt
    promptInputEl.value = '';
    this.responses.push({ text: val, type: 'PROMPT' });
    this.singleCopyStates.push('Copy');
    this.scrollToBottom();

    // AI placeholder with spinner
    const placeholder: DisplayMessage = {
      text: '',
      type: 'RESPONSE',
      loading: true,
    };
    const placeholderIndex = this.responses.push(placeholder) - 1;
    this.scrollToBottom('auto');
    this.status = 'thinking…';

    // write to Firestore for this avatar
    const id = this.afs.createId();
    const discussionRef = this.afs.doc(
      `${this.avatar.collectionPath}${id}`
    ) as AngularFirestoreDocument<any>;

    await discussionRef.set({ prompt: val });

    const destroy = discussionRef.valueChanges().subscribe({
      next: (conversation) => {
        if (!conversation || !conversation.status) return;
        const state = conversation.status.state;

        if (state === 'PROCESSING') this.status = 'thinking...';

        if (state === 'COMPLETED') {
          this.status = '';
          placeholder.loading = false;
          // remove spinner bubble
          this.responses.splice(placeholderIndex, 1);
          // create one message and type into it
          const msg: DisplayMessage = { text: '', type: 'RESPONSE' };
          this.responses.push(msg);
          this.typewriterEffect(conversation.response, msg, () =>
            destroy.unsubscribe()
          );
        }

        if (state === 'ERRORED') {
          this.status = 'Oh no! Something went wrong. Please try again.';
          placeholder.loading = false;
          this.responses.splice(placeholderIndex, 1);
          destroy.unsubscribe();
        }
      },
      error: (err) => {
        this.errorMsg = err.message;
        destroy.unsubscribe();
      },
    });
  }

  private typewriterEffect(
    fullText: string,
    msg: DisplayMessage,
    done: () => void
  ): void {
    let i = 0;
    const id = setInterval(() => {
      msg.text += fullText[i++] ?? '';
      this.cdRef.detectChanges();
      this.scrollToBottom('auto');
      if (i >= fullText.length) {
        clearInterval(id);
        this.scrollToBottom();
        done();
      }
    }, 1);
  }

  // SDG pills (simple labels)
  sdgLabel(n: number) {
    return `SDG ${n}`;
  }
}
