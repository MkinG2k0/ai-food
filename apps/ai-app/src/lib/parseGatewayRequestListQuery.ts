import { ApiError } from '../../lib/errors.js';
import {
  isGatewayRequestType,
  type GatewayRequestType,
} from './gatewayRequestTypes.js';

export type GatewayRequestListQuery = {
  type: GatewayRequestType;
  page: number;
  pageSize: number;
};

function parsePositiveInt(
  raw: unknown,
  fallback: number,
  opts: { min: number; max: number; field: string },
): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < opts.min || n > opts.max) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `${opts.field} must be an integer between ${opts.min} and ${opts.max}.`,
    );
  }
  return n;
}

export function parseGatewayRequestListQuery(
  query: Record<string, unknown>,
): GatewayRequestListQuery {
  const typeRaw = query.type;
  if (typeof typeRaw !== 'string' || !isGatewayRequestType(typeRaw)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'type must be a valid gateway request type.',
    );
  }

  const page = parsePositiveInt(query.page, 1, {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
    field: 'page',
  });
  const pageSize = parsePositiveInt(query.pageSize, 50, {
    min: 1,
    max: 100,
    field: 'pageSize',
  });

  return { type: typeRaw, page, pageSize };
}
