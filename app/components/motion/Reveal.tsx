"use client";

import { motion, useReducedMotion } from "motion/react";
import { inViewFadeUpMotion } from "../../lib/motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  index?: number;
};

export default function Reveal({ children, className, index = 0 }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);

  return (
    <motion.div className={className} {...inViewFadeUpMotion(index, reduceMotion)}>
      {children}
    </motion.div>
  );
}
