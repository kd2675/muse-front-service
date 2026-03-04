import type { ContestSummary } from "./contest";

export type OverviewPayload = {
  featuredMuseums: Array<{
    museumId: number;
    name: string;
    ownerName: string;
    artworkCount: number;
    coverImageUrl?: string | null;
  }>;
  contests: ContestSummary[];
};
