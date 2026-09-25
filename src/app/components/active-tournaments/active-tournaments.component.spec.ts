import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { Tournament } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TournamentService } from 'src/app/services/tournament.service';
import { ActiveTournamentsComponent } from './active-tournaments.component';

describe('ActiveTournamentsComponent', () => {
  let component: ActiveTournamentsComponent;
  let fixture: ComponentFixture<ActiveTournamentsComponent>;
  let tournaments$: BehaviorSubject<Tournament[]>;
  let entries$: Subject<Solution[]>;
  let tourneys: jasmine.SpyObj<TournamentService>;
  let solutions: jasmine.SpyObj<SolutionService>;
  const tournament: Tournament = {
    tournamentId: 'gsl', title: '2026 GSL',
    submittedSolutions: ['one', 'two', 'three', 'four', 'five', 'missing'],
  };
  const entries = ['one', 'two', 'three', 'four', 'five'].map((solutionId) => ({ solutionId }));

  beforeEach(async () => {
    tournaments$ = new BehaviorSubject([tournament]);
    entries$ = new Subject<Solution[]>();
    tourneys = jasmine.createSpyObj('TournamentService', ['getActive']);
    tourneys.getActive.and.returnValue(tournaments$);
    solutions = jasmine.createSpyObj('SolutionService', ['getTournamentSolutions']);
    solutions.getTournamentSolutions.and.callFake((ids) => ids.length ? entries$ : of([]));
    await TestBed.configureTestingModule({
      declarations: [ActiveTournamentsComponent],
      imports: [CommonModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: TournamentService, useValue: tourneys },
        { provide: SolutionService, useValue: solutions },
        { provide: AuthService, useValue: { user$: of({ uid: 'viewer' }), currentUser: {} } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ActiveTournamentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the tournament immediately and shows loading instead of a raw reference count', () => {
    expect(fixture.nativeElement.textContent).toContain('2026 GSL');
    expect(fixture.nativeElement.textContent).toContain('Submitted solutions:');
    expect(fixture.nativeElement.textContent).not.toContain('Participants:');
    expect(component.submittedSolutionCount(tournament)).toBe('Loading…');
  });

  it('counts the five resolved entries and follows live deletions', () => {
    entries$.next(entries);
    expect(component.submittedSolutionCount(tournament)).toBe(5);
    entries$.next(entries.slice(1));
    expect(component.submittedSolutionCount(tournament)).toBe(4);
  });

  it('batches overlapping tournaments and does not reload entries after metadata edits', () => {
    tournaments$.next([tournament, { tournamentId: 'other', submittedSolutions: ['one', 'one'] }]);
    expect(solutions.getTournamentSolutions).toHaveBeenCalledTimes(1);
    entries$.next(entries);
    expect(component.submittedSolutionCount(component.tournaments[1])).toBe(1);
    tournaments$.next([{ ...tournament, title: 'Renamed' }]);
    expect(solutions.getTournamentSolutions).toHaveBeenCalledTimes(1);
  });

  it('shows an unavailable count on failure and retries', () => {
    entries$.error(new Error('offline'));
    expect(component.submittedSolutionCount(tournament)).toBe('Unavailable');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Retry counts');
    solutions.getTournamentSolutions.and.returnValue(of(entries));
    component.retryCounts();
    expect(component.submittedSolutionCount(tournament)).toBe(5);
    expect(component.countsError).toBeFalse();
  });

  it('distinguishes a failed tournament request from an empty list and recovers', () => {
    tourneys.getActive.and.returnValue(throwError(() => new Error('offline')));
    component.retry();
    fixture.detectChanges();
    expect(component.isLoading).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Unable to load tournaments');
    expect(fixture.nativeElement.textContent).not.toContain('No active tournaments');
    tourneys.getActive.and.returnValue(of([]));
    component.retry();
    expect(component.loadError).toBeFalse();
  });

  it('releases live listeners on navigation', () => {
    fixture.destroy();
    expect(tournaments$.observed).toBeFalse();
    expect(entries$.observed).toBeFalse();
  });
});
