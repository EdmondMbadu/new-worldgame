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

const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  {
    path: 'create-playground',
    component: CreatePlaygroundComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'playground-steps/:id',
    component: PlaygroundStepsComponent,
    canActivate: [AuthGuard],
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
    path: 'careers',
    component: CareersComponent,
  },
  {
    path: 'privacy',
    component: PrivacyComponent,
  },
  // {
  //   path: 'blogs',
  //   component: BlogsComponent,
  // },

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
  { path: '**', component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
