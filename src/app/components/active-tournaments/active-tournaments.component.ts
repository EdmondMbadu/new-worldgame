import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Tournament } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TournamentService } from 'src/app/services/tournament.service';
import { tournamentEntryIds } from 'src/app/utils/tournament-entries';

@Component({
  selector: 'app-active-tournaments',
  templateUrl: './active-tournaments.component.html',
  styleUrl: './active-tournaments.component.css',
  standalone: false,
})
export class ActiveTournamentsComponent implements OnInit, OnDestroy {
  tournaments: Tournament[] = [];
  isLoading = true;
  loadError = false;
  countsLoading = true;
  countsError = false;
  private loadedEntryIds = new Set<string>();
  private readonly reload$ = new BehaviorSubject(0);
  private readonly retryCounts$ = new BehaviorSubject(0);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private tourneySvc: TournamentService,
    public auth: AuthService,
    private solSvc: SolutionService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const tournaments$ = this.reload$.pipe(
      switchMap(() => this.tourneySvc.getActive(new Date().toISOString().substring(0, 10)).pipe(
        catchError(() => {
          this.loadError = true;
          return of([] as Tournament[]);
        })
      )),
      tap((list) => {
        // Display the tournament cards immediately; counts load independently.
        this.tournaments = list;
        this.isLoading = false;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    const entryIds$ = tournaments$.pipe(
      map((list) => tournamentEntryIds(list.flatMap((t) => t.submittedSolutions ?? [])).sort()),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );
    const viewer$ = this.auth.user$.pipe(
      map((viewer) => viewer?.uid || ''),
      distinctUntilChanged()
    );

    combineLatest([entryIds$, viewer$, this.retryCounts$]).pipe(
      switchMap(([ids, uid]) => {
        this.countsLoading = true;
        this.countsError = false;
        // Batch across tournaments, rather than reading each tournament's entries separately.
        return this.solSvc.getTournamentSolutions(ids, !!uid).pipe(
          catchError(() => {
            this.countsError = true;
            return of(null);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((solutions) => {
      this.loadedEntryIds = new Set((solutions ?? []).map((s) => s.solutionId!));
      this.countsLoading = false;
    });
  }

  retry(): void {
    this.loadError = false;
    this.isLoading = true;
    this.reload$.next(this.reload$.value + 1);
  }

  retryCounts(): void {
    this.retryCounts$.next(this.retryCounts$.value + 1);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  coverImage(t: Tournament): string {
    return t.image || '../../../assets/img/generic.webp';
  }

  submittedSolutionCount(t: Tournament): number | string {
    const ids = tournamentEntryIds(t.submittedSolutions);
    if (!ids.length) return 0;
    if (this.countsLoading) return 'Loading…';
    if (this.countsError) return 'Unavailable';
    return ids.filter((id) => this.loadedEntryIds.has(id)).length;
  }

  trackTournament(index: number, tournament: Tournament): string | number {
    return tournament.tournamentId || index;
  }
}
