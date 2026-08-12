export type DiscoverySearch = {
  query: string;
  artists: Array<{ artistId: number; name: string; tagline?: string | null; profileColor: string }>;
  museums: Array<{ museumId: number; name: string; ownerName: string; coverImageUrl?: string | null }>;
  contests: Array<{ contestId: number; theme: string; period: string }>;
  artworks: Array<{
    museumArtworkId: number;
    museumId: number;
    title: string;
    artistName: string;
    imageUrl: string;
  }>;
};

export type PublicArtist = {
  artistId: number;
  name: string;
  tagline?: string | null;
  profileColor: string;
  followerCount: number;
  totalWorks: number;
  totalAwards: number;
  museums: Array<{
    museumId: number;
    name: string;
    description?: string | null;
    artworkCount: number;
    coverImageUrl?: string | null;
  }>;
  awards: Array<{
    awardId: number;
    contestId?: number | null;
    contest: string;
    rank: string;
    prize: string;
    period: string;
  }>;
};

export type FollowStatus = { artistId: number; following: boolean; followerCount: number };

export type NotificationList = {
  unreadCount: number;
  items: Array<{
    notificationId: number;
    type: string;
    title: string;
    message: string;
    href?: string | null;
    read: boolean;
    createdAt: string;
  }>;
};

export type MuseumBookmark = {
  museumId: number;
  name: string;
  ownerName: string;
  coverImageUrl?: string | null;
  bookmarked: boolean;
};

export type MuseumViewHistory = {
  museumId: number;
  name: string;
  ownerName: string;
  coverImageUrl?: string | null;
  lastArtworkId?: number | null;
  progressPercent: number;
  viewedAt: string;
};
