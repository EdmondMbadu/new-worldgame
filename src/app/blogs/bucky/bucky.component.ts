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
    '“When I am working on a problem, I never think about beauty. But when I have finished, if the solution is not beautiful, I know it is wrong.”',
    '“The best way to predict the future is to design it.”',
    '“Dare to be naïve.”',
    '“Pollution is nothing but the resources we are not harvesting. We allow them to disperse because we’ve been ignorant of their value.”',
    '“Humanity is acquiring all the right technology for all the wrong reasons.”',
    '“I just invent, then wait until man comes around to needing what I’ve invented.”',
    '“Integrity is the essence of everything successful.”',
    '“The minute you choose to do what you really want to do, it’s a different kind of life.”',
    '“Nature is trying very hard to make us succeed, but nature does not depend on us. We are not the only experiment.”',
    '“Don’t try to make me consistent. I am learning all the time.”',
    '“I’m not trying to imitate nature. I’m trying to find the principles she’s using.”',
    '“Sometimes I think we’re alone in the universe, and sometimes I think we’re not. In either case, the idea is quite staggering.”',
    '“There is no such thing as a failed experiment, only experiments with unexpected outcomes.”',
    '“War is the ultimate tool of politics... It is obsolete and destructive in today’s interconnected world.”',
    '“You can’t better the world by simply talking to it. Philosophy to be effective must be mechanically applied.”',
    '“We are all astronauts on a little spaceship called Earth.”',
  ];

  currentQuoteIndex = 0;
  private intervalId!: number;

  images = [
    'https://i0.wp.com/www.bfi.org/wp-content/uploads/2022/02/bucky-foster-wide.jpeg?w=940&ssl=1',
    'https://www.buckminsterfuller.net/images/home/k13_66-L-1.jpg',
    'https://www.buckminsterfuller.net/images/home/22_606%20copy%202-1.jpg',
    'https://www.buckminsterfuller.net/images/home/Bucky%20with%20model%20copy.jpg',
    'https://designsciencelab.com/wordpress/wp-content/uploads/2016/03/Bucky-Meddie_party-1.jpg',
    'https://designsciencelab.com/wordpress/wp-content/uploads/2021/12/BFullerTimeCover.jpg',
    'https://www.buckminsterfuller.net/images/home/Img025.jpg',
    'https://designsciencelab.com/wordpress/wp-content/uploads/2016/03/Bucky-Meddie_dome-1.jpg',
    'https://designsciencelab.com/wordpress/wp-content/uploads/2021/12/Expo.jpg',
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
