import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
// import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import * as Editor from 'ckeditor5-custom-build/build/ckeditor';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { Element } from '@angular/compiler';
import { Router } from '@angular/router';
import { SolutionService } from 'src/app/services/solution.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Comment, Evaluator, Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { TimeService } from 'src/app/services/time.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { environment } from 'environments/environments';

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
  loader: any;
  apiKey: string = environment.tinyApiKey;
  displayPopupInfo: boolean = false;
  displayCongrats: boolean = false;
  etAl: string = '';
  editorConfig: any = {
    height: 500,
    menubar: true,
    selector: 'textarea',
    plugins: [
      'advlist',
      'advcode',
      'advtable',
      'autolink',
      'checklist',
      'markdown',
      'lists',
      'link',
      'image',
      'charmap',
      'preview',
      'anchor',
      'searchreplace',
      'visualblocks',
      'fullscreen',
      'formatpainter',
      'insertdatetime',
      'media',
      'table',
      'help',
      'wordcount',
      'export',
    ],
    toolbar:
      'undo redo | casechange blocks | bold italic backcolor | \
              alignleft aligncenter alignright alignjustify | \
              bullist numlist checklist outdent indent | removeformat | \
              a11ycheck code table help export',
    branding: false,
    // setup: (editor: any) => {
    //   editor.on('init', () => {
    //     // editor.setContent(this.contentsArray[i]);
    //   });
    //   // Add keyup event handler
    //   editor.on('keyup', () => {
    //     console.log('Content being typed:', this.data);
    //   });
    // },
  };

  displayPopups: boolean[] = [];
  newTitle: string = '';
  clickedDisplayPopups: boolean[] = [];
  currentSolution: Solution = {};
  staticContentArray: string[] = [];
  saveSuccess: boolean = false;
  evaluators: Evaluator[] = [];
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
  @Output() submissionComplete: EventEmitter<any> = new EventEmitter();
  updateTitleBox: boolean = false;
  constructor(
    private router: Router,
    private solution: SolutionService,
    private auth: AuthService,
    private fns: AngularFireFunctions,
    private time: TimeService,
    private storage: AngularFireStorage
  ) {}
  data: string = '';
  discussion: Comment[] = [];
  hoverChangeTitle: boolean = false;
  ngOnInit() {
    window.scrollTo(0, 0);
    this.initializeContents();
    this.solution.getSolution(this.solutionId).subscribe((data: any) => {
      this.currentSolution = data;
      if (this.currentSolution.discussion !== undefined) {
        this.discussion = this.currentSolution.discussion;
        this.displayTimeDiscussion();
      }
      // fill the evaluator class
      this.currentSolution.evaluators?.forEach((ev: any) => {
        this.evaluators.push(ev);
      });
      this.etAl =
        Object.keys(this.currentSolution.participants!).length > 1
          ? 'Et al'
          : '';
      this.initializeContents();
    });

    this.displayPopups = new Array(this.questions.length).fill(false);
    this.clickedDisplayPopups = new Array(this.questions.length).fill(false);
  }
  displayTimeDiscussion() {
    this.discussion.forEach((data) => {
      data.displayTime = this.time.formatDate(data.date!);
    });
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
      this.currentSolution.status[this.questionsTitles[0]]
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

  public Editor: any = Editor;
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
    }

    this.elements.length = 0;
  }

  accept() {
    this.submitDisplay = false;
    this.submiResponse = true;
    this.finallySubmitSolution();
    // Reset submission response to allow future submissions, but only after current process is complete
    this.submiResponse = false;
  }

  finallySubmitSolution() {
    try {
      this.solution
        .submitSolution(this.solutionId, this.contentsArray[0])
        .then(() => {
          console.log('Submission successful, sending request for evaluation.');
          this.submissionComplete.emit(); // Emit event to parent
          this.toggleCongrats();
          // Additional logic on successful submission
        });
    } catch (error) {
      alert('An error occured while submitting the solution. Try again');
      console.log(error);
    }
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

  saveSolutionStatus() {
    if (
      JSON.stringify(this.contentsArray) !==
      JSON.stringify(this.staticContentArray)
    ) {
      for (let i = 0; i < this.contentsArray.length; i++) {
        this.questionsAndAnswersTracker![`${this.questionsTitles[i]}`] =
          this.contentsArray[i];
      }

      if (
        // this is some risky business. Say that you saved but don't save.
        // this is because we want to keep the last changes for submission.
        this.questionsTitles.length === 1 &&
        this.currentSolution.status !== undefined
      ) {
        this.saveSuccess = true;
      } else {
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
    // console.log('current soltution status', this.currentSolution.status);
    // console.log('array ', array);

    array.sort((a, b) => {
      // Split both elements by '-' and assign default values for prefix and suffix
      let [aPrefix, aSuffix = ''] = a.split('-');
      let [bPrefix, bSuffix = ''] = b.split('-');

      // Compare the prefixes
      const prefixComparison = aPrefix.localeCompare(bPrefix);
      if (prefixComparison === 0) {
        // If the prefix is the same, compare the suffixes
        return aSuffix.localeCompare(bSuffix);
      }

      return prefixComparison;
    });
    let styles = `text-left text-xl font-bold  my-4`;
    let titles = [
      `<h1 class="text-left text-xl font-bold my-4"> Preferred State  </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Plan </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Implementation</h1>`,
    ];

    // console.log(' all the keys', array);

    // console.log('what is content array content', this.contentsArray);

    this.contentsArray[0] += `<h1 class="text-left text-xl font-bold my-4"> Problem State    </h1>`;

    for (let i = 0, t = 1, j = 0; i < array.length - 1; i++, t++) {
      if (
        t < array.length - 2 &&
        !array[i].startsWith(array[t].substring(0, 2))
      ) {
        // console.log('displaying ', array[i], array[t]);
        this.contentsArray[0] += titles[j];
        j++;
      }
      this.contentsArray[0] += `\n${this.currentSolution.status![array[i]]}`;
      // console.log('contents array ', this.contentsArray[0]);
      this.staticContentArray[0] += `\n${
        this.currentSolution.status![array[i]]
      }`;
    }
  }
  onHoverPopup(index: number) {
    this.displayPopups[index] = true;
  }
  onLeavePopup(index: number) {
    this.displayPopups[index] = false;
  }
  closePopups(index: number) {
    this.clickedDisplayPopups[index] = false;
  }
  openPopups(index: number) {
    this.clickedDisplayPopups[index] = true;
  }

  onHoverChangeTitle() {
    this.hoverChangeTitle = !this.hoverChangeTitle;
  }
  onLeaveChangeTitle() {
    this.hoverChangeTitle = !this.hoverChangeTitle;
  }
  toggleUpdateTitle() {
    this.updateTitleBox = !this.updateTitleBox;
  }

  updateTitile() {
    if (this.newTitle !== '') {
      this.solution
        .updateSolutionTitle(this.currentSolution.solutionId!, this.newTitle)
        .then(() => {
          this.title = this.newTitle;
          this.toggleUpdateTitle();
        })
        .catch((error: any) => {
          alert('Error occured while updating title. Try again!');
        });
    } else {
      alert('Enter a title');
    }
  }

  openFeedback() {
    const url =
      'https://docs.google.com/forms/d/e/1FAIpQLSdmK6F4EDAvXNZsuUBYdQ4CW1h9hIdlA44qYajMsmHBNa4jrQ/viewform?usp=sf_link';
    window.open(url, '_blank');
    this.toggleCongratsAndDone();
  }

  toggleCongrats() {
    this.displayCongrats = !this.displayCongrats;
  }
  toggleCongratsAndDone() {
    this.displayCongrats = !this.displayCongrats;
    this.router.navigate(['/home']);
  }
  testCORS() {
    fetch('https://us-central1-new-worldgame.cloudfunctions.net/uploadImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ',
      },
      body: JSON.stringify({ data: 'test' }),
    })
      .then((response) => response.text())
      .then((data) => console.log(data))
      .catch((error) => console.error('Error:', error));
  }
}
