import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxPageScrollCoreModule } from 'ngx-page-scroll-core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SignupComponent } from './components/signup/signup.component';
import { HomeComponent } from './components/home/home.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PostComponent } from './components/post/post.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { CreatePlaygroundComponent } from './components/create-playground/create-playground.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { PlaygroundStepsComponent } from './components/playground-steps/playground-steps.component';
import { PlaygroundStepComponent } from './components/playground-step/playground-step.component';

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
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxPageScrollCoreModule,
    CKEditorModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
