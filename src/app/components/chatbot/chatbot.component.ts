import { Component, Input, OnInit, Pipe } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import * as marked from 'marked';

import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';

interface DisplayMessage {
  text: string;
  link?: { text?: string; url?: string };
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
  botWidth: string = '96';
  temp = '';
  constructor(
    private afs: AngularFirestore,
    private auth: AuthService,
    private cdRef: ChangeDetectorRef
  ) {
    this.user = this.auth.currentUser;
    // this.deleteAllDocuments();
  }
  introMessage: DisplayMessage = {
    text: `I'm Bucky, a chatbot that will be assisting you on your journey tackling world problems. To learn how to interact with me or other LLMs efficiently see `,
    link: { text: 'here.', url: '/blogs/nwg-ai' },
    type: 'RESPONSE',
  };

  responses: DisplayMessage[] = [];
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
    // this.responses = [
    //   {
    //     text: `I'm Bucky, a chatbot that will be assisting you on your journey tackling world problems. `,
    //     link: { text: 'here', url: '/blogs/nwg-ai' },
    //     type: 'RESPONSE',
    //   },
    // ];

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
              console.log(
                ' the response date and format',
                conversation['response']
              );
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

  toggleChatSize() {
    if (this.botWidth === '96') {
      this.botWidth = 'max';
    } else {
      this.botWidth = '96';
    }
  }

  formatText(value: string): string {
    if (!value) {
      return '';
    }

    // Replace single # headers with <h1> headers
    let formattedText = value.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Replace double ## headers with <h2> headers
    formattedText = formattedText.replace(/^## (.*?)$/gm, '<h2>$1</h2>');

    // Replace triple ### headers with <h3> headers
    formattedText = formattedText.replace(/^### (.*?)$/gm, '<h3>$1</h3>');

    // Replace **bold** with <strong>bold</strong>
    formattedText = formattedText.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Replace *italic* with <em>italic</em>
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Ensure bullet points start on a new line
    formattedText = formattedText.replace(/ \* /g, '\n* ');

    // Replace * bullet points with <li> items inside <ul>
    formattedText = formattedText.replace(/^\* (.*?)(?=\n|$)/gm, '<li>$1</li>');
    formattedText = formattedText.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');

    // Replace single-line breaks with HTML line breaks
    formattedText = formattedText.replace(/\n/g, '<br>');

    // Replace [link text](URL) with <a href="URL">link text</a>
    formattedText = formattedText.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a class="text-blue-500 underline" target="_blank" href="$2">$1</a>'
    );

    // Replace text (URL) with <a href="URL">text</a>
    formattedText = formattedText.replace(
      /(\b[\w\s]+\b)\s*\((https?:\/\/[^\s]+)\)/g,
      '<a class="text-blue-500 underline" target="_blank" href="$2">$1</a>'
    );

    return formattedText;
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
