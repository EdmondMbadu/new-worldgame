import { Component, Input, OnInit } from '@angular/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { Element } from '@angular/compiler';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-playground-steps',
  templateUrl: './playground-steps.component.html',
  styleUrls: ['./playground-steps.component.css'],
})
export class PlaygroundStepsComponent implements OnInit {
  constructor(public auth: AuthService) {}
  ngOnInit(): void {
    this.display[this.currentIndexDisplay] = true;
    this.buttontexts[this.steps.length - 1] = 'Submit';
  }
  currentIndexDisplay: number = 0;

  title: string = 'World Hunger';
  steps: string[] = [
    'Step I: Problem State',
    'Step II: Preferred State',
    'Step III: Plan',
    'Step IV: Strategy Review',
  ];
  display = new Array(this.steps.length).fill(false);
  buttontexts = new Array(this.steps.length).fill('Next');
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
}
