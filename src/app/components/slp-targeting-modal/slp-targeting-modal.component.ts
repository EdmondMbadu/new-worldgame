import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-slp-targeting-modal',
  templateUrl: './slp-targeting-modal.component.html',
  styleUrls: ['./slp-targeting-modal.component.css'],
})
export class SlpTargetingModalComponent {
  @Input() visible = false;
  @Input() laneLabel = 'launch';
  @Input() city = '';
  @Input() region = '';
  @Input() country = '';
  @Input() saving = false;
  @Input() error = '';
  @Output() saveLocation = new EventEmitter<{
    city: string;
    region: string;
    country: string;
  }>();
  @Output() useGlobal = new EventEmitter<void>();

  submitLocation(value: { city: string; region: string; country: string }): void {
    this.saveLocation.emit(value);
  }
}
