import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { HomeComponent } from './components/home/home.component';
import { ProfileComponent } from './components/profile/profile.component';
import { CreatePlaygroundComponent } from './components/create-playground/create-playground.component';
import { PlaygroundStepsComponent } from './components/playground-steps/playground-steps.component';
import { ProblemListViewComponent } from './components/problem-list-view/problem-list-view.component';
import { ProblemListFeedbackComponent } from './components/problem-list-feedback/problem-list-feedback.component';
import { ProblemFeedbackComponent } from './components/problem-feedback/problem-feedback.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { AuthGuard } from './services/auth.guard';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
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
import { NwgNewsComponent } from './blogs/nwg-news/nwg-news.component';
import { GlobalStatisticalToolsComponent } from './blogs/global-statistical-tools/global-statistical-tools.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { NwgAiComponent } from './blogs/nwg-ai/nwg-ai.component';
import { PricingPlansComponent } from './blogs/pricing-plans/pricing-plans.component';
import { ContactUsComponent } from './blogs/contact-us/contact-us.component';
import { InstructionsComponent } from './blogs/instructions/instructions.component';
import { OperatingManualComponent } from './components/operating-manual/operating-manual.component';
import { SamplePrefferedStatesComponent } from './blogs/sample-preffered-states/sample-preffered-states.component';
import { SolutionLibrariesComponent } from './blogs/solution-libraries/solution-libraries.component';
import { FacilitatorsComponent } from './blogs/facilitators/facilitators.component';
import { AskBuckyComponent } from './blogs/ask-bucky/ask-bucky.component';
import { StateOfWorldComponent } from './blogs/state-of-world/state-of-world.component';
import { NwgSolutionTourComponent } from './blogs/nwg-solution-tour/nwg-solution-tour.component';
import { OtherAisComponent } from './components/other-ais/other-ais.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { CreateSolutionComponent } from './components/create-solution/create-solution.component';
import { NewFeaturesComponent } from './blogs/new-features/new-features.component';
import { OurTeamComponent } from './components/our-team/our-team.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { VideoCallComponent } from './components/video-call/video-call.component';
import { WorkshopComponent } from './blogs/workshop/workshop.component';
import { WorkshopRegisterComponent } from './blogs/workshop-register/workshop-register.component';
import { TemplateThanksComponent } from './blogs/template-thanks/template-thanks.component';
import { ManagementWorkshopComponent } from './components/management-workshop/management-workshop.component';
import { PrimerComponent } from './blogs/primer/primer.component';
import { PrimerRegisterComponent } from './blogs/primer-register/primer-register.component';
import { WorldgamePacketComponent } from './blogs/worldgame-packet/worldgame-packet.component';
import { ManagementPrimerComponent } from './components/management-primer/management-primer.component';
import { MeetingComponent } from './components/meeting/meeting.component';
import { StartChallengeComponent } from './components/start-challenge/start-challenge.component';
import { GenerateChallengesComponent } from './components/generate-challenges/generate-challenges.component';
import { HomeChallengeComponent } from './components/home-challenge/home-challenge.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FullDiscussionComponent } from './components/full-discussion/full-discussion.component';
import { SolutionDetailsComponent } from './components/solution-details/solution-details.component';
import { DocumentFilesComponent } from './components/document-files/document-files.component';
import { GlobalLabComponent } from './blogs/global-lab/global-lab.component';
import { GlobalRegisterComponent } from './blogs/global-register/global-register.component';
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
import { FeaturesComponent } from './blogs/features/features.component';
import { MiniGameComponent } from './game/mini-game/mini-game.component';
import { NwgStepsComponent } from './blogs/nwg-steps/nwg-steps.component';
import { NoAuthGuard } from './services/no-auth.guard';
import { PresentationViewerComponent } from './presentations/presentation-viewer/presentation-viewer.component';
import { TeamBuildingComponent } from './components/team-building/team-building.component';
import { ChabotStandaloneComponent } from './game/chabot-standalone/chabot-standalone.component';
import { BuckyComponent } from './blogs/bucky/bucky.component';
import { TournamentLandingComponent } from './blogs/tournament-landing/tournament-landing.component';
import { Scheduler } from 'rxjs';
import { SchedulerComponent } from './game/scheduler/scheduler.component';
import { ManagementDemoComponent } from './components/management-demo/management-demo.component';

