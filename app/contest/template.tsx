import SegmentFadeTransition from "../components/motion/SegmentFadeTransition";

type ContestTemplateProps = {
  children: React.ReactNode;
};

export default function ContestTemplate({ children }: ContestTemplateProps) {
  return <SegmentFadeTransition>{children}</SegmentFadeTransition>;
}
