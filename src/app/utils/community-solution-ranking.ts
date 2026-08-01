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

const diversifyOwners = (solutions: Solution[]): Solution[] => {
  const output: Solution[] = [];
  const remaining = [...solutions].sort(
    (a, b) => solutionActivityScore(b) - solutionActivityScore(a)
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
  const unique = Array.from(
    new Map(
      solutions
        .filter((solution) => solution.solutionId)
        .map((solution) => [solution.solutionId, solution])
    ).values()
  );

  return diversifyOwners(unique);
};

export const mergeDiscoverSolutionsFirst = (
  discoverSolutions: Solution[],
  communitySolutions: Solution[]
): Solution[] => {
  const featured = Array.from(
    new Map(
      discoverSolutions
        .filter(
          (solution) => solution.finished === 'true' && solution.solutionId
        )
        .map((solution) => [solution.solutionId, solution])
    ).values()
  );
  const featuredIds = new Set(featured.map((solution) => solution.solutionId));

  return [
    ...featured,
    ...rankCommunitySolutions(
      communitySolutions.filter(
        (solution) => !featuredIds.has(solution.solutionId)
      )
    ),
  ];
};
