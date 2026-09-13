import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SeoService } from '../services/seo.service';

// Metadata only: never import a game's source, renderer, or dependencies here.
const GAMES = [
  {
    slug: 'lost-in-orbit',
    number: '01',
    title: 'Lost in Orbit',
    image: '/assets/games/lost-in-orbit.svg',
    href: '/games/lost-in-orbit/',
    copy: 'games.orbit',
    duration: 'games.duration',
  },
  {
    slug: 'last-light',
    number: '02',
    title: 'Last Light',
    image: '/assets/games/last-light.png',
    href: '/games/last-light/',
    copy: 'games.lastLight',
    duration: 'games.lastLight.duration',
  },
];

@Component({
  selector: 'app-games-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './games-catalog.component.html',
  styleUrls: ['./games-catalog.component.css'],
})
export class GamesCatalogComponent implements OnInit {
  readonly games = GAMES;
  constructor(private seo: SeoService) {}
  ngOnInit() {
    this.seo.updateMetaTags({
      title: 'Games · Global Solutions Lab',
      robots: 'noindex, nofollow',
      description:
        'Play Lost in Orbit and Last Light: 3D adventures about resourcefulness, rescue, and bringing power to the people who need it.',
      url: 'https://newworld-game.org/games',
    });
  }
}
