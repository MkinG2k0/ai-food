import { useQuery } from '@tanstack/react-query';
import {
  fetchUsage,
  getCachedUsage,
  type UsageSnapshot,
} from '../api/fetchUsage';
import { useAuthStore } from './useAuthStore';

export const usageQueryKey = ['usage'] as const;

/**
 * Guest/auth quota from gateway `/usage`.
 * Shows localStorage/default (50) immediately; refreshes in background.
 */
export function useUsage() {
  const sessionId = useAuthStore((s) => s.session?.id ?? null);
  const hasToken = useAuthStore((s) => Boolean(s.userToken));
  const initial = getCachedUsage();

  return useQuery<UsageSnapshot, Error>({
    queryKey: [...usageQueryKey, sessionId, hasToken],
    queryFn: fetchUsage,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: initial,
    initialData: initial,
    initialDataUpdatedAt: 0,
  });
}
