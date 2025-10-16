import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '../services/auth.guard';
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

const routes: Routes = [
  {
    path: 'user-management',
    component: UserManagementComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'schools-management',
    component: SchoolManagementComponent,
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
    path: 'feedback-management',
    component: FeedbackManagementComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'admin-invite',
    component: AdminInviteMonitorComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'management-demo',
    component: ManagementDemoComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'management-ask',
    component: ManagementAskComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'bulk-emails',
    component: BulkEmailsComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
  {
    path: 'solution-publication',
    component: SolutionPublicationComponent,
    canActivate: [AuthGuard],
    data: { requireAdmin: true },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
