import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import type { ApiError } from '@ai-food/shared-types';
import { useAuthStore } from '@/features/auth';

export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Partial<ApiError>;
  return e.code === 'QUOTA_EXCEEDED' || e.status === 402;
}

/** Guest → /login; authenticated → /subscribe (D-08). */
export function quotaExceededPath(): '/login' | '/subscribe' {
  return useAuthStore.getState().userToken ? '/subscribe' : '/login';
}

/**
 * Toast + navigate for QUOTA_EXCEEDED.
 * @returns true if the error was a quota exceed and navigation was triggered
 */
function generationQuotaPaywallMessage(path: '/login' | '/subscribe'): string {
  return path === '/subscribe'
    ? 'Лимит бесплатных генераций исчерпан. Оформите годовую лицензию.'
    : 'Лимит бесплатных генераций исчерпан. Войдите через Telegram.';
}

/** Proactive paywall when UI blocks billable actions before the request. */
export function showGenerationQuotaPaywall(navigate: NavigateFunction): void {
  const path = quotaExceededPath();
  toast.error(generationQuotaPaywallMessage(path));
  navigate(path);
}

export function handleQuotaExceeded(
  error: unknown,
  navigate: NavigateFunction,
): boolean {
  if (!isQuotaExceededError(error)) return false;
  const path = quotaExceededPath();
  const message =
    (error as Partial<ApiError>).message ??
    generationQuotaPaywallMessage(path);
  toast.error(message);
  navigate(path);
  return true;
}
