import type { ApiError } from '@ai-food/shared-types';
import { getQuotaHeaders } from '@/features/auth';
import { setCachedReferral } from '../model/referralCache';

function gatewayBase(): string {
  const url = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!url?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }
  return url.replace(/\/$/, '');
}

async function parseError(res: Response): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
    status?: number;
  };
  const err: ApiError = {
    message: data.message ?? `Billing error ${res.status}`,
    code: data.code ?? 'BILLING_ERROR',
    status: data.status ?? res.status,
  };
  throw err;
}

export type ReferralInfo = {
  code: string;
  conversionCount: number;
};

export async function fetchReferral(): Promise<ReferralInfo> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/billing/referral`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) await parseError(res);
  const info = (await res.json()) as ReferralInfo;
  setCachedReferral(info);
  return info;
}
