import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  problems: string[] = [
    'Ending Poverty',
    'Inequality and Poverty',
    'Mental Health',
  ];
}
