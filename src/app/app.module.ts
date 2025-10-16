import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
// import { NgxPageScrollCoreModule } from 'ngx-page-scroll-core';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

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
import { AngularFireFunctionsModule } from '@angular/fire/compat/functions';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
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
import { TextPopupComponent } from './components/text-popup/text-popup.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { DropZoneDirective } from './components/drop-zone.directive';
import { SolutionViewComponent } from './components/solution-view/solution-view.component';
import { EvaluationSummaryComponent } from './components/evaluation-summary/evaluation-summary.component';
import { SolutionViewExternalComponent } from './components/solution-view-external/solution-view-external.component';
import { JoinTournamentComponent } from './components/join-tournament/join-tournament.component';

import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { TeamDiscussionComponent } from './components/team-discussion/team-discussion.component';
import { EditorModule } from '@tinymce/tinymce-angular';
import { CkeditorComponent } from './components/ckeditor/ckeditor.component';
import { CreateSolutionComponent } from './components/create-solution/create-solution.component';
import { CreateSolutionStepsComponent } from './components/create-solution-steps/create-solution-steps.component';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { VideoCallComponent } from './components/video-call/video-call.component';
import { ManagementWorkshopComponent } from './components/management-workshop/management-workshop.component';
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
import { ManagementGsl2025Component } from './components/management-gsl-2025/management-gsl-2025.component';
import { SolutionPreviewComponent } from './components/solution-preview/solution-preview.component';
import { WhiteboardComponent } from './components/whiteboard/whiteboard.component';
import { ListFinishedSolutionsComponent } from './components/list-finished-solutions/list-finished-solutions.component';
import { DiscoverComponent } from './components/discover/discover.component';
import { GameComponent } from './game/game/game.component';
import { SolutionPublicationComponent } from './components/solution-publication/solution-publication.component';
import { CreateTournamentComponent } from './components/create-tournament/create-tournament.component';
import { TournamentDetailsComponent } from './components/tournament-details/tournament-details.component';
import { ActiveTournamentsComponent } from './components/active-tournaments/active-tournaments.component';
import { TournamentWinComponent } from './components/tournament-win/tournament-win.component';
import { YourTournamentsComponent } from './components/your-tournaments/your-tournaments.component';
import { PastTournamentsComponent } from './components/past-tournaments/past-tournaments.component';
import { TournamentManagementComponent } from './components/tournament-management/tournament-management.component';
import { MiniGameComponent } from './game/mini-game/mini-game.component';
import { PresentationFormComponent } from './presentations/presentation-form/presentation-form.component';
import { PresentationViewerComponent } from './presentations/presentation-viewer/presentation-viewer.component';
import { MatDialogModule } from '@angular/material/dialog';
import { TeamBuildingComponent } from './components/team-building/team-building.component';
import { SchedulerComponent } from './game/scheduler/scheduler.component';
import { ManagementDemoComponent } from './components/management-demo/management-demo.component';
import { ManagementToolbarComponent } from './game/management-toolbar/management-toolbar.component';
import { JoinSolutionComponent } from './components/join-solution/join-solution.component';
import { SchoolSignupComponent } from './components/school-signup/school-signup.component';
import { SchoolDashboardComponent } from './components/school-dashboard/school-dashboard.component';
import { InvitationsComponent } from './components/invitations/invitations.component';
import { JoinSuccessComponent } from './components/join-success/join-success.component';
import { SchoolManagementComponent } from './components/school-management/school-management.component';
import { ManagementAskComponent } from './components/management-ask/management-ask.component';
import { FeedbackManagementComponent } from './components/feedback-management/feedback-management.component';
import { BroadcastedSolutionsComponent } from './components/broadcasted-solutions/broadcasted-solutions.component';
import { BulkEmailsComponent } from './game/bulk-emails/bulk-emails.component';
import { UnsubscribeComponent } from './game/unsubscribe/unsubscribe.component';
import { AvatarDetailComponent } from './components/avatar-detail/avatar-detail.component';
import { AdminInviteMonitorComponent } from './components/admin-invite-monitor/admin-invite-monitor.component';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
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
    SolutionViewExternalComponent,
    JoinTournamentComponent,
    PageNotFoundComponent,
    TeamDiscussionComponent,
    CkeditorComponent,
    CreateSolutionComponent,
    CreateSolutionStepsComponent,
    AudioPlayerComponent,
    UserManagementComponent,
    VideoCallComponent,
    ManagementWorkshopComponent,
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
    ManagementGsl2025Component,
    SolutionPreviewComponent,
    WhiteboardComponent,
    ListFinishedSolutionsComponent,
    DiscoverComponent,
    GameComponent,
    SolutionPublicationComponent,
    CreateTournamentComponent,
    TournamentDetailsComponent,
    ActiveTournamentsComponent,
    TournamentWinComponent,
    YourTournamentsComponent,
    PastTournamentsComponent,
    TournamentManagementComponent,
    MiniGameComponent,
    PresentationFormComponent,
    PresentationViewerComponent,
    TeamBuildingComponent,
    SchedulerComponent,
    ManagementDemoComponent,
    ManagementToolbarComponent,
    JoinSolutionComponent,
    SchoolSignupComponent,
    SchoolDashboardComponent,
    InvitationsComponent,
    JoinSuccessComponent,
    SchoolManagementComponent,
    ManagementAskComponent,
    FeedbackManagementComponent,
    BroadcastedSolutionsComponent,
    BulkEmailsComponent,
    UnsubscribeComponent,
    AvatarDetailComponent,
    AdminInviteMonitorComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule,
    CKEditorModule,
    FormsModule,
    ReactiveFormsModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AngularFireStorageModule,
    AngularFireFunctionsModule,
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
    MatDialogModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add this line
})
export class AppModule {}
