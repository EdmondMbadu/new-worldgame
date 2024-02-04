import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataService } from 'src/app/services/data.service';

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
    this.themeSubscription = this.data.currentTheme.subscribe((theme) => {
      document.documentElement.style.setProperty(
        '--after-background-color',
        theme === 'dark' ? 'rgb(15, 23, 42)' : 'white'
      );
    });

    window.scroll(0, 0);
  }

  ngOnDestroy() {
    this.themeSubscription!.unsubscribe();
  }
}
