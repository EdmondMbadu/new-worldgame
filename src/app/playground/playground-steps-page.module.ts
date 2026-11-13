import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { TranslateModule } from '@ngx-translate/core';
import { PlaygroundStepComponent } from '../components/playground-step/playground-step.component';
import { PlaygroundStepsComponent } from '../components/playground-steps/playground-steps.component';
import { AuthGuard } from '../services/auth.guard';
import { ChatbotModule } from '../shared/chatbot.module';
import { NavbarModule } from '../shared/navbar.module';

@NgModule({
  declarations: [PlaygroundStepsComponent, PlaygroundStepComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CKEditorModule,
    TranslateModule,
    ChatbotModule,
    NavbarModule,
    RouterModule.forChild([{
      path: '',
      component: PlaygroundStepsComponent,
      canActivate: [AuthGuard],
      data: { requireParticipant: true },
    }]),
  ],
})
export class PlaygroundStepsPageModule {}
