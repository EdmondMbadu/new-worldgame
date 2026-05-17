import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable, combineLatest, map } from 'rxjs';

export interface DiscussionNotificationRecipient {
  uid?: string;
  email?: string;
  displayName?: string;
  isAI?: boolean;
}

export interface DiscussionMessageNotification {
  id?: string;
  notificationId: string;
  unread: boolean;
  recipientUid: string;
  recipientEmail?: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  messageId: string;
  messageText: string;
  contextId: string;
  contextTitle: string;
  contextType: 'solution' | 'challenge';
  sourceDocPath: string;
  discussionPath: string;
  createdAt?: any;
  createdAtMs: number;
  readAt?: any;
}

@Injectable({
  providedIn: 'root',
})
export class DiscussionNotificationsService {
  private readonly notificationCollectionName = 'messageNotifications';
  private readonly notificationMetaDocName = 'discussionNotifications';

  constructor(private afs: AngularFirestore) {}

  watchUnreadCount(uid: string): Observable<number> {
    const storedCounter$ = this.afs
      .doc<{ unreadCount?: number }>(this.userNotificationMetaPath(uid))
      .valueChanges()
      .pipe(map((meta) => Math.max(0, Number(meta?.unreadCount || 0))));

    const unreadDocsFallback$ = this.afs
      .collection<DiscussionMessageNotification>(
        this.userNotificationsPath(uid),
        (ref) => ref.where('unread', '==', true).limit(50)
      )
      .valueChanges()
      .pipe(map((items) => items.length));

    return combineLatest([storedCounter$, unreadDocsFallback$]).pipe(
      map(([storedCounter, unreadDocsFallback]) =>
        Math.max(storedCounter, unreadDocsFallback)
      )
    );
  }

  watchUnread(uid: string): Observable<DiscussionMessageNotification[]> {
    return this.afs
      .collection<DiscussionMessageNotification>(
        this.userNotificationsPath(uid),
        (ref) =>
          ref.where('unread', '==', true).orderBy('createdAtMs', 'desc').limit(50)
      )
      .valueChanges({ idField: 'id' });
  }

  watchRecent(uid: string, limit = 100): Observable<DiscussionMessageNotification[]> {
    return this.afs
      .collection<DiscussionMessageNotification>(
        this.userNotificationsPath(uid),
        (ref) => ref.orderBy('createdAtMs', 'desc').limit(limit)
      )
      .valueChanges({ idField: 'id' });
  }

  async createForDiscussionMessage(params: {
    recipients: DiscussionNotificationRecipient[];
    senderUid: string;
    senderName: string;
    senderAvatar?: string;
    messageId: string;
    messageText: string;
    contextId: string;
    contextTitle: string;
    contextType: 'solution' | 'challenge';
    sourceDocPath: string;
    discussionPath: string;
    createdAtMs: number;
  }): Promise<number> {
    const recipients = this.uniqueHumanRecipients(
      params.recipients,
      params.senderUid
    );
    if (!recipients.length) return 0;

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const cleanText = this.previewText(params.messageText);
    const created = await Promise.all(
      recipients.map(async (recipient) => {
        const notificationId = this.notificationId(
          params.contextType,
          params.contextId,
          params.messageId,
          recipient.uid!
        );
        const ref = this.afs.firestore.doc(
          `${this.userNotificationsPath(recipient.uid!)}/${notificationId}`
        );
        const metaRef = this.afs.firestore.doc(
          this.userNotificationMetaPath(recipient.uid!)
        );

        return this.afs.firestore.runTransaction(async (transaction) => {
          const existing = await transaction.get(ref);
          if (existing.exists) return 0;

          transaction.set(
            ref,
            {
              notificationId,
              unread: true,
              recipientUid: recipient.uid,
              recipientEmail: this.normalizeEmail(recipient.email),
              senderUid: params.senderUid,
              senderName: params.senderName || 'NewWorld Game teammate',
              senderAvatar: params.senderAvatar || '',
              messageId: params.messageId,
              messageText: cleanText,
              contextId: params.contextId,
              contextTitle: params.contextTitle || 'Team discussion',
              contextType: params.contextType,
              sourceDocPath: params.sourceDocPath,
              discussionPath: params.discussionPath,
              createdAt: now,
              createdAtMs: params.createdAtMs,
              readAt: null,
            } as DiscussionMessageNotification,
            { merge: true }
          );
          transaction.set(
            metaRef,
            {
              unreadCount: firebase.firestore.FieldValue.increment(1),
              updatedAt: now,
            },
            { merge: true }
          );
          return 1;
        });
      })
    );

    return created.reduce<number>((sum, value) => sum + value, 0);
  }

  async markRead(uid: string, notificationId: string): Promise<void> {
    if (!uid || !notificationId) return;
    const ref = this.afs.firestore.doc(
      `${this.userNotificationsPath(uid)}/${notificationId}`
    );
    const metaRef = this.afs.firestore.doc(this.userNotificationMetaPath(uid));

    await this.afs.firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists || !doc.data()?.['unread']) return;
      const meta = await transaction.get(metaRef);
      const currentCount = Number(meta.data()?.['unreadCount'] || 0);

