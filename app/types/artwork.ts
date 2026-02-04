export type ArtworkDetail = {
  id: number;
  title: string;
  artist: string;
  category: string;
  description: string;
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
};
