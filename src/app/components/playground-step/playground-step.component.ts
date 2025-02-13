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
  strategyReviewSelected: boolean = false;
  defaultReviewSelected = true;
  chosenColorDefault = 'font-bold text-xl';
  chosenColorReview = '';
  loader: any;
  titles = [
    `<h1 class="text-left text-xl font-bold my-4"> Problem State </h1>`,
    `<h1 class="text-left text-xl font-bold my-4"> Preferred State </h1>`,
    `<h1 class="text-left text-xl font-bold  my-4"> Plan </h1>`,
    `<h1 class="text-left text-xl font-bold  my-4"> Implementation </h1>`,
  ];
  array: string[] = [];
  displayPopupInfo: boolean = false;
  displayCongrats: boolean = false;
  etAl: string = '';
  strategyReview: string = '';

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
  public isUpdatingContent = false;
  public editorInstance: any;
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
  isInitialized = false;
  ngOnInit() {
    window.scrollTo(0, 0);
    // this.initializeContents();

    this.solution.getSolution(this.solutionId).subscribe((data: any) => {
      this.currentSolution = data;
      if (this.currentSolution.discussion) {
        this.discussion = this.currentSolution.discussion;
        this.displayTimeDiscussion();
      }
      this.strategyReview =
        this.currentSolution.strategyReview !== undefined
          ? this.currentSolution.strategyReview
          : '';
      // console.log('strategy review saved :', this.strategyReview);
      // fill the evaluator class
      this.currentSolution.evaluators?.forEach((ev: any) => {
        this.evaluators.push(ev);
      });
      this.etAl =
        Object.keys(this.currentSolution.participants!).length > 1
          ? 'Et al'
          : '';
      this.initializeContents();
      this.dataInitialized = true; // Set flag to true
    });

    this.displayPopups = new Array(this.questions.length).fill(false);
    this.clickedDisplayPopups = new Array(this.questions.length).fill(false);
  }
  displayTimeDiscussion() {
    this.discussion.forEach((data) => {
      data.displayTime = this.time.formatDate(data.date!);
    });
  }

  chooseStrategyReview() {
    this.strategyReviewSelected = true;
    this.chosenColorDefault = '';
    this.chosenColorReview = 'font-bold text-xl';
    this.defaultReviewSelected = false;
    this.staticContentArray[0] = this.strategyReview;
    this.contentsArray[0] = this.strategyReview;
  }

  chooseDefaultReview() {
    this.defaultReviewSelected = true;
    this.chosenColorDefault = 'font-bold text-xl';
    this.chosenColorReview = '';
    this.strategyReviewSelected = false;
    this.staticContentArray[0] = this.contentsArray[0];
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
        // this.contentsArray.push(
        //   this.currentSolution.status![this.questionsTitles[i]]
        // );
        // this.staticContentArray.push(
        //   this.currentSolution.status![this.questionsTitles[i]]
        // );
        const content = this.currentSolution.status![this.questionsTitles[i]];
        this.contentsArray.push(content);
        this.staticContentArray.push(content); // Sync both arrays initially
        // for (let i = 0; i < this.questionsTitles.length; i++) {
        //   const questionTitle = this.questionsTitles[i];
        //   const newContent = this.currentSolution.status[questionTitle];
        //   if (this.contentsArray[i] !== newContent) {
        //     this.isUpdatingContent = true;
        //     this.contentsArray[i] = newContent;
        //     this.isUpdatingContent = false;
        //   }
      }
    }

    // Set the initialization flag to true after arrays are populated
    this.isInitialized = true;
  }
  dataInitialized = false; // New flag for ensuring data is loaded
  public Editor: any = Editor;
  private saveTimeout: any;
  public onReady(editor: any) {
    // console.log('CKEditor5 Angular Component is ready to use!', editor.state);

    editor.model.document.on('change:data', () => {
      // console.log('Content changed:', editor.getData());

      clearTimeout(this.saveTimeout);

      this.saveTimeout = setTimeout(() => {
        if (this.dataInitialized && !this.areContentsSame()) {
          this.saveSolutionStatusDirectly();
        }
      }, 2000);
    });
  }

  areContentsSame(): boolean {
    return (
      JSON.stringify(this.contentsArray) ===
      JSON.stringify(this.staticContentArray)
    );
  }

  updatePlayground(current: number) {
    // only save data if both are different.

    // this.saveSolutionStatus();

    // console.log('The data', this.questionsAndAnswersTracker);
    if (this.buttonText === 'Next') {
      this.saveSolutionStatus();
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
    this.saveSolutionStatus();
    this.finallySubmitSolution();
    // Reset submission response to allow future submissions, but only after current process is complete
    this.submiResponse = false;
  }

  finallySubmitSolution() {
    // check if one is submitting what was previously saved
    if (this.strategyReviewSelected) {
      try {
        this.solution
          .submitSolution(this.solutionId, this.strategyReview)
          .then(() => {
            console.log(
              'Submission successful, sending request for evaluation.'
            );
            this.submissionComplete.emit(); // Emit event to parent
            this.toggleCongrats();
            // Additional logic on successful submission
          });
      } catch (error) {
        alert('An error occured while submitting the solution. Try again');
        console.log(error);
      }
    } else {
      try {
        this.solution
          .submitSolution(this.solutionId, this.contentsArray[0])
          .then(() => {
            console.log(
              'Submission successful, sending request for evaluation.'
            );
            this.submissionComplete.emit(); // Emit event to parent
            this.toggleCongrats();
            // Additional logic on successful submission
          });
      } catch (error) {
        alert('An error occured while submitting the solution. Try again');
        console.log(error);
      }
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
      // check if this is the strategy review phase
      this.questionsTitles.length === 1 &&
      this.currentSolution.status !== undefined
    ) {
      if (
        this.strategyReviewSelected &&
        this.strategyReview !== this.staticContentArray[0]
      ) {
        this.solution
          .saveSolutionStrategyReview(this.solutionId, this.strategyReview)
          .then(() => {
            this.saveSuccess = true;
          })
          .catch((error) => {
            this.saveError = true;
            // alert('Error launching solution ');
          });
      }
      // check if something has been changed on the strategy review
      else if (this.contentsArray[0] !== this.staticContentArray[0]) {
        // this.saveSuccess = true;
        this.staticContentArray[0] = this.contentsArray[0];
        // if (this.strategyReview === '') {
        this.solution
          .saveSolutionStrategyReview(this.solutionId, this.contentsArray[0])
          .then(() => {
            this.saveSuccess = true;
          })
          .catch((error) => {
            this.saveError = true;
            // alert('Error launching solution ');
          });
        // }
        // save strategy review
      }
      this.chooseStrategyReview();
    } else if (
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

  saveSolutionStatusDirectly() {
    if (!this.dataInitialized) return; // Prevent execution if not initialized
    if (
      // check if this is the strategy review phase
      this.questionsTitles.length === 1 &&
      this.currentSolution.status !== undefined
    ) {
      if (
        this.strategyReviewSelected &&
        this.strategyReview !== this.staticContentArray[0]
      ) {
        this.solution
          .saveSolutionStrategyReview(this.solutionId, this.strategyReview)
          .then(() => {
            this.staticContentArray[0] = this.strategyReview; // Update static content after saving
            // this.saveSuccess = true;
          })
          .catch((error) => {
            // this.saveError = true;
            // alert('Error launching solution ');
          });
      }
      // check if something has been changed on the strategy review
      else if (this.contentsArray[0] !== this.staticContentArray[0]) {
        // this.saveSuccess = true;
        // this.staticContentArray[0] = this.contentsArray[0]; // Update to prevent infinite loop
        // if (this.strategyReview === '') {
        this.solution
          .saveSolutionStrategyReview(this.solutionId, this.contentsArray[0])
          .then(() => {
            // this.saveSuccess = true;
            this.staticContentArray[0] = this.contentsArray[0];
          })
          .catch((error) => {
            // this.saveError = true;
            alert('Error launching solution ');
          });
        // }
        // save strategy review
      }
      this.chooseStrategyReview();
    } else if (
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
          // this.saveSuccess = true;
          this.staticContentArray = [...this.contentsArray]; // Update static array after successful save
        })
        .catch((error) => {
          // this.saveError = true;
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
    this.array = array;
    let titles = [
      `<h1 class="text-left text-xl font-bold my-4"> Problem State </h1>`,
      `<h1 class="text-left text-xl font-bold my-4"> Preferred State </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Plan </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Implementation </h1>`,
    ];

    // console.log(' all the keys', array);

    // console.log('what is content array content', this.contentsArray);

    let result = []; // Initialize the result array
    let j = 0; // Initialize the title index

    // Add the first title before any status
    result.push(titles[0]);
    for (let i = 0; i < array.length; i++) {
      // Add the current status to the result
      result.push(this.currentSolution.status![array[i]]);

      // Check for the switch and add the next title accordingly
      if (
        i < array.length - 1 &&
        !array[i].startsWith(array[i + 1].substring(0, 2))
      ) {
        j++; // Move to the next title
        result.push(titles[j]); // Add the next title
      }
    }

    console.log('result ', result);
    // Handle the last element
    // result.push(this.currentSolution.status![array[array.length - 1]]);

    // Convert result array to string or any format you need

    this.staticContentArray[0] = result.join('\n');
    this.contentsArray[0] = result.join('\n');
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
}
