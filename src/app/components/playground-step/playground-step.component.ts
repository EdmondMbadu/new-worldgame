import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
// The custom build is a default export. Importing it as a namespace produces an
// object (instead of the editor constructor) with Angular's ESM application
// builder, so CKEditor cannot call Editor.create() and renders nothing.
import Editor from 'ckeditor5-custom-build/build/ckeditor';
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
import { firstValueFrom, Subscription } from 'rxjs';
import { ActivityService } from 'src/app/services/activity.service';
import { DataService } from 'src/app/services/data.service';
import { LanguageService } from 'src/app/services/language.service';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { PresenceService } from 'src/app/services/presence.service';
import {
  StrategyReviewConflict,
  StrategyReviewReconciliation,
  StrategyReviewResolution,
  StrategyReviewStepKey,
  StrategyReviewSyncMetadata,
  acknowledgeConflictStep,
  buildStrategyReviewFromSteps,
  createStrategyReviewSyncMetadata,
  reconcileStrategyReview,
  resolveStrategyReviewConflict,
  strategyReviewPlainText,
  strategyReviewSourceAnswers,
  strategyReviewStepsHash,
} from 'src/app/utils/strategy-review-sync';

type StepSupportedLanguage = 'en' | 'fr';

export interface FeedbackRequest {
  authorId?: string;
  evaluated?: string;
}
@Component({
    selector: 'app-playground-step',
    templateUrl: './playground-step.component.html',
    styleUrls: ['./playground-step.component.css'],
    standalone: false
})
export class PlaygroundStepComponent implements OnInit, OnDestroy {
  strategyReviewSelected: boolean = false;
  defaultReviewSelected = true;
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
  titleDraft: string = '';
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
  @ViewChild('buckyChat') buckyChat?: ChatbotComponent;
  contentsArray: string[] = [];
  public isUpdatingContent = false;
  public editorInstance: any;
  questionsAndAnswersTracker?: { [key: string]: string } = {};
  scrollHandler: (() => void) | undefined;
  elements: any = [];
  @Output() submissionComplete: EventEmitter<any> = new EventEmitter();
  updateTitleBox: boolean = false;
  isEditingTitle = false;
  isSavingTitle = false;
  showTextImportModal = false;
  textImportTargetIndex: number | null = null;
  textImportFile: File | null = null;
  textImportPaste = '';
  textImportMode: 'append' | 'replace' = 'append';
  isExtractingText = false;
  textImportError = '';

  isLoading: boolean = false;

