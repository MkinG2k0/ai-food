import type { UsageSnapshot } from '../api/fetchUsage';

type DebugGenerationQuota = 'available' | 'exhausted';

function getDebugGenerationQuotaOverride(): DebugGenerationQuota | null {
  if (import.meta.env.MODE === 'test') return null;
  const raw = import.meta.env.VITE_DEBUG_GENERATION_QUOTA as string | undefined;
  if (raw === 'available') return 'available';
  if (raw === 'exhausted') return 'exhausted';
  return null;
}

/** True when the user can start a billable AI analysis (photo / text). */
export function isGenerationQuotaAvailable(
  usage: UsageSnapshot | undefined,
): boolean {
  const debug = getDebugGenerationQuotaOverride();
  if (debug === 'available') return true;
  if (debug === 'exhausted') return false;

  if (!usage) return true;
  if (usage.hasActiveSubscription || usage.remaining === null) return true;
  return usage.remaining > 0;
}
