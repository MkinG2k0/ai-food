import { describe, it, expect, vi } from 'vitest';
import { createLimiter, OPENAI_CONCURRENCY } from './queue.js';

describe('createLimiter', () => {
  it('exports OPENAI_CONCURRENCY as 5', () => {
    expect(OPENAI_CONCURRENCY).toBe(5);
  });

  it('createLimiter(5): peak in-flight is exactly 5; 6th starts after one finishes', async () => {
    const limiter = createLimiter(5);
    let inFlight = 0;
    let peak = 0;
    const started: number[] = [];
    const resolvers: Array<() => void> = [];

    const jobs = Array.from({ length: 6 }, (_, i) =>
      limiter.run(async () => {
        started.push(i);
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise<void>((resolve) => {
          resolvers.push(resolve);
        });
        inFlight -= 1;
        return i;
      }),
    );

    // Allow microtasks so first 5 acquire slots
    await vi.waitFor(() => {
      expect(started.length).toBe(5);
    });

    expect(peak).toBe(5);
    expect(started).toEqual([0, 1, 2, 3, 4]);
    expect(resolvers.length).toBe(5);

    // Release one slot — 6th job should start
    resolvers[0]!();
    await vi.waitFor(() => {
      expect(started.length).toBe(6);
    });

    expect(started[5]).toBe(5);
    expect(peak).toBe(5);

    // Release remaining
    for (const resolve of resolvers.slice(1)) {
      resolve();
    }
    // 6th job's resolver was pushed after first release
    await vi.waitFor(() => {
      expect(resolvers.length).toBe(6);
    });
    resolvers[5]!();

    await expect(Promise.all(jobs)).resolves.toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('releases slot when wrapped fn rejects', async () => {
    const limiter = createLimiter(1);
    let secondStarted = false;

    const first = limiter.run(async () => {
      throw new Error('boom');
    });

    await expect(first).rejects.toThrow('boom');

    await limiter.run(async () => {
      secondStarted = true;
    });

    expect(secondStarted).toBe(true);
  });

  it('runHeld keeps slot until release() is called', async () => {
    const limiter = createLimiter(1);
    let releaseHeld: (() => void) | undefined;
    let secondStarted = false;

    const held = limiter.runHeld(async (release) => {
      releaseHeld = release;
      return 'ok';
    });

    await expect(held).resolves.toBe('ok');
    expect(releaseHeld).toBeDefined();

    const second = limiter.run(async () => {
      secondStarted = true;
    });

    await Promise.resolve();
    expect(secondStarted).toBe(false);

    releaseHeld!();
    await second;
    expect(secondStarted).toBe(true);
  });

  it('runHeld releases slot when fn throws before handoff', async () => {
    const limiter = createLimiter(1);

    await expect(
      limiter.runHeld(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');

    let ran = false;
    await limiter.run(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it('createLimiter(1) allows only one at a time', async () => {
    const limiter = createLimiter(1);
    let inFlight = 0;
    let peak = 0;
    const order: string[] = [];

    const a = limiter.run(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      order.push('a-start');
      await Promise.resolve();
      order.push('a-end');
      inFlight -= 1;
    });

    const b = limiter.run(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      order.push('b-start');
      await Promise.resolve();
      order.push('b-end');
      inFlight -= 1;
    });

    await Promise.all([a, b]);

    expect(peak).toBe(1);
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
  });
});
