import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrl: './features.component.css',
})
export class FeaturesComponent implements OnInit {
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}
