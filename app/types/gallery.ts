export type GalleryLobby = {
  highlights: Array<{
    id: number;
    title: string;
    artist: string;
    category: string;
    colorFrom: string;
    colorTo: string;
  }>;
  categories: Array<{
    key: string;
    title: string;
    description: string;
    itemCount: number;
    colorFrom: string;
    colorTo: string;
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
    colorFrom: string;
    colorTo: string;
  }>;
};
