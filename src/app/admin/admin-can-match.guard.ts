import { CanMatchFn } from '@angular/router';

const ADMIN_PATHS = new Set<string>([
  'user-management',
  'schools-management',
  'management-workshop',
  'management-gsl-2025',
  'tournament-management',
  'management-primer',
  'feedback-management',
  'admin-invite',
  'management-demo',
  'management-ask',
  'bulk-emails',
  'solution-publication',
]);

export const adminCanMatch: CanMatchFn = (_route, segments) => {
  const firstSegment = segments[0]?.path ?? '';
  return ADMIN_PATHS.has(firstSegment);
};
