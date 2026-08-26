import { CanMatchFn } from '@angular/router';

const ANGULAR_CAMPAIGN_SLUGS = new Set(['power-drc-clinics']);

export const dynamicCampaignCanMatch: CanMatchFn = (_route, segments) => {
  const slug = segments[1]?.path?.toLowerCase() || '';
  return !!slug && !ANGULAR_CAMPAIGN_SLUGS.has(slug);
};

