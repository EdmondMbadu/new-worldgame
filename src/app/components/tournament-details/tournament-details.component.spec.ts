import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { Tournament } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TournamentService } from 'src/app/services/tournament.service';
import { TournamentDetailsComponent } from './tournament-details.component';

describe('TournamentDetailsComponent', () => {
  let component: TournamentDetailsComponent;
  let fixture: ComponentFixture<TournamentDetailsComponent>;
  let tournament$: BehaviorSubject<Tournament | undefined>;
  let entries$: Subject<Solution[]>;
  let viewer$: BehaviorSubject<any>;
  let tourneys: jasmine.SpyObj<TournamentService>;
  let solutions: jasmine.SpyObj<SolutionService>;
  const tournament: Tournament = {
    tournamentId: 'gsl', title: '2026 GSL', authorId: 'viewer',
    authorEmail: 'organizer@example.com', deadline: '2099-10-30',
    submittedSolutions: ['one', 'missing'],
  };

  beforeEach(async () => {
    tournament$ = new BehaviorSubject<Tournament | undefined>(tournament);
    entries$ = new Subject<Solution[]>();
    viewer$ = new BehaviorSubject({ uid: 'viewer' });
    tourneys = jasmine.createSpyObj('TournamentService', ['getById', 'addSubmittedSolution']);
    tourneys.getById.and.returnValue(tournament$);
    solutions = jasmine.createSpyObj('SolutionService', [
      'getTournamentSolutions', 'getAuthenticatedUserAllSolutions', 'addEvaluatorsToSolution',
    ]);
    solutions.getTournamentSolutions.and.callFake((ids) => ids.length ? entries$ : of([]));
    solutions.getAuthenticatedUserAllSolutions.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      declarations: [TournamentDetailsComponent],
      imports: [CommonModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'gsl' })) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: TournamentService, useValue: tourneys },
        { provide: SolutionService, useValue: solutions },
        { provide: AngularFireStorage, useValue: {} },
        { provide: AuthService, useValue: { user$: viewer$, currentUser: { uid: 'viewer' } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TournamentDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the hero while entries load, without flashing an empty tournament', () => {
    expect(fixture.nativeElement.textContent).toContain('2026 GSL');
    expect(fixture.nativeElement.textContent).toContain('Loading submitted solutions');
    expect(fixture.nativeElement.textContent).not.toContain('No solutions have been submitted');
    entries$.next([{ solutionId: 'one', title: 'Entry one' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.solution-entry').length).toBe(1);
    expect(component.entriesLoading).toBeFalse();
  });

  it('queries personal solutions only while the picker is open and excludes submitted entries', () => {
    const personal$ = new Subject<Solution[]>();
    solutions.getAuthenticatedUserAllSolutions.and.returnValue(personal$);
    expect(solutions.getAuthenticatedUserAllSolutions).not.toHaveBeenCalled();
    component.openSolutionPicker();
    expect(component.pickerLoading).toBeTrue();
    personal$.next([
      { solutionId: 'one', finished: 'true' },
      { solutionId: 'new', finished: 'true' },
      { solutionId: 'draft', finished: 'false' },
    ]);
    expect(component.availableSolutions.map((s) => s.solutionId)).toEqual(['new']);
    component.openSolutionPicker();
    expect(personal$.observed).toBeFalse();
  });

  it('does not restart entry listeners on metadata edits and cancels outdated requests', () => {
    tournament$.next({ ...tournament, title: 'New title', winningSolution: 'one' });
    expect(solutions.getTournamentSolutions).toHaveBeenCalledTimes(1);
    const nextEntries$ = new Subject<Solution[]>();
    solutions.getTournamentSolutions.and.returnValue(nextEntries$);
    tournament$.next({ ...tournament, submittedSolutions: ['new'] });
    expect(entries$.observed).toBeFalse();
    entries$.next([{ solutionId: 'one' }]);
    nextEntries$.next([{ solutionId: 'new' }]);
    expect(component.completedSolutions.map((s) => s.solutionId)).toEqual(['new']);
  });

  it('uses public cards after sign-out and cancels the authenticated query', () => {
    const publicEntries$ = new Subject<Solution[]>();
    solutions.getTournamentSolutions.and.returnValue(publicEntries$);
    viewer$.next(null);
    expect(entries$.observed).toBeFalse();
    expect(solutions.getTournamentSolutions).toHaveBeenCalledWith(['one', 'missing'], false);
    expect(component.isAuthenticated).toBeFalse();
  });

  it('does not mistake an entry load failure for zero submissions and can retry', () => {
    entries$.error(new Error('offline'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('No solutions have been submitted');
    solutions.getTournamentSolutions.and.returnValue(of([{ solutionId: 'one' }]));
    component.retryEntries();
    expect(component.entriesError).toBeFalse();
    expect(component.completedSolutions.length).toBe(1);
  });

  it('does not append a duplicate when Firestore updates before submission finishes', async () => {
    const newEntry: Solution = { solutionId: 'new', evaluators: [{ name: 'organizer@example.com' }] };
    tourneys.addSubmittedSolution.and.callFake(async () => {
      tournament$.next({ ...tournament, submittedSolutions: ['one', 'new'] });
      entries$.next([{ solutionId: 'one' }, newEntry]);
    });
    await component.attachSolution(newEntry);
    expect(component.completedSolutions.map((s) => s.solutionId)).toEqual(['one', 'new']);
    await component.attachSolution(newEntry);
    expect(tourneys.addSubmittedSolution).toHaveBeenCalledTimes(1);
  });

  it('releases all live listeners on navigation', () => {
    fixture.destroy();
    expect(tournament$.observed).toBeFalse();
    expect(entries$.observed).toBeFalse();
    expect(viewer$.observed).toBeFalse();
  });
});
