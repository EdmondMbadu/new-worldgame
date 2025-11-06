import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ChatMessageType = 'PROMPT' | 'RESPONSE';

export interface ChatSessionRecord {
  id: string;
  avatarSlug: string;
  avatarName: string;
  title: string;
  createdAt?: firebase.firestore.Timestamp | null;
  createdAtMs?: number;
  updatedAt?: firebase.firestore.Timestamp | null;
  updatedAtMs?: number;
  latestPreview?: string;
}

export interface ChatMessageRecord {
  id: string;
  text: string;
  type: ChatMessageType;
  createdAt?: firebase.firestore.Timestamp | null;
  createdAtMs?: number;
}

export interface CreateSessionPayload {
  avatarSlug: string;
  avatarName: string;
  title: string;
  firstMessagePreview: string;
  createdAtMs?: number;
}

export interface PersistMessagePayload {
  text: string;
  type: ChatMessageType;
  createdAtMs?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatSessionService {
  constructor(private afs: AngularFirestore) {}

  listSessionsForAvatar(
    uid: string,
    avatarSlug: string
  ): Observable<ChatSessionRecord[]> {
    return this.afs
      .collection<ChatSessionRecord>(this.sessionCollectionPath(uid), (ref) =>
        ref.where('avatarSlug', '==', avatarSlug)
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        map((sessions) =>
          [...sessions].sort(
            (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)
          )
        )
      );
  }

  observeMessages(
    uid: string,
    sessionId: string
  ): Observable<ChatMessageRecord[]> {
    return this.afs
      .collection<ChatMessageRecord>(
        `${this.sessionCollectionPath(uid)}/${sessionId}/messages`,
        (ref) => ref.orderBy('createdAtMs', 'asc')
      )
      .valueChanges({ idField: 'id' });
  }

  async createSession(
    uid: string,
    payload: CreateSessionPayload
  ): Promise<string> {
    const sessionId = this.afs.createId();
    const createdAtMs = payload.createdAtMs ?? Date.now();

    await this.afs
      .doc(this.sessionDocPath(uid, sessionId))
      .set({
        id: sessionId,
        avatarSlug: payload.avatarSlug,
        avatarName: payload.avatarName,
        title: payload.title,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtMs,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAtMs: createdAtMs,
        latestPreview: this.truncatePreview(payload.firstMessagePreview),
      });

    return sessionId;
  }

  async addMessage(
    uid: string,
    sessionId: string,
    payload: PersistMessagePayload
  ): Promise<void> {
    const messageId = this.afs.createId();
    const createdAtMs = payload.createdAtMs ?? Date.now();

    await this.afs
      .doc(
        `${this.sessionCollectionPath(uid)}/${sessionId}/messages/${messageId}`
      )
      .set({
        id: messageId,
        text: payload.text,
        type: payload.type,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtMs,
      });

    await this.afs.doc(this.sessionDocPath(uid, sessionId)).set(
      {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAtMs: createdAtMs,
        latestPreview: this.truncatePreview(payload.text),
      },
      { merge: true }
    );
  }

  async deleteSession(uid: string, sessionId: string): Promise<void> {
    const messagesSnap = await this.afs
      .collection(
        `${this.sessionCollectionPath(uid)}/${sessionId}/messages`
      )
      .ref.get();

    const batch = this.afs.firestore.batch();

    messagesSnap.forEach((doc) => batch.delete(doc.ref));
    batch.delete(this.afs.firestore.doc(this.sessionDocPath(uid, sessionId)));

    await batch.commit();
  }

  private sessionCollectionPath(uid: string): string {
    return `users/${uid}/chatSessions`;
  }

  private sessionDocPath(uid: string, sessionId: string): string {
    return `${this.sessionCollectionPath(uid)}/${sessionId}`;
  }

  private truncatePreview(text: string): string {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 120) {
      return cleaned;
    }
    return cleaned.slice(0, 117) + '…';
  }
}

