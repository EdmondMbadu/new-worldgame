import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignPublicRoutingModule } from './campaign-public-routing.module';
import { CampaignPublicComponent } from './campaign-public.component';

@NgModule({
  declarations: [CampaignPublicComponent],
  imports: [CommonModule, FormsModule, CampaignPublicRoutingModule],
})
export class CampaignPublicModule {}
