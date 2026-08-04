export const OPENAI_CONCURRENCY = 5;

export type Limiter = {
  run<T>(fn: () => Promise<T>): Promise<T>;
  runHeld<T>(fn: (release: () => void) => Promise<T>): Promise<T>;
};

/**
 * In-process FIFO semaphore. Caps concurrent async work; waiters are never dropped.
 */
export function createLimiter(concurrency: number): Limiter {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('concurrency must be a positive integer');
  }

  let active = 0;
  const waiters: Array<() => void> = [];

  function acquire(): Promise<void> {
    if (active < concurrency) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      waiters.push(() => {
        active += 1;
        resolve();
      });
    });
  }

  function release(): void {
    active -= 1;
    const next = waiters.shift();
    if (next) {
      next();
    }
  }

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await fn();
      } finally {
        release();
      }
    },

    /**
     * Hold a slot until the caller invokes `release` (e.g. after an SSE stream ends).
     * On sync/async throw before handoff, the slot is released automatically.
     */
    async runHeld<T>(fn: (release: () => void) => Promise<T>): Promise<T> {
      await acquire();
      let released = false;
      const releaseOnce = () => {
        if (!released) {
          released = true;
          release();
        }
      };
      try {
        return await fn(releaseOnce);
      } catch (error) {
        releaseOnce();
        throw error;
      }
    },
  };
}
