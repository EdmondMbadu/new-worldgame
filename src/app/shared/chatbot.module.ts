import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ChatbotComponent } from '../components/chatbot/chatbot.component';

@NgModule({
  declarations: [ChatbotComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [ChatbotComponent],
})
export class ChatbotModule {}
