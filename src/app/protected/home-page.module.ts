import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { HomeComponent } from '../components/home/home.component';
import { ChatbotModule } from '../shared/chatbot.module';
import { NavbarModule } from '../shared/navbar.module';
import { ChallengeCardModule } from './challenge-card.module';
import { DropZoneModule } from './drop-zone.module';

const routes: Routes = [{ path: '', component: HomeComponent }];

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NavbarModule,
    ChatbotModule,
    ChallengeCardModule,
    DropZoneModule,
    RouterModule.forChild(routes),
  ],
})
export class HomePageModule {}
