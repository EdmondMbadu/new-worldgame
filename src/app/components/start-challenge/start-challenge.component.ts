import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { SolutionService } from 'src/app/services/solution.service';
import { Email } from '../create-playground/create-playground.component';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-start-challenge',
  templateUrl: './start-challenge.component.html',
  styleUrl: './start-challenge.component.css',
})
export class StartChallengeComponent implements OnInit {
  selectedChallengeItem: any;
  numberOfEvaluators: number = 3;
  evaluatorsEmails: Email[] = [];
  isLoading: boolean = false;
  createdSolutionSuccess: boolean = false;
  createdSolutionError: boolean = false;
  solutionError: Observable<any> = of(null);

  constructor(
    private challengeService: ChallengesService,
    public auth: AuthService,
    public solution: SolutionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.challengeService.selectedChallengeItem$.subscribe((challengeItem) => {
      if (challengeItem) {
        this.selectedChallengeItem = challengeItem;
      } else {
        // Fallback to localStorage if BehaviorSubject is empty (e.g., after a page refresh)
        this.selectedChallengeItem =
          this.challengeService.getSelectedChallengeItemFromStorage();
      }
      console.log('challenge item', challengeItem);
    });
    this.setUpChallengeInfo();
  }
  ngOnDestroy(): void {
    // Clean up localStorage when the component is destroyed
    this.challengeService.clearSelectedChallengeItem();
  }

  async startChallenge() {
    // Indicate success

    try {
      this.isLoading = true;

      // Await the creation of the new solution
      await this.solution.createdNewSolution(
        this.selectedChallengeItem.title,
        this.solution.newSolution.solutionArea!,
        this.selectedChallengeItem.description,
        this.selectedChallengeItem.image,
        this.solution.newSolution.participantsHolder,
        this.solution.newSolution.evaluatorsHolder,
        ['']
      );

      // Indicate success
      this.createdSolutionSuccess = true;
      // Await the email sending process
      // await this.sendEmailToParticipants();

      // Reset the solution and navigate
      this.solution.resetNewSolution();
      this.router.navigate(['/playground-steps/' + this.solution.solutionId]);
      // Set loading to false after successful operations
      this.isLoading = false;
      // Set loading to false in case of error
      this.isLoading = false;
    } catch (error: any) {
      // Handle errors appropriately
      this.solutionError = of(error);
      this.createdSolutionError = true;
      console.error('An error occurred:', error);
    }
  }
  setUpChallengeInfo() {
    let shuffle = (array: User[]) => {
      return array.sort(() => Math.random() - 0.5);
    };
    this.auth
      .getAllOtherUsers(this.auth.currentUser.email)
      .subscribe((data) => {
        data = shuffle(data);
        for (
          let i = 0;
          i < this.numberOfEvaluators &&
          this.evaluatorsEmails.length < this.numberOfEvaluators;
          i++
        ) {
          this.evaluatorsEmails.push({ name: data[i].email! });
        }
        this.solution.newSolution.evaluatorsHolder = this.evaluatorsEmails;
      });
  }
  closePopUpSucess() {
    this.createdSolutionSuccess = false;
  }
  closePopUpError() {
    this.createdSolutionError = false;
  }
  deleteChallenge() {
    if (!this.selectedChallengeItem || !this.selectedChallengeItem.id) {
      console.error('No challenge selected for deletion.');
      alert('Please select a challenge to delete.');
      return;
    }

    const challengeId = this.selectedChallengeItem.id;

    this.challengeService
      .deleteChallenge(challengeId)
      .then(() => {
        console.log(
          'Challenge deleted successfully:',
          this.selectedChallengeItem
        );
        alert('Challenge has been deleted!');
        this.router.navigate(['/home/']);

        this.selectedChallengeItem = null; // Clear the selected item after deletion
      })
      .catch((error) => {
        console.error('Error deleting challenge:', error);
        alert('Error occurred while deleting the challenge. Please try again.');
      });
  }
}
