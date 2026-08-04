import type { MicronutrientEstimate, MicronutrientId, UserProfile } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS, MICRONUTRIENT_UNITS } from '@ai-food/shared-types';

/** Adult RDA-like daily defaults; iron is sex-aware. */
export function defaultMicronutrientTargets(
  gender?: UserProfile['gender'],
): MicronutrientEstimate[] {
  const ironAmount = gender === 'female' ? 18 : 8;

  const amounts: Record<MicronutrientId, number> = {
    vitaminA: 800,
    vitaminC: 90,
    vitaminD: 15,
    vitaminB12: 2.4,
    iron: ironAmount,
    calcium: 1000,
    folate: 400,
    magnesium: 350,
  };

  return MICRONUTRIENT_IDS.map((id) => ({
    id,
    amount: amounts[id],
    unit: MICRONUTRIENT_UNITS[id],
  }));
}
