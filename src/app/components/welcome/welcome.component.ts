import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',

  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
})
export class WelcomeComponent {
  initial: number = 11.1;
  increment: number = 11.1;
  text: string = `Hi, I am Bucky the game has begun. Let's build a solution environment just for you.`;
  result: string = '';
  steps: string[] = [
    `Hi, I am Bucky. To start the NewWorld Game, let's build a solution environment just for you.`,
    `What is your primary focus for using NewWorld Game?`,
    '',
    'Select all Sustainable Development Goals (SDGs) that interest you.',
    'Enter your first and last name.',
    'Enter Your email.',
    'Create a password to get started',
    'Please accept the Terms and Conditions.',
    'Voila! Almost done! Go to your email to verify your account. Once completed, click done below. ',
  ];
  buttontexts = new Array(this.steps.length).fill('Continue');
  selected: boolean[] = new Array(this.steps.length).fill(false);
  sdgSelected: number[] = [];
  display = new Array(this.steps.length).fill(false);
  currentIndexDisplay: number = 0;
  constructor(private cdRef: ChangeDetectorRef, private router: Router) {}

  ngOnInit() {
    window.scrollTo(0, 0);
    this.sdgSelected = new Array(17).fill(-1);
    this.display[this.currentIndexDisplay] = true;
    this.buttontexts[this.steps.length - 1] = 'Done';
  }
  updatePlayground(current: number) {
    this.display[this.currentIndexDisplay] = false;
    this.currentIndexDisplay = current;
    this.updateTimelineDisplay(current);
    this.display[this.currentIndexDisplay] = true;
  }
  goBackTimeLine(current: number) {
    this.display[this.currentIndexDisplay] = false;
    current--;
    if (current === -1) {
      this.router.navigate(['']);
    }
    this.currentIndexDisplay = current;
    this.updateTimelineDisplay(current);
    this.selected[this.currentIndexDisplay] = false;
    this.display[this.currentIndexDisplay] = true;
  }

  updateTimelineDisplay(current: number) {
    this.initial = this.increment + this.increment * current;
  }
}
