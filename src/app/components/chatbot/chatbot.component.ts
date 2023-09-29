import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent {
  showBot: boolean = false;
  @Input() botHeight: string = 'h-10';

  displayBot() {
    if (this.showBot) {
      this.showBot = false;
      this.botHeight = 'h-10';
    } else {
      this.showBot = true;
      this.botHeight = 'h-96';
    }
  }
}
