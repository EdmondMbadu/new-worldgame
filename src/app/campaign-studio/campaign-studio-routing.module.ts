import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../services/auth.guard';
import { CampaignStudioComponent } from './campaign-studio.component';

const routes: Routes = [
  {
    path: '',
    component: CampaignStudioComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CampaignStudioRoutingModule {}

