import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// ng serve falls back to Angular for directory URLs. Load the exact static entry
// in its own document. Hosting and the combined dev proxy serve it directly.
@Component({
  selector: 'app-game-launcher',
  standalone: true,
  template: `<iframe
    [src]="source"
    [title]="title"
    allow="autoplay; fullscreen; gamepad"
    allowfullscreen
  ></iframe>`,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #070b1a;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }
    `,
  ],
})
export class GameLauncherComponent {
  readonly source: SafeResourceUrl;
  readonly title: string;
  constructor(route: ActivatedRoute, sanitizer: DomSanitizer) {
    const lastLight = route.snapshot.data['game'] === 'last-light';
    this.title = lastLight ? 'Last Light' : 'Lost in Orbit';
    this.source = sanitizer.bypassSecurityTrustResourceUrl(
      lastLight ? '/games/last-light/index.html' : '/games/lost-in-orbit/index.html'
    );
  }
}
