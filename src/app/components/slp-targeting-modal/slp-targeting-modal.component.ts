import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-slp-targeting-modal',
  templateUrl: './slp-targeting-modal.component.html',
  styleUrls: ['./slp-targeting-modal.component.css'],
})
export class SlpTargetingModalComponent implements OnChanges {
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

  draftCity = '';
  draftRegion = '';
  draftCountry = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['city'] && !changes['region'] && !changes['country']) {
      return;
    }
    this.draftCity = this.city || '';
    this.draftRegion = this.region || '';
    this.draftCountry = this.country || '';
  }

  submitLocation(): void {
    this.saveLocation.emit({
      city: this.draftCity.trim(),
      region: this.draftRegion.trim(),
      country: this.draftCountry.trim(),
    });
  }
}
