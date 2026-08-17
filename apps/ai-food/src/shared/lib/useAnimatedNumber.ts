import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion';

interface UseAnimatedNumberOptions {
  /** Seconds. Default ~0.75s for a readable step-by-step count. */
  duration?: number;
  /** Skip entrance animation on first mount (jump to target). Default true. */
  skipInitial?: boolean;
  /** Display precision. Default 0 (whole numbers, e.g. daily header kcal). */
  decimals?: number;
}

function snapToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Animates a display value toward `target` in steps.
 * Respects prefers-reduced-motion.
 */
export function useAnimatedNumber(
  target: number,
  { duration = 0.75, skipInitial = true, decimals = 0 }: UseAnimatedNumberOptions = {},
): number {
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(target);
  const [display, setDisplay] = useState(() => snapToDecimals(target, decimals));
  const isFirst = useRef(true);

  useMotionValueEvent(motionValue, 'change', (latest) => {
    setDisplay(snapToDecimals(latest, decimals));
  });

  useEffect(() => {
    if (isFirst.current && skipInitial) {
      isFirst.current = false;
      motionValue.set(target);
      setDisplay(snapToDecimals(target, decimals));
      return;
    }
    isFirst.current = false;

    if (reducedMotion) {
      motionValue.set(target);
      setDisplay(snapToDecimals(target, decimals));
      return;
    }

    const controls = animate(motionValue, target, {
      duration,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, [target, duration, reducedMotion, motionValue, skipInitial, decimals]);

  return display;
}
