export { cn } from './utils';
export { formatCalories, formatMacro, formatDate } from './formatters';
export { queryClient } from './queryClient';
export {
  getWeekStart,
  getWeekDays,
  isSameDay,
  isFutureDay,
  formatDayLabel,
  formatHeaderDate,
  timestampForSelectedDate,
} from './dateUtils';
export { saveMealImage, saveMealImageFromUrl, getMealImageSrc, loadMealImageAsFile } from './mealImage';
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
export { getDeviceId } from './deviceId';
export { getLegalUrl, type LegalPath } from './legalSiteUrl';
