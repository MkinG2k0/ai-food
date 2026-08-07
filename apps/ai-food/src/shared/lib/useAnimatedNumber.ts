import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion';

interface UseAnimatedNumberOptions {
  /** Seconds. Default ~0.75s for a readable step-by-step count. */
  duration?: number;
  /** Skip entrance animation on first mount (jump to target). Default true. */
  skipInitial?: boolean;
}

/**
 * Animates an integer display value toward `target` in steps (e.g. 10 → 11 → … → 30).
 * Respects prefers-reduced-motion.
 */
export function useAnimatedNumber(
  target: number,
  { duration = 0.75, skipInitial = true }: UseAnimatedNumberOptions = {},
): number {
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(target);
  const [display, setDisplay] = useState(() => Math.round(target));
  const isFirst = useRef(true);

  useMotionValueEvent(motionValue, 'change', (latest) => {
    setDisplay(Math.round(latest));
  });

  useEffect(() => {
    if (isFirst.current && skipInitial) {
      isFirst.current = false;
      motionValue.set(target);
      setDisplay(Math.round(target));
      return;
    }
    isFirst.current = false;

    if (reducedMotion) {
      motionValue.set(target);
      setDisplay(Math.round(target));
      return;
    }

    const controls = animate(motionValue, target, {
      duration,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, [target, duration, reducedMotion, motionValue, skipInitial]);

  return display;
}
