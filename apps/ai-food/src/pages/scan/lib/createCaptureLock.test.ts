import { describe, expect, it } from 'vitest';
import { createCaptureLock } from './createCaptureLock';

describe('createCaptureLock', () => {
  it('blocks concurrent runs until unlocked', async () => {
    const lock = createCaptureLock();
    let started = 0;

    let release!: () => void;
    const first = lock.run(async () => {
      started += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return 'ok';
    });

    const second = lock.run(async () => {
      started += 1;
      return 'nope';
    });

    expect(lock.isBusy()).toBe(true);
    expect(started).toBe(1);
    await expect(second).resolves.toBeUndefined();

    release();
    await expect(first).resolves.toBe('ok');
    // Success path keeps lock held (caller unlocks only on failure / cancel).
    expect(lock.isBusy()).toBe(true);
    expect(started).toBe(1);
  });

  it('allows a new run after unlock', async () => {
    const lock = createCaptureLock();
    await lock.run(async () => 'a');
    lock.unlock();
    const result = await lock.run(async () => 'b');
    expect(result).toBe('b');
  });
});
