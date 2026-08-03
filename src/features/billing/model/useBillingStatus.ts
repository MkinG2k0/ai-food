import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { fetchBillingStatus, type BillingStatus } from '../api/billingApi';

export const billingStatusQueryKey = ['billing', 'status'] as const;

export function useBillingStatus(enabled = true) {
  const hasToken = useAuthStore((s) => Boolean(s.userToken));

  return useQuery<BillingStatus, Error>({
    queryKey: [...billingStatusQueryKey, hasToken],
    queryFn: fetchBillingStatus,
    enabled: enabled && hasToken,
    staleTime: 60_000,
  });
}
