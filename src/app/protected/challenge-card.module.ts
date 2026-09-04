import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ChallengeComponent } from '../components/challenge/challenge.component';

@NgModule({
  declarations: [ChallengeComponent],
  imports: [CommonModule, RouterModule, TranslateModule],
  exports: [ChallengeComponent],
})
export class ChallengeCardModule {}
