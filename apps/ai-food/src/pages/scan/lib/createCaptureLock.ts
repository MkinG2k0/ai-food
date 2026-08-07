/**
 * One-shot async lock for shutter: stays busy after success until unlock().
 * Concurrent run() calls while busy resolve to undefined.
 */
export function createCaptureLock() {
  let busy = false;

  return {
    isBusy(): boolean {
      return busy;
    },
    unlock(): void {
      busy = false;
    },
    async run<T>(fn: () => Promise<T>): Promise<T | undefined> {
      if (busy) return undefined;
      busy = true;
      try {
        return await fn();
      } catch (error) {
        busy = false;
        throw error;
      }
    },
  };
}
