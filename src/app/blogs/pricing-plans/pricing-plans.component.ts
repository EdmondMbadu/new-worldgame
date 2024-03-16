import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-pricing-plans',
  templateUrl: './pricing-plans.component.html',
  styleUrl: './pricing-plans.component.css',
})
export class PricingPlansComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
