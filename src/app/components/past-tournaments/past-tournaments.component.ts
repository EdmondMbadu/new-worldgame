import { Component, OnInit } from '@angular/core';
import { Tournament } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';
import { TournamentService } from 'src/app/services/tournament.service';

@Component({
  selector: 'app-past-tournaments',
  templateUrl: './past-tournaments.component.html',
  styleUrl: './past-tournaments.component.css',
})
export class PastTournamentsComponent implements OnInit {
  tournaments: Tournament[] = [];
  isLoading = true;

  constructor(
    private tourneySvc: TournamentService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    const today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
    this.tourneySvc.getPast(today).subscribe((list) => {
      this.tournaments = list;
      this.isLoading = false;
    });
  }

  coverImage(t: Tournament) {
    return t.image || '../../../assets/img/generic.webp';
  }
  participantsCount(t: Tournament) {
    return (t.submittedSolutions ?? []).length;
  }
}
