import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NavbarComponent } from '../components/navbar/navbar.component';
import { FooterComponent } from '../components/footer/footer.component';
import { ChatbotComponent } from '../components/chatbot/chatbot.component';
import { ToastComponent } from '../components/toast/toast.component';
import { MaterialModule } from './material.module';

@NgModule({
  declarations: [NavbarComponent, FooterComponent, ChatbotComponent, ToastComponent],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TranslateModule,
  ],
  exports: [
    NavbarComponent,
    FooterComponent,
    ChatbotComponent,
    ToastComponent,
    MaterialModule,
    TranslateModule,
  ],
})
export class SharedModule {}
