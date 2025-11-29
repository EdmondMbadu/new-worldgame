import { CanMatchFn, UrlSegment } from '@angular/router';

const AUTH_SEGMENTS = new Set([
  'login',
  'signup',
  'forgot-password',
  'verify-email',
  'signup-school',
  'signup-school-free',
]);

export const authPathsCanMatch: CanMatchFn = (
  _route,
  segments: UrlSegment[]
) => {
  if (!segments.length) return false;
  return AUTH_SEGMENTS.has(segments[0].path);
};
