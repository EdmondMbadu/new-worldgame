import { Component, OnInit } from '@angular/core';
import { Tournament } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TournamentService } from 'src/app/services/tournament.service';

@Component({
    selector: 'app-active-tournaments',
    templateUrl: './active-tournaments.component.html',
    styleUrl: './active-tournaments.component.css',
    standalone: false
})
export class ActiveTournamentsComponent implements OnInit {
  tournaments: Tournament[] = [];
  isLoading = true;

  constructor(
    private tourneySvc: TournamentService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    // today as YYYY-MM-DD (same format your deadline input stores)
    const today = new Date().toISOString().substring(0, 10);

    this.tourneySvc.getActive(today).subscribe((list) => {
      this.tournaments = list;
      this.isLoading = false;
    });
  }

  /* helpers for template */
  coverImage(t: Tournament) {
    return t.image || '../../../assets/img/generic.webp';
  }
  participantsCount(t: Tournament) {
    return (t.submittedSolutions ?? []).length;
  }
}
