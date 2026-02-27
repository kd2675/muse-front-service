export type PublicMuseumSummary = {
  museumId: number;
  name: string;
  description?: string | null;
  ownerName: string;
  isFeatured: boolean;
  artworkCount: number;
  coverImageUrl?: string | null;
};

export type PublicMuseumDetailArtwork = {
  museumArtworkId: number;
  title: string;
  description?: string | null;
  imageUrl: string;
};

export type PublicMuseumDetail = {
  museumId: number;
  name: string;
  description?: string | null;
  ownerName: string;
  isFeatured: boolean;
  artworks: PublicMuseumDetailArtwork[];
};

export type MyMuseum = {
  museumId: number;
  name: string;
  description?: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  artworkCount: number;
};

export type MyMuseumArtwork = {
  museumArtworkId: number;
  museumId: number;
  title: string;
  description?: string | null;
  fileName: string;
  imageUrl: string;
  moderationStatus: "REVIEWING" | "VISIBLE" | "REMOVED" | string;
  createdAt: string;
};

export type AdminMuseum = {
  museumId: number;
  artistId: number;
  ownerName: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  reviewingArtworkCount: number;
  visibleArtworkCount: number;
  removedArtworkCount: number;
};

export type AdminMuseumArtwork = {
  museumArtworkId: number;
  museumId: number;
  artistId: number;
  ownerName: string;
  title: string;
  description?: string | null;
  fileName: string;
  imageUrl: string;
  moderationStatus: "REVIEWING" | "VISIBLE" | "REMOVED" | string;
  createdAt: string;
};
