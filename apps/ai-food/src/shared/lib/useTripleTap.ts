import { useCallback, useRef } from 'react';

const DEFAULT_WINDOW_MS = 600;

/** Hidden toggle gesture — N taps within a short window. */
export function useTripleTap(onTrigger: () => void, windowMs = DEFAULT_WINDOW_MS) {
  const stateRef = useRef({ count: 0, timer: 0 });

  return useCallback(() => {
    window.clearTimeout(stateRef.current.timer);
    stateRef.current.count += 1;

    if (stateRef.current.count >= 3) {
      stateRef.current.count = 0;
      onTrigger();
      return;
    }

    stateRef.current.timer = window.setTimeout(() => {
      stateRef.current.count = 0;
    }, windowMs);
  }, [onTrigger, windowMs]);
}
