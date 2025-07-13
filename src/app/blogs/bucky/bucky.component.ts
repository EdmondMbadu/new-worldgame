import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-bucky',
  templateUrl: './bucky.component.html',
  styleUrl: './bucky.component.css',
})
export class BuckyComponent implements OnInit, OnDestroy {
  quotes: string[] = [
    '“We are called to be architects of the future, not its victims.”',
    '“There is nothing in a caterpillar that tells you it’s going to be a butterfly.”',
    '“Don’t fight forces, use them.”',
    '“You never change things by fighting the existing reality. To change something, build a new model that makes the existing model obsolete.”',
  ];
  currentQuoteIndex = 0;
  private intervalId!: number;

  images = [
    'https://i0.wp.com/www.bfi.org/wp-content/uploads/2022/02/bucky-foster-wide.jpeg?w=940&ssl=1',
    'https://www.buckminsterfuller.net/images/home/k13_66-L-1.jpg',
    'https://www.buckminsterfuller.net/images/home/22_606%20copy%202-1.jpg',
  ];
  // timers
  private quoteTimer!: number;
  private imgTimer!: number;
  imgIdx = 0;

  ngOnInit(): void {
    // rotate quotes every 7 s
    this.quoteTimer = window.setInterval(() => {
      this.currentQuoteIndex =
        (this.currentQuoteIndex + 1) % this.quotes.length;
    }, 7000);

    // rotate images every 6 s
    this.imgTimer = window.setInterval(() => {
      this.imgIdx = (this.imgIdx + 1) % this.images.length;
    }, 6000);
  }

  ngOnDestroy(): void {
    clearInterval(this.quoteTimer);
    clearInterval(this.imgTimer);
  }
}
