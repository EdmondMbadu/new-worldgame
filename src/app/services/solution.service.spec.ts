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
          return {
            valueChanges: () => of(collectionValues),
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
});
