import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
// import { NgxPageScrollCoreModule } from 'ngx-page-scroll-core';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

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
import { EvaluationSummaryComponent } from './components/evaluation-summary/evaluation-summary.component';
import { OverviewComponent } from './components/overview/overview.component';
import { SolutionViewExternalComponent } from './components/solution-view-external/solution-view-external.component';
import { CareersComponent } from './blogs/careers/careers.component';
import { JoinTournamentComponent } from './components/join-tournament/join-tournament.component';
import { PrivacyComponent } from './blogs/privacy/privacy.component';
import { CustomGptDesignScienceStoryboardComponent } from './blogs/custom-gpt-design-science-storyboard/custom-gpt-design-science-storyboard.component';
import { EvaluatorsComponent } from './blogs/evaluators/evaluators.component';

import { TournamentComponent } from './blogs/tournament/tournament.component';
import { ArchivePicturesComponent } from './blogs/archive-pictures/archive-pictures.component';
import { FooterComponent } from './components/footer/footer.component';
import { NwgNewsComponent } from './blogs/nwg-news/nwg-news.component';
import { GlobalStatisticalToolsComponent } from './blogs/global-statistical-tools/global-statistical-tools.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { NwgAiComponent } from './blogs/nwg-ai/nwg-ai.component';
import { PricingPlansComponent } from './blogs/pricing-plans/pricing-plans.component';
import { ContactUsComponent } from './blogs/contact-us/contact-us.component';
import { TeamDiscussionComponent } from './components/team-discussion/team-discussion.component';
import { InstructionsComponent } from './blogs/instructions/instructions.component';
import { OperatingManualComponent } from './components/operating-manual/operating-manual.component';
import { SamplePrefferedStatesComponent } from './blogs/sample-preffered-states/sample-preffered-states.component';
import { EditorModule } from '@tinymce/tinymce-angular';
import { SolutionLibrariesComponent } from './blogs/solution-libraries/solution-libraries.component';
import { FacilitatorsComponent } from './blogs/facilitators/facilitators.component';
import { AskBuckyComponent } from './blogs/ask-bucky/ask-bucky.component';
import { StateOfWorldComponent } from './blogs/state-of-world/state-of-world.component';
import { NwgSolutionTourComponent } from './blogs/nwg-solution-tour/nwg-solution-tour.component';
import { CkeditorComponent } from './components/ckeditor/ckeditor.component';
import { OtherAisComponent } from './components/other-ais/other-ais.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { WelcomeStepsComponent } from './components/welcome-steps/welcome-steps.component';
import { CreateSolutionComponent } from './components/create-solution/create-solution.component';
import { CreateSolutionStepsComponent } from './components/create-solution-steps/create-solution-steps.component';
import { NewFeaturesComponent } from './blogs/new-features/new-features.component';
import { OurTeamComponent } from './components/our-team/our-team.component';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { VideoCallComponent } from './components/video-call/video-call.component';
import { WorkshopComponent } from './blogs/workshop/workshop.component';
import { WorkshopRegisterComponent } from './blogs/workshop-register/workshop-register.component';
import { TemplateThanksComponent } from './blogs/template-thanks/template-thanks.component';
import { ManagementWorkshopComponent } from './components/management-workshop/management-workshop.component';
import { PrimerComponent } from './blogs/primer/primer.component';
import { PrimerRegisterComponent } from './blogs/primer-register/primer-register.component';
import { WorldgamePacketComponent } from './blogs/worldgame-packet/worldgame-packet.component';
import { SrcObjectDirective } from './directives/src-object.directive';
import { ManagementPrimerComponent } from './components/management-primer/management-primer.component';
import { MeetingComponent } from './components/meeting/meeting.component';
import { ChallengeComponent } from './components/challenge/challenge.component';
import { ChallengeStarterComponent } from './components/challenge-starter/challenge-starter.component';
import { StartChallengeComponent } from './components/start-challenge/start-challenge.component';
import { GenerateChallengesComponent } from './components/generate-challenges/generate-challenges.component';
import { HomeChallengeComponent } from './components/home-challenge/home-challenge.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FullDiscussionComponent } from './components/full-discussion/full-discussion.component';
import { SolutionDetailsComponent } from './components/solution-details/solution-details.component';
import { DocumentFilesComponent } from './components/document-files/document-files.component';
import { SolutionEvaluationComponent } from './components/solution-evaluation/solution-evaluation.component';
import { GlobalLabComponent } from './blogs/global-lab/global-lab.component';
import { GlobalRegisterComponent } from './blogs/global-register/global-register.component';
import { ManagementGsl2025Component } from './components/management-gsl-2025/management-gsl-2025.component';
import { SolutionPreviewComponent } from './components/solution-preview/solution-preview.component';
import { WhiteboardComponent } from './components/whiteboard/whiteboard.component';
import { ListFinishedSolutionsComponent } from './components/list-finished-solutions/list-finished-solutions.component';
import { DiscoverComponent } from './components/discover/discover.component';
import { GameComponent } from './game/game/game.component';
import { SolutionPublicationComponent } from './components/solution-publication/solution-publication.component';

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
    EvaluationSummaryComponent,
    OverviewComponent,
    SolutionViewExternalComponent,
    CareersComponent,
    JoinTournamentComponent,
    PrivacyComponent,
    CustomGptDesignScienceStoryboardComponent,
    EvaluatorsComponent,
    TournamentComponent,
    ArchivePicturesComponent,
    FooterComponent,
    NwgNewsComponent,
    GlobalStatisticalToolsComponent,
    PageNotFoundComponent,
    NwgAiComponent,
    PricingPlansComponent,
    ContactUsComponent,
    TeamDiscussionComponent,
    InstructionsComponent,
    OperatingManualComponent,
    SamplePrefferedStatesComponent,
    SolutionLibrariesComponent,
    FacilitatorsComponent,
    AskBuckyComponent,
    StateOfWorldComponent,
    NwgSolutionTourComponent,
    CkeditorComponent,
    OtherAisComponent,
    WelcomeComponent,
    WelcomeStepsComponent,
    CreateSolutionComponent,
    CreateSolutionStepsComponent,
    NewFeaturesComponent,
    OurTeamComponent,
    AudioPlayerComponent,
    UserManagementComponent,
    VideoCallComponent,
    WorkshopComponent,
    WorkshopRegisterComponent,
    TemplateThanksComponent,
    ManagementWorkshopComponent,
    PrimerComponent,
    PrimerRegisterComponent,
    WorldgamePacketComponent,
    SrcObjectDirective,
    ManagementPrimerComponent,
    MeetingComponent,
    ChallengeComponent,
    ChallengeStarterComponent,
    StartChallengeComponent,
    GenerateChallengesComponent,
    HomeChallengeComponent,
    DashboardComponent,
    FullDiscussionComponent,
    SolutionDetailsComponent,
    DocumentFilesComponent,
    SolutionEvaluationComponent,
    GlobalLabComponent,
    GlobalRegisterComponent,
    ManagementGsl2025Component,
    SolutionPreviewComponent,
    WhiteboardComponent,
    ListFinishedSolutionsComponent,
    DiscoverComponent,
    GameComponent,
    SolutionPublicationComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    // NgxPageScrollCoreModule,
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
    MatAutocompleteModule,
    EditorModule,
    CKEditorModule,
  ],

  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add this line
})
export class AppModule {}
