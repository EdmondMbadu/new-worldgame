import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-solution',

  templateUrl: './create-solution.component.html',
  styleUrl: './create-solution.component.css',
})
export class CreateSolutionComponent {
  initial: number = 10;
  increment: number = 15;
  steps: string[] = [
    'createSolution.steps.intro',
    'createSolution.steps.focusArea',
    'createSolution.steps.projectTitle',
    'createSolution.steps.problemDescription',
    'createSolution.steps.teamMembers',
    'createSolution.steps.evaluators',
    'createSolution.steps.sdgs',
    'createSolution.steps.submit',
  ];
  buttonTextKeys = new Array(this.steps.length).fill(
    'createSolution.buttons.continue'
  );
  buttonActions: ('continue' | 'submit')[] = new Array(this.steps.length).fill(
    'continue'
  );
  selected: boolean[] = new Array(this.steps.length).fill(false);
  sdgSelected: number[] = [];
  display = new Array(this.steps.length).fill(false);
  currentIndexDisplay: number = 0;
  constructor(private router: Router) {}

  ngOnInit() {
    window.scrollTo(0, 0);
    this.sdgSelected = new Array(17).fill(-1);
    this.display[this.currentIndexDisplay] = true;
    const lastIndex = this.steps.length - 1;
    this.buttonTextKeys[lastIndex] = 'createSolution.buttons.submit';
    this.buttonActions[lastIndex] = 'submit';
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
      this.router.navigate(['/home']);
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
