import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

@Directive({
  selector: '[appSrcObject]',
})
export class SrcObjectDirective implements OnChanges {
  @Input('appSrcObject') srcObject: any = null;

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if ('srcObject' in changes) {
      const videoElement: any = this.el.nativeElement as HTMLVideoElement;
      if ('srcObject' in videoElement) {
        videoElement.srcObject = this.srcObject;
      } else {
        videoElement.src = URL.createObjectURL(this.srcObject);
      }
    }
  }
}
