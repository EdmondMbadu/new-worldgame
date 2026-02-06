import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { Router, NavigationEnd, Route } from '@angular/router';
import jsPDF from 'jspdf';
import * as Editor from 'ckeditor5-custom-build/build/ckeditor';
// import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { AuthService } from 'src/app/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Evaluator, Roles, Solution } from 'src/app/models/solution';
import { SolutionService } from 'src/app/services/solution.service';
import { DataService } from 'src/app/services/data.service';
import { User } from 'src/app/models/user';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { firstValueFrom, Subscription } from 'rxjs';
import { LanguageService } from 'src/app/services/language.service';
import { ChatContextService, PlaygroundQuestion, PlaygroundContext } from 'src/app/services/chat-context.service';
import { PlaygroundStepComponent } from '../playground-step/playground-step.component';
import {
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ShadingType,
  BorderStyle,
} from 'docx';

type SupportedLanguage = 'en' | 'fr';

interface PlaygroundLanguageContent {
  steps: string[];
  subtitles: string[];
  questions: string[][];
}

interface AiScoreCard {
  label: string;
  scoreValue?: string;
  scoreMax?: string;
  reason?: string;
  raw?: string;
}

interface AiFeedbackDisplay {
  scores: AiScoreCard[];
  improvements: string[];
  readinessLevel?: string;
  readinessDetails?: string;
}

interface AiEvaluatorOption {
  name: string;
  avatarPath: string;
  collectionKey: string;
}

interface ReportType {
  id: string;
  title: string;
  instruction: string;
  summary?: string;
  group: string;
  systemPrompt?: string; // Optional custom system prompt for specialized reports
}

interface ReportGroup {
  id: string;
  label: string;
}

interface ImpactBmcTableData {
  problemStatement: string;
  missionStatement: string;
  keyPartners: string;
  keyActivities: string;
  valueProposition: string;
  stakeholderRelationships: string;
  stakeholderSegments: string;
  keyResources: string;
  channels: string;
  costStructure: string;
  revenueStreams: string;
  intendedImpact: string;
}

interface SavedAiFeedback {
  evaluatorName: string;
  evaluatorKey: string;
  evaluatorAvatar: string;
  feedbackText: string;
  feedbackParsed: AiFeedbackDisplay;
  timestamp: number;
}

@Component({
  selector: 'app-playground-steps',
  templateUrl: './playground-steps.component.html',
  styleUrls: ['./playground-steps.component.css'],
})
export class PlaygroundStepsComponent implements OnInit, OnDestroy {
  id: any = '';
  currentSolution: Solution = {};
  teamMembers: User[] = [];
  roles: Roles = {
    facilitator: '',
    teamLeader: '',
    factChecker: '',
  };
  currentUser: User = {};
  showPopUpTeam: boolean[] = [];
  showTeamLeader: boolean = false;
  showFactChecker: boolean = false;
  showFacilitator: boolean = false;
  showPopUpContributors: boolean[] = [];
  showPopUpEvaluators: boolean[] = [];
  showAddTeamMember: boolean = false;
  showRemoveTeamMember: boolean = false;
  hoverAddTeamMember: boolean = false;
  evaluators: User[] = [];
  etAl: string = '';
  newTeamMember: string = '';
  teamMemberToDelete: string = '';
  evaluatorInviteInput: string = '';
  evaluatorInviteSuggestions: User[] = [];
  selectedEvaluatorUser: User | null = null;
  showEvaluatorSuggestions: boolean = false;
  isSearchingEvaluators: boolean = false;
  isInvitingEvaluator: boolean = false;
  evaluatorInviteStatus: string = '';
  evaluatorInviteError: string = '';
  showHumanInvite: boolean = false;
  recentEvaluatorInvites: Array<{
    email: string;
    name: string;
    status: 'success' | 'error' | 'exists';
    message?: string;
  }> = [];
  private evaluatorInviteSearchTimeout: any;

  hoverChangeReadMe: boolean = false;
  updateReadMeBox: boolean = false;
  newReadMe: string = '';

  teamLeader: User = {};
  factChecker: User = {};
  facilitator: User = {};

  currentUserIsTeamleader: boolean = false;
  currentUserIsFactChecker: boolean = false;
  currentUserIsFacilitator: boolean = false;
  isHovering?: boolean;

  private readonly defaultLanguage: SupportedLanguage = 'en';
  private readonly localizedContent: Record<
    SupportedLanguage,
    PlaygroundLanguageContent
  > = {
    en: {
      steps: [
        'Step 1:  Defining the Problem State',
        'Step 2: Envisioning the Preferred State',
        'Step 3: Developing Our Solution',
        'Step 4: Implementation',
        'Step 5: Strategy Outreach',
      ],
      subtitles: [
        'Where we are now',
        'Where we want to be',
        'How we get to the Preferred State',
        'Actions: What, where, who, when, costs, funders, You',
        'Final Review and update order of things',
      ],
      questions: [
        [
          `What is the problem you have chosen and why is it important? 
(Answer these questions first from your personal knowledge. Then Ask Bucky.)`,
          `What are the symptoms of this problem? How do you measure it? (Answer these 2 questions first from your personal knowledge. Then Ask Bucky-- after these questions, ask Bucky or answer from your knowledge: What are the causes of these symptoms? This provides deeper insight into the problem.)`,
          `How many people does this problem impact in the world? Where is it most severe? (If you don't know, ask Bucky, or use the data sources provided when you click on the "?" .)`,
          `What will happen if nothing is done to deal with this problem? (Answer this first from your personal knowledge. Then Ask Bucky.)`,
        ],
        [
          `What is the preferred or ideal state that you want to reach with your solution? What is your goal? What will the world look like if this problem is solved? (Answer these questions first from your personal knowledge. Then Ask Bucky.)`,
          `How will you measure success? How will you know when you reach the preferred state? (Answer this first from your personal knowledge. Then Ask Bucky.)`,
        ],
        [
          "What does our solution do to reach the preferred state? How will it do it? (If you don't have a solution, check the Solutions Library to get some ideas, and/or Ask Bucky what he thinks is a solution that will get you from the Problem to the Preferred state.)",
          'What technology, programs, policies will it need?',
          'What resources does our solution need?',
          'Is there a business opportunity in the solution? Is it possible to meet need/solve the problem through a business? If so, what is this business? What will it do or sell? (If this question is not relevant to your solution, ignore it.)',
          'How is our solution part of a circular, regenerative, more equitable economy?',
        ],
        [
          `Cost 1. How much will our strategy cost to test, for a proof-of-concept, in the country where we will test and first implement the solution?  (Answer this as best you can. Then ask Bucky. See `,
          'Cost 2. How much will our strategy cost to implement at scale?',
          'Where will we get the resources and funding or investment needed to implement our solution, to do the above?',
          'Who will implement our solution? Where will it be tested (and first implemented)? Who will be our in-country/on-the-ground partner?',
          'What actions are needed in the next 6-12 months to get our solution implemented? Who will do what, when, where?',
          'What does our implemented strategy look like, in more detail? (For this task ask one of our AI colleagues to describe what the strategy will look like when implemented).',
          'Results 1. Ask Bucky, and/or one of your AI Colleagues, "What are the results of implementing our strategy? What would be the results of providing everyone in a community ____________ (insert description of your strategy) on the local economy, jobs, environment, human health, and other social factors?"',
          'Results 2. Ask Bucky, and/or one of your AI Colleagues, "What would be the results of providing everyone in the world ____________ (insert description of your strategy) on the global economy, additional jobs, environment, human health, and other social factors?"',
          'Describe how your strategy achieves the Preferred State you developed.',
          'Describe how your strategy positively impacts the environment.',
          'Describe the best funding sources for your strategy’s implementation.',
          'Describe how your strategy is equitable and/or socially just.',
          'What would we do with $10,000 to advance the strategy towards implementation?',
          'What can you/your team do — starting now, with just the resources to which you have access, to move your strategy forward?',
        ],
        [
          'Review Your Entire Strategy, Preview it, Add what you think might be missing, add Title, Names of Team members, Format it for publication.',
        ],
      ],
    },
    fr: {
      steps: [
        `Étape 1 : Définir l'état du problème`,
        `Étape 2 : Imaginer l'état souhaité`,
        `Étape 3 : Concevoir notre solution`,
        `Étape 4 : Mise en œuvre`,
        `Étape 5 : Diffusion de la stratégie`,
      ],
      subtitles: [
        `Où nous en sommes aujourd'hui`,
        `Où nous voulons être`,
        `Comment atteindre l'état souhaité`,
        `Actions : quoi, où, qui, quand, coûts, financeurs, vous`,
        `Relecture finale et hiérarchisation`,
      ],
      questions: [
        [
          `Quel problème avez-vous choisi et pourquoi est-il important ?
(Répondez d'abord à ces questions selon vos propres connaissances. Puis demandez à Bucky.)`,
          `Quels sont les symptômes de ce problème ? Comment le mesurez-vous ? (Répondez d'abord à ces deux questions selon vos connaissances, puis demandez à Bucky — après ces questions, demandez à Bucky ou répondez selon vos connaissances : quelles sont les causes de ces symptômes ? Cela apporte un éclairage plus profond sur le problème.)`,
          `Combien de personnes ce problème touche-t-il dans le monde ? Où est-il le plus grave ? (Si vous ne le savez pas, demandez à Bucky ou utilisez les sources de données proposées lorsque vous cliquez sur le " ? ".)`,
          `Que se passera-t-il si rien n'est fait pour résoudre ce problème ? (Répondez d'abord selon vos propres connaissances. Puis demandez à Bucky.)`,
        ],
        [
          `Quel est l'état souhaité ou idéal que vous voulez atteindre avec votre solution ? Quel est votre objectif ? À quoi ressemblera le monde si ce problème est résolu ? (Répondez d'abord selon vos propres connaissances. Puis demandez à Bucky.)`,
          `Comment mesurerez-vous le succès ? Comment saurez-vous que vous avez atteint l'état souhaité ? (Répondez d'abord selon vos connaissances. Puis demandez à Bucky.)`,
        ],
        [
          `Que fait notre solution pour atteindre l'état souhaité ? Comment y parvient-elle ? (Si vous n'avez pas encore de solution, consultez la bibliothèque des solutions pour trouver des idées et/ou demandez à Bucky ce qu'il pense être une solution qui vous fera passer de l'état du problème à l'état souhaité.)`,
          `De quelles technologies, programmes ou politiques aura-t-elle besoin ?`,
          `De quelles ressources notre solution a-t-elle besoin ?`,
          `Existe-t-il une opportunité commerciale dans la solution ? Est-il possible de répondre au besoin/de résoudre le problème par une entreprise ? Si oui, quelle est cette entreprise ? Que fera-t-elle ou que vendra-t-elle ? (Si cette question n'est pas pertinente pour votre solution, ignorez-la.)`,
          `En quoi notre solution participe-t-elle à une économie circulaire, régénératrice et plus équitable ?`,
        ],
        [
          `Coût 1. Combien coûtera notre stratégie pour être testée, en preuve de concept, dans le pays où nous la testerons et la mettrons en œuvre pour la première fois ? (Répondez du mieux possible, puis demandez à Bucky. Voir `,
          `Coût 2. Combien coûtera notre stratégie pour être mise en œuvre à grande échelle ?`,
          `Où obtiendrons-nous les ressources et le financement ou l'investissement nécessaires pour mettre en œuvre notre solution, comme décrit ci-dessus ?`,
          `Qui mettra en œuvre notre solution ? Où sera-t-elle testée (et déployée en premier) ? Qui sera notre partenaire sur le terrain/dans le pays ?`,
          `Quelles actions sont nécessaires dans les 6 à 12 prochains mois pour mettre en œuvre notre solution ? Qui fera quoi, quand et où ?`,
          `À quoi ressemble, plus en détail, notre stratégie une fois mise en œuvre ? (Pour cette tâche, demandez à l'un de nos collègues IA de décrire à quoi ressemblera la stratégie une fois en place.)`,
          `Résultats 1. Demandez à Bucky ou à l'un de vos collègues IA : " Quels sont les résultats de la mise en œuvre de notre stratégie ? Quels seraient les effets de fournir à toute une communauté ____________ (décrivez votre stratégie) sur l'économie locale, l'emploi, l'environnement, la santé humaine et d'autres facteurs sociaux ? "`,
          `Résultats 2. Demandez à Bucky ou à l'un de vos collègues IA : " Quels seraient les effets de fournir à toute la planète ____________ (décrivez votre stratégie) sur l'économie mondiale, les emplois supplémentaires, l'environnement, la santé humaine et d'autres facteurs sociaux ? "`,
          `Décrivez comment votre stratégie atteint l'état souhaité que vous avez défini.`,
          `Décrivez comment votre stratégie a un impact positif sur l'environnement.`,
          `Décrivez les meilleures sources de financement pour la mise en œuvre de votre stratégie.`,
          `Décrivez en quoi votre stratégie est équitable et/ou socialement juste.`,
          `Que ferions-nous avec 10 000 $ pour faire avancer la stratégie vers la mise en œuvre ?`,
          `Que pouvez-vous/votre équipe faire — dès maintenant, avec les seules ressources auxquelles vous avez accès — pour faire progresser votre stratégie ?`,
        ],
        [
          `Relisez l'ensemble de votre stratégie, prévisualisez-la, ajoutez ce qui pourrait manquer, ajoutez un titre, les noms des membres de l'équipe, et mettez-la en forme pour la publication.`,
        ],
      ],
    },

  };

  private readonly buttonLabels: Record<
    SupportedLanguage,
    { next: string; preview: string }
  > = {
    en: { next: 'Next', preview: 'Preview Solution' },
    fr: { next: 'Suivant', preview: 'Prévisualiser la solution' },
  };

  currentLanguage: SupportedLanguage = this.defaultLanguage;
  steps: string[] = [...this.localizedContent[this.defaultLanguage].steps];
  subtitles: string[] = [
    ...this.localizedContent[this.defaultLanguage].subtitles,
  ];
  preferredStateGraphicUrl = '/blogs/custom-storyboard';
  display: boolean[] = [];
  buttontexts: string[] = [];
  AllQuestions: Array<Array<string>> = this.localizedContent[
    this.defaultLanguage
  ].questions.map((group) => [...group]);
  private langSub?: Subscription;
  private insertRequestSub?: Subscription;
  private solutionSub?: Subscription;
  aiFeedbackLoading = false;
  aiFeedbackStatus = '';
  aiFeedbackError = '';
  aiFeedbackText = '';
  aiFeedbackFormatted = '';
  aiFeedbackParsed: AiFeedbackDisplay = { scores: [], improvements: [] };
  currentDraftHtml = '';
  currentDraftText = '';
  private aiFeedbackDocSub?: Subscription;
  reportLoading = false;
  reportStatus = '';
  reportError = '';
  reportText = '';
  reportFormatted = '';
  showReportModal = false;
  reportInstruction = '';
  selectedReportTypeId = 'funding-sources';
  private reportDocSub?: Subscription;
  private reportTimeoutHandle?: ReturnType<typeof setTimeout>;

