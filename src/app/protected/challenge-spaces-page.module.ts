import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ChallengeSpacesComponent } from '../components/challenge-spaces/challenge-spaces.component';
import { AuthGuard } from '../services/auth.guard';
import { NavbarModule } from '../shared/navbar.module';

const routes: Routes = [
  { path: '', component: ChallengeSpacesComponent, canActivate: [AuthGuard] },
];

@NgModule({
  declarations: [ChallengeSpacesComponent],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NavbarModule,
    RouterModule.forChild(routes),
  ],
})
export class ChallengeSpacesPageModule {}
