import { firstValueFrom, of } from 'rxjs';

import { Solution } from '../models/solution';
import { SolutionService } from './solution.service';

describe('SolutionService', () => {
  let service: SolutionService;
  let where: jasmine.Spy;
  let collectionValues: Solution[];
  let collectionName = '';

  beforeEach(() => {
    collectionValues = [];
    where = jasmine.createSpy('where').and.returnValue({});
    const afs = {
      collection: jasmine
        .createSpy('collection')
        .and.callFake((name: string, query: (ref: any) => unknown) => {
          collectionName = name;
          query({ where });
          const [, operator, ids] = where.calls.mostRecent().args;
          return {
            valueChanges: () => of(operator === 'in'
              ? collectionValues.filter((solution) => ids.includes(solution.solutionId))
              : collectionValues),
          };
        }),
    };

    service = new SolutionService(
      { user$: of(null), currentUser: {} } as any,
      afs as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loads approved, finished solutions for Discover and sorts them by likes', async () => {
    collectionValues = [
      {
        solutionId: 'lower-liked',
        statusForPublication: 'approved',
        finished: 'true',
        numLike: '2',
      },
      {
        solutionId: 'unfinished',
        statusForPublication: 'approved',
        finished: 'false',
        numLike: '50',
      },
      {
        solutionId: 'higher-liked',
        statusForPublication: 'approved',
        finished: 'true',
        numLike: '10',
      },
    ];

    const solutions = await firstValueFrom(service.getHomePageSolutions());

    expect(where).toHaveBeenCalledOnceWith(
      'statusForPublication',
      '==',
      'approved'
    );
    expect(collectionName).toBe('publicCommunitySolutions');
    expect(solutions.map((solution) => solution.solutionId)).toEqual([
      'higher-liked',
      'lower-liked',
    ]);
  });

  it('loads public tournament cards from sanitized projections in requested order', async () => {
    collectionValues = [
      { solutionId: 'second', title: 'Second' },
      { solutionId: 'first', title: 'First' },
    ];

    const solutions = await firstValueFrom(
      service.getPublicSolutionsByIds(['first', 'second'])
    );

    expect(collectionName).toBe('publicCommunitySolutions');
    expect(where).toHaveBeenCalledWith('solutionId', 'in', ['first', 'second']);
    expect(solutions.map((solution) => solution.solutionId)).toEqual([
      'first',
      'second',
    ]);
  });

  it('resolves six references to five existing submissions for both tournament views', async () => {
    const ids = ['one', 'two', 'three', 'four', 'five', 'deleted'];
    collectionValues = ids.slice(0, 5).reverse().map((solutionId) => ({ solutionId }));
    for (const authenticated of [true, false]) {
      const solutions = await firstValueFrom(service.getTournamentSolutions(ids, authenticated));
      expect(solutions.map((solution) => solution.solutionId)).toEqual(ids.slice(0, 5));
      expect(collectionName).toBe(authenticated ? 'solutions' : 'publicCommunitySolutions');
    }
  });

  it('ignores empty and duplicate references without inflating the count', async () => {
    collectionValues = [{ solutionId: 'one' }, { solutionId: 'two' }];
    const solutions = await firstValueFrom(
      service.getTournamentSolutions(['one', '', ' one ', 'two', 'two'], true)
    );
    expect(where).toHaveBeenCalledOnceWith('solutionId', 'in', ['one', 'two']);
    expect(solutions.length).toBe(2);
  });

  it('does not query Firestore for an empty tournament', async () => {
    expect(await firstValueFrom(service.getTournamentSolutions([], true))).toEqual([]);
    expect(await firstValueFrom(service.getTournamentSolutions([' '], false))).toEqual([]);
    expect(where).not.toHaveBeenCalled();
  });

  it('loads more than 30 entries in bounded batches without truncating the count', async () => {
    const ids = Array.from({ length: 65 }, (_, i) => `entry-${i}`);
    collectionValues = ids.map((solutionId) => ({ solutionId }));
    const solutions = await firstValueFrom(service.getTournamentSolutions(ids, true));
    expect(where.calls.allArgs().map((args) => args[2].length)).toEqual([30, 30, 5]);
    expect(solutions.map((solution) => solution.solutionId)).toEqual(ids);
  });
});
