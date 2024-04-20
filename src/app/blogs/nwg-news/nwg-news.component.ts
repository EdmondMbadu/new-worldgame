import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-nwg-news',

  templateUrl: './nwg-news.component.html',
  styleUrl: './nwg-news.component.css',
})
export class NwgNewsComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 200);
  }
}
