import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { SlpPlace, SlpPlaceService } from 'src/app/services/slp-place.service';

@Component({
  selector: 'app-slp-location-picker',
  templateUrl: './slp-location-picker.component.html',
  styleUrls: ['./slp-location-picker.component.css'],
})
export class SlpLocationPickerComponent implements OnChanges {
  @Input() city = '';
  @Input() region = '';
  @Input() country = '';
  @Input() saving = false;
  @Input() showGlobal = true;
  @Input() submitLabel = 'Apply location';
  @Input() placeholder = 'Start typing a city';
  @Input() helperText =
    'Choose a suggested place to fill city, state/region, and country automatically.';
  @Output() saveLocation = new EventEmitter<{
    city: string;
    region: string;
    country: string;
  }>();
  @Output() useGlobal = new EventEmitter<void>();

  query = '';
  suggestions: SlpPlace[] = [];
  selectedPlace: SlpPlace | null = null;
  pickerError = '';

  constructor(private places: SlpPlaceService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['city'] ||
      changes['region'] ||
      changes['country']
    ) {
      this.selectedPlace = this.city
        ? {
            city: this.city,
            region: this.region,
            country: this.country,
            label: this.places.format(this.city, this.region, this.country),
          }
        : null;
      this.query = this.selectedPlace?.label || '';
      this.suggestions = this.places.search(this.query);
      this.pickerError = '';
    }
  }

  onQueryChange(value: string): void {
    this.query = value;
    this.selectedPlace = null;
    this.pickerError = '';
    this.suggestions = this.places.search(value);
  }

  choosePlace(place: SlpPlace): void {
    this.selectedPlace = place;
    this.query = place.label;
    this.suggestions = [];
    this.pickerError = '';
  }

  submit(): void {
    const place = this.selectedPlace || this.places.parse(this.query);
    if (!place?.city || !place.country) {
      this.pickerError =
        'Choose a city suggestion, or type a city with state/country.';
      return;
    }

    this.saveLocation.emit({
      city: place.city,
      region: place.region,
      country: place.country,
    });
  }
}
