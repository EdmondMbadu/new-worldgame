import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Slide } from 'src/app/models/presentation';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-presentation-viewer',
  templateUrl: './presentation-viewer.component.html',
  styleUrls: ['./presentation-viewer.component.css'],
})
export class PresentationViewerComponent implements OnInit {
  slides: Slide[] = [];
  i = 0;
  get slide() {
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
    this.db
      .getPresentationById(sid, pid)
      .subscribe((p: any) => (this.slides = p.slides));
  }

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

  @HostListener('document:keydown.arrowRight') kNext() {
    this.next();
  }
  @HostListener('document:keydown.arrowLeft') kPrev() {
    this.prev();
  }
  @HostListener('document:keydown.escape') kEsc() {
    this.close();
  }
}
