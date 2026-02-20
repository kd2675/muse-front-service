export type ArtworkDetail = {
  id: number;
  title: string;
  artist: string;
  category: string;
  description: string;
  imageUrl?: string | null;
  colorFrom: string;
  colorTo: string;
  exif: {
    camera: string;
    lens: string;
    focalLength: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
  };
  relatedWorks: Array<{
    id: number;
    title: string;
    artist: string;
    imageUrl?: string | null;
    colorFrom: string;
    colorTo: string;
  }>;
};
