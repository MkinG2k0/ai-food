export type { TelegramSession } from './model/telegramSession';
export { useAuthStore } from './model/useAuthStore';
export { useAuthHydrated } from './model/useAuthHydrated';
export {
  isAuthMockEnabled,
  signOut,
} from './model/mockTelegramAuth';
export { getQuotaHeaders, type UsageKindHeader } from './model/quotaHeaders';
export { resolveAnalyzeUsageKind } from './model/resolveAnalyzeUsageKind';
export { DATA_CONSENT_VERSION } from './model/dataConsentVersion';
export { recordUsageEvent } from './api/recordUsageEvent';
export { submitDataConsent } from './api/submitDataConsent';
export { putNutritionProfile } from './api/putNutritionProfile';
export { fetchAuthMe } from './api/fetchAuthMe';
export {
  parseNutritionProfile,
  type NutritionProfilePayload,
  type UserProfile,
  type DailyTargets,
} from './model/nutritionProfile';
export {
  fetchUsage,
  getCachedUsage,
  hydrateUsageCache,
  createDefaultGuestUsage,
  getEffectiveFreeLimit,
  GUEST_FREE_USAGE_LIMIT,
  AUTH_LOGIN_GENERATION_BONUS,
  type UsageSnapshot,
} from './api/fetchUsage';
export { useUsage, usageQueryKey } from './model/useUsage';
export { mapTelegramUserToSession } from './api/signInWithTelegram';
export { signInWithTelegramBot } from './api/signInWithTelegramBot';
export { signInWithDemo } from './api/signInWithDemo';
export { TelegramBotLoginButton } from './ui/TelegramBotLoginButton';
