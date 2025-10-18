import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ProtectedRoutingModule } from './protected-routing.module';
import { SharedModule } from '../shared/shared.module';

import { HomeComponent } from '../components/home/home.component';
import { ProfileComponent } from '../components/profile/profile.component';
import { PostComponent } from '../components/solution/solution.component';
import { ProblemListComponent } from '../components/problem-list/problem-list.component';
import { ProblemListViewComponent } from '../components/problem-list-view/problem-list-view.component';
import { ProblemListFeedbackComponent } from '../components/problem-list-feedback/problem-list-feedback.component';
import { ProblemFeedbackComponent } from '../components/problem-feedback/problem-feedback.component';
import { TextPopupComponent } from '../components/text-popup/text-popup.component';
import { UserProfileComponent } from '../components/user-profile/user-profile.component';
import { DropZoneDirective } from '../components/drop-zone.directive';
import { SolutionViewComponent } from '../components/solution-view/solution-view.component';
import { EvaluationSummaryComponent } from '../components/evaluation-summary/evaluation-summary.component';
import { SolutionViewExternalComponent } from '../components/solution-view-external/solution-view-external.component';
import { JoinTournamentComponent } from '../components/join-tournament/join-tournament.component';
import { TeamDiscussionComponent } from '../components/team-discussion/team-discussion.component';
import { AudioPlayerComponent } from '../components/audio-player/audio-player.component';
import { VideoCallComponent } from '../components/video-call/video-call.component';
import { SrcObjectDirective } from '../directives/src-object.directive';
import { MeetingComponent } from '../components/meeting/meeting.component';
import { ChallengeComponent } from '../components/challenge/challenge.component';
import { ChallengeStarterComponent } from '../components/challenge-starter/challenge-starter.component';
import { StartChallengeComponent } from '../components/start-challenge/start-challenge.component';
import { GenerateChallengesComponent } from '../components/generate-challenges/generate-challenges.component';
import { HomeChallengeComponent } from '../components/home-challenge/home-challenge.component';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { FullDiscussionComponent } from '../components/full-discussion/full-discussion.component';
import { SolutionDetailsComponent } from '../components/solution-details/solution-details.component';
import { DocumentFilesComponent } from '../components/document-files/document-files.component';
import { SolutionEvaluationComponent } from '../components/solution-evaluation/solution-evaluation.component';
import { SolutionPreviewComponent } from '../components/solution-preview/solution-preview.component';
import { WhiteboardComponent } from '../components/whiteboard/whiteboard.component';
import { ListFinishedSolutionsComponent } from '../components/list-finished-solutions/list-finished-solutions.component';
import { DiscoverComponent } from '../components/discover/discover.component';
import { GameComponent } from '../game/game/game.component';
import { CreateTournamentComponent } from '../components/create-tournament/create-tournament.component';
import { TournamentDetailsComponent } from '../components/tournament-details/tournament-details.component';
import { ActiveTournamentsComponent } from '../components/active-tournaments/active-tournaments.component';
import { TournamentWinComponent } from '../components/tournament-win/tournament-win.component';
import { YourTournamentsComponent } from '../components/your-tournaments/your-tournaments.component';
import { PastTournamentsComponent } from '../components/past-tournaments/past-tournaments.component';
import { MiniGameComponent } from '../game/mini-game/mini-game.component';
import { PresentationFormComponent } from '../presentations/presentation-form/presentation-form.component';
import { PresentationViewerComponent } from '../presentations/presentation-viewer/presentation-viewer.component';
import { TeamBuildingComponent } from '../components/team-building/team-building.component';
import { SchedulerComponent } from '../game/scheduler/scheduler.component';
import { JoinSolutionComponent } from '../components/join-solution/join-solution.component';
import { SchoolDashboardComponent } from '../components/school-dashboard/school-dashboard.component';
import { InvitationsComponent } from '../components/invitations/invitations.component';
import { JoinSuccessComponent } from '../components/join-success/join-success.component';
import { BroadcastedSolutionsComponent } from '../components/broadcasted-solutions/broadcasted-solutions.component';
import { UnsubscribeComponent } from '../game/unsubscribe/unsubscribe.component';
import { AvatarDetailComponent } from '../components/avatar-detail/avatar-detail.component';

@NgModule({
  declarations: [
    HomeComponent,
    ProfileComponent,
    PostComponent,
    ProblemListComponent,
    ProblemListViewComponent,
    ProblemListFeedbackComponent,
    ProblemFeedbackComponent,
    TextPopupComponent,
    UserProfileComponent,
    DropZoneDirective,
    SolutionViewComponent,
    EvaluationSummaryComponent,
    SolutionViewExternalComponent,
    JoinTournamentComponent,
    TeamDiscussionComponent,
    AudioPlayerComponent,
    VideoCallComponent,
    SrcObjectDirective,
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
    SolutionPreviewComponent,
    WhiteboardComponent,
    ListFinishedSolutionsComponent,
    DiscoverComponent,
    GameComponent,
    CreateTournamentComponent,
    TournamentDetailsComponent,
    ActiveTournamentsComponent,
    TournamentWinComponent,
    YourTournamentsComponent,
    PastTournamentsComponent,
    MiniGameComponent,
    PresentationFormComponent,
    PresentationViewerComponent,
    TeamBuildingComponent,
    SchedulerComponent,
    JoinSolutionComponent,
    SchoolDashboardComponent,
    InvitationsComponent,
    JoinSuccessComponent,
    BroadcastedSolutionsComponent,
    UnsubscribeComponent,
    AvatarDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    ProtectedRoutingModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProtectedModule {}
