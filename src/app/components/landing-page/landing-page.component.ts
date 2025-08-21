import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { json } from 'express';
import { Subscription } from 'rxjs';
import { DataService } from 'src/app/services/data.service';

declare var am4core: any;
declare var am4maps: any;
declare var am4geodata_worldLow: any;
declare var am4themes_animated: any;
@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
})
export class LandingPageComponent implements OnInit {
  themeSubscription?: Subscription;

  constructor(private data: DataService) {}
  colorTheme: string = 'rgb(15, 23, 42)';
  ngOnInit(): void {
    window.scroll(0, 0);
    this.themeSubscription = this.data.currentTheme.subscribe((theme) => {
      document.documentElement.style.setProperty(
        '--after-background-color',
        theme === 'dark' ? 'rgb(15, 23, 42)' : 'white'
      );
    });

    // Check if dark mode was initialized before
  }
  @ViewChild('globeContainer', { static: true }) globeContainer:
    | ElementRef
    | undefined;

  ngOnDestroy() {
    this.themeSubscription!.unsubscribe();
  }
}
