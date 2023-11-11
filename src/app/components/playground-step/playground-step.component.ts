import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { Element } from '@angular/compiler';
import { Router } from '@angular/router';
import { SolutionService } from 'src/app/services/solution.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user';

export interface FeedbackRequest {
  authorId?: string;
  evaluated?: string;
}
@Component({
  selector: 'app-playground-step',
  templateUrl: './playground-step.component.html',
  styleUrls: ['./playground-step.component.css'],
})
export class PlaygroundStepComponent {
  currentSolution: Solution = {};
  staticContentArray: string[] = [];
  saveSuccess: boolean = false;
  saveError: boolean = false;
  submiResponse: boolean = false;
  submitDisplay: boolean = false;
  @Input() title?: string = '';
  @Input() buttonText: string = '';
  @Input() step: string = '';
  @Input() solutionId: string = '';
  @Input() questions: string[] = [];
  @Input() questionsTitles: string[] = [];
  @Input() stepNumber: number = 0;
  @Output() buttonInfoEvent = new EventEmitter<number>();
  contentsArray: string[] = [];
  questionsAndAnswersTracker?: { [key: string]: string } = {};
  scrollHandler: (() => void) | undefined;
  elements: any = [];
  constructor(
    private router: Router,
    private solution: SolutionService,
    private auth: AuthService
  ) {}
  data: string = '';
  ngOnInit() {
    this.initializeContents();
    this.solution.getSolution(this.solutionId).subscribe((data: any) => {
      this.currentSolution = data;
      this.initializeContents();
    });
    this.scrollHandler = () => {
      // Get the current scroll position
      this.elements = [];
      // Get the element that we want to change the z-index of

      for (let i = 0; i < this.questions.length; i++) {
        this.elements.push(document.getElementById(`box-${i}`));
      }

      for (let i = 0; i < this.elements.length; i++) {
        const element = document.getElementById(`box-${i}`);
        let elementY = this.elements[i]?.getBoundingClientRect().top;
        if (elementY! <= 110) {
          element!.style.zIndex = '-1';
        } else {
          element!.style.zIndex = '0';
        }
      }
    };

    // Add a scroll event listener to the window
    window.addEventListener('scroll', this.scrollHandler);
  }

  initializeContents() {
    this.contentsArray = [];
    this.staticContentArray = [];
    for (let q of this.questions) {
      this.contentsArray.push('');
      this.staticContentArray.push('');
    }
    if (
      this.questionsTitles.length === 1 &&
      this.currentSolution.status !== undefined
    ) {
      this.initializeStrategy();
    } else if (
      this.currentSolution.status !== undefined &&
      this.currentSolution.status![this.questionsTitles[0]]
    ) {
      this.contentsArray = [];
      this.staticContentArray = [];
      for (let i = 0; i < this.questionsTitles.length; i++) {
        this.contentsArray.push(
          this.currentSolution.status![this.questionsTitles[i]]
        );
        this.staticContentArray.push(
          this.currentSolution.status![this.questionsTitles[i]]
        );
      }
    }
  }

  public Editor = ClassicEditor;
  public onReady(editor: any) {
    // console.log('CKEditor5 Angular Component is ready to use!', editor);
  }

  updatePlayground(current: number) {
    // only save data if both are different.

    this.saveSolutionStatus();

    // console.log('The data', this.questionsAndAnswersTracker);
    if (this.buttonText === 'Next') {
      current++;
      this.buttonInfoEvent.emit(current);
    } else {
      this.submitDisplay = true;
      // let conf = confirm('Are you sure you want to Submit?');
      if (this.submiResponse) {
        this.solution.submitSolution(this.solutionId, this.contentsArray[0]);

        // this.sendRequestForEvaluation();

        window.removeEventListener('scroll', this.scrollHandler!);
        this.router.navigate(['/home']);
      } else {
        return;
      }
    }

    this.elements.length = 0;
  }

  accept() {
    this.submiResponse = true;
    this.updatePlayground(this.stepNumber);
  }

  isNotEmpty(content: string) {
    if (content === '') {
      return true;
    }
    return false;
  }
  isInputInValid() {
    for (let content of this.contentsArray) {
      if (content === '') {
        return true;
      }
    }
    return false;
  }
  ngOnDestroy() {
    window.removeEventListener('scroll', this.scrollHandler!);
  }

  saveSolutionStatus() {
    if (
      JSON.stringify(this.contentsArray) !==
      JSON.stringify(this.staticContentArray)
    ) {
      for (let i = 0; i < this.contentsArray.length; i++) {
        this.questionsAndAnswersTracker![`${this.questionsTitles[i]}`] =
          this.contentsArray[i];
      }
      // save solution
      this.solution
        .saveSolutionStatus(this.solutionId, this.questionsAndAnswersTracker)
        .then(() => {
          this.saveSuccess = true;
        })
        .catch((error) => {
          this.saveError = true;
          // alert('Error launching solution ');
        });
    }
  }

  closeSaveSuccess() {
    this.saveSuccess = false;
  }
  closeSaveError() {
    this.saveError = false;
  }
  closeSubmission() {
    this.submitDisplay = false;
  }

  initializeStrategy() {
    let array: string[] = [];
    this.contentsArray = [''];
    this.staticContentArray = [''];
    if (this.currentSolution.status) {
      Object.keys(this.currentSolution.status).forEach((key) => {
        array.push(key);
      });
    }
    array.sort((a, b) => {
      // Compare the prefix (e.g., "S1", "S2", etc.)
      const prefixComparison = a.split('-')[0].localeCompare(b.split('-')[0]);

      // If the prefix is the same, compare the suffix (e.g., "A", "B", etc.)
      if (prefixComparison === 0) {
        return a.split('-')[1].localeCompare(b.split('-')[1]);
      }

      return prefixComparison;
    });
    let styles = `text-left text-xl font-bold  my-4`;
    let titles = [
      `<h1 class="text-left text-xl font-bold my-4"> Preferred State  </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Plan </h1>`,
    ];

    console.log(' all the keys', array);

    this.contentsArray[0] += `<h1 class="text-left text-xl font-bold my-4"> Problem State    </h1>`;

    for (let i = 0, t = 1, j = 0; i < array.length - 1; i++, t++) {
      if (
        t < array.length - 2 &&
        !array[i].startsWith(array[t].substring(0, 2))
      ) {
        console.log('displaying ', array[i], array[t]);
        this.contentsArray[0] += titles[j];
        j++;
      }
      this.contentsArray[0] += `\n${this.currentSolution.status![array[i]]}`;
      // console.log('contents array ', this.contentsArray[0]);
      this.staticContentArray[0] += `\n${
        this.currentSolution.status![array[i]]
      }`;
      // console.log('the static array ', this.staticContentArray[0]);
    }
  }
}
