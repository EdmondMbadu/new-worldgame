import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ChatBotService {
  constructor(private auth: AuthService, private afs: AngularFirestore) {}

  submitChatQuestion(prompt: string) {
    let discussionId: string = this.afs.createId().toString();
    const data = {
      chatId: discussionId,
      prompt: prompt,
    };

    const chatReft = this.afs.doc(
      `users/${this.auth.currentUser.uid}/discussions/${discussionId}`
    );

    return chatReft.set(data, { merge: true });
  }
}
