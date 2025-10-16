import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminCanMatch } from './admin/admin-can-match.guard';
import { playgroundCanMatch } from './playground/playground-can-match.guard';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { HomeComponent } from './components/home/home.component';
import { ProfileComponent } from './components/profile/profile.component';
import { ProblemListViewComponent } from './components/problem-list-view/problem-list-view.component';
import { ProblemListFeedbackComponent } from './components/problem-list-feedback/problem-list-feedback.component';
import { ProblemFeedbackComponent } from './components/problem-feedback/problem-feedback.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { AuthGuard } from './services/auth.guard';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { SolutionViewComponent } from './components/solution-view/solution-view.component';
import { EvaluationSummaryComponent } from './components/evaluation-summary/evaluation-summary.component';
import { SolutionViewExternalComponent } from './components/solution-view-external/solution-view-external.component';
import { JoinTournamentComponent } from './components/join-tournament/join-tournament.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { VideoCallComponent } from './components/video-call/video-call.component';
import { MeetingComponent } from './components/meeting/meeting.component';
import { StartChallengeComponent } from './components/start-challenge/start-challenge.component';
import { GenerateChallengesComponent } from './components/generate-challenges/generate-challenges.component';
import { HomeChallengeComponent } from './components/home-challenge/home-challenge.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FullDiscussionComponent } from './components/full-discussion/full-discussion.component';
import { SolutionDetailsComponent } from './components/solution-details/solution-details.component';
import { DocumentFilesComponent } from './components/document-files/document-files.component';
import { SolutionPreviewComponent } from './components/solution-preview/solution-preview.component';
import { WhiteboardComponent } from './components/whiteboard/whiteboard.component';
import { ListFinishedSolutionsComponent } from './components/list-finished-solutions/list-finished-solutions.component';
import { DiscoverComponent } from './components/discover/discover.component';
import { GameComponent } from './game/game/game.component';
import { CreateTournamentComponent } from './components/create-tournament/create-tournament.component';
import { TournamentDetailsComponent } from './components/tournament-details/tournament-details.component';
import { ActiveTournamentsComponent } from './components/active-tournaments/active-tournaments.component';
import { TournamentWinComponent } from './components/tournament-win/tournament-win.component';
import { YourTournamentsComponent } from './components/your-tournaments/your-tournaments.component';
import { PastTournamentsComponent } from './components/past-tournaments/past-tournaments.component';
import { MiniGameComponent } from './game/mini-game/mini-game.component';
import { PresentationViewerComponent } from './presentations/presentation-viewer/presentation-viewer.component';
import { TeamBuildingComponent } from './components/team-building/team-building.component';
import { SchedulerComponent } from './game/scheduler/scheduler.component';
import { JoinSolutionComponent } from './components/join-solution/join-solution.component';
import { SchoolSignupComponent } from './components/school-signup/school-signup.component';
import { SchoolDashboardComponent } from './components/school-dashboard/school-dashboard.component';
import { InvitationsComponent } from './components/invitations/invitations.component';
import { JoinSuccessComponent } from './components/join-success/join-success.component';
import { BroadcastedSolutionsComponent } from './components/broadcasted-solutions/broadcasted-solutions.component';
import { UnsubscribeComponent } from './game/unsubscribe/unsubscribe.component';
import { AvatarDetailComponent } from '../app/components/avatar-detail/avatar-detail.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'signup', component: SignupComponent },
  {
    path: 'signup-school',
    component: SchoolSignupComponent,
  },
  {
    path: 'school-admin',
    component: SchoolDashboardComponent,
    canActivate: [AuthGuard],
  },
  // app-routing.module.ts
  {
    path: 'invitations',
    component: InvitationsComponent,
    canActivate: [AuthGuard], // if you have one
  },
  // app-routing.module.ts
  { path: 'join-success', component: JoinSuccessComponent },
  { path: 'unsubscribe', component: UnsubscribeComponent },

  { path: 'game', component: GameComponent },
  { path: 'mini-game', component: MiniGameComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'discover', component: DiscoverComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  {
    path: 'start-challenge',
    component: StartChallengeComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'dashboard/:id',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { requireParticipant: true },
  },
  {
    path: 'join/:id',
    component: JoinSolutionComponent,
    // canActivate: [AuthGuard],
    // data: { requireParticipant: true },
  },
  {
    path: 'whiteboard/:id',
    component: WhiteboardComponent,
    canActivate: [AuthGuard],
    // data: { requireParticipant: true },
  },
  {
    path: 'team-building/:id',
    component: TeamBuildingComponent,
    canActivate: [AuthGuard],
    // data: { requireParticipant: true },
  },
  {
    path: 'user-profile/:id',
    component: UserProfileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'solution-view/:id',
    component: SolutionViewComponent,
    // canActivate: [AuthGuard],
  },
  {
    path: 'solution-preview/:id',
    component: SolutionPreviewComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'full-discussion/:id',
    component: FullDiscussionComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'challenge-discussion/:id',
    component: FullDiscussionComponent,
    canActivate: [AuthGuard], // keep this if you need it
    data: { docPrefix: 'challengePages' },
  },
  {
    path: 'solution-details/:id',
    component: SolutionDetailsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'document-files/:id',
    component: DocumentFilesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'solution-view-external/:id',
    component: SolutionViewExternalComponent,
    // canActivate: [AuthGuard],
  },
  {
    path: 'problem-list-view',
    component: ProblemListViewComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'list-finished-solutions',
    component: ListFinishedSolutionsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'problem-list-feedback',
    component: ProblemListFeedbackComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'join-tournament',
    component: JoinTournamentComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'tournament-winner/:id',
    component: TournamentWinComponent,
    // canActivate: [AuthGuard],
  },
  {
    path: 'create-tournament',
    component: CreateTournamentComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'tournament-details/:id',
    component: TournamentDetailsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'active-tournaments',
    component: ActiveTournamentsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'your-tournaments',
    component: YourTournamentsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'past-tournaments',
    component: PastTournamentsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'problem-feedback/:id',
    component: ProblemFeedbackComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'evaluation-summary/:id',
    component: EvaluationSummaryComponent,
    canActivate: [AuthGuard],
  },

  { path: 'verify-email', component: VerifyEmailComponent },
  {
    path: '',
    loadChildren: () =>
      import('./public/public.module').then((m) => m.PublicModule),
  },
  {
    path: 'video-call/:id',
    component: VideoCallComponent,
    canActivate: [AuthGuard],
    data: { requireParticipant: true },
  },
  {
    path: 'meeting/:id',
    component: MeetingComponent,
    canActivate: [AuthGuard],
    data: { requireParticipant: true },
  },
  // in your routing
  {
    path: 'generate-challenges',
    component: GenerateChallengesComponent,
    canActivate: [AuthGuard],
    data: { requireAdminOrSchoolAdmin: true }, // <— change this
  },

  {
    path: 'home-challenge/:id',
    component: HomeChallengeComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'scheduler',
    component: SchedulerComponent,
  },
  {
    path: 'document-files/:solutionId/presentation/:presentationId',
    component: PresentationViewerComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'broadcasts',
    component: BroadcastedSolutionsComponent,
  }, // if using standalone
  {
    path: 'avatar/:slug',
    component: AvatarDetailComponent,
  },
  {
    path: '',
    canMatch: [playgroundCanMatch],
    loadChildren: () =>
      import('./playground/playground.module').then(
        (m) => m.PlaygroundModule
      ),
  },
  {
    path: '',
    canMatch: [adminCanMatch],
    loadChildren: () =>
      import('./admin/admin.module').then((m) => m.AdminModule),
  },

  { path: '**', component: PageNotFoundComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled', //  ← NEW
      scrollPositionRestoration: 'enabled', //  (nice to have)
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
