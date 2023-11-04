import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxPageScrollCoreModule } from 'ngx-page-scroll-core';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SignupComponent } from './components/signup/signup.component';
import { HomeComponent } from './components/home/home.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PostComponent } from './components/solution/solution.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { CreatePlaygroundComponent } from './components/create-playground/create-playground.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { PlaygroundStepsComponent } from './components/playground-steps/playground-steps.component';
import { PlaygroundStepComponent } from './components/playground-step/playground-step.component';
import { ProblemListComponent } from './components/problem-list/problem-list.component';
import { ProblemListViewComponent } from './components/problem-list-view/problem-list-view.component';
import { ProblemListFeedbackComponent } from './components/problem-list-feedback/problem-list-feedback.component';
import { ProblemFeedbackComponent } from './components/problem-feedback/problem-feedback.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SliderComponent } from './components/slider/slider.component';
import { environment } from 'environments/environments';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { CommonModule } from '@angular/common';
import { TextPopupComponent } from './components/text-popup/text-popup.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { DropZoneDirective } from './components/drop-zone.directive';
import { SolutionViewComponent } from './components/solution-view/solution-view.component';

@NgModule({
  declarations: [
    AppComponent,
    LandingPageComponent,
    LoginComponent,
    NavbarComponent,
    SignupComponent,
    HomeComponent,
    ProfileComponent,
    PostComponent,
    ChatbotComponent,
    CreatePlaygroundComponent,
    PlaygroundStepsComponent,
    PlaygroundStepComponent,
    ProblemListComponent,
    ProblemListViewComponent,
    ProblemListFeedbackComponent,
    ProblemFeedbackComponent,
    SliderComponent,
    VerifyEmailComponent,
    TextPopupComponent,
    ForgotPasswordComponent,
    UserProfileComponent,
    DropZoneDirective,
    SolutionViewComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxPageScrollCoreModule,
    CKEditorModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AngularFireStorageModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatCheckboxModule,
    MatSliderModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatChipsModule,
  ],

  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
