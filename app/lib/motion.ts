const EASE_OUT = "easeOut" as const;

type TransitionConfig = {
  duration: number;
  ease: typeof EASE_OUT;
  delay?: number;
};

type SpringTransitionConfig = {
  type: "spring";
  stiffness: number;
  damping: number;
  mass: number;
};

type MotionPreset = {
  initial: Record<string, number | string>;
  animate?: Record<string, number | string>;
  whileInView?: Record<string, number | string>;
  exit?: Record<string, number | string>;
  viewport?: {
    once?: boolean;
    amount?: number;
    margin?: string;
  };
  transition: TransitionConfig | SpringTransitionConfig;
};

function duration(value: number, reduced: boolean): number {
  return reduced ? 0.01 : value;
}

export function overlayFadeMotion(reduced: boolean): MotionPreset {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: duration(0.2, reduced), ease: EASE_OUT },
  };
}

export function popInMotion(reduced: boolean): MotionPreset {
  return {
    initial: { opacity: 0, y: reduced ? 0 : 18, scale: reduced ? 1 : 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: reduced ? 0 : 14, scale: reduced ? 1 : 0.98 },
    transition: { duration: duration(0.22, reduced), ease: EASE_OUT },
  };
}

export function rightSheetMotion(reduced: boolean): MotionPreset {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01, ease: EASE_OUT },
    };
  }
  return {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { type: "spring", stiffness: 360, damping: 34, mass: 0.7 },
  };
}

export function toastMotion(reduced: boolean): MotionPreset {
  return {
    initial: { opacity: 0, y: reduced ? 0 : 14, scale: reduced ? 1 : 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.98 },
    transition: { duration: duration(0.2, reduced), ease: EASE_OUT },
  };
}

export function staggeredFadeUpMotion(index: number, reduced: boolean): MotionPreset {
  const step = index % 5;
  const travelY = reduced ? 0 : 10 + step * 4;
  const itemDuration = duration(0.2 + step * 0.03, reduced);
  const itemDelay = reduced ? 0 : Math.min(index * 0.045 + step * 0.01, 0.36);
  return {
    initial: { opacity: reduced ? 1 : 0, y: travelY },
    whileInView: { opacity: 1, y: 0 },
    exit: { opacity: 1, y: reduced ? 0 : -6 },
    viewport: { once: true, amount: 0.18, margin: "0px 0px -6% 0px" },
    transition: {
      duration: itemDuration,
      ease: EASE_OUT,
      delay: itemDelay,
    },
  };
}

export function pageTransitionMotion(reduced: boolean): MotionPreset {
  return {
    initial: { opacity: reduced ? 1 : 0 },
    animate: { opacity: 1 },
    exit: { opacity: reduced ? 1 : 0 },
    transition: { duration: duration(0.16, reduced), ease: EASE_OUT },
  };
}

export function inViewFadeUpMotion(index: number, reduced: boolean) {
  const step = index % 4;
  const travelY = reduced ? 0 : 12 + step * 5;
  const itemDuration = duration(0.24 + step * 0.04, reduced);
  const itemDelay = reduced ? 0 : Math.min(index * 0.06 + step * 0.015, 0.42);
  return {
    initial: { opacity: reduced ? 1 : 0, y: travelY },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2, margin: "0px 0px -8% 0px" },
    transition: {
      duration: itemDuration,
      ease: EASE_OUT,
      delay: itemDelay,
    },
  };
}
