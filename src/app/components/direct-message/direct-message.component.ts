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
  DirectMessageReply,
  DirectMessageService,
} from 'src/app/services/direct-message.service';
import { AuthService } from 'src/app/services/auth.service';

interface ReactionOption {
  emoji: string;
  label: string;
}

interface ReactionEntry extends ReactionOption {
  count: number;
  reacted: boolean;
}

const MAIN_REACTION_OPTIONS: ReactionOption[] = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '🎉', label: 'Excitement' },
  { emoji: '😮', label: 'Surprised' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🙌', label: 'Celebrate' },
  { emoji: '👀', label: 'Watching' },
  { emoji: '💡', label: 'Great idea' },
  { emoji: '🚀', label: 'Launch it' },
];

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
  expanded = false;
  replyTarget: DirectMessageRecord | null = null;
  readonly reactionOptions = MAIN_REACTION_OPTIONS;
  activeReactionPickerId = '';

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

  get currentUserName(): string {
    const user = this.currentUser || this.auth.currentUser;
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return fullName || user?.email || 'You';
  }

  get currentUserAvatar(): string {
    const user = this.currentUser || this.auth.currentUser;
    return user?.profilePicture?.downloadURL || user?.profilePicPath || '';
  }

  get currentUserInitials(): string {
    return this.initialsFromLabel(this.currentUserName);
  }

  close(): void {
    this.open = false;
    this.replyTarget = null;
    this.activeReactionPickerId = '';
    this.openChange.emit(false);
  }

  openChat(): void {
    if (!this.canMessage) return;
    this.open = true;
    this.openChange.emit(true);
    this.connectIfReady();
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
    this.scrollToBottomSoon();
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
        text,
        this.buildReplyPayload()
      );
      this.replyTarget = null;
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

  messageAvatar(message: DirectMessageRecord): string {
    if (message.senderAvatar) return message.senderAvatar;
    return this.isMine(message) ? this.currentUserAvatar : this.recipientAvatar;
  }

  messageInitials(message: DirectMessageRecord): string {
    return this.isMine(message)
      ? this.currentUserInitials
      : this.initialsFromLabel(message.senderName || this.recipientName);
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

  trackByReactionOption(_index: number, option: ReactionOption): string {
    return option.emoji;
  }

  trackByReactionEntry(_index: number, reaction: ReactionEntry): string {
    return reaction.emoji;
  }

  getReactionEntries(message?: DirectMessageRecord | null): ReactionEntry[] {
    const reactions = this.normalizeReactions(message?.reactions);
    const mainOrder = this.reactionOptions.map((option) => option.emoji);
    const optionByEmoji = new Map(
      this.reactionOptions.map((option) => [option.emoji, option])
    );
    const uid = this.currentUser?.uid || this.auth.currentUser?.uid || '';

    return Object.entries(reactions)
      .filter(([, userIds]) => userIds.length > 0)
      .sort(([emojiA], [emojiB]) => {
        const aIndex = mainOrder.indexOf(emojiA);
        const bIndex = mainOrder.indexOf(emojiB);
        if (aIndex === -1 && bIndex === -1) return emojiA.localeCompare(emojiB);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map(([emoji, userIds]) => ({
        ...(optionByEmoji.get(emoji) || { emoji, label: 'Reaction' }),
        count: userIds.length,
        reacted: !!uid && userIds.includes(uid),
      }));
  }

  hasUserReacted(message: DirectMessageRecord, emoji: string): boolean {
    const uid = this.currentUser?.uid || this.auth.currentUser?.uid || '';
    return !!uid && (message.reactions?.[emoji] || []).includes(uid);
  }

  toggleReactionPicker(message: DirectMessageRecord): void {
    this.activeReactionPickerId =
      this.activeReactionPickerId === message.id ? '' : message.id;
  }

  async selectReaction(
    message: DirectMessageRecord,
    option: ReactionOption
  ): Promise<void> {
    this.activeReactionPickerId = '';
    await this.toggleReaction(message, option.emoji);
  }

  async toggleReaction(
    message: DirectMessageRecord,
    emoji: string
  ): Promise<void> {
    const currentUid = this.currentUser?.uid || this.auth.currentUser?.uid || '';
    const recipientUid = this.recipient?.uid || '';
    if (!currentUid || !recipientUid || !message.id || !emoji) return;

    try {
      await this.directMessages.toggleReaction(
        currentUid,
        recipientUid,
        message.id,
        emoji
      );
    } catch (error: any) {
      this.errorMessage =
        error?.message || 'Reaction could not be updated right now.';
    }
  }

  startReply(message: DirectMessageRecord): void {
    this.replyTarget = message;
    this.activeReactionPickerId = '';
  }

  cancelReply(): void {
    this.replyTarget = null;
  }

  replyPreviewText(
    reply: DirectMessageReply | DirectMessageRecord | null | undefined
  ): string {
    const text = String(reply?.text || '').trim();
    if (!text) return 'Message';
    return text.length > 140 ? `${text.slice(0, 140)}...` : text;
  }

  scrollToMessage(messageId?: string): void {
    if (!messageId) return;
    document
      .getElementById(`dm-message-${messageId}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
    this.replyTarget = null;
    this.activeReactionPickerId = '';
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

  private buildReplyPayload(): DirectMessageReply | null {
    if (!this.replyTarget?.id) return null;

    return {
      messageId: this.replyTarget.id,
      senderUid: this.replyTarget.senderUid,
      senderName: this.replyTarget.senderName || 'NewWorld Game user',
      text: this.replyTarget.text || '',
      createdAtMs: this.replyTarget.createdAtMs,
    };
  }

  private normalizeReactions(
    reactions: unknown
  ): Record<string, string[]> {
    if (!reactions || typeof reactions !== 'object') return {};

    return Object.entries(reactions as Record<string, unknown>).reduce(
      (normalized, [emoji, userIds]) => {
        if (!emoji || !Array.isArray(userIds)) return normalized;

        const cleanUserIds = Array.from(
          new Set(
            userIds
              .map((userId) => String(userId || '').trim())
              .filter(Boolean)
          )
        );

        if (cleanUserIds.length) {
          normalized[emoji] = cleanUserIds;
        }

        return normalized;
      },
      {} as Record<string, string[]>
    );
  }

  private initialsFromLabel(label: string): string {
    const words = String(label || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.messagesSub?.unsubscribe();
  }
}
