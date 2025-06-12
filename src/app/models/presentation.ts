export interface Slide {
  imageUrl?: string;
  bullets?: string[];
}
export interface Presentation {
  id?: string;
  solutionId?: string;
  name?: string;
  description?: string;
  dateCreated?: number;
  slides?: Slide[];
  thumbnail?: string;
}
