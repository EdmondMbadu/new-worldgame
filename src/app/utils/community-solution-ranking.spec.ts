import { Solution } from '../models/solution';
import {
  appendUniqueCommunitySolutions,
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

  it('allows different owners to use the same title', () => {
    const firstOwner = solution('first-owner', 1000, false, 'one@example.com');
    delete firstOwner.ownerEmail;
    firstOwner.authorName = 'Alex Rivera';
    firstOwner.title = 'Adapting to a Changing World: Building Resilient Communities';
    const secondOwner = solution('second-owner', 3000, false, 'two@example.com');
    delete secondOwner.ownerEmail;
    secondOwner.authorName = 'Jordan Lee';
    secondOwner.title = '  ADAPTING to a Changing World:   Building Resilient Communities  ';

    const ranked = rankCommunitySolutions([firstOwner, secondOwner]);

    expect(ranked.map((item) => item.solutionId)).toEqual([
      'second-owner',
      'first-owner',
    ]);
  });

  it('keeps only the most active card when the same owner repeats a title', () => {
    const older = solution('older', 1000, false, 'same@example.com');
    delete older.ownerEmail;
    older.authorName = 'Kylie Brown';
    older.title = 'Adapting to a Changing World: Building Resilient Communities';
    const newer = solution('newer', 3000, false, 'same@example.com');
    delete newer.ownerEmail;
    newer.authorName = 'Kylie Brown';
    newer.title = '  ADAPTING to a Changing World:   Building Resilient Communities  ';

    const ranked = rankCommunitySolutions([
      older,
      newer,
      solution('different', 2000),
    ]);

    expect(ranked.map((item) => item.solutionId)).toEqual([
      'newer',
      'different',
    ]);
  });

  it('prefers a Discover card over a community card with the same title', () => {
    const featured = solution('featured', 1000, true, 'same@example.com');
    featured.title = 'One shared title';
    const communityDuplicate = solution(
      'community-copy',
      3000,
      false,
      'same@example.com'
    );
    communityDuplicate.title = 'One shared title';

    const merged = mergeDiscoverSolutionsFirst(
      [featured],
      [communityDuplicate, solution('different', 2000)]
    );

    expect(merged.map((item) => item.solutionId)).toEqual([
      'featured',
      'different',
    ]);
  });

  it('does not reintroduce a duplicate title from a later page', () => {
    const existing = solution('first-page', 3000, false, 'same@example.com');
    existing.title = 'Existing solution';
    const duplicate = solution(
      'later-page-copy',
      2000,
      false,
      'same@example.com'
    );
    duplicate.title = ' existing   solution ';
    const newSolution = solution('later-page-new', 1000);
    newSolution.title = 'A genuinely new solution';

    const merged = appendUniqueCommunitySolutions(
      [existing],
      [duplicate, newSolution]
    );

    expect(merged.map((item) => item.solutionId)).toEqual([
      'first-page',
      'later-page-new',
    ]);
  });
});
