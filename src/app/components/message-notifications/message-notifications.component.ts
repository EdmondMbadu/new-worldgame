import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, combineLatest, map, of, switchMap, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import {
  DiscussionMessageNotification,
  DiscussionNotificationsService,
} from 'src/app/services/discussion-notifications.service';
import {
  DirectMessageService,
  DirectMessageThread,
} from 'src/app/services/direct-message.service';

type InboxNotification =
  | {
      kind: 'discussion';
      id: string;
      unread: boolean;
      senderName: string;
      senderAvatar?: string;
      messageText: string;
      contextTitle: string;
      contextLabel: string;
      createdAt?: any;
      createdAtMs: number;
      discussion: DiscussionMessageNotification;
    }
  | {
      kind: 'direct';
      id: string;
      unread: boolean;
      senderName: string;
      senderAvatar?: string;
      messageText: string;
      contextTitle: string;
      contextLabel: string;
      createdAt?: any;
      createdAtMs: number;
      thread: DirectMessageThread;
    };

@Component({
  selector: 'app-message-notifications',
  templateUrl: './message-notifications.component.html',
  styleUrls: ['./message-notifications.component.css'],
})
export class MessageNotificationsComponent implements OnInit, OnDestroy {
  notifications: InboxNotification[] = [];
  loading = true;
  markingAllRead = false;
  currentUid = '';
  private notificationLoadRun = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private discussionNotifications: DiscussionNotificationsService,
    private directMessages: DirectMessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.user$
      .pipe(
        switchMap((user) => {
          this.currentUid = user?.uid || '';
          return user?.uid
            ? combineLatest([
                this.discussionNotifications.watchUnread(user.uid),
                this.directMessages.watchUnreadThreads(user.uid),
              ]).pipe(
                map(([discussion, direct]) => ({
                  discussion,
                  direct,
                }))
              )
            : of({ discussion: [], direct: [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(async ({ discussion, direct }) => {
        const runId = ++this.notificationLoadRun;
        const visibleNotifications = this.currentUid
          ? await this.discussionNotifications.removeMissingTargetNotifications(
              this.currentUid,
              discussion
            )
          : [];
        if (runId !== this.notificationLoadRun) return;

        this.notifications = [
          ...direct.map((thread) => this.directInboxItem(thread)),
          ...visibleNotifications.map((notification) =>
            this.discussionInboxItem(notification)
          ),
        ].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        this.loading = false;
      });
  }

  get unreadCount(): number {
    return this.notifications.length;
  }

  async openNotification(
    notification: InboxNotification
  ): Promise<void> {
    const uid = this.currentUid || this.auth.currentUser?.uid || '';

    if (notification.kind === 'direct') {
      if (uid) {
        await this.directMessages.markRead(uid, notification.thread.otherUid);
      }
      await this.router.navigate(['/user-profile', notification.thread.otherUid], {
        queryParams: { dm: 'open' },
      });
      return;
    }

    const discussion = notification.discussion;
    if (uid) {
      const validNotifications =
        await this.discussionNotifications.removeMissingTargetNotifications(
          uid,
          [discussion]
        );
      if (!validNotifications.length) return;
    }

    if (uid && discussion.notificationId) {
      await this.discussionNotifications.markRead(
        uid,
        discussion.notificationId
      );
    }

    await this.router.navigateByUrl(
      `${discussion.discussionPath}?messageId=${encodeURIComponent(
        discussion.messageId
      )}`
    );
  }

  async markAllRead(): Promise<void> {
    const uid = this.currentUid || this.auth.currentUser?.uid || '';
    if (!uid || this.markingAllRead) return;

    this.markingAllRead = true;
    try {
      await Promise.all([
        this.discussionNotifications.markAllRead(uid),
        this.directMessages.markAllRead(uid),
      ]);
    } finally {
      this.markingAllRead = false;
    }
  }

  notificationTime(notification: InboxNotification): string {
    const date = notification.createdAt?.toDate?.()
      ? notification.createdAt.toDate()
      : new Date(notification.createdAtMs || Date.now());

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  senderInitials(notification: InboxNotification): string {
    const words = String(notification.senderName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }

  trackNotification(
    index: number,
    notification: InboxNotification
  ): string {
    return notification.id || String(index);
  }

  private discussionInboxItem(
    notification: DiscussionMessageNotification
  ): InboxNotification {
    return {
      kind: 'discussion',
      id: notification.notificationId || notification.id || '',
      unread: notification.unread,
      senderName: notification.senderName,
      senderAvatar: notification.senderAvatar,
      messageText: notification.messageText,
      contextTitle: notification.contextTitle,
      contextLabel:
        notification.contextType === 'challenge'
          ? 'Challenge discussion'
          : 'Solution discussion',
      createdAt: notification.createdAt,
      createdAtMs: notification.createdAtMs,
      discussion: notification,
    };
  }

  private directInboxItem(thread: DirectMessageThread): InboxNotification {
    return {
      kind: 'direct',
      id: `direct_${thread.conversationId}`,
      unread: Number(thread.unreadCount || 0) > 0,
      senderName: thread.otherName || 'NewWorld Game user',
      senderAvatar: thread.otherAvatar,
      messageText: thread.latestMessageText || '',
      contextTitle: 'Direct message',
      contextLabel: 'Direct message',
      createdAt: thread.updatedAt,
      createdAtMs: thread.updatedAtMs,
      thread,
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
