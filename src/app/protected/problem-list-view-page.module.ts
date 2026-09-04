import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ProblemListViewComponent } from '../components/problem-list-view/problem-list-view.component';
import { AuthGuard } from '../services/auth.guard';
import { NavbarModule } from '../shared/navbar.module';
import { ProblemListCardModule } from './problem-list-card.module';

const routes: Routes = [
  { path: '', component: ProblemListViewComponent, canActivate: [AuthGuard] },
];

@NgModule({
  declarations: [ProblemListViewComponent],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NavbarModule,
    ProblemListCardModule,
    RouterModule.forChild(routes),
  ],
})
export class ProblemListViewPageModule {}
