import { getLanguage } from './locale';
import manifest from '../../../content/drc-clinic-stories.json';

export const STORY_EDITION = manifest.edition;
export const CLINICS = manifest.clinics;
export type ClinicStory = (typeof CLINICS)[number];
export type StoryScene = 'opening' | 'closing';
export const storyClip = (clinic: ClinicStory, scene: StoryScene) =>
  `${import.meta.env.BASE_URL}audio/story/${getLanguage() === 'fr' ? 'fr/' : ''}${clinic.id}-${scene}.mp3?v=20261001`;
export const STORY_DISCLOSURE = manifest.narration;
export const CAMPAIGN_HREF = manifest.source;
/** Real-world context shown after each arrival; sourced and kept apart from the fiction. */
export const HELP = manifest.help;
export type ClinicFact = ClinicStory['fact'];
