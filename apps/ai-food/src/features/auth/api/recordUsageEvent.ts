import { getQuotaHeaders } from '../model/quotaHeaders';

export async function recordUsageEvent(
  kind: 'manual' | 'barcode',
): Promise<void> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) return;

  try {
    const headers = await getQuotaHeaders('other');
    await fetch(`${gatewayUrl.replace(/\/$/, '')}/usage/event`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    });
  } catch (error) {
    console.warn('[usage] Failed to record event', { kind, error });
  }
}
