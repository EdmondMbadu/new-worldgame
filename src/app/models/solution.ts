import { Email } from '../components/create-playground/create-playground.component';
import { Avatar, User } from '../models/user';
import { StrategyReviewSyncMetadata } from '../utils/strategy-review-sync';

export class Solution {
  solutionId?: string;
  /** Challenge space whose question template this solution inherits. */
  challengePageId?: string;
  /**
   * Immutable creator attribution. Legacy solutions use these fields as both
   * creator and owner until explicit owner fields are added by a transfer.
   */
  authorEmail?: string;
  authorAccountId?: string;
  initiatorId?: string;
  authorProfileCredential?: string;
  authorName?: string;
  /** Mutable stewardship. Always prefer these fields for access decisions. */
  ownerEmail?: string;
  ownerAccountId?: string;
  ownerName?: string;
  ownerProfileCredential?: string;
  ownerProfilePicture?: Avatar;
  ownershipTransferredAtMs?: number;
  ownershipTransferredByUid?: string;
  ownershipTransferredByEmail?: string;
  ownershipHistory?: SolutionOwnershipHistoryEntry[];
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
  evaluationHistory?: EvaluationHistoryEntry[];
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
  isPrivate?: boolean;
  communityVisibility?: 'community' | 'private';
  feedEligible?: boolean;
  feedStatus?: 'in-development' | 'submitted';
  feedUpdatedAt?: any;
  commentCount?: number;
  publicMemberCount?: number;
  publicDesignerCount?: number;
  publicProgress?: number;
  hasMoreComments?: boolean;
  teamMemberEmails?: string[];
  solutionAdminEmails?: string[];
  category?: string;
  impact?: number;
  supporters?: number;
  documents?: Avatar[];
  preview?: string;
  board?: string;
  chosenAdmins?: Admin[] = []; //  NEW
  statusForPublication?: string;
  moderation?: SolutionModerationState;
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
  updatedAt?: any;
  createdAt?: any;
  lastSubstantiveEditAt?: any;
  stepsUpdatedAt?: any;
  draftUpdatedAt?: any;
  publishedContentUpdatedAt?: any;
  strategyReviewReviewedAgainstStepsAt?: any;
  strategyReviewSyncStatus?: 'aligned' | 'attention';
  strategyReviewConflictCount?: number;
  strategyReviewSyncMetadata?: StrategyReviewSyncMetadata;
  strategyReviewPreviousRevision?: {
    review: string;
    reason: string;
    createdAt?: any;
    createdByUid?: string;
    createdByEmail?: string;
  };
}

export type SolutionModerationStatus =
  | 'pending'
  | 'scanning'
  | 'approved'
  | 'needs_review'
  | 'blocked'
  | 'error';

export interface SolutionModerationRisk {
  category: string;
  score: number;
}

export interface SolutionModerationEvidence {
  category: string;
  field: string;
  excerpt: string;
}

export interface SolutionModerationState {
  status: SolutionModerationStatus;
  contentHash?: string;
  approvedContentHash?: string;
  policyVersion?: string;
  model?: string;
  reasonCodes?: string[];
  topRisks?: SolutionModerationRisk[];
  evidence?: SolutionModerationEvidence[];
  summary?: string;
  scores?: Record<string, number>;
  imageAssessed?: boolean;
  decisionSource?: 'automatic' | 'administrator';
  scannedAtMs?: number;
  reviewerUid?: string;
  reviewerEmail?: string;
  reviewNote?: string;
  reviewedAtMs?: number;
}

export interface SolutionModerationQueueItem extends SolutionModerationState {
  solutionId: string;
  title: string;
  authorName: string;
  image?: string;
  finished?: string;
  updatedAtMs: number;
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
  evaluatorName?: string;
  evaluatorEmail?: string;
  isGuest?: boolean;
  createdAtMs?: number;
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

export interface EvaluationHistoryEntry {
  archivedAtMs: number;
  archivedAtLabel?: string;
  submissionDate?: string;
  numberofTimesEvaluated?: string;
  evaluationSummary?: Evaluation;
  evaluationDetails?: Evaluation[];
}

export class Evaluator {
  name?: string;
  evaluated?: string;
  user?: User;
  inviteEmailSentAt?: number;
  inviteEmailSentBy?: string;
  inviteEmailSendCount?: number;
  lastInviteError?: string;
}

export interface Admin {
  authorAccountId: string;
  authorName: string;
  authorEmail: string;
  authorProfilePicture?: Avatar;
}

export interface SolutionOwnershipHistoryEntry {
  transferredAtMs: number;
  transferredByUid: string;
  transferredByEmail: string;
  previousOwnerAccountId: string;
  previousOwnerName: string;
  previousOwnerEmail: string;
  newOwnerAccountId: string;
  newOwnerName: string;
  newOwnerEmail: string;
  previousOwnerKeptAsAdmin: boolean;
}
export class Comment {
  messageId?: string;
  authorId?: string;
  authorName?: string;
  date?: string;
  displayTime?: string;
  content?: string;
  likes?: string;
  dislikes?: string;
  reactions?: CommentReactions;
  replyTo?: CommentReply;
  profilePic?: string;
  attachments?: Attachment[]; // NEW
  linkPreview?: LinkPreview;
  isAI?: boolean; // For AI-generated messages
  isLoading?: boolean; // For AI typing indicator
  createdAt?: any;
  createdAtMs?: number;
  authorAvatar?: string;
  authorEmail?: string;
}

export interface CommentReactions {
  [emoji: string]: string[];
}

export interface CommentReply {
  messageId?: string;
  authorId?: string;
  authorName?: string;
  content?: string;
  date?: string;
  createdAtMs?: number;
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
  pausedAt?: any;
  stoppedAt?: any;
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
