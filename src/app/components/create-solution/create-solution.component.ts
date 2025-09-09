import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-solution',

  templateUrl: './create-solution.component.html',
  styleUrl: './create-solution.component.css',
})
export class CreateSolutionComponent {
  initial: number = 10;
  increment: number = 15;
  text: string = `Welcome to the NewWorld Game Lab! Ready to kickstart your journey with the NewWorld Game Lab? I'm here to guide you through the process step by step. Together, we'll explore your ideas, build a strong team, and align your project with global goals. Let's begin by getting to know the basics of your project!`;
  result: string = '';
  steps: string[] = [
    `Welcome to the NewWorld Game!
My role, as your colleague— your problem-solving partner— is to help us develop a
solution to a global problem on which you choose to work. Let’s start.`,
    `What is your NewWorld Game Solution Title.`,
    "In a few words, how would you describe the specific problem you're focusing on?",
    'Upload an image for your solution.',
    `List the members of your team. Add their emails below. (This enables communication between team members 
    and, as per NWG Privacy Policy, their information will remain private.)`,
    'For the NWG per-review process, below are some randomly selected evaluators who might be interested in your project. Please add others whom you would like to evaluate your strategy. Other evaluator names can be added later.',
    'Select all Sustainable Development Goals (SDGs) that interest you.',
    'Almost done! Submit to start solving your new solution.',
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
    this.buttontexts[this.steps.length - 1] = 'Submit';
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