  // Download loading states
  downloadingDraftPdf = false;
  downloadingDraftDocx = false;
  downloadingReportPdf = false;
  downloadingReportDocx = false;
  downloadingFeedbackPdf = false;
  reportGroupState: Record<string, boolean> = {
    funder: true,
    summary: false,
    teacher: false,
    social: false,
    article: false,
    conference: false,
    youtube: false,
  };

  // AI Evaluator selection
  aiEvaluatorOptions: AiEvaluatorOption[] = [
    { name: 'Buckminster Fuller', avatarPath: '../../../assets/img/fuller.jpg', collectionKey: 'bucky' },
    { name: 'Marie Curie', avatarPath: '../../../assets/img/marie-curie.jpg', collectionKey: 'marie' },
    { name: 'Albert Einstein', avatarPath: '../../../assets/img/albert.png', collectionKey: 'albert' },
    { name: 'Rachel Carson', avatarPath: '../../../assets/img/rachel-carlson.jpeg', collectionKey: 'rachel' },
    { name: 'Nelson Mandela', avatarPath: '../../../assets/img/mandela.png', collectionKey: 'mandela' },
    { name: 'Mahatma Gandhi', avatarPath: '../../../assets/img/gandhi.jpg', collectionKey: 'gandhi' },
    { name: 'Zara Nkosi', avatarPath: '../../../assets/img/zara-agent.png', collectionKey: 'zara' },
    { name: 'Arjun Patel', avatarPath: '../../../assets/img/arjun-agent.png', collectionKey: 'arjun' },
    { name: 'Sofia Morales', avatarPath: '../../../assets/img/sofia-agent.png', collectionKey: 'sofia' },
    { name: 'Li Wei', avatarPath: '../../../assets/img/li-agent.png', collectionKey: 'li' },
    { name: 'Amina Al-Sayed', avatarPath: '../../../assets/img/amina-agent.png', collectionKey: 'amina' },
    { name: 'Elena Volkov', avatarPath: '../../../assets/img/elena-agent.png', collectionKey: 'elena' },
    { name: 'Tane Kahu', avatarPath: '../../../assets/img/tane-agent.png', collectionKey: 'tane' },
  ];
  selectedAiEvaluator: AiEvaluatorOption = this.aiEvaluatorOptions[0];
  showAiEvaluatorDropdown = false;
  studioActivePanel: 'export' | 'feedback' | 'report' | 'infographic' | null = null;
  showFeedbackResults = false;

