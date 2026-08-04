import { useQuery } from '@tanstack/react-query';
import {
  fetchSubscriptionPrice,
  type SubscriptionPrice,
} from '../api/billingApi';

export const subscriptionPriceQueryKey = ['billing', 'price'] as const;

export function useSubscriptionPrice() {
  return useQuery<SubscriptionPrice, Error>({
    queryKey: subscriptionPriceQueryKey,
    queryFn: fetchSubscriptionPrice,
    staleTime: 5 * 60_000,
  });
}
