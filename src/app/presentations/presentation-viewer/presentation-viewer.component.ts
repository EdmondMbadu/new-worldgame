import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Slide } from 'src/app/models/presentation';
import { DataService } from 'src/app/services/data.service';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
} from '@angular/animations';

/* ────────────────────────────────────────────────────────────────
   SLIDE HELPER  ➜ returns the choreography for one direction
──────────────────────────────────────────────────────────────── */
function slide(dir: 'left' | 'right') {
  const offset = dir === 'left' ? '-60px' : '60px';
  return [
    /* stack the two pages on top of each other */
    query(
      ':enter, :leave',
      [style({ position: 'absolute', top: 0, left: 0, width: '100%' })],
      { optional: true }
    ),

    /* incoming page just outside the view */
    query(
      ':enter',
      [style({ opacity: 0, transform: `translateX(${offset}) scale(0.98)` })],
      { optional: true }
    ),

    /* animate them together */
    group([
      query(
        ':leave',
        [
          animate(
            '350ms ease',
            style({
              opacity: 0,
              transform: `translateX(${
                dir === 'left' ? '60px' : '-60px'
              }) scale(0.98)`,
            })
          ),
        ],
        { optional: true }
      ),
      query(
        ':enter',
        [animate('350ms ease', style({ opacity: 1, transform: 'none' }))],
        { optional: true }
      ),
    ]),
  ];
}

/* ────────────────────────────────────────────────────────────────
   THE ACTUAL TRIGGER
──────────────────────────────────────────────────────────────── */
export const pageTransition = trigger('pageTransition', [
  transition(':increment', slide('right')), // next
  transition(':decrement', slide('left')), // previous
]);

@Component({
  selector: 'app-presentation-viewer',
  templateUrl: './presentation-viewer.component.html',
  styleUrls: ['./presentation-viewer.component.css'],
  animations: [pageTransition],
})
export class PresentationViewerComponent implements OnInit {
  slides: Slide[] = [];
  presentationName = '';
  i = 0;

  zoom = 1; // 1.0 = 100 %
  readonly minZoom = 0.5;
  readonly maxZoom = 2;

  get slide(): Slide {
    return this.slides[this.i];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: DataService
  ) {}

  ngOnInit() {
    const sid = this.route.snapshot.paramMap.get('solutionId')!;
    const pid = this.route.snapshot.paramMap.get('presentationId')!;
    this.db.getPresentationById(sid, pid).subscribe((p: any) => {
      this.slides = p.slides;
      this.presentationName = p.name;
    });
  }

  /* navigation --------------------------------------------------- */
  next() {
    this.i < this.slides.length - 1 ? this.i++ : this.close();
  }
  prev() {
    if (this.i) {
      this.i--;
    }
  }
  close() {
    this.router.navigate(['../..'], { relativeTo: this.route });
  }

  /* keyboard shortcuts ------------------------------------------- */
  @HostListener('document:keydown.arrowRight') kNext() {
    this.next();
  }
  @HostListener('document:keydown.arrowLeft') kPrev() {
    this.prev();
  }
  @HostListener('document:keydown.escape') kEsc() {
    this.close();
  }

  /* share / zoom ------------------------------------------------- */
  copyLink() {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => alert('Link copied to clipboard!'));
  }

  zoomIn() {
    if (this.zoom < this.maxZoom) this.zoom = +(this.zoom + 0.1).toFixed(2);
  }
  zoomOut() {
    if (this.zoom > this.minZoom) this.zoom = +(this.zoom - 0.1).toFixed(2);
  }
}
