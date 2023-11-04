import { Component, Input } from '@angular/core';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css'],
})
export class SliderComponent {
  @Input() attribute: string = '';
  constructor(solution: SolutionService) {
    if (this.attribute === 'achievable') {
    }
  }
  disabled = false;
  max = 10;
  min = 0;
  showTicks = true;
  step = 1;
  thumbLabel = false;
  value = 0;
}
