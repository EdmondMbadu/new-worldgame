import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.css',
})
export class PrivacyComponent implements OnInit {
  constructor() {}
  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
