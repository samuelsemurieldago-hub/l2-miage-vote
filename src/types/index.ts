export type ElectionStatus = 'open' | 'closed';

export interface ElectionConfig {
  title: string;
  description: string;
  status: ElectionStatus;
  startDate: string | null; // ISO string
  endDate: string | null; // ISO string
  maxChoices: number;
  logoUrl: string | null;
  studentMessage: string;
  totalVoters: number;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  slogan: string;
  description: string;
  program: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export type VoterCodeStatus = 'UNUSED' | 'USED';

export interface VoterCode {
  id: string;
  code: string; // plaintext code, admin-only readable via RLS — never exposed to students
  status: VoterCodeStatus;
  usedAt: string | null;
  createdAt: string;
}

export interface Ballot {
  id: string;
  candidateId: string;
  createdAt: string;
}

export interface ResultRow {
  candidate: Candidate;
  votes: number;
  percentage: number;
}
