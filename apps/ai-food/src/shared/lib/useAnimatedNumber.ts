import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion';

interface UseAnimatedNumberOptions {
  /** Seconds. Default ~0.75s for a readable step-by-step count. */
  duration?: number;
  /** Delay before animation starts (seconds). */
  delay?: number;
  /** Skip entrance animation on first mount (jump to target). Default true. */
  skipInitial?: boolean;
  /** Start value when skipInitial is false. Default 0. */
  from?: number;
  /** Display precision. Default 0 (whole numbers, e.g. daily header kcal). */
  decimals?: number;
  /** When this changes, replay count-up from `from` (e.g. selected day). */
  resetKey?: string | number;
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
  {
    duration = 0.75,
    delay = 0,
    skipInitial = true,
    from = 0,
    decimals = 0,
    resetKey,
  }: UseAnimatedNumberOptions = {},
): number {
  const reducedMotion = useReducedMotion();
  const initial = skipInitial ? target : from;
  const motionValue = useMotionValue(initial);
  const [display, setDisplay] = useState(() => snapToDecimals(initial, decimals));
  const isFirst = useRef(true);
  const prevResetKey = useRef(resetKey);

  useMotionValueEvent(motionValue, 'change', (latest) => {
    setDisplay(snapToDecimals(latest, decimals));
  });

  useEffect(() => {
    const replayEntrance =
      resetKey !== undefined && resetKey !== prevResetKey.current;

    if (replayEntrance) {
      prevResetKey.current = resetKey;
    }

    const entranceRun = replayEntrance || (!skipInitial && isFirst.current);

    if (isFirst.current && skipInitial && !replayEntrance) {
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

    if (entranceRun) {
      motionValue.set(from);
      setDisplay(snapToDecimals(from, decimals));
    }

    const controls = animate(motionValue, target, {
      duration,
      delay: entranceRun ? delay : 0,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, [
    target,
    duration,
    delay,
    from,
    reducedMotion,
    motionValue,
    skipInitial,
    decimals,
    resetKey,
  ]);

  return display;
}
