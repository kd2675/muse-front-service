import SegmentFadeTransition from "../components/motion/SegmentFadeTransition";

type GalleryTemplateProps = {
  children: React.ReactNode;
};

export default function GalleryTemplate({ children }: GalleryTemplateProps) {
  return <SegmentFadeTransition>{children}</SegmentFadeTransition>;
}
