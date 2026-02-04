export type ProfileSummary = {
  artist: {
    id: number;
    name: string;
    tagline: string;
    profileColor: string;
  };
  stats: {
    totalWorks: number;
    totalAwards: number;
    totalEarnings: number;
    followers: number;
  };
  portfolio: Array<{
    id: number;
    title: string;
    category: string;
    colorFrom: string;
    colorTo: string;
  }>;
  awards: Array<{
    id: number;
    contest: string;
    rank: string;
    prize: string;
    period: string;
  }>;
};
