import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd, Route } from '@angular/router';
import * as Editor from 'ckeditor5-custom-build/build/ckeditor';
// import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { Element } from '@angular/compiler';
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
(Answer these two questions first from your personal knowledge. Then Ask Bucky why it is important.)`,
          `What are the symptoms of this problem? How do you measure it? (Answer these 2 question first from your personal knowledge. Then Ask Bucky.)
(After these questions, ask Bucky or answer from your knowledge: What are the causes of these symptoms? This will provide deeper insight into the problem.)`,
          `How many people does this problem impact in the world? Where is it most severe? (If you don't know, ask Bucky, or use the data sources provided when you click on the "?" .)`,
          `What will happen if nothing is done to deal with this problem? (Answer this first from your personal knowledge. Then Ask Bucky.)`,
        ],
        [
          `What is the preferred or ideal state that you want to reach with your solution? What is your goal? What will the world look like if this problem is solved? (Answer these questions first from your personal knowledge. Then Ask Bucky.)`,
          `How will you measure success? How will you know when you reach the preferred state? (Answer this first from your personal knowledge. Then Ask Bucky.)`,
        ],
        [
          'What does our solution do to reach the preferred state? How will it do it?',
          'What technology, programs, policies will it need?',
          'What resources does our solution need?',
          'How is our solution part of a circular, regenerative, more equitable economy?',
        ],
        [
          `Cost 1. How much will our strategy cost to test, for a proof-of-concept, in the country where we will test and first implement the solution?  (Answer this as best you can. Then ask Bucky. See `,
          'Cost 2. How much will our strategy cost to implement at scale?',
          'Where will we get the resources and funding needed to implement our solution, to do the above?',
          'Who will implement our solution? Where will it be tested (and first implemented)? Who will be our in-country/on-the-ground partner?',
          'What actions are needed in the next 6-12 months to get our solution implemented? Who will do what, when, where?',
          'What does our implemented strategy look like, in more detail? (For this task ask one of our AI colleagues to draw a picture of what the strategy will look like when implemented).',
          'Results 1. Ask Bucky, and/or one of your AI Colleagues, "What are the results of implementing our strategy? What would be the results of providing everyone in a community ____________ (insert description of your strategy) on the local economy, jobs, environment, human health, and other social factors?"',
          'Results 2. Ask Bucky, and/or one of your AI Colleagues, "What would be the results of providing everyone in the world ____________ (insert description of your strategy) on the global economy, additional jobs, environment, human health, and other social factors?"',
          'What would we do with $10,000 to advance the strategy towards implementation?',
          'What can you/your team do — starting now, with just the resources to which you have access, to move your strategy forward?',
        ],
        [
          'Review Your Entire Strategy, Preview it, Add what you think might be missing.',
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
(Répondez d'abord à ces deux questions selon vos propres connaissances. Puis demandez à Bucky pourquoi il est important.)`,
          `Quels sont les symptômes de ce problème ? Comment le mesurez-vous ? (Répondez d'abord à ces deux questions selon vos connaissances, puis demandez à Bucky.)
(Après ces questions, demandez à Bucky ou répondez selon vos connaissances : quelles sont les causes de ces symptômes ? Cela permettra de mieux comprendre le problème.)`,
          `Combien de personnes ce problème touche-t-il dans le monde ? Où est-il le plus grave ? (Si vous ne le savez pas, demandez à Bucky ou utilisez les sources de données proposées lorsque vous cliquez sur le " ? ".)`,
          `Que se passera-t-il si rien n'est fait pour résoudre ce problème ? (Répondez d'abord selon vos propres connaissances. Puis demandez à Bucky.)`,
        ],
        [
          `Quel est l'état souhaité ou idéal que vous voulez atteindre avec votre solution ? Quel est votre objectif ? À quoi ressemblera le monde si ce problème est résolu ? (Répondez d'abord selon vos propres connaissances. Puis demandez à Bucky.)`,
          `Comment mesurerez-vous le succès ? Comment saurez-vous que vous avez atteint l'état souhaité ? (Répondez d'abord selon vos connaissances. Puis demandez à Bucky.)`,
        ],
        [
          `Que fait notre solution pour atteindre l'état souhaité ? Comment y parvient-elle ?`,
          `De quelles technologies, programmes ou politiques aura-t-elle besoin ?`,
          `De quelles ressources notre solution a-t-elle besoin ?`,
          `En quoi notre solution participe-t-elle à une économie circulaire, régénératrice et plus équitable ?`,
        ],
        [
          `Coût 1. Combien coûtera notre stratégie pour être testée, en preuve de concept, dans le pays où nous la testerons et la mettrons en œuvre pour la première fois ? (Répondez du mieux possible, puis demandez à Bucky. Voir `,
          `Coût 2. Combien coûtera notre stratégie pour être mise en œuvre à grande échelle ?`,
          `Où obtiendrons-nous les ressources et le financement nécessaires pour mettre en œuvre notre solution, comme décrit ci-dessus ?`,
          `Qui mettra en œuvre notre solution ? Où sera-t-elle testée (et déployée en premier) ? Qui sera notre partenaire sur le terrain/dans le pays ?`,
          `Quelles actions sont nécessaires dans les 6 à 12 prochains mois pour mettre en œuvre notre solution ? Qui fera quoi, quand et où ?`,
          `À quoi ressemble, plus en détail, notre stratégie une fois mise en œuvre ? (Pour cette tâche, demandez à l'un de nos collègues IA de dessiner l'aspect de la stratégie une fois en place.)`,
          `Résultats 1. Demandez à Bucky ou à l'un de vos collègues IA : " Quels sont les résultats de la mise en œuvre de notre stratégie ? Quels seraient les effets de fournir à toute une communauté ____________ (décrivez votre stratégie) sur l'économie locale, l'emploi, l'environnement, la santé humaine et d'autres facteurs sociaux ? "`,
          `Résultats 2. Demandez à Bucky ou à l'un de vos collègues IA : " Quels seraient les effets de fournir à toute la planète ____________ (décrivez votre stratégie) sur l'économie mondiale, les emplois supplémentaires, l'environnement, la santé humaine et d'autres facteurs sociaux ? "`,
          `Que ferions-nous avec 10 000 $ pour faire avancer la stratégie vers la mise en œuvre ?`,
          `Que pouvez-vous/votre équipe faire — dès maintenant, avec les seules ressources auxquelles vous avez accès — pour faire progresser votre stratégie ?`,
        ],
        [
          `Relisez l'ensemble de votre stratégie, prévisualisez-la et ajoutez ce qui pourrait manquer.`,
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
  display: boolean[] = [];
  buttontexts: string[] = [];
  AllQuestions: Array<Array<string>> = this.localizedContent[
    this.defaultLanguage
  ].questions.map((group) => [...group]);
  private langSub?: Subscription;
  aiFeedbackLoading = false;
  aiFeedbackStatus = '';
  aiFeedbackError = '';
  aiFeedbackText = '';
  aiFeedbackFormatted = '';
  aiFeedbackParsed: AiFeedbackDisplay = { scores: [], improvements: [] };
  private aiFeedbackDocSub?: Subscription;

  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private languageService: LanguageService,
    private afs: AngularFirestore
  ) {
    this.currentUser = this.auth.currentUser;
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
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
    });
    this.initializeLanguageSupport();
  }
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.display = new Array(this.steps.length).fill(false);
    this.display[this.currentIndexDisplay] = true;
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
    ['S3-A', 'S3-B', 'S3-C', 'S3-D'],
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

  goBackAndForthTimeLine(current: number) {
    this.display[this.currentIndexDisplay] = false;
    this.currentIndexDisplay = current;
    this.updateTimelineDisplay(current);
    this.display[this.currentIndexDisplay] = true;
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
    const genericEmail = this.fns.httpsCallable('genericEmail');
    const nonUserEmail = this.fns.httpsCallable('nonUserEmail'); // Ensure you have this Cloud Function set up

    try {
      // Fetch the user data
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(this.newTeamMember)
      );
      console.log('extracted user from email', users);
      console.log('the new solution data', this.solution.newSolution);

      if (users && users.length > 0) {
        // Participant is a registered user
        const emailData = {
          email: this.newTeamMember, // Ensure this is the correct field
          subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
          title: `${this.currentSolution.title}`,
          description: `${this.currentSolution.description}`,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: `${this.currentSolution.image}`,
          path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
          user: `${users[0].firstName} ${users[0].lastName}`,
          // Add any other necessary fields
        };

        const result = await firstValueFrom(genericEmail(emailData));
        console.log(`Email sent to ${this.newTeamMember}:`, result);
      } else {
        // Participant is NOT a registered user
        // Participant is a registered user
        const emailData = {
          email: this.newTeamMember, // Ensure this is the correct field
          subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
          title: this.currentSolution.title,
          description: this.currentSolution.description,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: this.currentSolution.image,
          path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
          // Add any other necessary fields
        };

        const result = await firstValueFrom(nonUserEmail(emailData));
        console.log(`Email sent to ${this.newTeamMember}:`, result);
      }
    } catch (error) {
      console.error(
        `Error processing participant ${this.newTeamMember}:`,
        error
      );
    }
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
    this.aiFeedbackStatus = 'Sending your strategy to the AI evaluator...';

    const docId = this.afs.createId();
    const docRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${this.auth.currentUser.uid}/discussions/${docId}`
    );

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
        this.aiFeedbackDocSub?.unsubscribe();
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

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.aiFeedbackDocSub?.unsubscribe();
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

      if (normalized === 'scores') {
        section = 'scores';
        continue;
      }
      if (normalized === 'improvements') {
        section = 'improvements';
        continue;
      }
      if (line.toLowerCase().startsWith('readiness level')) {
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
    let formatted = this.escapeHtml(value);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
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
    const instructions = `Role: You are the Evaluator for NewWorld Game.
