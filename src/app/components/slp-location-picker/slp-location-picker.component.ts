import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { of, Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  finalize,
  switchMap,
} from 'rxjs/operators';
import { SlpPlace, SlpPlaceService } from 'src/app/services/slp-place.service';

@Component({
  selector: 'app-slp-location-picker',
  templateUrl: './slp-location-picker.component.html',
  styleUrls: ['./slp-location-picker.component.css'],
})
export class SlpLocationPickerComponent
  implements OnChanges, OnDestroy, OnInit
{
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
  remoteSearching = false;
  hasRemoteSuggestions = false;
  private readonly queryChanges = new Subject<string>();
  private remoteSearchSub?: Subscription;

  constructor(private places: SlpPlaceService) {}

  ngOnInit(): void {
    this.remoteSearchSub = this.queryChanges
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((value) => {
          if (this.selectedPlace || String(value || '').trim().length < 3) {
            this.remoteSearching = false;
            return of([]);
          }

          this.remoteSearching = true;
          return this.places.searchRemote(value).pipe(
            finalize(() => {
              this.remoteSearching = false;
            })
          );
        })
      )
      .subscribe((remotePlaces) => {
        if (this.selectedPlace) {
          return;
        }

        const localPlaces = this.places.search(this.query);
        this.hasRemoteSuggestions = remotePlaces.length > 0;
        this.suggestions = this.mergeSuggestions(localPlaces, remotePlaces);
      });
  }

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
      this.hasRemoteSuggestions = false;
      this.pickerError = '';
    }
  }

  ngOnDestroy(): void {
    this.remoteSearchSub?.unsubscribe();
    this.queryChanges.complete();
  }

  onQueryChange(value: string): void {
    this.query = value;
    this.selectedPlace = null;
    this.pickerError = '';
    this.hasRemoteSuggestions = false;
    this.suggestions = this.places.search(value);
    this.queryChanges.next(value);
  }

  choosePlace(place: SlpPlace): void {
    this.selectedPlace = place;
    this.query = place.label;
    this.suggestions = [];
    this.hasRemoteSuggestions = false;
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

  private mergeSuggestions(
    localPlaces: SlpPlace[],
    remotePlaces: SlpPlace[]
  ): SlpPlace[] {
    const seen = new Set<string>();
    return [...localPlaces, ...remotePlaces].filter((place) => {
      const key = place.label.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
