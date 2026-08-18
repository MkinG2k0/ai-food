import { useQuery } from '@tanstack/react-query';
import { fetchReferral, type ReferralInfo } from '../api/fetchReferral';
import { getCachedReferral } from './referralCache';

export const referralQueryKey = ['billing', 'referral'] as const;

const REFERRAL_STALE_MS = 5 * 60_000;
const REFERRAL_GC_MS = 30 * 60_000;

export function useReferral(enabled = true) {
  const cached = getCachedReferral();

  return useQuery<ReferralInfo, Error>({
    queryKey: referralQueryKey,
    queryFn: fetchReferral,
    enabled,
    staleTime: REFERRAL_STALE_MS,
    gcTime: REFERRAL_GC_MS,
    refetchOnWindowFocus: false,
    initialData: cached,
    initialDataUpdatedAt: cached ? 0 : undefined,
  });
}
