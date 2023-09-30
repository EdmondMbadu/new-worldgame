import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { Element } from '@angular/compiler';
import { Router } from '@angular/router';

@Component({
  selector: 'app-playground-step',
  templateUrl: './playground-step.component.html',
  styleUrls: ['./playground-step.component.css'],
})
export class PlaygroundStepComponent {
  @Input() title: string = '';
  @Input() buttonText: string = '';
  @Input() step: string = '';
  @Input() questions: string[] = [];
  @Input() stepNumber: number = 0;
  @Output() buttonInfoEvent = new EventEmitter<number>();
  scrollHandler: (() => void) | undefined;
  elements: any = [];
  constructor(private router: Router) {}
  data: string = '';
  ngOnInit() {
    this.scrollHandler = () => {
      // Get the current scroll position
      this.elements = [];
      // Get the element that we want to change the z-index of

      for (let i = 0; i < this.questions.length; i++) {
        this.elements.push(document.getElementById(`box-${i}`));
      }
      // console.log('current element ', this.elements.length);

      for (let i = 0; i < this.elements.length; i++) {
        const element = document.getElementById(`box-${i}`);
        let elementY = this.elements[i]?.getBoundingClientRect().top;
        if (elementY! <= 65) {
          element!.style.zIndex = '-30';
        } else {
          element!.style.zIndex = '0';
        }
      }

      // If the scroll position is greater than or equal to the element's position,
      // then change the element's z-index
    };

    // Add a scroll event listener to the window
    window.addEventListener('scroll', this.scrollHandler);
  }

  public Editor = ClassicEditor;
  public onReady(editor: any) {
    // console.log('CKEditor5 Angular Component is ready to use!', editor);
  }
  public onChange({ editor }: any) {
    const currentData = editor.getData();
    // console.log(data);
    this.data = currentData;
  }

  updatePlayground(current: number) {
    if (this.buttonText === 'Next') {
      current++;
      // console.log('current number', current);
      this.buttonInfoEvent.emit(current);
    } else {
      let conf = confirm('Are you you want to Submit?');
      if (conf) {
        window.removeEventListener('scroll', this.scrollHandler!);
        this.router.navigate(['/home']);
      } else {
        return;
      }
    }

    // this.elements.length = 0;
  }
  ngOnDestroy() {
    window.removeEventListener('scroll', this.scrollHandler!);
  }
}
