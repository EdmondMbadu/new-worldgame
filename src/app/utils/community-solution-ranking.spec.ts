import { Solution } from '../models/solution';
import {
  mergeDiscoverSolutionsFirst,
  rankCommunitySolutions,
} from './community-solution-ranking';

describe('rankCommunitySolutions', () => {
  const solution = (
    solutionId: string,
    updatedAtMs: number,
    isSubmitted = false,
    ownerEmail = `${solutionId}@example.com`
  ): Solution => ({
    solutionId,
    finished: isSubmitted ? 'true' : 'false',
    ownerEmail,
    feedUpdatedAt: { toMillis: () => updatedAtMs },
    commentCount: 1,
  });

  it('places only the supplied Discover solutions before the community feed', () => {
    const ranked = mergeDiscoverSolutionsFirst(
      [solution('discover', 1000, true)],
      [
        solution('new-submitted', 3000, true),
        solution('discover', 1000, true),
        solution('in-development', 2000),
      ]
    );

    expect(ranked.map((item) => item.solutionId)).toEqual([
      'discover',
      'new-submitted',
      'in-development',
    ]);
  });

  it('removes duplicates and keeps owner diversity in the remaining feed', () => {
    const repeated = solution('community-a', 3000, false, 'same@example.com');
    const ranked = rankCommunitySolutions([
      repeated,
      repeated,
      solution('community-b', 2000, false, 'same@example.com'),
      solution('community-c', 1000, false, 'other@example.com'),
    ]);

    expect(ranked.map((item) => item.solutionId)).toEqual([
      'community-a',
      'community-c',
      'community-b',
    ]);
  });
});
