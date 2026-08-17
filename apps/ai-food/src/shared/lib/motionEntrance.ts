import type { Transition, Variants } from 'framer-motion';

export const ENTRANCE_EASE: Transition['ease'] = [0.22, 1, 0.36, 1];
export const ENTRANCE_STAGGER = 0.09;

export function entranceContainer(reducedMotion: boolean | null): Variants {
  if (reducedMotion) {
    return { hidden: {}, show: {} };
  }

  return {
    hidden: {},
    show: {
      transition: { staggerChildren: ENTRANCE_STAGGER, delayChildren: 0.08 },
    },
  };
}

export function entranceItem(reducedMotion: boolean | null): Variants {
  if (reducedMotion) {
    return { hidden: {}, show: {} };
  }

  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: 0.45, ease: ENTRANCE_EASE },
    },
  };
}

export function entranceListItem(reducedMotion: boolean | null): Variants {
  if (reducedMotion) {
    return { hidden: {}, show: {} };
  }

  return {
    hidden: { opacity: 0 },
    show: (index: number) => ({
      opacity: 1,
      transition: {
        delay: 0.1 + index * 0.06,
        duration: 0.42,
        ease: ENTRANCE_EASE,
      },
    }),
  };
}
