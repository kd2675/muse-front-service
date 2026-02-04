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
  galleryCategories: Array<{
    key: string;
    title: string;
    description: string;
    itemCount: number;
    colorFrom: string;
    colorTo: string;
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
