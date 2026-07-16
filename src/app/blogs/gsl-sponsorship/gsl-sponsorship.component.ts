import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-gsl-sponsorship',
    templateUrl: './gsl-sponsorship.component.html',
    styleUrls: ['./gsl-sponsorship.component.css'],
    standalone: false
})
export class GslSponsorshipComponent implements OnInit {
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}
