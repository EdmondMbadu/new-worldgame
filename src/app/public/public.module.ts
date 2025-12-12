import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PublicRoutingModule } from './public-routing.module';
import { SharedModule } from '../shared/shared.module';

import { LandingPageComponent } from '../components/landing-page/landing-page.component';
import { LandingTestComponent } from '../components/landing-test/landing-test.component';
import { LandingCollegeComponent } from '../components/landing-college/landing-college.component';
import { LandingUnComponent } from '../components/landing-un/landing-un.component';
import { LandingCommunityComponent } from '../components/landing-community/landing-community.component';
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
import { WelcomeStepsComponent } from '../components/welcome-steps/welcome-steps.component';
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

@NgModule({
  declarations: [
    LandingPageComponent,
    LandingTestComponent,
    LandingCollegeComponent,
    LandingUnComponent,
    LandingCommunityComponent,
    CareersComponent,
    PrivacyComponent,
    FeaturesComponent,
    NwgStepsComponent,
    TournamentComponent,
    StateOfWorldComponent,
    SolutionLibrariesComponent,
    AskBuckyComponent,
    FacilitatorsComponent,
    SamplePrefferedStatesComponent,
    InstructionsComponent,
    PricingPlansComponent,
    ContactUsComponent,
    OurTeamComponent,
    NwgAiComponent,
    CareersSocialComponent,
    GlobalStatisticalToolsComponent,
    NwgNewsComponent,
    ArchivePicturesComponent,
    EvaluatorsComponent,
    CustomGptDesignScienceStoryboardComponent,
    NwgSolutionTourComponent,
    WelcomeComponent,
    WelcomeStepsComponent,
    GlobalLabComponent,
    GlobalRegisterComponent,
    NewFeaturesComponent,
    WorkshopComponent,
    WorkshopRegisterComponent,
    TemplateThanksComponent,
    PrimerComponent,
    PrimerRegisterComponent,
    WorldgamePacketComponent,
    ChabotStandaloneComponent,
    BuckyComponent,
    TournamentLandingComponent,
    TournamentUniversityComponent,
    AskAnythingComponent,
    AskFeedbackComponent,
    OperatingManualComponent,
    OverviewComponent,
    OtherAisComponent,
    TournamentInstructionsComponent,
  ],
  imports: [
    CommonModule,
    NgOptimizedImage,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    PublicRoutingModule,
  ],
})
export class PublicModule {}