      const now = firebase.firestore.FieldValue.serverTimestamp();
      transaction.set(
        ref,
        {
          unread: false,
          readAt: now,
        },
        { merge: true }
      );
      transaction.set(
        metaRef,
        {
          unreadCount: Math.max(0, currentCount - 1),
          updatedAt: now,
        },
        { merge: true }
      );
    });
  }

  async markDiscussionRead(uid: string, sourceDocPath: string): Promise<void> {
    if (!uid || !sourceDocPath) return;

    const snap = await this.afs.firestore
      .collection(this.userNotificationsPath(uid))
      .where('unread', '==', true)
      .where('sourceDocPath', '==', sourceDocPath)
      .limit(200)
      .get();

    const batch = this.afs.firestore.batch();
    let writes = 0;
    const now = firebase.firestore.FieldValue.serverTimestamp();
    snap.docs.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          unread: false,
          readAt: now,
        },
        { merge: true }
      );
      writes += 1;
    });

    if (writes > 0) {
      await batch.commit();
      await this.decrementUnreadCount(uid, writes);
    }
  }

  async markAllRead(uid: string): Promise<void> {
    if (!uid) return;

    let totalMarked = 0;
    let hasMore = true;

    while (hasMore) {
      const snap = await this.afs.firestore
        .collection(this.userNotificationsPath(uid))
        .where('unread', '==', true)
        .limit(200)
        .get();

      const batch = this.afs.firestore.batch();
      const now = firebase.firestore.FieldValue.serverTimestamp();
      snap.docs.forEach((doc) => {
        batch.set(
          doc.ref,
          {
            unread: false,
            readAt: now,
          },
          { merge: true }
        );
      });

      if (!snap.empty) {
        await batch.commit();
        totalMarked += snap.size;
      }

      hasMore = snap.size === 200;
    }

    if (totalMarked > 0) {
      await this.decrementUnreadCount(uid, totalMarked);
    }
  }

  async removeMissingTargetNotifications(
    uid: string,
    notifications: DiscussionMessageNotification[]
  ): Promise<DiscussionMessageNotification[]> {
    if (!uid || !notifications.length) return notifications;

    const uniqueSourcePaths = Array.from(
      new Set(
        notifications
          .map((notification) => notification.sourceDocPath)
          .filter(Boolean)
      )
    );
    if (!uniqueSourcePaths.length) return notifications;

    const existenceChecks = await Promise.all(
      uniqueSourcePaths.map(async (sourceDocPath) => {
        try {
          const snap = await this.afs.firestore.doc(sourceDocPath).get();
          return [sourceDocPath, snap.exists] as const;
        } catch (error) {
          console.error('Unable to verify notification target', error);
          return [sourceDocPath, true] as const;
        }
      })
    );

    const existsByPath = new Map<string, boolean>(existenceChecks);
    const missingTargetNotifications = notifications.filter(
      (notification) => !existsByPath.get(notification.sourceDocPath)
    );

    if (missingTargetNotifications.length) {
      await this.deleteNotifications(uid, missingTargetNotifications);
    }

    return notifications.filter((notification) =>
      existsByPath.get(notification.sourceDocPath)
    );
  }

  private userNotificationsPath(uid: string): string {
    return `users/${uid}/${this.notificationCollectionName}`;
  }

  private userNotificationMetaPath(uid: string): string {
    return `users/${uid}/notificationMeta/${this.notificationMetaDocName}`;
  }

  private async decrementUnreadCount(uid: string, amount: number): Promise<void> {
    const metaRef = this.afs.firestore.doc(this.userNotificationMetaPath(uid));
    await this.afs.firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(metaRef);
      const current = Number(snap.data()?.['unreadCount'] || 0);
      transaction.set(
        metaRef,
        {
          unreadCount: Math.max(0, current - amount),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  }

  private async deleteNotifications(
    uid: string,
    notifications: DiscussionMessageNotification[]
  ): Promise<void> {
    const validNotifications = notifications.filter(
      (notification) => notification.notificationId || notification.id
    );
    if (!uid || !validNotifications.length) return;

    const batch = this.afs.firestore.batch();
    let unreadDeleted = 0;
    validNotifications.forEach((notification) => {
      const notificationId = notification.notificationId || notification.id;
      batch.delete(
        this.afs.firestore.doc(
          `${this.userNotificationsPath(uid)}/${notificationId}`
        )
      );
      if (notification.unread) {
        unreadDeleted += 1;
      }
    });

    await batch.commit();
    if (unreadDeleted > 0) {
      await this.decrementUnreadCount(uid, unreadDeleted);
    }
  }

  private uniqueHumanRecipients(
    recipients: DiscussionNotificationRecipient[],
    senderUid: string
  ): DiscussionNotificationRecipient[] {
    const seen = new Set<string>();
    const output: DiscussionNotificationRecipient[] = [];

    for (const recipient of recipients || []) {
      const uid = String(recipient.uid || '').trim();
      if (!uid || uid === senderUid || recipient.isAI || seen.has(uid)) continue;
      seen.add(uid);
      output.push({
        ...recipient,
        uid,
        email: this.normalizeEmail(recipient.email),
      });
    }

    return output;
  }

  private notificationId(
    contextType: string,
    contextId: string,
    messageId: string,
    recipientUid: string
  ): string {
    return `${contextType}_${contextId}_${messageId}_${recipientUid}`.replace(
      /[\/\s]+/g,
      '_'
    );
  }

  private previewText(value: string): string {
    const text = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 240 ? `${text.slice(0, 237)}...` : text;
  }

  private normalizeEmail(value: unknown): string {
    return String(value || '')
      .trim()
      .toLowerCase();
  }
}
