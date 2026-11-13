import { CanMatchFn } from '@angular/router';

const PLAYGROUND_PATHS = new Set<string>([
  'create-playground',
  'create-solution',
]);

export const playgroundCanMatch: CanMatchFn = (_route, segments) => {
  const firstSegment = segments[0]?.path ?? '';
  return PLAYGROUND_PATHS.has(firstSegment);
};
