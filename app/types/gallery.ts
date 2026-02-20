export type GalleryLobby = {
  highlights: Array<{
    id: number;
    title: string;
    artist: string;
    category: string;
    imageUrl?: string | null;
    colorFrom: string;
    colorTo: string;
  }>;
  categories: Array<{
    key: string;
    title: string;
    description: string;
    itemCount: number;
  }>;
};

export type GalleryCategoryDetail = {
  category: {
    key: string;
    title: string;
    description: string;
    itemCount: number;
  };
  artworks: Array<{
    id: number;
    title: string;
    artist: string;
    imageUrl?: string | null;
    colorFrom: string;
    colorTo: string;
  }>;
};

export type AdminGalleryCategory = {
  key: string;
  title: string;
  description: string;
  itemCount: number;
};

export type AdminGalleryHighlight = {
  artworkId: number;
  sortOrder: number;
  title: string;
  artist: string;
  category: string;
  colorFrom: string;
  colorTo: string;
};

export type AdminGalleryArtwork = {
  artworkId: number;
  title: string;
  artist: string;
  categoryKey: string;
  categoryLabel: string;
  fileName?: string | null;
  imageUrl?: string | null;
  colorFrom: string;
  colorTo: string;
};
