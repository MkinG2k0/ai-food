import { getQuotaHeaders } from '@/features/auth';
import {
  ANALYZE_MEAL_CARD_FAILURE,
  type ClientAnalyticsEventName,
} from '../config';

export interface AnalyzeMealCardFailurePayload {
  name: typeof ANALYZE_MEAL_CARD_FAILURE;
  mealId: string;
  errorCode?: string | null;
  inFlight: boolean;
  clientAt?: string;
  payload?: Record<string, unknown>;
}

export type ClientAnalyticsEventBody = AnalyzeMealCardFailurePayload;

export async function recordClientAnalyticsEvent(
  body: ClientAnalyticsEventBody,
): Promise<void> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  const apiKey = import.meta.env.VITE_AI_GATEWAY_API_KEY as string | undefined;
  if (!gatewayUrl?.trim()) return;

  const name: ClientAnalyticsEventName = body.name;
  try {
    const headers = await getQuotaHeaders('other');
    if (apiKey?.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }
    const response = await fetch(
      `${gatewayUrl.replace(/\/$/, '')}/analytics/events`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      throw new Error(`Analytics event failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('[analytics] Failed to record event', { name, error });
  }
}
