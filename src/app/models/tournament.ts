export class Tournament {
  tournamentId?: string;
  title?: string;
  subtTitle?: string;
  instruction?: string;
  files?: string[];
  image?: string;
  prizeAmount?: string;
  prizeOther?: string;
  deadline?: string;
  submittedSolutions?: string[];
  winningSolution?: string;
  authorId?: string;
  authorEmail?: string;
  authorProfileCredential?: string;
  status?: string;
  creationDate?: string;
}

/// models/scenario.model.ts
export interface GameScenario {
  id: string;
  sdg: string; // “SDG 1” … “SDG 17”
  title: string;
  region: string;
  crisis: string;
  mission: string;
  postChoiceInsight: string;
  badges: string[];
  choices: GameChoice[];
}

export interface GameChoice {
  text: string;
  description: string;
  sustainability: number; // 0-4
  humanImpact: number; // 0-4
  equity: number; // 0-4
  innovation: number; // 0-4
  insight: string;
  badge: string;
}

export interface DemoBooking {
  id?: string; // populated automatically when reading
  demoDate: string; // ISO date portion – e.g. “2025-07-22”
  demoTime: string; // “02:30 PM”
  demoDateTime: number; // milliseconds since epoch, for easy sorting
  name: string;
  email: string;
  notes?: string;
  createdAt: number; // server timestamp
  uid?: string; // if the user was logged-in
}
