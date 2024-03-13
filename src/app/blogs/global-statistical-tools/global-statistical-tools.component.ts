import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-global-statistical-tools',
  templateUrl: './global-statistical-tools.component.html',
  styleUrl: './global-statistical-tools.component.css',
})
export class GlobalStatisticalToolsComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
