import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { User } from 'src/app/models/user';
import {
  DirectMessageRecord,
  DirectMessageService,
} from 'src/app/services/direct-message.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-direct-message',
  templateUrl: './direct-message.component.html',
  styleUrls: ['./direct-message.component.css'],
})
export class DirectMessageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() recipient: User | null = null;
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @ViewChild('messageList') messageList?: ElementRef<HTMLDivElement>;

  currentUser: User | null = null;
  messages: DirectMessageRecord[] = [];
  draft = '';
  loading = false;
  sending = false;
  errorMessage = '';

  private authSub?: Subscription;
  private messagesSub?: Subscription;
  private activeConversationKey = '';
  private lastRenderedMessageId = '';

  constructor(
    public auth: AuthService,
    private directMessages: DirectMessageService
  ) {}

  ngOnInit(): void {
    this.authSub = this.auth.user$.subscribe((user) => {
      this.currentUser = user;
      this.connectIfReady();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['recipient']) {
      this.connectIfReady();
    }
  }

  get canMessage(): boolean {
    const currentUid = this.currentUser?.uid || this.auth.currentUser?.uid || '';
    return !!currentUid && !!this.recipient?.uid && currentUid !== this.recipient.uid;
  }

  get recipientName(): string {
    const fullName = `${this.recipient?.firstName || ''} ${
      this.recipient?.lastName || ''
    }`.trim();
    return fullName || this.recipient?.email || 'NewWorld Game user';
  }

  get recipientInitials(): string {
    const label = this.recipientName.trim();
    const words = label.split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }

  get recipientAvatar(): string {
    return (
      this.recipient?.profilePicture?.downloadURL ||
      this.recipient?.profilePicPath ||
      ''
    );
  }

  close(): void {
    this.open = false;
    this.openChange.emit(false);
  }

  async send(): Promise<void> {
    if (!this.canMessage || this.sending) return;

    const text = this.draft.trim();
    if (!text) return;

    this.sending = true;
    this.errorMessage = '';
    this.draft = '';

    try {
      await this.directMessages.sendMessage(
        this.currentUser || this.auth.currentUser,
        this.recipient!,
        text
      );
      this.scrollToBottomSoon();
    } catch (error: any) {
      this.errorMessage =
        error?.message || 'Message could not be sent. Please try again.';
      this.draft = text;
    } finally {
      this.sending = false;
    }
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void this.send();
  }

  isMine(message: DirectMessageRecord): boolean {
    const currentUid = this.currentUser?.uid || this.auth.currentUser?.uid || '';
    return message.senderUid === currentUid;
  }

  messageTime(message: DirectMessageRecord): string {
    const date = message.createdAt?.toDate?.()
      ? message.createdAt.toDate()
      : new Date(message.createdAtMs || Date.now());

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  trackMessage(index: number, message: DirectMessageRecord): string {
    return message.id || String(index);
  }

  private connectIfReady(): void {
    const currentUid = this.currentUser?.uid || this.auth.currentUser?.uid || '';
    const recipientUid = this.recipient?.uid || '';

    if (!this.open || !currentUid || !recipientUid || currentUid === recipientUid) {
      return;
    }

    const nextKey = this.directMessages.conversationIdFor(currentUid, recipientUid);
    if (nextKey === this.activeConversationKey) return;

    this.activeConversationKey = nextKey;
    this.loading = true;
    this.errorMessage = '';
    this.messagesSub?.unsubscribe();
    this.messagesSub = this.directMessages
      .observeMessages(currentUid, recipientUid)
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.loading = false;
          const latest = messages[messages.length - 1];
          if (latest && !this.isMine(latest)) {
            void this.directMessages.markRead(currentUid, recipientUid);
          }
          this.scrollIfNewMessage();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            error?.message || 'Messages could not be loaded right now.';
        },
      });
  }

  private scrollIfNewMessage(): void {
    const last = this.messages[this.messages.length - 1];
    if (!last || last.id === this.lastRenderedMessageId) return;
    this.lastRenderedMessageId = last.id;
    this.scrollToBottomSoon();
  }

  private scrollToBottomSoon(): void {
    setTimeout(() => {
      const el = this.messageList?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.messagesSub?.unsubscribe();
  }
}
