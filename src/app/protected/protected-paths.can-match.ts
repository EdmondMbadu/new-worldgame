import { CanMatchFn } from '@angular/router';

// Keep the large protected area out of public-page navigations while allowing
// Angular to select it without first downloading unrelated route modules.
const PROTECTED_PATHS = new Set<string>([
  'game',
  'mini-game',
  'discover',
  'profile',
  'start-challenge',
  'dashboard',
  'join',
  'whiteboard',
  'team-building',
  'user-profile',
  'solution-view',
  'solution-preview',
  'full-discussion',
  'challenge-discussion',
  'solution-details',
  'document-files',
  'solution-view-external',
  'list-finished-solutions',
  'problem-list-feedback',
  'join-tournament',
  'tournament-winner',
  'create-tournament',
  'active-tournaments',
  'your-tournaments',
  'past-tournaments',
  'problem-feedback',
  'evaluation-summary',
  'generate-challenges',
  'home-challenge',
  'scheduler',
  'gsl2026-prep',
  'broadcasts',
  'avatar',
  'video-call',
  'meeting',
  'join-success',
  'unsubscribe',
  'invitations',
  'notifications',
  'school-admin',
]);

export const protectedPathsCanMatch: CanMatchFn = (_route, segments) => {
  const firstSegment = segments[0]?.path ?? '';
  return PROTECTED_PATHS.has(firstSegment);
};
