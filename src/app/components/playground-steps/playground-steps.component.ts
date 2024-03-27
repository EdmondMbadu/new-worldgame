import { Component, Input, OnInit } from '@angular/core';
import { Router, NavigationEnd, Route } from '@angular/router';
import * as Editor from 'ckeditor5-custom-build/build/ckeditor';
// import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { Element } from '@angular/compiler';
import { AuthService } from 'src/app/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Evaluator, Solution } from 'src/app/models/solution';
import { SolutionService } from 'src/app/services/solution.service';
import { DataService } from 'src/app/services/data.service';
import { User } from 'src/app/models/user';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Component({
  selector: 'app-playground-steps',
  templateUrl: './playground-steps.component.html',
  styleUrls: ['./playground-steps.component.css'],
})
export class PlaygroundStepsComponent implements OnInit {
  id: any = '';
  currentSolution: Solution = {};
  teamMembers: User[] = [];
  showPopUpTeam: boolean[] = [];
  showPopUpEvaluators: boolean[] = [];
  showAddTeamMember: boolean = false;
  hoverAddTeamMember: boolean = false;
  evaluators: User[] = [];
  etAl: string = '';
  newTeamMember: string = '';

  hoverChangeReadMe: boolean = false;
  updateReadMeBox: boolean = false;
  newReadMe: string = '';

  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
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
    this.buttontexts[this.steps.length - 1] = 'Submit';
  }
  getMembers() {
    this.teamMembers = [];

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
      });
    }
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
    'Step I:  Define the Problem State',
    'Step II: Envision the Preferred State',
    'Step III: Develop Our Plan',
    'Step IV: Strategy Review',
  ];
  display = new Array(this.steps.length).fill(false);
  buttontexts = new Array(this.steps.length).fill('Next');
  questionsTitles: Array<Array<string>> = [
    ['S1-A', 'S1-B', 'S1-C', 'S1-D'],
    ['S2-A', 'S2-B'],
    ['S3-A', 'S3-B', 'S3-C', 'S3-D', 'S3-E', 'S3-F'],
    ['S4'],
  ];
  timelineDisplay = [
    'bg-gray-200 h-0.5',
    'bg-gray-200 h-0.5',
    'bg-gray-200 h-0.5',
    'bg-gray-200 h-0.5',
  ];
  AllQuestions: Array<Array<string>> = [
    [
      'What is the problem you have chosen and why ?(Back up/document why you have chosen this problem.)',
      'What are the symptoms of this problem? How do you measure it? (Show information)',
      'How many people does this problem impact in the world? Where is it most severe?',
      'What will happen if nothing is done to deal with this problem?',
    ],
    [
      'What is the preferred or ideal state that you want to reach with your solution? What is your goal? What will the world look like if this problem is solved?',
      'How will you measure success? How will you know when you reach the preferred state?',
    ],
    [
      'What does our solution do to reach the preferred state? how will it do it?',
      'What technology, programs, policies will it need?',
      'What resources does our solution need?',
      'Who will implement our solution?',
      ' How is our solution part of a circular, regenerative, more equitable economy?',
    ],
    ['Review Your Entire Strategy and Submit'],
  ];

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

    console.log('current solution ok?', this.currentSolution);
    console.log('evaluators ok?', this.evaluators);
    this.evaluators.forEach((evaluator) => {
      const emailData = {
        email: evaluator.email,
        subject: `You have been invited to evaluate the NewWorld Game solution: ${this.currentSolution.title} by ${this.currentSolution.authorName} ${this.etAl} `,
        // title: this.myForm.value.title,
        // description: this.myForm.value.description,
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

  updateTimelineDisplay(index: number) {
    // Reset all to remove styles
    this.timelineDisplay.fill('');

    // Apply the style up to the current index
    for (let i = 0; i < index; i++) {
      this.timelineDisplay[i] = 'bg-red-500 h-1 dark:bg-red-500';
    }
  }
  onHoverImageTeam(index: number) {
    this.showPopUpTeam[index] = true;
  }
  onLeaveTeam(index: number) {
    this.showPopUpTeam[index] = false;
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
  addParticipantToSolution() {
    let participants: any = [];
    if (this.data.isValidEmail(this.newTeamMember)) {
      participants = this.currentSolution.participants;
      participants.push({ name: this.newTeamMember });
      // console.log('participants', participants);
      // console.log('team member', this.newTeamMember);

      this.solution
        .addParticipantsToSolution(
          participants,
          this.currentSolution.solutionId!
        )
        .then(() => {
          this.newTeamMember = '';
          this.getMembers();
          this.toggleAddTeamMember();
        })
        .catch((error) => {
          alert('Error occured while adding a team member. Try Again!');
        });
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
}
