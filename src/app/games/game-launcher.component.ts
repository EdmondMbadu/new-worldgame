import { Component } from '@angular/core';

// ng serve falls back to Angular for directory URLs. Load the exact static entry
// in its own document. Hosting and the combined dev proxy serve it directly.
@Component({
  selector: 'app-game-launcher',
  standalone: true,
  template: `<iframe
    src="/games/lost-in-orbit/index.html"
    title="Lost in Orbit"
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
export class GameLauncherComponent {}
