import { ChangeDetectorRef, Injectable } from '@angular/core';
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

  typewriterEffect(
    text: string,
    callback: () => void,
    cdRef: ChangeDetectorRef,
    typingSpeed: number = 100
  ): string {
    let displayedText: string = '';
    let index = 0;

    const interval = setInterval(() => {
      displayedText += text[index];
      index++;

      if (index === text.length) {
        clearInterval(interval);
        callback();
      }

      cdRef.detectChanges();
    }, typingSpeed); // Adjust typing speed here

    return displayedText;
  }
}
