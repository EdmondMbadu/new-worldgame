import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
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
import { Subscription, take } from 'rxjs';
import { DataService } from 'src/app/services/data.service';
import { LanguageService } from 'src/app/services/language.service';

type StepSupportedLanguage = 'en' | 'fr';

export interface FeedbackRequest {
  authorId?: string;
  evaluated?: string;
}
@Component({
  selector: 'app-playground-step',
  templateUrl: './playground-step.component.html',
  styleUrls: ['./playground-step.component.css'],
})
export class PlaygroundStepComponent implements OnInit, OnDestroy {
  strategyReviewSelected: boolean = false;
  defaultReviewSelected = true;
  chosenColorDefault = 'font-bold text-xl';
  chosenColorReview = '';
  loader: any;
  private readonly defaultLanguage: StepSupportedLanguage = 'en';
  private readonly strategySectionTitles: Record<
    StepSupportedLanguage,
    string[]
  > = {
    en: [
      `<h1 class="text-left text-xl font-bold my-4"> Problem State </h1>`,
      `<h1 class="text-left text-xl font-bold my-4"> Preferred State </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Plan </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Implementation </h1>`,
      `<h1 class="text-left text-xl font-bold my-4"> Strategy Review </h1>`,
    ],
    fr: [
      `<h1 class="text-left text-xl font-bold my-4"> État du problème </h1>`,
      `<h1 class="text-left text-xl font-bold my-4"> État souhaité </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Plan </h1>`,
      `<h1 class="text-left text-xl font-bold  my-4"> Mise en oeuvre </h1>`,
      `<h1 class="text-left text-xl font-bold my-4"> Revue de la stratégie </h1>`,
    ],
  };
  private readonly videoGuideText: Record<
    StepSupportedLanguage,
    { prefix: string; label: string }
  > = {
    en: { prefix: 'Step', label: 'Quick Video Guide' },
    fr: { prefix: 'Étape', label: 'Guide vidéo express' },
  };
  private langSub?: Subscription;
  currentLanguage: StepSupportedLanguage = this.defaultLanguage;
  helperVideoPrefix = this.videoGuideText[this.defaultLanguage].prefix;
  helperVideoLabel = this.videoGuideText[this.defaultLanguage].label;
  array: string[] = [];
  displayPopupInfo: boolean = false;
  displayCongrats: boolean = false;
  etAl: string = '';
  strategyReview: string = '';
  // Tooltip for Step-1 video
  showVideoTooltip = false;
  showVideoModal = false;
  currentVideo: string = '';

  displayPopups: boolean[] = [];
  newTitle: string = '';
  clickedDisplayPopups: boolean[] = [];
  currentSolution: Solution = {};
  staticContentArray: string[] = [];
  private lastSavedStrategyReview: string = '';
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

  isLoading: boolean = false;

