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
import { firstValueFrom, Subscription } from 'rxjs';
import { LanguageService } from 'src/app/services/language.service';

type SupportedLanguage = 'en' | 'fr';

interface PlaygroundLanguageContent {
  steps: string[];
  subtitles: string[];
  questions: string[][];
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
        `Etape 1 : Definir l'etat du probleme`,
        `Etape 2 : Imaginer l'etat souhaite`,
        `Etape 3 : Concevoir notre solution`,
        `Etape 4 : Mise en oeuvre`,
        `Etape 5 : Diffusion de la strategie`,
      ],
      subtitles: [
        `Ou nous en sommes aujourd'hui`,
        `Ou nous voulons etre`,
        `Comment atteindre l'etat souhaite`,
        `Actions : quoi, ou, qui, quand, couts, financeurs, vous`,
        `Relecture finale et hierarchisation`,
      ],
      questions: [
        [
          `Quel probleme avez-vous choisi et pourquoi est-il important ?
(Rependez d'abord a ces deux questions selon vos propres connaissances. Puis demandez a Bucky pourquoi il est important.)`,
          `Quels sont les symptomes de ce probleme ? Comment le mesurez-vous ? (Repondez d'abord a ces deux questions selon vos connaissances, puis demandez a Bucky.)
(Apres ces questions, demandez a Bucky ou repondez selon vos connaissances : quelles sont les causes de ces symptomes ? Cela permettra de mieux comprendre le probleme.)`,
          `Combien de personnes ce probleme touche-t-il dans le monde ? Ou est-il le plus grave ? (Si vous ne le savez pas, demandez a Bucky ou utilisez les sources de donnees proposees lorsque vous cliquez sur le " ? ".)`,
          `Que se passera-t-il si rien n'est fait pour resoudre ce probleme ? (Repondez d'abord selon vos propres connaissances. Puis demandez a Bucky.)`,
        ],
        [
          `Quel est l'etat souhaite ou ideal que vous voulez atteindre avec votre solution ? Quel est votre objectif ? A quoi ressemblera le monde si ce probleme est resolu ? (Repondez d'abord selon vos propres connaissances. Puis demandez a Bucky.)`,
          `Comment mesurerez-vous le succes ? Comment saurez-vous que vous avez atteint l'etat souhaite ? (Repondez d'abord selon vos connaissances. Puis demandez a Bucky.)`,
        ],
        [
          `Que fait notre solution pour atteindre l'etat souhaite ? Comment y parvient-elle ?`,
          `De quelles technologies, programmes ou politiques aura-t-elle besoin ?`,
          `De quelles ressources notre solution a-t-elle besoin ?`,
          `En quoi notre solution participe-t-elle a une economie circulaire, regeneratrice et plus equitable ?`,
        ],
        [
          `Cout 1. Combien coutera notre strategie pour etre testee, en preuve de concept, dans le pays ou nous la testerons et la mettrons en oeuvre pour la premiere fois ? (Repondez du mieux possible, puis demandez a Bucky. Voir `,
          `Cout 2. Combien coutera notre strategie pour etre mise en oeuvre a grande echelle ?`,
          `Ou obtiendrons-nous les ressources et le financement necessaires pour mettre en oeuvre notre solution, comme decrit ci-dessus ?`,
          `Qui mettra en oeuvre notre solution ? Ou sera-t-elle testee (et deployee en premier) ? Qui sera notre partenaire sur le terrain/dans le pays ?`,
          `Quelles actions sont necessaires dans les 6 a 12 prochains mois pour mettre en oeuvre notre solution ? Qui fera quoi, quand et ou ?`,
          `A quoi ressemble, plus en detail, notre strategie une fois mise en oeuvre ? (Pour cette tache, demandez a l'un de nos collegues IA de dessiner l'aspect de la strategie une fois en place.)`,
          `Resultats 1. Demandez a Bucky ou a l'un de vos collegues IA : " Quels sont les resultats de la mise en oeuvre de notre strategie ? Quels seraient les effets de fournir a toute une communaute ____________ (decrivez votre strategie) sur l'economie locale, l'emploi, l'environnement, la sante humaine et d'autres facteurs sociaux ? "`,
          `Resultats 2. Demandez a Bucky ou a l'un de vos collegues IA : " Quels seraient les effets de fournir a toute la planete ____________ (decrivez votre strategie) sur l'economie mondiale, les emplois supplementaires, l'environnement, la sante humaine et d'autres facteurs sociaux ? "`,
          `Que ferions-nous avec 10 000 $ pour faire avancer la strategie vers la mise en oeuvre ?`,
          `Que pouvez-vous/votre equipe faire — des maintenant, avec les seules ressources auxquelles vous avez acces — pour faire progresser votre strategie ?`,
        ],
        [
          `Relisez l'ensemble de votre strategie, previsualisez-la et ajoutez ce qui pourrait manquer.`,
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

  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private languageService: LanguageService
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
}
