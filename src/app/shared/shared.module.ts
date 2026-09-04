import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { FooterComponent } from '../components/footer/footer.component';
import { ToastComponent } from '../components/toast/toast.component';
import { MaterialModule } from './material.module';
import { ChatbotModule } from './chatbot.module';
import { NavbarModule } from './navbar.module';

@NgModule({
  declarations: [FooterComponent, ToastComponent],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TranslateModule,
    NavbarModule,
    ChatbotModule,
  ],
  exports: [
    NavbarModule,
    FooterComponent,
    ChatbotModule,
    ToastComponent,
    MaterialModule,
    TranslateModule,
  ],
})
export class SharedModule {}