Your job is to evaluate the user’s solution using the official criteria and provide numerical scores + improvement feedback.

Do the following every time:

1. Score the Solution (1–10 each)

Give a score for each category:

Preferred State

Technological Feasibility

Environmental Impact

Economic Viability

Equity & Fairness

Clarity & Understandability

(1 = not viable, 5 = needs major improvement, 10 = ready to implement)

2. Explain Each Score

In 1–2 short sentences, explain why you gave that score.

3. Provide Improvements

Give 3–5 concrete, actionable recommendations that would strengthen the solution.

4. Readiness Level

Based on overall scoring, label the solution:

Initial Conceptualization (1–3)

Preliminary Design (4–6)

Advanced Development (7–8)

Ready to Implement (9–10)

Tone

Clear, constructive, helpful; no fluff.

Output Format (strict)
Scores:
Preferred State: X/10 (reason)
Technological Feasibility: X/10 (reason)
Environmental Impact: X/10 (reason)
Economic Viability: X/10 (reason)
Equity & Fairness: X/10 (reason)
Clarity & Understandability: X/10 (reason)

Improvements:
1.
2.
3.
4. (optional)
5. (optional)

Readiness Level: ______`;

    const solutionSummary = this.buildSolutionSummaryForAi();
    return solutionSummary ? `${instructions}\n\n${solutionSummary}` : '';
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

  private clampText(value: string, limit: number): string {
    if (!value) {
      return '';
    }
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  }
}
