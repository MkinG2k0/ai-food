import { getDeviceId } from '@/shared/lib';
import { useAuthStore } from '../model/useAuthStore';
import {
  getQuotaHeaders,
  type UsageKindHeader,
} from '../model/quotaHeaders';

export type UsageSnapshot = {
  used: number;
  limit: number;
  remaining: number | null;
  authenticated: boolean;
  degraded?: boolean;
};

export async function fetchUsage(): Promise<UsageSnapshot> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl) {
    return {
      used: 0,
      limit: 50,
      remaining: 50,
      authenticated: Boolean(useAuthStore.getState().userToken),
      degraded: true,
    };
  }

  await getDeviceId();
  const headers = await getQuotaHeaders('other' satisfies UsageKindHeader);
  const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/usage`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`usage ${res.status}`);
  }
  return (await res.json()) as UsageSnapshot;
}
