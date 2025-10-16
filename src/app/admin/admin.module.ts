import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing.module';
import { SharedModule } from '../shared/shared.module';

import { UserManagementComponent } from '../components/user-management/user-management.component';
import { SchoolManagementComponent } from '../components/school-management/school-management.component';
import { ManagementWorkshopComponent } from '../components/management-workshop/management-workshop.component';
import { ManagementGsl2025Component } from '../components/management-gsl-2025/management-gsl-2025.component';
import { TournamentManagementComponent } from '../components/tournament-management/tournament-management.component';
import { ManagementPrimerComponent } from '../components/management-primer/management-primer.component';
import { FeedbackManagementComponent } from '../components/feedback-management/feedback-management.component';
import { AdminInviteMonitorComponent } from '../components/admin-invite-monitor/admin-invite-monitor.component';
import { ManagementDemoComponent } from '../components/management-demo/management-demo.component';
import { ManagementAskComponent } from '../components/management-ask/management-ask.component';
import { BulkEmailsComponent } from '../game/bulk-emails/bulk-emails.component';
import { SolutionPublicationComponent } from '../components/solution-publication/solution-publication.component';
import { ManagementToolbarComponent } from '../game/management-toolbar/management-toolbar.component';

@NgModule({
  declarations: [
    UserManagementComponent,
    SchoolManagementComponent,
    ManagementWorkshopComponent,
    ManagementGsl2025Component,
    TournamentManagementComponent,
    ManagementPrimerComponent,
    FeedbackManagementComponent,
    AdminInviteMonitorComponent,
    ManagementDemoComponent,
    ManagementAskComponent,
    BulkEmailsComponent,
    SolutionPublicationComponent,
    ManagementToolbarComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    AdminRoutingModule,
  ],
})
export class AdminModule {}
