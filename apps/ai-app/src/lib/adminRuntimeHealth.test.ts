import { describe, expect, it, vi } from 'vitest';
import {
  collectAdminRuntimeHealth,
  DB_LATENCY_DEGRADED_MS,
  EVENT_LOOP_LAG_DEGRADED_MS,
} from './adminRuntimeHealth.js';

describe('collectAdminRuntimeHealth', () => {
  const memory = {
    rss: 10_000_000,
    heapUsed: 4_000_000,
    heapTotal: 8_000_000,
  };

  it('returns ok when DB ping succeeds and lag is below thresholds', async () => {
    const result = await collectAdminRuntimeHealth({
      pingDb: async () => {},
      measureEventLoopLag: async () => 5,
      now: (() => {
        let t = 1_000;
        return () => {
          t += 12;
          return t;
        };
      })(),
      uptimeSec: () => 42,
      memoryUsage: () => memory,
    });

    expect(result.status).toBe('ok');
    expect(result.db.ok).toBe(true);
    expect(typeof result.db.latencyMs).toBe('number');
    expect(result.db.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.uptimeSec).toBe(42);
    expect(result.memory).toEqual({
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
    });
    expect(result.eventLoopLagMs).toBe(5);
  });

  it('returns degraded when DB ping throws', async () => {
    const result = await collectAdminRuntimeHealth({
      pingDb: async () => {
        throw new Error('unreachable');
      },
      measureEventLoopLag: async () => 1,
      uptimeSec: () => 10,
      memoryUsage: () => memory,
    });

    expect(result.status).toBe('degraded');
    expect(result.db).toEqual({ ok: false, latencyMs: null });
    expect(result.uptimeSec).toBe(10);
    expect(result.memory.rssBytes).toBe(memory.rss);
    expect(result.eventLoopLagMs).toBe(1);
  });

  it('returns degraded when synthetic lag exceeds cutoff even if DB ok', async () => {
    const result = await collectAdminRuntimeHealth({
      pingDb: async () => {},
      measureEventLoopLag: async () => EVENT_LOOP_LAG_DEGRADED_MS + 1,
      now: (() => {
        let t = 0;
        return () => {
          t += 1;
          return t;
        };
      })(),
      uptimeSec: () => 1,
      memoryUsage: () => memory,
    });

    expect(result.status).toBe('degraded');
    expect(result.db.ok).toBe(true);
    expect(result.eventLoopLagMs).toBe(EVENT_LOOP_LAG_DEGRADED_MS + 1);
  });

  it('returns degraded when DB latency exceeds cutoff', async () => {
    const result = await collectAdminRuntimeHealth({
      pingDb: async () => {},
      measureEventLoopLag: async () => 1,
      now: (() => {
        let calls = 0;
        return () => {
          calls += 1;
          // first call = start, second = end → latency = DB_LATENCY_DEGRADED_MS + 1
          return calls === 1 ? 0 : DB_LATENCY_DEGRADED_MS + 1;
        };
      })(),
      uptimeSec: () => 1,
      memoryUsage: () => memory,
    });

    expect(result.status).toBe('degraded');
    expect(result.db.ok).toBe(true);
    expect(result.db.latencyMs).toBe(DB_LATENCY_DEGRADED_MS + 1);
  });

  it('always includes the full live metrics shape', async () => {
    const result = await collectAdminRuntimeHealth({
      pingDb: async () => {},
      measureEventLoopLag: async () => 2,
      uptimeSec: () => 99,
      memoryUsage: () => memory,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/^(ok|degraded)$/),
        uptimeSec: 99,
        memory: {
          rssBytes: expect.any(Number),
          heapUsedBytes: expect.any(Number),
          heapTotalBytes: expect.any(Number),
        },
        db: {
          ok: expect.any(Boolean),
          latencyMs: expect.anything(),
        },
        eventLoopLagMs: expect.any(Number),
      }),
    );
  });

  it('uses default event-loop measure when not injected', async () => {
    vi.useFakeTimers();
    try {
      const pending = collectAdminRuntimeHealth({
        pingDb: async () => {},
        now: Date.now,
        uptimeSec: () => 1,
        memoryUsage: () => memory,
      });
      await vi.runAllTimersAsync();
      const result = await pending;
      expect(typeof result.eventLoopLagMs).toBe('number');
      expect(result.eventLoopLagMs).toBeGreaterThanOrEqual(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
