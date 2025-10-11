import { Email } from '../components/create-playground/create-playground.component';
import { Avatar, User } from '../models/user';

export class Solution {
  solutionId?: string;
  authorEmail?: string;
  authorAccountId?: string;
  initiatorId?: string;
  authorProfileCredential?: string;
  authorName?: string;
  content?: string;
  title?: string;
  description?: string;
  participants?: { [key: string]: string } = {};
  evaluators?: Evaluator[] = [];
  roles?: Roles = {};
  evaluated?: { [key: string]: string } = {};
  comments?: Comment[] = [];
  discussion?: Comment[] = [];
  status?: { [key: string]: string } = {};
  likes?: string[];
  numLike?: string;
  edited?: string;
  numShare?: string;
  tournament?: string;
  views?: string;
  share?: string;
  sdg?: string;
  sdgs?: string[];
  evaluationSummary?: Evaluation = {};
  evaluationDetails?: Evaluation[];
  endDate?: string;
  endDateFormatted?: string;
  finished?: string;
  evaluationAverage?: string;
  creationDate?: string;
  submissionDate?: string;
  numberofTimesEvaluated?: string;
  solutionArea?: string;
  strategyReview?: string;
  errorMessage?: string;
  winner?: string;
  audioFile?: string;
  participantsHolder?: Email[];
  evaluatorsHolder?: Email[];
  activeScreenSharer?: string;
  meetLink?: string;
  image?: string;
  category?: string;
  impact?: number;
  supporters?: number;
  documents?: Avatar[];
  preview?: string;
  board?: string;
  chosenAdmins?: Admin[] = []; //  NEW
  statusForPublication?: string;
  /* ---- UI‑only helper fields (optional) ---- */
  editingCategory?: boolean;
  tempCategory?: string;
  ownerOfTeamPost?: string;
  broadCastInvitation?: string;

  broadCastInviteMessage?: string;
  isBroadcasting?: boolean;
  broadcastId?: string;
  broadcastStatus?: 'active' | 'paused' | 'stopped';
  // broadcastChannels?: {...};

  recruitmentProfile?: SolutionRecruitmentProfile;

  // broadcastStartedAt?: serverTimestamp;
  // broadcastUpdatedAt?: serverTimestam;
  updatedAt?: string;
  createdAt?: string;
}

export interface SolutionRecruitmentProfile {
  teamLabel?: string;
  initiativeName?: string;
  focusArea?: string;
  challengeDescription?: string;
  scopeOfWork?: string;
  finalProduct?: string;
  startDate?: string;
  completionDate?: string;
  timeCommitment?: string;
  teamSizeMin?: number | null;
  teamSizeMax?: number | null;
  perspectives?: string;
  interests?: string;
  knowledge?: string;
  skills?: string;
  additionalNotes?: string;
}

export class Evaluation {
  evaluatorId?: string;
  average?: string;
  achievable?: string;
  feasible?: string;
  ecological?: string;
  economical?: string;
  equitable?: string;
  understandable?: string;
  comment?: string;
  evaluator?: User;
}

export class Evaluator {
  name?: string;
  evaluated?: string;
  user?: User;
}

export interface Admin {
  authorAccountId: string;
  authorName: string;
  authorEmail: string;
  authorProfilePicture?: Avatar;
}
export class Comment {
  authorId?: string;
  authorName?: string;
  date?: string;
  displayTime?: string;
  content?: string;
  likes?: string;
  dislikes?: string;
  profilePic?: string;
  attachments?: Attachment[]; // NEW
  linkPreview?: LinkPreview;
}

export class Roles {
  teamLeader?: string;
  facilitator?: string;
  factChecker?: string;
}
export interface Attachment {
  url: string; // download URL in Storage
  type: 'image' | 'pdf' | 'doc' | 'video' | 'other';
  name: string; // original filename
  thumb?: string; // optional thumbnail for videos
}

export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string; // og:image or snapshot
}

export interface Broadcast {
  broadcastId: string;
  solutionId: string;
  title: string;
  message: string;
  includeReadMe: boolean;
  readMe?: string;
  channels: {
    email: boolean;
    broadcastFeed: boolean;
    social: boolean;
    customApi: boolean;
  };
  inviteLink: string;
  joinLink: string;
  active: boolean;
  status: 'active' | 'paused' | 'pending' | 'stopped';
  createdByUid: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: any;
  updatedAt: any;
  approvalRequestedAt?: any;
  approvedByUid?: string | null;
  approvedByName?: string | null;
  approvedAt?: any;
  rejectedAt?: any;
  canceledAt?: any;
}
export interface JoinRequest {
  id?: string;
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  message: string;
  status: 'pending' | 'cancelled' | 'approved' | 'rejected';
  createdAt: number; // Date.now()
  cancelledAt?: number;
  updatedAt?: number;
  approvedAt?: string;
  approvedBy?: string | null;
  rejectedAt?: number;
}
