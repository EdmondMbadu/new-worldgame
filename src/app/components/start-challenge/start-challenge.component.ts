import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subscription, of } from 'rxjs';
import { User } from 'src/app/models/user';
import { HOME_CHALLENGE_FR } from 'src/app/components/home/home-challenge-fr';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { SolutionService } from 'src/app/services/solution.service';
import { Email } from '../create-playground/create-playground.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-start-challenge',
  templateUrl: './start-challenge.component.html',
  styleUrl: './start-challenge.component.css',
})
export class StartChallengeComponent implements OnInit, OnDestroy {
  selectedChallengeItem: any;
  baseSelectedChallengeItem: any;
  numberOfEvaluators: number = 3;
  evaluatorsEmails: Email[] = [];
  isLoading: boolean = false;
  createdSolutionSuccess: boolean = false;
  createdSolutionError: boolean = false;
  solutionError: Observable<any> = of(null);
  restricted: string = '';
  private challengeSub?: Subscription;
  private languageSub?: Subscription;

  constructor(
    private challengeService: ChallengesService,
    public auth: AuthService,
    public solution: SolutionService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.challengeSub = this.challengeService.selectedChallengeItem$.subscribe(
      (challengeItem) => {
        this.applyChallengeItem(
          challengeItem ||
            this.challengeService.getSelectedChallengeItemFromStorage()
        );
        console.log('challenge item', challengeItem);
      }
    );
    this.languageSub = this.translate.onLangChange.subscribe(() => {
      this.localizeSelectedChallengeItem();
    });
    this.setUpChallengeInfo();
  }
  ngOnDestroy(): void {
    this.challengeSub?.unsubscribe();
    this.languageSub?.unsubscribe();
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
      this.router.navigate(['/dashboard/' + this.solution.solutionId]);
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

  private applyChallengeItem(challengeItem: any): void {
    this.baseSelectedChallengeItem = challengeItem || null;
    this.localizeSelectedChallengeItem();
  }

  private localizeSelectedChallengeItem(): void {
    if (!this.baseSelectedChallengeItem) {
      this.selectedChallengeItem = null;
      this.restricted = '';
      return;
    }

    const englishTitle =
      this.baseSelectedChallengeItem.originalTitle ||
      this.baseSelectedChallengeItem.title ||
      '';
    const englishDescription =
      this.baseSelectedChallengeItem.originalDescription ||
      this.baseSelectedChallengeItem.description ||
      '';
    const frenchContent =
      HOME_CHALLENGE_FR[this.baseSelectedChallengeItem.id] || null;
    const shouldUseFrench = (
      this.translate.currentLang || this.translate.defaultLang || 'en'
    )
      .toLowerCase()
      .startsWith('fr');

    this.selectedChallengeItem = {
      ...this.baseSelectedChallengeItem,
      title: shouldUseFrench
        ? frenchContent?.title || this.baseSelectedChallengeItem.title
        : englishTitle,
      description: shouldUseFrench
        ? frenchContent?.description || this.baseSelectedChallengeItem.description
        : englishDescription,
    };
    this.restricted = this.selectedChallengeItem.restricted || '';
    console.log('restricted', this.restricted);
  }

  deleteChallenge() {
    if (!this.selectedChallengeItem || !this.selectedChallengeItem.id) {
      console.error('No challenge selected for deletion.');
      alert('Please select a challenge to delete.');
      return;
    }
    if (
      !confirm(
        'Are you sure you want to delete this challenge page and all associated user challenges?'
      )
    ) {
      return;
    }

    const challengeId = this.selectedChallengeItem.id;
    if (this.restricted === 'true') {
      this.challengeService
        .deleteUserChallenge(challengeId)
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
          alert(
            'Error occurred while deleting the challenge. Please try again.'
          );
        });
    } else {
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
          alert(
            'Error occurred while deleting the challenge. Please try again.'
          );
        });
    }
  }
}
