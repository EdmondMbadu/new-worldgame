import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NoAuthGuard } from '../services/no-auth.guard';
import { LandingPageComponent } from '../components/landing-page/landing-page.component';
import { LandingTestComponent } from '../components/landing-test/landing-test.component';
import { LandingCollegeComponent } from '../components/landing-college/landing-college.component';
import { CareersComponent } from '../blogs/careers/careers.component';
import { PrivacyComponent } from '../blogs/privacy/privacy.component';
import { FeaturesComponent } from '../blogs/features/features.component';
import { NwgStepsComponent } from '../blogs/nwg-steps/nwg-steps.component';
import { TournamentComponent } from '../blogs/tournament/tournament.component';
import { StateOfWorldComponent } from '../blogs/state-of-world/state-of-world.component';
import { SolutionLibrariesComponent } from '../blogs/solution-libraries/solution-libraries.component';
import { AskBuckyComponent } from '../blogs/ask-bucky/ask-bucky.component';
import { FacilitatorsComponent } from '../blogs/facilitators/facilitators.component';
import { SamplePrefferedStatesComponent } from '../blogs/sample-preffered-states/sample-preffered-states.component';
import { InstructionsComponent } from '../blogs/instructions/instructions.component';
import { PricingPlansComponent } from '../blogs/pricing-plans/pricing-plans.component';
import { ContactUsComponent } from '../blogs/contact-us/contact-us.component';
import { OurTeamComponent } from '../components/our-team/our-team.component';
import { NwgAiComponent } from '../blogs/nwg-ai/nwg-ai.component';
import { CareersSocialComponent } from '../blogs/careers-social/careers-social.component';
import { GlobalStatisticalToolsComponent } from '../blogs/global-statistical-tools/global-statistical-tools.component';
import { NwgNewsComponent } from '../blogs/nwg-news/nwg-news.component';
import { ArchivePicturesComponent } from '../blogs/archive-pictures/archive-pictures.component';
import { EvaluatorsComponent } from '../blogs/evaluators/evaluators.component';
import { CustomGptDesignScienceStoryboardComponent } from '../blogs/custom-gpt-design-science-storyboard/custom-gpt-design-science-storyboard.component';
import { NwgSolutionTourComponent } from '../blogs/nwg-solution-tour/nwg-solution-tour.component';
import { WelcomeComponent } from '../components/welcome/welcome.component';
import { GlobalLabComponent } from '../blogs/global-lab/global-lab.component';
import { GlobalRegisterComponent } from '../blogs/global-register/global-register.component';
import { NewFeaturesComponent } from '../blogs/new-features/new-features.component';
import { WorkshopComponent } from '../blogs/workshop/workshop.component';
import { WorkshopRegisterComponent } from '../blogs/workshop-register/workshop-register.component';
import { TemplateThanksComponent } from '../blogs/template-thanks/template-thanks.component';
import { PrimerComponent } from '../blogs/primer/primer.component';
import { PrimerRegisterComponent } from '../blogs/primer-register/primer-register.component';
import { WorldgamePacketComponent } from '../blogs/worldgame-packet/worldgame-packet.component';
import { ChabotStandaloneComponent } from '../game/chabot-standalone/chabot-standalone.component';
import { BuckyComponent } from '../blogs/bucky/bucky.component';
import { TournamentLandingComponent } from '../blogs/tournament-landing/tournament-landing.component';
import { TournamentUniversityComponent } from '../blogs/tournament-university/tournament-university.component';
import { AskAnythingComponent } from '../blogs/ask-anything/ask-anything.component';
import { AskFeedbackComponent } from '../blogs/ask-feedback/ask-feedback.component';
import { OperatingManualComponent } from '../components/operating-manual/operating-manual.component';
import { OverviewComponent } from '../components/overview/overview.component';
import { OtherAisComponent } from '../components/other-ais/other-ais.component';
import { TournamentInstructionsComponent } from '../blogs/tournament-instructions/tournament-instructions.component';

const routes: Routes = [
  { path: '', component: LandingPageComponent, canActivate: [NoAuthGuard] },
  { path: 'landing', component: LandingTestComponent },
  { path: 'landing-college', component: LandingCollegeComponent },
  { path: 'careers', component: CareersComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'blogs/features', component: FeaturesComponent },
  { path: 'blogs/nwg-steps', component: NwgStepsComponent },
  { path: 'blogs/tournament', component: TournamentComponent },
  { path: 'blogs/state-of-world', component: StateOfWorldComponent },
  { path: 'blogs/solution-libraries', component: SolutionLibrariesComponent },
  { path: 'blogs/ask-bucky', component: AskBuckyComponent },
  { path: 'blogs/facilitators', component: FacilitatorsComponent },
  {
    path: 'blogs/sample-preferred-states',
    component: SamplePrefferedStatesComponent,
  },
  { path: 'blogs/instructions', component: InstructionsComponent },
  { path: 'plans', component: PricingPlansComponent },
  { path: 'contact-us', component: ContactUsComponent },
  { path: 'our-team', component: OurTeamComponent },
  { path: 'blogs/nwg-ai', component: NwgAiComponent },
  { path: 'social-media', component: CareersSocialComponent },
  {
    path: 'blogs/global-statistical-tools',
    component: GlobalStatisticalToolsComponent,
  },
  { path: 'nwg-news', component: NwgNewsComponent },
  { path: 'archive-pictures', component: ArchivePicturesComponent },
  { path: 'evaluators', component: EvaluatorsComponent },
  {
    path: 'blogs/custom-storyboard',
    component: CustomGptDesignScienceStoryboardComponent,
  },
  { path: 'blogs/nwg-solution-tour', component: NwgSolutionTourComponent },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'global-lab', component: GlobalLabComponent },
  { path: 'global-register', component: GlobalRegisterComponent },
  { path: 'blogs/new-features', component: NewFeaturesComponent },
  { path: 'workshop', component: WorkshopComponent },
  { path: 'workshop-register', component: WorkshopRegisterComponent },
  { path: 'thank-you', component: TemplateThanksComponent },
  { path: 'primer', component: PrimerComponent },
  { path: 'primer-register', component: PrimerRegisterComponent },
  { path: 'blogs/worldgame-packet', component: WorldgamePacketComponent },
  { path: 'ask-bucky', component: ChabotStandaloneComponent },
  { path: 'bucky', component: BuckyComponent },
  { path: 'tournament-landing', component: TournamentLandingComponent },
  { path: 'tournament-university', component: TournamentUniversityComponent },
  { path: 'ask-anything', component: AskAnythingComponent },
  { path: 'ask-feedback', component: AskFeedbackComponent },
  { path: 'operating-manual', component: OperatingManualComponent },
  { path: 'overview', component: OverviewComponent },
  { path: 'other-ais', component: OtherAisComponent },
  { path: 'tournament-instructions', component: TournamentInstructionsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicRoutingModule {}
