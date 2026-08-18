import type { ReferralInfo } from '../api/fetchReferral';

const REFERRAL_CACHE_KEY = 'ai-food-referral';

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

function isReferralInfo(value: unknown): value is ReferralInfo {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.code === 'string' && typeof v.conversionCount === 'number';
}

export function getCachedReferral(): ReferralInfo | undefined {
  const parsed = readJson(REFERRAL_CACHE_KEY);
  return isReferralInfo(parsed) ? parsed : undefined;
}

export function setCachedReferral(info: ReferralInfo): void {
  writeJson(REFERRAL_CACHE_KEY, info);
}

export function clearReferralCache(): void {
  try {
    localStorage.removeItem(REFERRAL_CACHE_KEY);
  } catch {
    // ignore
  }
}
