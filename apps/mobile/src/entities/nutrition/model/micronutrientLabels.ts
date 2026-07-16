import type { MicronutrientId, MicronutrientUnit } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS } from '@ai-food/shared-types';

export const MICRONUTRIENT_LABELS: Record<MicronutrientId, string> = {
  vitaminA: 'Витамин A',
  vitaminC: 'Витамин C',
  vitaminD: 'Витамин D',
  vitaminB12: 'Витамин B12',
  iron: 'Железо',
  calcium: 'Кальций',
  folate: 'Фолат',
  magnesium: 'Магний',
};

/** Short labels for compact badges */
export const MICRONUTRIENT_SHORT_LABELS: Record<MicronutrientId, string> = {
  vitaminA: 'A',
  vitaminC: 'C',
  vitaminD: 'D',
  vitaminB12: 'B12',
  iron: 'Железо',
  calcium: 'Кальций',
  folate: 'Фолат',
  magnesium: 'Магний',
};

export function formatMicronutrientUnit(unit: MicronutrientUnit): string {
  return unit === 'µg' ? 'мкг' : 'мг';
}

export { MICRONUTRIENT_IDS };
