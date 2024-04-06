import {
  Component,
  ElementRef,
  HostListener,
  QueryList,
  ViewChildren,
} from '@angular/core';

@Component({
  selector: 'app-instructions',
  templateUrl: './instructions.component.html',
  styleUrl: './instructions.component.css',
})
export class InstructionsComponent {
  @ViewChildren('section') sections?: QueryList<ElementRef>;
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  currentActive? = 0;

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event): void {
    let currentSectionIndex = this.sections
      ?.toArray()
      .findIndex((section, index) => {
        const element = section.nativeElement;
        if (
          window.pageYOffset >= element.offsetTop &&
          window.pageYOffset < element.offsetTop + element.offsetHeight
        ) {
          return true;
        }
        return false;
      });

    if (
      currentSectionIndex !== -1 &&
      currentSectionIndex !== this.currentActive
    ) {
      this.currentActive = currentSectionIndex;
    }
  }

  scrollTo(section: any) {
    document.querySelector('#' + section)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });
  }
}
