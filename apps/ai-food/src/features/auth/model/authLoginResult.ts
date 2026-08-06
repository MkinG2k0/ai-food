import type { NutritionProfilePayload } from './nutritionProfile';
import type { TelegramSession } from './telegramSession';

export type AuthLoginResult = {
  session: TelegramSession;
  nutritionProfile: NutritionProfilePayload | null;
};
