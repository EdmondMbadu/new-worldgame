export class Solution {
  solutionId?: string;
  authorEmail?: string;
  authorAccountId?: string;
  authorProfileCredential?: string;
  authorName?: string;
  content?: string;
  title?: string;
  description?: string;
  participants?: { [key: string]: string } = {};
  comments?: { [key: string]: string } = {};
  status?: { [key: string]: string } = {};
  likes?: string;
  views?: string;
  share?: string;
  feedback?: string;
  endDate?: string;
  endDateFormatted?: string;
  finished?: string;
  creationDate?: string;
  submissionDate?: string;
}
