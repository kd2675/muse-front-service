"use client";

import { motion, useReducedMotion } from "motion/react";
import { pageTransitionMotion } from "../../lib/motion";

type SegmentFadeTransitionProps = {
  children: React.ReactNode;
};

export default function SegmentFadeTransition({
  children,
}: SegmentFadeTransitionProps) {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const transition = pageTransitionMotion(reduceMotion);

  return (
    <motion.div {...transition}>
      {children}
    </motion.div>
  );
}
