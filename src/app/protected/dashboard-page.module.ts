import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { AuthGuard } from '../services/auth.guard';
import { NavbarModule } from '../shared/navbar.module';
import { DropZoneModule } from './drop-zone.module';

@NgModule({
  declarations: [DashboardComponent],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NavbarModule,
    DropZoneModule,
    RouterModule.forChild([{
      path: '',
      component: DashboardComponent,
      canActivate: [AuthGuard],
      data: { requireParticipant: true },
    }]),
  ],
})
export class DashboardPageModule {}
