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
  text: string = `Hi, I am Bucky, your NewWorld Game AI colleague. To start the NewWorld Game, let's build a solution environment just for you.`;
  result: string = '';
  steps: string[] = [
    `Hi, I am Bucky, your NewWorld Game AI colleague. NewWorld Game is a Challenge like you have never seen before.
It’s a challenge that needs boldness, creativity, collaboration, openness to fun, a sense
of humor and persistence. It’s where your vision and experience build the future you
want. Where you are not the victim but the challenger. That it leads to rewards for you
and the rest of the world is a nice spin-off.
The Challenge is where you compete with the so-called leaders of the world – the
politicians, billionaires, bureaucrats and self-anointed— to solve the real problems
facing the world. The ones you care about.
It’s not a fantasy game. It’s real.
You don’t need luck to win.
You need an idea of what the world should be, and the boldness and persistence to
make it real. NewWorld Game will show you how.
And you will show the world what you can do. To start the NewWorld Game, let's build a solution environment just for you.`,
    `What is your focus for using NewWorld Game?`,
    '',
    'Select all Sustainable Development Goals (SDGs) that interest you.',
    'Enter your first and last name.',
    'Enter Your email.',
    'Create a password to get started',
    'Please accept the Terms and Conditions.',
    `Voila! Almost done! Go to your email to verify your account. Once completed, click done below. If you don't see our verification eMail within 2 minutes, please double check your Spam folder.`,
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
