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
  // async ngAfterViewInit(): Promise<void> {
  //   try {
  //     await this.data.loadScript('https://www.amcharts.com/lib/4/core.js');
  //     await this.data.loadScript('https://www.amcharts.com/lib/4/maps.js');
  //     await this.data.loadScript(
  //       'https://www.amcharts.com/lib/4/geodata/worldLow.js'
  //     );
  //     await this.data.loadScript(
  //       'https://www.amcharts.com/lib/4/themes/animated.js'
  //     );

  //     this.initializeGlobe();
  //   } catch (error) {
  //     console.error('Failed to load amCharts scripts', error);
  //   }
  // }
  // initializeGlobe(): void {
  //   // Your amCharts initialization code here
  //   am4core.useTheme(am4themes_animated);

  //   let chart = am4core.create(
  //     this.globeContainer!.nativeElement,
  //     am4maps.MapChart
  //   );

  //   chart.geodata = am4geodata_worldLow;
  //   chart.projection = new am4maps.projections.Orthographic();
  //   chart.panBehavior = 'rotateLongLat';
  //   chart.deltaLatitude = -20;

  //   const containerWidth = this.globeContainer!.nativeElement.clientWidth;
  //   const containerHeight = this.globeContainer!.nativeElement.clientHeight;
  //   const minDimension = Math.min(containerWidth, containerHeight);
  //   // chart.projection.scale(minDimension / 2); // Adjust this as necessary
  //   chart.padding(0, 0, 0, 0);
  //   // Adjust the scale of the globe

  //   // chart.projection.scale = 500; // Increase this value to make the globe larger

  //   let polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
  //   polygonSeries.useGeodata = true;

  //   let polygonTemplate = polygonSeries.mapPolygons.template;
  //   polygonTemplate.tooltipText = '{name}';
  //   polygonTemplate.fill = am4core.color('#000000');
  //   polygonTemplate.stroke = am4core.color('#ffffff');
  //   polygonTemplate.strokeWidth = 0.5;
  //   polygonTemplate.cursorOverStyle = am4core.MouseCursorStyle.pointer;

  //   let graticuleSeries = chart.series.push(new am4maps.GraticuleSeries());
  //   graticuleSeries.mapLines.template.line.stroke = am4core.color('#000');
  //   graticuleSeries.mapLines.template.line.strokeOpacity = 0.08;
  //   graticuleSeries.fitExtent = false;

  //   chart.backgroundSeries.mapPolygons.template.polygon.fillOpacity = 0.1;
  //   chart.backgroundSeries.mapPolygons.template.polygon.fill =
  //     am4core.color('#000');

  //   let hs = polygonTemplate.states.create('hover');
  //   hs.properties.fill = chart.colors.getIndex(0).brighten(-0.5);

  //   let animation: any;
  //   setTimeout(function () {
  //     animation = chart.animate(
  //       { property: 'deltaLongitude', to: 100000 },
  //       5000000
  //     );
  //   }, 3000);

  //   chart.seriesContainer.events.on('down', function () {
  //     animation.stop();
  //   });
  // }
}