  showRefreshStrategyReviewModal = false;
  showRestoreStrategyReviewModal = false;
  restoringPreviousStrategyReview = false;
  strategySyncState:
    | 'loading'
    | 'aligned'
    | 'updated'
    | 'attention'
    | 'error' = 'loading';
  strategySyncNotice = '';
  strategyConflicts: StrategyReviewConflict[] = [];
  resolvingStrategyConflict = false;
  savingStrategyConflictStep?: StrategyReviewStepKey;
  strategyReviewMergeHighlighted = false;
  expandedStrategyConflictSteps: Partial<
    Record<StrategyReviewStepKey, boolean>
  > = {};
  private strategySyncMetadata?: StrategyReviewSyncMetadata;
  private pendingStrategyReconciliation?: StrategyReviewReconciliation;
  private pendingStrategyDraft = '';
  private strategyInitializationStarted = false;
  private strategyReconciliationTimer?: ReturnType<typeof setTimeout>;
  private strategyReconciliationInFlight = false;
  private strategyReviewMergeHighlightTimer?: ReturnType<typeof setTimeout>;
  private strategyConflictDisplayCache = new WeakMap<
    StrategyReviewConflict,
    { blockCount: number; needsExpansion: boolean }
  >();
  constructor(
    private router: Router,
    private solution: SolutionService,
    private auth: AuthService,
    private fns: AngularFireFunctions,
    private time: TimeService,
    private storage: AngularFireStorage,
    private dataService: DataService,
    private languageService: LanguageService,
    private cdRef: ChangeDetectorRef,
    private activity: ActivityService,
    private presence: PresenceService
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
  
  // Real-time collaboration properties
  private solutionSub?: Subscription;
  private lastLocalEditTime: number = 0;
  private readonly TYPING_COOLDOWN_MS = 3000; // Don't update from remote if user typed within 3 seconds
  private isReceivingRemoteUpdate = false;
  private answerTypingStopTimeout?: ReturnType<typeof setTimeout>;
  private lastAnswerTypingWriteAt = 0;
  private lastAnswerTypingLocation = '';
  ngOnInit() {
    window.scrollTo(0, 0);
    if (this.solutionId) {
      this.activity.startEditing(this.solutionId);
    }
    this.initializeLanguageSupport();
    // this.initializeContents();

    // Real-time subscription - no take(1), so we get continuous updates
    this.solutionSub = this.solution
      .getSolution(this.solutionId)
      .subscribe(async (data: any) => {
        if (!data) return;
        
        const isFirstLoad =
          !this.dataInitialized && !this.strategyInitializationStarted;
        
        if (isFirstLoad) {
          this.strategyInitializationStarted = true;
          // First load - initialize everything
          this.currentSolution = data;
          this.title = this.currentSolution.title || this.title || '';
          this.titleDraft = this.title || '';
          if (this.currentSolution.discussion) {
            this.discussion = this.currentSolution.discussion;
            this.displayTimeDiscussion();
          }
          this.strategyReview =
            this.currentSolution.strategyReview !== undefined
              ? this.currentSolution.strategyReview
              : '';
          this.lastSavedStrategyReview = this.strategyReview || '';
          
          this.currentSolution.evaluators?.forEach((ev: any) => {
            this.evaluators.push(ev);
          });
          this.etAl =
            Object.keys(this.currentSolution.participants!).length > 1
              ? 'Et al'
              : '';
          try {
            await this.initializeContents();
            this.dataInitialized = true;
          } catch (error) {
            console.error('Could not initialize the solution step', error);
            this.strategySyncState = 'error';
            this.strategySyncNotice =
              'We could not compare this draft with Steps 1–4. Your work was not changed.';
            this.dataInitialized = true;
          }
        } else if (!this.dataInitialized) {
          // Keep the newest snapshot while the reconciliation metadata loads.
          this.currentSolution = data;
        } else {
          // Subsequent updates - handle real-time sync from other users
          this.handleRemoteUpdate(data);
        }
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
    this.defaultReviewSelected = false;
    if (
      (!this.strategyReview || this.strategyReview.trim() === '') &&
      this.contentsArray.length
    ) {
      this.strategyReview = this.contentsArray[0];
    }
  }

  chooseDefaultReview() {
    this.defaultReviewSelected = true;
    this.strategyReviewSelected = false;
    this.staticContentArray[0] = this.contentsArray[0];
  }
  async initializeContents(): Promise<void> {
    this.contentsArray = [];
    this.staticContentArray = [];
    for (let q of this.questions) {
      this.contentsArray.push('');
      this.staticContentArray.push('');
    }
    if (this.isStrategyReviewStep) {
      await this.initializeStrategy();
    } else if (this.currentSolution.status !== undefined) {
      const hasAnySavedValue = this.questionsTitles.some(
        (key) => key in this.currentSolution.status!
      );
      if (!hasAnySavedValue) {
        this.isInitialized = true;
        return;
      }
      this.contentsArray = [];
      this.staticContentArray = [];
      for (let i = 0; i < this.questionsTitles.length; i++) {
        const content = this.currentSolution.status![this.questionsTitles[i]];
        const normalizedContent = content ?? '';
        this.contentsArray.push(normalizedContent);
        this.staticContentArray.push(normalizedContent); // Sync both arrays initially
      }
    }

    // Set the initialization flag to true after arrays are populated
    this.isInitialized = true;
  }
  dataInitialized = false; // New flag for ensuring data is loaded
  public Editor: any = Editor;
  private saveTimeout: any;
  public onReady(editor: any, questionIndex = 0) {
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
      // Track local edit time for real-time sync conflict prevention
      if (!this.isReceivingRemoteUpdate) {
        this.lastLocalEditTime = Date.now();
        this.activity.beat();
        if (editor.editing?.view?.document?.isFocused) {
          this.registerAnswerTypingActivity(questionIndex);
        }
      }
      
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
    editor.editing?.view?.document?.on('blur', () => {
      this.stopAnswerTyping();
    });
  }
  
  /**
   * Handle real-time updates from other users
   * Only updates content if the user hasn't been typing recently
   */
  private handleRemoteUpdate(data: any): void {
    const now = Date.now();
    const timeSinceLastEdit = now - this.lastLocalEditTime;
    const userIsTyping = timeSinceLastEdit < this.TYPING_COOLDOWN_MS;
    const previousStepsHash = strategyReviewStepsHash(
      strategyReviewSourceAnswers(this.currentSolution.status)
    );
    
    // Always update non-content fields
    this.currentSolution = { ...this.currentSolution, ...data };
    const sourceStepsChanged =
      this.isStrategyReviewStep &&
      previousStepsHash !==
        strategyReviewStepsHash(
          strategyReviewSourceAnswers(this.currentSolution.status)
        );
    this.title = this.currentSolution.title || '';
    if (data.strategyReviewSyncMetadata) {
      this.strategySyncMetadata = data.strategyReviewSyncMetadata;
    }

    if (!this.isEditingTitle) {
      this.titleDraft = this.title || '';
    }
    
    // Update discussion if changed
    if (data.discussion) {
      this.discussion = data.discussion;
      this.displayTimeDiscussion();
    }
    
    // If user is actively typing, don't overwrite their content
    if (userIsTyping) {
      if (sourceStepsChanged) {
        this.scheduleStrategyReconciliation(this.TYPING_COOLDOWN_MS + 150);
      }
      return;
    }
    
    // Update content from remote changes
    this.isReceivingRemoteUpdate = true;
    
    try {
      // Update regular step content (contentsArray)
      if (data.status && this.questionsTitles.length > 0) {
        for (let i = 0; i < this.questionsTitles.length; i++) {
          const key = this.questionsTitles[i];
          const remoteValue = data.status[key];
          if (remoteValue !== undefined && remoteValue !== this.contentsArray[i]) {
            this.contentsArray[i] = remoteValue;
            this.staticContentArray[i] = remoteValue;
          }
        }
      }
      
      // Update strategy review if on that step
      if (this.isStrategyReviewStep && data.strategyReview !== undefined) {
        if (data.strategyReview !== this.strategyReview) {
          this.strategyReview = data.strategyReview;
          this.lastSavedStrategyReview = data.strategyReview;
        }
      }
    } finally {
      // Reset flag after a short delay to allow Angular change detection
      setTimeout(() => {
        this.isReceivingRemoteUpdate = false;
        if (sourceStepsChanged) {
          this.scheduleStrategyReconciliation();
        }
      }, 100);
    }
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

  openTextImportModal(index: number) {
    this.textImportTargetIndex = index;
    this.textImportFile = null;
    this.textImportPaste = '';
    this.textImportMode = 'append';
    this.textImportError = '';
    this.showTextImportModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeTextImportModal() {
    if (this.isExtractingText) return;
    this.resetTextImportModal();
  }

  onTextImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.textImportFile = file;
    this.textImportError = '';
  }

  async applyTextImport() {
    if (this.textImportTargetIndex === null) return;

    this.textImportError = '';
    const pastedText = this.textImportPaste.trim();

    if (!this.textImportFile && !pastedText) {
      this.textImportError = 'Paste text or choose a PDF, DOCX, DOC, or TXT file.';
      return;
    }

    this.isExtractingText = true;
    try {
      let extractedText = pastedText;
      if (this.textImportFile) {
        extractedText = await this.extractTextFromFile(this.textImportFile);
      }

      const normalizedText = this.normalizeExtractedText(extractedText);
      if (!normalizedText) {
        this.textImportError = 'No readable text was found in that document.';
        return;
      }

      await this.insertExtractedText(
        this.textImportTargetIndex,
        normalizedText,
        this.textImportMode
      );
      this.resetTextImportModal();
      this.saveSuccess = true;
    } catch (error: any) {
      console.error('Document text import failed', error);
      this.textImportError =
        error?.message ||
        'Could not extract text from this file. Try a PDF, DOCX, DOC, or TXT file.';
    } finally {
      this.isExtractingText = false;
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    const maxFileBytes = 8 * 1024 * 1024;
    if (file.size > maxFileBytes) {
      throw new Error('Choose a file smaller than 8 MB.');
    }

    if (file.type.startsWith('text/') || /\.txt$/i.test(file.name)) {
      return await file.text();
    }

    const base64 = await this.readFileAsBase64(file);
    const extractDocumentText = this.fns.httpsCallable('extractDocumentText');
    const result: any = await firstValueFrom(
      extractDocumentText({
        fileBase64: base64,
        mimeType: file.type || this.guessMimeType(file.name),
        fileName: file.name,
      })
    );
    return result?.text || '';
  }

  private resetTextImportModal() {
    this.showTextImportModal = false;
    this.textImportTargetIndex = null;
    this.textImportFile = null;
    this.textImportPaste = '';
    this.textImportError = '';
    document.body.style.overflow = '';
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || '');
        resolve(value.includes(',') ? value.split(',').pop() || '' : value);
      };
      reader.onerror = () => reject(new Error('Could not read this file.'));
      reader.readAsDataURL(file);
    });
  }

  private guessMimeType(fileName: string): string {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.pdf')) return 'application/pdf';
    if (lowerName.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lowerName.endsWith('.doc')) return 'application/msword';
    if (lowerName.endsWith('.txt')) return 'text/plain';
    return 'application/octet-stream';
  }

  private normalizeExtractedText(text: string): string {
    return String(text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async insertExtractedText(
    index: number,
    text: string,
    mode: 'append' | 'replace'
  ): Promise<void> {
    const importedHtml = this.plainTextToEditorHtml(text);
    const isStrategyTarget = this.isStrategyReviewStep && this.strategyReviewSelected;

    if (isStrategyTarget) {
      const current = this.strategyReview || '';
      this.strategyReview =
        mode === 'append' && current
          ? `${current}<p>&nbsp;</p>${importedHtml}`
          : importedHtml;
      this.lastLocalEditTime = Date.now();
      this.cdRef.detectChanges();
      await this.solution.saveSolutionStrategyReview(
        this.solutionId,
        this.strategyReview
      );
      this.lastSavedStrategyReview = this.strategyReview || '';
      return;
    }

    const current = this.contentsArray[index] || '';
    const nextContent =
      mode === 'append' && current
        ? `${current}<p>&nbsp;</p>${importedHtml}`
        : importedHtml;
    const nextContentsArray = [...this.contentsArray];
    nextContentsArray[index] = nextContent;
    this.contentsArray = nextContentsArray;
    this.lastLocalEditTime = Date.now();
    this.cdRef.detectChanges();

    if (this.questionsTitles[index]) {
      this.questionsAndAnswersTracker![this.questionsTitles[index]] = nextContent;
      await this.solution.saveSolutionStatus(
        this.solutionId,
        this.questionsAndAnswersTracker
      );
      const nextStaticArray = [...this.staticContentArray];
      nextStaticArray[index] = nextContent;
      this.staticContentArray = nextStaticArray;
      if (this.currentSolution.status) {
        this.currentSolution.status[this.questionsTitles[index]] = nextContent;
      }
    }
  }

  private plainTextToEditorHtml(text: string): string {
    return text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${this.escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    if (this.isStrategyReviewStep) {
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
    if (this.isStrategyReviewStep) {
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

    console.log('Updating content in playground-step for:', questionKey, 'at index:', index, 'content length:', content?.length);
    
    // Calculate the new content
    let newContent: string;
    if (append && this.contentsArray[index]) {
      newContent = this.contentsArray[index] + '\n\n' + content;
    } else {
      newContent = content;
    }
    
    // Create a new array reference to ensure Angular detects the change
    const newContentsArray = [...this.contentsArray];
    newContentsArray[index] = newContent;
    this.contentsArray = newContentsArray;
    
    // Also update staticContentArray to prevent "unsaved changes" warning for this insert
    const newStaticArray = [...this.staticContentArray];
    newStaticArray[index] = newContent;
    this.staticContentArray = newStaticArray;
    
    // Update the solution status as well
    if (this.currentSolution.status) {
      this.currentSolution.status[questionKey] = newContent;
    }
    
    // Trigger change detection to ensure CKEditor picks up the change
    this.cdRef.detectChanges();
    
    console.log('Content updated successfully for:', questionKey);
  }

  async initializeStrategy(): Promise<void> {
    this.strategySyncState = 'loading';
    this.strategySyncNotice = '';

    this.strategySyncMetadata =
      await this.solution.getStrategyReviewSyncMetadata(this.solutionId);
    this.strategyReview = String(
      this.currentSolution.strategyReview ?? this.strategyReview ?? ''
    );
    const finalContent = this.buildStrategySummary();
    this.contentsArray = [finalContent];
    this.staticContentArray = [finalContent];

    const reconciliation = reconcileStrategyReview(
      this.currentSolution.status,
      this.strategyReview,
      this.strategySyncMetadata,
      this.getStrategyHeadingMap()
    );
    await this.applyStrategyReconciliation(reconciliation, true);

    if (!this.strategyReview.trim() && finalContent) {
      this.strategyReview = finalContent;
    }
    this.lastSavedStrategyReview = this.strategyReview;

    if (this.isStrategyReviewStep) {
      this.chooseStrategyReview();
    } else {
      this.chooseDefaultReview();
    }
  }

  async refreshStrategyReviewFromSteps(): Promise<void> {
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

    const previousReview = this.strategyReview;
    const metadata = createStrategyReviewSyncMetadata(
      this.currentSolution.status,
      'replaced',
      this.getStrategyHeadingMap()
    );

    try {
      await this.solution.saveStrategyReviewReconciliation(
        this.solutionId,
        finalContent,
        metadata,
        {
          previousReview,
          reason: 'replaced',
        }
      );
      this.strategyReview = finalContent;
      this.lastSavedStrategyReview = finalContent;
      this.strategySyncMetadata = metadata;
      this.pendingStrategyReconciliation = undefined;
      this.pendingStrategyDraft = '';
      this.strategyConflicts = [];
      this.strategySyncState = 'aligned';
      this.strategySyncNotice =
        'Strategy Review now matches the latest work in Steps 1–4. Your previous draft was preserved in version history.';
      this.chooseStrategyReview();
    } catch (error) {
      console.error('Error refreshing from steps 1-4', error);
      this.strategySyncState = 'error';
      this.strategySyncNotice =
        'The draft could not be replaced. Your existing Strategy Review was not changed.';
    }
  }

  openRefreshStrategyReviewModal() {
    if (!this.isStrategyReviewStep) {
      return;
    }
    this.showRefreshStrategyReviewModal = true;
  }

  cancelRefreshStrategyReview() {
    this.showRefreshStrategyReviewModal = false;
  }

  confirmRefreshStrategyReview() {
    this.showRefreshStrategyReviewModal = false;
    void this.refreshStrategyReviewFromSteps();
  }

  get canRestorePreviousStrategyReview(): boolean {
    const previousReview =
      this.currentSolution.strategyReviewPreviousRevision?.review || '';
    return (
      this.strategySyncState !== 'attention' &&
      Boolean(previousReview) &&
      previousReview !== this.strategyReview
    );
  }

  openRestoreStrategyReviewModal(): void {
    if (this.canRestorePreviousStrategyReview) {
      this.showRestoreStrategyReviewModal = true;
    }
  }

  cancelRestoreStrategyReview(): void {
    this.showRestoreStrategyReviewModal = false;
  }

  async confirmRestoreStrategyReview(): Promise<void> {
    const previousReview =
      this.currentSolution.strategyReviewPreviousRevision?.review || '';
    if (
      !previousReview ||
      !this.strategySyncMetadata ||
      this.restoringPreviousStrategyReview
    ) {
      this.showRestoreStrategyReviewModal = false;
      return;
    }

    this.restoringPreviousStrategyReview = true;
    try {
      const currentReview = this.strategyReview;
      await this.solution.saveStrategyReviewReconciliation(
        this.solutionId,
        previousReview,
        {
          ...this.strategySyncMetadata,
          lastOutcome: 'restored',
        },
        {
          previousReview: currentReview,
          reason: 'restored',
        }
      );
      this.strategyReview = previousReview;
      this.lastSavedStrategyReview = previousReview;
      this.strategySyncMetadata = {
        ...this.strategySyncMetadata,
        lastOutcome: 'restored',
      };
      this.strategySyncState = 'aligned';
      this.strategySyncNotice =
        'The previous Strategy Review was restored. Steps 1–4 were not changed.';
      this.chooseStrategyReview();
    } catch (error) {
      console.error('Could not restore the previous Strategy Review', error);
      this.strategySyncState = 'error';
      this.strategySyncNotice =
        'The previous draft could not be restored. Your current Strategy Review was not changed.';
    } finally {
      this.restoringPreviousStrategyReview = false;
      this.showRestoreStrategyReviewModal = false;
    }
  }

  private buildStrategySummary(): string {
    return buildStrategyReviewFromSteps(
      this.currentSolution.status,
      this.getStrategyHeadingMap()
    );
  }

  async resolveStrategyConflict(
    conflict: StrategyReviewConflict,
    resolution: StrategyReviewResolution
  ): Promise<void> {
    if (
      !this.pendingStrategyReconciliation ||
      this.resolvingStrategyConflict
    ) {
      return;
    }

    this.resolvingStrategyConflict = true;
    this.savingStrategyConflictStep = conflict.stepKey;
    try {
      const previousReview = this.strategyReview;
      const nextDraft = resolveStrategyReviewConflict(
        this.pendingStrategyDraft,
        conflict,
        resolution
      );
      const outcome =
        resolution === 'keep-review'
          ? 'kept-review'
          : resolution === 'use-steps'
            ? 'replaced'
            : 'merged';
      const remainingConflicts = this.strategyConflicts.filter(
        (item) => item.stepKey !== conflict.stepKey
      );
      const previousMetadata =
        this.pendingStrategyReconciliation.nextMetadata;
      const recoveryAlreadyCreated =
        previousMetadata.reconciliationRecoveryCreated || false;
      const createsRecoveryCopy =
        !recoveryAlreadyCreated &&
        Boolean(previousReview) &&
        previousReview !== nextDraft;
      const acknowledgedMetadata = acknowledgeConflictStep(
        previousMetadata,
        this.currentSolution.status,
        conflict.stepKey,
        outcome,
        this.getStrategyHeadingMap()
      );
      const nextMetadata: StrategyReviewSyncMetadata = {
        ...acknowledgedMetadata,
        pendingConflictStepKeys: remainingConflicts.map(
          (item) => item.stepKey
        ),
        reconciliationRecoveryCreated: remainingConflicts.length
          ? recoveryAlreadyCreated || createsRecoveryCopy
          : false,
      };
      const syncStatus = remainingConflicts.length
        ? 'attention'
        : 'aligned';

      await this.solution.saveStrategyReviewReconciliation(
        this.solutionId,
        nextDraft,
        nextMetadata,
        {
          previousReview,
          reason: outcome,
          syncStatus,
          remainingConflictCount: remainingConflicts.length,
          preserveRecoveryRevision: recoveryAlreadyCreated,
        }
      );

      this.strategyReview = nextDraft;
      this.lastSavedStrategyReview = this.strategyReview;
      this.strategySyncMetadata = nextMetadata;
      this.currentSolution.strategyReview = nextDraft;
      this.currentSolution.strategyReviewSyncMetadata = nextMetadata;
      this.currentSolution.strategyReviewSyncStatus = syncStatus;
      this.currentSolution.strategyReviewConflictCount =
        remainingConflicts.length;
      this.pendingStrategyDraft = nextDraft;
      this.strategyConflicts = remainingConflicts;
      delete this.expandedStrategyConflictSteps[conflict.stepKey];

      if (remainingConflicts.length) {
        this.pendingStrategyReconciliation = {
          ...this.pendingStrategyReconciliation,
          draftHtml: nextDraft,
          conflicts: remainingConflicts,
          nextMetadata,
        };
        this.strategySyncState = 'attention';
        this.strategySyncNotice = `Decision saved. ${
          remainingConflicts.length
        } ${
          remainingConflicts.length === 1 ? 'section remains' : 'sections remain'
        }. You can safely leave and return later.`;
      } else {
        this.pendingStrategyReconciliation = undefined;
        this.pendingStrategyDraft = '';
        this.expandedStrategyConflictSteps = {};
        this.strategySyncState = 'aligned';
        this.strategySyncNotice =
          'All decisions are saved. Strategy Review is up to date, Steps 1–4 were not changed, and your previous draft was preserved.';
      }
      this.chooseStrategyReview();
      if (!remainingConflicts.length && resolution === 'combine') {
        this.highlightMergedStrategyReview();
      }
    } catch (error) {
      console.error('Could not resolve Strategy Review conflict', error);
      if (this.isConcurrentStrategyChange(error)) {
        this.strategySyncState = 'loading';
        this.strategySyncNotice =
          'New team changes arrived while you were deciding. We are checking the latest version again.';
        this.scheduleStrategyReconciliation(500);
      } else {
        this.strategySyncState = 'attention';
        this.strategySyncNotice =
          'That decision was not saved. Your existing Strategy Review was not changed—please try again.';
      }
    } finally {
      this.resolvingStrategyConflict = false;
      this.savingStrategyConflictStep = undefined;
    }
  }

  async keepCurrentStrategyReviewForAllConflicts(): Promise<void> {
    if (
      !this.pendingStrategyReconciliation ||
      !this.strategyConflicts.length ||
      this.resolvingStrategyConflict
    ) {
      return;
    }

    this.resolvingStrategyConflict = true;
    try {
      const recoveryAlreadyCreated =
        this.pendingStrategyReconciliation.nextMetadata
          .reconciliationRecoveryCreated || false;
      let metadata = this.pendingStrategyReconciliation.nextMetadata;
      this.strategyConflicts.forEach((conflict) => {
        metadata = acknowledgeConflictStep(
          metadata,
          this.currentSolution.status,
          conflict.stepKey,
          'kept-review',
          this.getStrategyHeadingMap()
        );
      });
      metadata = {
        ...metadata,
        pendingConflictStepKeys: [],
        reconciliationRecoveryCreated: false,
      };
      await this.solution.saveStrategyReviewReconciliation(
        this.solutionId,
        this.pendingStrategyDraft,
        metadata,
        {
          previousReview: this.strategyReview,
          reason: 'kept-review',
          syncStatus: 'aligned',
          remainingConflictCount: 0,
          preserveRecoveryRevision: recoveryAlreadyCreated,
        }
      );
      this.strategyReview = this.pendingStrategyDraft;
      this.lastSavedStrategyReview = this.strategyReview;
      this.strategySyncMetadata = metadata;
      this.currentSolution.strategyReview = this.strategyReview;
      this.currentSolution.strategyReviewSyncMetadata = metadata;
      this.currentSolution.strategyReviewSyncStatus = 'aligned';
      this.currentSolution.strategyReviewConflictCount = 0;
      this.pendingStrategyReconciliation = undefined;
      this.pendingStrategyDraft = '';
      this.strategyConflicts = [];
      this.expandedStrategyConflictSteps = {};
      this.strategySyncState = 'aligned';
      this.strategySyncNotice =
        'Your wording was kept for every conflicting section. Safe updates from other sections were added, Steps 1–4 were not changed, and you will only be asked again when those steps contain newer changes.';
      this.chooseStrategyReview();
    } catch (error) {
      console.error('Could not keep the current Strategy Review', error);
      if (this.isConcurrentStrategyChange(error)) {
        this.strategySyncState = 'loading';
        this.strategySyncNotice =
          'New team changes arrived while you were deciding. We are checking the latest version again.';
        this.scheduleStrategyReconciliation(500);
      } else {
        this.strategySyncState = 'attention';
        this.strategySyncNotice =
          'Those decisions were not saved. Your Strategy Review was not changed—please try again.';
      }
    } finally {
      this.resolvingStrategyConflict = false;
    }
  }

  strategyConflictSourceText(conflict: StrategyReviewConflict): string {
    const changedText = strategyReviewPlainText(conflict.changedSourceHtml);
    const removedNotice = this.strategyConflictRemovedNotice(conflict);
    return [changedText, removedNotice].filter(Boolean).join('\n\n');
  }

  strategyConflictRemovedNotice(
    conflict: StrategyReviewConflict
  ): string {
    return conflict.removedAnswerKeys.length
      ? `${conflict.removedAnswerKeys.length} previously saved ${
          conflict.removedAnswerKeys.length === 1 ? 'answer was' : 'answers were'
        } removed from Step ${conflict.stepNumber}.`
      : '';
  }

  strategyConflictHasNewContent(
    conflict: StrategyReviewConflict
  ): boolean {
    return (
      strategyReviewPlainText(conflict.changedSourceHtml).length > 0 ||
      /<(?:img|video|audio|iframe|table)\b/i.test(
        conflict.changedSourceHtml || ''
      )
    );
  }

  strategyConflictDraftText(conflict: StrategyReviewConflict): string {
    return (
      strategyReviewPlainText(conflict.currentDraftHtml) ||
      'This section is not currently present in Strategy Review.'
    );
  }

  strategyConflictQuestionLabel(conflict: StrategyReviewConflict): string {
    return conflict.changedAnswerKeys
      .map((key) => {
        const suffix = key.split('-')[1];
        return suffix ? `Question ${suffix}` : key;
      })
      .join(', ');
  }

  strategyConflictChangeType(conflict: StrategyReviewConflict): string {
    if (!conflict.currentDraftHtml && conflict.currentSourceHtml) {
      return 'New section';
    }
    if (
      conflict.removedAnswerKeys.length === conflict.changedAnswerKeys.length &&
      !conflict.currentSourceHtml
    ) {
      return 'Removed from Step';
    }
    if (conflict.removedAnswerKeys.length) {
      return 'Updated and removed';
    }
    return conflict.legacy ? 'One-time review' : 'Updated information';
  }

  strategyConflictNeedsExpansion(
    conflict: StrategyReviewConflict
  ): boolean {
    return this.strategyConflictDisplay(conflict).needsExpansion;
  }

  strategyConflictLengthLabel(conflict: StrategyReviewConflict): string {
    const blocks = this.strategyConflictDisplay(conflict).blockCount;
    return blocks === 1 ? '1 paragraph' : `${blocks} paragraphs`;
  }

  isStrategyConflictExpanded(conflict: StrategyReviewConflict): boolean {
    return (
      !this.strategyConflictNeedsExpansion(conflict) ||
      Boolean(this.expandedStrategyConflictSteps[conflict.stepKey])
    );
  }

  toggleStrategyConflictExpansion(
    conflict: StrategyReviewConflict
  ): void {
    this.expandedStrategyConflictSteps = {
      ...this.expandedStrategyConflictSteps,
      [conflict.stepKey]: !this.isStrategyConflictExpanded(conflict),
    };
  }

  get hasExpandableStrategyConflicts(): boolean {
    return this.strategyConflicts.some((conflict) =>
      this.strategyConflictNeedsExpansion(conflict)
    );
  }

  get allStrategyConflictsExpanded(): boolean {
    const expandable = this.strategyConflicts.filter((conflict) =>
      this.strategyConflictNeedsExpansion(conflict)
    );
    return (
      expandable.length > 0 &&
      expandable.every(
        (conflict) =>
          this.expandedStrategyConflictSteps[conflict.stepKey] === true
      )
    );
  }

  setAllStrategyConflictsExpanded(expanded: boolean): void {
    this.expandedStrategyConflictSteps = this.strategyConflicts.reduce<
      Partial<Record<StrategyReviewStepKey, boolean>>
    >((state, conflict) => {
      if (this.strategyConflictNeedsExpansion(conflict)) {
        state[conflict.stepKey] = expanded;
      }
      return state;
    }, {});
  }

  focusStrategySyncPanel(): void {
    document.getElementById('strategy-review-sync-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  private highlightMergedStrategyReview(): void {
    this.strategyReviewMergeHighlighted = true;
    if (this.strategyReviewMergeHighlightTimer) {
      clearTimeout(this.strategyReviewMergeHighlightTimer);
    }
    setTimeout(() => {
      document.getElementById('box-0')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    this.strategyReviewMergeHighlightTimer = setTimeout(() => {
      this.strategyReviewMergeHighlighted = false;
    }, 3500);
  }

  private strategyConflictBlockCount(
    conflict: StrategyReviewConflict
  ): number {
    const html = `${conflict.changedSourceHtml || ''}\n${
      conflict.currentDraftHtml || ''
    }`;
    const htmlBlocks =
      html.match(/<(?:p|li|h[1-6]|blockquote|table)\b/gi)?.length || 0;
    if (htmlBlocks) {
      return htmlBlocks;
    }
    const textBlocks = `${this.strategyConflictSourceText(conflict)}\n${
      this.strategyConflictDraftText(conflict)
    }`
      .split(/\n{2,}/)
      .filter((block) => block.trim()).length;
    return Math.max(1, textBlocks);
  }

  private strategyConflictDisplay(
    conflict: StrategyReviewConflict
  ): { blockCount: number; needsExpansion: boolean } {
    const cached = this.strategyConflictDisplayCache.get(conflict);
    if (cached) {
      return cached;
    }
    const blockCount = this.strategyConflictBlockCount(conflict);
    const sourceText = this.strategyConflictSourceText(conflict);
    const draftText = this.strategyConflictDraftText(conflict);
    const display = {
      blockCount,
      needsExpansion:
        sourceText.length + draftText.length > 700 || blockCount > 8,
    };
    this.strategyConflictDisplayCache.set(conflict, display);
    return display;
  }

  private scheduleStrategyReconciliation(delay = 150): void {
    if (!this.isStrategyReviewStep || !this.dataInitialized) {
      return;
    }
    if (this.strategyReconciliationTimer) {
      clearTimeout(this.strategyReconciliationTimer);
    }
    this.strategyReconciliationTimer = setTimeout(() => {
      void this.reconcileCurrentStrategy();
    }, delay);
  }

  private async reconcileCurrentStrategy(): Promise<void> {
    if (
      this.strategyReconciliationInFlight ||
      !this.isStrategyReviewStep ||
      !this.strategySyncMetadata
    ) {
      return;
    }

    this.strategyReconciliationInFlight = true;
    try {
      const latestSource = this.buildStrategySummary();
      this.contentsArray = [latestSource];
      this.staticContentArray = [latestSource];
      const reconciliation = reconcileStrategyReview(
        this.currentSolution.status,
        this.strategyReview,
        this.strategySyncMetadata,
        this.getStrategyHeadingMap()
      );
      await this.applyStrategyReconciliation(reconciliation, false);
    } catch (error) {
      console.error('Could not reconcile Strategy Review', error);
      if (this.isConcurrentStrategyChange(error)) {
        this.strategySyncState = 'loading';
        this.strategySyncNotice =
          'New team changes arrived. We are checking the latest version again.';
        this.scheduleStrategyReconciliation(500);
      } else {
        this.strategySyncState = 'error';
        this.strategySyncNotice =
          'We could not compare this draft with Steps 1–4. Your work was not changed.';
      }
    } finally {
      this.strategyReconciliationInFlight = false;
    }
  }

  private async applyStrategyReconciliation(
    reconciliation: StrategyReviewReconciliation,
    initializing: boolean
  ): Promise<void> {
    this.pendingStrategyReconciliation = undefined;
    this.pendingStrategyDraft = '';
    this.strategyConflicts = [];

    if (reconciliation.state === 'aligned') {
      this.expandedStrategyConflictSteps = {};
      this.strategySyncMetadata = reconciliation.nextMetadata;
      this.strategySyncState = 'aligned';
      this.strategySyncNotice = initializing
        ? 'Strategy Review is up to date with Steps 1–4.'
        : '';

      if (
        reconciliation.legacy ||
        this.currentSolution.strategyReviewSyncStatus === 'attention'
      ) {
        await this.solution.saveStrategyReviewReconciliation(
          this.solutionId,
          this.strategyReview,
          reconciliation.nextMetadata,
          {
            previousReview: this.strategyReview,
            reason: reconciliation.legacy
              ? 'initialized'
              : reconciliation.nextMetadata.lastOutcome,
          }
        );
      }
      return;
    }

    if (reconciliation.state === 'auto-updated') {
      this.expandedStrategyConflictSteps = {};
      const previousReview = this.strategyReview;
      const reason = previousReview.trim() ? 'auto-updated' : 'generated';
      const metadata = {
        ...reconciliation.nextMetadata,
        lastOutcome: reason,
      } as StrategyReviewSyncMetadata;
      await this.solution.saveStrategyReviewReconciliation(
        this.solutionId,
        reconciliation.draftHtml,
        metadata,
        {
          previousReview,
          reason,
        }
      );
      this.strategyReview = reconciliation.draftHtml;
      this.lastSavedStrategyReview = this.strategyReview;
      this.strategySyncMetadata = metadata;
      this.strategySyncState = previousReview.trim() ? 'updated' : 'aligned';
      this.strategySyncNotice = previousReview.trim()
        ? `Strategy Review was updated with ${reconciliation.changedAnswerKeys.length} newer ${
            reconciliation.changedAnswerKeys.length === 1
              ? 'answer'
              : 'answers'
          }. Your draft-only writing was preserved.`
        : 'Strategy Review was created from Steps 1–4.';
      return;
    }

    const previousReview = this.strategyReview;
    const recoveryAlreadyCreated =
      reconciliation.nextMetadata.reconciliationRecoveryCreated || false;
    const createsRecoveryCopy =
      !recoveryAlreadyCreated &&
      Boolean(previousReview) &&
      previousReview !== reconciliation.draftHtml;
    const progressMetadata: StrategyReviewSyncMetadata = {
      ...reconciliation.nextMetadata,
      pendingConflictStepKeys: reconciliation.conflicts.map(
        (conflict) => conflict.stepKey
      ),
      reconciliationRecoveryCreated:
        recoveryAlreadyCreated || createsRecoveryCopy,
    };
    const progressReconciliation: StrategyReviewReconciliation = {
      ...reconciliation,
      nextMetadata: progressMetadata,
    };

    this.pendingStrategyReconciliation = progressReconciliation;
    this.pendingStrategyDraft = progressReconciliation.draftHtml;
    this.strategyConflicts = [...reconciliation.conflicts];
    this.expandedStrategyConflictSteps =
      this.strategyConflicts.reduce<
        Partial<Record<StrategyReviewStepKey, boolean>>
      >((state, conflict) => {
        if (this.expandedStrategyConflictSteps[conflict.stepKey]) {
          state[conflict.stepKey] = true;
        }
        return state;
      }, {});
    this.strategySyncState = 'attention';
    const progressAlreadyPersisted =
      this.strategyReconciliationProgressIsPersisted(
        progressReconciliation.draftHtml,
        progressMetadata,
        this.strategyConflicts.length
      );
    this.strategySyncNotice = progressAlreadyPersisted
      ? `Your earlier decisions are saved. ${this.strategyConflicts.length} ${
          this.strategyConflicts.length === 1 ? 'section remains' : 'sections remain'
        }, and you can continue where you left off.`
      : reconciliation.legacy
        ? `This existing draft needs a one-time review against Steps 1–4. ${this.strategyConflicts.length} ${
            this.strategyConflicts.length === 1 ? 'section needs' : 'sections need'
          } your decision.`
        : `${this.strategyConflicts.length} ${
            this.strategyConflicts.length === 1 ? 'section needs' : 'sections need'
          } your decision. Each decision saves immediately, and unrelated draft writing will be preserved.`;

    if (!progressAlreadyPersisted) {
      await this.solution.saveStrategyReviewReconciliation(
        this.solutionId,
        progressReconciliation.draftHtml,
        progressMetadata,
        {
          previousReview,
          reason: reconciliation.legacy
            ? 'initialized'
            : progressMetadata.lastOutcome,
          syncStatus: 'attention',
          remainingConflictCount: this.strategyConflicts.length,
          preserveRecoveryRevision: recoveryAlreadyCreated,
        }
      );
      this.strategyReview = progressReconciliation.draftHtml;
      this.lastSavedStrategyReview = this.strategyReview;
      this.strategySyncMetadata = progressMetadata;
      this.currentSolution.strategyReview = this.strategyReview;
      this.currentSolution.strategyReviewSyncMetadata = progressMetadata;
      this.currentSolution.strategyReviewSyncStatus = 'attention';
      this.currentSolution.strategyReviewConflictCount =
        this.strategyConflicts.length;
    }
  }

  private strategyReconciliationProgressIsPersisted(
    review: string,
    metadata: StrategyReviewSyncMetadata,
    conflictCount: number
  ): boolean {
    const savedMetadata =
      this.currentSolution.strategyReviewSyncMetadata ||
      this.strategySyncMetadata;
    return (
      this.currentSolution.strategyReviewSyncStatus === 'attention' &&
      Number(this.currentSolution.strategyReviewConflictCount || 0) ===
        conflictCount &&
      String(this.currentSolution.strategyReview || '') === review &&
      savedMetadata?.lastReviewedStepsHash ===
        metadata.lastReviewedStepsHash &&
      (savedMetadata?.sourceSnapshotHash ||
        savedMetadata?.lastReviewedStepsHash) ===
        (metadata.sourceSnapshotHash || metadata.lastReviewedStepsHash) &&
      (savedMetadata?.pendingConflictStepKeys || []).join('|') ===
        (metadata.pendingConflictStepKeys || []).join('|') &&
      Boolean(savedMetadata?.reconciliationRecoveryCreated) ===
        Boolean(metadata.reconciliationRecoveryCreated)
    );
  }

  private isConcurrentStrategyChange(error: unknown): boolean {
    const message = String((error as any)?.message || error || '');
    return (
      message.includes('STRATEGY_REVIEW_CHANGED') ||
      message.includes('STRATEGY_STEPS_CHANGED')
    );
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

  openAskBucky(index?: number) {
    if (typeof index === 'number') {
      this.clickedDisplayPopups[index] = false;
      this.displayPopups[index] = false;
    }
    this.buckyChat?.openBot();
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

  beginTitleEdit() {
    this.titleDraft = (this.currentSolution.title || this.title || '').trim();
    this.newTitle = this.titleDraft;
    this.isEditingTitle = true;
  }

  cancelTitleEdit() {
    this.isEditingTitle = false;
    this.isSavingTitle = false;
    this.titleDraft = this.currentSolution.title || this.title || '';
    this.newTitle = this.titleDraft;
  }

  updateTitile() {
    const trimmedTitle = (this.titleDraft || this.newTitle || '').trim();

    if (!trimmedTitle) {
      alert('Enter a title');
      return;
    }

    if (trimmedTitle === (this.currentSolution.title || '').trim()) {
      this.cancelTitleEdit();
      if (this.updateTitleBox) {
        this.toggleUpdateTitle();
      }
      return;
    }

    this.isSavingTitle = true;
    this.solution
      .updateSolutionTitle(this.currentSolution.solutionId!, trimmedTitle)
      .then(() => {
        this.title = trimmedTitle;
        this.currentSolution.title = trimmedTitle;
        this.titleDraft = trimmedTitle;
        this.newTitle = trimmedTitle;
        this.isEditingTitle = false;
        this.isSavingTitle = false;
        if (this.updateTitleBox) {
          this.toggleUpdateTitle();
        }
      })
      .catch((error: any) => {
        this.isSavingTitle = false;
        alert('Error occured while updating title. Try again!');
      });
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
    this.solutionSub?.unsubscribe();
    clearTimeout(this.saveTimeout);
    if (this.strategyReconciliationTimer) {
      clearTimeout(this.strategyReconciliationTimer);
    }
    if (this.strategyReviewMergeHighlightTimer) {
      clearTimeout(this.strategyReviewMergeHighlightTimer);
    }
    this.stopAnswerTyping();
    this.activity.stopEditing();
  }

  private registerAnswerTypingActivity(questionIndex: number): void {
    const uid = this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
    if (!this.solutionId || !uid) return;

    const locationLabel =
      `${this.currentLanguage === 'fr' ? 'Étape' : 'Step'} ${
        this.stepNumber + 1
      } · Question ${questionIndex + 1}`;
    const now = Date.now();
    if (
      locationLabel !== this.lastAnswerTypingLocation ||
      now - this.lastAnswerTypingWriteAt >= 900
    ) {
      this.lastAnswerTypingWriteAt = now;
      this.lastAnswerTypingLocation = locationLabel;
      const displayName =
        [this.auth.currentUser?.firstName, this.auth.currentUser?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        this.auth.currentUser?.email ||
        'Team member';
      const avatarUrl =
        this.auth.currentUser?.profilePicture?.downloadURL || '';

      void this.presence.setTyping(
        `solution-${this.solutionId}`,
        uid,
        displayName,
        avatarUrl,
        'solution',
        locationLabel
      );
    }

    if (this.answerTypingStopTimeout) {
      clearTimeout(this.answerTypingStopTimeout);
    }
    this.answerTypingStopTimeout = setTimeout(
      () => this.stopAnswerTyping(),
      2_800
    );
  }

  private stopAnswerTyping(): void {
    if (this.answerTypingStopTimeout) {
      clearTimeout(this.answerTypingStopTimeout);
      this.answerTypingStopTimeout = undefined;
    }
    this.lastAnswerTypingWriteAt = 0;
    this.lastAnswerTypingLocation = '';

    const uid = this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
    if (this.solutionId && uid) {
      void this.presence.clearTyping(`solution-${this.solutionId}`, uid);
    }
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

  private getStrategyHeadingMap(): Record<StrategyReviewStepKey, string> {
    const headings = this.getLocalizedStrategyHeadings();
    return {
      S1: headings[0],
      S2: headings[1],
      S3: headings[2],
      S4: headings[3],
    };
  }
}
