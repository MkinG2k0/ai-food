import type { MicronutrientId, MicronutrientUnit } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS } from '@ai-food/shared-types';

export const MICRONUTRIENT_LABELS: Record<MicronutrientId, string> = {
  vitaminA: 'Витамин A',
  vitaminC: 'Витамин C',
  vitaminD: 'Витамин D',
  vitaminE: 'Витамин E',
  vitaminK: 'Витамин K',
  vitaminB1: 'Витамин B1',
  vitaminB2: 'Витамин B2',
  vitaminB3: 'Витамин B3',
  vitaminB5: 'Витамин B5',
  vitaminB6: 'Витамин B6',
  vitaminB7: 'Витамин B7',
  folate: 'Витамин B9',
  vitaminB12: 'Витамин B12',
  calcium: 'Кальций',
  magnesium: 'Магний',
  zinc: 'Цинк',
  iron: 'Железо',
  copper: 'Медь',
  manganese: 'Марганец',
  iodine: 'Йод',
  selenium: 'Селен',
  chromium: 'Хром',
  molybdenum: 'Молибден',
  potassium: 'Калий',
  phosphorus: 'Фосфор',
};

/** Short labels for compact badges */
export const MICRONUTRIENT_SHORT_LABELS: Record<MicronutrientId, string> = {
  vitaminA: 'A',
  vitaminC: 'C',
  vitaminD: 'D',
  vitaminE: 'E',
  vitaminK: 'K',
  vitaminB1: 'B1',
  vitaminB2: 'B2',
  vitaminB3: 'B3',
  vitaminB5: 'B5',
  vitaminB6: 'B6',
  vitaminB7: 'B7',
  folate: 'B9',
  vitaminB12: 'B12',
  calcium: 'Ca',
  magnesium: 'Mg',
  zinc: 'Zn',
  iron: 'Fe',
  copper: 'Cu',
  manganese: 'Mn',
  iodine: 'I',
  selenium: 'Se',
  chromium: 'Cr',
  molybdenum: 'Mo',
  potassium: 'K+',
  phosphorus: 'P',
};

const VITAMIN_IDS = new Set<MicronutrientId>([
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminE',
  'vitaminK',
  'vitaminB1',
  'vitaminB2',
  'vitaminB3',
  'vitaminB5',
  'vitaminB6',
  'vitaminB7',
  'folate',
  'vitaminB12',
]);

export function isVitaminMicronutrient(id: MicronutrientId): boolean {
  return VITAMIN_IDS.has(id);
}

export function isMineralMicronutrient(id: MicronutrientId): boolean {
  return !VITAMIN_IDS.has(id);
}

/**
 * Default Stats summary — most tracked vitamins/minerals.
 * Full catalog remains available via «Посмотреть все».
 */
export const PRIORITY_MICRONUTRIENT_IDS = [
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'folate',
  'vitaminB12',
  'iron',
  'calcium',
  'magnesium',
] as const satisfies readonly MicronutrientId[];

export const PRIORITY_MICRONUTRIENT_ID_SET = new Set<MicronutrientId>(
  PRIORITY_MICRONUTRIENT_IDS,
);

export function isPriorityMicronutrient(id: MicronutrientId): boolean {
  return PRIORITY_MICRONUTRIENT_ID_SET.has(id);
}

export function formatMicronutrientUnit(unit: MicronutrientUnit): string {
  return unit === 'µg' ? 'мкг' : 'мг';
}

export { MICRONUTRIENT_IDS };
