import { Comment } from './solution';

export class User {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  profilePicture?: Avatar;
  profileCredential?: string;
  profileDescription?: string;
  employement?: string;
  education?: string;
  location?: string;
  dateJoined?: string;
  followers?: string;
  following?: string;
  followersArray?: string[];
  followingArray?: string[];
  numberOfPosts?: string;
  numberOfContributions?: string;
  contentViews?: string;
  goal?: string;
  sdgsSelected?: string[];
  solutionEnvironment?: SolutionEnvironment;
  admin?: string;
  lastLogin?: string;
  tempSolutionstarted?: string;
  tempSolutionSubmitted?: string;
  role?: string;
  schoolId?: string;
  verified?: boolean;
  profilePicPath?: string;
}

export class Avatar {
  path?: string;
  size?: string;
  downloadURL?: string;
  name?: string;
  type?: string;
  description?: string;
  dateCreated?: string;
  dateSorted?: number;
  formattedDateCreated?: string;
  originalFilename?: string;
  group?: 'colleague' | 'elder';
  sdgs?: number[];
  intro?: string; // HTML allowed (you already use innerHTML)
  collectionPath?: string; // Firestore collection to write prompts to
  requiresAdmin?: boolean;
  slug?: string;
  avatarPath?: string;
}
export class Tournament {
  solutionId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  city?: string;
  country?: string;
}
export class NewUser {
  firstName?: string;
  lastname?: string;
  email?: string;
  password?: string;
  goal?: string;
  sdgsSelected?: string[];
  success?: boolean;
  errorMessage?: string;
}
export class SolutionEnvironment {
  focus?: string;
  sdgInterested?: string[];
}

export class ChallengePage {
  name?: string;
  heading?: string;
  subHeading?: string;
  description?: string;
  imageChallenge?: string;
  logoImage?: string;
  participants?: string[];
  meetLink?: string;
  challengePageId?: string;
  challengeListIds?: string[];
  authorId?: string;
  invitedUsers?: string[];
  restricted?: string;
  discussion?: Comment[];
  zoomLink?: string; // NEW
  chatNote?: string; // NEW  (instructions / text-chat info)
  scheduleTitle?: string;
  schedulePdfLink?: string;
  isPrivate?: boolean;
  participantsHidden?: boolean;
  handouts?: { name: string; url: string }[];
  programPDF?: { title: string; url: string } | null = null;
  customUrl?: string; // Custom URL slug for the page
}
// models/school.ts
export interface School {
  id?: string;
  name: string;
  ownerUid: string;
  createdAt: string;
}

// plans.ts
export const PLAN_KEYS = [
  'free',
  'license',
  'tournament',
  'pro',
  'school',
  'class',
  'trylicense',
  'tryschool',
] as const;

export type PlanKey = (typeof PLAN_KEYS)[number];

export const PRICE_BOOK: Record<PlanKey, number> = {
  free: 0,
  license: 99,
  tournament: 299,
  pro: 349,
  school: 349,
  class: 199,
  trylicense: 100,
  tryschool: 500,
};
function isPlanKey(v: unknown): v is PlanKey {
  return (
    v === 'free' ||
    v === 'license' ||
    v === 'tournament' ||
    v === 'pro' ||
    v === 'school' ||
    v === 'class' ||
    v === 'trylicense' ||
    v === 'tryschool'
  );
}

export type AskStatus = 'new' | 'read' | 'closed';

export interface AskDoc {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  question: string;
  uid: string | null;
  status: AskStatus;
  createdAt?: any; // Firestore Timestamp | string | number (legacy)
  createdAtMs?: number; // NEW: local millisecond fallback
}
export { isPlanKey };
