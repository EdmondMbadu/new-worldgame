import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, of } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { Tournament } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TournamentService } from 'src/app/services/tournament.service';

@Component({
  selector: 'app-tournament-win',
  templateUrl: './tournament-win.component.html',
  styleUrl: './tournament-win.component.css',
})
export class TournamentWinComponent implements OnInit {
  tournament!: Tournament;
  winningSolution: Solution | null = null;
  otherSolutions: Solution[] = [];
  completedSolutions: Solution[] = [];
  showDetails = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourneySvc: TournamentService,
    private solutionSvc: SolutionService,
    public auth: AuthService,
    public data: DataService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.tourneySvc
      .getById(id)
      .pipe(
        switchMap((t) => {
          if (!t) {
            this.router.navigate(['/']);
            return of(null);
          }
          this.tournament = { tournamentId: id, ...t };
          const solIds = this.tournament.submittedSolutions ?? [];
          if (!solIds.length) return of([]);

          return this.solutionSvc.getSolutionsByIds(solIds);
        })
      )
      .subscribe((solutions) => {
        if (!Array.isArray(solutions)) return;

        this.completedSolutions = solutions.filter(
          (s) => s.finished === 'true'
        );

        if (this.tournament.winningSolution) {
          this.winningSolution =
            this.completedSolutions.find(
              (s) => s.solutionId === this.tournament.winningSolution
            ) ?? null;
        }

        /* fall-back: if organiser hasn’t set a winner yet */
        // if (!this.winningSolution && this.completedSolutions.length) {
        //   this.winningSolution = this.completedSolutions[0];
        // }

        /* otherSolutions excludes the winner */
        this.otherSolutions = this.completedSolutions.filter(
          (s) => s.solutionId !== this.winningSolution?.solutionId
        );
      });

    window.scroll(0, 0);
  }

  bannerImage() {
    return this.tournament?.image || '../../../assets/img/generic.webp';
  }
}
