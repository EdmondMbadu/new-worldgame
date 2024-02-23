import { Component, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-join-tournament',
  templateUrl: './join-tournament.component.html',
  styleUrl: './join-tournament.component.css',
})
export class JoinTournamentComponent implements OnInit {
  tournamentsJoined: number = 0;
  completedSolutions: Solution[] = [];
  tournamentSolutions: Solution[] = [];
  constructor(
    private solution: SolutionService,
    public auth: AuthService,
    public data: DataService
  ) {
    solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.completedSolutions = data.filter((data) => data.finished === 'true');
      this.tournamentSolutions = data.filter(
        (data) => data.tournament === 'true'
      );
    });
  }

  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
