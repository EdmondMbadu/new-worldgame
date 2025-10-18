import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '../services/auth.guard';
import { GameComponent } from '../game/game/game.component';
import { MiniGameComponent } from '../game/mini-game/mini-game.component';
import { HomeComponent } from '../components/home/home.component';
import { DiscoverComponent } from '../components/discover/discover.component';
import { ProfileComponent } from '../components/profile/profile.component';
import { StartChallengeComponent } from '../components/start-challenge/start-challenge.component';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { JoinSolutionComponent } from '../components/join-solution/join-solution.component';
import { WhiteboardComponent } from '../components/whiteboard/whiteboard.component';
import { TeamBuildingComponent } from '../components/team-building/team-building.component';
import { UserProfileComponent } from '../components/user-profile/user-profile.component';
import { SolutionViewComponent } from '../components/solution-view/solution-view.component';
import { SolutionPreviewComponent } from '../components/solution-preview/solution-preview.component';
import { FullDiscussionComponent } from '../components/full-discussion/full-discussion.component';
import { SolutionDetailsComponent } from '../components/solution-details/solution-details.component';
import { DocumentFilesComponent } from '../components/document-files/document-files.component';
import { SolutionViewExternalComponent } from '../components/solution-view-external/solution-view-external.component';
import { ProblemListViewComponent } from '../components/problem-list-view/problem-list-view.component';
import { ListFinishedSolutionsComponent } from '../components/list-finished-solutions/list-finished-solutions.component';
import { ProblemListFeedbackComponent } from '../components/problem-list-feedback/problem-list-feedback.component';
import { JoinTournamentComponent } from '../components/join-tournament/join-tournament.component';
import { TournamentWinComponent } from '../components/tournament-win/tournament-win.component';
import { CreateTournamentComponent } from '../components/create-tournament/create-tournament.component';
import { TournamentDetailsComponent } from '../components/tournament-details/tournament-details.component';
import { ActiveTournamentsComponent } from '../components/active-tournaments/active-tournaments.component';
import { YourTournamentsComponent } from '../components/your-tournaments/your-tournaments.component';
import { PastTournamentsComponent } from '../components/past-tournaments/past-tournaments.component';
import { ProblemFeedbackComponent } from '../components/problem-feedback/problem-feedback.component';
import { EvaluationSummaryComponent } from '../components/evaluation-summary/evaluation-summary.component';
import { GenerateChallengesComponent } from '../components/generate-challenges/generate-challenges.component';
import { HomeChallengeComponent } from '../components/home-challenge/home-challenge.component';
import { SchedulerComponent } from '../game/scheduler/scheduler.component';
import { PresentationViewerComponent } from '../presentations/presentation-viewer/presentation-viewer.component';
import { BroadcastedSolutionsComponent } from '../components/broadcasted-solutions/broadcasted-solutions.component';
import { AvatarDetailComponent } from '../components/avatar-detail/avatar-detail.component';
import { VideoCallComponent } from '../components/video-call/video-call.component';
import { MeetingComponent } from '../components/meeting/meeting.component';
import { JoinSuccessComponent } from '../components/join-success/join-success.component';
import { UnsubscribeComponent } from '../game/unsubscribe/unsubscribe.component';
import { InvitationsComponent } from '../components/invitations/invitations.component';
import { SchoolDashboardComponent } from '../components/school-dashboard/school-dashboard.component';

const routes: Routes = [
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
  { path: 'join/:id', component: JoinSolutionComponent },
  {
    path: 'whiteboard/:id',
    component: WhiteboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'team-building/:id',
    component: TeamBuildingComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'user-profile/:id',
    component: UserProfileComponent,
    canActivate: [AuthGuard],
  },
  { path: 'solution-view/:id', component: SolutionViewComponent },
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
    canActivate: [AuthGuard],
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
  { path: 'tournament-winner/:id', component: TournamentWinComponent },
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
  {
    path: 'generate-challenges',
    component: GenerateChallengesComponent,
    canActivate: [AuthGuard],
    data: { requireAdminOrSchoolAdmin: true },
  },
  {
    path: 'home-challenge/:id',
    component: HomeChallengeComponent,
    canActivate: [AuthGuard],
  },
  { path: 'scheduler', component: SchedulerComponent },
  {
    path: 'document-files/:solutionId/presentation/:presentationId',
    component: PresentationViewerComponent,
    canActivate: [AuthGuard],
  },
  { path: 'broadcasts', component: BroadcastedSolutionsComponent },
  { path: 'avatar/:slug', component: AvatarDetailComponent },
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
  { path: 'join-success', component: JoinSuccessComponent },
  { path: 'unsubscribe', component: UnsubscribeComponent },
  {
    path: 'invitations',
    component: InvitationsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'school-admin',
    component: SchoolDashboardComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProtectedRoutingModule {}
