import { Component, OnInit } from '@angular/core';
import { Tournament } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TournamentService } from 'src/app/services/tournament.service';

@Component({
  selector: 'app-your-tournaments',
  templateUrl: './your-tournaments.component.html',
  styleUrl: './your-tournaments.component.css',
})
export class YourTournamentsComponent implements OnInit {
  tournaments: Tournament[] = [];
  isLoading = true;

  constructor(
    private tourneySvc: TournamentService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    this.tourneySvc.getByAuthor(this.auth.currentUser.uid).subscribe((list) => {
      this.tournaments = list;
      this.isLoading = false;
    });
  }
  statusLabel(t: Tournament): string {
    return t.status ?? 'pending';
  }
  statusClass(t: Tournament): string {
    switch (t.status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-yellow-100 text-yellow-800'; // pending
    }
  }

  /** graceful fall-backs used in the template */
  participantsCount(t: Tournament): number {
    return (t.submittedSolutions ?? []).length;
  }
  coverImage(t: Tournament): string {
    return t.image || '../../../assets/img/generic.webp';
  }
}
