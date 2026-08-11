import { getPrisma } from '../lib/prisma.js';
import type { GatewayRequestType } from './gatewayRequestTypes.js';

export type RecordGatewayRequestInput = {
  type: GatewayRequestType;
  stream: boolean;
  ok: boolean;
  ttfbMs: number | null;
  durationMs: number | null;
  userId?: string | null;
  deviceId?: string | null;
};

export async function recordGatewayRequest(
  input: RecordGatewayRequestInput,
): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  try {
    await prisma.gatewayRequest.create({
      data: {
        type: input.type,
        stream: input.stream,
        ok: input.ok,
        ttfbMs: input.ttfbMs,
        durationMs: input.durationMs,
        userId: input.userId ?? null,
        deviceId: input.deviceId ?? null,
      },
    });
  } catch (err) {
    console.error('Failed to record GatewayRequest:', err);
  }
}

export type GatewayRequestTimer = {
  markTtfb: () => void;
  finish: (opts: {
    ok: boolean;
    type: GatewayRequestType;
    stream: boolean;
    userId?: string | null;
    deviceId?: string | null;
  }) => Promise<void>;
};

export function startGatewayRequestTimer(): GatewayRequestTimer {
  const startedAt = Date.now();
  let ttfbMs: number | null = null;
  return {
    markTtfb() {
      if (ttfbMs == null) ttfbMs = Date.now() - startedAt;
    },
    finish(opts) {
      return recordGatewayRequest({
        type: opts.type,
        stream: opts.stream,
        ok: opts.ok,
        ttfbMs,
        durationMs: Date.now() - startedAt,
        userId: opts.userId,
        deviceId: opts.deviceId,
      });
    },
  };
}
