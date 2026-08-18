import type { BillingStatus } from '../api/billingApi';

const BILLING_STATUS_CACHE_KEY = 'ai-food-billing-status';

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

function isBillingStatus(value: unknown): value is BillingStatus {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.subscriptionStatus === 'string' &&
    (v.subscriptionExpiresAt === null || typeof v.subscriptionExpiresAt === 'string') &&
    typeof v.hasActiveSubscription === 'boolean'
  );
}

export function getCachedBillingStatus(): BillingStatus | undefined {
  const parsed = readJson(BILLING_STATUS_CACHE_KEY);
  return isBillingStatus(parsed) ? parsed : undefined;
}

export function setCachedBillingStatus(status: BillingStatus): void {
  writeJson(BILLING_STATUS_CACHE_KEY, status);
}

export function clearBillingCache(): void {
  try {
    localStorage.removeItem(BILLING_STATUS_CACHE_KEY);
  } catch {
    // ignore
  }
}
