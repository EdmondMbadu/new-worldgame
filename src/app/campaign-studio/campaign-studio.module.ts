import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignStudioRoutingModule } from './campaign-studio-routing.module';
import { CampaignStudioComponent } from './campaign-studio.component';

@NgModule({
  declarations: [CampaignStudioComponent],
  imports: [CommonModule, FormsModule, CampaignStudioRoutingModule],
})
export class CampaignStudioModule {}

