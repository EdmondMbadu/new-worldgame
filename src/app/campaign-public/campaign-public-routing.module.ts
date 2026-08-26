import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CampaignPublicComponent } from './campaign-public.component';

const routes: Routes = [{ path: '', component: CampaignPublicComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CampaignPublicRoutingModule {}

