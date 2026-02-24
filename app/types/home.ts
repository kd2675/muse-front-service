export type HomePayload = {
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    description: string;
  };
  todaysPick: Array<{
    id: number;
    title: string;
    artist: string;
    category: string;
    camera: string;
    colorFrom: string;
    colorTo: string;
  }>;
  featuredMuseums: Array<{
    museumId: number;
    name: string;
    ownerName: string;
    artworkCount: number;
    coverImageUrl?: string | null;
  }>;
  activeContests: Array<{
    id: number;
    theme: string;
    period: string;
    entryFee: number;
    prizePool: number;
    daysLeft: number;
  }>;
};
