import { average, p50, p95 } from './percentile.js';
import { GATEWAY_REQUEST_TYPES } from './gatewayRequestTypes.js';

export type GatewayRequestRow = {
  type: string;
  ok: boolean;
  ttfbMs: number | null;
  durationMs: number | null;
  createdAt: Date;
};

export type RequestWindowCounts = {
  count: number;
  okCount: number;
  errorCount: number;
};

export type RequestTypeLatencyStats = RequestWindowCounts & {
  type: string;
  avgTtfbMs: number | null;
  p50TtfbMs: number | null;
  p95TtfbMs: number | null;
  avgDurationMs: number | null;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
};

export function countWindow(rows: GatewayRequestRow[]): RequestWindowCounts {
  let okCount = 0;
  for (const row of rows) {
    if (row.ok) okCount += 1;
  }
  return {
    count: rows.length,
    okCount,
    errorCount: rows.length - okCount,
  };
}

function okLatencyValues(
  rows: GatewayRequestRow[],
  field: 'ttfbMs' | 'durationMs',
): number[] {
  const values: number[] = [];
  for (const row of rows) {
    if (!row.ok) continue;
    const value = row[field];
    if (value != null) values.push(value);
  }
  return values;
}

function statsForType(
  type: string,
  rows: GatewayRequestRow[],
): RequestTypeLatencyStats {
  const counts = countWindow(rows);
  const ttfbValues = okLatencyValues(rows, 'ttfbMs');
  const durationValues = okLatencyValues(rows, 'durationMs');
  return {
    type,
    ...counts,
    avgTtfbMs: average(ttfbValues),
    p50TtfbMs: p50(ttfbValues),
    p95TtfbMs: p95(ttfbValues),
    avgDurationMs: average(durationValues),
    p50DurationMs: p50(durationValues),
    p95DurationMs: p95(durationValues),
  };
}

export function statsByType(rows: GatewayRequestRow[]): RequestTypeLatencyStats[] {
  const byType = new Map<string, GatewayRequestRow[]>();
  for (const row of rows) {
    const bucket = byType.get(row.type);
    if (bucket) bucket.push(row);
    else byType.set(row.type, [row]);
  }

  return GATEWAY_REQUEST_TYPES.filter((type) => byType.has(type)).map((type) =>
    statsForType(type, byType.get(type)!),
  );
}
