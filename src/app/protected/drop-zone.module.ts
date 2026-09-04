import { NgModule } from '@angular/core';

import { DropZoneDirective } from '../components/drop-zone.directive';

@NgModule({
  declarations: [DropZoneDirective],
  exports: [DropZoneDirective],
})
export class DropZoneModule {}
