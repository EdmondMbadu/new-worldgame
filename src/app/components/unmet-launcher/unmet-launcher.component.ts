import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';

// /unmet is a standalone document (see the unmet/ folder), not part of this
// app. Hosting serves it directly. This component only exists so that an
// in-app link or ng serve, which fall back to Angular for directory URLs,
// still land on the real page.
//
// It must confirm the static page is really there before handing over.
// Angular reads "/unmet/index.html" as "/unmet", so redirecting blindly when
// the page has not been built sends the browser round in a loop.
@Component({
  selector: 'app-unmet-launcher',
  standalone: true,
  template: `
    <div class="missing" [hidden]="!missing">
      <p class="title">Unmet has not been built yet.</p>
      <p>Stop the dev server, then run <code>npm start</code> again. It builds the page before serving.</p>
      <p>For real numbers instead of sample data, run <code>npm run unmet:data</code> first.</p>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        background: #08090b;
        color: #e9e5db;
        font: 15px/1.6 system-ui, sans-serif;
      }
      .missing {
        max-width: 30rem;
        padding: 2rem;
      }
      .title {
        font-size: 1.4rem;
        margin: 0 0 0.75rem;
      }
      code {
        font-family: ui-monospace, Menlo, monospace;
        color: #ff6e30;
      }
    `,
  ],
})
export class UnmetLauncherComponent implements OnInit {
  missing = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const page = '/unmet/index.html';
    fetch(page, { cache: 'no-store' })
      .then((response) => (response.ok ? response.text() : ''))
      .then((html) => {
        // The real page carries this marker; Angular's own index.html does not.
        if (html.includes('window.UNMET=')) {
          window.location.replace(page + window.location.search);
        } else {
          this.missing = true;
        }
      })
      .catch(() => {
        this.missing = true;
      });
  }
}
