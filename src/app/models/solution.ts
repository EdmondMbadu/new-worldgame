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
  evaluators?: { [key: string]: string } = {};
  evaluated?: { [key: string]: string } = {};
  comments?: { [key: string]: string } = {};
  status?: { [key: string]: string } = {};
  likes?: string;
  views?: string;
  share?: string;
  sdg?: string;
  feedbackRequest?: FeedbackRequest[] = [];
  evaluation?: { [key: string]: string } = {};
  endDate?: string;
  endDateFormatted?: string;
  finished?: string;
  evaluationAverage?: string;
  creationDate?: string;
  submissionDate?: string;
  numberofTimesEvaluated?: string;
}

export interface FeedbackRequest {
  authorId?: string;
  evaluated?: string;
}
