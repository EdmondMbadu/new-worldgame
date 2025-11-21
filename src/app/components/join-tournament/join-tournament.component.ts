import { Component, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { Tournament } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-join-tournament',
  templateUrl: './join-tournament.component.html',
  styleUrl: './join-tournament.component.css',
})
export class JoinTournamentComponent implements OnInit {
  tournamentsJoined: number = 0;
  completedSolutions: Solution[] = [];
  tournamentSolutions: Solution[] = [];
  displayMissingRequirement: boolean = false;
  contactPersonInfo: boolean = false;
  chosenSolution: Solution = {};
  contactInformation: Tournament = {
    firstName: '',
    lastName: '',
    email: '',
    city: '',
    country: '',
  };
  constructor(
    private solution: SolutionService,
    public auth: AuthService,
    public data: DataService,
    private translate: TranslateService
  ) {
    solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.completedSolutions = data.filter(
        (data) =>
          data.finished === 'true' &&
          (data.tournament === undefined || data.tournament === 'false')
      );
      this.tournamentSolutions = data.filter(
        (data) => data.tournament === 'true'
      );
    });
  }

  ngOnInit(): void {
    window.scroll(0, 0);
  }
  addSolutionToTournament(solutionToAdd: Solution) {
    if (!this.evaluationRequirementMet(solutionToAdd)) {
      this.displayMissingRequirement = true;
      return;
    } else {
      this.chosenSolution = solutionToAdd;

      this.contactPersonInfo = true;
      this.contactInformation.solutionId = this.chosenSolution.solutionId;
    }
    console.log('current solution to send', solutionToAdd);
  }

  toggleMissingRequirement() {
    this.displayMissingRequirement = !this.displayMissingRequirement;
  }

  async addThisSolutionToTournament() {
    if (this.checkContactInfoValid()) {
      try {
        let update = await this.solution.updateSolutionForTournament(
          this.chosenSolution
        );
        let added = await this.solution.addToTournament(
          this.contactInformation
        );
        // this.chosenSolution.tournament = 'true';
        // this.tournamentSolutions.push(this.chosenSolution);
        this.toggleContactPersonInfo();
        this.reinitializeContactInfo();
      } catch (error) {
        alert(
          this.translate.instant('joinTournament.alerts.submitError')
        );
        console.log('error');
      }
    }
  }

  evaluationRequirementMet(solution: Solution) {
    if (
      solution.evaluationDetails === undefined ||
      solution.evaluationDetails.length <= 1
    ) {
      return false;
    } else if (Number(solution.evaluationSummary?.average) <= 8) {
      return false;
    }
    return true;
  }
  toggleContactPersonInfo() {
    this.contactPersonInfo = !this.contactPersonInfo;
  }

  checkContactInfoValid() {
    if (
      this.contactInformation.firstName === '' ||
      this.contactInformation.lastName === '' ||
      this.contactInformation.email === '' ||
      this.contactInformation.city === '' ||
      this.contactInformation.country === ''
    ) {
      alert(this.translate.instant('joinTournament.alerts.fieldsIncomplete'));
      return false;
    }
    return true;
  }

  reinitializeContactInfo() {
    this.contactInformation = {
      solutionId: '',
      firstName: '',
      lastName: '',
      email: '',
      city: '',
      country: '',
    };
  }
}
