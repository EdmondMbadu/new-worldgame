export interface Slide {
  title?: string;
  subtitle?: string;
  kicker?: string;
  layout?: string;
  imageUrl?: string;
  bullets?: string[];
  visualCue?: string;
}
export interface Presentation {
  id?: string;
  solutionId?: string;
  name?: string;
  description?: string;
  dateCreated?: number;
  slides?: Slide[];
  thumbnail?: string;
  generatedByAi?: boolean;
  googleSlidesId?: string;
  googleSlidesUrl?: string;
  googleSlidesEditUrl?: string;
  googleSlidesPresentUrl?: string;
  pptxDownloadURL?: string;
  pptxFileName?: string;
  primaryFormat?: string;
  slideCount?: number;
}