  // Infographic generation state
  infographicLoading = false;
  infographicStatus = '';
  infographicError = '';
  infographicImageUrl = '';
  showInfographicResults = false;
  downloadingInfographic = false;
  private infographicDocSub?: Subscription;
  @ViewChild('aiEvaluatorDropdownRef') aiEvaluatorDropdownRef?: ElementRef;
  @ViewChildren(PlaygroundStepComponent) playgroundStepComponents!: QueryList<PlaygroundStepComponent>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showAiEvaluatorDropdown && this.aiEvaluatorDropdownRef) {
      const clickedInside = this.aiEvaluatorDropdownRef.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.showAiEvaluatorDropdown = false;
      }
    }
  }

  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private languageService: LanguageService,
    private afs: AngularFirestore,
    private chatContext: ChatContextService
  ) {
    this.currentUser = this.auth.currentUser;
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    
    // Real-time subscription to solution data
    this.solutionSub = this.solution.getSolution(this.id).subscribe((data: any) => {
      if (!data) return;
      
      const isFirstLoad = !this.currentSolution?.solutionId;
      
      // Update solution data
      this.currentSolution = data;
      this.updateCurrentDraftText();
      
      if (isFirstLoad) {
        // First load - initialize everything
        this.roles =
          this.currentSolution.roles !== undefined
            ? this.currentSolution.roles
            : {};
        this.currentSolution.evaluators?.forEach((ev: any) => {
          this.evaluators.push(ev);
        });
        this.etAl =
          Object.keys(this.currentSolution.participants!).length > 1
            ? 'Et al'
            : '';
        this.newReadMe = this.currentSolution.description!;

        this.getMembers();
        this.getEvaluators();
        this.loadSavedFeedback();
        // Set up chat context after solution loads
        this.setupChatContext();
      } else {
        // Subsequent updates - update chat context with latest data
        this.updateChatContextStep();
      }
    });
    this.initializeLanguageSupport();
  }

  reportGroups: ReportGroup[] = [
    { id: 'funder', label: 'Funder' },
    { id: 'summary', label: 'Summary' },
    { id: 'teacher', label: 'Teacher' },
    { id: 'social', label: 'Social Media' },
    { id: 'article', label: 'Article' },
    { id: 'conference', label: 'Conference' },
    { id: 'youtube', label: 'YouTube' },
  ];

  reportTypes: ReportType[] = [
    {
      id: 'funding-sources',
      title: 'Funding Sources List',
      group: 'funder',
      instruction:
        'After the draft is done, research the web to find real, active funding opportunities that fit this specific solution (region, sector, stage, applicant type). Follow this exact structure: Cover Page, Funding Landscape Overview, Recommended Priority Targets, Funder Directory (repeat standardized profile card with fields A-H), Master Table (top 10 summary table), Contact Directory, and Annex (keywords, excluded funders, links dump). Do NOT output a "Quick Summary" heading. The Funding Landscape Overview and Recommended Priority Targets must be structured data only (no narrative paragraphs). Each funder entry must name a specific, active funding opportunity/program/call with a direct official link; do not list generic orgs without a specific opportunity. Include only opportunities with verified working links. If an opportunity link cannot be verified, exclude that funder from the main list and place it in Annex (Excluded) with reason. Target up to 10 verified funders. Only include opportunities that are open or accept rolling applications; if closed, move to Annex (Excluded) with reason. Include source links and last-updated dates for every included funder. Use concise, premium, human but professional language suitable for a PDF.',
      summary: 'A structured funding directory with prioritized targets and contacts.',
    },
    {
      id: 'business-model-canvas',
      title: 'Impact Business Model Canvas',
      group: 'summary',
      instruction:
        'Executive overview + Impact Business Model Canvas table only. No extra sections.',
      summary: 'Decision-ready Impact BMC with a concise executive overview.',
      systemPrompt: `You are an expert Business Model Architect, Impact Strategist, and Venture Design Advisor.

Your role is to help transform a developed solution into a clear, coherent, and actionable Business Model Canvas that can be used directly for presentation, validation, funding, or implementation.

You deeply understand:
- The Business Model Canvas (Alexander Osterwalder)
- Impact-driven and mission-oriented ventures
- The relationship between problem statements, beneficiaries, value creation, and sustainability
- The difference between activities, outputs, outcomes, and long-term impact
- Early-stage, real-world constraints (resources, adoption, risks, scalability)

You do not generate generic or academic content. You generate grounded, realistic, and decision-ready models.

CONTEXT: You will receive a problem/challenge, a proposed solution, target population/beneficiaries, and optional context (location, constraints, technology, stakeholders). Assume the solution is conceptually complete and your task is to structure it into a strong business model.

OBJECTIVE: Generate a complete Business Model Canvas with a short executive overview and concise content for each canvas block.

STRICT OUTPUT FORMAT (use exactly these labels, in this order; no extra headings or sections):

Executive Overview:
[One concise paragraph.]

Your Venture:
[Short venture name or placeholder if unknown.]

Problem Statement:
[Concise content.]

Mission Statement:
[Concise content.]

Key Partners:
[Concise content.]

Key Activities:
[Concise content.]

Value Proposition:
[Concise content.]

Stakeholder Relationships:
[Concise content.]

Stakeholder Segments:
[Concise content.]

Key Resources:
[Concise content.]

Channels:
[Concise content.]

Cost Structure:
[Concise content.]

Revenue Streams:
[Concise content.]

Intended Impact:
[Concise content.]

STYLE REQUIREMENTS:
- Be succinct and decision-ready
- Use short sentences or compact bullet lists
- Do not add any other sections or formatting`,
    },
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      group: 'summary',
      instruction:
        'One-page executive summary covering the problem, solution, beneficiaries, impact, evidence, and immediate next steps.',
      summary: 'A crisp, one-page overview for quick decisions.',
    },
    {
      id: 'funder-brief',
      title: 'Funder Brief',
      group: 'funder',
      instruction:
        'Write a funding-ready brief: problem, solution, impact thesis, evidence, budget snapshot, use of funds, milestones, risks, and the funding ask.',
      summary: 'Tailored for foundations, sponsors, and grant reviewers.',
    },
    {
      id: 'teacher-guide',
      title: 'Teacher Guide',
      group: 'teacher',
      instruction:
        'Explain the problem and solution in classroom-friendly language. Include learning objectives, key terms, discussion prompts, and a short activity idea.',
      summary: 'Lesson-ready explanation with prompts and vocabulary.',
    },
    {
      id: 'social-media-pack',
      title: 'Social Media Post Pack',
      group: 'social',
      instruction:
        'Create 6-8 platform-ready social posts with hooks, captions, hashtags, and a clear call-to-action. Keep each post under 280 characters.',
      summary: 'Short-form posts optimized for public engagement.',
    },
    {
      id: 'article-500',
      title: 'Article (500 words)',
      group: 'article',
      instruction:
        'Write a 500-word article with a strong headline, subhead, and clear narrative arc. Include a concluding call-to-action.',
      summary: 'Concise, reader-friendly narrative for general audiences.',
    },
    {
      id: 'article-1000',
      title: 'Article (1000 words)',
      group: 'article',
      instruction:
        'Write a 1000-word article with a compelling lead, structured sections, and a persuasive closing. Include key evidence and human impact.',
      summary: 'Long-form story with depth, evidence, and impact.',
    },
    {
      id: 'conference-proposal',
      title: 'Conference Proposal',
      group: 'conference',
      instruction:
        'Prepare a conference proposal: title, 150-200 word abstract, objectives, format, target audience, and speaker bio placeholders.',
      summary: 'Ready-to-submit proposal format for reviewers.',
    },
    {
      id: 'youtube-script',
      title: 'YouTube Script',
      group: 'youtube',
      instruction:
        'Write a 6-8 minute YouTube script with a hook, intro, 3-5 beats, transitions, and a closing call-to-action. Use conversational tone.',
      summary: 'Conversational script designed for video delivery.',
    },
  ];
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.display = new Array(this.steps.length).fill(false);
    this.display[this.currentIndexDisplay] = true;
    this.reportInstruction = this.getSelectedReportType()?.instruction || '';
    
    // Subscribe to chatbot insert requests
    this.insertRequestSub = this.chatContext.insertRequest$.subscribe({
      next: (request) => {
        console.log('PlaygroundSteps received insert request:', request.questionKey);
        this.handleInsertRequest(request.questionKey, request.content, request.mode);
      },
      error: (err) => console.error('Insert subscription error:', err),
      complete: () => console.log('Insert subscription completed unexpectedly')
    });
  }
  
  /**
   * Set up the chat context for the chatbot to be aware of current solution and step
   */
  private setupChatContext(): void {
    if (!this.currentSolution?.solutionId) return;
    
    const questions = this.buildCurrentStepQuestions();
    
    const context: PlaygroundContext = {
      solutionId: this.currentSolution.solutionId!,
      solutionTitle: this.currentSolution.title || 'Untitled Solution',
      solutionDescription: this.currentSolution.description,
      currentStepIndex: this.currentIndexDisplay,
      currentStepName: this.steps[this.currentIndexDisplay] || `Step ${this.currentIndexDisplay + 1}`,
      questions,
      allStepsData: this.currentSolution.status || {},
    };
    
    this.chatContext.setContext(context);
  }
  
  /**
   * Build the list of questions for the current step
   */
  private buildCurrentStepQuestions(): PlaygroundQuestion[] {
    const stepQuestions = this.AllQuestions[this.currentIndexDisplay] || [];
    const stepKeys = this.questionsTitles[this.currentIndexDisplay] || [];
    
    return stepQuestions.map((text, idx) => {
      const key = stepKeys[idx] || `S${this.currentIndexDisplay + 1}-${String.fromCharCode(65 + idx)}`;
      return {
        key,
        label: key,
        text: text.slice(0, 200), // Truncate for display
        currentAnswer: this.currentSolution?.status?.[key] || '',
      };
    });
  }
  
  /**
   * Handle insert request from chatbot
   */
  private handleInsertRequest(questionKey: string, content: string, mode: 'replace' | 'append'): void {
    console.log('handleInsertRequest called:', { questionKey, content: content.slice(0, 100), mode });
    
    if (!this.currentSolution) {
      console.error('No currentSolution available');
      this.chatContext.notifyInsertComplete(questionKey, false);
      return;
    }
    
    if (!this.currentSolution.status) {
      this.currentSolution.status = {};
    }
    
    // Get existing content
    const existingContent = this.currentSolution.status[questionKey] || '';
    
    // Determine new content based on mode
    let newContent: string;
    if (mode === 'append' && existingContent) {
      // Check if content is HTML (like images) - use <br><br> for HTML, \n\n for plain text
      const isHtml = content.trim().startsWith('<');
      const separator = isHtml ? '<br><br>' : '\n\n';
      newContent = existingContent + separator + content;
    } else {
      newContent = content;
    }
    
    // Update the solution status locally first
    this.currentSolution.status[questionKey] = newContent;
    
    console.log('Saving to Firestore:', { 
      solutionId: this.currentSolution.solutionId, 
      questionKey, 
      contentPreview: newContent.slice(0, 100) 
    });
    
    // Save to Firestore
    this.solution.updateSolutionField(
      this.currentSolution.solutionId!,
      `status.${questionKey}`,
      newContent
    ).then(() => {
      console.log('Insert successful for:', questionKey);
      
      // Update the visible child component's content directly
      this.updateChildComponentContent(questionKey, newContent, mode === 'append');
      
      // Notify chatbot of successful insert
      this.chatContext.notifyInsertComplete(questionKey, true);
      // Update the context with new answer
      this.chatContext.updateQuestionAnswer(questionKey, newContent);
    }).catch((error) => {
      console.error('Failed to insert content:', error);
      // Revert local change on error
      if (this.currentSolution?.status) {
        this.currentSolution.status[questionKey] = existingContent;
      }
      this.chatContext.notifyInsertComplete(questionKey, false);
    });
  }
  
  /**
   * Update the visible child component's content directly
   */
  private updateChildComponentContent(questionKey: string, content: string, append: boolean): void {
    // Find the active child component (the one currently displayed)
    const activeStepComponent = this.playgroundStepComponents?.find((comp, index) => this.display[index]);
    
    if (activeStepComponent) {
      // Don't pass append=true since we already computed the final content
      activeStepComponent.updateContentFromExternal(questionKey, content, false);
      console.log('Updated child component content for:', questionKey);
    } else {
      console.warn('No active playground-step component found');
    }
  }

  private async loadSavedFeedback() {
    if (!this.id) return;

    try {
      const feedbackDoc = await this.afs
        .doc<SavedAiFeedback>(`solutions/${this.id}/aiFeedback/latest`)
        .get()
        .toPromise();

      if (feedbackDoc?.exists) {
        const data = feedbackDoc.data() as SavedAiFeedback;
        this.aiFeedbackText = data.feedbackText;
        this.aiFeedbackParsed = data.feedbackParsed;
        this.aiFeedbackFormatted = this.formatAiFeedback(data.feedbackText);
        
        // Restore the selected evaluator
        const savedEvaluator = this.aiEvaluatorOptions.find(
          ai => ai.collectionKey === data.evaluatorKey
        );
        if (savedEvaluator) {
          this.selectedAiEvaluator = savedEvaluator;
        }
      }
    } catch (error) {
      console.error('Error loading saved feedback:', error);
    }
  }

  private async saveFeedbackToFirestore() {
    if (!this.id || !this.aiFeedbackText) return;

    const feedbackData: SavedAiFeedback = {
      evaluatorName: this.selectedAiEvaluator.name,
      evaluatorKey: this.selectedAiEvaluator.collectionKey,
      evaluatorAvatar: this.selectedAiEvaluator.avatarPath,
      feedbackText: this.aiFeedbackText,
      feedbackParsed: this.aiFeedbackParsed,
      timestamp: Date.now(),
    };

    try {
      await this.afs
        .doc(`solutions/${this.id}/aiFeedback/latest`)
        .set(feedbackData);
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  }
  toggleHover(event: boolean) {
    this.isHovering = event;
  }
  getMembers() {
    this.teamMembers = [];
    console.log('all participants', this.currentSolution.participants);
    for (const key in this.currentSolution.participants) {
      let participant = this.currentSolution.participants[key];
      let email = Object.values(participant)[0];
      this.auth.getUserFromEmail(email).subscribe((data) => {
        // Check if the email of the incoming data is already in the teamMembers
        if (
          data &&
          data[0] &&
          !this.teamMembers.some((member) => member.email === data[0].email)
        ) {
          this.teamMembers.push(data[0]);
        }

        if (this.roles.facilitator === email) {
          this.facilitator = data[0];
          if (this.currentUser.email === email)
            this.currentUserIsFacilitator = true;
        }
        if (this.roles.teamLeader === email) {
          this.teamLeader = data[0];
          if (this.currentUser.email === email)
            this.currentUserIsTeamleader = true;
        }
        if (this.roles.factChecker === email) {
          this.factChecker = data[0];
          if (this.currentUser.email === email)
            this.currentUserIsFactChecker = true;
        }
      });
      this.popupStyles = this.teamMembers.map(() => ({}));
    }
  }

  adjustPopupPosition(event: MouseEvent, index: number) {
    const popup = event.target as HTMLElement;
    const rect = popup.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const popupWidth = rect.width;

    // Adjust the position if it overflows the right edge
    if (rect.right > windowWidth) {
      this.popupStyles[index] = {
        right: '0',
        left: 'auto',
      };
    } else {
      this.popupStyles[index] = {
        left: '0',
        right: 'auto',
      };
    }
  }

  // this code might be used later on to give users control over different positions
  // toggleClaimTeamLeader() {
  //   if (this.isEmpty(this.teamLeader)) {
  //     this.teamLeader = this.currentUser;
  //     this.currentUserIsTeamleader = true;
  //   } else {
  //     this.teamLeader = {};
  //     this.currentUserIsTeamleader = false;
  //   }
  //   this.updateSolutionRoles();
  // }
  // toggleClaimFactChecker() {
  //   if (this.isEmpty(this.factChecker)) {
  //     this.factChecker = this.currentUser;
  //     this.currentUserIsFactChecker = true;
  //   } else {
  //     this.factChecker = {};
  //     this.currentUserIsFactChecker = false;
  //   }
  //   this.updateSolutionRoles();
  // }
  // toggleClaimFacilitator() {
  //   if (this.isEmpty(this.facilitator)) {
  //     this.facilitator = this.currentUser;
  //     this.currentUserIsFacilitator = true;
  //   } else {
  //     this.facilitator = {};
  //     this.currentUserIsFacilitator = false;
  //   }
  //   this.updateSolutionRoles();
  // }
  // async updateSolutionRoles() {
  //   this.roles.facilitator = this.isEmpty(this.facilitator)
  //     ? ''
  //     : this.facilitator.email;
  //   this.roles.teamLeader = this.isEmpty(this.teamLeader)
  //     ? ''
  //     : this.teamLeader.email;
  //   this.roles.factChecker = this.isEmpty(this.factChecker)
  //     ? ''
  //     : this.factChecker.email;

  //   try {
  //     let response = await this.solution.updateSolutionRoles(
  //       this.roles,
  //       this.currentSolution.solutionId!
  //     );
  //     console.log('Roles updated successfully');
  //   } catch (error) {
  //     alert('An error occured while updating roles. Try Again!');
  //     console.log('error occured while updating roles', error);
  //   }
  // }
  isEmpty(obj: Object) {
    return JSON.stringify(obj) === '{}';
  }
  getEvaluators() {
    this.evaluators = [];

    if (this.currentSolution.evaluators) {
      for (const evaluator of this.currentSolution.evaluators) {
        let email = evaluator.name;
        if (email && evaluator.evaluated !== 'true') {
          this.auth.getUserFromEmail(email).subscribe((data) => {
            // Check if the email of the incoming data is already in the teamMembers
            if (
              data &&
              data[0] &&
              !this.evaluators.some((member) => member.email === data[0].email)
            ) {
              this.evaluators.push(data[0]);
            }
          });
        }
      }
    }
  }
  currentIndexDisplay: number = 0;

  @Input() title?: string = 'World Hunger';
  questionsTitles: Array<Array<string>> = [
    ['S1-A', 'S1-B', 'S1-C', 'S1-D'],
    ['S2-A', 'S2-B'],
    ['S3-A', 'S3-B', 'S3-C', 'S3-D', 'S3-E'],
    [
      'S4-A',
      'S4-B',
      'S4-C',
      'S4-D',
      'S4-E',
      'S4-F',
      'S4-G',
      'S4-H',
      'S4-I',
      'S4-J',
      'S4-K',
      'S4-L',
      'S4-M',
      'S4-N',
      // 'S4-K',
    ],
    ['S5'],
  ];
  timelineDisplay = [
    'bg-gray-500 h-2',
    'bg-gray-500 h-2',
    'bg-gray-500 h-2',
    'bg-gray-500 h-2',
  ];
  popupStyles: any = [];

  updatePlayground(current: number) {
    this.display[this.currentIndexDisplay] = false;
    this.currentIndexDisplay = current;
    this.updateTimelineDisplay(current);
    this.display[this.currentIndexDisplay] = true;
    // Update chat context with new step
    this.updateChatContextStep();
  }
  
  /**
   * Update the chat context when step changes
   */
  private updateChatContextStep(): void {
    const questions = this.buildCurrentStepQuestions();
    this.chatContext.updateStep(
      this.currentIndexDisplay,
      this.steps[this.currentIndexDisplay] || `Step ${this.currentIndexDisplay + 1}`,
      questions
    );
  }

  sendRequestForEvaluation() {
    const solutionEvaluationInvite = this.fns.httpsCallable(
      'solutionEvaluationInvite'
    );

    this.evaluators.forEach((evaluator) => {
      const emailData = {
        email: evaluator.email,
        subject: `You have been invited to evaluate the NewWorld Game solution: ...`,
        title: this.currentSolution.title,
        description: `${this.currentSolution.title} by ${this.currentSolution.authorName} ${this.etAl}`,
        path: `https://newworld-game.org/problem-feedback/${this.currentSolution.solutionId}`,
        // Include any other data required by your Cloud Function
      };

      solutionEvaluationInvite(emailData).subscribe(
        (result) => {
          console.log('Email sent:', result);
        },
        (error) => {
          console.error('Error sending email:', error);
        }
      );
    });
  }

  onEvaluatorInviteInputChange() {
    if (this.evaluatorInviteSearchTimeout) {
      clearTimeout(this.evaluatorInviteSearchTimeout);
    }

    this.evaluatorInviteError = '';
    this.evaluatorInviteStatus = '';
    this.selectedEvaluatorUser = null;

    const searchTerm = this.evaluatorInviteInput.toLowerCase().trim();
    if (!searchTerm) {
      this.evaluatorInviteSuggestions = [];
      this.showEvaluatorSuggestions = false;
      this.isSearchingEvaluators = false;
      return;
    }

    this.isSearchingEvaluators = true;
    this.evaluatorInviteSearchTimeout = setTimeout(() => {
      this.auth.searchUsers(searchTerm, 12).subscribe({
        next: (users) => {
          this.evaluatorInviteSuggestions = users || [];
          this.showEvaluatorSuggestions =
            this.evaluatorInviteSuggestions.length > 0;
          const exact = this.evaluatorInviteSuggestions.find(
            (user) => user.email?.toLowerCase() === searchTerm
          );
          if (exact) {
            this.selectedEvaluatorUser = exact;
          }
          this.isSearchingEvaluators = false;
        },
        error: (err) => {
          console.error('Evaluator search failed:', err);
          this.isSearchingEvaluators = false;
        },
      });
    }, 250);
  }

  hideEvaluatorSuggestions() {
    this.evaluatorInviteSearchTimeout = setTimeout(() => {
      this.showEvaluatorSuggestions = false;
    }, 200);
  }

  selectEvaluatorSuggestion(user: User) {
    this.evaluatorInviteInput = user.email || '';
    this.selectedEvaluatorUser = user;
    this.showEvaluatorSuggestions = false;
  }

  get canInviteEvaluator(): boolean {
    const email = (this.evaluatorInviteInput || '').trim();
    return (
      !this.isInvitingEvaluator &&
      !!email &&
      (!!this.selectedEvaluatorUser || this.data.isValidEmail(email))
    );
  }

  private evaluatorExists(email: string): boolean {
    const evaluators = this.currentSolution.evaluators ?? [];
    return evaluators.some((evaluator: any) => {
      const value = evaluator?.name || '';
      return String(value).toLowerCase() === email.toLowerCase();
    });
  }

  async inviteEvaluator() {
    if (!this.canInviteEvaluator) {
      return;
    }

    this.isInvitingEvaluator = true;
    this.evaluatorInviteError = '';
    this.evaluatorInviteStatus = '';

    const email = this.selectedEvaluatorUser?.email || this.evaluatorInviteInput.trim();
    const name =
      this.selectedEvaluatorUser
        ? `${this.selectedEvaluatorUser.firstName || ''} ${this.selectedEvaluatorUser.lastName || ''}`.trim()
        : email;

    if (!this.data.isValidEmail(email)) {
      this.evaluatorInviteError = 'Please enter a valid email address.';
      this.isInvitingEvaluator = false;
      return;
    }

    if (this.evaluatorExists(email)) {
      this.recentEvaluatorInvites.unshift({
        email,
        name,
        status: 'exists',
        message: 'Already an evaluator.',
      });
      this.evaluatorInviteStatus = 'That evaluator is already on the list.';
      this.isInvitingEvaluator = false;
      return;
    }

    try {
      const evaluators = [...(this.currentSolution.evaluators ?? [])];
      evaluators.push({ name: email });

      await this.solution.addEvaluatorsToSolution(
        evaluators,
        this.currentSolution.solutionId!
      );
      this.currentSolution.evaluators = evaluators;
      this.getEvaluators();

      const solutionEvaluationInvite = this.fns.httpsCallable(
        'solutionEvaluationInvite'
      );
      const emailData = {
        email,
        subject: `You have been invited to evaluate the NewWorld Game solution: ${this.currentSolution.title || 'NewWorld Game Solution'}`,
        title: this.currentSolution.title,
        description: `${this.currentSolution.title} by ${this.currentSolution.authorName} ${this.etAl}`,
        path: `https://newworld-game.org/problem-feedback/${this.currentSolution.solutionId}`,
      };

      await firstValueFrom(solutionEvaluationInvite(emailData));

      this.recentEvaluatorInvites.unshift({
        email,
        name,
        status: 'success',
      });
      this.evaluatorInviteStatus = 'Invite sent successfully.';
      this.evaluatorInviteInput = '';
      this.selectedEvaluatorUser = null;
    } catch (error) {
      console.error('Evaluator invite failed:', error);
      this.recentEvaluatorInvites.unshift({
        email,
        name,
        status: 'error',
        message: 'Invite failed. Try again.',
      });
      this.evaluatorInviteError =
        'We could not send the invite. Please try again.';
    } finally {
      this.isInvitingEvaluator = false;
    }
  }

  goBackAndForthTimeLine(current: number) {
    this.display[this.currentIndexDisplay] = false;
    this.currentIndexDisplay = current;
    this.updateTimelineDisplay(current);
    this.display[this.currentIndexDisplay] = true;
    // Update chat context with new step
    this.updateChatContextStep();
  }
  isCurrentStep(index: number): boolean {
    return this.currentIndexDisplay === index; // Replace with your current step logic
  }

  isFinalStep(index: number): boolean {
    return index === this.steps.length - 1;
  }

  updateTimelineDisplay(index: number) {
    // Reset all to remove styles
    this.timelineDisplay.fill('bg-gray-500 h-1.5');

    // Apply the style up to the current index
    for (let i = 0; i < index; i++) {
      this.timelineDisplay[i] = 'bg-red-500 h-1.5 dark:bg-red-500';
    }
  }
  async sendEmailToParticipant() {
    const sendParticipantInvite = this.fns.httpsCallable('sendParticipantInvite');

    try {
      // Fetch the user data to check if they're registered
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(this.newTeamMember)
      );
      const isRegisteredUser = users && users.length > 0;
      const inviterName = `${this.auth.currentUser.firstName || ''} ${this.auth.currentUser.lastName || ''}`.trim() || 'A team member';

      const emailData = {
        email: this.newTeamMember,
        inviterName,
        title: this.currentSolution.title || 'Solution Lab',
        description: this.currentSolution.description || '',
        image: this.currentSolution.image || '',
        path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
        type: 'solution',
        recipientName: isRegisteredUser ? `${users[0].firstName || ''} ${users[0].lastName || ''}`.trim() : '',
        isNewUser: !isRegisteredUser,
      };

      const result = await firstValueFrom(sendParticipantInvite(emailData));
      console.log(`Email sent to ${this.newTeamMember}:`, result);
    } catch (error) {
      console.error(`Error sending invite to ${this.newTeamMember}:`, error);
    }
  }

  public getInitials(
    firstName?: string,
    lastName?: string,
    email?: string,
    fullName?: string
  ): string {
    const fn = (firstName || '').trim();
    const ln = (lastName || '').trim();
    let primary = fn ? fn[0] : '';
    let secondary = ln ? ln[0] : '';

    if (!primary && !secondary && fullName) {
      const parts = fullName.trim().split(/\s+/);
      primary = parts[0]?.[0] || '';
      secondary = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    }

    if (primary || secondary) {
      if (!secondary) {
        if (fn.length > 1) secondary = fn[1];
        else if (ln.length > 1) secondary = ln[1];
      }
      return (primary + secondary).toUpperCase();
    }

    const local = (email || '').trim().split('@')[0] || '';
    if (local.length >= 2) return (local[0] + local[1]).toUpperCase();
    if (local.length === 1) return local[0].toUpperCase();
    return '?';
  }
  onHoverImageTeam(index: number) {
    this.showPopUpTeam[index] = true;
  }
  onLeaveTeam(index: number) {
    this.showPopUpTeam[index] = false;
  }
  onHoverTeamleader() {
    this.showTeamLeader = true;
  }
  onHoverFactChecker() {
    this.showFactChecker = true;
  }
  onHoverFacilitator() {
    this.showFacilitator = true;
  }

  onLeaveTeamLeader() {
    this.showTeamLeader = false;
  }

  OnLeaveFactChecker() {
    this.showFactChecker = false;
  }
  OnLeaveFacilitator() {
    this.showFacilitator = false;
  }

  onHoverImageEvaluators(index: number) {
    this.showPopUpEvaluators[index] = true;
  }
  onLeaveEvaluatros(index: number) {
    this.showPopUpEvaluators[index] = false;
  }

  onHoverAddTeamMember() {
    this.hoverAddTeamMember = !this.hoverAddTeamMember;
  }
  toggleAddTeamMember() {
    this.showAddTeamMember = !this.showAddTeamMember;
  }
  toggleRemoveTeamMember() {
    this.showRemoveTeamMember = !this.showRemoveTeamMember;
  }
  async addParticipantToSolution() {
    let participants: any = [];
    if (this.data.isValidEmail(this.newTeamMember)) {
      participants = this.currentSolution.participants;
      participants.push({ name: this.newTeamMember });

      this.solution
        .addParticipantsToSolution(
          participants,
          this.currentSolution.solutionId!
        )

        .then(() => {
          alert(`Successfully added ${this.newTeamMember} to the solution.`);
          this.getMembers();

          this.toggleAddTeamMember();
        })
        .catch((error) => {
          alert('Error occured while adding a team member. Try Again!');
        });
      await this.sendEmailToParticipant();
      this.newTeamMember = '';
    } else {
      alert('Enter a valid email!');
    }
  }

  // this regex needs to be revisted.

  onHoverChangeReadMe() {
    this.hoverChangeReadMe = true;
  }

  onLeaveChangeReadMe() {
    this.hoverChangeReadMe = false;
  }

  toggleUpdateReadMe() {
    this.updateReadMeBox = !this.updateReadMeBox;
  }

  async updateReadMe() {
    if (this.newReadMe === this.currentSolution.description) {
      alert('You changed nothing.');
      return;
    } else if (this.newReadMe !== this.currentSolution.description) {
      try {
        const updatedReadMe = await this.solution.updateSolutionReadMe(
          this.currentSolution.solutionId!,
          this.newReadMe
        );
        this.currentSolution.description = this.newReadMe;
        this.toggleUpdateReadMe();
      } catch (error) {
        alert('Error occured while updating title. Try again!');
      }
    } else {
      alert('Enter a title');
    }
  }
  removeParticipantFromSolution(email: string) {
    // Ensure participants array exists
    if (
      !this.currentSolution.participants ||
      !Array.isArray(this.currentSolution.participants)
    ) {
      alert('No participants found!');
      return;
    }

    // Filter out the participant to be removed
    const updatedParticipants = this.currentSolution.participants.filter(
      (participant: any) => participant.name !== email
    );

    // Update the solution's participants
    this.solution
      .addParticipantsToSolution(
        updatedParticipants,
        this.currentSolution.solutionId!
      )
      .then(() => {
        alert(`Successfully removed ${email} from the solution.`);
        this.getMembers(); // Refresh the members list
        this.teamMemberToDelete = '';
        this.toggleRemoveTeamMember();
      })
      .catch((error) => {
        console.error('Error occurred while removing a team member:', error);
        alert('Error occurred while removing a team member. Try again!');
      });
  }
  async startUpload(event: FileList) {
    try {
      await this.data.startUpload(
        event,
        `solutions/${this.currentSolution.solutionId}`
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }
  toggleAiEvaluatorDropdown() {
    this.showAiEvaluatorDropdown = !this.showAiEvaluatorDropdown;
  }

  selectAiEvaluator(ai: AiEvaluatorOption) {
    this.selectedAiEvaluator = ai;
    this.showAiEvaluatorDropdown = false;
  }

  async requestAiFeedback() {
    if (!this.auth.currentUser?.uid) {
      this.aiFeedbackError =
        'Please sign in to request an AI evaluation of your solution.';
      return;
    }

    const prompt = this.buildAiPrompt();
    if (!prompt) {
      this.aiFeedbackError =
        'We need more solution details before we can request AI feedback.';
      return;
    }

    this.resetAiFeedbackState();
    this.aiFeedbackText = '';
    this.aiFeedbackLoading = true;
    this.aiFeedbackStatus = `Sending your strategy to ${this.selectedAiEvaluator.name}...`;

    const docId = this.afs.createId();
    const collectionPath = `users/${this.auth.currentUser.uid}/${this.selectedAiEvaluator.collectionKey}/${docId}`;
    const docRef: AngularFirestoreDocument<any> = this.afs.doc(collectionPath);

    this.aiFeedbackDocSub?.unsubscribe();
    this.aiFeedbackDocSub = docRef.valueChanges().subscribe((snapshot) => {
      if (!snapshot?.status) {
        return;
      }

      const state = snapshot.status.state;
      if (state === 'PROCESSING') {
        this.aiFeedbackStatus = 'Evaluating your solution...';
      } else if (state === 'COMPLETED') {
        this.aiFeedbackLoading = false;
        this.aiFeedbackStatus = '';
        this.aiFeedbackText = snapshot.response ?? '';
        this.aiFeedbackParsed = this.parseAiFeedback(this.aiFeedbackText);
        this.aiFeedbackFormatted = this.formatAiFeedback(this.aiFeedbackText);
        this.saveFeedbackToFirestore();
        this.aiFeedbackDocSub?.unsubscribe();
        // Auto-show feedback results and close the panel
        this.studioActivePanel = null;
        this.showFeedbackResults = true;
      } else if (state === 'ERRORED') {
        this.aiFeedbackLoading = false;
        this.aiFeedbackStatus = '';
        this.aiFeedbackError =
          snapshot.status?.message ||
          'We could not retrieve AI feedback. Please try again in a moment.';
        this.aiFeedbackDocSub?.unsubscribe();
      }
    });

    try {
      await docRef.set({ prompt });
    } catch (error) {
      console.error('AI feedback request failed', error);
      this.aiFeedbackLoading = false;
      this.aiFeedbackStatus = '';
      this.aiFeedbackError =
        'Unable to reach the AI evaluator right now. Please retry.';
      this.aiFeedbackDocSub?.unsubscribe();
    }
  }

  async generateInfographic() {
    if (!this.auth.currentUser?.uid) {
      this.infographicError = 'Please sign in to generate an infographic.';
      return;
    }

    if (!this.currentDraftText) {
      this.infographicError = 'We need more solution details before generating an infographic.';
      return;
    }

    // Reset state
    this.infographicError = '';
    this.infographicImageUrl = '';
    this.infographicLoading = true;
    this.infographicStatus = 'Preparing your strategy summary...';

    // Build the infographic prompt based on solution data
    const prompt = this.buildInfographicPrompt();

    const docId = this.afs.createId();
    const collectionPath = `users/${this.auth.currentUser.uid}/infographics/${docId}`;
    const docRef: AngularFirestoreDocument<any> = this.afs.doc(collectionPath);

    this.infographicDocSub?.unsubscribe();
    this.infographicDocSub = docRef.valueChanges().subscribe((snapshot) => {
      if (!snapshot?.status) {
        return;
      }

      const state = snapshot.status.state;
      if (state === 'PROCESSING') {
        this.infographicStatus = 'Creating your visual summary...';
      } else if (state === 'COMPLETED') {
        this.infographicLoading = false;
        this.infographicStatus = '';
        this.infographicImageUrl = snapshot.imageUrl ?? '';
        this.infographicDocSub?.unsubscribe();
        // Auto-show results and close the panel
        this.studioActivePanel = null;
        this.showInfographicResults = true;
      } else if (state === 'ERRORED') {
        this.infographicLoading = false;
        this.infographicStatus = '';
        this.infographicError =
          snapshot.status?.message ||
          'Could not generate the infographic. Please try again.';
        this.infographicDocSub?.unsubscribe();
      }
    });

    try {
      await docRef.set({
        prompt,
        solutionId: this.id,
        solutionTitle: this.currentSolution.title || 'Strategy'
      });
    } catch (error) {
      console.error('Infographic generation request failed', error);
      this.infographicLoading = false;
      this.infographicStatus = '';
      this.infographicError = 'Unable to start infographic generation. Please retry.';
      this.infographicDocSub?.unsubscribe();
    }
  }

  private buildInfographicPrompt(): string {
    const title = this.currentSolution.title || 'Strategy';
    const description = this.currentSolution.description || '';

    // Use the currentDraftText which contains the full solution content
    const strategyContent = this.currentDraftText.substring(0, 4000);

    return `Create a beautiful, friendly infographic summarizing this strategy:

TITLE: ${title}

OVERVIEW: ${description}

STRATEGY CONTENT:
${strategyContent}

Make it visually appealing with bright colors, friendly icons, and a clear flow from problem to solution. Use teal and emerald as accent colors.`;
  }

  async downloadInfographic() {
    if (!this.infographicImageUrl || this.downloadingInfographic) {
      return;
    }

    this.downloadingInfographic = true;

    try {
      const response = await fetch(this.infographicImageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const title = (this.currentSolution.title || 'strategy').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.download = `${title}-infographic.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download infographic', error);
      // Fallback for production CORS-restricted buckets: open the file directly.
      const a = document.createElement('a');
      a.href = this.infographicImageUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      this.downloadingInfographic = false;
    }
  }

  downloadSolutionPdf() {
    if (this.downloadingFeedbackPdf) {
      return;
    }
    this.downloadingFeedbackPdf = true;

    try {
      this.downloadSolutionPdfInternal();
    } finally {
      // Small delay to show loading state
      setTimeout(() => {
        this.downloadingFeedbackPdf = false;
      }, 500);
    }
  }

  private downloadSolutionPdfInternal() {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 28;
    const marginRight = 28;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 0;

    // Premium color palette
    const colors = {
      primary: [13, 110, 102] as [number, number, number],      // deep teal
      gold: [166, 136, 85] as [number, number, number],         // muted gold accent
      dark: [18, 18, 18] as [number, number, number],           // near black
      text: [33, 33, 33] as [number, number, number],           // rich black for body
      textMedium: [66, 66, 66] as [number, number, number],     // medium gray
      textLight: [100, 100, 100] as [number, number, number],   // light gray
      muted: [140, 140, 140] as [number, number, number],       // muted
      line: [200, 200, 200] as [number, number, number],        // subtle line
      white: [255, 255, 255] as [number, number, number],
    };

    const checkPageBreak = (neededHeight: number): boolean => {
      if (yPos + neededHeight > pageHeight - 32) {
        pdf.addPage();
        yPos = 35;
        return true;
      }
      return false;
    };

    // Premium paragraph with Times font for body text
    const addBodyText = (text: string, indent: number = 0) => {
      pdf.setFont('times', 'normal');
      pdf.setFontSize(11.5);
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      const lines = pdf.splitTextToSize(text, contentWidth - indent);
      const lineHeight = 6.2; // generous line height
      
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight + 2);
        pdf.text(line, marginLeft + indent, yPos);
        yPos += lineHeight;
      });
      yPos += 5;
    };

    // ═══════════════════════════════════════════════════════════
    // ELEGANT TITLE SECTION
    // ═══════════════════════════════════════════════════════════
    
    yPos = 45;

    // Title - elegant serif
    pdf.setFont('times', 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    const titleText = this.currentSolution.title || 'Solution';
    const titleLines = pdf.splitTextToSize(titleText, contentWidth);
    titleLines.forEach((line: string) => {
      const titleWidth = pdf.getTextWidth(line);
      pdf.text(line, (pageWidth - titleWidth) / 2, yPos);
      yPos += 11;
    });

    yPos += 6;

    // Elegant ornamental divider
    pdf.setDrawColor(colors.gold[0], colors.gold[1], colors.gold[2]);
    pdf.setLineWidth(0.6);
    const dividerWidth = 40;
    pdf.line(pageWidth / 2 - dividerWidth / 2, yPos, pageWidth / 2 + dividerWidth / 2, yPos);
    // Small diamond accent
    pdf.setFillColor(colors.gold[0], colors.gold[1], colors.gold[2]);
    const diamondSize = 1.5;
    pdf.circle(pageWidth / 2, yPos, diamondSize, 'F');
    yPos += 14;

    // Author name - prominent
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(colors.textMedium[0], colors.textMedium[1], colors.textMedium[2]);
    const authorText = this.currentSolution.authorName || 'Unknown';
    const authorWidth = pdf.getTextWidth(authorText);
    pdf.text(authorText, (pageWidth - authorWidth) / 2, yPos);
    yPos += 8;

    // Team Members
    if (this.teamMembers.length > 0) {
      const memberNames = this.teamMembers.map(m => `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Unknown').join('  •  ');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      const memberLines = pdf.splitTextToSize(memberNames, contentWidth - 30);
      memberLines.forEach((line: string) => {
        const lineWidth = pdf.getTextWidth(line);
        pdf.text(line, (pageWidth - lineWidth) / 2, yPos);
        yPos += 5;
      });
      yPos += 2;
    }

    // Date
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    const dateText = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, (pageWidth - dateWidth) / 2, yPos);
    yPos += 18;

    // Separator
    pdf.setDrawColor(colors.line[0], colors.line[1], colors.line[2]);
    pdf.setLineWidth(0.25);
    pdf.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    yPos += 20;

    // ═══════════════════════════════════════════════════════════
    // AI FEEDBACK SECTION
    // ═══════════════════════════════════════════════════════════
    
    if (this.aiFeedbackText) {
      // Section header - two lines for prominence
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      pdf.text('AI Evaluation', marginLeft, yPos);
      yPos += 6;
      
      // AI Name on its own line - italic, prominent
      pdf.setFont('times', 'italic');
      pdf.setFontSize(12);
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.text(this.selectedAiEvaluator.name, marginLeft, yPos);
      yPos += 14;

      // Scores - refined layout
      if (this.aiFeedbackParsed.scores.length > 0) {
        this.aiFeedbackParsed.scores.forEach(score => {
          checkPageBreak(12);
          
          // Label
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10.5);
          pdf.setTextColor(colors.textMedium[0], colors.textMedium[1], colors.textMedium[2]);
          pdf.text(score.label, marginLeft + 4, yPos);
          
          if (score.scoreValue) {
            // Score value - bold and prominent
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            pdf.text(`${score.scoreValue}/10`, marginLeft + 58, yPos);
            
            // Reason - elegant italic
            if (score.reason) {
              pdf.setFont('times', 'italic');
              pdf.setFontSize(10);
              pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
              const reasonLines = pdf.splitTextToSize(score.reason, contentWidth - 75);
              pdf.text(reasonLines[0], marginLeft + 75, yPos);
              if (reasonLines.length > 1) {
                yPos += 5;
                reasonLines.slice(1).forEach((line: string) => {
                  pdf.text(line, marginLeft + 4, yPos);
                  yPos += 5;
                });
              }
            }
          }
          yPos += 7.5;
        });
        yPos += 8;
      }

      // Recommendations
      if (this.aiFeedbackParsed.improvements.length > 0) {
        checkPageBreak(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        pdf.text('Recommendations', marginLeft, yPos);
        yPos += 10;

        this.aiFeedbackParsed.improvements.forEach((tip, idx) => {
          checkPageBreak(14);
          
          // Number
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          pdf.text(`${idx + 1}.`, marginLeft + 4, yPos);
          
          // Tip text - Times for readability
          pdf.setFont('times', 'normal');
          pdf.setFontSize(11);
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          const tipLines = pdf.splitTextToSize(tip, contentWidth - 18);
          tipLines.forEach((line: string, lineIdx: number) => {
            if (lineIdx > 0) checkPageBreak(6);
            pdf.text(line, marginLeft + 14, yPos);
            yPos += 5.8;
          });
          yPos += 4;
        });
        yPos += 5;
      }

      // Readiness Level - highlighted
      if (this.aiFeedbackParsed.readinessLevel) {
        checkPageBreak(18);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(colors.textMedium[0], colors.textMedium[1], colors.textMedium[2]);
        pdf.text('READINESS LEVEL', marginLeft, yPos);
        yPos += 6;
        
        pdf.setFont('times', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        pdf.text(this.aiFeedbackParsed.readinessLevel, marginLeft, yPos);
        
        if (this.aiFeedbackParsed.readinessDetails) {
          yPos += 6;
          pdf.setFont('times', 'italic');
          pdf.setFontSize(10.5);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          const detailLines = pdf.splitTextToSize(this.aiFeedbackParsed.readinessDetails, contentWidth);
          detailLines.forEach((line: string) => {
            pdf.text(line, marginLeft, yPos);
            yPos += 5;
          });
        }
        yPos += 12;
      }

      // Elegant separator
      pdf.setDrawColor(colors.line[0], colors.line[1], colors.line[2]);
      pdf.setLineWidth(0.25);
      pdf.line(marginLeft, yPos, pageWidth - marginRight, yPos);
      yPos += 22;
    }

    // ═══════════════════════════════════════════════════════════
    // STRATEGY CONTENT - PREMIUM TYPOGRAPHY
    // ═══════════════════════════════════════════════════════════
    
    // Section header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    pdf.text('Strategy Overview', marginLeft, yPos);
    yPos += 12;

    // Content with premium Times typography
    if (this.currentSolution.strategyReview) {
      addBodyText(this.toPlainText(this.currentSolution.strategyReview));
    } else if (this.currentSolution.description) {
      addBodyText(this.toPlainText(this.currentSolution.description));
    } else {
      pdf.setFont('times', 'italic');
      pdf.setFontSize(11);
      pdf.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      pdf.text('No strategy content available.', marginLeft, yPos);
      yPos += 10;
    }

    // ═══════════════════════════════════════════════════════════
    // ELEGANT FOOTER
    // ═══════════════════════════════════════════════════════════
    
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // Subtle footer line
      pdf.setDrawColor(colors.line[0], colors.line[1], colors.line[2]);
      pdf.setLineWidth(0.2);
      pdf.line(marginLeft, pageHeight - 16, pageWidth - marginRight, pageHeight - 16);
      
      // Footer text - refined
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      pdf.text('NewWorld Game', marginLeft, pageHeight - 10);
      
      // Page number - elegant format
      pdf.setFont('times', 'italic');
      pdf.text(`${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Download
    const filename = `${(this.currentSolution.title || 'solution').replace(/[^a-z0-9]/gi, '_')}.pdf`;
    pdf.save(filename);
  }

  async downloadCurrentDraftPdf() {
    if (!this.currentDraftText || this.downloadingDraftPdf) {
      return;
    }

    this.downloadingDraftPdf = true;
    try {
      await this.downloadCurrentDraftPdfWithImages();
    } catch (error) {
      console.error('Failed to export draft with images, falling back to text-only PDF.', error);
      this.downloadCurrentDraftPdfTextOnly();
    } finally {
      this.downloadingDraftPdf = false;
    }
  }

  async downloadCurrentDraftDocx() {
    if (!this.currentDraftText || this.downloadingDraftDocx) {
      return;
    }

    this.downloadingDraftDocx = true;
    try {
      const title = this.currentSolution?.title || 'Untitled Solution';
      const paragraphs = await this.buildDocxParagraphsFromHtml(this.currentDraftHtml);

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
              ...paragraphs,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      this.triggerDownload(blob, this.buildDraftFileName('docx'));
    } finally {
      this.downloadingDraftDocx = false;
    }
  }

  openReportModal() {
    this.showReportModal = true;
    const selected = this.getSelectedReportType();
    if (selected && !this.reportInstruction) {
      this.reportInstruction = selected.instruction;
    }
  }

  closeReportModal() {
    this.showReportModal = false;
  }

  selectReportType(report: ReportType) {
    this.selectedReportTypeId = report.id;
    this.reportInstruction = report.instruction;
  }

  getReportsByGroup(groupId: string): ReportType[] {
    return this.reportTypes.filter((type) => type.group === groupId);
  }

  toggleReportGroup(groupId: string) {
    this.reportGroupState[groupId] = !this.reportGroupState[groupId];
  }

  getSelectedReportType(): ReportType | undefined {
    return this.reportTypes.find((type) => type.id === this.selectedReportTypeId);
  }

  async generateReport() {
    if (!this.auth.currentUser?.uid) {
      this.reportError = 'Please sign in to generate a report.';
      return;
    }

    const prompt = this.buildReportPrompt();
    if (!prompt) {
      this.reportError = 'We need more solution details before we can generate a report.';
      return;
    }

    this.resetReportState();
    this.reportLoading = true;
    const reportType = this.getSelectedReportType();
    this.reportStatus = reportType
      ? `Generating ${reportType.title}...`
      : 'Generating report...';

    const docId = this.afs.createId();
    const collectionPath = `users/${this.auth.currentUser.uid}/report-requests/${docId}`;
    const docRef: AngularFirestoreDocument<any> = this.afs.doc(collectionPath);

    this.reportDocSub?.unsubscribe();
    if (this.reportTimeoutHandle) {
      clearTimeout(this.reportTimeoutHandle);
    }
    this.reportTimeoutHandle = setTimeout(() => {
      this.reportLoading = false;
      this.reportStatus = '';
      this.reportError =
        'Report generation took too long. Please retry. For Funding Sources, we now target exactly 10 opportunities to keep generation under 1-2 minutes.';
      this.reportDocSub?.unsubscribe();
    }, 125000);

    this.reportDocSub = docRef.valueChanges().subscribe((snapshot) => {
      if (!snapshot?.status) {
        return;
      }

      const state = snapshot.status.state;
      if (state === 'PROCESSING') {
        this.reportStatus = 'AI is writing your report...';
      } else if (state === 'COMPLETED') {
        if (this.reportTimeoutHandle) {
          clearTimeout(this.reportTimeoutHandle);
          this.reportTimeoutHandle = undefined;
        }
        this.reportLoading = false;
        this.reportStatus = '';
        this.reportText = snapshot.response ?? '';
        this.reportFormatted = this.formatAiFeedback(this.reportText);
        this.reportDocSub?.unsubscribe();
      } else if (state === 'ERRORED') {
        if (this.reportTimeoutHandle) {
          clearTimeout(this.reportTimeoutHandle);
          this.reportTimeoutHandle = undefined;
        }
        this.reportLoading = false;
        this.reportStatus = '';
        this.reportError =
          snapshot.status?.message ||
          'We could not generate the report. Please try again in a moment.';
        this.reportDocSub?.unsubscribe();
      }
    });

    try {
      await docRef.set({ prompt });
      this.showReportModal = false;
    } catch (error) {
      console.error('Report generation request failed', error);
      if (this.reportTimeoutHandle) {
        clearTimeout(this.reportTimeoutHandle);
        this.reportTimeoutHandle = undefined;
      }
      this.reportLoading = false;
      this.reportStatus = '';
      this.reportError = 'Unable to reach the AI right now. Please retry.';
      this.reportDocSub?.unsubscribe();
    }
  }

  async downloadReportPdf() {
    if (!this.reportText || this.downloadingReportPdf) {
      return;
    }
    this.downloadingReportPdf = true;
    try {
      const title = this.buildReportTitle();
      const isImpactBmcReport = this.selectedReportTypeId === 'business-model-canvas';
      const cleaned = isImpactBmcReport
        ? this.reportText
        : this.normalizeReportText(this.reportText);
      this.downloadReportPdfStyled(cleaned, title, this.buildReportFileName('pdf'));
    } finally {
      // Small delay to show loading state
      setTimeout(() => {
        this.downloadingReportPdf = false;
      }, 500);
    }
  }

  async downloadReportDocx() {
    if (!this.reportText || this.downloadingReportDocx) {
      return;
    }

    this.downloadingReportDocx = true;
    try {
      const isImpactBmcReport = this.selectedReportTypeId === 'business-model-canvas';
      let doc: Document;

      if (isImpactBmcReport) {
        const parsed = this.parseImpactBmcReport(this.reportText);
        const children = this.buildImpactBmcDocxBlocks(parsed);
        doc = new Document({
          sections: [
            {
              properties: {},
              footers: { default: this.buildReportFooter() },
              children,
            },
          ],
        });
      } else {
        const title = this.buildReportTitle();
        const cleaned = this.normalizeReportText(this.reportText);
        const paragraphs = this.buildReportDocxParagraphs(cleaned);
        doc = new Document({
          sections: [
            {
              properties: {},
              footers: { default: this.buildReportFooter() },
              children: [
                new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, spacing: { after: 220 } }),
                ...paragraphs,
              ],
            },
          ],
        });
      }

      const blob = await Packer.toBlob(doc);
      this.triggerDownload(blob, this.buildReportFileName('docx'));
    } finally {
      this.downloadingReportDocx = false;
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.aiFeedbackDocSub?.unsubscribe();
    this.reportDocSub?.unsubscribe();
    if (this.reportTimeoutHandle) {
      clearTimeout(this.reportTimeoutHandle);
      this.reportTimeoutHandle = undefined;
    }
    this.infographicDocSub?.unsubscribe();
    this.insertRequestSub?.unsubscribe();
    this.solutionSub?.unsubscribe();
    // Clear chat context when leaving the playground
    this.chatContext.clearContext();
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
    const content = this.localizedContent[lang];
    this.steps = [...content.steps];
    this.subtitles = [...content.subtitles];
    this.AllQuestions = content.questions.map((group) => [...group]);
    this.buttontexts = this.createButtonTexts(lang);
  }

  private createButtonTexts(language: SupportedLanguage): string[] {
    const labels = this.buttonLabels[language];
    const values = new Array(this.steps.length).fill(labels.next);
    if (values.length) {
      values[values.length - 1] = labels.preview;
    }
    return values;
  }

  private isSupportedLanguage(language: string): language is SupportedLanguage {
    return Object.prototype.hasOwnProperty.call(this.localizedContent, language);
  }

  get hasStructuredFeedback(): boolean {
    return (
      this.aiFeedbackParsed.scores.length > 0 ||
      this.aiFeedbackParsed.improvements.length > 0 ||
      !!this.aiFeedbackParsed.readinessLevel
    );
  }

  private resetAiFeedbackState() {
    this.aiFeedbackError = '';
    this.aiFeedbackParsed = { scores: [], improvements: [] };
    this.aiFeedbackFormatted = '';
  }

  private resetReportState() {
    if (this.reportTimeoutHandle) {
      clearTimeout(this.reportTimeoutHandle);
      this.reportTimeoutHandle = undefined;
    }
    this.reportError = '';
    this.reportText = '';
    this.reportFormatted = '';
  }

  private parseAiFeedback(raw: string): AiFeedbackDisplay {
    const result: AiFeedbackDisplay = { scores: [], improvements: [] };
    if (!raw) {
      return result;
    }

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length);

    let section: 'scores' | 'improvements' | 'readiness' | null = null;

    for (const line of lines) {
      const normalized = line.replace(/[:：]\s*$/, '').toLowerCase();

      // Support both English and French section headers
      if (normalized === 'scores') {
        section = 'scores';
        continue;
      }
      if (normalized === 'improvements' || normalized === 'améliorations') {
        section = 'improvements';
        continue;
      }
      // Check for readiness level in English or French
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('readiness level') || lowerLine.startsWith('niveau de préparation')) {
        section = 'readiness';
        const [, details = ''] = line.split(/:/, 2);
        if (details.trim()) {
          const cleaned = this.stripMarkdown(details.trim());
          const [label, ...rest] = cleaned.split(/[-–]/);
          result.readinessLevel = label?.trim();
          result.readinessDetails = rest.join('-').trim();
        }
        continue;
      }

      if (section === 'scores') {
        const parsedScore = this.parseScoreLine(line);
        if (parsedScore) {
          result.scores.push(parsedScore);
        }
      } else if (section === 'improvements') {
        const improvement = this.stripMarkdown(
          line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '')
        );
        if (improvement) {
          result.improvements.push(improvement);
        }
      } else if (section === 'readiness') {
        if (!result.readinessLevel) {
          result.readinessLevel = this.stripMarkdown(line);
        } else if (!result.readinessDetails) {
          result.readinessDetails = this.stripMarkdown(line);
        }
      }
    }

    return result;
  }

  private parseScoreLine(line: string): AiScoreCard | null {
    const match = line.match(/^([^:]+):\s*(\d{1,2})\/10\s*(.*)$/i);
    if (!match) {
      return { label: this.stripMarkdown(line), raw: line };
    }

    const [, label, score, reasonRaw] = match;
    const reason = this.cleanReasonText(reasonRaw);

    return {
      label: this.stripMarkdown(label),
      scoreValue: score,
      scoreMax: '10',
      reason,
      raw: line,
    };
  }

  private cleanReasonText(text: string): string {
    const trimmed = text.trim();
    const noParens = trimmed.replace(/^\((.*)\)$/, '$1');
    return this.stripMarkdown(noParens);
  }

  private stripMarkdown(value: string): string {
    if (!value) {
      return '';
    }
    return value
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_{2}(.*?)_{2}/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .trim();
  }

  private formatAiFeedback(value: string): string {
    if (!value) {
      return '';
    }

    // Process markdown tables first (before escaping HTML)
    let formatted = this.formatMarkdownTables(value);

    // Split by preserved table markers, escape non-table parts, then rejoin
    const tableMarker = '<!--TABLE_PRESERVED-->';
    const parts = formatted.split(tableMarker);
    formatted = parts.map((part, index) => {
      // Even indices are non-table content, odd indices are tables
      if (index % 2 === 0) {
        let escaped = this.escapeHtml(part);
        // Format headings (## and ###)
        escaped = escaped.replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">$1</h4>');
        escaped = escaped.replace(/^## (.+)$/gm, '<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">$1</h3>');
        // Format bold and italic
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Format bullet points
        escaped = escaped.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-700 dark:text-slate-300">$1</li>');
        // Wrap consecutive list items in <ul>
        escaped = escaped.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, '<ul class="my-2 space-y-1">$&</ul>');
        // Format newlines
        escaped = escaped.replace(/\n/g, '<br>');
        // Clean up extra breaks after headings and lists
        escaped = escaped.replace(/<\/h[34]><br>/g, '</h3>').replace(/<\/h4><br>/g, '</h4>');
        escaped = escaped.replace(/<\/ul><br>/g, '</ul>');
        return escaped;
      }
      return part; // Return table HTML as-is
    }).join('');

    return formatted;
  }

  private formatMarkdownTables(value: string): string {
    // Match markdown tables and convert to HTML
    const tableRegex = /(\|.+\|[\r\n]+\|[-:\| ]+\|[\r\n]+(?:\|.+\|[\r\n]*)+)/g;

    return value.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n').filter(line => line.trim());
      if (lines.length < 2) return match;

      const headerRow = lines[0];
      const separatorRow = lines[1];
      const dataRows = lines.slice(2);

      // Parse header
      const headers = headerRow.split('|').filter(cell => cell.trim()).map(cell => cell.trim());

      // Parse alignment from separator
      const alignments = separatorRow.split('|').filter(cell => cell.trim()).map(cell => {
        const trimmed = cell.trim();
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
        if (trimmed.endsWith(':')) return 'right';
        return 'left';
      });

      // Build HTML table
      let html = '<!--TABLE_PRESERVED--><div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">';

      // Header
      html += '<thead class="bg-slate-100 dark:bg-slate-800"><tr>';
      headers.forEach((header, i) => {
        const align = alignments[i] || 'left';
        html += `<th class="border border-slate-300 dark:border-slate-600 px-3 py-2 text-${align} font-semibold text-slate-800 dark:text-slate-200">${this.escapeHtml(header)}</th>`;
      });
      html += '</tr></thead>';

      // Body
      html += '<tbody>';
      dataRows.forEach((row, rowIdx) => {
        const cells = row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
        const bgClass = rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50';
        html += `<tr class="${bgClass}">`;
        cells.forEach((cell, i) => {
          const align = alignments[i] || 'left';
          // Handle bold in table cells
          let cellContent = this.escapeHtml(cell);
          cellContent = cellContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          html += `<td class="border border-slate-300 dark:border-slate-600 px-3 py-2 text-${align} text-slate-700 dark:text-slate-300">${cellContent}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div><!--TABLE_PRESERVED-->';

      return html;
    });
  }

  private escapeHtml(value: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return value.replace(/[&<>"']/g, (m) => map[m]);
  }

  private buildAiPrompt(): string {
    const useFrench = this.currentLanguage === 'fr';
    
    const instructionsEn = `Role: You are the Evaluator for NewWorld Game.
Your job is to evaluate the user's solution using the official criteria and provide numerical scores + improvement feedback that align with the solution content.

Do the following every time:

1. Score the Solution (1–10 each)

Give a score for each category:

Achieve Preferred State

Technologically feasible (uses current tech)

Ecologically positive (regenerative)

Economical (funding identified)

Equitable/Socially just

Understandable (strategy clearly presented)

(1 = not viable, 5 = needs major improvement, 10 = ready to implement)

2. Explain Each Score

In 1–2 short sentences, explain why you gave that score.
Base every score on the solution text provided. Do not invent facts. If evidence is missing, say so and score accordingly.

3. Provide Improvements

Give 3–5 concrete, actionable recommendations that would strengthen the solution.

4. Readiness Level

Based on overall scoring, label the solution:

Initial Conceptualization (1–3)

Preliminary Design (4–6)

Advanced Development (7–8)

Ready to Implement (9–10)

Tone

Clear, constructive, encouraging; no harsh language, no fluff.

Output Format (strict)
Scores:
Achieve Preferred State: X/10 (reason)
Technologically feasible (uses current tech): X/10 (reason)
Ecologically positive (regenerative): X/10 (reason)
Economical (funding identified): X/10 (reason)
Equitable/Socially just: X/10 (reason)
Understandable (strategy clearly presented): X/10 (reason)

Improvements:
1.
2.
3.
4. (optional)
5. (optional)

Readiness Level: ______`;

    const instructionsFr = `Rôle : Vous êtes l'Évaluateur du NewWorld Game.
Votre mission est d'évaluer la solution de l'utilisateur selon les critères officiels et de fournir des scores numériques + un retour d'amélioration alignés avec le contenu de la solution.

IMPORTANT : Répondez ENTIÈREMENT en français.

Faites ce qui suit à chaque fois :

1. Notez la Solution (1–10 pour chaque catégorie)

Donnez une note pour chaque catégorie :

Atteindre l'état souhaité

Faisabilité technologique (technologies actuelles)

Écologiquement positif (régénératif)

Économique (financement identifié)

Équitable / justice sociale

Compréhensible (stratégie clairement présentée)

(1 = non viable, 5 = nécessite une amélioration majeure, 10 = prêt à mettre en œuvre)

2. Expliquez chaque note

En 1–2 phrases courtes, expliquez pourquoi vous avez donné cette note.
Basez chaque note strictement sur le texte fourni. N'inventez pas de faits. S'il manque des preuves, dites-le et notez en conséquence.

3. Proposez des améliorations

Donnez 3–5 recommandations concrètes et réalisables pour renforcer la solution.

4. Niveau de préparation

Selon la notation globale, qualifiez la solution :

Conceptualisation initiale (1–3)

Conception préliminaire (4–6)

Développement avancé (7–8)

Prêt à mettre en œuvre (9–10)

Ton

Clair, constructif, encourageant ; sans langage dur, sans superflu.

Format de sortie (strict)
Scores:
Atteindre l'état souhaité: X/10 (raison)
Faisabilité technologique (technologies actuelles): X/10 (raison)
Écologiquement positif (régénératif): X/10 (raison)
Économique (financement identifié): X/10 (raison)
Équitable / justice sociale: X/10 (raison)
Compréhensible (stratégie clairement présentée): X/10 (raison)

Améliorations:
1.
2.
3.
4. (optionnel)
5. (optionnel)

Niveau de préparation: ______`;

    const instructions = useFrench ? instructionsFr : instructionsEn;
    const solutionSummary = this.buildSolutionSummaryForAi();
    return solutionSummary ? `${instructions}\n\n${solutionSummary}` : '';
  }

  private buildReportPrompt(): string {
    const reportType = this.getSelectedReportType();
    const instruction = (this.reportInstruction || reportType?.instruction || '').trim();
    const reportSource = this.buildReportSourceForAi();

    if (!reportSource || !instruction) {
      return '';
    }

    // Use custom system prompt if available for this report type, otherwise use default
    const hasCustomSystemPrompt = reportType?.systemPrompt?.trim();

    let intro: string;
    if (reportType?.id === 'funding-sources') {
      intro = `Role: You are a senior funding research analyst.
Use web research to identify real, active funding opportunities that match the specific solution.
Only include opportunities with a direct official program or call page link that appears in your sources.
Include only opportunities with verified working links. If fewer than 10 are verifiable, return fewer.
Do not output a "Quick Summary" heading; use "Funding Landscape Overview" and "Recommended Priority Targets" only.
Those two sections must be structured data only (no narrative paragraphs).
Exclude closed opportunities from the main list; move them to Annex with the reason.
Do not use placeholder text like "Unverified (link unavailable)" in the main list.
Prioritize official sources and funder program pages, and include source links and last-updated dates when available.
Output plain text only (no markdown, no asterisks, no special formatting).`;
    } else if (hasCustomSystemPrompt) {
      // Use the specialized system prompt for reports like Business Model Canvas
      intro = reportType!.systemPrompt!;
    } else {
      // Default generic report writer prompt
      intro = `Role: You are a senior report writer.
Generate a professional, structured report based strictly on the SOURCE material below.
Write in a polished, journalistic tone suitable for The Economist or The New York Times.
Include one short reference to NewWorld Game in the opening paragraph for context.
Use clear headings and concise paragraphs; bullets only when helpful.
Output plain text only (no markdown, no asterisks, no special formatting).
Do not include scores, rubrics, or evaluation language.
Do not invent facts or events; if something is not explicitly stated, say "Not specified in the draft."
Do not contradict the draft.`;
    }

    const reportTitle = reportType?.title ? `Report Type: ${reportType.title}` : 'Report Type: Custom';
    const evaluatorName = this.selectedAiEvaluator?.name
      ? `Evaluator Persona: ${this.selectedAiEvaluator.name}`
      : '';
    const personaLine = evaluatorName ? `${evaluatorName}\n` : '';
    return `${intro}\n\n${reportTitle}\n${personaLine}Instruction: ${instruction}\n\nSOURCE (Current Draft):\n${reportSource}`;
  }

  private buildReportSourceForAi(): string {
    if (!this.currentSolution) {
      return '';
    }

    // Prefer the user-edited current draft as the single source of truth.
    const draftText = (this.currentDraftText || '').trim();
    if (draftText) {
      return this.clampText(draftText, 12000);
    }

    // Fallback to compiled summary if no draft is available.
    return this.buildSolutionSummaryForAi();
  }

  private buildSolutionSummaryForAi(): string {
    if (!this.currentSolution) {
      return '';
    }

    const lines: string[] = [];
    const title = this.currentSolution.title || 'Untitled Solution';
    const author = this.currentSolution.authorName || 'Unknown team';
    const sdgs = this.currentSolution.sdgs?.length
      ? this.currentSolution.sdgs.join(', ')
      : '';
    const description = this.clampText(
      this.toPlainText(this.currentSolution.description),
      850
    );
    const strategyReview = this.clampText(
      this.toPlainText(this.currentSolution.strategyReview),
      1000
    );
    const statusSummary = this.clampText(this.extractStatusResponses(), 1600);

    lines.push(`Solution Title: ${title}`);
    lines.push(`Team: ${author}`);
    if (sdgs) {
      lines.push(`Focus SDGs: ${sdgs}`);
    }
    if (description) {
      lines.push(`Summary: ${description}`);
    }
    if (strategyReview) {
      lines.push(`Strategy Review Highlights: ${strategyReview}`);
    }
    if (statusSummary) {
      lines.push('Detailed Step Notes:');
      lines.push(statusSummary);
    }

    return lines.join('\n');
  }

  private extractStatusResponses(): string {
    if (!this.currentSolution?.status) {
      return '';
    }

    const grouped: Record<string, string[]> = {};
    const questionMap = this.buildQuestionPromptMap();

    Object.entries(this.currentSolution.status).forEach(([key, value]) => {
      const plainAnswer = this.toPlainText(value);
      if (!plainAnswer) {
        return;
      }

      const prefix = key.split('-')[0];
      const question = this.normalizeWhitespace(questionMap[key] || key);
      const formatted = `${question}: ${plainAnswer}`;

      if (!grouped[prefix]) {
        grouped[prefix] = [];
      }
      grouped[prefix].push(formatted);
    });

    const labels: Record<string, string> = {
      S1: 'Step 1 – Problem State',
      S2: 'Step 2 – Preferred State',
      S3: 'Step 3 – Plan / Solution',
      S4: 'Step 4 – Implementation',
      S5: 'Step 5 – Strategy Review',
    };

    const orderedPrefixes = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const sections: string[] = [];

    orderedPrefixes.forEach((prefix) => {
      if (!grouped[prefix]?.length) {
        return;
      }
      sections.push(`${labels[prefix] ?? prefix}:`);
      grouped[prefix].forEach((entry) => sections.push(`- ${entry}`));
    });

    return sections.join('\n');
  }

  private buildQuestionPromptMap(): Record<string, string> {
    const map: Record<string, string> = {};

    this.questionsTitles.forEach((titles, stepIndex) => {
      titles.forEach((key, questionIndex) => {
        const prompt = this.AllQuestions[stepIndex]?.[questionIndex];
        if (prompt) {
          map[key] = prompt;
        }
      });
    });

    return map;
  }

  private normalizeWhitespace(value?: string): string {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  private toPlainText(value?: string): string {
    if (!value) {
      return '';
    }

    if (typeof document !== 'undefined') {
      const temp = document.createElement('div');
      temp.innerHTML = value;
      return this.normalizeWhitespace(temp.textContent || temp.innerText || '');
    }

    return this.normalizeWhitespace(value.replace(/<[^>]+>/g, ' '));
  }

  private toPlainTextWithBreaks(value?: string): string {
    if (!value) {
      return '';
    }

    let html = value;
    html = html.replace(/<br\s*\/?>/gi, '\n');
    html = html.replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, '\n');
    html = html.replace(/<li[^>]*>/gi, '- ');
    html = html.replace(/<\/li>/gi, '\n');
    html = html.replace(/<[^>]+>/g, ' ');
    html = html.replace(/\r\n/g, '\n');
    html = html.replace(/\n{3,}/g, '\n\n');
    return html.trim();
  }

  private buildCurrentDraftText(): string {
    const draftHtml = this.currentSolution?.strategyReview || '';
    const draftText = this.toPlainTextWithBreaks(draftHtml);
    if (draftText) {
      return draftText;
    }
    return this.extractStatusResponses();
  }

  private updateCurrentDraftText(): void {
    this.currentDraftText = this.buildCurrentDraftText();
    this.currentDraftHtml = this.buildCurrentDraftHtml();
  }

  private buildCurrentDraftHtml(): string {
    const draftHtml = this.currentSolution?.strategyReview || '';
    if (draftHtml) {
      return draftHtml;
    }
    const fallbackText = this.extractStatusResponses();
    return this.textToHtml(fallbackText);
  }

  private buildDraftFileName(extension: 'pdf' | 'docx'): string {
    const title = (this.currentSolution?.title || 'current-draft').toLowerCase();
    const safeTitle = title.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${safeTitle || 'current-draft'}.${extension}`;
  }

  private buildReportFileName(extension: 'pdf' | 'docx'): string {
    const title = (this.currentSolution?.title || 'report').toLowerCase();
    const reportType = (this.selectedReportTypeId || 'report').toLowerCase();
    const safeTitle = title.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const safeType = reportType.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${safeTitle || 'report'}-${safeType || 'report'}.${extension}`;
  }

  private buildReportTitle(): string {
    const projectTitle = (this.currentSolution?.title || '').trim();
    const reportTitle = this.getSelectedReportType()?.title?.trim() || 'Report';
    if (projectTitle && projectTitle.toLowerCase() !== reportTitle.toLowerCase()) {
      return `${projectTitle} — ${reportTitle}`;
    }
    return projectTitle || reportTitle;
  }

  private downloadTextPdf(text: string, title: string, filename: string): void {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 22;
    const marginRight = 22;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 22;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(title, marginLeft, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);

    const lines = pdf.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      if (yPos + 6 > pageHeight - 22) {
        pdf.addPage();
        yPos = 22;
      }
      pdf.text(line, marginLeft, yPos);
      yPos += 6;
    }

    this.addPdfFooter(pdf);
    pdf.save(filename);
  }

  private downloadReportPdfStyled(text: string, title: string, filename: string): void {
    if (this.selectedReportTypeId === 'business-model-canvas') {
      this.downloadImpactBmcPdf(text, filename);
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 22;
    const marginRight = 22;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 22;
    const setHeading = (size: number) => {
      pdf.setFont('times', 'bold');
      pdf.setFontSize(size);
    };
    const setBody = () => {
      pdf.setFont('times', 'normal');
      pdf.setFontSize(11);
    };
    const addPageIfNeeded = (heightNeeded: number) => {
      if (yPos + heightNeeded > pageHeight - 22) {
        pdf.addPage();
        yPos = 22;
      }
    };

    setHeading(18);
    const titleWrapped = pdf.splitTextToSize(title, contentWidth);
    pdf.text(titleWrapped, marginLeft, yPos);
    yPos += titleWrapped.length * 7 + 4;
    pdf.setLineWidth(0.3);
    pdf.line(marginLeft, yPos, marginLeft + contentWidth, yPos);
    yPos += 6;

    setBody();
    const lines = text.split(/\r?\n/).map((line) => line.trim());

    for (const line of lines) {
      if (!line) {
        yPos += 4;
        continue;
      }

      if (this.isReportHeading(line)) {
        addPageIfNeeded(10);
        setHeading(13);
        const headingText = line.replace(/:\s*$/, '');
        pdf.text(headingText, marginLeft, yPos);
        yPos += 7;
        setBody();

        continue;
      }

      if (line.startsWith('• ')) {
        const bulletText = line.replace(/^•\s*/, '');
        const wrapped = pdf.splitTextToSize(bulletText, contentWidth - 6);
        for (const segment of wrapped) {
          addPageIfNeeded(6);
          pdf.text('•', marginLeft + 2, yPos);
          pdf.text(segment, marginLeft + 6, yPos);
          yPos += 6;
        }
        yPos += 2;
        continue;
      }

      const wrapped = pdf.splitTextToSize(line, contentWidth);
      for (const segment of wrapped) {
        addPageIfNeeded(6);
        pdf.text(segment, marginLeft, yPos);
        yPos += 6;
      }
      yPos += 2;
    }

    this.addPdfFooter(pdf);
    pdf.save(filename);
  }

  private buildReportDocxParagraphs(text: string): Array<Paragraph | Table> {
    const lines = text.split(/\r?\n/).map((line) => line.trim());
    const blocks: Array<Paragraph | Table> = [];
    const isImpactBmcReport = this.selectedReportTypeId === 'business-model-canvas';
    let bmcTableInserted = false;
    let skipBmcBody = false;

    for (const line of lines) {
      if (!line) {
        continue;
      }

      if (this.isReportHeading(line)) {
        const headingText = line.replace(/:\s*$/, '');
        blocks.push(
          new Paragraph({
            text: headingText,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 140 },
          })
        );

        if (isImpactBmcReport && /business model canvas/i.test(headingText)) {
          blocks.push(this.buildImpactBmcTable());
          bmcTableInserted = true;
          skipBmcBody = true;
          continue;
        }

        skipBmcBody = false;
        continue;
      }

      if (skipBmcBody) {
        continue;
      }

      if (line.startsWith('• ')) {
        blocks.push(
          new Paragraph({
            text: line.replace(/^•\s*/, ''),
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
        continue;
      }

      blocks.push(
        new Paragraph({
          text: line,
          spacing: { after: 120 },
        })
      );
    }

    if (isImpactBmcReport && !bmcTableInserted) {
      blocks.push(new Paragraph({ text: 'Impact Business Model Canvas' }));
      blocks.push(this.buildImpactBmcTable());
    }

    return blocks;
  }

  private parseImpactBmcReport(text: string): {
    executiveOverview: string;
    yourVenture: string;
    table: ImpactBmcTableData;
  } {
    const sanitizedText = text
      .replace(/<br\s*\/?>\s*-\s*/gi, '\n- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\s*br\s*/gi, '\n');
    const normalized = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[:\s]+$/g, '');

    const result = {
      executiveOverview: '',
      yourVenture: '',
      problemStatement: '',
      missionStatement: '',
      keyPartners: '',
      keyActivities: '',
      valueProposition: '',
      stakeholderRelationships: '',
      stakeholderSegments: '',
      keyResources: '',
      channels: '',
      costStructure: '',
      revenueStreams: '',
      intendedImpact: '',
    };
    const labelMap: Record<string, keyof typeof result> = {
      'executive overview': 'executiveOverview',
      'your venture': 'yourVenture',
      'problem statement': 'problemStatement',
      'mission statement': 'missionStatement',
      'key partners': 'keyPartners',
      'key activities': 'keyActivities',
      'value proposition': 'valueProposition',
      'stakeholder relationships': 'stakeholderRelationships',
      'stakeholder segments': 'stakeholderSegments',
      'key resources': 'keyResources',
      channels: 'channels',
      'cost structure': 'costStructure',
      'revenue streams': 'revenueStreams',
      'intended impact': 'intendedImpact',
    };

    const lines = sanitizedText.split(/\r?\n/);
    let currentKey: keyof typeof result | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (currentKey && result[currentKey]) {
          result[currentKey] += '\n';
        }
        continue;
      }

      const inlineMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (inlineMatch) {
        const label = normalized(inlineMatch[1]);
        const mappedKey = labelMap[label];
        if (mappedKey) {
          currentKey = mappedKey;
          const remainder = inlineMatch[2]?.trim();
          if (remainder) {
            result[currentKey] = remainder;
          }
          continue;
        }
      }

      const maybeLabel = normalized(line);
      const mappedKey = labelMap[maybeLabel];
      if (mappedKey) {
        currentKey = mappedKey;
        continue;
      }

      if (currentKey) {
        result[currentKey] = result[currentKey]
          ? `${result[currentKey]}\n${line}`
          : line;
      }
    }

    const cleaned = (value: string) => value.trim();
    return {
      executiveOverview: cleaned(result.executiveOverview),
      yourVenture: cleaned(result.yourVenture),
      table: {
        problemStatement: cleaned(result.problemStatement),
        missionStatement: cleaned(result.missionStatement),
        keyPartners: cleaned(result.keyPartners),
        keyActivities: cleaned(result.keyActivities),
        valueProposition: cleaned(result.valueProposition),
        stakeholderRelationships: cleaned(result.stakeholderRelationships),
        stakeholderSegments: cleaned(result.stakeholderSegments),
        keyResources: cleaned(result.keyResources),
        channels: cleaned(result.channels),
        costStructure: cleaned(result.costStructure),
        revenueStreams: cleaned(result.revenueStreams),
        intendedImpact: cleaned(result.intendedImpact),
      },
    };
  }

  private buildImpactBmcDocxBlocks(parsed: {
    executiveOverview: string;
    yourVenture: string;
    table: ImpactBmcTableData;
  }): Array<Paragraph | Table> {
    const blocks: Array<Paragraph | Table> = [];

    blocks.push(
      new Paragraph({
        text: this.buildReportTitle(),
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 220 },
      })
    );

    blocks.push(
      new Paragraph({
        text: 'Executive Overview',
        heading: HeadingLevel.HEADING_2,
      })
    );
    blocks.push(new Paragraph({ text: parsed.executiveOverview || '', spacing: { after: 160 } }));

    const ventureLine = parsed.yourVenture
      ? new TextRun({ text: ` ${parsed.yourVenture}` })
      : new TextRun(' ________________________________________________');
    blocks.push(
      new Paragraph({
        children: [new TextRun({ text: 'Your Venture:', bold: true }), ventureLine],
      })
    );

    blocks.push(this.buildImpactBmcTable(parsed.table));
    return blocks;
  }

  private downloadImpactBmcPdf(text: string, filename: string): void {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 22;
    const marginRight = 22;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 22;

    const parsed = this.parseImpactBmcReport(text);

    const setHeading = (size: number) => {
      pdf.setFont('times', 'bold');
      pdf.setFontSize(size);
    };
    const setBody = (size = 11) => {
      pdf.setFont('times', 'normal');
      pdf.setFontSize(size);
    };
    const addPageIfNeeded = (heightNeeded: number) => {
      if (yPos + heightNeeded > pageHeight - 22) {
        pdf.addPage();
        yPos = 22;
      }
    };

    setHeading(18);
    const title = this.buildReportTitle();
    const titleWrapped = pdf.splitTextToSize(title, contentWidth);
    pdf.text(titleWrapped, marginLeft, yPos);
    yPos += titleWrapped.length * 7 + 4;
    pdf.setLineWidth(0.3);
    pdf.line(marginLeft, yPos, marginLeft + contentWidth, yPos);
    yPos += 6;

    setHeading(13);
    pdf.text('Executive Overview', marginLeft, yPos);
    yPos += 7;

    setBody(11);
    if (parsed.executiveOverview) {
      const wrapped = pdf.splitTextToSize(parsed.executiveOverview, contentWidth);
      for (const segment of wrapped) {
        addPageIfNeeded(6);
        pdf.text(segment, marginLeft, yPos);
        yPos += 6;
      }
    }
    yPos += 4;

    if (parsed.yourVenture) {
      addPageIfNeeded(6);
      pdf.setFont('times', 'bold');
      pdf.text('Your Venture:', marginLeft, yPos);
      pdf.setFont('times', 'normal');
      const labelWidth = pdf.getTextWidth('Your Venture: ') + 2;
      const wrapped = pdf.splitTextToSize(parsed.yourVenture, contentWidth - labelWidth);
      pdf.text(wrapped[0] || '', marginLeft + labelWidth, yPos);
      yPos += 6;
      for (let i = 1; i < wrapped.length; i += 1) {
        addPageIfNeeded(6);
        pdf.text(wrapped[i], marginLeft, yPos);
        yPos += 6;
      }
    } else {
      yPos = this.drawPdfFillLine(pdf, marginLeft, marginRight, yPos, 'Your Venture:');
    }

    yPos += 2;
    yPos = this.drawImpactBmcTablePdf(pdf, marginLeft, contentWidth, yPos, parsed.table);

    this.addPdfFooter(pdf);
    pdf.save(filename);
  }

  private buildReportFooter(): Footer {
    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: 'NewWorld Game(TM) ', size: 18, color: '666666' }),
            new ExternalHyperlink({
              link: 'https://newworld-game.org/',
              children: [
                new TextRun({
                  text: 'newworld-game.org',
                  size: 18,
                  color: '2F5FD0',
                  underline: {},
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  private addPdfFooter(pdf: jsPDF): void {
    const totalPages = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 22;
    const marginRight = 22;
    const y = pageHeight - 14;

    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(marginLeft, y - 4, pageWidth - marginRight, y - 4);
      pdf.setFont('times', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 110);
      if (typeof (pdf as any).textWithLink === 'function') {
        const prefix = 'NewWorld Game(TM) • ';
        pdf.text(prefix, marginLeft, y);
        const prefixWidth = pdf.getTextWidth(prefix);
        (pdf as any).textWithLink('newworld-game.org', marginLeft + prefixWidth, y, {
          url: 'https://newworld-game.org/',
        });
      } else {
        pdf.text('NewWorld Game(TM) • newworld-game.org', marginLeft, y);
      }
      pdf.setTextColor(0, 0, 0);
    }
  }

  private drawPdfFillLine(
    pdf: jsPDF,
    marginLeft: number,
    marginRight: number,
    yPos: number,
    label: string
  ): number {
    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.text(label, marginLeft, yPos);

    const labelWidth = pdf.getTextWidth(label) + 2;
    const lineStart = marginLeft + labelWidth;
    const lineEnd = pdf.internal.pageSize.getWidth() - marginRight;
    pdf.setLineWidth(0.2);
    pdf.line(lineStart, yPos + 1, lineEnd, yPos + 1);

    pdf.setFont('times', 'normal');
    pdf.setFontSize(11);
    return yPos + 6;
  }

  private drawImpactBmcTablePdf(
    pdf: jsPDF,
    marginLeft: number,
    contentWidth: number,
    startY: number,
    data?: ImpactBmcTableData
  ): number {
    const pageHeight = pdf.internal.pageSize.getHeight();
    const colWidth = contentWidth / 5;
    const rowHeights = {
      problem: 14,
      mission: 14,
      top: 34,
      middle: 26,
      cost: 18,
      impact: 14,
    };
    const shadedColor = [217, 217, 217];
    const borderWidth = 0.3;

    const drawCell = (
      x: number,
      y: number,
      width: number,
      height: number,
      label: string,
      content = '',
      shaded = false
    ) => {
      if (shaded) {
        pdf.setFillColor(shadedColor[0], shadedColor[1], shadedColor[2]);
        pdf.rect(x, y, width, height, 'F');
      }
      pdf.setLineWidth(borderWidth);
      pdf.rect(x, y, width, height);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(10);
      pdf.text(label, x + 2, y + 4);
      pdf.setFont('times', 'normal');
      pdf.setFontSize(9);
      if (content) {
        const textX = x + 2;
        const textY = y + 8;
        const textWidth = width - 4;
        const textHeight = height - 10;
        const wrapped = pdf.splitTextToSize(content, textWidth);
        let lineY = textY;
        for (const segment of wrapped) {
          if (lineY > y + textHeight) {
            break;
          }
          pdf.text(segment, textX, lineY);
          lineY += 4;
        }
      }
    };

    const totalHeight =
      rowHeights.problem +
      rowHeights.mission +
      rowHeights.top +
      rowHeights.middle +
      rowHeights.cost +
      rowHeights.impact +
      4;

    let y = startY;
    if (y + totalHeight > pageHeight - 22) {
      pdf.addPage();
      y = 22;
    }

    drawCell(marginLeft, y, contentWidth, rowHeights.problem, 'Problem Statement', data?.problemStatement || '', true);
    y += rowHeights.problem;

    drawCell(marginLeft, y, contentWidth, rowHeights.mission, 'Mission Statement', data?.missionStatement || '', true);
    y += rowHeights.mission;

    const x0 = marginLeft;
    const x1 = marginLeft + colWidth;
    const x2 = marginLeft + colWidth * 2;
    const x3 = marginLeft + colWidth * 3;
    const x4 = marginLeft + colWidth * 4;

    drawCell(x0, y, colWidth, rowHeights.top + rowHeights.middle, 'Key Partners', data?.keyPartners || '');
    drawCell(x1, y, colWidth, rowHeights.top, 'Key Activities', data?.keyActivities || '');
    drawCell(x2, y, colWidth, rowHeights.top + rowHeights.middle, 'Value Proposition', data?.valueProposition || '');
    drawCell(x3, y, colWidth, rowHeights.top, 'Stakeholder Relationships', data?.stakeholderRelationships || '');
    drawCell(x4, y, colWidth, rowHeights.top + rowHeights.middle, 'Stakeholder Segments', data?.stakeholderSegments || '');

    drawCell(x1, y + rowHeights.top, colWidth, rowHeights.middle, 'Key Resources', data?.keyResources || '');
    drawCell(x3, y + rowHeights.top, colWidth, rowHeights.middle, 'Channels', data?.channels || '');
    y += rowHeights.top + rowHeights.middle;

    drawCell(x0, y, colWidth * 3, rowHeights.cost, 'Cost Structure', data?.costStructure || '');
    drawCell(x3, y, colWidth * 2, rowHeights.cost, 'Revenue Streams', data?.revenueStreams || '');
    y += rowHeights.cost;

    drawCell(x0, y, contentWidth, rowHeights.impact, 'Intended Impact', data?.intendedImpact || '', true);
    y += rowHeights.impact;

    return y + 4;
  }

  private buildImpactBmcTable(data?: ImpactBmcTableData): Table {
    const shaded = 'D9D9D9';
    const border = {
      style: BorderStyle.SINGLE,
      size: 6,
      color: '000000',
    };

    const makeCell = (
      label: string,
      content?: string,
      options?: { shaded?: boolean; columnSpan?: number; rowSpan?: number; lines?: number }
    ) =>
      new TableCell({
        columnSpan: options?.columnSpan,
        rowSpan: options?.rowSpan,
        shading: options?.shaded
          ? { type: ShadingType.CLEAR, fill: shaded }
          : undefined,
        borders: { top: border, bottom: border, left: border, right: border },
        children: [
          new Paragraph({ children: [new TextRun({ text: label, bold: true })] }),
          ...(content
            ? content
                .split(/\r?\n/)
                .map((line) => new Paragraph(line))
            : Array.from({ length: options?.lines ?? 2 }).map(() => new Paragraph(''))),
        ],
      });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeCell('Problem Statement', data?.problemStatement, { shaded: true, columnSpan: 5, lines: 2 }),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Mission Statement', data?.missionStatement, { shaded: true, columnSpan: 5, lines: 2 }),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Key Partners', data?.keyPartners, { rowSpan: 2, lines: 5 }),
            makeCell('Key Activities', data?.keyActivities, { lines: 4 }),
            makeCell('Value Proposition', data?.valueProposition, { rowSpan: 2, lines: 6 }),
            makeCell('Stakeholder Relationships', data?.stakeholderRelationships, { lines: 4 }),
            makeCell('Stakeholder Segments', data?.stakeholderSegments, { rowSpan: 2, lines: 6 }),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Key Resources', data?.keyResources, { lines: 4 }),
            makeCell('Channels', data?.channels, { lines: 4 }),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Cost Structure', data?.costStructure, { columnSpan: 3, lines: 4 }),
            makeCell('Revenue Streams', data?.revenueStreams, { columnSpan: 2, lines: 4 }),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Intended Impact', data?.intendedImpact, { shaded: true, columnSpan: 5, lines: 3 }),
          ],
        }),
      ],
    });
  }

  private isReportHeading(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }
    if (trimmed.length <= 3) {
      return false;
    }
    if (trimmed.endsWith(':')) {
      return true;
    }
    const upper = trimmed.toUpperCase();
    const hasLetters = /[A-Z]/.test(upper);
    return hasLetters && trimmed.length <= 60 && trimmed === upper;
  }

  private normalizeReportText(value: string): string {
    if (!value) {
      return '';
    }

    let cleaned = value;

    // Normalize HTML line breaks that sometimes appear in AI output
    cleaned = cleaned.replace(/<br\s*\/?>\s*-\s*/gi, '\n- ');
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\s*br\s*/gi, '\n');

    // Convert markdown headings to plain text with emphasis
    cleaned = cleaned.replace(/^### (.+)$/gm, '\n$1\n');
    cleaned = cleaned.replace(/^## (.+)$/gm, '\n$1:\n');

    // Convert markdown tables to readable text format
    cleaned = this.convertMarkdownTableToText(cleaned);

    // Convert bullet points to clean format
    cleaned = cleaned.replace(/^\s*[-*]\s+(.+)$/gm, '  • $1');

    // Remove remaining markdown formatting
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
    cleaned = cleaned.replace(/[_`>]+/g, '');
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
  }

  private convertMarkdownTableToText(value: string): string {
    // Match markdown tables
    const tableRegex = /(\|.+\|[\r\n]+\|[-:\| ]+\|[\r\n]+(?:\|.+\|[\r\n]*)+)/g;

    return value.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n').filter(line => line.trim());
      if (lines.length < 2) return match;

      const headerRow = lines[0];
      const dataRows = lines.slice(2);

      // Parse header
      const headers = headerRow.split('|').filter(cell => cell.trim()).map(cell => cell.trim());

      // Build text representation
      let text = '\n';

      // Add data rows
      dataRows.forEach((row) => {
        const cells = row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
        cells.forEach((cell, i) => {
          if (headers[i] && cell) {
            text += `  ${headers[i]}: ${cell}\n`;
          }
        });
        text += '\n';
      });

      return text;
    });
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private textToHtml(value: string): string {
    if (!value) {
      return '';
    }
    const lines = value.split('\n').map((line) => line.trim());
    return lines
      .map((line) => (line ? `<p>${this.escapeHtml(line)}</p>` : ''))
      .join('');
  }

  private async downloadCurrentDraftPdfWithImages(): Promise<void> {
    if (typeof document === 'undefined') {
      this.downloadCurrentDraftPdfTextOnly();
      return;
    }

    const { default: html2canvas } = await import('html2canvas');
    const container = document.createElement('div');
    const title = this.currentSolution?.title || 'Untitled Solution';
    container.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 12px;">${this.escapeHtml(title)}</h1>
        ${this.currentDraftHtml || this.textToHtml(this.currentDraftText)}
      </div>
    `;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.style.padding = '24px';
    container.style.boxSizing = 'border-box';
    container.style.border = '1px solid #e5e7eb';
    container.querySelectorAll('img').forEach((img) => {
      img.setAttribute('crossorigin', 'anonymous');
      (img as HTMLImageElement).style.maxWidth = '100%';
      (img as HTMLImageElement).style.height = 'auto';
      (img as HTMLImageElement).style.display = 'block';
      (img as HTMLImageElement).style.margin = '12px 0';
    });
    container.querySelectorAll('p').forEach((p) => {
      (p as HTMLElement).style.margin = '0 0 10px';
    });

    document.body.appendChild(container);
    await this.waitForImages(container);

    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });

    document.body.removeChild(container);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 14;
    const marginTop = 14;
    const marginRight = 14;
    const usableWidth = pageWidth - marginLeft - marginRight;
    const usableHeight = pageHeight - marginTop * 2;
    const scaleFactor = usableWidth / canvas.width;
    const scaledCanvasHeight = canvas.height * scaleFactor;
    const totalPages = Math.ceil(scaledCanvasHeight / usableHeight);

    let yOffset = 0;
    for (let page = 0; page < totalPages; page += 1) {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      const pageCanvasHeight = Math.min(
        canvas.height - yOffset,
        usableHeight / scaleFactor
      );
      pageCanvas.height = pageCanvasHeight;
      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) {
        continue;
      }

      pageCtx.drawImage(
        canvas,
        0,
        yOffset,
        canvas.width,
        pageCanvasHeight,
        0,
        0,
        canvas.width,
        pageCanvasHeight
      );

      const pageImgData = pageCanvas.toDataURL('image/png');
      if (page > 0) {
        pdf.addPage();
      }
      const chunkPdfHeight = pageCanvasHeight * scaleFactor;
      pdf.addImage(pageImgData, 'PNG', marginLeft, marginTop, usableWidth, chunkPdfHeight);
      yOffset += pageCanvasHeight;
    }

    pdf.save(this.buildDraftFileName('pdf'));
  }

  private downloadCurrentDraftPdfTextOnly(): void {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 22;
    const marginRight = 22;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 22;

    const title = this.currentSolution?.title || 'Untitled Solution';
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(title, marginLeft, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);

    const lines = pdf.splitTextToSize(this.currentDraftText, contentWidth);
    for (const line of lines) {
      if (yPos + 6 > pageHeight - 22) {
        pdf.addPage();
        yPos = 22;
      }
      pdf.text(line, marginLeft, yPos);
      yPos += 6;
    }

    pdf.save(this.buildDraftFileName('pdf'));
  }

  private async buildDocxParagraphsFromHtml(html: string): Promise<Paragraph[]> {
    if (!html || typeof document === 'undefined') {
      return this.currentDraftText
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => new Paragraph(line));
    }

    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');
    const paragraphs: Paragraph[] = [];
    const bodyChildren = Array.from(parsed.body.children);

    for (const element of bodyChildren) {
      await this.appendDocxFromElement(element as HTMLElement, paragraphs);
    }

    return paragraphs;
  }

  private async appendDocxFromElement(element: HTMLElement, paragraphs: Paragraph[]): Promise<void> {
    const tag = element.tagName.toLowerCase();

    if (tag === 'img') {
      const imageParagraph = await this.buildImageParagraph(element as HTMLImageElement);
      if (imageParagraph) {
        paragraphs.push(imageParagraph);
      }
      return;
    }

    if (tag === 'figure') {
      const img = element.querySelector('img');
      if (img) {
        const imageParagraph = await this.buildImageParagraph(img as HTMLImageElement);
        if (imageParagraph) {
          paragraphs.push(imageParagraph);
        }
      }
      const caption = element.querySelector('figcaption')?.textContent?.trim();
      if (caption) {
        paragraphs.push(new Paragraph(caption));
      }
      return;
    }

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const headingText = element.textContent?.trim();
      if (headingText) {
        paragraphs.push(new Paragraph({ text: headingText, heading: HeadingLevel.HEADING_2 }));
      }
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(element.querySelectorAll('li'));
      for (const item of items) {
        const itemText = item.textContent?.trim();
        if (itemText) {
          paragraphs.push(new Paragraph(`• ${itemText}`));
        }
        const img = item.querySelector('img');
        if (img) {
          const imageParagraph = await this.buildImageParagraph(img as HTMLImageElement);
          if (imageParagraph) {
            paragraphs.push(imageParagraph);
          }
        }
      }
      return;
    }

    let buffer = '';
    const childNodes = Array.from(element.childNodes);
    if (!childNodes.length) {
      const textContent = element.textContent?.trim();
      if (textContent) {
        paragraphs.push(new Paragraph(textContent));
      }
      return;
    }

    for (const node of childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          buffer = buffer ? `${buffer} ${text}` : text;
        }
        continue;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const childElement = node as HTMLElement;
      const childTag = childElement.tagName.toLowerCase();

      if (childTag === 'br') {
        if (buffer) {
          paragraphs.push(new Paragraph(buffer));
          buffer = '';
        }
        continue;
      }

      if (childTag === 'img') {
        if (buffer) {
          paragraphs.push(new Paragraph(buffer));
          buffer = '';
        }
        const imageParagraph = await this.buildImageParagraph(childElement as HTMLImageElement);
        if (imageParagraph) {
          paragraphs.push(imageParagraph);
        }
        continue;
      }

      const childText = childElement.textContent?.trim();
      if (childText) {
        buffer = buffer ? `${buffer} ${childText}` : childText;
      }
    }

    if (buffer) {
      paragraphs.push(new Paragraph(buffer));
    }
  }

  private async buildImageParagraph(image: HTMLImageElement): Promise<Paragraph | null> {
    const src = image.getAttribute('src');
    if (!src) {
      return null;
    }

    try {
      const imageData = await this.fetchImageData(src);
      if (!imageData) {
        return new Paragraph(`Image: ${src}`);
      }
      const { data, width, height, type } = imageData;
      return new Paragraph({
        children: [
          new ImageRun({
            data,
            type,
            transformation: { width, height },
          }),
        ],
      });
    } catch (error) {
      console.warn('Failed to embed image in docx:', error);
      return new Paragraph(`Image: ${src}`);
    }
  }

  private async fetchImageData(
    src: string
  ): Promise<{ data: ArrayBuffer; width: number; height: number; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null> {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    const type = this.mapImageType(blob.type);
    if (!type) {
      return null;
    }
    const arrayBuffer = await blob.arrayBuffer();
    const dimensions = await this.getImageDimensions(blob);
    const maxWidth = 520;
    const scale = Math.min(1, maxWidth / dimensions.width);
    return {
      data: arrayBuffer,
      width: Math.round(dimensions.width * scale),
      height: Math.round(dimensions.height * scale),
      type,
    };
  }

  private getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve({ width: 520, height: 300 });
        return;
      }
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth || 520, height: img.naturalHeight || 300 });
      };
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      img.src = url;
    });
  }

  private mapImageType(mime: string): 'png' | 'jpg' | 'gif' | 'bmp' | null {
    const normalized = (mime || '').toLowerCase();
    if (normalized.includes('png')) {
      return 'png';
    }
    if (normalized.includes('jpeg') || normalized.includes('jpg')) {
      return 'jpg';
    }
    if (normalized.includes('gif')) {
      return 'gif';
    }
    if (normalized.includes('bmp')) {
      return 'bmp';
    }
    return null;
  }

  private async waitForImages(container: HTMLElement): Promise<void> {
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );
  }

  private clampText(value: string, limit: number): string {
    if (!value) {
      return '';
    }
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  }
}
