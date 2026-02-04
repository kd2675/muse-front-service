export type ContestSummary = {
  id: number;
  theme: string;
  period: string;
  entryFee: number;
  prizePool: number;
  daysLeft: number;
  status: "ACTIVE" | "ENDED" | "UPCOMING";
};

export type ContestDetail = {
  id: number;
  theme: string;
  description: string;
  period: string;
  entryFee: number;
  prizePool: number;
  daysLeft: number;
  status: "ACTIVE" | "ENDED" | "UPCOMING";
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
