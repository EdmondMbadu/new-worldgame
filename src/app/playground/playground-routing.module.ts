import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '../services/auth.guard';
import { CreatePlaygroundComponent } from '../components/create-playground/create-playground.component';
import { CreateSolutionComponent } from '../components/create-solution/create-solution.component';

const routes: Routes = [
  {
    path: 'create-playground',
    component: CreatePlaygroundComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'create-solution',
    component: CreateSolutionComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlaygroundRoutingModule {}
