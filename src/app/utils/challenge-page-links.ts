export interface ChallengePageLink {
  challengePageId?: unknown;
}

/**
 * Firestore performs the primary query, but challenge-space membership is
 * security-sensitive UI state. Recheck it at the rendering boundary so a
 * cached, stale, or unexpectedly broad emission cannot populate another
 * challenge space.
 */
export function filterChallengeLinksForPage<T extends ChallengePageLink>(
  links: readonly T[] | null | undefined,
  challengePageId: unknown
): T[] {
  const expectedPageId = String(challengePageId || '').trim();
  if (!expectedPageId) return [];

  return (links || []).filter(
    (link) => String(link?.challengePageId || '').trim() === expectedPageId
  );
}
