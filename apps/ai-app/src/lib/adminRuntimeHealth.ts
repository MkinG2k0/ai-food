/** DB ping slower than this → degraded. */
export const DB_LATENCY_DEGRADED_MS = 500;

/** Event-loop lag above this → degraded. */
export const EVENT_LOOP_LAG_DEGRADED_MS = 100;

export type AdminRuntimeHealthStatus = 'ok' | 'degraded';

export type AdminRuntimeHealth = {
  status: AdminRuntimeHealthStatus;
  uptimeSec: number;
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
  };
  db: {
    ok: boolean;
    latencyMs: number | null;
  };
  eventLoopLagMs: number;
};

export type CollectAdminRuntimeHealthOptions = {
  pingDb: () => Promise<void>;
  measureEventLoopLag?: () => Promise<number>;
  now?: () => number;
  uptimeSec?: () => number;
  memoryUsage?: () => {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
};

async function defaultMeasureEventLoopLag(
  now: () => number,
): Promise<number> {
  const expected = 0;
  const start = now();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, expected);
  });
  return Math.max(0, now() - start - expected);
}

export async function collectAdminRuntimeHealth(
  options: CollectAdminRuntimeHealthOptions,
): Promise<AdminRuntimeHealth> {
  const now = options.now ?? Date.now;
  const uptimeSec =
    options.uptimeSec?.() ?? Math.floor(process.uptime());
  const mem = options.memoryUsage?.() ?? process.memoryUsage();
  const measureLag =
    options.measureEventLoopLag ??
    (() => defaultMeasureEventLoopLag(now));

  let dbOk = false;
  let latencyMs: number | null = null;
  const dbStart = now();
  try {
    await options.pingDb();
    latencyMs = Math.max(0, now() - dbStart);
    dbOk = true;
  } catch {
    dbOk = false;
    latencyMs = null;
  }

  const eventLoopLagMs = await measureLag();

  const degraded =
    !dbOk ||
    (latencyMs !== null && latencyMs > DB_LATENCY_DEGRADED_MS) ||
    eventLoopLagMs > EVENT_LOOP_LAG_DEGRADED_MS;

  return {
    status: degraded ? 'degraded' : 'ok',
    uptimeSec,
    memory: {
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
    },
    db: { ok: dbOk, latencyMs },
    eventLoopLagMs,
  };
}
