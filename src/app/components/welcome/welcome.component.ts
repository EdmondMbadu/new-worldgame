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
  stepKeys: string[] = [
    'welcomeFlow.steps.intro',
    'welcomeFlow.steps.focusQuestion',
    'welcomeFlow.steps.imagePlaceholder',
    'welcomeFlow.steps.sdgPrompt',
    'welcomeFlow.steps.namePrompt',
    'welcomeFlow.steps.emailPrompt',
    'welcomeFlow.steps.passwordPrompt',
    'welcomeFlow.steps.termsPrompt',
    'welcomeFlow.steps.verifyPrompt',
  ];
  buttonKeys: ('continue' | 'done')[] = this.stepKeys.map(() => 'continue');
  selected: boolean[] = new Array(this.stepKeys.length).fill(false);
  sdgSelected: number[] = [];
  display = new Array(this.stepKeys.length).fill(false);
  currentIndexDisplay: number = 0;
  constructor(private cdRef: ChangeDetectorRef, private router: Router) {}

  ngOnInit() {
    window.scrollTo(0, 0);
    this.sdgSelected = new Array(17).fill(-1);
    this.display[this.currentIndexDisplay] = true;
    this.buttonKeys[this.stepKeys.length - 1] = 'done';
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
