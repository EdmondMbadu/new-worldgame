import { Component, Input, OnInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';

import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';

interface DisplayMessage {
  text: string;
  type: 'PROMPT' | 'RESPONSE';
}
@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent implements OnInit {
  showBot: boolean = false;
  profilePicturePath: string = '';
  user: User = {};
  @Input() botHeight: string = 'h-10';
  collectionPath = `users/${this.auth.currentUser.uid}/discussions`;
  status = '';
  errorMsg = '';
  prompt = '';
  temp = '';
  constructor(
    private afs: AngularFirestore,
    private auth: AuthService,
    private cdRef: ChangeDetectorRef
  ) {
    this.user = this.auth.currentUser;
    // this.deleteAllDocuments();
  }
  responses: DisplayMessage[] = [
    {
      text: "I'm a Bucky, a chatbot that will be assisting you on your journey tackling world problems.",
      type: 'RESPONSE',
    },
  ];
  ngOnInit(): void {
    if (this.user?.profilePicture && this.user.profilePicture.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL!;
    }
  }
  scrollToBottom(): void {
    const chatbox = document.getElementById('chatbox');
    if (chatbox) {
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  }

  toggleBot() {
    if (this.showBot) {
      this.showBot = false;
      this.botHeight = 'h-10';
    } else {
      this.showBot = true;
      this.botHeight = 'h-96';
    }
  }
  // submitPrompt() {
  //   this.responses.push({
  //     text: this.prompt,
  //     type: 'PROMPT',
  //   });
  //   this.prompt = '';
  // }

  endChat() {
    this.responses = [
      {
        text: "I'm a Bucky, a chatbot that will be assisting you on your journey tackling world problems.",
        type: 'RESPONSE',
      },
    ];

    this.deleteAllDocuments();
    this.toggleBot();
  }

  async submitPrompt() {
    // event.preventDefault();
    // I create this variable to clear the screen right after the question is asked
    let currentPrompt = this.prompt;
    if (!this.prompt) return;

    this.responses.push({
      text: currentPrompt,
      type: 'PROMPT',
    });
    this.prompt = '';

    this.status = 'sure, one sec';
    let id = this.afs.createId();

    const discussionRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${this.auth.currentUser.uid}/discussions/${id}`
    );
    await discussionRef.set({ prompt: currentPrompt });

    const destroyFn = discussionRef.valueChanges().subscribe({
      next: (conversation) => {
        if (conversation && conversation['status']) {
          this.status = 'thinking...';
          const state = conversation['status']['state'];

          switch (state) {
            case 'COMPLETED':
              this.status = '';
              currentPrompt = '';
              // this.prompt = '';
              this.responses.push({
                text: conversation['response'],
                type: 'RESPONSE',
              });
              this.cdRef.detectChanges(); // Detect changes to update the view

              // Use setTimeout to allow time for the DOM to update
              setTimeout(() => this.scrollToBottom(), 0);

              destroyFn.unsubscribe();
              break;
            case 'PROCESSING':
              currentPrompt = '';
              // this.prompt = '';
              this.status = 'preparing your answer...';
              break;
            case 'ERRORED':
              currentPrompt = '';
              // this.prompt = '';
              this.status = 'Oh no! Something went wrong. Please try again.';
              destroyFn.unsubscribe();
              break;
          }
        }
      },
      error: (err) => {
        console.log(err);
        this.errorMsg = err.message;
        destroyFn.unsubscribe();
      },
    });
    this.scrollToBottom();
  }

  async deleteAllDocuments(): Promise<void> {
    const batch = this.afs.firestore.batch();

    const querySnapshot = await this.afs
      .collection(this.collectionPath)
      .ref.get();
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }
}
