import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of, switchMap, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import {
  DiscussionMessageNotification,
  DiscussionNotificationsService,
} from 'src/app/services/discussion-notifications.service';

@Component({
  selector: 'app-message-notifications',
  templateUrl: './message-notifications.component.html',
  styleUrls: ['./message-notifications.component.css'],
})
export class MessageNotificationsComponent implements OnInit, OnDestroy {
  notifications: DiscussionMessageNotification[] = [];
  loading = true;
  markingAllRead = false;
  currentUid = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private discussionNotifications: DiscussionNotificationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.user$
      .pipe(
        switchMap((user) => {
          this.currentUid = user?.uid || '';
          return user?.uid
            ? this.discussionNotifications.watchRecent(user.uid)
            : of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((notifications) => {
        this.notifications = notifications;
        this.loading = false;
      });
  }

  get unreadCount(): number {
    return this.notifications.filter((notification) => notification.unread)
      .length;
  }

  async openNotification(
    notification: DiscussionMessageNotification
  ): Promise<void> {
    const uid = this.currentUid || this.auth.currentUser?.uid || '';
    if (uid && notification.notificationId) {
      await this.discussionNotifications.markRead(
        uid,
        notification.notificationId
      );
    }

    await this.router.navigateByUrl(
      `${notification.discussionPath}?messageId=${encodeURIComponent(
        notification.messageId
      )}`
    );
  }

  async markAllRead(): Promise<void> {
    const uid = this.currentUid || this.auth.currentUser?.uid || '';
    if (!uid || this.markingAllRead) return;

    this.markingAllRead = true;
    try {
      await this.discussionNotifications.markAllRead(uid);
    } finally {
      this.markingAllRead = false;
    }
  }

  notificationTime(notification: DiscussionMessageNotification): string {
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

  senderInitials(notification: DiscussionMessageNotification): string {
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
    notification: DiscussionMessageNotification
  ): string {
    return notification.notificationId || notification.id || String(index);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
