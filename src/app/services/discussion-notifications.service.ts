import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable } from 'rxjs';

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

  constructor(private afs: AngularFirestore) {}

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

    const batch = this.afs.firestore.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const cleanText = this.previewText(params.messageText);

    recipients.forEach((recipient) => {
      const notificationId = this.notificationId(
        params.contextType,
        params.contextId,
        params.messageId,
        recipient.uid!
      );
      const ref = this.afs.firestore.doc(
        `${this.userNotificationsPath(recipient.uid!)}/${notificationId}`
      );

      batch.set(
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
    });

    await batch.commit();
    return recipients.length;
  }

  async markRead(uid: string, notificationId: string): Promise<void> {
    if (!uid || !notificationId) return;
    await this.afs
      .doc(`${this.userNotificationsPath(uid)}/${notificationId}`)
      .set(
        {
          unread: false,
          readAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
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
    snap.docs.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          unread: false,
          readAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      writes += 1;
    });

    if (writes > 0) {
      await batch.commit();
    }
  }

  async markAllRead(uid: string): Promise<void> {
    if (!uid) return;

    const snap = await this.afs.firestore
      .collection(this.userNotificationsPath(uid))
      .where('unread', '==', true)
      .limit(200)
      .get();

    const batch = this.afs.firestore.batch();
    snap.docs.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          unread: false,
          readAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    if (!snap.empty) {
      await batch.commit();
    }
  }

  private userNotificationsPath(uid: string): string {
    return `users/${uid}/${this.notificationCollectionName}`;
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
