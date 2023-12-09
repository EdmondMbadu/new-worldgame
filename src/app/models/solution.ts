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
  evaluated?: { [key: string]: string } = {};
  comments?: Comment[] = [];
  status?: { [key: string]: string } = {};
  likes?: string[];
  numLike?: string;
  views?: string;
  share?: string;
  sdg?: string;
  evaluationSummary?: Evaluation = {};
  evaluationDetails?: Evaluation[];
  endDate?: string;
  endDateFormatted?: string;
  finished?: string;
  evaluationAverage?: string;
  creationDate?: string;
  submissionDate?: string;
  numberofTimesEvaluated?: string;
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
}

export class Evaluator {
  name?: string;
  evaluated?: string;
}

export class Comment {
  authorId?: string;
  date?: string;
  content?: string;
  likes?: string;
  dislikes?: string;
}
