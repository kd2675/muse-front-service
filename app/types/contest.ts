export type ContestPhase = "UPCOMING" | "SUBMISSION" | "REVIEW" | "VOTING" | "ENDED";

export type ContestSummary = {
  id: number;
  theme: string;
  period: string;
  entryFee: number;
  prizePool: number;
  daysLeft: number;
  phase: ContestPhase;
  submissionStartAt?: string | null;
  submissionEndAt?: string | null;
  votingStartAt?: string | null;
  votingEndAt?: string | null;
};

export type ContestDetail = {
  id: number;
  theme: string;
  description: string;
  period: string;
  entryFee: number;
  prizePool: number;
  daysLeft: number;
  phase: ContestPhase;
  submissionStartAt?: string | null;
  submissionEndAt?: string | null;
  votingStartAt?: string | null;
  votingEndAt?: string | null;
  participationCount: number;
  rules: string[];
};

export type ContestEntryCreditStatus = {
  contestId: number;
  credits: number;
  status?: string;
};

export type ContestEntry = {
  contestId: number;
  entryId: string;
  title?: string;
  description?: string;
  fileName: string;
  imageUrl?: string;
  status: "SUBMITTED";
};

export type ContestEntrySummary = {
  entryId: string;
  contestId: number;
  contestTheme: string;
  title?: string;
  imageUrl?: string | null;
  status: "SUBMITTED" | "REVIEWING" | "APPROVED" | "REJECTED";
  submittedAt: string;
};

export type ContestPublicEntry = {
  entryId: string;
  contestId: number;
  title?: string | null;
  imageUrl?: string | null;
  artistName: string;
  status: "SUBMITTED" | "REVIEWING" | "APPROVED" | "REJECTED";
  submittedAt: string;
};

export type ContestEntryPageMode = "RANDOM" | "SUBMITTED_ASC";

export type ContestPublicEntryPage = {
  items: ContestPublicEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  mode: ContestEntryPageMode;
};

export type AdminContestEntryReviewStatus = "REVIEWING" | "APPROVED" | "REJECTED";

export type ContestRankingItem = {
  rank: number;
  entryId: string;
  title?: string | null;
  imageUrl?: string | null;
  artistName: string;
  voteCount: number;
};

export type ContestVoteResponse = {
  contestId: number;
  selectedEntryId: string;
  selectedEntryVoteCount: number;
};

export type AdminContest = {
  id: number;
  theme: string;
  description?: string | null;
  period: string;
  entryFee: number;
  prizePool: number;
  daysLeft: number;
  phase: ContestPhase;
  submissionStartAt?: string | null;
  submissionEndAt?: string | null;
  votingStartAt?: string | null;
  votingEndAt?: string | null;
  participationCount: number;
  rules: string[];
};

export type AdminContestUpsertRequest = {
  theme: string;
  description?: string;
  entryFee: number;
  prizePool: number;
  submissionStartAt: string;
  submissionEndAt: string;
  votingStartAt: string;
  votingEndAt: string;
  rules: string[];
};

export type ContestFinalizeWinner = {
  rank: number;
  entryId: string;
  title?: string | null;
  artistName: string;
  voteCount: number;
  prize: number;
};

export type ContestFinalizeResult = {
  contestId: number;
  phase: ContestPhase;
  finalizedAt: string;
  winners: ContestFinalizeWinner[];
};
