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

const normalizedIdentity = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

const solutionOwnerKey = (solution: Solution): string => {
  const accountId = normalizedIdentity(
    solution.ownerAccountId || solution.authorAccountId
  );
  if (accountId) return `account:${accountId}`;

  const email = normalizedIdentity(
    solution.ownerEmail || solution.authorEmail
  );
  if (email) return `email:${email}`;

  const displayName = normalizedIdentity(
    solution.ownerName || solution.authorName
  );
  return displayName ? `name:${displayName}` : '';
};

export const communitySolutionTitleKey = (solution: Solution): string =>
  String(solution.title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const communitySolutionDuplicateKey = (solution: Solution): string => {
  const ownerKey = solutionOwnerKey(solution);
  const titleKey = communitySolutionTitleKey(solution);
  return ownerKey && titleKey ? `${ownerKey}\u0000${titleKey}` : '';
};

const uniqueSolutionsInOrder = (solutions: Solution[]): Solution[] => {
  const seenIds = new Set<string>();
  const seenDuplicates = new Set<string>();

  return solutions.filter((solution) => {
    const id = solution.solutionId || '';
    const duplicateKey = communitySolutionDuplicateKey(solution);
    if (
      (id && seenIds.has(id)) ||
      (duplicateKey && seenDuplicates.has(duplicateKey))
    ) {
      return false;
    }
    if (id) seenIds.add(id);
    if (duplicateKey) seenDuplicates.add(duplicateKey);
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
  const featuredDuplicates = new Set(
    featured.map(communitySolutionDuplicateKey).filter(Boolean)
  );

  return [
    ...featured,
    ...rankCommunitySolutions(
      communitySolutions.filter((solution) => {
        const duplicateKey = communitySolutionDuplicateKey(solution);
        return (
          !featuredIds.has(solution.solutionId) &&
          (!duplicateKey || !featuredDuplicates.has(duplicateKey))
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
  const existingDuplicates = new Set(
    existingSolutions.map(communitySolutionDuplicateKey).filter(Boolean)
  );
  const unseenSolutions = incomingSolutions.filter((solution) => {
    const duplicateKey = communitySolutionDuplicateKey(solution);
    return (
      Boolean(solution.solutionId) &&
      !existingIds.has(solution.solutionId) &&
      (!duplicateKey || !existingDuplicates.has(duplicateKey))
    );
  });

  return [...existingSolutions, ...rankCommunitySolutions(unseenSolutions)];
};
