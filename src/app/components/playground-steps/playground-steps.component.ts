import { Component, Input, OnInit } from '@angular/core';
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
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-playground-steps',
  templateUrl: './playground-steps.component.html',
  styleUrls: ['./playground-steps.component.css'],
})
export class PlaygroundStepsComponent implements OnInit {
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

  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions
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
  }
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.display[this.currentIndexDisplay] = true;
    this.buttontexts[this.steps.length - 1] = 'Preview Solution';
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
  steps: string[] = [
    'Step I:  Defining the Problem State',
    'Step II: Envisioning the Preferred State',
    'Step III: Developing Our Solution',
    'Step IV: Implementation',
    'Step V: Strategy Review',
  ];
  subtitles: string[] = [
    'Where we are now',
    'Where we want to be',
    'How we get to the Preferred State',
    'Actions: What, where, who, when, costs, funders, You',
    'Final Review and update order of things',
  ];
  display = new Array(this.steps.length).fill(false);
  buttontexts = new Array(this.steps.length).fill('Next');
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
  AllQuestions: Array<Array<string>> = [
    [
      'What is the problem you have chosen and why is it important?',
      'What are the symptoms of this problem? How do you measure it?',
      'How many people does this problem impact in the world? Where is it most severe?',
      'What will happen if nothing is done to deal with this problem?',
    ],
    [
      'What is the preferred or ideal state that you want to reach with your solution? What is your goal? What will the world look like if this problem is solved?',
      'How will you measure success? How will you know when you reach the preferred state?',
    ],
    [
      'What does our solution do to reach the preferred state? How will it do it?',
      'What technology, programs, policies will it need?',
      'What resources does our solution need?',
      'How is our solution part of a circular, regenerative, more equitable economy?',
    ],
    [
      // i = 0
      `Cost 1. How much will our strategy cost to test, for a proof-of-concept, in the country where
we will test and first implement the solution?`,

      // i = 1
      'Cost 2. How much will our strategy cost to implement at scale?',

      // i = 2
      'Where will we get the resources and funding needed to implement our solution, to do the above?',

      // i = 3
      'Who will implement our solution? Where will it be tested (and first implemented)? Who will be our in-country/on-the-ground partner?',

      // i = 4
      'What actions are needed in the next 6-12 months to get our solution implemented? Who will do what, when, where?',

      // i = 5
      'What does our implemented strategy look like, in more detail? (For this task ask one of our Ai colleagues to draw a picture of what the strategy will look like when implemented).',

      // i = 6
      'Results 1. What are the results of implementing our strategy? What would be the results of providing everyone in a community ____________ (insert description of your strategy) on the local economy, jobs, environment, human health, and other social factors?',

      // i = 7
      'Results 2. What would be the results of providing everyone in the world ____________ (insert description of your strategy) on the global economy, additional jobs, environment, human health, and other social factors?',

      // i = 8
      'What would we do with $5000 to advance the strategy towards implementation?',

      // i = 9
      'What can you/your team do — starting now, with just the resources to which you have access, to move your strategy forward?',
    ],
    ['Review Your Entire Strategy and Preview it'],
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
}
