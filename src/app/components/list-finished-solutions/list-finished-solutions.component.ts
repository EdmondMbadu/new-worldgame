import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-list-finished-solutions',

  templateUrl: './list-finished-solutions.component.html',
  styleUrl: './list-finished-solutions.component.css',
})
export class ListFinishedSolutionsComponent implements OnInit {
  solutions: Solution[] = [];
  pendingSolutions: Solution[] = [];
  completedSolutions: Solution[] = [];
  confirmationDeleteSolution: boolean = false;
  confirmationLeaveSolution: boolean = false;
  currentSolution?: Solution;

  completed: number = 0;
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private router: Router
  ) {
    solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.solutions = data;

      this.findCompletedSolutions();
    });
  }
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  @Input() title: string = `Submitted Solutions`;

  async findCompletedSolutions() {
    this.completedSolutions = [];

    for (let s of this.solutions) {
      if (s.finished === 'true') {
        console.log('completed solution', s);
        this.completedSolutions.push(s);
      }
    }
    this.completed = this.completedSolutions.length;
  }

  toggleConfirmationDeleteSolution() {
    console.log('button clicked ');
    this.confirmationDeleteSolution = !this.confirmationDeleteSolution;
  }
  toggleConfirmationLeaveSolution() {
    this.confirmationLeaveSolution = !this.confirmationLeaveSolution;
  }
  submitDeleteSolution() {
    this.solution.deleteSolution(this.currentSolution!.solutionId!);
    this.toggleConfirmationDeleteSolution();
    this.router.navigate(['/home']);
  }

  submitLeaveSolution() {
    this.removeParticipantFromSolution(this.auth.currentUser.email!);
  }
  removeParticipantFromSolution(email: string) {
    // Ensure participants array exists
    if (
      (this.currentSolution && !this.currentSolution.participants) ||
      !Array.isArray(this.currentSolution!.participants)
    ) {
      alert('No participants found!');
      return;
    }

    // Filter out the participant to be removed
    const updatedParticipants = this.currentSolution!.participants.filter(
      (participant: any) => participant.name !== email
    );

    // Update the solution's participants
    this.solution
      .addParticipantsToSolution(
        updatedParticipants,
        this.currentSolution!.solutionId!
      )
      .then(() => {
        alert(`Successfully removed ${email} from the solution.`);
        this.toggleConfirmationLeaveSolution();
        // this.router.navigate(['/home']);
      })
      .catch((error) => {
        console.error('Error occurred while removing a team member:', error);
        alert('Error occurred while removing a team member. Try again!');
      });
  }

  receiveConfirmationDelete(eventData: Solution) {
    this.currentSolution = eventData;
    this.toggleConfirmationDeleteSolution();
  }

  receiveLeaveSolution(eventData: Solution) {
    this.currentSolution = eventData;
    this.toggleConfirmationLeaveSolution();
  }
}
