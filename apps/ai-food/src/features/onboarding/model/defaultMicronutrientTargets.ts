import type { MicronutrientEstimate, MicronutrientId, UserProfile } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS, MICRONUTRIENT_UNITS } from '@ai-food/shared-types';

/** Adult RDA-like daily defaults; iron (and zinc lightly) are sex-aware. */
export function defaultMicronutrientTargets(
  gender?: UserProfile['gender'],
): MicronutrientEstimate[] {
  const ironAmount = gender === 'female' ? 18 : 8;
  const zincAmount = gender === 'female' ? 8 : 11;

  const amounts: Record<MicronutrientId, number> = {
    vitaminA: 800,
    vitaminC: 90,
    vitaminD: 15,
    vitaminE: 15,
    vitaminK: 120,
    vitaminB1: 1.2,
    vitaminB2: 1.3,
    vitaminB3: 16,
    vitaminB5: 5,
    vitaminB6: 1.3,
    vitaminB7: 30,
    folate: 400,
    vitaminB12: 2.4,
    calcium: 1000,
    magnesium: 350,
    zinc: zincAmount,
    iron: ironAmount,
    copper: 0.9,
    manganese: 2.3,
    iodine: 150,
    selenium: 55,
    chromium: 35,
    molybdenum: 45,
    potassium: 3400,
    phosphorus: 700,
  };

  return MICRONUTRIENT_IDS.map((id) => ({
    id,
    amount: amounts[id],
    unit: MICRONUTRIENT_UNITS[id],
  }));
}
