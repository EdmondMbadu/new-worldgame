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
}

export class Roles {
  teamLeader?: string;
  facilitator?: string;
  factChecker?: string;
}
