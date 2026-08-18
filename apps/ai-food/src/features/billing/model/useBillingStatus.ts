import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { fetchBillingStatus, type BillingStatus } from '../api/billingApi';
import { getCachedBillingStatus } from './billingCache';

export const billingStatusQueryKey = ['billing', 'status'] as const;

const BILLING_STALE_MS = 5 * 60_000;
const BILLING_GC_MS = 30 * 60_000;

export function useBillingStatus(enabled = true) {
  const hasToken = useAuthStore((s) => Boolean(s.userToken));
  const cached = hasToken ? getCachedBillingStatus() : undefined;

  return useQuery<BillingStatus, Error>({
    queryKey: [...billingStatusQueryKey, hasToken],
    queryFn: fetchBillingStatus,
    enabled: enabled && hasToken,
    staleTime: BILLING_STALE_MS,
    gcTime: BILLING_GC_MS,
    refetchOnWindowFocus: false,
    initialData: cached,
    initialDataUpdatedAt: cached ? 0 : undefined,
  });
}
