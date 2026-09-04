import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ProblemListComponent } from '../components/problem-list/problem-list.component';

@NgModule({
  declarations: [ProblemListComponent],
  imports: [CommonModule, RouterModule, TranslateModule],
  exports: [ProblemListComponent],
})
export class ProblemListCardModule {}
