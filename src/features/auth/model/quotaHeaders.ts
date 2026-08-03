import { getDeviceId } from '@/shared/lib';
import { useAuthStore } from './useAuthStore';

export type UsageKindHeader = 'analyze' | 'refine' | 'other';

/** Headers for gateway quota + optional user JWT (API_KEY Bearer stays separate). */
export async function getQuotaHeaders(
  usageKind: UsageKindHeader,
): Promise<Record<string, string>> {
  const deviceId = await getDeviceId();
  const headers: Record<string, string> = {
    'X-Device-Id': deviceId,
    'X-Usage-Kind': usageKind,
  };
  const token = useAuthStore.getState().userToken;
  if (token) {
    headers['X-User-Token'] = token;
  }
  return headers;
}
