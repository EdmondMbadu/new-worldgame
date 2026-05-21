import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable, map } from 'rxjs';
import { User } from '../models/user';

export interface DirectMessageRecord {
  id: string;
  conversationId: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt?: firebase.firestore.Timestamp | null;
  createdAtMs: number;
}

export interface DirectMessageThread {
  id?: string;
  conversationId: string;
  ownerUid: string;
  otherUid: string;
  otherName: string;
  otherAvatar?: string;
  latestMessageText: string;
  latestMessageSenderUid: string;
  unreadCount: number;
  updatedAt?: firebase.firestore.Timestamp | null;
  updatedAtMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class DirectMessageService {
  constructor(private afs: AngularFirestore) {}

  conversationIdFor(uidA: string, uidB: string): string {
    return [uidA, uidB].sort().join('_');
  }

  observeMessages(
    uidA: string,
    uidB: string,
    limitCount = 80
  ): Observable<DirectMessageRecord[]> {
    const conversationId = this.conversationIdFor(uidA, uidB);
    return this.afs
      .collection<DirectMessageRecord>(
        `directMessages/${conversationId}/messages`,
        (ref) => ref.orderBy('createdAtMs', 'asc').limitToLast(limitCount)
      )
      .valueChanges({ idField: 'id' });
  }

  watchThreads(uid: string, limitCount = 50): Observable<DirectMessageThread[]> {
    return this.afs
      .collection<DirectMessageThread>(
        this.threadCollectionPath(uid),
        (ref) => ref.orderBy('updatedAtMs', 'desc').limit(limitCount)
      )
      .valueChanges({ idField: 'id' });
  }

  watchUnreadThreads(uid: string): Observable<DirectMessageThread[]> {
    return this.watchThreads(uid).pipe(
      map((threads) =>
        threads.filter((thread) => Number(thread.unreadCount || 0) > 0)
      )
    );
  }

  watchUnreadCount(uid: string): Observable<number> {
    return this.watchThreads(uid).pipe(
      map((threads) =>
        threads.reduce(
          (total, thread) => total + Math.max(0, Number(thread.unreadCount || 0)),
          0
        )
      )
    );
  }

  async sendMessage(sender: User, recipient: User, text: string): Promise<void> {
    const senderUid = sender?.uid || '';
    const recipientUid = recipient?.uid || '';
    const cleanText = this.cleanMessageText(text);

    if (!senderUid || !recipientUid || senderUid === recipientUid || !cleanText) {
      return;
    }

    const conversationId = this.conversationIdFor(senderUid, recipientUid);
    const messageId = this.afs.createId();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const nowMs = Date.now();
    const senderName = this.displayName(sender);
    const recipientName = this.displayName(recipient);
    const senderAvatar = this.avatarUrl(sender);
    const recipientAvatar = this.avatarUrl(recipient);

    const batch = this.afs.firestore.batch();
    const conversationRef = this.afs.firestore.doc(
      `directMessages/${conversationId}`
    );
    const messageRef = conversationRef.collection('messages').doc(messageId);
    const senderThreadRef = this.afs.firestore.doc(
      `${this.threadCollectionPath(senderUid)}/${conversationId}`
    );
    const recipientThreadRef = this.afs.firestore.doc(
      `${this.threadCollectionPath(recipientUid)}/${conversationId}`
    );

    batch.set(
      conversationRef,
      {
        conversationId,
        participants: [senderUid, recipientUid].sort(),
        participantMap: {
          [senderUid]: true,
          [recipientUid]: true,
        },
        participantNames: {
          [senderUid]: senderName,
          [recipientUid]: recipientName,
        },
        participantAvatars: {
          [senderUid]: senderAvatar,
          [recipientUid]: recipientAvatar,
        },
        latestMessageText: cleanText,
        latestMessageSenderUid: senderUid,
        updatedAt: now,
        updatedAtMs: nowMs,
      },
      { merge: true }
    );

    batch.set(messageRef, {
      id: messageId,
      conversationId,
      senderUid,
      senderName,
      senderAvatar,
      text: cleanText,
      createdAt: now,
      createdAtMs: nowMs,
    });

    batch.set(
      senderThreadRef,
      this.threadPayload({
        conversationId,
        ownerUid: senderUid,
        otherUid: recipientUid,
        otherName: recipientName,
        otherAvatar: recipientAvatar,
        latestMessageText: cleanText,
        latestMessageSenderUid: senderUid,
        unreadCount: 0,
        updatedAt: now,
        updatedAtMs: nowMs,
      }),
      { merge: true }
    );

    batch.set(
      recipientThreadRef,
      {
        ...this.threadPayload({
          conversationId,
          ownerUid: recipientUid,
          otherUid: senderUid,
          otherName: senderName,
          otherAvatar: senderAvatar,
          latestMessageText: cleanText,
          latestMessageSenderUid: senderUid,
          unreadCount: firebase.firestore.FieldValue.increment(1) as any,
          updatedAt: now,
          updatedAtMs: nowMs,
        }),
      },
      { merge: true }
    );

    await batch.commit();
  }

  async markRead(uid: string, otherUid: string): Promise<void> {
    if (!uid || !otherUid || uid === otherUid) return;

    const conversationId = this.conversationIdFor(uid, otherUid);
    await this.afs
      .doc(`${this.threadCollectionPath(uid)}/${conversationId}`)
      .set(
        {
          unreadCount: 0,
          readAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  async markAllRead(uid: string): Promise<void> {
    if (!uid) return;

    const snap = await this.afs.firestore
      .collection(this.threadCollectionPath(uid))
      .where('unreadCount', '>', 0)
      .limit(100)
      .get();

    if (snap.empty) return;

    const batch = this.afs.firestore.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    snap.docs.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          unreadCount: 0,
          readAt: now,
        },
        { merge: true }
      );
    });
    await batch.commit();
  }

  private threadCollectionPath(uid: string): string {
    return `users/${uid}/directMessageThreads`;
  }

  private threadPayload(thread: {
    conversationId: string;
    ownerUid: string;
    otherUid: string;
    otherName: string;
    otherAvatar?: string;
    latestMessageText: string;
    latestMessageSenderUid: string;
    unreadCount: number | firebase.firestore.FieldValue;
    updatedAt: firebase.firestore.Timestamp | firebase.firestore.FieldValue | null;
    updatedAtMs: number;
  }): Record<string, any> {
    return {
      conversationId: thread.conversationId,
      ownerUid: thread.ownerUid,
      otherUid: thread.otherUid,
      otherName: thread.otherName,
      otherAvatar: thread.otherAvatar || '',
      latestMessageText: thread.latestMessageText,
      latestMessageSenderUid: thread.latestMessageSenderUid,
      unreadCount: thread.unreadCount,
      updatedAt: thread.updatedAt,
      updatedAtMs: thread.updatedAtMs,
    };
  }

  private cleanMessageText(text: string): string {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  }

  private displayName(user: User): string {
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return fullName || user?.email || 'NewWorld Game user';
  }

  private avatarUrl(user: User): string {
    return user?.profilePicture?.downloadURL || user?.profilePicPath || '';
  }
}
