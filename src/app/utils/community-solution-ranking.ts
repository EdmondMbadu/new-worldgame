import { Solution } from '../models/solution';

const solutionActivityScore = (solution: Solution): number => {
  const raw =
    solution.feedUpdatedAt ||
    solution.lastSubstantiveEditAt ||
    solution.updatedAt;
  const time = raw?.toMillis?.() || raw?.toDate?.()?.getTime?.() || 0;
  const needsFirstResponse =
    Number(solution.commentCount || solution.comments?.length || 0) === 0;
  return time + (needsFirstResponse ? 6 * 60 * 60 * 1000 : 0);
};

const solutionOwnerKey = (solution: Solution): string =>
  solution.ownerAccountId ||
  solution.ownerEmail ||
  solution.authorAccountId ||
  solution.authorEmail ||
  '';

export const communitySolutionTitleKey = (solution: Solution): string =>
  String(solution.title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const uniqueSolutionsInOrder = (solutions: Solution[]): Solution[] => {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  return solutions.filter((solution) => {
    const id = solution.solutionId || '';
    const titleKey = communitySolutionTitleKey(solution);
    if ((id && seenIds.has(id)) || (titleKey && seenTitles.has(titleKey))) {
      return false;
    }
    if (id) seenIds.add(id);
    if (titleKey) seenTitles.add(titleKey);
    return true;
  });
};

const diversifyOwners = (solutions: Solution[]): Solution[] => {
  const output: Solution[] = [];
  const remaining = uniqueSolutionsInOrder(
    [...solutions].sort(
      (a, b) => solutionActivityScore(b) - solutionActivityScore(a)
    )
  );

  while (remaining.length) {
    const recentOwners = output.slice(-2).map(solutionOwnerKey).filter(Boolean);
    const index = remaining.findIndex((solution) => {
      const owner = solutionOwnerKey(solution);
      return !recentOwners.length || !recentOwners.every((item) => item === owner);
    });
    output.push(remaining.splice(index >= 0 ? index : 0, 1)[0]);
  }

  return output;
};

export const rankCommunitySolutions = (
  solutions: Solution[]
): Solution[] => {
  return diversifyOwners(
    solutions.filter((solution) => solution.solutionId)
  );
};

export const mergeDiscoverSolutionsFirst = (
  discoverSolutions: Solution[],
  communitySolutions: Solution[]
): Solution[] => {
  const featured = uniqueSolutionsInOrder(
    discoverSolutions.filter(
      (solution) => solution.finished === 'true' && solution.solutionId
    )
  );
  const featuredIds = new Set(featured.map((solution) => solution.solutionId));
  const featuredTitles = new Set(
    featured.map(communitySolutionTitleKey).filter(Boolean)
  );

  return [
    ...featured,
    ...rankCommunitySolutions(
      communitySolutions.filter((solution) => {
        const titleKey = communitySolutionTitleKey(solution);
        return (
          !featuredIds.has(solution.solutionId) &&
          (!titleKey || !featuredTitles.has(titleKey))
        );
      })
    ),
  ];
};

export const appendUniqueCommunitySolutions = (
  existingSolutions: Solution[],
  incomingSolutions: Solution[]
): Solution[] => {
  const existingIds = new Set(
    existingSolutions.map((solution) => solution.solutionId).filter(Boolean)
  );
  const existingTitles = new Set(
    existingSolutions.map(communitySolutionTitleKey).filter(Boolean)
  );
  const unseenSolutions = incomingSolutions.filter((solution) => {
    const titleKey = communitySolutionTitleKey(solution);
    return (
      Boolean(solution.solutionId) &&
      !existingIds.has(solution.solutionId) &&
      (!titleKey || !existingTitles.has(titleKey))
    );
  });

  return [...existingSolutions, ...rankCommunitySolutions(unseenSolutions)];
};
