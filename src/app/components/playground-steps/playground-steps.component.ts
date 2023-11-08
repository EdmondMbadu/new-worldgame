import { Component, Input, OnInit } from '@angular/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { Element } from '@angular/compiler';
import { AuthService } from 'src/app/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { SolutionService } from 'src/app/services/solution.service';
import { DataService } from 'src/app/services/data.service';
import { User } from 'src/app/models/user';

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
  evaluators: User[] = [];
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      this.getMembers();
      this.getEvaluators();
    });
  }
  ngOnInit(): void {
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

    for (const key in this.currentSolution.evaluators) {
      let evaluator = this.currentSolution.evaluators[key];
      let email = Object.values(evaluator)[0];
      // console.log('current email', email);
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
  currentIndexDisplay: number = 0;

  @Input() title?: string = 'World Hunger';
  steps: string[] = [
    'Step I:  Define the Problem State',
    'Step II: Envision the Preferred State',
    'Step III: Develop Your Plan',
    'Step IV: Strategy Review',
  ];
  display = new Array(this.steps.length).fill(false);
  buttontexts = new Array(this.steps.length).fill('Next');
  questionsTitles: Array<Array<string>> = [
    ['S1-A', 'S1-B', 'S1-C', 'S1-D'],
    ['S2-A', 'S2-B'],
    ['S3-A', 'S3-B', 'S3-C', 'S3-D'],
    ['S4'],
  ];
  AllQuestions: Array<Array<string>> = [
    [
      'What is the problem you have chosen and why ?',
      'What are the symptoms of this problem? How do you measure it?',
      'How many people does this problem impact in the world? Where is it most severe?',
      'What will happen if nothing is done to deal with this problem?',
    ],
    [
      'What will the world look like if this problem is solved?',
      'How will you measure success? How will you know when you reach the preferred state?',
    ],
    [
      'What to do to reach the preffered state?',
      'What to do in the next 6 months?',
      'What resources does our plan need?',
      'How much will our strategy cost?',
    ],
    ['Review Your Entire Strategy and Submit'],
  ];

  updatePlayground(current: number) {
    this.display[this.currentIndexDisplay] = false;
    this.currentIndexDisplay = current;
    this.display[this.currentIndexDisplay] = true;
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
}
