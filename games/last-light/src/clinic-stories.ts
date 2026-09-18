import manifest from '../../../content/drc-clinic-stories.json';

export const STORY_EDITION = manifest.edition;
export const CLINICS = manifest.clinics;
export type ClinicStory = (typeof CLINICS)[number];
export type StoryScene = 'opening' | 'closing';
export const storyClip = (clinic: ClinicStory, scene: StoryScene) =>
  `${import.meta.env.BASE_URL}audio/story/${clinic.id}-${scene}.mp3`;
export const STORY_DISCLOSURE = manifest.narration;
export const CAMPAIGN_HREF = manifest.source;