  defaultBgColor: string = 'bg-teal-100';
  strategyBgColor: string = 'bg-teal-100';
  constructor(
    private router: Router,
    private solution: SolutionService,
    private auth: AuthService,
    private fns: AngularFireFunctions,
    private time: TimeService,
    private storage: AngularFireStorage,
    private dataService: DataService,
    private languageService: LanguageService
  ) {}
  aiOptions = [
    {
      avatarPath: '../../../assets/img/sofia-agent.png',
      name: 'Sofia Morales',
      group: 'colleague',
      intro: ` I’m Sofia, shaped by Colombia’s peacebuilding efforts and rich biodiversity. I’m a fierce advocate for sustainable development and social justice. My strength lies in conflict resolution—I help players navigate group tensions and stakeholder conflicts, which is key when working on issues like peace and justice (SDG 16).`,
      collectionPath: `users/${this.auth.currentUser.uid}/sofia/`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step-1.mp4?alt=media&token=caa04230-9e04-403d-b08b-2c5a7090dc98',
    },
    {
      avatarPath: '../../../assets/img/arjun-agent.png',
      name: 'Arjun Patel',
      group: 'colleague',
      intro: ` I am ${name} an AI agent inspired by India’s vibrant tech and social entrepreneurship scene. I thrive on finding smart solutions with limited resources. My strength lies in data analysis—I help players crunch numbers to tackle challenges like clean water access (SDG 6) or education gaps (SDG 4). I bring a knack for jugaad—that’s frugal innovation—finding creative, low-cost ways to repurpose local materials for sustainable infrastructure.  `,
      collectionPath: `users/${this.auth.currentUser.uid}/arjun/`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step2.mp4?alt=media&token=ffad8efe-abd5-4197-9def-7935099e481d',
    },
    {
      avatarPath: '../../../assets/img/elena-agent.png',
      name: 'Elena Volkov',
      group: 'colleague',
      intro: `I’m Elena, forged in the fire of Ukraine’s resilience and innovation. I excel in crisis management—helping players stay calm and act fast in emergencies like food insecurity (SDG 2) or health crises (SDG 3). I bring deep knowledge in renewable energy, guiding players to build smart, sustainable solutions like microgrids for off-grid communities (SDG 7). `,
      collectionPath: `users/${this.auth.currentUser.uid}/elena/`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step-3.mp4?alt=media&token=98584ce3-b127-44a8-a374-2cc9ea812241',
    },
    {
      avatarPath: '../../../assets/img/tane-agent.png',
      name: 'Tane Kahu',
      group: 'colleague',
      intro: `I’m Tane, grounded in Māori knowledge and New Zealand’s deep respect for nature. I take a holistic view of every challenge, helping players design solutions that protect ecosystems—on land (SDG 15) and under water (SDG 14). `,
      collectionPath: `users/${this.auth.currentUser.uid}/tane/`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step-4.mp4?alt=media&token=4c8d9c1f-efcf-430a-a99a-6c0329ef29c9',
    },
    {
      avatarPath: '../../../assets/img/li-agent.png',
      name: 'Li Wei',
      group: 'colleague',
      intro: ` I’m Li Wei, an AI rooted in East Asia’s strategic mindset and China’s rapid urban and tech evolution. I specialize in urban planning, tech integration, and long-term thinking. I help players design scalable solutions for sustainable cities (SDG 11) and innovative industries (SDG 9).`,
      collectionPath: `users/${this.auth.currentUser.uid}/li/`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step-5.mp4?alt=media&token=fb9edabb-7e55-4f54-a8e9-110b24248005',
    },
    {
      avatarPath: '../../../assets/img/zara-agent.png',
      name: 'Zara Nkosi',
      group: 'colleague',
      intro: `${name}  a vibrant AI agent inspired by South African ubuntu
philosophy. I believe that “I am because we are”. I have  a knack for
weaving compelling narratives, and help players understand
complex social issues like poverty (SDG 1) and inequality (SDG
10) through human-centered stories. `,
      collectionPath: `users/${this.auth.currentUser.uid}/zara/`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2Fsofia-step-1.mp4?alt=media&token=26a466d1-7ae3-491e-9250-cdd388b4c7d0',
    },

    {
      avatarPath: '../../../assets/img/amina-agent.png',
      name: 'Amina Al-Sayed',
      group: 'colleague',
      intro: `I’m Amina, and I draw wisdom from Morocco’s cultural richness and diversity. I focus on inclusion, equity, and cultural sensitivity in every solution. My expertise in cross-cultural communication helps players navigate different worldviews—especially critical when tackling gender equality (SDG 5).`,
      collectionPath: `users/${this.auth.currentUser.uid}/amina/`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2Fsofia-step-1.mp4?alt=media&token=26a466d1-7ae3-491e-9250-cdd388b4c7d0',
    },
  ];
  data: string = '';
  discussion: Comment[] = [];
  hoverChangeTitle: boolean = false;
  isInitialized = false;
  ngOnInit() {
    window.scrollTo(0, 0);
    this.initializeLanguageSupport();
    // this.initializeContents();

    this.solution
      .getSolution(this.solutionId)
      .pipe(take(1))
      .subscribe((data: any) => {
        this.currentSolution = data;
        if (this.currentSolution.discussion) {
          this.discussion = this.currentSolution.discussion;
          this.displayTimeDiscussion();
        }
        this.strategyReview =
          this.currentSolution.strategyReview !== undefined
            ? this.currentSolution.strategyReview
            : '';
        this.lastSavedStrategyReview = this.strategyReview || '';
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
  get stepIndex(): number {
    // assuming stepNumber is 1-based (1, 2, 3 …)

    return Math.max(0, this.stepNumber);
  }

  get isStrategyReviewStep(): boolean {
    const normalizedStep = (this.step || '').toLowerCase();
    const matchesLabel =
      normalizedStep.startsWith('step v') ||
      normalizedStep.startsWith('step 5');
    const firstTitle = this.questionsTitles[0]?.toLowerCase() || '';
    const matchesQuestionKey = firstTitle.startsWith('s5');
    return (
      this.questionsTitles.length === 1 &&
      (matchesLabel || matchesQuestionKey || this.stepNumber >= 4)
    );
  }

  // ----------------------------------
  // 3)  Active helper object
  // ----------------------------------
  get activeHelper() {
    return this.aiOptions[this.stepIndex] ?? null;
  }

  chooseStrategyReview() {
    this.strategyReviewSelected = true;
    this.chosenColorDefault = '';
    this.chosenColorReview = 'font-bold text-xl';
    this.defaultReviewSelected = false;
    if (
      (!this.strategyReview || this.strategyReview.trim() === '') &&
      this.contentsArray.length
    ) {
      this.strategyReview = this.contentsArray[0];
    }
    this.defaultBgColor = 'bg-teal-600';
    this.strategyBgColor = 'bg-gray-200 dark:bg-gray-600';
  }

  chooseDefaultReview() {
    this.defaultReviewSelected = true;
    this.chosenColorDefault = 'font-bold text-xl';
    this.chosenColorReview = '';
    this.strategyReviewSelected = false;
    this.staticContentArray[0] = this.contentsArray[0];
    this.defaultBgColor = 'bg-gray-200 dark:bg-gray-600';
    this.strategyBgColor = 'bg-teal-600';
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
        const content = this.currentSolution.status![this.questionsTitles[i]];
        this.contentsArray.push(content);
        this.staticContentArray.push(content); // Sync both arrays initially
      }
    }

    // Set the initialization flag to true after arrays are populated
    this.isInitialized = true;
  }
  dataInitialized = false; // New flag for ensuring data is loaded
  public Editor: any = Editor;
  private saveTimeout: any;
  public onReady(editor: any) {
    // e.g. solutionId comes from the route or @Input()

    const solutionId = this.solutionId; // already have it
    const basePath = `solutions/${solutionId}/ckeditor`;
    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) =>
      this.dataService.createCkeditorUploadAdapter(
        loader,
        solutionId,
        basePath
      );
    // console.log('CKEditor5 Angular Component is ready to use!', editor.state);
    editor.model.document.on('change:data', () => {
      // console.log('Content changed:', editor.getData());
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        if (this.dataInitialized && !this.areContentsSame()) {
          this.saveSolutionStatusDirectly();
        }
      }, 2000);
      this.saveTimeout = setTimeout(() => {
        if (this.dataInitialized && this.hasStrategyReviewChanged()) {
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

  hasStrategyReviewChanged() {
    return (
      this.strategyReview !== this.lastSavedStrategyReview &&
      this.strategyReviewSelected
    );
  }

  openVideo() {
    if (!this.activeHelper) return;
    this.currentVideo = this.activeHelper.videoUrl!; // ①
    this.showVideoModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeVideo() {
    this.showVideoModal = false;
    this.currentVideo = ''; // ② stop the stream
    document.body.style.overflow = '';
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
    this.SubmitPreviewSolution();
    // Reset submission response to allow future submissions, but only after current process is complete
    this.submiResponse = false;
  }

  SubmitPreviewSolution() {
    this.isLoading = true;
    // check if one is submitting what was previously saved
    if (this.strategyReviewSelected) {
      try {
        this.solution
          .submitPreviewSolution(this.solutionId, this.strategyReview)
          .then(() => {
            console.log(
              'Submission successful, sending request for evaluation.'
            );
            // this.submissionComplete.emit(); // Emit event to parent
            this.router.navigate(['/solution-preview', this.solutionId]);
            // this.toggleCongrats();
            // Additional logic on successful submission
          });
      } catch (error) {
        alert('An error occured while submitting the solution. Try again');
        console.log(error);
      }
    } else {
      try {
        this.solution
          .submitPreviewSolution(this.solutionId, this.contentsArray[0])
          .then(() => {
            console.log(
              'Submission successful, sending request for evaluation.'
            );
            // this.submissionComplete.emit(); // Emit event to parent
            this.router.navigate(['/solution-preview', this.solutionId]);
            // this.toggleCongrats();
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
        this.strategyReview !== this.lastSavedStrategyReview
      ) {
        this.solution
          .saveSolutionStrategyReview(this.solutionId, this.strategyReview)
          .then(() => {
            this.lastSavedStrategyReview = this.strategyReview || '';
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
        // this.staticContentArray[0] = this.contentsArray[0];
        // if (this.strategyReview === '') {
        const draft = this.contentsArray[0];
        this.solution
          .saveSolutionStrategyReview(this.solutionId, this.contentsArray[0])
          .then(() => {
            this.staticContentArray[0] = draft;
            this.strategyReview = draft; // <‑‑ keep in sync
            this.lastSavedStrategyReview = draft;
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
    // just mark that things were saved
    this.saveSuccess = true;
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
        this.strategyReview !== this.lastSavedStrategyReview
      ) {
        this.solution
          .saveSolutionStrategyReview(this.solutionId, this.strategyReview)
          .then(() => {
            this.lastSavedStrategyReview = this.strategyReview || '';
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
        const draft = this.contentsArray[0];
        this.solution
          .saveSolutionStrategyReview(this.solutionId, draft)
          .then(() => {
            // this.saveSuccess = true;
            this.staticContentArray[0] = draft;
            this.strategyReview = draft;
            this.lastSavedStrategyReview = draft;
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

  /**
   * Update content for a specific question from external source (e.g., chatbot insert)
   * @param questionKey The question key like 'S1-A'
   * @param content The new content to set
   * @param append Whether to append to existing content instead of replacing
   */
  updateContentFromExternal(questionKey: string, content: string, append: boolean = false): void {
    const index = this.questionsTitles.indexOf(questionKey);
    if (index === -1) {
      console.log('Question key not found in this step:', questionKey);
      return;
    }

    console.log('Updating content in playground-step for:', questionKey, 'at index:', index);
    
    if (append && this.contentsArray[index]) {
      this.contentsArray[index] = this.contentsArray[index] + '\n\n' + content;
    } else {
      this.contentsArray[index] = content;
    }
    
    // Update the solution status as well
    if (this.currentSolution.status) {
      this.currentSolution.status[questionKey] = this.contentsArray[index];
    }
  }

  initializeStrategy() {
    const finalContent = this.buildStrategySummary();
    this.contentsArray = [finalContent];
    this.staticContentArray = [finalContent];

    if (!this.strategyReview || this.strategyReview.trim() === '') {
      this.strategyReview = finalContent;
      this.solution
        .saveSolutionStrategyReview(this.solutionId, finalContent)
        .then(() => {
          this.lastSavedStrategyReview = finalContent;
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      this.lastSavedStrategyReview = this.strategyReview;
    }

    if (this.isStrategyReviewStep) {
      this.chooseStrategyReview();
    } else {
      this.chooseDefaultReview();
    }
  }

  refreshStrategyReviewFromSteps() {
    if (!this.isStrategyReviewStep) {
      return;
    }

    const finalContent = this.buildStrategySummary();
    if (!this.contentsArray.length) {
      this.contentsArray = [finalContent];
    } else {
      this.contentsArray[0] = finalContent;
    }

    if (!this.staticContentArray.length) {
      this.staticContentArray = [finalContent];
    } else {
      this.staticContentArray[0] = finalContent;
    }

    this.strategyReview = finalContent;
    this.chooseStrategyReview();

    this.solution
      .saveSolutionStrategyReview(this.solutionId, finalContent)
      .then(() => {
        this.lastSavedStrategyReview = finalContent;
      })
      .catch((error) => {
        console.error('Error refreshing from steps 1-4', error);
      });
  }

  private buildStrategySummary(): string {
    if (!this.currentSolution.status) {
      return '';
    }

    const keys = Object.keys(this.currentSolution.status).sort((a, b) => {
      const [aPrefix, aSuffix = ''] = a.split('-');
      const [bPrefix, bSuffix = ''] = b.split('-');
      const prefixComparison = aPrefix.localeCompare(bPrefix);
      if (prefixComparison === 0) {
        return aSuffix.localeCompare(bSuffix);
      }
      return prefixComparison;
    });

    const stepSnippets: { [step: number]: string[] } = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    keys.forEach((key) => {
      const prefix = key.split('-')[0];
      const stepNumber = Number(prefix.substring(1));
      if (stepSnippets.hasOwnProperty(stepNumber)) {
        stepSnippets[stepNumber].push(this.currentSolution.status![key]);
      }
    });

    const titles = this.getLocalizedStrategyHeadings();
    const result: string[] = [];
    for (let step = 1; step <= 5; step++) {
      if (stepSnippets[step] && stepSnippets[step].length > 0) {
        result.push(titles[step - 1]);
        stepSnippets[step].forEach((snippet) => result.push(snippet));
      }
    }

    return result.join('\n');
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
    this.router.navigate(['/solution-view', this.solutionId]);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private initializeLanguageSupport() {
    this.setLocalizedContent(this.languageService.currentLanguage);
    this.langSub = this.languageService.languageChanges$.subscribe((event) => {
      this.setLocalizedContent(event.lang);
    });
  }

  private setLocalizedContent(language: string) {
    const lang = this.isSupportedLanguage(language)
      ? language
      : this.defaultLanguage;
    this.currentLanguage = lang;
    const videoGuideCopy = this.videoGuideText[lang];
    this.helperVideoPrefix = videoGuideCopy.prefix;
    this.helperVideoLabel = videoGuideCopy.label;
  }

  private isSupportedLanguage(
    language: string
  ): language is StepSupportedLanguage {
    return Object.prototype.hasOwnProperty.call(
      this.strategySectionTitles,
      language
    );
  }

  private getLocalizedStrategyHeadings(): string[] {
    return (
      this.strategySectionTitles[this.currentLanguage] ||
      this.strategySectionTitles[this.defaultLanguage]
    );
  }
}
