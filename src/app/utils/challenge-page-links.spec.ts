import { filterChallengeLinksForPage } from './challenge-page-links';

describe('filterChallengeLinksForPage', () => {
  it('returns only links explicitly assigned to the requested space', () => {
    expect(
      filterChallengeLinksForPage(
        [
          { id: 'one', challengePageId: 'space-a' },
          { id: 'two', challengePageId: 'space-b' },
          { id: 'unassigned' },
        ],
        'space-a'
      )
    ).toEqual([{ id: 'one', challengePageId: 'space-a' }]);
  });

  it('returns an authoritative empty list when nothing is assigned', () => {
    const allOtherSpaces = Array.from({ length: 36 }, (_, index) => ({
      id: `solution-${index}`,
      challengePageId: `other-space-${index % 7}`,
    }));

    expect(filterChallengeLinksForPage(allOtherSpaces, 'new-empty-space')).toEqual([]);
  });

  it('fails closed when the active page ID is missing', () => {
    expect(
      filterChallengeLinksForPage([{ id: 'one', challengePageId: 'space-a' }], '')
    ).toEqual([]);
  });
});
