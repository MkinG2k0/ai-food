export { cn } from './utils';
export { fileToImageDataUrl } from './fileToImageDataUrl';
export { formatCalories, formatMacro, formatDate } from './formatters';
export { queryClient } from './queryClient';
export {
  getWeekStart,
  getWeekDays,
  getMonthGridDays,
  weekOffsetForDate,
  isSameDay,
  isFutureDay,
  formatDayLabel,
  formatHeaderDate,
  timestampForSelectedDate,
} from './dateUtils';
export type { MonthGridDay } from './dateUtils';
export { saveMealImage, saveMealImageFromUrl, getMealImageSrc, loadMealImageAsFile } from './mealImage';
export {
  appDebugLog,
  bindAppDebugEnabled,
  buildAppDebugReport,
  clearAppDebugLog,
  copyAppDebugReport,
  isAppDebugEnabled,
  shareAppDebugReportViaTelegram,
  subscribeAppDebugLog,
  type AppDebugCategory,
} from './appDebugLog';
export {
  SUPPORT_TELEGRAM_LABEL,
  SUPPORT_TELEGRAM_TEXT_LIMIT,
  SUPPORT_TELEGRAM_URL,
  SUPPORT_TELEGRAM_USERNAME,
  buildSupportTelegramNativeUrl,
  buildSupportTelegramWebUrl,
  openSupportTelegramWithText,
  trimTextForTelegramDraft,
} from './supportTelegram';
export { useTripleTap } from './useTripleTap';
export {
  compressImageForAi,
  AI_IMAGE_MAX_SIDE,
  AI_IMAGE_JPEG_QUALITY,
} from './compressImage';
export { capacitorStorage } from './capacitorStorage';
export { takePhotoAsFile, mediaResultToFile } from './takePhoto';
export { useSpeechToText } from './useSpeechToText';
export type { UseSpeechToTextOptions } from './useSpeechToText';
export { useAnimatedNumber } from './useAnimatedNumber';
export { useSearchParamSheet } from './useSearchParamSheet';
export {
  ENTRANCE_EASE,
  ENTRANCE_STAGGER,
  entranceContainer,
  entranceItem,
  entranceListItem,
} from './motionEntrance';
export { getDeviceId } from './deviceId';
export { getLegalUrl, type LegalPath } from './legalSiteUrl';
export {
  ADD_FOOD_DEEP_LINK_ACTIONS,
  parseAddFoodDeepLink,
  type AddFoodDeepLinkAction,
  type AddFoodDeepLinkResult,
} from './addFoodDeepLink';
export {
  parseAppDeepLink,
  type AppDeepLinkResult,
} from './parseAppDeepLink';
export {
  computeTodayKbjuSnapshot,
  type TodayKbjuMacros,
  type TodayKbjuSnapshot,
} from './computeTodayKbjuSnapshot';
export {
  computeDayKbju,
  type DayKbjuMacros,
  type DayKbjuResult,
} from './computeDayKbju';