const routes: Routes = [
  { path: '', component: LandingPageComponent, canActivate: [NoAuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'game', component: GameComponent },
  { path: 'mini-game', component: MiniGameComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'discover', component: DiscoverComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  {
    path: 'create-playground',
    component: CreatePlaygroundComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'create-solution',
    component: CreateSolutionComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'start-challenge',
    component: StartChallengeComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'playground-steps/:id',
    component: PlaygroundStepsComponent,
    canActivate: [AuthGuard],
    data: { requireParticipant: true },
  },
  {
    path: 'dashboard/:id',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { requireParticipant: true },
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
    canActivate: [AuthGuard],
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
    path: 'other-ais',
    component: OtherAisComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'operating-manual',
    component: OperatingManualComponent,
  },

  {
    path: 'overview',
    component: OverviewComponent,
  },
  {
    path: 'user-management',
    component: UserManagementComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'management-workshop',
    component: ManagementWorkshopComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'management-gsl-2025',
    component: ManagementGsl2025Component,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'tournament-management',
    component: TournamentManagementComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'management-primer',
    component: ManagementPrimerComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
      {
    path: 'management-demo',
    component:ManagementDemoComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'careers',
    component: CareersComponent,
  },
  {
    path: 'privacy',
    component: PrivacyComponent,
  },
  {
    path: 'blogs/features',
    component: FeaturesComponent,
  },
  {
    path: 'blogs/nwg-steps',
    component: NwgStepsComponent,
  },

  {
    path: 'blogs/tournament',
    component: TournamentComponent,
  },
  {
    path: 'blogs/state-of-world',
    component: StateOfWorldComponent,
  },
  {
    path: 'blogs/solution-libraries',
    component: SolutionLibrariesComponent,
  },
  {
    path: 'blogs/ask-bucky',
    component: AskBuckyComponent,
  },
  {
    path: 'blogs/facilitators',
    component: FacilitatorsComponent,
  },
  {
    path: 'blogs/sample-preferred-states',
    component: SamplePrefferedStatesComponent,
  },
  {
    path: 'blogs/instructions',
    component: InstructionsComponent,
  },

  {
    path: 'plans',
    component: PricingPlansComponent,
  },
  {
    path: 'contact-us',
    component: ContactUsComponent,
  },
  {
    path: 'our-team',
    component: OurTeamComponent,
  },
  {
    path: 'blogs/nwg-ai',
    component: NwgAiComponent,
  },
  {
    path: 'blogs/global-statistical-tools',
    component: GlobalStatisticalToolsComponent,
  },
  {
    path: 'nwg-news',
    component: NwgNewsComponent,
  },
  {
    path: 'archive-pictures',
    component: ArchivePicturesComponent,
  },
  {
    path: 'evaluators',
    component: EvaluatorsComponent,
  },
  {
    path: 'blogs/custom-storyboard',
    component: CustomGptDesignScienceStoryboardComponent,
  },
  {
    path: 'blogs/nwg-solution-tour',
    component: NwgSolutionTourComponent,
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
    path: 'welcome',
    component: WelcomeComponent,
  },
  {
    path: 'global-lab',
    component: GlobalLabComponent,
  },
  {
    path: 'global-register',
    component: GlobalRegisterComponent,
  },
  {
    path: 'blogs/new-features',
    component: NewFeaturesComponent,
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
  {
    path: 'workshop',
    component: WorkshopComponent,
  },

  {
    path: 'workshop-register',
    component: WorkshopRegisterComponent,
  },

  {
    path: 'thank-you',
    component: TemplateThanksComponent,
  },
  {
    path: 'primer',
    component: PrimerComponent,
  },
  {
    path: 'primer-register',
    component: PrimerRegisterComponent,
  },
  {
    path: 'blogs/worldgame-packet',
    component: WorldgamePacketComponent,
  },
  {
    path: 'generate-challenges',
    component: GenerateChallengesComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'solution-publication',
    component: SolutionPublicationComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'home-challenge/:id',
    component: HomeChallengeComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'ask-bucky',
    component: ChabotStandaloneComponent,
    // canActivate: [AuthGuard],
  },
  {
    path: 'bucky',
    component: BuckyComponent,
  },
   {
    path: 'scheduler',
    component: SchedulerComponent,
  },
  {
    path: 'tournament-landing',
    component: TournamentLandingComponent,
  },
  {
    path: 'document-files/:solutionId/presentation/:presentationId',
    component: PresentationViewerComponent,
    canActivate: [AuthGuard],
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
