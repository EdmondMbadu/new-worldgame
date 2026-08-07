export type PlaygroundQuestionLanguage = 'en' | 'fr';

export type PlaygroundQuestionTemplateMode = 'standard' | 'custom';

export interface ChallengeQuestionTemplate {
  challengePageId: string;
  schemaVersion: 1;
  baseSchemaVersion: 1;
  revision: number;
  mode: PlaygroundQuestionTemplateMode;
  locales?: Partial<Record<PlaygroundQuestionLanguage, Record<string, string>>>;
  changedKeys?: string[];
  updatedAt?: unknown;
  updatedByUid?: string;
  updatedByEmail?: string;
}

export interface ResolvedPlaygroundQuestionTemplate {
  challengePageId: string | null;
  mode: PlaygroundQuestionTemplateMode;
  revision: number;
  locales: Record<PlaygroundQuestionLanguage, Record<string, string>>;
}
