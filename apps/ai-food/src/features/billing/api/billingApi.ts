import type { ApiError } from '@ai-food/shared-types';
import { getQuotaHeaders } from '@/features/auth';

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

export type SubscribeResult = {
  paymentUrl: string;
  paymentId: string;
};

export type BillingStatus = {
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  hasActiveSubscription: boolean;
  latestPayment: {
    id: string;
    status: string;
    amount: number;
    paidAt: string | null;
    createdAt: string;
  } | null;
};

export type SyncBillingResult = {
  paymentId: string;
  paymentStatus: string;
  hasActiveSubscription?: boolean;
  subscriptionExpiresAt?: string | null;
  subscriptionStatus?: string;
};

export type SubscriptionPrice = {
  amountKopecks: number;
  currency: string;
  durationDays: number;
};

export async function subscribe(): Promise<SubscribeResult> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/billing/subscribe`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as SubscribeResult;
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/billing/status`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as BillingStatus;
}

export async function syncBilling(
  paymentId?: string,
): Promise<SyncBillingResult> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/billing/sync`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentId ? { paymentId } : {}),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as SyncBillingResult;
}

export async function fetchSubscriptionPrice(): Promise<SubscriptionPrice> {
  const res = await fetch(`${gatewayBase()}/billing/price`, {
    method: 'GET',
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as SubscriptionPrice;
}
